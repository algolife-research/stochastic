// Stochastic v2 - Graph Compiler for Offline Audio Rendering
// Simulates the graph to collect audio events for export

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
  PropsForNodeType
} from '@core/types';

export interface AudioEvent {
  time: number;
  freq: Frequency;
  midiNote: MidiNote;
  wave: WaveOrNoiseType;
  gain: number;
  timbre: number;
  cutoff: Frequency;
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  filterResonance: number;
  holdTime: number;
  releaseTime: number;
  pan?: number;
  reverb?: number;
  waves?: Array<{ 
    wave: WaveOrNoiseType; 
    attack: number; 
    decay: number; 
    gain: number; 
    ratio?: number;
    mode?: 'additive' | 'ring' | 'fm';
    modulationIndex?: number;
    feedback?: number;
    unison?: number;
    detune?: number;
    stereoSpread?: number;
  }>;
  vibratoRate?: number;
  vibratoDepth?: number;
  vibratoDelay?: number;
  filterEnv?: { attack: number; decay: number; mod: number };
}

interface SimPacket {
  id: string;
  edgeId: EdgeId;
  t: number;
  spawnTime: number;
  payload: {
    freq: Frequency;
    midiNote: MidiNote;
    wave: WaveOrNoiseType;
    timbre: number;
    cutoff: Frequency;
    filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
    filterResonance: number;
    gain: number;
    holdTime: number;
    releaseTime: number;
    waves?: Array<{ 
      wave: WaveOrNoiseType; 
      attack: number; 
      decay: number; 
      gain: number; 
      ratio?: number;
      mode?: 'additive' | 'ring' | 'fm';
      modulationIndex?: number;
      feedback?: number;
      unison?: number;
      detune?: number;
      stereoSpread?: number;
    }>;
    vibratoRate?: number;
    vibratoDepth?: number;
    vibratoDelay?: number;
    filterEnv?: { attack: number; decay: number; mod: number };
  };
}

/**
 * Compile graph into timed audio events for offline rendering
 */
