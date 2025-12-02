// Unit tests for graph/nodes.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as state from '../../js/core/state.js';
import { 
  getDefaultPropsForType,
  createNode,
  createTunnelFromTemplate,
  deleteNode,
  getNodeColor,
  getNodeIcon,
} from '../../js/graph/nodes.js';
import { NODE_COLORS, NODE_ICONS } from '../../js/core/constants.js';

// Mock the panel module
vi.mock('../../js/ui/panel.js', () => ({
  updatePropPanel: vi.fn()
}));

describe('Nodes', () => {
  beforeEach(() => {
    // Reset state before each test
    state.clearGraph();
  });

  describe('getDefaultPropsForType()', () => {
    it('should return default props for pitch node', () => {
      const props = getDefaultPropsForType('pitch');
      expect(props).toHaveProperty('shift');
      expect(props.shift).toBe(0);
    });

    it('should return default props for polariser node', () => {
      const props = getDefaultPropsForType('polariser');
      expect(props).toHaveProperty('wave');
      expect(props).toHaveProperty('attack');
      expect(props).toHaveProperty('decay');
    });

    it('should return default props for filter node', () => {
      const props = getDefaultPropsForType('filter');
      expect(props).toHaveProperty('cutoff');
    });

    it('should return default props for gate node', () => {
      const props = getDefaultPropsForType('gate');
      expect(props).toHaveProperty('prob');
    });

    it('should return default props for delay node', () => {
      const props = getDefaultPropsForType('delay');
      expect(props).toHaveProperty('delayTime');
    });

    it('should return empty object for unknown type', () => {
      const props = getDefaultPropsForType('unknown');
      expect(props).toEqual({});
    });
  });

  describe('createNode()', () => {
    it('should create a node with correct type', () => {
      const node = createNode('source', 100, 200);
      expect(node.type).toBe('source');
    });

    it('should create a node with correct position', () => {
      const node = createNode('source', 100, 200);
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
    });

    it('should generate unique ID', () => {
      const node1 = createNode('source', 0, 0);
      const node2 = createNode('source', 0, 0);
      expect(node1.id).not.toBe(node2.id);
    });

    it('should add node to state.nodes', () => {
      const initialLength = state.nodes.length;
      createNode('source', 0, 0);
      expect(state.nodes.length).toBe(initialLength + 1);
    });

    it('should initialize default properties', () => {
      const node = createNode('source', 0, 0);
      expect(node.props).toBeDefined();
      expect(node.timer).toBe(0);
      expect(node.lastTrigger).toBe(0);
      expect(node.flash).toBe(0);
      expect(node.heldPackets).toEqual([]);
    });

    it('should initialize source node with noteIndex', () => {
      const node = createNode('source', 0, 0);
      expect(node.props.noteIndex).toBe(-1);
    });

    it('should initialize polariser with sawtooth wave', () => {
      const node = createNode('polariser', 0, 0);
      expect(node.props.wave).toBe('sawtooth');
    });

    it('should initialize emitter with reverb', () => {
      const node = createNode('emitter', 100, 100);
      expect(node.props.reverb).toBe(0);
    });

    it('should initialize tunnel with subNodes array', () => {
      const node = createNode('tunnel', 0, 0);
      expect(node.props.subNodes).toEqual([]);
      expect(node.props.tunnelName).toBe('Custom');
    });
  });

  describe('createTunnelFromTemplate()', () => {
    it('should create tunnel from voice template', () => {
      const tunnel = createTunnelFromTemplate('voice', 100, 100);
      expect(tunnel).toBeDefined();
      expect(tunnel.type).toBe('tunnel');
      expect(tunnel.props.tunnelName).toBe('Voice');
      expect(tunnel.props.subNodes.length).toBeGreaterThan(0);
    });

    it('should create tunnel from thick template with pitch shift', () => {
      const tunnel = createTunnelFromTemplate('thick', 100, 100);
      expect(tunnel.props.tunnelName).toBe('Thick');
      const pitchNode = tunnel.props.subNodes.find(n => n.type === 'pitch');
      expect(pitchNode).toBeDefined();
      expect(pitchNode.props.shift).toBe(12);
    });

    it('should return null for unknown template', () => {
      const tunnel = createTunnelFromTemplate('unknown', 100, 100);
      expect(tunnel).toBeNull();
    });
  });

  describe('deleteNode()', () => {
    it('should remove node from state.nodes', () => {
      const node = createNode('source', 0, 0);
      const initialLength = state.nodes.length;
      deleteNode(node);
      expect(state.nodes.length).toBe(initialLength - 1);
      expect(state.nodes.includes(node)).toBe(false);
    });

    it('should remove connected edges', () => {
      const source = createNode('source', 0, 0);
      const emitter = createNode('emitter', 100, 0);
      state.edges.push({ id: 'edge1', from: source.id, to: emitter.id });
      
      deleteNode(source);
      
      expect(state.edges.find(e => e.from === source.id)).toBeUndefined();
    });

    it('should clear selectedNode if deleted node was selected', () => {
      const node = createNode('source', 0, 0);
      state.setSelectedNode(node);
      
      deleteNode(node);
      
      expect(state.selectedNode).toBeNull();
    });

    it('should remove node from selectedNodes array', () => {
      const node1 = createNode('source', 0, 0);
      const node2 = createNode('source', 100, 0);
      state.setSelectedNodes([node1, node2]);
      
      deleteNode(node1);
      
      expect(state.selectedNodes).not.toContain(node1);
      expect(state.selectedNodes).toContain(node2);
    });
  });

  describe('getNodeColor()', () => {
    it('should return correct color for known types', () => {
      expect(getNodeColor('source')).toBe(NODE_COLORS.source);
      expect(getNodeColor('emitter')).toBe(NODE_COLORS.emitter);
    });

    it('should return default color for unknown type', () => {
      expect(getNodeColor('unknown')).toBe('#fff');
    });
  });

  describe('getNodeIcon()', () => {
    it('should return correct icon for known types', () => {
      expect(getNodeIcon('source')).toBe(NODE_ICONS.source);
      expect(getNodeIcon('emitter')).toBe(NODE_ICONS.emitter);
    });

    it('should return ? for unknown type', () => {
      expect(getNodeIcon('unknown')).toBe('?');
    });
  });
});
