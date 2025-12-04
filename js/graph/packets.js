// AIGA - Packet System

import { uid } from '../core/utils.js';
import { SCALE_CHROMATIC, PIXELS_PER_STEP, MAX_PACKETS } from '../core/constants.js';
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
 * Spawn a packet from a source node
 */
export function spawnPacket(sourceNode) {
  if (state.packets.length >= MAX_PACKETS) return;

  const outgoing = state.edges.filter(e => e.from === sourceNode.id);
  
  // Determine Note
  const noteIndex = getProp(sourceNode, 'noteIndex');
  let scaleIndex;
  if (noteIndex === -1) {
    scaleIndex = Math.floor(Math.random() * SCALE_CHROMATIC.length);
  } else {
    scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, noteIndex));
  }
  
  const freq = SCALE_CHROMATIC[scaleIndex];
  const intensity = getProp(sourceNode, 'intensity');

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
    case 'speaker': {
      payload.reverb = getProp(node, 'reverb');
      payload.pan = getProp(node, 'pan');
      const speakerVolume = getProp(node, 'volume');
      payload.gain = (payload.gain || 0.5) * speakerVolume;
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
      
    case 'pitch':
      if (getProp(node, 'mode') === 'fixed') {
        const fixedNote = getProp(node, 'fixedNote');
        payload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, fixedNote));
      } else {
        const shift = getProp(node, 'shift');
        payload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, payload.scaleIndex + shift));
      }
      payload.freq = SCALE_CHROMATIC[payload.scaleIndex] || SCALE_CHROMATIC[12];
      break;

    case 'gain':
      payload.gain = (payload.gain || 0.5) * getProp(node, 'value');
      break;
      
    case 'gate':
      if (Math.random() > getProp(node, 'prob')) return;
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
      if (getProp(subNode, 'mode') === 'fixed') {
        result.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, getProp(subNode, 'fixedNote')));
      } else {
        result.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, result.scaleIndex + getProp(subNode, 'shift')));
      }
      result.freq = SCALE_CHROMATIC[result.scaleIndex];
      break;
      
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
