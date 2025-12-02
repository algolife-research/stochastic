// Unit tests for graph/edges.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as state from '../../js/core/state.js';
import { 
  createEdge, 
  deleteEdge, 
  getConnectedEdges, 
  getOutgoingEdges, 
  getIncomingEdges 
} from '../../js/graph/edges.js';
import { createNode } from '../../js/graph/nodes.js';

// Mock the panel module
vi.mock('../../js/ui/panel.js', () => ({
  updatePropPanel: vi.fn()
}));

describe('Edges', () => {
  beforeEach(() => {
    // Reset state before each test
    state.clearGraph();
  });

  describe('createEdge()', () => {
    it('should create an edge between two nodes', () => {
      const source = createNode('source', 0, 0);
      const emitter = createNode('emitter', 100, 0);
      
      createEdge(source, emitter);
      
      expect(state.edges.length).toBe(1);
      expect(state.edges[0].from).toBe(source.id);
      expect(state.edges[0].to).toBe(emitter.id);
    });

    it('should generate unique edge ID', () => {
      const source = createNode('source', 0, 0);
      const emitter1 = createNode('emitter', 100, 0);
      const emitter2 = createNode('emitter', 200, 0);
      
      createEdge(source, emitter1);
      createEdge(source, emitter2);
      
      expect(state.edges[0].id).not.toBe(state.edges[1].id);
    });

    it('should not create duplicate edges', () => {
      const source = createNode('source', 0, 0);
      const emitter = createNode('emitter', 100, 0);
      
      createEdge(source, emitter);
      createEdge(source, emitter);
      
      expect(state.edges.length).toBe(1);
    });
  });

  describe('deleteEdge()', () => {
    it('should remove edge from state.edges', () => {
      const source = createNode('source', 0, 0);
      const emitter = createNode('emitter', 100, 0);
      
      createEdge(source, emitter);
      const edge = state.edges[0];
      
      deleteEdge(edge);
      
      expect(state.edges.length).toBe(0);
    });

    it('should remove associated packets', () => {
      const source = createNode('source', 0, 0);
      const emitter = createNode('emitter', 100, 0);
      
      createEdge(source, emitter);
      const edge = state.edges[0];
      
      // Add a packet on this edge
      state.packets.push({ id: 'p1', edgeId: edge.id, t: 0.5 });
      
      deleteEdge(edge);
      
      expect(state.packets.length).toBe(0);
    });

    it('should clear selectedEdge if deleted edge was selected', () => {
      const source = createNode('source', 0, 0);
      const emitter = createNode('emitter', 100, 0);
      
      createEdge(source, emitter);
      const edge = state.edges[0];
      state.setSelectedEdge(edge);
      
      deleteEdge(edge);
      
      expect(state.selectedEdge).toBeNull();
    });
  });

  describe('getConnectedEdges()', () => {
    it('should return all edges connected to a node', () => {
      const source = createNode('source', 0, 0);
      const middle = createNode('pitch', 100, 0);
      const emitter = createNode('emitter', 200, 0);
      
      createEdge(source, middle);
      createEdge(middle, emitter);
      
      const connectedEdges = getConnectedEdges(middle);
      
      expect(connectedEdges.length).toBe(2);
    });

    it('should return empty array for isolated node', () => {
      const node = createNode('source', 0, 0);
      
      const connectedEdges = getConnectedEdges(node);
      
      expect(connectedEdges.length).toBe(0);
    });
  });

  describe('getOutgoingEdges()', () => {
    it('should return only outgoing edges', () => {
      const source = createNode('source', 0, 0);
      const middle = createNode('pitch', 100, 0);
      const emitter = createNode('emitter', 200, 0);
      
      createEdge(source, middle);
      createEdge(middle, emitter);
      
      const outgoingEdges = getOutgoingEdges(middle);
      
      expect(outgoingEdges.length).toBe(1);
      expect(outgoingEdges[0].to).toBe(emitter.id);
    });
  });

  describe('getIncomingEdges()', () => {
    it('should return only incoming edges', () => {
      const source = createNode('source', 0, 0);
      const middle = createNode('pitch', 100, 0);
      const emitter = createNode('emitter', 200, 0);
      
      createEdge(source, middle);
      createEdge(middle, emitter);
      
      const incomingEdges = getIncomingEdges(middle);
      
      expect(incomingEdges.length).toBe(1);
      expect(incomingEdges[0].from).toBe(source.id);
    });
  });
});
