// Phonon v2 - Video Compiler
// Simulates the graph to generate frame-by-frame visualization data
// Mirrors the audio compiler approach but outputs visual data instead

import type { 
  GraphNode, 
  GraphEdge, 
  NodeId, 
  EdgeId,
  Frequency,
  MidiNote,
  WaveOrNoiseType,
  MusicalContext,
  GlobalSettings,
  Scene,
  ArrangementSlot,
  SceneId,
  ScaleName,
  VideoFrameData,
  VizPacketData,
  VizNodeData,
  VizNoteData,
  VizEdgeData,
  PacketId,
  VizMode,
  VizConfig,
} from '@core/types';
import { createPacketId } from '@core/types';
import { SCALES } from '@core/constants';
import { midiToHue } from '../viz/palettes';
import { getDefaultVizConfig } from '@core/store';

/** Simulated packet for video compilation */
interface SimPacket {
  id: PacketId;
  edgeId: EdgeId;
  t: number;            // 0-1 position along edge
  spawnTime: number;
  payload: {
    freq: Frequency;
    midiNote: MidiNote;
    wave: WaveOrNoiseType;
    gain: number;
  };
}

/** Active note for visualization (simulated from speaker triggers) */
interface SimNote {
  frequency: Frequency;
  gain: number;
  pan: number;
  startTime: number;
  holdTime: number;
  releaseTime: number;
  wave: WaveOrNoiseType;
}

/**
 * Compile graph into frame-by-frame visualization data for video export.
 * This simulates the graph similar to the audio compiler, but captures
 * visual state (packet positions, node flashes, etc.) at each frame.
 */
