// AIGA - Graph Compiler for Offline Rendering
// Simulates the graph without audio to collect note events

import { SCALE_CHROMATIC } from '../core/constants.js';
import { uid } from '../core/utils.js';

/**
 * Compile a graph into a list of timed audio events
 * @param {Array} nodes - Graph nodes
 * @param {Array} edges - Graph edges
 * @param {number} durationSeconds - How long to simulate
 * @param {number} bpm - Beats per minute
 * @param {Object} settings - Global settings (pixelsPerBeat, etc.)
 * @returns {Array} List of audio events sorted by time
 */
export function compileGraph(nodes, edges, durationSeconds, bpm, settings) {
  const events = [];
  const beatDuration = 60 / bpm; // seconds per beat
  const ticksPerBeat = 100; // simulation resolution
  const tickDuration = beatDuration / ticksPerBeat;
  const totalTicks = Math.ceil(durationSeconds / tickDuration);
  
  // Simulation state
  const simPackets = [];
  const nodeTimers = new Map(); // Track source emission timers
  const heldPackets = new Map(); // Track delay node held packets
  
  // Initialize source timers
  nodes.filter(n => n.type === 'source').forEach(n => {
    nodeTimers.set(n.id, { lastEmit: -Infinity, interval: n.props.interval || 2 });
  });
  
  // Main simulation loop
  for (let tick = 0; tick < totalTicks; tick++) {
    const currentTime = tick * tickDuration;
    const currentBeat = currentTime / beatDuration;
    
    // 1. Check source emissions
    for (const node of nodes.filter(n => n.type === 'source')) {
      const timer = nodeTimers.get(node.id);
      const interval = node.props.interval || 2;
      
      if (currentBeat - timer.lastEmit >= interval) {
        timer.lastEmit = currentBeat;
        
        // Spawn packets to all outgoing edges
        const outgoing = edges.filter(e => e.from === node.id);
        
        // Determine note
        let scaleIndex;
        if (node.props.noteIndex === -1) {
          scaleIndex = Math.floor(Math.random() * SCALE_CHROMATIC.length);
        } else {
          scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, node.props.noteIndex || 12));
        }
        
        const intensity = node.props.intensity !== undefined ? node.props.intensity : 0.5;
        
        outgoing.forEach(edge => {
          simPackets.push({
            id: uid(),
            edgeId: edge.id,
            t: 0,
            spawnTime: currentTime,
            payload: {
              freq: SCALE_CHROMATIC[scaleIndex],
              scaleIndex: scaleIndex,
              wave: 'sine',
              timbre: 0,
              cutoff: 20000,
              gain: intensity
            }
          });
        });
      }
    }
    
    // 2. Check delay node releases
    for (const node of nodes.filter(n => n.type === 'delay')) {
      const held = heldPackets.get(node.id) || [];
      const toRelease = held.filter(h => h.releaseTime <= currentTime);
      
      toRelease.forEach(h => {
        const outgoing = edges.filter(e => e.from === node.id);
        outgoing.forEach(edge => {
          simPackets.push({
            id: uid(),
            edgeId: edge.id,
            t: 0,
            spawnTime: currentTime,
            payload: { ...h.payload }
          });
        });
      });
      
      // Remove released packets
      heldPackets.set(node.id, held.filter(h => h.releaseTime > currentTime));
    }
    
    // 3. Move packets and process arrivals
    for (let i = simPackets.length - 1; i >= 0; i--) {
      const p = simPackets[i];
      const edge = edges.find(e => e.id === p.edgeId);
      if (!edge) {
        simPackets.splice(i, 1);
        continue;
      }
      
      const n1 = nodes.find(n => n.id === edge.from);
      const n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) {
        simPackets.splice(i, 1);
        continue;
      }
      
      // Calculate edge travel time
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pixelsPerBeat = settings.pixelsPerBeat || 200;
      const steps = Math.max(0.1, dist / pixelsPerBeat);
      const edgeDuration = steps * beatDuration;
      
      // Advance packet
      p.t += tickDuration / edgeDuration;
      
      if (p.t >= 1.0) {
        // Packet arrived at destination
        const result = processNodeArrival(p.payload, n2, nodes, edges, currentTime, beatDuration, heldPackets);
        
        if (result.event) {
          // This is a speaker - record the event
          events.push({
            time: currentTime,
            ...result.event
          });
        }
        
        if (result.newPackets) {
          // Node spawned new packets
          result.newPackets.forEach(np => {
            simPackets.push({
              id: uid(),
              edgeId: np.edgeId,
              t: 0,
              spawnTime: currentTime,
              payload: np.payload
            });
          });
        }
        
        simPackets.splice(i, 1);
      }
    }
  }
  
  return events.sort((a, b) => a.time - b.time);
}

