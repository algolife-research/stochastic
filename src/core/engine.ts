// Phonon v2 - Packet Processing Engine
// Handles packet movement, node processing, and audio triggers

import { getGraphStore } from './store';
import type { 
  Packet, GraphNode, GraphEdge, AudioPayload, 
  NodeId, MidiNote, Frequency, QuantizerProps, SceneTriggerProps,
  MutatorProps, GateProps, WaveType, WaveLayer
} from './types';
import { 
  dist, midiToFreq, clampMidi, SCALES 
} from './constants';

// ============================================================================
// PACKET PROCESSING
// ============================================================================

/**
 * Process packet arrival at a node and transform payload
 */
export function processNodeArrival(
  packet: Packet, 
  node: GraphNode, 
  edge: GraphEdge
): AudioPayload {
  const payload = { ...packet.payload };
  
  // Skip modulation edges for audio processing
  // Check for truthy targetParam (string), not !== null, because undefined edges also exist
  if (edge.targetParam) {
    return payload;
  }
  
  switch (node.type) {
    case 'pitch':
      return processPitch(payload, node);
    case 'oscillator':
      return processOscillator(payload, node);
    case 'filter':
      return processFilter(payload, node);
    case 'gate':
      return processGate(payload, node);
    case 'gain':
      return processGain(payload, node);
    case 'modulator':
      return processModulator(payload, node);
    case 'quantizer':
      return processQuantizer(payload, node);
    case 'delay':
      return processDelay(payload, node);
    case 'tunnel':
      return processTunnel(payload, node);
    case 'lfo':
      return processLFO(payload, node);
    case 'splitter':
      return processSplitter(payload, node);
    case 'scene_trigger':
      return processSceneTrigger(payload, node);
    case 'mutator':
      return processMutator(payload, node);
    // Note: crossover is handled specially in tick.ts, not here
    default:
      return payload;
  }
}

function processPitch(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { mode: 'shift' | 'set'; shift: number; fixedMidiNote: MidiNote };
  
  if (props.mode === 'set') {
    const newMidi = clampMidi(props.fixedMidiNote);
    return {
      ...payload,
      midiNote: newMidi,
      freq: midiToFreq(newMidi),
    };
  } else {
    const newMidi = clampMidi(payload.midiNote + props.shift);
    return {
      ...payload,
      midiNote: newMidi,
      freq: midiToFreq(newMidi),
    };
  }
}

function processOscillator(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { 
    wave: WaveType; 
    ratio: number; 
    attack: number; 
    decay: number; 
    mix: number;
    mode?: 'additive' | 'ring' | 'fm';
    modulationIndex?: number;
    feedback?: number;
    unison?: number;
    detune?: number;
    stereoSpread?: number;
  };
  
  const newLayer: WaveLayer = {
    wave: props.wave,
    attack: props.attack,
    decay: props.decay,
    gain: props.mix ?? 1.0,
    ratio: props.ratio ?? 1.0,
    mode: props.mode ?? 'additive',
    modulationIndex: props.modulationIndex ?? 2,
    feedback: props.feedback ?? 0,
    unison: props.unison ?? 1,
    detune: props.detune ?? 0,
    stereoSpread: props.stereoSpread ?? 0.5,
  };
  
  // Add to existing waves array
  const existingWaves = payload.waves ?? [];
  
  return {
    ...payload,
    wave: props.wave,  // Also set the primary wave type
    timbre: 0.8,
    waves: [...existingWaves, newLayer],
  };
}

function processFilter(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { 
    type?: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
    cutoff: Frequency; 
    resonance?: number;
    attack: number; 
    decay: number; 
    mod: number;
  };
  
  return {
    ...payload,
    cutoff: props.cutoff,
    filterType: props.type ?? 'lowpass',
    filterResonance: props.resonance ?? 0,
    filterEnv: props.mod !== 0 ? {
      attack: props.attack,
      decay: props.decay,
      mod: props.mod,
    } : undefined,
  };
}

