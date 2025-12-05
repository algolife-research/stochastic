// AIGA - Packet System

import { uid } from '../core/utils.js';
import { 
  SCALE_CHROMATIC, PIXELS_PER_STEP, MAX_PACKETS, LEGACY_SCALE_OFFSET,
  midiToFreq, clampMidi, SCALES
} from '../core/constants.js';
import * as state from '../core/state.js';
import { dist } from '../core/utils.js';
import { playSound } from '../audio/synth.js';
import { getDefaultPropsForType } from './nodes.js';

/**
 * Helper to get a property value with fallback to default
 */
function getProp(nodeOrSubNode, propName) {
  const defaults = getDefaultPropsForType(nodeOrSubNode.type);
  return nodeOrSubNode.props[propName] !== undefined ? nodeOrSubNode.props[propName] : defaults[propName];
}

/**
 * Quantize a MIDI note to the nearest note in the global key
 * @param {number} midiNote - Input MIDI note
 * @param {number} strength - 0-1, likelihood of quantizing (1 = always)
 * @returns {number} Quantized MIDI note
 */
export function quantizeToKey(midiNote, strength = 1.0) {
  if (Math.random() > strength) return midiNote;
  
  const { root, scale } = state.musicalContext;
  const chroma = midiNote % 12;
  const octave = Math.floor(midiNote / 12);
  
  // Find nearest scale degree
  let minDist = 12;
  let nearestChroma = chroma;
  
  for (const interval of scale) {
    const scaleChroma = (root + interval) % 12;
    const dist = Math.min(
      Math.abs(chroma - scaleChroma),
      12 - Math.abs(chroma - scaleChroma)
    );
    if (dist < minDist) {
      minDist = dist;
      nearestChroma = scaleChroma;
    }
  }
  
  // Reconstruct MIDI note with quantized chroma
  let quantized = octave * 12 + nearestChroma;
  
  // Handle edge case where quantization crosses octave boundary
  if (nearestChroma > chroma + 6) quantized -= 12;
  else if (nearestChroma < chroma - 6) quantized += 12;
  
  return clampMidi(quantized);
}

/**
 * Calculate gravity drag based on nearby nodes
 * @param {Object} packet - The packet
 * @param {Object} edge - The edge the packet is on
 * @returns {number} Drag coefficient (>= 0)
 */
function calculateGravityDrag(packet, edge) {
  const fromNode = state.nodes.find(n => n.id === edge.from);
  const toNode = state.nodes.find(n => n.id === edge.to);
  if (!fromNode || !toNode) return 0;
  
  // Calculate packet position
  const px = fromNode.x + (toNode.x - fromNode.x) * packet.t;
  const py = fromNode.y + (toNode.y - fromNode.y) * packet.t;
  
  const gravityRadius = 150; // Pixels
  let drag = 0;
  
  for (const node of state.nodes) {
    const d = dist(px, py, node.x, node.y);
    if (d < gravityRadius && d > 0) {
      const mass = node.props?.mass || 1.0;
      drag += mass / (d * d);
    }
  }
  
  return drag;
}

/**
 * Spawn a packet from a source node
 */
export function spawnPacket(sourceNode) {
  if (state.packets.length >= MAX_PACKETS) return;

  const outgoing = state.edges.filter(e => e.from === sourceNode.id);
  
  // Determine MIDI note
  // Priority: 1) explicit noteIndex (legacy), 2) explicit midiNote, 3) random
  const noteIndex = getProp(sourceNode, 'noteIndex');
  let midiNote;
  
  if (noteIndex >= 0) {
    // Legacy: convert noteIndex (scaleIndex) to MIDI
    midiNote = LEGACY_SCALE_OFFSET + Math.min(36, noteIndex);
  } else if (noteIndex === -1) {
    // Random note - use musical octaves C2-C6
    midiNote = 36 + Math.floor(Math.random() * 49);
  } else if (sourceNode.props._explicitMidiNote !== undefined) {
    // Use explicitly set MIDI note (not from defaults)
    midiNote = clampMidi(sourceNode.props._explicitMidiNote);
  } else {
    // Fallback to default
    midiNote = getProp(sourceNode, 'midiNote') || 60;
  }
  
  const freq = midiToFreq(midiNote);
  const intensity = getProp(sourceNode, 'intensity');

  outgoing.forEach(edge => {
    state.packets.push({
      id: uid(),
      edgeId: edge.id,
      t: 0,
      payload: {
        freq: freq,
        midiNote: midiNote,
        scaleIndex: midiNote - LEGACY_SCALE_OFFSET, // Legacy compatibility
        wave: 'sine',
        timbre: 0,
        cutoff: 20000,
        gain: intensity,
        holdTime: 0,
        releaseTime: 0.1
      }
    });
  });
}