/**
 * Process a packet arriving at a node (simulation version)
 */
function processNodeArrival(payload, node, nodes, edges, currentTime, beatDuration, heldPackets) {
  const result = { event: null, newPackets: [] };
  let newPayload = { ...payload };
  
  switch (node.type) {
    case 'speaker': {
      // This produces an audio event
      const speakerVolume = node.props.volume !== undefined ? node.props.volume : 1.0;
      result.event = {
        freq: newPayload.freq,
        scaleIndex: newPayload.scaleIndex,
        gain: (newPayload.gain || 0.5) * speakerVolume,
        waves: newPayload.waves,
        wave: newPayload.wave || 'sine',
        timbre: newPayload.timbre || 0,
        cutoff: newPayload.cutoff || 20000,
        filterEnv: newPayload.filterEnv,
        reverb: node.props.reverb || 0,
        pan: node.props.pan !== undefined ? node.props.pan : 0,
        vibratoRate: newPayload.vibratoRate || 0,
        vibratoDepth: newPayload.vibratoDepth || 0,
        vibratoDelay: newPayload.vibratoDelay || 0
      };
      break;
    }
    
    case 'delay': {
      const delayBeats = node.props.delayTime || 1;
      const delaySeconds = delayBeats * beatDuration;
      
      if (!heldPackets.has(node.id)) heldPackets.set(node.id, []);
      heldPackets.get(node.id).push({
        payload: newPayload,
        releaseTime: currentTime + delaySeconds
      });
      return result; // No immediate output
    }
    
    case 'chord': {
      const offsets = [0, 4, 7]; // Major chord
      const outgoing = edges.filter(e => e.from === node.id);
      
      offsets.forEach(semitones => {
        const newIndex = Math.min(SCALE_CHROMATIC.length - 1, newPayload.scaleIndex + semitones);
        const chordPayload = { 
          ...newPayload, 
          freq: SCALE_CHROMATIC[newIndex], 
          scaleIndex: newIndex 
        };
        
        outgoing.forEach(edge => {
          result.newPackets.push({ edgeId: edge.id, payload: chordPayload });
        });
      });
      return result;
    }
    
    case 'filter':
      newPayload.cutoff = node.props.cutoff !== undefined ? node.props.cutoff : 20000;
      if (node.props.mod !== 0) {
        newPayload.filterEnv = {
          attack: node.props.attack || 0,
          decay: node.props.decay || 0,
          mod: node.props.mod || 0
        };
      }
      break;
    
    case 'polariser':
      if (!newPayload.waves) newPayload.waves = [];
      newPayload.waves.push({
        wave: node.props.wave,
        attack: node.props.attack,
        decay: node.props.decay,
        gain: node.props.mix !== undefined ? node.props.mix : 1.0
      });
      newPayload.timbre = 0.8;
      break;
    
    case 'noise':
      if (!newPayload.waves) newPayload.waves = [];
      newPayload.waves.push({
        wave: node.props.wave || 'white',
        attack: node.props.attack || 0.01,
        decay: node.props.decay || 0.2,
        gain: node.props.mix !== undefined ? node.props.mix : 0.2
      });
      newPayload.timbre = 0.9;
      break;
    
    case 'harmonic':
      if (!newPayload.waves) newPayload.waves = [];
      newPayload.waves.push({
        wave: node.props.wave || 'sine',
        attack: node.props.attack || 0.01,
        decay: node.props.decay || 0.4,
        gain: node.props.mix !== undefined ? node.props.mix : 0.5,
        ratio: node.props.ratio || 2
      });
      newPayload.timbre = 0.8;
      break;
    
    case 'modulator':
      newPayload.vibratoRate = node.props.rate || 5;
      newPayload.vibratoDepth = node.props.depth || 20;
      newPayload.vibratoDelay = node.props.delay || 0.2;
      break;
    
    case 'pitch':
      if (node.props.mode === 'fixed') {
        const fixedNote = node.props.fixedNote !== undefined ? node.props.fixedNote : 12;
        newPayload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, fixedNote));
      } else {
        const shift = node.props.shift !== undefined ? node.props.shift : 0;
        newPayload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, newPayload.scaleIndex + shift));
      }
      newPayload.freq = SCALE_CHROMATIC[newPayload.scaleIndex] || SCALE_CHROMATIC[12];
      break;
    
    case 'gain':
      newPayload.gain = (newPayload.gain || 0.5) * node.props.value;
      break;
    
    case 'gate':
      if (Math.random() > node.props.prob) return result;
      break;
    
    case 'splitter':
      // Just passes through to all outputs
      break;
    
    case 'teleporter': {
      // Find all teleporters on the same channel
      const channel = node.props.channel;
      const linkedTeleporters = nodes.filter(n => 
        n.type === 'teleporter' && n.id !== node.id && n.props.channel === channel
      );
      
      // Spawn packets at all linked teleporters' outgoing edges
      linkedTeleporters.forEach(tp => {
        const tpOutgoing = edges.filter(e => e.from === tp.id);
        tpOutgoing.forEach(edge => {
          result.newPackets.push({ edgeId: edge.id, payload: { ...newPayload } });
        });
      });
      return result; // Don't also send to this node's outputs
    }
    
    case 'tunnel': {
      let currentPayload = newPayload;
      for (const subNode of (node.props.subNodes || [])) {
        if (subNode.type === 'speaker') {
          // Speaker inside tunnel generates an event
          const speakerVolume = subNode.props.volume !== undefined ? subNode.props.volume : 1.0;
          result.event = {
            freq: currentPayload.freq,
            scaleIndex: currentPayload.scaleIndex,
            gain: (currentPayload.gain || 0.5) * speakerVolume,
            waves: currentPayload.waves,
            wave: currentPayload.wave || 'sine',
            timbre: currentPayload.timbre || 0,
            cutoff: currentPayload.cutoff || 20000,
            filterEnv: currentPayload.filterEnv,
            reverb: subNode.props.reverb || 0,
            pan: subNode.props.pan !== undefined ? subNode.props.pan : 0,
            vibratoRate: currentPayload.vibratoRate || 0,
            vibratoDepth: currentPayload.vibratoDepth || 0,
            vibratoDelay: currentPayload.vibratoDelay || 0
          };
          // Speaker is a terminus - don't continue processing sub-nodes after it
          return result;
        }
        currentPayload = processTunnelSubNodeCompile(subNode, currentPayload);
        if (currentPayload === null) return result;
      }
      newPayload = currentPayload;
      break;
    }
  }
  
  // Forward to outgoing edges
  const outgoing = edges.filter(e => e.from === node.id);
  outgoing.forEach(edge => {
    result.newPackets.push({ edgeId: edge.id, payload: { ...newPayload } });
  });
  
  return result;
}

/**
 * Process tunnel sub-node (compilation version)
 */
function processTunnelSubNodeCompile(subNode, payload) {
  const result = { ...payload };
  
  switch (subNode.type) {
    case 'pitch':
      result.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, result.scaleIndex + (subNode.props.shift || 0)));
      result.freq = SCALE_CHROMATIC[result.scaleIndex];
      break;
    
    case 'polariser':
      if (!result.waves) result.waves = [];
      result.waves.push({
        wave: subNode.props.wave || 'sine',
        attack: subNode.props.attack || 0.01,
        decay: subNode.props.decay || 0.4,
        gain: subNode.props.mix !== undefined ? subNode.props.mix : 1.0
      });
      result.timbre = 0.8;
      break;
    
    case 'noise':
      if (!result.waves) result.waves = [];
      result.waves.push({
        wave: subNode.props.wave || 'white',
        attack: subNode.props.attack || 0.01,
        decay: subNode.props.decay || 0.2,
        gain: subNode.props.mix !== undefined ? subNode.props.mix : 0.2
      });
      result.timbre = 0.9;
      break;
    
    case 'harmonic':
      if (!result.waves) result.waves = [];
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
  }
  
  return result;
}