function processGate(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as GateProps;
  const mode = props.mode ?? 'probability';
  
  // Probability mode - simple random gate
  if (mode === 'probability') {
    if (Math.random() > props.probability) {
      return { ...payload, gain: -1 };
    }
    return payload;
  }
  
  // Fitness modes - criteria-based selection
  const store = getGraphStore();
  
  // Get scale for harmonic fitness calculation
  const { root, scaleName } = props.useGlobalKey
    ? {
        root: store.scenePlayback.effectiveRoot ?? store.musicalContext.root,
        scaleName: store.scenePlayback.effectiveScale ?? store.musicalContext.scaleName
      }
    : { root: props.root, scaleName: props.scale };
  
  const scale = SCALES[scaleName];
  if (!scale) return payload;
  
  let survives = true;
  
  // Check harmonic fitness (is the note consonant with the scale?)
  if (mode === 'harmonic' || mode === 'all') {
    const chroma = payload.midiNote % 12;
    const relativeToRoot = (chroma - root + 12) % 12;
    
    // Check if note is in scale
    const inScale = scale.includes(relativeToRoot);
    
    if (!inScale) {
      // Note is not in scale - calculate dissonance
      let minDist = 12;
      for (const interval of scale) {
        const scaleChroma = (root + interval) % 12;
        const d = Math.min(
          Math.abs(chroma - scaleChroma),
          12 - Math.abs(chroma - scaleChroma)
        );
        minDist = Math.min(minDist, d);
      }
      
      // Convert distance to consonance (0 = dissonant, 1 = consonant)
      const consonance = 1 - (minDist / 6);
      
      if (consonance < props.harmonicThreshold) {
        survives = false;
      }
    }
  }
  
  // Check energy fitness (is the packet loud enough?)
  if (survives && (mode === 'energy' || mode === 'all')) {
    if (payload.gain < props.energyThreshold) {
      survives = false;
    }
  }
  
  // Check density fitness (is there room for more packets?)
  if (survives && (mode === 'density' || mode === 'all')) {
    const now = performance.now();
    const msPerBeat = (60 / store.masterSpeed) * 1000;
    
    // Use node's timer to track packets per beat window
    if (now - node.lastTrigger > msPerBeat) {
      node.timer = 0;
      node.lastTrigger = now;
    }
    
    node.timer += 1;
    
    if (node.timer > props.densityThreshold) {
      survives = false;
    }
  }
  
  if (!survives) {
    return { ...payload, gain: -1 };
  }
  
  return payload;
}

function processGain(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { value: number };
  
  return {
    ...payload,
    gain: payload.gain * props.value,
  };
}

function processModulator(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { rate: Frequency; depth: number; delay: number };
  
  return {
    ...payload,
    vibratoRate: props.rate,
    vibratoDepth: props.depth,
    vibratoDelay: props.delay,
  };
}

