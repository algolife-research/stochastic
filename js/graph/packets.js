// AIGA - Packet System

import { uid } from '../core/utils.js';
import { SCALE_CHROMATIC, PIXELS_PER_STEP, MAX_PACKETS } from '../core/constants.js';
import * as state from '../core/state.js';
import { dist } from '../core/utils.js';
import { playSound } from '../audio/synth.js';

/**
 * Spawn a packet from a source node
 */
export function spawnPacket(sourceNode) {
  if (state.packets.length >= MAX_PACKETS) return;

  const outgoing = state.edges.filter(e => e.from === sourceNode.id);
  
  // Determine Note
  let scaleIndex;
  if (sourceNode.props.noteIndex === -1) {
    scaleIndex = Math.floor(Math.random() * SCALE_CHROMATIC.length);
  } else {
    scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, sourceNode.props.noteIndex));
  }
  
  const freq = SCALE_CHROMATIC[scaleIndex];

  const intensity = sourceNode.props.intensity !== undefined ? sourceNode.props.intensity : 0.5;

  outgoing.forEach(edge => {
    state.packets.push({
      id: uid(),
      edgeId: edge.id,
      t: 0,
      payload: {
        freq: freq,
        scaleIndex: scaleIndex,
        wave: 'sine',
        timbre: 0,
        cutoff: 20000,
        gain: intensity
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
  
  switch (node.type) {
    case 'emitter': {
      payload.reverb = node.props.reverb;
      payload.pan = node.props.pan !== undefined ? node.props.pan : 0;
      // Apply emitter master volume
      const emitterVolume = node.props.volume !== undefined ? node.props.volume : 1.0;
      payload.gain = (payload.gain || 0.5) * emitterVolume;
      playSound(payload);
      break;
    }
      
    case 'delay': {
      const msPerBeat = (60 / state.masterSpeed) * 1000;
      const delayMs = (node.props.delayTime || 1) * msPerBeat;
      if (!node.heldPackets) node.heldPackets = [];
      node.heldPackets.push({
        payload: payload,
        releaseTime: performance.now() + delayMs
      });
      return;
    }

    case 'chord': {
      const offsets = [0, 4, 7]; // Major chord
      const outgoingChord = state.edges.filter(e => e.from === node.id);
      
      offsets.forEach(semitones => {
        const newIndex = Math.min(SCALE_CHROMATIC.length - 1, payload.scaleIndex + semitones);
        const newFreq = SCALE_CHROMATIC[newIndex];
        const chordPayload = { ...payload, freq: newFreq, scaleIndex: newIndex };
        
        outgoingChord.forEach(edge => {
          if (state.packets.length >= MAX_PACKETS) return;
          state.packets.push({ id: uid(), edgeId: edge.id, t: 0, payload: chordPayload });
        });
      });
      return;
    }

    case 'filter':
      payload.cutoff = node.props.cutoff !== undefined ? node.props.cutoff : 20000;
      if (node.props.mod !== 0) {
        payload.filterEnv = {
          attack: node.props.attack || 0,
          decay: node.props.decay || 0,
          mod: node.props.mod || 0
        };
      }
      break;
      
    case 'polariser':
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: node.props.wave,
        attack: node.props.attack,
        decay: node.props.decay,
        gain: node.props.mix !== undefined ? node.props.mix : 1.0
      });
      payload.timbre = 0.8;
      break;

    case 'noise':
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: node.props.wave || 'white',
        attack: node.props.attack || 0.01,
        decay: node.props.decay || 0.2,
        gain: node.props.mix !== undefined ? node.props.mix : 0.2
      });
      payload.timbre = 0.9;
      break;

    case 'harmonic':
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: node.props.wave || 'sine',
        attack: node.props.attack || 0.01,
        decay: node.props.decay || 0.4,
        gain: node.props.mix !== undefined ? node.props.mix : 0.5,
        ratio: node.props.ratio || 2
      });
      payload.timbre = 0.8;
      break;

    case 'modulator':
      payload.vibratoRate = node.props.rate || 5;
      payload.vibratoDepth = node.props.depth || 20;
      payload.vibratoDelay = node.props.delay || 0.2;
      break;
      
    case 'pitch':
      if (node.props.mode === 'fixed') {
        const fixedNote = node.props.fixedNote !== undefined ? node.props.fixedNote : 12;
        payload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, fixedNote));
      } else {
        const shift = node.props.shift !== undefined ? node.props.shift : 0;
        payload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, payload.scaleIndex + shift));
      }
      payload.freq = SCALE_CHROMATIC[payload.scaleIndex] || SCALE_CHROMATIC[12];
      break;

    case 'gain':
      payload.gain = (payload.gain || 0.5) * node.props.value;
      break;
      
    case 'gate':
      if (Math.random() > node.props.prob) return;
      break;
      
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
    case 'pitch':
      result.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, result.scaleIndex + (subNode.props.shift || 0)));
      result.freq = SCALE_CHROMATIC[result.scaleIndex];
      break;
      
    case 'polariser':
      if (!result.waves) {
        result.waves = [];
      }
      result.waves.push({
        wave: subNode.props.wave || 'sine',
        attack: subNode.props.attack || 0.01,
        decay: subNode.props.decay || 0.4,
        gain: subNode.props.mix !== undefined ? subNode.props.mix : 1.0
      });
      result.timbre = 0.8;
      break;

    case 'noise':
      if (!result.waves) {
        result.waves = [];
      }
      result.waves.push({
        wave: subNode.props.wave || 'white',
        attack: subNode.props.attack || 0.01,
        decay: subNode.props.decay || 0.2,
        gain: subNode.props.mix !== undefined ? subNode.props.mix : 0.2
      });
      result.timbre = 0.9;
      break;

    case 'harmonic':
      if (!result.waves) {
        result.waves = [];
      }
      result.waves.push({
        wave: subNode.props.wave || 'sine',
        attack: subNode.props.attack || 0.01,
        decay: subNode.props.decay || 0.4,
        gain: subNode.props.mix !== undefined ? subNode.props.mix : 0.5,
        ratio: subNode.props.ratio || 2
      });
      result.timbre = 0.8;
      break;

    case 'modulator':
      result.vibratoRate = subNode.props.rate || 5;
      result.vibratoDepth = subNode.props.depth || 20;
      result.vibratoDelay = subNode.props.delay || 0.2;
      break;
      
    case 'filter':
      result.cutoff = subNode.props.cutoff !== undefined ? subNode.props.cutoff : 20000;
      if (subNode.props.mod !== 0) {
        result.filterEnv = {
          attack: subNode.props.attack || 0,
          decay: subNode.props.decay || 0,
          mod: subNode.props.mod || 0
        };
      }
      break;
      
    case 'gate':
      if (Math.random() > (subNode.props.prob || 0.5)) return null;
      break;
      
    case 'splitter':
      break;
  }
  
  return result;
}

/**
 * Update all packets (called each frame)
 */
export function updatePackets(dt, msPerBeat) {
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
    
    const d = dist(n1, n2);
    // Allow fractional steps for smoother, faster flow on short distances
    const pixelsPerBeat = state.globalSettings.pixelsPerBeat;
    const steps = Math.max(0.1, d / pixelsPerBeat);
    const totalDuration = steps * (msPerBeat / 1000);
    
    const step = (dt / 1000) / totalDuration;
    p.t += step;
    
    if (p.t >= 1.0) {
      processArrival(p, n2);
      state.packets.splice(i, 1);
    }
  }
}
