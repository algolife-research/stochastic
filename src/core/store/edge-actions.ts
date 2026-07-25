// Edge Actions
// Operations for creating, updating, and deleting edges

import type { GraphStore, ImmerSet } from './types';
import type { NodeId, EdgeId, GraphEdge } from '../types';
import { createEdgeId } from '../types';

export const createEdgeActions = (
  set: ImmerSet,
  get: () => GraphStore
) => ({
  addEdge: (from: NodeId, to: NodeId, options: Partial<GraphEdge> = {}): EdgeId | null => {
    const state = get();
    
    // Prevent duplicate edges
    let exists = false;
    state.edges.forEach(e => {
      if (e.from === from && e.to === to && e.targetParam === (options.targetParam ?? null)) {
        exists = true;
      }
    });
    if (exists) return null;
    
    // Prevent self-loops
    if (from === to) return null;
    
    // Use global default edge behaviour
    const defaultMode = state.globalSettings.defaultEdgeBehaviour;
    const defaultDuration = defaultMode === 'fixed' ? 1 : null;
    
    const id = createEdgeId();
    const edge: GraphEdge = {
      id,
      from,
      to,
      timingMode: options.timingMode ?? defaultMode,
      durationBeats: options.durationBeats ?? defaultDuration,
      targetParam: options.targetParam ?? null,
      weight: options.weight ?? 1,
    };
    
    set(state => {
      state.edges.set(id, edge);
      state.isDirty = true;
    });
    
    return id;
  },
  
  updateEdge: (id: EdgeId, updates: Partial<GraphEdge>): void => {
    set(state => {
      const edge = state.edges.get(id);
      if (edge) {
        const newEdge: GraphEdge = {
          ...edge,
          ...updates,
          id: edge.id, // Preserve ID
        };
        state.edges.set(id, newEdge);
        state.isDirty = true;
      }
    });
  },
  
  deleteEdge: (id: EdgeId): void => {
    set(state => {
      // Delete packets on this edge
      state.packets.forEach((packet, packetId) => {
        if (packet.edgeId === id) {
          state.packets.delete(packetId);
        }
      });
      
      state.edges.delete(id);
      
      if (state.selection.selectedEdgeId === id) {
        state.selection.selectedEdgeId = null;
      }
      
      state.isDirty = true;
    });
  },
});
