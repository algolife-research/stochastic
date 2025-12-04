// Unit tests for io/serialization.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as state from '../../js/core/state.js';
import { loadData } from '../../js/io/serialization.js';
import { createNode } from '../../js/graph/nodes.js';

// Mock the panel module
vi.mock('../../js/ui/panel.js', () => ({
  updatePropPanel: vi.fn()
}));

describe('Serialization', () => {
  beforeEach(() => {
    // Reset state before each test
    state.clearGraph();
    state.resetView();
    
    // Mock DOM elements
    document.body.innerHTML = `
      <input id="speedInput" type="number" value="120">
    `;
  });

  describe('loadData()', () => {
    it('should load nodes from data', () => {
      const data = {
        nodes: [
          { id: 'n1', type: 'source', x: 100, y: 100, props: { interval: 2 } },
          { id: 'n2', type: 'speaker', x: 200, y: 100, props: { reverb: 0.3 } }
        ],
        edges: []
      };
      
      loadData(data);
      
      expect(state.nodes.length).toBe(2);
      expect(state.nodes[0].id).toBe('n1');
      expect(state.nodes[1].id).toBe('n2');
    });

    it('should load edges from data', () => {
      const data = {
        nodes: [
          { id: 'n1', type: 'source', x: 100, y: 100, props: {} },
          { id: 'n2', type: 'speaker', x: 200, y: 100, props: {} }
        ],
        edges: [
          { id: 'e1', from: 'n1', to: 'n2' }
        ]
      };
      
      loadData(data);
      
      expect(state.edges.length).toBe(1);
      expect(state.edges[0].from).toBe('n1');
      expect(state.edges[0].to).toBe('n2');
    });

    it('should clear packets on load', () => {
      state.packets.push({ id: 'p1', edgeId: 'e1', t: 0.5 });
      
      const data = {
        nodes: [],
        edges: []
      };
      
      loadData(data);
      
      expect(state.packets.length).toBe(0);
    });

    it('should restore BPM from data', () => {
      const data = {
        nodes: [],
        edges: [],
        bpm: 180
      };
      
      loadData(data);
      
      expect(state.masterSpeed).toBe(180);
    });

    it('should initialize node runtime properties', () => {
      const data = {
        nodes: [
          { id: 'n1', type: 'source', x: 100, y: 100, props: { interval: 2 } }
        ],
        edges: []
      };
      
      loadData(data);
      
      expect(state.nodes[0].timer).toBe(0);
      expect(state.nodes[0].lastTrigger).toBe(0);
      expect(state.nodes[0].flash).toBe(0);
      expect(state.nodes[0].heldPackets).toEqual([]);
    });

    it('should reset view on load', () => {
      state.setPanOffset({ x: 100, y: 100 });
      state.setZoomLevel(2);
      
      const data = {
        nodes: [],
        edges: []
      };
      
      loadData(data);
      
      expect(state.panOffset.x).toBe(0);
      expect(state.panOffset.y).toBe(0);
      expect(state.zoomLevel).toBe(1);
    });

    it('should clear selection on load', () => {
      const node = createNode('source', 0, 0);
      state.setSelectedNode(node);
      
      const data = {
        nodes: [],
        edges: []
      };
      
      loadData(data);
      
      expect(state.selectedNode).toBeNull();
      expect(state.selectedEdge).toBeNull();
    });

    it('should handle missing props gracefully', () => {
      const data = {
        nodes: [
          { id: 'n1', type: 'source', x: 100, y: 100 } // no props
        ],
        edges: []
      };
      
      loadData(data);
      
      expect(state.nodes[0].props).toBeDefined();
    });
  });
});