/**
 * Process a packet arriving at a node
 */
export function processArrival(packet, node) {
  node.flash = 1.0;
  const payload = { ...packet.payload };
  
  // Get edge info for modulation check
  const edge = state.edges.find(e => e.id === packet.edgeId);
  
  // Handle modulation edges (CV routing)
  if (edge && edge.targetParam) {
    // This is a modulation connection - apply value to node property
    const value = payload.modulationValue !== undefined ? payload.modulationValue : payload.gain;
    node.props[edge.targetParam] = value;
    node.flash = 0.5; // Different visual feedback
    return; // Don't forward modulation packets
  }
  
  switch (node.type) {
    case 'speaker': {
      payload.reverb = getProp(node, 'reverb');
      payload.pan = getProp(node, 'pan');
      const speakerVolume = getProp(node, 'volume');
      payload.gain = (payload.gain || 0.5) * speakerVolume;
      // Enhanced envelope support
      payload.holdTime = getProp(node, 'holdTime');
      payload.releaseTime = getProp(node, 'releaseTime');
      playSound(payload);
      break;
    }
      
    case 'delay': {
      const msPerBeat = (60 / state.masterSpeed) * 1000;
      const delayMs = getProp(node, 'delayTime') * msPerBeat;
      if (!node.heldPackets) node.heldPackets = [];
      node.heldPackets.push({
        payload: payload,
        releaseTime: performance.now() + delayMs
      });
      return;
    }

    case 'chord': {
      const offsets = [0, 4, 7]; // Major chord
      const outgoingChord = state.edges.filter(e => e.from === node.id && !e.targetParam);
      
      offsets.forEach(semitones => {
        const newMidi = clampMidi((payload.midiNote || 60) + semitones);
        const newFreq = midiToFreq(newMidi);
        const chordPayload = { 
          ...payload, 
          freq: newFreq, 
          midiNote: newMidi,
          scaleIndex: newMidi - LEGACY_SCALE_OFFSET
        };
        
        outgoingChord.forEach(edge => {
          if (state.packets.length >= MAX_PACKETS) return;
          state.packets.push({ id: uid(), edgeId: edge.id, t: 0, payload: chordPayload });
        });
      });
      return;
    }

    case 'filter':
      payload.cutoff = getProp(node, 'cutoff');
      if (getProp(node, 'mod') !== 0) {
        payload.filterEnv = {
          attack: getProp(node, 'attack'),
          decay: getProp(node, 'decay'),
          mod: getProp(node, 'mod')
        };
      }
      break;
      
    case 'polariser':
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: getProp(node, 'wave'),
        attack: getProp(node, 'attack'),
        decay: getProp(node, 'decay'),
        gain: getProp(node, 'mix')
      });
      payload.timbre = 0.8;
      break;

    case 'noise':
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: getProp(node, 'wave'),
        attack: getProp(node, 'attack'),
        decay: getProp(node, 'decay'),
        gain: getProp(node, 'mix')
      });
      payload.timbre = 0.9;
      break;

    case 'harmonic':
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: getProp(node, 'wave'),
        attack: getProp(node, 'attack'),
        decay: getProp(node, 'decay'),
        gain: getProp(node, 'mix'),
        ratio: getProp(node, 'ratio')
      });
      payload.timbre = 0.8;
      break;

    case 'modulator':
      payload.vibratoRate = getProp(node, 'rate');
      payload.vibratoDepth = getProp(node, 'depth');
      payload.vibratoDelay = getProp(node, 'delay');
      break;
      
    case 'pitch': {
      const mode = getProp(node, 'mode');
      if (mode === 'fixed') {
        // Priority: explicit fixedNote (legacy), then derive from fixedMidiNote
        const fixedNote = getProp(node, 'fixedNote');
        const fixedMidi = LEGACY_SCALE_OFFSET + fixedNote;
        payload.midiNote = clampMidi(fixedMidi);
      } else {
        // Shift mode - transpose by semitones
        const shift = getProp(node, 'shift');
        payload.midiNote = clampMidi((payload.midiNote || 60) + shift);
      }
      payload.freq = midiToFreq(payload.midiNote);
      payload.scaleIndex = payload.midiNote - LEGACY_SCALE_OFFSET; // Legacy compat
      break;
    }

    case 'gain':
      payload.gain = (payload.gain || 0.5) * getProp(node, 'value');
      break;
      
    case 'gate':
      if (Math.random() > getProp(node, 'prob')) return;
      break;
    
    case 'quantizer': {
      // Snap pitch to global key
      const strength = getProp(node, 'strength');
      payload.midiNote = quantizeToKey(payload.midiNote || 60, strength);
      payload.freq = midiToFreq(payload.midiNote);
      payload.scaleIndex = payload.midiNote - LEGACY_SCALE_OFFSET;
      break;
    }
    
    case 'lfo': {
      // LFO generates modulation packets, not audio
      const rate = getProp(node, 'rate');
      const shape = getProp(node, 'shape');
      const min = getProp(node, 'min');
      const max = getProp(node, 'max');
      const phase = getProp(node, 'phase');
      
      // Calculate current LFO value based on time
      const t = (performance.now() / 1000) * rate + phase;
      let value;
      switch (shape) {
        case 'sine': value = (Math.sin(t * Math.PI * 2) + 1) / 2; break;
        case 'triangle': value = Math.abs((t % 1) * 2 - 1); break;
        case 'square': value = (t % 1) < 0.5 ? 1 : 0; break;
        case 'sawtooth': value = t % 1; break;
        default: value = 0.5;
      }
      
      payload.modulationValue = min + value * (max - min);
      break;
    }
      
    case 'tunnel': {
      let currentPayload = payload;
      for (const subNode of (node.props.subNodes || [])) {
        currentPayload = processTunnelSubNode(subNode, currentPayload);
        if (currentPayload === null) return;
      }
      Object.assign(payload, currentPayload);
      break;
    }

    case 'teleporter': {
      // Find all other teleporters on the same channel
      const channel = node.props.channel;
      const linkedTeleporters = state.nodes.filter(n => 
        n.type === 'teleporter' && 
        n.id !== node.id && 
        n.props.channel === channel
      );
      
      // Teleport packet to all linked teleporters (instant arrival)
      linkedTeleporters.forEach(targetNode => {
        targetNode.flash = 1.0; // Visual feedback
        const outgoing = state.edges.filter(e => e.from === targetNode.id);
        outgoing.forEach(edge => {
          if (state.packets.length >= MAX_PACKETS) return;
          state.packets.push({ id: uid(), edgeId: edge.id, t: 0, payload: { ...payload } });
        });
      });
      
      // If this teleporter also has outgoing edges, continue normally
      break;
    }
  }
  
  const outgoing = state.edges.filter(e => e.from === node.id);
  if (outgoing.length === 0) return;
  
  outgoing.forEach(edge => {
    if (state.packets.length >= MAX_PACKETS) return;
    state.packets.push({ id: uid(), edgeId: edge.id, t: 0, payload });
  });
}

