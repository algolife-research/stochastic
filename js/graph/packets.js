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
        gain: 0.5
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
    case 'emitter':
      payload.reverb = node.props.reverb;
      payload.pan = node.props.pan !== undefined ? node.props.pan : 0;
      playSound(payload);
      break;
      
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
      payload.cutoff = Math.max(100, payload.cutoff * 0.6);
      break;
      
    case 'polariser':
      if (!payload.waves) {
        payload.waves = [];
      }
      payload.waves.push({
        wave: node.props.wave,
        attack: node.props.attack,
        decay: node.props.decay
      });
      payload.timbre = 0.8;
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
        decay: subNode.props.decay || 0.4
      });
      result.timbre = 0.8;
      break;
      
    case 'filter':
      result.cutoff = Math.max(100, (result.cutoff || 20000) * 0.6);
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