export function compileGraph(
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  durationSeconds: number,
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  bpm: number = 120
): AudioEvent[] {
  const events: AudioEvent[] = [];
  const beatDuration = 60 / bpm;
  const ticksPerBeat = 100;
  const tickDuration = beatDuration / ticksPerBeat;
  const totalTicks = Math.ceil(durationSeconds / tickDuration);
  
  // Simulation state
  const simPackets: SimPacket[] = [];
  const nodeTimers = new Map<NodeId, { lastEmit: number; interval: number }>();
  const heldPackets = new Map<NodeId, Array<{ payload: SimPacket['payload']; releaseTime: number }>>();
  
  // Initialize source node timers
  for (const node of nodes.values()) {
    if (node.type === 'source') {
      const props = node.props as PropsForNodeType<'source'>;
      const interval = props.interval || 2;
      nodeTimers.set(node.id, { lastEmit: -Infinity, interval });
    }
  }
  
  // Main simulation loop
  for (let tick = 0; tick < totalTicks; tick++) {
    const currentTime = tick * tickDuration;
    const currentBeat = currentTime / beatDuration;
    
    // 1. Emit from source nodes
    for (const node of nodes.values()) {
      if (node.type !== 'source') continue;
      
      const timer = nodeTimers.get(node.id);
      if (!timer) continue;
      
      if (currentBeat - timer.lastEmit >= timer.interval) {
        timer.lastEmit = currentBeat;
        
        const props = node.props as PropsForNodeType<'source'>;
        const noteIndex = props.noteIndex ?? -1;
        const intensity = props.intensity ?? 0.5;
        
        // Determine MIDI note - aligned with live engine (tick.ts)
        let midiNote: number;
        if (noteIndex >= 0) {
          // Legacy scale-based index (same as live engine)
          // LEGACY_SCALE_OFFSET = 36
          midiNote = 36 + Math.min(36, noteIndex);
        } else if (noteIndex === -1) {
          // Random note
          midiNote = 36 + Math.floor(Math.random() * 49);
        } else {
          // Fixed MIDI note (noteIndex < -1, typically -2)
          midiNote = props.midiNote ?? 60;
        }
        
        // Clamp to valid MIDI range
        midiNote = Math.max(0, Math.min(127, midiNote));
        
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12) as Frequency;
        
        // Spawn packets to outgoing edges
        const outgoing = Array.from(edges.values()).filter(e => e.from === node.id);
        
        for (const edge of outgoing) {
          simPackets.push({
            id: crypto.randomUUID(),
            edgeId: edge.id,
            t: 0,
            spawnTime: currentTime,
            payload: {
              freq,
              midiNote: midiNote as MidiNote,
              wave: 'sine',
              timbre: 0,
              cutoff: 20000 as Frequency,
              filterType: 'lowpass',
              filterResonance: 0,
              gain: intensity,
              holdTime: 0,
              releaseTime: 0.1,
            },
          });
        }
      }
    }
    
    // 2. Release held packets from delay nodes
    for (const node of nodes.values()) {
      if (node.type !== 'delay') continue;
      
      const held = heldPackets.get(node.id) || [];
      const toRelease = held.filter(h => h.releaseTime <= currentTime);
      
      for (const h of toRelease) {
        const outgoing = Array.from(edges.values()).filter(e => e.from === node.id);
        for (const edge of outgoing) {
          simPackets.push({
            id: crypto.randomUUID(),
            edgeId: edge.id,
            t: 0,
            spawnTime: currentTime,
            payload: { ...h.payload },
          });
        }
      }
      
      heldPackets.set(node.id, held.filter(h => h.releaseTime > currentTime));
    }
    
    // 3. Move packets and process arrivals
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
        // Process arrival at destination node
        processArrival(p, toNode, nodes, edges, currentTime, beatDuration, events, simPackets, heldPackets, musicalContext);
        simPackets.splice(i, 1);
      }
    }
  }
  
  return events.sort((a, b) => a.time - b.time);
}

