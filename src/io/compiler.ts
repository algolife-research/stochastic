// Phonon v2 - Graph Compiler for Offline Audio Rendering
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
  GlobalSettings 
} from '@core/types';

export interface AudioEvent {
  time: number;
  freq: Frequency;
  midiNote: MidiNote;
  wave: WaveOrNoiseType;
  gain: number;
  timbre: number;
  cutoff: Frequency;
  holdTime: number;
  releaseTime: number;
  pan?: number;
  reverb?: number;
  waves?: Array<{ wave: WaveOrNoiseType; attack: number; decay: number; gain: number; ratio?: number }>;
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
    gain: number;
    holdTime: number;
    releaseTime: number;
    waves?: Array<{ wave: WaveOrNoiseType; attack: number; decay: number; gain: number; ratio?: number }>;
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
  globalSettings: GlobalSettings
): AudioEvent[] {
  const events: AudioEvent[] = [];
  const bpm = 120; // TODO: Get from global settings
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
      const interval = (node.props as any).interval || 2;
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
        
        const props = node.props as any;
        const noteIndex = props.noteIndex ?? -1;
        const intensity = props.intensity ?? 0.5;
        
        // Determine MIDI note
        let midiNote: number;
        if (noteIndex === -1) {
          // Random
          midiNote = 36 + Math.floor(Math.random() * 49);
        } else if (noteIndex === -2) {
          // Fixed
          midiNote = props.midiNote ?? 60;
        } else {
          // Legacy scale index
          const scale = musicalContext.scale;
          const octave = Math.floor(noteIndex / scale.length);
          const degree = noteIndex % scale.length;
          midiNote = musicalContext.root + octave * 12 + (scale[degree] || 0);
        }
        
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
              gain: intensity,
              holdTime: 0.05,
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
        processArrival(p, toNode, nodes, edges, currentTime, beatDuration, events, simPackets, heldPackets);
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
  heldPackets: Map<NodeId, Array<{ payload: SimPacket['payload']; releaseTime: number }>>
): void {
  let payload = { ...packet.payload };
  
  switch (node.type) {
    case 'speaker': {
      const props = node.props as any;
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
      const newWave = props.wave ?? 'square';
      const attack = props.attack ?? 0.01;
      const decay = props.decay ?? 0.4;
      const mix = props.mix ?? 1.0;
      
      // Add new wave layer (don't create default layer)
      const existingWaves = payload.waves ?? [];
      payload.wave = newWave;
      payload.timbre = 0.8;
      payload.waves = [...existingWaves, {
        wave: newWave,
        attack,
        decay,
        gain: mix,
      }];
      
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'noise': {
      const props = node.props as any;
      const noiseWave = props.wave ?? 'white';
      const attack = props.attack ?? 0.01;
      const decay = props.decay ?? 0.2;
      const mix = props.mix ?? 0.2;
      
      const existingWaves = payload.waves ?? [];
      payload.timbre = 0.9;
      payload.waves = [...existingWaves, {
        wave: noiseWave,
        attack,
        decay,
        gain: mix,
      }];
      
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'harmonic': {
      const props = node.props as any;
      const harmWave = props.wave ?? 'sine';
      const attack = props.attack ?? 0.01;
      const decay = props.decay ?? 0.4;
      const mix = props.mix ?? 0.5;
      const ratio = props.ratio ?? 2;
      
      const existingWaves = payload.waves ?? [];
      payload.timbre = 0.8;
      payload.waves = [...existingWaves, {
        wave: harmWave,
        attack,
        decay,
        gain: mix,
        ratio,
      }];
      
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'modulator': {
      const props = node.props as any;
      payload.vibratoRate = props.rate ?? 5;
      payload.vibratoDepth = props.depth ?? 20;
      payload.vibratoDelay = props.delay ?? 0.2;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'filter': {
      const props = node.props as any;
      payload.cutoff = (props.cutoff ?? 20000) as Frequency;
      const mod = props.mod ?? 0;
      if (mod !== 0) {
        payload.filterEnv = {
          attack: props.attack ?? 0,
          decay: props.decay ?? 0,
          mod,
        };
      }
      payload.timbre = Math.min(1, payload.timbre + 0.2);
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'gate': {
      const props = node.props as any;
      const probability = props.prob ?? 1.0;
      if (Math.random() < probability) {
        forwardPacket(node.id, payload, edges, simPackets, currentTime);
      }
      break;
    }
    
    case 'delay': {
      const props = node.props as any;
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
      const props = node.props as any;
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
      const props = node.props as any;
      const subNodes = props.subNodes ?? [];
      
      let currentPayload = { ...payload };
      
      for (const subNode of subNodes) {
        // Process each sub-node
        switch (subNode.type) {
          case 'speaker': {
            // Speaker inside tunnel - emit event
            const volume = subNode.props.volume ?? 1.0;
            const pan = subNode.props.pan ?? 0;
            const reverb = subNode.props.reverb ?? 0;
            
            events.push({
              time: currentTime,
              freq: currentPayload.freq,
              midiNote: currentPayload.midiNote,
              wave: currentPayload.wave,
              gain: currentPayload.gain * volume,
              timbre: currentPayload.timbre,
              cutoff: currentPayload.cutoff,
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
            const semitones = subNode.props.semitones ?? subNode.props.shift ?? 0;
            const newMidi = Math.max(0, Math.min(127, currentPayload.midiNote + semitones));
            currentPayload.midiNote = newMidi as MidiNote;
            currentPayload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
            break;
          }
          
          case 'polariser': {
            const attack = subNode.props.attack ?? 0.01;
            const decay = subNode.props.decay ?? 0.4;
            const mix = subNode.props.mix ?? 1.0;
            const existingWaves = currentPayload.waves ?? [];
            currentPayload.wave = subNode.props.wave ?? 'sine';
            currentPayload.timbre = 0.8;
            currentPayload.waves = [...existingWaves, {
              wave: subNode.props.wave ?? 'sine',
              attack,
              decay,
              gain: mix,
            }];
            break;
          }
          
          case 'noise': {
            const attack = subNode.props.attack ?? 0.01;
            const decay = subNode.props.decay ?? 0.2;
            const mix = subNode.props.mix ?? 0.2;
            const existingWaves = currentPayload.waves ?? [];
            currentPayload.timbre = 0.9;
            currentPayload.waves = [...existingWaves, {
              wave: subNode.props.wave ?? 'white',
              attack,
              decay,
              gain: mix,
            }];
            break;
          }
          
          case 'harmonic': {
            const attack = subNode.props.attack ?? 0.01;
            const decay = subNode.props.decay ?? 0.4;
            const mix = subNode.props.mix ?? 0.5;
            const ratio = subNode.props.ratio ?? 2;
            const existingWaves = currentPayload.waves ?? [];
            currentPayload.timbre = 0.8;
            currentPayload.waves = [...existingWaves, {
              wave: subNode.props.wave ?? 'sine',
              attack,
              decay,
              gain: mix,
              ratio,
            }];
            break;
          }
          
          case 'modulator': {
            currentPayload.vibratoRate = subNode.props.rate ?? 5;
            currentPayload.vibratoDepth = subNode.props.depth ?? 20;
            currentPayload.vibratoDelay = subNode.props.delay ?? 0.2;
            break;
          }
          
          case 'filter': {
            currentPayload.cutoff = (subNode.props.cutoff ?? 20000) as Frequency;
            const mod = subNode.props.mod ?? 0;
            if (mod !== 0) {
              currentPayload.filterEnv = {
                attack: subNode.props.attack ?? 0,
                decay: subNode.props.decay ?? 0,
                mod,
              };
            }
            break;
          }
          
          case 'gain': {
            currentPayload.gain *= subNode.props.value ?? 1.0;
            break;
          }
          
          case 'gate': {
            if (Math.random() > (subNode.props.prob ?? 0.5)) {
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
      const props = node.props as any;
      const channel = props.channel;
      const isEntry = props.isEntry ?? true;
      
      if (isEntry) {
        // Find exit teleporters
        for (const n of nodes.values()) {
          if (n.type === 'teleporter' && n.id !== node.id) {
            const nProps = n.props as any;
            if (nProps.channel === channel && !nProps.isEntry) {
              forwardPacket(n.id, payload, edges, simPackets, currentTime);
            }
          }
        }
      }
      break;
    }
    
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