export function compileVideoFrames(
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  durationSeconds: number,
  frameRate: number,
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings
): VideoFrameData[] {
  const frames: VideoFrameData[] = [];
  const bpm = 120; // TODO: Get from global settings
  const beatDuration = 60 / bpm;
  
  // Simulation resolution (higher than frame rate for accuracy)
  const ticksPerBeat = 100;
  const tickDuration = beatDuration / ticksPerBeat;
  const totalTicks = Math.ceil(durationSeconds / tickDuration);
  const frameDuration = 1 / frameRate;
  
  // Simulation state
  const simPackets: SimPacket[] = [];
  const activeNotes: SimNote[] = [];
  const nodeFlashes = new Map<NodeId, number>();
  const nodeTimers = new Map<NodeId, { lastEmit: number; interval: number }>();
  
  // Initialize source node timers
  for (const node of nodes.values()) {
    if (node.type === 'source') {
      const interval = (node.props as any).interval || 2;
      nodeTimers.set(node.id, { lastEmit: -Infinity, interval });
    }
    nodeFlashes.set(node.id, 0);
  }
  
  let nextFrameTime = 0;
  
  // Main simulation loop
  for (let tick = 0; tick < totalTicks; tick++) {
    const currentTime = tick * tickDuration;
    const currentBeat = currentTime / beatDuration;
    
    // Decay all node flashes
    for (const [nodeId, flash] of nodeFlashes) {
      nodeFlashes.set(nodeId, Math.max(0, flash - tickDuration * 3));
    }
    
    // 1. Emit from source nodes
    for (const node of nodes.values()) {
      if (node.type !== 'source') continue;
      
      const timer = nodeTimers.get(node.id);
      if (!timer) continue;
      
      if (currentBeat - timer.lastEmit >= timer.interval) {
        timer.lastEmit = currentBeat;
        
        const props = node.props as any;
        const noteIndex = props.noteIndex ?? -1;
        const intensity = props.intensity ?? 0.5;
        
        // Determine MIDI note
        let midiNote: number;
        if (noteIndex === -1) {
          // Random - use deterministic random based on time
          midiNote = 36 + Math.floor(seededRandom(currentTime * 1000) * 49);
        } else if (noteIndex === -2) {
          // Fixed
          midiNote = props.midiNote ?? 60;
        } else {
          // Scale index
          const scale = musicalContext.scale;
          const octave = Math.floor(noteIndex / scale.length);
          const degree = noteIndex % scale.length;
          midiNote = musicalContext.root + octave * 12 + (scale[degree] || 0);
        }
        
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12) as Frequency;
        
        // Flash source node
        nodeFlashes.set(node.id, 1);
        
        // Spawn packets to outgoing edges
        const outgoing = Array.from(edges.values()).filter(e => e.from === node.id);
        
        for (const edge of outgoing) {
          simPackets.push({
            id: createPacketId(),
            edgeId: edge.id,
            t: 0,
            spawnTime: currentTime,
            payload: {
              freq,
              midiNote: midiNote as MidiNote,
              wave: 'sine',
              gain: intensity,
            },
          });
        }
      }
    }
    
    // 2. Move packets and process arrivals
    for (let i = simPackets.length - 1; i >= 0; i--) {
      const p = simPackets[i];
      if (!p) continue;
      
      const edge = edges.get(p.edgeId);
      if (!edge) {
        simPackets.splice(i, 1);
        continue;
      }
      
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);
      if (!fromNode || !toNode) {
        simPackets.splice(i, 1);
        continue;
      }
      
      // Calculate travel time
      let edgeDuration: number;
      if (edge.timingMode === 'fixed' && edge.durationBeats !== null) {
        edgeDuration = edge.durationBeats * beatDuration;
      } else {
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pixelsPerBeat = globalSettings.pixelsPerBeat || 200;
        const steps = Math.max(0.1, dist / pixelsPerBeat);
        edgeDuration = steps * beatDuration;
      }
      
      p.t += tickDuration / Math.max(0.001, edgeDuration);
      
      if (p.t >= 1.0) {
        // Process arrival
        processVideoArrival(p, toNode, nodes, edges, currentTime, beatDuration, 
                           simPackets, activeNotes, nodeFlashes);
        simPackets.splice(i, 1);
      }
    }
    
    // 3. Update active notes (remove completed ones)
    for (let i = activeNotes.length - 1; i >= 0; i--) {
      const note = activeNotes[i]!;
      const noteAge = currentTime - note.startTime;
      const totalDuration = note.holdTime + note.releaseTime;
      if (noteAge > totalDuration) {
        activeNotes.splice(i, 1);
      }
    }
    
    // 4. Capture frame if it's time
    if (currentTime >= nextFrameTime) {
      const frame = captureFrame(
        currentTime,
        bpm,
        simPackets,
        activeNotes,
        nodes,
        edges,
        nodeFlashes
      );
      frames.push(frame);
      nextFrameTime += frameDuration;
    }
  }
  
  return frames;
}

/**
 * Compile an arrangement into frame-by-frame visualization data.
 */
