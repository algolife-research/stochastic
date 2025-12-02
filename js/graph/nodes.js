// AIGA - Node Management

import { uid } from '../core/utils.js';
import { TUNNEL_TEMPLATES, NODE_COLORS, NODE_ICONS } from '../core/constants.js';
import * as state from '../core/state.js';
import { updatePropPanel } from '../ui/panel.js';

/**
 * Get default properties for a node type
 */
export function getDefaultPropsForType(type) {
  const defaults = {
    pitch: { shift: 0 },
    polariser: { wave: 'sawtooth', attack: 0.01, decay: 0.4 },
    filter: { cutoff: 20000 },
    gate: { prob: 0.5 },
    delay: { delayTime: 1 },
    gain: { value: 1.0 }
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
      value: 1.0 // Gain multiplier
    }
  };
  
  // Initialize specific defaults
  if (type === 'source') {
    node.props.noteIndex = -1;
  } else if (type === 'polariser') {
    node.props.wave = 'sawtooth';
  } else if (type === 'delay') {
    node.props.delayTime = 1.0;
  } else if (type === 'emitter') {
    node.props.reverb = 0;
  } else if (type === 'tunnel') {
    node.props.subNodes = [];
    node.props.tunnelName = 'Custom';
  } else if (type === 'pitch') {
    node.props.mode = 'shift';
    node.props.shift = 2;
  } else if (type === 'gain') {
    node.props.value = 1.0;
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
 * Duplicate a node
 */
export function duplicateNode(node) {
  const newNode = createNode(node.type, node.x + 50, node.y + 50);
  
  // Deep copy props
  newNode.props = JSON.parse(JSON.stringify(node.props));
  
  // Select the new node
  state.setSelectedNode(newNode);
  state.setSelectedNodes([newNode]);
  updatePropPanel(newNode);
  
  return newNode;
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
