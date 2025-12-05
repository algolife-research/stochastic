// AIGA - Edge Management

import { uid } from '../core/utils.js';
import * as state from '../core/state.js';

/**
 * Create an edge between two nodes
 * @param {Object} from - Source node
 * @param {Object} to - Target node
 * @param {Object} options - Optional edge properties
 * @param {string} options.timingMode - 'physical' (default) or 'fixed'
 * @param {number} options.durationBeats - Duration in beats (for fixed timing)
 * @param {string} options.targetParam - Target parameter for CV/modulation routing
 */
export function createEdge(from, to, options = {}) {
  // Normalize targetParam to null if undefined
  const targetParam = options.targetParam || null;
  
  // Prevent duplicate edges (unless it's a modulation edge to different param)
  const existing = state.edges.find(e => 
    e.from === from.id && 
    e.to === to.id && 
    e.targetParam === targetParam
  );
  if (existing) return existing;
  
  const edge = { 
    id: uid(), 
    from: from.id, 
    to: to.id,
    timingMode: options.timingMode || 'physical',
    durationBeats: options.durationBeats || null,
    targetParam: targetParam  // null = audio, string = CV modulation target
  };
  
  state.edges.push(edge);
  return edge;
}

/**
 * Update edge properties
 */
export function updateEdge(edge, props) {
  Object.assign(edge, props);
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

/**
 * Check if edge is a modulation (CV) connection
 */
export function isModulationEdge(edge) {
  return edge.targetParam !== null && edge.targetParam !== undefined;
}