function processQuantizer(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as QuantizerProps;
  const store = getGraphStore();
  
  if (Math.random() > props.strength) {
    return payload;
  }
  
  const { root, scaleName } = props.useGlobalKey 
    ? { 
        root: store.scenePlayback.effectiveRoot ?? store.musicalContext.root, 
        scaleName: store.scenePlayback.effectiveScale ?? store.musicalContext.scaleName 
      }
    : { root: props.root, scaleName: props.scale };
    
  const scale = SCALES[scaleName];
  
  // Safety check: if scale is undefined (e.g. invalid prop), pass through
  if (!scale) return payload;
  
  if (props.mode === 'random') {
    // Weighted random selection
    const weights = props.weights;
    const indices = Object.keys(weights).map(Number);
    
    let selectedIndex = 0;
    
    // Filter indices to only those valid for the current scale
    const validIndices = indices.filter(i => i < scale.length);
    
    if (validIndices.length === 0) {
      // Uniform random if no weights
      selectedIndex = Math.floor(Math.random() * scale.length);
    } else {
      // Calculate total weight
      let totalWeight = 0;
      for (const i of validIndices) {
        totalWeight += (weights[i] || 0);
      }
      
      if (totalWeight <= 0) {
         const idx = Math.floor(Math.random() * validIndices.length);
         selectedIndex = validIndices[idx] ?? 0;
      } else {
        let r = Math.random() * totalWeight;
        for (const i of validIndices) {
          r -= (weights[i] || 0);
          if (r <= 0) {
            selectedIndex = i;
            break;
          }
        }
      }
    }
    
    const interval = scale[selectedIndex] ?? 0;
    const chroma = (root + interval) % 12;
    const octave = props.defaultPitch;
    const quantized = octave * 12 + chroma;
    
    return {
      ...payload,
      midiNote: clampMidi(quantized),
      freq: midiToFreq(clampMidi(quantized)),
    };

  } else {
    // Nearest neighbor (existing logic)
    const midiNote = payload.midiNote;
    const chroma = midiNote % 12;
    const octave = Math.floor(midiNote / 12);
    
    // Find nearest scale degree
    let minDist = 12;
    let nearestChroma = chroma;
    
    for (const interval of scale) {
      const scaleChroma = (root + interval) % 12;
      const d = Math.min(
        Math.abs(chroma - scaleChroma),
        12 - Math.abs(chroma - scaleChroma)
      );
      if (d < minDist) {
        minDist = d;
        nearestChroma = scaleChroma;
      }
    }
    
    let quantized = octave * 12 + nearestChroma;
    if (nearestChroma > chroma + 6) quantized -= 12;
    else if (nearestChroma < chroma - 6) quantized += 12;
    
    const newMidi = clampMidi(quantized);
    
    return {
      ...payload,
      midiNote: newMidi,
      freq: midiToFreq(newMidi),
    };
  }
}

function processSceneTrigger(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as SceneTriggerProps;
  const store = getGraphStore();
  
  // Scene triggers are only meaningful in Jam mode
  // In Arrangement mode, scenes are scheduled on a timeline, not triggered dynamically
  if (store.scenePlayback.mode === 'arrangement') {
    // Just pass through without triggering - the node is inactive in this mode
    return payload;
  }
  
  // Get all scenes to find the target by index
  const scenes = store.getScenesArray();
  
  // Check if index is valid
  if (props.targetSceneIndex >= 0 && props.targetSceneIndex < scenes.length) {
    const targetScene = scenes[props.targetSceneIndex];
    
    if (targetScene) {
      if (props.behavior === 'jump') {
        // Immediate jump - use setTimeout to avoid modifying store during tick iteration
        setTimeout(() => {
          store.triggerSceneImmediate(targetScene.id);
        }, 0);
      } else {
        // Queue for next quantize point (default to bar)
        store.queueScene(targetScene.id, 'bar');
      }
    }
  }
  
  return payload;
}

function processDelay(payload: AudioPayload, _node: GraphNode): AudioPayload {
  // Delay is handled by edge timing, not payload transformation
  return payload;
}

// Track pending speaker triggers from tunnels
let pendingTunnelSpeakers: Array<{ payload: AudioPayload; speakerProps: Record<string, unknown> }> = [];

/**
 * Get and clear pending tunnel speaker events
 * Called by tick.ts to trigger audio for speakers inside tunnels
 */
export function consumePendingTunnelSpeakers(): Array<{ payload: AudioPayload; speakerProps: Record<string, unknown> }> {
  const speakers = pendingTunnelSpeakers;
  pendingTunnelSpeakers = [];
  return speakers;
}