export function compileArrangementVideoFrames(
  scenes: Map<SceneId, Scene>,
  arrangement: ArrangementSlot[],
  frameRate: number,
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  bpm: number = 120
): VideoFrameData[] {
  const allFrames: VideoFrameData[] = [];
  
  if (arrangement.length === 0) {
    return allFrames;
  }
  
  // Sort arrangement by startBeat
  const sortedSlots = [...arrangement].sort((a, b) => a.startBeat - b.startBeat);
  
  let currentTimeOffset = 0;
  
  for (const slot of sortedSlots) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) continue;
    
    // Get loop count
    const loopCount = slot.instanceLoopCount ?? scene.loopCount ?? 1;
    
    // Convert scene nodes/edges arrays to Maps
    const nodesMap = new Map<NodeId, GraphNode>();
    const edgesMap = new Map<EdgeId, GraphEdge>();
    
    for (const node of scene.nodes) {
      nodesMap.set(node.id, node);
    }
    for (const edge of scene.edges) {
      edgesMap.set(edge.id, edge);
    }
    
    // Calculate scene duration
    const sceneBpm = slot.instanceBpm ?? scene.localBpm ?? bpm;
    const sceneBeatDuration = 60 / sceneBpm;
    const sceneDurationBeats = scene.durationBeats * loopCount;
    const sceneDurationSeconds = sceneDurationBeats * sceneBeatDuration;
    
    // Get scene musical context
    const sceneScale = scene.localScale !== null 
      ? SCALES[scene.localScale as ScaleName] 
      : musicalContext.scale;
    
    const sceneMusicalContext: MusicalContext = {
      ...musicalContext,
      ...(scene.localRoot !== null && { root: scene.localRoot }),
      scale: sceneScale,
      ...(scene.localScale !== null && { scaleName: scene.localScale as ScaleName }),
    };
    
    // Get scene viz config (use scene's config or generate default based on vizMode)
    const sceneVizMode: VizMode = scene.vizMode ?? 'particles';
    const defaultViz = getDefaultVizConfig(sceneVizMode);
    const sceneVizConfig: VizConfig = scene.vizConfig ?? defaultViz ?? getDefaultVizConfig('particles') as VizConfig;
    
    // Compile this scene's frames
    const sceneFrames = compileVideoFrames(
      nodesMap,
      edgesMap,
      sceneDurationSeconds,
      frameRate,
      sceneMusicalContext,
      globalSettings
    );
    
    // Add time offset and scene info to all frames
    for (const frame of sceneFrames) {
      allFrames.push({
        ...frame,
        time: frame.time + currentTimeOffset,
        beat: frame.beat + (currentTimeOffset / (60 / bpm)),
        // Include scene-specific viz info
        sceneId: slot.sceneId,
        vizMode: sceneVizMode,
        vizConfig: sceneVizConfig,
      });
    }
    
    currentTimeOffset += sceneDurationSeconds;
  }
  
  return allFrames;
}