/**
 * Process a sub-node inside a tunnel
 */
export function processTunnelSubNode(subNode, payload) {
  const result = { ...payload };
  
  switch (subNode.type) {
    case 'pitch': {
      const mode = getProp(subNode, 'mode');
      if (mode === 'fixed') {
        const fixedMidi = subNode.props.fixedMidiNote !== undefined 
          ? subNode.props.fixedMidiNote 
          : LEGACY_SCALE_OFFSET + getProp(subNode, 'fixedNote');
        result.midiNote = clampMidi(fixedMidi);
      } else {
        result.midiNote = clampMidi((result.midiNote || 60) + getProp(subNode, 'shift'));
      }
      result.freq = midiToFreq(result.midiNote);
      result.scaleIndex = result.midiNote - LEGACY_SCALE_OFFSET;
      break;
    }
      
    case 'polariser':
      if (!result.waves) {
        result.waves = [];
      }
      result.waves.push({
        wave: getProp(subNode, 'wave'),
        attack: getProp(subNode, 'attack'),
        decay: getProp(subNode, 'decay'),
        gain: getProp(subNode, 'mix')
      });
      result.timbre = 0.8;
      break;

    case 'noise':
      if (!result.waves) {
        result.waves = [];
      }
      result.waves.push({
        wave: getProp(subNode, 'wave'),
        attack: getProp(subNode, 'attack'),
        decay: getProp(subNode, 'decay'),
        gain: getProp(subNode, 'mix')
      });
      result.timbre = 0.9;
      break;

    case 'harmonic':
      if (!result.waves) {
        result.waves = [];
      }
      result.waves.push({
        wave: getProp(subNode, 'wave'),
        attack: getProp(subNode, 'attack'),
        decay: getProp(subNode, 'decay'),
        gain: getProp(subNode, 'mix'),
        ratio: getProp(subNode, 'ratio')
      });
      result.timbre = 0.8;
      break;

    case 'modulator':
      result.vibratoRate = getProp(subNode, 'rate');
      result.vibratoDepth = getProp(subNode, 'depth');
      result.vibratoDelay = getProp(subNode, 'delay');
      break;
      
    case 'filter':
      result.cutoff = getProp(subNode, 'cutoff');
      if (getProp(subNode, 'mod') !== 0) {
        result.filterEnv = {
          attack: getProp(subNode, 'attack'),
          decay: getProp(subNode, 'decay'),
          mod: getProp(subNode, 'mod')
        };
      }
      break;
      
    case 'gain':
      result.gain = (result.gain || 0.5) * getProp(subNode, 'value');
      break;
      
    case 'delay':
      // Delay inside tunnel is not supported (needs async handling)
      break;
      
    case 'gate':
      if (Math.random() > getProp(subNode, 'prob')) return null;
      break;
      
    case 'splitter':
      break;
      
    case 'speaker': {
      // Speaker inside tunnel - play sound immediately with current payload
      const speakerPayload = { ...result };
      speakerPayload.reverb = getProp(subNode, 'reverb');
      speakerPayload.pan = getProp(subNode, 'pan');
      const speakerVolume = getProp(subNode, 'volume');
      speakerPayload.gain = (speakerPayload.gain || 0.5) * speakerVolume;
      playSound(speakerPayload);
      // Continue processing (don't return null) so packet can still flow to connected nodes
      break;
    }
  }
  
  return result;
}