function processTunnel(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as unknown as { subNodes: Array<{ type: string; props: Record<string, unknown> }> };
  
  // If no subNodes, just pass through
  if (!props.subNodes) return payload;
  
  // Process through each sub-node in sequence
  let result = payload;
  for (const subNode of props.subNodes) {
    // Special handling for speaker inside tunnel
    if (subNode.type === 'speaker') {
      // Queue this for audio playback
      pendingTunnelSpeakers.push({
        payload: { ...result },
        speakerProps: subNode.props,
      });
      // Speaker is a terminus - stop processing sub-nodes
      return result;
    }
    
    const fakeNode = {
      ...node,
      type: subNode.type,
      props: subNode.props,
    } as unknown as GraphNode;
    
    result = processNodeArrival({ ...{ id: '' as never, edgeId: '' as never, t: 1, payload: result } }, fakeNode, { targetParam: null } as GraphEdge);
    
    // Check if gate blocked
    if (result.gain < 0) break;
  }
  
  return result;
}

function processLFO(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as {
    rate: number;
    shape: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'random' | 'noise';
    min: number;
    max: number;
    phase: number;
  };
  
  const rate = props.rate ?? 1;
  const shape = props.shape ?? 'sine';
  const min = props.min ?? 0;
  const max = props.max ?? 1;
  const phase = props.phase ?? 0;
  
  // Calculate time-based value
  const t = (performance.now() / 1000) * rate + phase;
  
  let value: number;
  switch (shape) {
    case 'sine':
      value = (Math.sin(t * Math.PI * 2) + 1) / 2;
      break;
    case 'triangle':
      value = 1 - Math.abs((t % 1) * 2 - 1);
      break;
    case 'square':
      value = (t % 1) < 0.5 ? 1 : 0;
      break;
    case 'sawtooth':
      value = t % 1;
      break;
    case 'random':
      // Sample and Hold: stable random value for each cycle
      const cycle = Math.floor(t);
      // Simple hash function for deterministic random per cycle
      value = Math.abs(Math.sin(cycle * 12.9898 + 78.233) * 43758.5453) % 1;
      break;
    case 'noise':
      // Pure white noise
      value = Math.random();
      break;
    default:
      value = 0.5;
  }
  
  // Map to min/max range
  const modulationValue = min + value * (max - min);
  
  return {
    ...payload,
    modulationValue,
  };
}

function processSplitter(payload: AudioPayload, _node: GraphNode): AudioPayload {
  // Splitter just passes payload through unchanged
  // The splitting happens at the edge level (one node can have multiple outgoing edges)
  return payload;
}

// ============================================================================
// EVOLUTIONARY NODES
// ============================================================================

const WAVE_TYPES: WaveType[] = ['sine', 'square', 'sawtooth', 'triangle'];

/**
 * Mutator Node - Applies genetic drift or radiation mutations to packets
 */
function processMutator(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as MutatorProps;
  
  // Check probability - skip mutation if random roll fails
  if (Math.random() > props.probability) {
    return payload;
  }
  
  const result = { ...payload };
  const targets = props.targets || ['pitch'];
  
  if (props.mode === 'drift') {
    // Drift mode: small, incremental changes
    
    if (targets.includes('pitch')) {
      // Apply small pitch drift
      const drift = (Math.random() - 0.5) * 2 * props.pitchDrift;
      const newMidi = clampMidi(Math.round(result.midiNote + drift));
      result.midiNote = newMidi;
      result.freq = midiToFreq(newMidi);
    }
    
    if (targets.includes('gain')) {
      // Apply small gain drift
      const drift = (Math.random() - 0.5) * 2 * props.gainDrift;
      result.gain = Math.max(0, Math.min(1, result.gain + drift));
    }
    
    if (targets.includes('cutoff')) {
      // Apply cutoff drift as a ratio
      const ratio = 1 + (Math.random() - 0.5) * 2 * props.cutoffDrift;
      result.cutoff = Math.max(20, Math.min(20000, result.cutoff * ratio)) as Frequency;
    }
    
    if (targets.includes('timbre')) {
      // Small timbre drift
      const drift = (Math.random() - 0.5) * 0.2;
      result.timbre = Math.max(0, Math.min(1, result.timbre + drift));
    }
    
  } else {
    // Radiation mode: large, structural changes
    
    if (targets.includes('pitch')) {
      // Large pitch jump
      const jump = (Math.random() - 0.5) * 2 * props.pitchRadiation;
      const newMidi = clampMidi(Math.round(result.midiNote + jump));
      result.midiNote = newMidi;
      result.freq = midiToFreq(newMidi);
    }
    
    if (targets.includes('gain')) {
      // Random gain (complete reset)
      result.gain = Math.random();
    }
    
    if (targets.includes('cutoff')) {
      // Random cutoff across full range
      result.cutoff = (200 + Math.random() * 19800) as Frequency;
    }
    
    if (targets.includes('wave') && props.waveChange) {
      // Complete wave type change
      const randomWave = WAVE_TYPES[Math.floor(Math.random() * WAVE_TYPES.length)];
      if (randomWave) {
        result.wave = randomWave;
      }
    }
    
    if (targets.includes('timbre')) {
      // Random timbre
      result.timbre = Math.random();
    }
  }
  
  return result;
}

