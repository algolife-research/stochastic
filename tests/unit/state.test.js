// Unit tests for core/state.js

import { describe, it, expect, beforeEach } from 'vitest';
import * as state from '../../js/core/state.js';

describe('State', () => {
  beforeEach(() => {
    // Reset to initial state
    state.clearGraph();
    state.resetView();
  });

  describe('Initial State', () => {
    it('should have default values', () => {
      expect(state.isRunning).toBe(false);
      expect(state.isMuted).toBe(false);
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.packets).toEqual([]);
    });
  });

  describe('Setters', () => {
    it('should set isRunning', () => {
      state.setIsRunning(true);
      expect(state.isRunning).toBe(true);
      
      state.setIsRunning(false);
      expect(state.isRunning).toBe(false);
    });

    it('should set isMuted', () => {
      state.setIsMuted(true);
      expect(state.isMuted).toBe(true);
      
      state.setIsMuted(false);
      expect(state.isMuted).toBe(false);
    });

    it('should set nodes array', () => {
      const nodes = [{ id: 'n1' }, { id: 'n2' }];
      state.setNodes(nodes);
      expect(state.nodes).toBe(nodes);
    });

    it('should set edges array', () => {
      const edges = [{ id: 'e1' }, { id: 'e2' }];
      state.setEdges(edges);
      expect(state.edges).toBe(edges);
    });

    it('should set packets array', () => {
      const packets = [{ id: 'p1' }, { id: 'p2' }];
      state.setPackets(packets);
      expect(state.packets).toBe(packets);
    });

    it('should set selectedNode', () => {
      const node = { id: 'n1' };
      state.setSelectedNode(node);
      expect(state.selectedNode).toBe(node);
    });

    it('should set selectedNodes', () => {
      const nodes = [{ id: 'n1' }, { id: 'n2' }];
      state.setSelectedNodes(nodes);
      expect(state.selectedNodes).toBe(nodes);
    });

    it('should set selectedEdge', () => {
      const edge = { id: 'e1' };
      state.setSelectedEdge(edge);
      expect(state.selectedEdge).toBe(edge);
    });

    it('should set mousePos', () => {
      state.setMousePos({ x: 100, y: 200 });
      expect(state.mousePos.x).toBe(100);
      expect(state.mousePos.y).toBe(200);
    });

    it('should set panOffset', () => {
      state.setPanOffset({ x: 50, y: 75 });
      expect(state.panOffset.x).toBe(50);
      expect(state.panOffset.y).toBe(75);
    });

    it('should set zoomLevel', () => {
      state.setZoomLevel(1.5);
      expect(state.zoomLevel).toBe(1.5);
    });

    it('should set masterSpeed', () => {
      state.setMasterSpeed(180);
      expect(state.masterSpeed).toBe(180);
    });
  });

  describe('clearGraph()', () => {
    it('should clear all graph data', () => {
      // Set some state
      state.setNodes([{ id: 'n1' }]);
      state.setEdges([{ id: 'e1' }]);
      state.setPackets([{ id: 'p1' }]);
      state.setSelectedNode({ id: 'n1' });
      state.setSelectedNodes([{ id: 'n1' }]);
      state.setSelectedEdge({ id: 'e1' });
      
      // Clear graph
      state.clearGraph();
      
      // Verify all cleared
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.packets).toEqual([]);
      expect(state.selectedNode).toBeNull();
      expect(state.selectedNodes).toEqual([]);
      expect(state.selectedEdge).toBeNull();
    });
  });

  describe('resetView()', () => {
    it('should reset pan and zoom', () => {
      state.setPanOffset({ x: 100, y: 200 });
      state.setZoomLevel(2.5);
      
      state.resetView();
      
      expect(state.panOffset.x).toBe(0);
      expect(state.panOffset.y).toBe(0);
      expect(state.zoomLevel).toBe(1);
    });
  });

  describe('Box Selection State', () => {
    it('should set box selection state', () => {
      state.setIsBoxSelecting(true);
      state.setBoxSelectStart({ x: 10, y: 20 });
      state.setBoxSelectEnd({ x: 100, y: 200 });
      
      expect(state.isBoxSelecting).toBe(true);
      expect(state.boxSelectStart.x).toBe(10);
      expect(state.boxSelectStart.y).toBe(20);
      expect(state.boxSelectEnd.x).toBe(100);
      expect(state.boxSelectEnd.y).toBe(200);
    });
  });

  describe('Panning State', () => {
    it('should set panning state', () => {
      state.setIsPanning(true);
      state.setPanStart({ x: 50, y: 60 });
      
      expect(state.isPanning).toBe(true);
      expect(state.panStart.x).toBe(50);
      expect(state.panStart.y).toBe(60);
    });
  });
});