/**
 * Update all packets (called each frame)
 */
export function updatePackets(dt, msPerBeat) {
  const gravityConstant = state.globalSettings.gravityConstant || 0;
  
  for (let i = state.packets.length - 1; i >= 0; i--) {
    const p = state.packets[i];
    const edge = state.edges.find(e => e.id === p.edgeId);
    
    if (!edge) { 
      state.packets.splice(i, 1); 
      continue; 
    }
    
    const n1 = state.nodes.find(n => n.id === edge.from);
    const n2 = state.nodes.find(n => n.id === edge.to);
    
    if (!n1 || !n2) { 
      state.packets.splice(i, 1); 
      continue; 
    }
    
    let totalDuration;
    
    // Check for virtual edge (fixed timing mode)
    if (edge.timingMode === 'fixed' && edge.durationBeats) {
      // Fixed timing: duration is specified in beats, independent of physical distance
      totalDuration = edge.durationBeats * (msPerBeat / 1000);
    } else {
      // Physical timing: duration based on edge length
      const d = dist(n1, n2);
      const pixelsPerBeat = state.globalSettings.pixelsPerBeat;
      const steps = Math.max(0.1, d / pixelsPerBeat);
      totalDuration = steps * (msPerBeat / 1000);
    }
    
    // Calculate base speed
    let speed = (dt / 1000) / totalDuration;
    
    // Apply gravity drag (tempo warping)
    if (gravityConstant > 0) {
      const drag = calculateGravityDrag(p, edge);
      speed = speed / (1 + drag * gravityConstant);
    }
    
    p.t += speed;
    
    if (p.t >= 1.0) {
      processArrival(p, n2);
      state.packets.splice(i, 1);
    }
  }
}
