// AIGA - Node Management

import { uid } from '../core/utils.js';
import { TUNNEL_TEMPLATES, NODE_COLORS, NODE_ICONS } from '../core/constants.js';
import * as state from '../core/state.js';
import { updatePropPanel } from '../ui/panel.js';
import { createEdge } from './edges.js';

/**
 * Get default properties for a node type
 */
export function getDefaultPropsForType(type) {
  const defaults = {
    pitch: { shift: 0 },
    polariser: { wave: 'sawtooth', attack: 0.01, decay: 0.4, mix: 1.0 },
    filter: { cutoff: 20000, attack: 0, decay: 0, mod: 0 },
    gate: { prob: 0.5 },
    delay: { delayTime: 1 },
    gain: { value: 1.0 },
    noise: { type: 'white', attack: 0.01, decay: 0.2, mix: 0.2 },
    harmonic: { ratio: 2, wave: 'sine', attack: 0.01, decay: 0.4, mix: 0.5 },
    modulator: { rate: 5, depth: 20, delay: 0.2 }
  };
  return defaults[type] || {};
}

/**
 * Create a new node
 */
export function createNode(type, x, y) {
  const node = {
    id: uid(),
    type,
    x,
    y,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [],
    props: {
      interval: 1,
      noteIndex: -1,
      prob: 0.5,
      timbre: 0,
      cutoff: 20000,
      mod: 0, // Filter envelope modulation amount
      shift: 2,
      mode: 'shift', // 'shift' or 'fixed'
      fixedNote: 12, // C4
      delayTime: 1,
      reverb: 0,
      pan: 0,
      autoTrigger: true,
      wave: 'sine',
      attack: 0.01,
      decay: 0.4,
      mix: 1.0, // Layer mix volume
      value: 1.0 // Gain multiplier
    }
  };
  
  // Initialize specific defaults
  if (type === 'source') {
    node.props.noteIndex = -1;
    node.props.intensity = 0.5;
  } else if (type === 'polariser') {
    node.props.wave = 'sawtooth';
    node.props.mix = 1.0;
  } else if (type === 'noise') {
    node.props.wave = 'white'; // Reusing 'wave' prop for noise type
    node.props.attack = 0.01;
    node.props.decay = 0.2;
    node.props.mix = 0.2; // Default noise to be subtle
  } else if (type === 'harmonic') {
    node.props.ratio = 2; // 2 = octave, 3 = fifth+octave, etc.
    node.props.wave = 'sine';
    node.props.attack = 0.01;
    node.props.decay = 0.4;
    node.props.mix = 0.5;
  } else if (type === 'modulator') {
    node.props.rate = 5;    // Hz (vibrato speed)
    node.props.depth = 20;  // cents (vibrato amount)
    node.props.delay = 0.2; // seconds before modulation starts
  } else if (type === 'filter') {
    node.props.cutoff = 20000;
    node.props.attack = 0;
    node.props.decay = 0;
    node.props.mod = 0;
  } else if (type === 'delay') {
    node.props.delayTime = 1.0;
  } else if (type === 'emitter') {
    node.props.reverb = 0;
    node.props.volume = 1.0;
  } else if (type === 'tunnel') {
    node.props.subNodes = [];
    node.props.tunnelName = 'Custom';
  } else if (type === 'pitch') {
    node.props.mode = 'shift';
    node.props.shift = 2;
  } else if (type === 'gain') {
    node.props.value = 1.0;
  } else if (type === 'teleporter') {
    // Auto-assign channel based on existing teleporters
    const existingChannels = state.nodes
      .filter(n => n.type === 'teleporter')
      .map(n => n.props.channel);
    
    // Find first available channel letter
    const channelLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let channel = 'A';
    for (let i = 0; i < channelLetters.length; i++) {
      if (!existingChannels.includes(channelLetters[i])) {
        channel = channelLetters[i];
        break;
      }
    }
    
    node.props.channel = channel;
    node.props.isEntry = true; // true = entry point, false = exit point
  }
  
  state.nodes.push(node);
  return node;
}

/**
 * Create a tunnel from a template
 */
export function createTunnelFromTemplate(templateKey, x, y) {
  const template = TUNNEL_TEMPLATES[templateKey];
  if (!template) return null;
  
  const node = createNode('tunnel', x, y);
  node.props.tunnelName = template.name;
  
  node.props.subNodes = template.nodes.map(type => {
    const subNode = {
      type: type,
      props: { ...getDefaultPropsForType(type) }
    };
    if (template.defaults) {
      if (type === 'pitch' && template.defaults.pitch_shift !== undefined) {
        subNode.props.shift = template.defaults.pitch_shift;
      }
    }
    return subNode;
  });
  
  return node;
}

