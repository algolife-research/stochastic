// Unit tests for state management

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as state from '../../js/core/state.js';
import { createNode } from '../../js/graph/nodes.js';
import { createEdge } from '../../js/graph/edges.js';

// Mock modules
vi.mock('../../js/ui/panel.js', () => ({
  updatePropPanel: vi.fn()
}));

describe('State Management', () => {
  beforeEach(() => {
    state.clearGraph();
  });

  describe('Graph State', () => {
    it('should start with empty nodes and edges', () => {
      expect(state.nodes.length).toBe(0);
      expect(state.edges.length).toBe(0);
    });

    it('should track nodes when added', () => {
      const node = createNode('source', 100, 100);
      
      expect(state.nodes.length).toBe(1);
      expect(state.nodes[0]).toBe(node);
    });

    it('should track edges when added', () => {
      const source = createNode('source', 100, 100);
      const speaker = createNode('speaker', 200, 100);
      createEdge(source, speaker);
      
      expect(state.edges.length).toBe(1);
    });

    it('should clear all nodes and edges', () => {
      createNode('source', 100, 100);
      createNode('speaker', 200, 100);
      
      state.clearGraph();
      
      expect(state.nodes.length).toBe(0);
      expect(state.edges.length).toBe(0);
    });
  });

  describe('Selection State', () => {
    it('should track single node selection via setter', () => {
      const node = createNode('source', 100, 100);
      state.setSelectedNodes([node]);
      
      expect(state.selectedNodes.length).toBe(1);
      expect(state.selectedNodes[0]).toBe(node);
    });

    it('should track multiple node selection via setter', () => {
      const node1 = createNode('source', 100, 100);
      const node2 = createNode('speaker', 200, 100);
      state.setSelectedNodes([node1, node2]);
      
      expect(state.selectedNodes.length).toBe(2);
    });

    it('should clear selection via setter', () => {
      const node = createNode('source', 100, 100);
      state.setSelectedNodes([node]);
      state.setSelectedNodes([]);
      
      expect(state.selectedNodes.length).toBe(0);
    });

    it('should track edge selection via setter', () => {
      const source = createNode('source', 100, 100);
      const speaker = createNode('speaker', 200, 100);
      createEdge(source, speaker);
      const edge = state.edges[0];
      
      state.setSelectedEdge(edge);
      
      expect(state.selectedEdge).toBe(edge);
    });
  });

  describe('Playback State', () => {
    it('should start with running stopped', () => {
      expect(state.isRunning).toBe(false);
    });

    it('should toggle running state via setter', () => {
      state.setIsRunning(true);
      expect(state.isRunning).toBe(true);
      
      state.setIsRunning(false);
      expect(state.isRunning).toBe(false);
    });

    it('should track master speed', () => {
      state.setMasterSpeed(2.0);
      expect(state.masterSpeed).toBe(2.0);
    });
  });

  describe('Packet State', () => {
    it('should start with empty packets', () => {
      expect(state.packets.length).toBe(0);
    });

    it('should track packets when added', () => {
      state.packets.push({ id: 'p1', x: 100, y: 100 });
      
      expect(state.packets.length).toBe(1);
    });

    it('should clear packets via setter', () => {
      state.packets.push({ id: 'p1', x: 100, y: 100 });
      state.packets.push({ id: 'p2', x: 200, y: 200 });
      
      state.setPackets([]);
      
      expect(state.packets.length).toBe(0);
    });
  });

  describe('UI State', () => {
    it('should track pan offset via setter', () => {
      state.setPanOffset({ x: 100, y: -50 });
      
      expect(state.panOffset.x).toBe(100);
      expect(state.panOffset.y).toBe(-50);
    });

    it('should track zoom level via setter', () => {
      state.setZoomLevel(1.5);
      
      expect(state.zoomLevel).toBe(1.5);
    });

    it('should track current tool via setter', () => {
      state.setCurrentTool('pitch');
      
      expect(state.currentTool).toBe('pitch');
    });

    it('should reset view', () => {
      state.setPanOffset({ x: 500, y: 300 });
      state.setZoomLevel(2.0);
      
      state.resetView();
      
      expect(state.panOffset.x).toBe(0);
      expect(state.panOffset.y).toBe(0);
      expect(state.zoomLevel).toBe(1);
    });
  });

  describe('Linking State', () => {
    it('should track linking node', () => {
      const node = createNode('source', 100, 100);
      state.setLinkingNode(node);
      
      expect(state.linkingNode).toBe(node);
    });

    it('should clear linking node', () => {
      const node = createNode('source', 100, 100);
      state.setLinkingNode(node);
      state.setLinkingNode(null);
      
      expect(state.linkingNode).toBeNull();
    });

    it('should track pending link node', () => {
      const node = createNode('source', 100, 100);
      state.setPendingLinkNode(node);
      
      expect(state.pendingLinkNode).toBe(node);
    });
  });

  describe('Annotations and Regions', () => {
    it('should start with empty annotations', () => {
      expect(state.annotations.length).toBe(0);
    });

    it('should start with empty regions', () => {
      expect(state.regions.length).toBe(0);
    });

    it('should track annotations via setter', () => {
      const ann = { id: 'a1', x: 100, y: 100, text: 'Test' };
      state.setAnnotations([ann]);
      
      expect(state.annotations.length).toBe(1);
    });

    it('should track regions via setter', () => {
      const region = { id: 'r1', x: 0, y: 0, width: 200, height: 200, name: 'Test' };
      state.setRegions([region]);
      
      expect(state.regions.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle node id uniqueness', () => {
      const node1 = createNode('source', 100, 100);
      const node2 = createNode('source', 100, 100);
      
      expect(node1.id).not.toBe(node2.id);
    });

    it('should find node by id', () => {
      const node = createNode('source', 100, 100);
      const found = state.nodes.find(n => n.id === node.id);
      
      expect(found).toBe(node);
    });

    it('should handle rapid state changes', () => {
      for (let i = 0; i < 100; i++) {
        createNode('source', i * 10, i * 10);
      }
      
      expect(state.nodes.length).toBe(100);
      
      state.clearGraph();
      expect(state.nodes.length).toBe(0);
    });
  });
});