// ============================================================================
// PACKET MOVEMENT
// ============================================================================

/**
 * Calculate packet speed based on edge length and BPM
 */
export function calculatePacketSpeed(edge: GraphEdge, deltaTime: number): number {
  const store = getGraphStore();
  const fromNode = store.getNode(edge.from);
  const toNode = store.getNode(edge.to);
  
  if (!fromNode || !toNode) return 0;
  
  const { pixelsPerBeat } = store.globalSettings;
  const bpm = store.masterSpeed;
  
  // Physical timing: speed based on edge length
  if (edge.timingMode === 'physical') {
    const edgeLength = dist(fromNode.x, fromNode.y, toNode.x, toNode.y);
    const beatsToTraverse = edgeLength / pixelsPerBeat;
    const secondsPerBeat = 60 / bpm;
    const traverseTime = beatsToTraverse * secondsPerBeat;
    
    // If traverseTime is 0 or very small, arrive immediately
    return traverseTime > 0.0001 ? deltaTime / traverseTime : 1;
  }
  
  // Fixed timing: constant beats regardless of length
  if (edge.durationBeats !== null) {
    const secondsPerBeat = 60 / bpm;
    const traverseTime = edge.durationBeats * secondsPerBeat;
    // If traverseTime is 0 or very small, arrive immediately
    return traverseTime > 0.0001 ? deltaTime / traverseTime : 1;
  }
  
  return 0;
}

/**
 * Calculate gravity drag from nearby nodes
 */
export function calculateGravityDrag(packet: Packet, edge: GraphEdge): number {
  const store = getGraphStore();
  const fromNode = store.getNode(edge.from);
  const toNode = store.getNode(edge.to);
  
  if (!fromNode || !toNode) return 0;
  
  const { gravityConstant } = store.globalSettings;
  if (gravityConstant === 0) return 0;
  
  // Calculate packet position
  const px = fromNode.x + (toNode.x - fromNode.x) * packet.t;
  const py = fromNode.y + (toNode.y - fromNode.y) * packet.t;
  
  const gravityRadius = 150;
  let drag = 0;
  
  store.nodes.forEach(node => {
    const d = dist(px, py, node.x, node.y);
    if (d < gravityRadius && d > 0) {
      const mass = (node.props as { mass?: number }).mass ?? 1.0;
      drag += mass / (d * d);
    }
  });
  
  return drag * gravityConstant;
}

// ============================================================================
// TELEPORTER LOGIC
// ============================================================================

/**
 * Get exit teleporters for a channel
 */
export function getTeleporterExits(channel: string): NodeId[] {
  const store = getGraphStore();
  const exits: NodeId[] = [];
  
  store.nodes.forEach(node => {
    if (node.type === 'teleporter') {
      const props = node.props as { channel: string; isEntry: boolean };
      if (props.channel === channel && !props.isEntry) {
        exits.push(node.id);
      }
    }
  });
  
  return exits;
}