function processArrival(
  packet: SimPacket,
  node: GraphNode,
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  currentTime: number,
  beatDuration: number,
  events: AudioEvent[],
  simPackets: SimPacket[],
  heldPackets: Map<NodeId, Array<{ payload: SimPacket['payload']; releaseTime: number }>>,
  musicalContext: MusicalContext
): void {
  let payload = { ...packet.payload };
  
  switch (node.type) {
    case 'speaker': {
      const props = node.props as PropsForNodeType<'speaker'>;
      const volume = props.volume ?? 1.0;
      const pan = props.pan ?? 0;
      const reverb = props.reverb ?? 0;
      
      events.push({
        time: currentTime,
        freq: payload.freq,
        midiNote: payload.midiNote,
        wave: payload.wave,
        gain: payload.gain * volume,
        timbre: payload.timbre,
        cutoff: payload.cutoff,
        filterType: payload.filterType,
        filterResonance: payload.filterResonance,
        holdTime: payload.holdTime,
        releaseTime: payload.releaseTime,
        pan,
        reverb,
        waves: payload.waves,
        vibratoRate: payload.vibratoRate,
        vibratoDepth: payload.vibratoDepth,
        vibratoDelay: payload.vibratoDelay,
        filterEnv: payload.filterEnv,
      });
      break;
    }
    
    case 'pitch': {
      const props = node.props as PropsForNodeType<'pitch'>;
      // Compiler only supports shift mode for now
      const semitones = props.shift ?? 0;
      const newMidi = Math.max(0, Math.min(127, payload.midiNote + semitones));
      payload.midiNote = newMidi as MidiNote;
      payload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'oscillator': {
      const props = node.props as PropsForNodeType<'oscillator'>;
      const wave = props.wave ?? 'sawtooth';
      const attack = props.attack ?? 0.01;
      const decay = props.decay ?? 0.4;
      const mix = props.mix ?? 1.0;
      const ratio = props.ratio ?? 1;
      const mode = props.mode ?? 'additive';
      const modulationIndex = props.modulationIndex ?? 2;
      const feedback = props.feedback ?? 0;
      const unison = props.unison ?? 1;
      const detune = props.detune ?? 0;
      const stereoSpread = props.stereoSpread ?? 0.5;
      
      // Add wave layer
      const existingWaves = payload.waves ?? [];
      payload.wave = wave;
      payload.timbre = 0.8;
      payload.waves = [...existingWaves, {
        wave,
        attack,
        decay,
        gain: mix,
        ratio,
        mode,
        modulationIndex,
        feedback,
        unison,
        detune,
        stereoSpread,
      }];
      
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'modulator': {
      const props = node.props as PropsForNodeType<'modulator'>;
      payload.vibratoRate = props.rate ?? 5;
      payload.vibratoDepth = props.depth ?? 20;
      payload.vibratoDelay = props.delay ?? 0.2;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'filter': {
      const props = node.props as PropsForNodeType<'filter'>;
      payload.cutoff = (props.cutoff ?? 20000) as Frequency;
      payload.filterType = props.type ?? 'lowpass';
      payload.filterResonance = props.resonance ?? 0;
      const mod = props.mod ?? 0;
      if (mod !== 0) {
        payload.filterEnv = {
          attack: props.attack ?? 0,
          decay: props.decay ?? 0,
          mod,
        };
      }
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'gate': {
      const props = node.props as PropsForNodeType<'gate'>;
      const mode = props.mode ?? 'probability';
      
      // Probability mode - simple random gate
      if (mode === 'probability') {
        const probability = props.probability ?? 1.0;
        if (Math.random() < probability) {
          forwardPacket(node.id, payload, edges, simPackets, currentTime);
        }
        break;
      }
      
      // Fitness modes - criteria-based selection
      let survives = true;
      
      // Harmonic fitness
      if (mode === 'harmonic' || mode === 'all') {
        const threshold = props.harmonicThreshold ?? 0.5;
        const scale = musicalContext.scale;
        const root = musicalContext.root;
        const chroma = payload.midiNote % 12;
        const relativeToRoot = (chroma - root + 12) % 12;
        const inScale = scale.includes(relativeToRoot);
        
        if (!inScale) {
          let minDist = 12;
          for (const interval of scale) {
            const scaleChroma = (root + interval) % 12;
            const d = Math.min(Math.abs(chroma - scaleChroma), 12 - Math.abs(chroma - scaleChroma));
            minDist = Math.min(minDist, d);
          }
          const consonance = 1 - (minDist / 6);
          if (consonance < threshold) survives = false;
        }
      }
      
      // Energy fitness
      if (survives && (mode === 'energy' || mode === 'all')) {
        const threshold = props.energyThreshold ?? 0.2;
        if (payload.gain < threshold) survives = false;
      }
      
      if (survives) {
        forwardPacket(node.id, payload, edges, simPackets, currentTime);
      }
      break;
    }
    
    case 'delay': {
      const props = node.props as PropsForNodeType<'delay'>;
      const delayBeats = props.delayTime ?? 1;
      const delaySeconds = delayBeats * beatDuration;
      
      if (!heldPackets.has(node.id)) {
        heldPackets.set(node.id, []);
      }
      heldPackets.get(node.id)!.push({
        payload,
        releaseTime: currentTime + delaySeconds,
      });
      break;
    }
    
    case 'gain': {
      const props = node.props as PropsForNodeType<'gain'>;
      const gainMult = props.value ?? 1.0;
      payload.gain *= gainMult;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'quantizer': {
      // Snap to scale - simplified version (just pass through for now)
      // const props = node.props as any;
      // Proper quantization would need scale info
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'tunnel': {
      const props = node.props as PropsForNodeType<'tunnel'>;
      const subNodes = props.subNodes ?? [];
      
      let currentPayload = { ...payload };
      
      for (const subNode of subNodes) {
        // Process each sub-node (subNode.props is Record<string, unknown>)
        switch (subNode.type) {
          case 'speaker': {
            // Speaker inside tunnel - emit event
            const subProps = subNode.props as any; // SubNode type limitation
            const volume = subProps.volume ?? 1.0;
            const pan = subProps.pan ?? 0;
            const reverb = subProps.reverb ?? 0;
            
            events.push({
              time: currentTime,
              freq: currentPayload.freq,
              midiNote: currentPayload.midiNote,
              wave: currentPayload.wave,
              gain: currentPayload.gain * volume,
              timbre: currentPayload.timbre,
              cutoff: currentPayload.cutoff,
              filterType: currentPayload.filterType,
              filterResonance: currentPayload.filterResonance,
              holdTime: currentPayload.holdTime,
              releaseTime: currentPayload.releaseTime,
              pan,
              reverb,
              waves: currentPayload.waves,
              vibratoRate: currentPayload.vibratoRate,
              vibratoDepth: currentPayload.vibratoDepth,
              vibratoDelay: currentPayload.vibratoDelay,
              filterEnv: currentPayload.filterEnv,
            });
            return; // Speaker is terminus
          }
          
          case 'pitch': {
            const subProps = subNode.props as any; // SubNode type limitation
            const semitones = subProps.semitones ?? subProps.shift ?? 0;
            const newMidi = Math.max(0, Math.min(127, currentPayload.midiNote + semitones));
            currentPayload.midiNote = newMidi as MidiNote;
            currentPayload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
            break;
          }
          
          case 'oscillator': {
            const subProps = subNode.props as any; // SubNode type limitation
            const attack = subProps.attack ?? 0.01;
            const decay = subProps.decay ?? 0.4;
            const mix = subProps.mix ?? 1.0;
            const ratio = subProps.ratio ?? 1;
            const mode = subProps.mode ?? 'additive';
            const modulationIndex = subProps.modulationIndex ?? 2;
            const feedback = subProps.feedback ?? 0;
            const existingWaves = currentPayload.waves ?? [];
            currentPayload.wave = subProps.wave ?? 'sawtooth';
            currentPayload.timbre = 0.8;
            currentPayload.waves = [...existingWaves, {
              wave: subProps.wave ?? 'sawtooth',
              attack,
              decay,
              gain: mix,
              ratio,
              mode,
              modulationIndex,
              feedback,
            }];
            break;
          }
          
          case 'modulator': {
            const subProps = subNode.props as any; // SubNode type limitation
            currentPayload.vibratoRate = subProps.rate ?? 5;
            currentPayload.vibratoDepth = subProps.depth ?? 20;
            currentPayload.vibratoDelay = subProps.delay ?? 0.2;
            break;
          }
          
          case 'filter': {
            const subProps = subNode.props as any; // SubNode type limitation
            currentPayload.cutoff = (subProps.cutoff ?? 20000) as Frequency;
            const mod = subProps.mod ?? 0;
            if (mod !== 0) {
              currentPayload.filterEnv = {
                attack: subProps.attack ?? 0,
                decay: subProps.decay ?? 0,
                mod,
              };
            }
            break;
          }
          
          case 'gain': {
            const subProps = subNode.props as any; // SubNode type limitation
            currentPayload.gain *= subProps.value ?? 1.0;
            break;
          }
          
          case 'gate': {
            const subProps = subNode.props as any; // SubNode type limitation
            if (Math.random() > (subProps.probability ?? 0.5)) {
              return; // Gate blocked
            }
            break;
          }
        }
      }
      
      // Forward processed payload
      payload = currentPayload;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'teleporter': {
      const props = node.props as PropsForNodeType<'teleporter'>;
      const channel = props.channel;
      const isEntry = props.isEntry ?? true;
      
      if (isEntry) {
        // Find exit teleporters
        for (const n of nodes.values()) {
          if (n.type === 'teleporter' && n.id !== node.id) {
            const nProps = n.props as PropsForNodeType<'teleporter'>;
            if (nProps.channel === channel && !nProps.isEntry) {
              forwardPacket(n.id, payload, edges, simPackets, currentTime);
            }
          }
        }
      }
      break;
    }
    
    case 'mutator': {
      const props = node.props as PropsForNodeType<'mutator'>;
      const probability = props.probability ?? 0.5;
      const mode = props.mode ?? 'drift';
      const targets = props.targets ?? ['pitch'];
      
      // Check probability
      if (Math.random() > probability) {
        forwardPacket(node.id, payload, edges, simPackets, currentTime);
        break;
      }
      
      if (mode === 'drift') {
        if (targets.includes('pitch')) {
          const drift = (Math.random() - 0.5) * 2 * (props.pitchDrift ?? 2);
          const newMidi = Math.max(0, Math.min(127, Math.round(payload.midiNote + drift)));
          payload.midiNote = newMidi as MidiNote;
          payload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
        }
        if (targets.includes('gain')) {
          const drift = (Math.random() - 0.5) * 2 * (props.gainDrift ?? 0.1);
          payload.gain = Math.max(0, Math.min(1, payload.gain + drift));
        }
        if (targets.includes('cutoff')) {
          const ratio = 1 + (Math.random() - 0.5) * 2 * (props.cutoffDrift ?? 0.2);
          payload.cutoff = Math.max(20, Math.min(20000, payload.cutoff * ratio)) as Frequency;
        }
      } else {
        // Radiation mode
        if (targets.includes('pitch')) {
          const jump = (Math.random() - 0.5) * 2 * (props.pitchRadiation ?? 12);
          const newMidi = Math.max(0, Math.min(127, Math.round(payload.midiNote + jump)));
          payload.midiNote = newMidi as MidiNote;
          payload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
        }
        if (targets.includes('gain')) {
          payload.gain = Math.random();
        }
        if (targets.includes('cutoff')) {
          payload.cutoff = (200 + Math.random() * 19800) as Frequency;
        }
      }
      
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'crossover': {
      // Crossover waits for two parents - simplified: just pass through with slight variation
      // For proper crossover simulation, we'd need to track packet pairs per node
      const props = node.props as PropsForNodeType<'crossover'>;
      const held = heldPackets.get(node.id) || [];
      
      if (held.length === 0) {
        // First parent - hold it
        const timeout = (props.timeout ?? 2) * beatDuration;
        heldPackets.set(node.id, [{ payload, releaseTime: currentTime + timeout }]);
      } else {
        // Second parent - perform crossover
        const firstParent = held[0]!.payload;
        const offspring = { ...payload };
        
        // Crossover logic
        const pitchFrom = props.pitchFrom ?? 'average';
        if (pitchFrom === 'average') {
          const avgMidi = Math.round((firstParent.midiNote + payload.midiNote) / 2);
          offspring.midiNote = avgMidi as MidiNote;
          offspring.freq = (440 * Math.pow(2, (avgMidi - 69) / 12)) as Frequency;
        } else if (pitchFrom === 'b') {
          offspring.midiNote = payload.midiNote;
          offspring.freq = payload.freq;
        } else if (pitchFrom === 'random') {
          if (Math.random() < 0.5) {
            offspring.midiNote = firstParent.midiNote;
            offspring.freq = firstParent.freq;
          }
        }
        // pitchFrom === 'a' keeps offspring as-is (already copied from payload)
        
        // Clear held and forward offspring
        heldPackets.set(node.id, []);
        forwardPacket(node.id, offspring, edges, simPackets, currentTime);
      }
      break;
    }
    
    case 'lfo':
      // LFO nodes don't process packets - they modulate other nodes
      // Skip packet forwarding
      break;
    
    case 'scene_trigger':
      // Scene triggers are not relevant during offline export
      // Just pass through
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    
    case 'splitter':
    default:
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
  }
}

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
      id: crypto.randomUUID(),
      edgeId: edge.id,
      t: 0,
      spawnTime: currentTime,
      payload: { ...payload },
    });
  }
}

// Import Scene and ArrangementSlot types for arrangement compilation
import type { Scene, ArrangementSlot, SceneId, ScaleName } from '@core/types';
import { SCALES } from '@core/constants';

/**
 * Compile an arrangement (multi-channel scenes) into timed audio events.
 * Scenes on different channels play simultaneously based on their startBeat positions.
 */
export function compileArrangement(
  scenes: Map<SceneId, Scene>,
  arrangement: ArrangementSlot[],
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  bpm: number = 120
): AudioEvent[] {
  const allEvents: AudioEvent[] = [];
  
  if (arrangement.length === 0) {
    return allEvents;
  }
  
  const beatDuration = 60 / bpm;
  
  // Process each slot independently - slots can overlap on different channels
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) {
      continue;
    }
    
    // Get loop count (slot override or scene default)
    const loopCount = slot.instanceLoopCount ?? scene.loopCount ?? 1;
    
    // Convert scene nodes/edges arrays to Maps for compileGraph
    const nodesMap = new Map<NodeId, GraphNode>();
    const edgesMap = new Map<EdgeId, GraphEdge>();
    
    for (const node of scene.nodes) {
      nodesMap.set(node.id, node);
    }
    for (const edge of scene.edges) {
      edgesMap.set(edge.id, edge);
    }
    
    // Calculate scene timing
    const sceneBpm = slot.instanceBpm ?? scene.localBpm ?? bpm;
    const sceneBeatDuration = 60 / sceneBpm;
    const sceneDurationBeats = scene.durationBeats * loopCount;
    const sceneDurationSeconds = sceneDurationBeats * sceneBeatDuration;
    
    // Calculate the time offset for this slot based on its startBeat
    const slotStartTime = slot.startBeat * beatDuration;
    
    // Use scene's local musical context if available
    const sceneScale = scene.localScale !== null 
      ? SCALES[scene.localScale as ScaleName] 
      : musicalContext.scale;
    
    const sceneMusicalContext: MusicalContext = {
      ...musicalContext,
      ...(scene.localRoot !== null && { root: scene.localRoot }),
      scale: sceneScale,
      ...(scene.localScale !== null && { scaleName: scene.localScale as ScaleName }),
    };
    
    // Compile this scene (pass scene's BPM)
    const sceneEvents = compileGraph(
      nodesMap,
      edgesMap,
      sceneDurationSeconds,
      sceneMusicalContext,
      globalSettings,
      sceneBpm
    );
    
    // Add time offset based on slot's startBeat position (not sequential)
    for (const event of sceneEvents) {
      allEvents.push({
        ...event,
        time: event.time + slotStartTime,
      });
    }
  }
  
  return allEvents.sort((a, b) => a.time - b.time);
}

/**
 * Calculate total duration of an arrangement in seconds.
 * With multi-channel support, duration is the maximum end time across all slots.
 */
export function calculateArrangementDuration(
  scenes: Map<SceneId, Scene>,
  arrangement: ArrangementSlot[],
  bpm: number = 120
): number {
  if (arrangement.length === 0) return 0;
  
  const beatDuration = 60 / bpm;
  let maxEndTime = 0;
  
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) continue;
    
    const loopCount = slot.instanceLoopCount ?? scene.loopCount ?? 1;
    const sceneBpm = slot.instanceBpm ?? scene.localBpm ?? bpm;
    const sceneBeatDuration = 60 / sceneBpm;
    const sceneDurationBeats = scene.durationBeats * loopCount;
    const sceneDurationSeconds = sceneDurationBeats * sceneBeatDuration;
    
    // Calculate when this slot ends (startBeat position + scene duration)
    const slotStartTime = slot.startBeat * beatDuration;
    const slotEndTime = slotStartTime + sceneDurationSeconds;
    
    maxEndTime = Math.max(maxEndTime, slotEndTime);
  }
  
  return maxEndTime;
}