/** Process packet arrival at a node (simplified version for video) */
function processVideoArrival(
  packet: SimPacket,
  node: GraphNode,
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  currentTime: number,
  beatDuration: number,
  simPackets: SimPacket[],
  activeNotes: SimNote[],
  nodeFlashes: Map<NodeId, number>
): void {
  // Flash the node
  nodeFlashes.set(node.id, 1);
  
  let payload = { ...packet.payload };
  
  switch (node.type) {
    case 'speaker': {
      const props = node.props as any;
      const volume = props.volume ?? 1.0;
      const pan = props.pan ?? 0;
      
      // Add to active notes
      activeNotes.push({
        frequency: payload.freq,
        gain: payload.gain * volume,
        pan,
        startTime: currentTime,
        holdTime: 0.05,
        releaseTime: 0.1,
        wave: payload.wave,
      });
      break;
    }
    
    case 'pitch': {
      const props = node.props as any;
      const semitones = props.semitones ?? 0;
      const newMidi = Math.max(0, Math.min(127, payload.midiNote + semitones));
      payload.midiNote = newMidi as MidiNote;
      payload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'polariser': {
      const props = node.props as any;
      payload.wave = props.wave ?? 'square';
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'gate': {
      const props = node.props as any;
      const probability = props.prob ?? 1.0;
      // Use deterministic random for reproducibility
      if (seededRandom(currentTime * 1000 + packet.id.charCodeAt(0)) < probability) {
        forwardPacket(node.id, payload, edges, simPackets, currentTime);
      }
      break;
    }
    
    case 'gain': {
      const props = node.props as any;
      payload.gain *= props.value ?? 1.0;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    default:
      // For other nodes, just forward the packet
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
  }
}

/** Forward a packet to outgoing edges */
function forwardPacket(
  nodeId: NodeId,
  payload: SimPacket['payload'],
  edges: Map<EdgeId, GraphEdge>,
  simPackets: SimPacket[],
  currentTime: number
): void {
  const outgoing = Array.from(edges.values()).filter(e => e.from === nodeId);
  for (const edge of outgoing) {
    simPackets.push({
      id: createPacketId(),
      edgeId: edge.id,
      t: 0,
      spawnTime: currentTime,
      payload: { ...payload },
    });
  }
}

/** Capture frame state at current time */
function captureFrame(
  time: number,
  bpm: number,
  simPackets: SimPacket[],
  activeNotes: SimNote[],
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  nodeFlashes: Map<NodeId, number>
): VideoFrameData {
  const beatDuration = 60 / bpm;
  const beat = time / beatDuration;
  const beatPhase = beat % 1;
  const barPhase = (beat % 4) / 4;
  
  // Convert simPackets to VizPacketData
  const packets: VizPacketData[] = [];
  for (const p of simPackets) {
    const edge = edges.get(p.edgeId);
    if (!edge) continue;
    
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (!fromNode || !toNode) continue;
    
    // Interpolate position
    const x = fromNode.x + (toNode.x - fromNode.x) * p.t;
    const y = fromNode.y + (toNode.y - fromNode.y) * p.t;
    
    // Compute velocity
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 100;
    
    packets.push({
      id: p.id,
      x,
      y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      frequency: p.payload.freq,
      midiNote: p.payload.midiNote,
      intensity: p.payload.gain,
      waveType: p.payload.wave,
      hue: midiToHue(p.payload.midiNote as number),
    });
  }
  
  // Convert nodes to VizNodeData
  const vizNodes: VizNodeData[] = [];
  for (const [id, node] of nodes) {
    let connectionCount = 0;
    for (const edge of edges.values()) {
      if (edge.from === id || edge.to === id) {
        connectionCount++;
      }
    }
    
    vizNodes.push({
      id,
      type: node.type,
      x: node.x,
      y: node.y,
      flash: nodeFlashes.get(id) ?? 0,
      connectionCount,
    });
  }
  
  // Convert active notes to VizNoteData
  const vizNotes: VizNoteData[] = activeNotes.map(note => {
    const noteAge = time - note.startTime;
    const totalDuration = note.holdTime + note.releaseTime;
    
    // Calculate envelope value
    let envelope = 0;
    if (noteAge < 0.01) {
      envelope = noteAge / 0.01; // Attack
    } else if (noteAge < note.holdTime) {
      envelope = 1; // Hold
    } else if (noteAge < totalDuration) {
      envelope = 1 - (noteAge - note.holdTime) / note.releaseTime; // Release
    }
    
    return {
      frequency: note.frequency,
      gain: note.gain,
      pan: note.pan,
      envelope,
      waveType: note.wave,
    };
  });
  
  // Compute aggregates
  const allFreqs = [...packets.map(p => p.frequency as number), ...vizNotes.map(n => n.frequency as number)];
  const averageFrequency = allFreqs.length > 0 
    ? allFreqs.reduce((a, b) => a + b, 0) / allFreqs.length 
    : 440;
  
  const allIntensities = [...packets.map(p => p.intensity), ...vizNotes.map(n => n.gain)];
  const averageIntensity = allIntensities.length > 0
    ? allIntensities.reduce((a, b) => a + b, 0) / allIntensities.length
    : 0;
  
  // Estimate packet density (rough calculation)
  const packetDensity = packets.length / 10;
  
  // Convert edges to VizEdgeData (for editor mode export)
  const vizEdges: VizEdgeData[] = [];
  for (const [id, edge] of edges) {
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (!fromNode || !toNode) continue;
    
    vizEdges.push({
      id,
      fromX: fromNode.x,
      fromY: fromNode.y,
      toX: toNode.x,
      toY: toNode.y,
      fromNodeId: edge.from,
      toNodeId: edge.to,
    });
  }
  
  return {
    time,
    beat,
    beatPhase,
    barPhase,
    packets,
    nodes: vizNodes,
    edges: vizEdges,
    activeNotes: vizNotes,
    averageFrequency,
    averageIntensity,
    packetDensity,
  };
}

/** Deterministic pseudo-random for reproducible video output */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
