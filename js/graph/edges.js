// AIGA - Edge Management

import { uid } from '../core/utils.js';
import * as state from '../core/state.js';

/**
 * Create an edge between two nodes
 */
export function createEdge(from, to) {
  // Prevent duplicate edges
  if (state.edges.find(e => e.from === from.id && e.to === to.id)) return;
  
  state.edges.push({ 
    id: uid(), 
    from: from.id, 
    to: to.id 
  });
}

/**
 * Delete an edge
 */
export function deleteEdge(edge) {
  state.setEdges(state.edges.filter(e => e !== edge));
  state.setPackets(state.packets.filter(p => p.edgeId !== edge.id));
  
  if (state.selectedEdge === edge) {
    state.setSelectedEdge(null);
  }
}

/**
 * Get all edges connected to a node
 */
export function getConnectedEdges(node) {
  return state.edges.filter(e => e.from === node.id || e.to === node.id);
}

/**
 * Get outgoing edges from a node
 */
export function getOutgoingEdges(node) {
  return state.edges.filter(e => e.from === node.id);
}

/**
 * Get incoming edges to a node
 */
export function getIncomingEdges(node) {
  return state.edges.filter(e => e.to === node.id);
}