/**
 * Duplicate a node or multiple selected nodes
 */
export function duplicateNode(node) {
  const nodesToDuplicate = state.selectedNodes.length > 0 ? state.selectedNodes : [node];
  
  // Create mapping from old node IDs to new nodes
  const idMap = new Map();
  const newNodes = [];
  
  // Create all new nodes
  nodesToDuplicate.forEach(oldNode => {
    const newNode = createNode(oldNode.type, oldNode.x + 50, oldNode.y + 50);
    newNode.props = JSON.parse(JSON.stringify(oldNode.props));
    idMap.set(oldNode.id, newNode);
    newNodes.push(newNode);
  });
  
  // Get IDs of duplicated nodes for edge filtering
  const oldNodeIds = new Set(nodesToDuplicate.map(n => n.id));
  
  // Duplicate edges that connect duplicated nodes (internal edges)
  state.edges.forEach(edge => {
    if (oldNodeIds.has(edge.from) && oldNodeIds.has(edge.to)) {
      const newFromNode = idMap.get(edge.from);
      const newToNode = idMap.get(edge.to);
      if (newFromNode && newToNode) {
        createEdge(newFromNode, newToNode);
      }
    }
  });
  
  // Select the new nodes
  if (newNodes.length === 1) {
    state.setSelectedNode(newNodes[0]);
    state.setSelectedNodes([newNodes[0]]);
    updatePropPanel(newNodes[0]);
  } else {
    state.setSelectedNodes(newNodes);
    state.setSelectedNode(newNodes[newNodes.length - 1]);
    updatePropPanel(newNodes[newNodes.length - 1]);
  }
  
  return newNodes.length === 1 ? newNodes[0] : newNodes;
}

/**
 * Delete a node and its connected edges
 */
export function deleteNode(node) {
  state.setNodes(state.nodes.filter(n => n !== node));
  state.setEdges(state.edges.filter(e => e.from !== node.id && e.to !== node.id));
  state.setPackets(state.packets.filter(p => state.edges.find(e => e.id === p.edgeId)));
  
  if (state.selectedNode === node) {
    state.setSelectedNode(null);
    updatePropPanel(null);
  }
  
  state.setSelectedNodes(state.selectedNodes.filter(n => n !== node));
}

/**
 * Group selected nodes into a Tunnel
 */
export function groupSelectedNodes() {
  let nodesToGroup = [...state.selectedNodes];
  
  if (nodesToGroup.length < 1) {
    if (state.selectedNode && 
        state.selectedNode.type !== 'source' && 
        state.selectedNode.type !== 'emitter' && 
        state.selectedNode.type !== 'tunnel') {
      nodesToGroup = [state.selectedNode];
    } else {
      return;
    }
  }
  
  // Filter out source, emitter, and existing tunnels
  const validNodes = nodesToGroup.filter(n => 
    n.type !== 'source' && n.type !== 'emitter' && n.type !== 'tunnel'
  );
  
  if (validNodes.length === 0) return;
  
  // Calculate center position
  const centerX = validNodes.reduce((sum, n) => sum + n.x, 0) / validNodes.length;
  const centerY = validNodes.reduce((sum, n) => sum + n.y, 0) / validNodes.length;
  
  // Create the tunnel node
  const tunnel = createNode('tunnel', centerX, centerY);
  tunnel.props.tunnelName = 'Custom';
  tunnel.props.subNodes = validNodes.map(n => ({
    type: n.type,
    props: { ...n.props }
  }));
  
  // Rewire edges
  const validNodeIds = new Set(validNodes.map(n => n.id));
  
  state.edges.forEach(edge => {
    if (validNodeIds.has(edge.to) && !validNodeIds.has(edge.from)) {
      edge.to = tunnel.id;
    }
    if (validNodeIds.has(edge.from) && !validNodeIds.has(edge.to)) {
      edge.from = tunnel.id;
    }
  });
  
  // Remove internal edges
  state.setEdges(state.edges.filter(e => !(validNodeIds.has(e.from) && validNodeIds.has(e.to))));
  
  // Remove duplicate edges
  const seenEdges = new Set();
  state.setEdges(state.edges.filter(e => {
    const key = `${e.from}-${e.to}`;
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  }));
  
  // Delete original nodes
  validNodes.forEach(n => {
    state.setNodes(state.nodes.filter(node => node !== n));
  });
  
  // Clear selection
  state.setSelectedNodes([]);
  state.setSelectedNode(tunnel);
  updatePropPanel(tunnel);
}

/**
 * Get node color by type
 */
export function getNodeColor(type) {
  return NODE_COLORS[type] || '#fff';
}

/**
 * Get node icon by type
 */
export function getNodeIcon(type) {
  return NODE_ICONS[type] || '?';
}
