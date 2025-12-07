// Phonon v2 - Packet Processing Engine
// Handles packet movement, node processing, and audio triggers

import { getGraphStore } from './store';
import type { 
  Packet, GraphNode, GraphEdge, AudioPayload, 
  NodeId, MidiNote, Frequency, QuantizerProps, SceneTriggerProps 
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
    case 'polariser':
      return processPolariser(payload, node);
    case 'filter':
      return processFilter(payload, node);
    case 'gate':
      return processGate(payload, node);
    case 'gain':
      return processGain(payload, node);
    case 'noise':
      return processNoise(payload, node);
    case 'harmonic':
      return processHarmonic(payload, node);
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

function processPolariser(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { wave: 'sine' | 'square' | 'sawtooth' | 'triangle'; attack: number; decay: number; mix: number };
  
  const newLayer = {
    wave: props.wave,
    attack: props.attack,
    decay: props.decay,
    gain: props.mix ?? 1.0,
  };
  
  // If waves already exist (from previous polariser/noise/harmonic), add to them
  // Otherwise, start fresh with just this layer
  const existingWaves = payload.waves ?? [];
  
  return {
    ...payload,
    wave: props.wave,
    timbre: 0.8, // Set timbre to indicate this has been processed
    waves: [...existingWaves, newLayer],
  };
}

function processFilter(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { cutoff: Frequency; attack: number; decay: number; mod: number };
  
  return {
    ...payload,
    cutoff: props.cutoff,
    filterEnv: props.mod !== 0 ? {
      attack: props.attack,
      decay: props.decay,
      mod: props.mod,
    } : undefined,
  };
}

function processGate(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { prob: number };
  
  // Gate blocks packet with probability (1 - prob)
  if (Math.random() > props.prob) {
    // Signal to delete packet
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

function processNoise(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { wave: 'white' | 'pink' | 'brown'; attack: number; decay: number; mix: number };
  
  const existingWaves = payload.waves ?? [];
  const noiseLayer = {
    wave: props.wave,
    attack: props.attack,
    decay: props.decay,
    gain: props.mix,
  };
  
  return {
    ...payload,
    waves: [...existingWaves, noiseLayer],
  };
}

function processHarmonic(payload: AudioPayload, node: GraphNode): AudioPayload {
  const props = node.props as { ratio: number; wave: 'sine' | 'square' | 'sawtooth' | 'triangle'; attack: number; decay: number; mix: number };
  
  const existingWaves = payload.waves ?? [];
  const harmonicLayer = {
    wave: props.wave,
    attack: props.attack,
    decay: props.decay,
    gain: props.mix,
    ratio: props.ratio,
  };
  
  return {
    ...payload,
    waves: [...existingWaves, harmonicLayer],
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
