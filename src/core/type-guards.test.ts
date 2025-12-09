// Type Guards Module Tests
// Unit tests for type assertions, guards, and typed factories

import { describe, it, expect } from 'vitest';
import {
  assertNodeId,
  assertEdgeId,
  assertPacketId,
  assertSceneId,
  isValidNodeType,
  createTypedNode,
  createTypedEdge,
  createTypedHeldPacket,
  castNodeType,
  cloneNode,
  updateNodeProps,
} from './type-guards';
import type { NodeId, EdgeId, Frequency, MidiNote, GraphNode } from './types';

// ============================================================================
// Type Assertions Tests
// ============================================================================

describe('assertNodeId', () => {
  it('should not throw for valid string', () => {
    expect(() => assertNodeId('abc-123')).not.toThrow();
    expect(() => assertNodeId('node-uuid-here')).not.toThrow();
  });

  it('should throw for empty string', () => {
    expect(() => assertNodeId('')).toThrow(TypeError);
  });

  it('should throw for non-string values', () => {
    expect(() => assertNodeId(null as unknown as string)).toThrow(TypeError);
    expect(() => assertNodeId(undefined as unknown as string)).toThrow(TypeError);
    expect(() => assertNodeId(123 as unknown as string)).toThrow(TypeError);
  });
});

describe('assertEdgeId', () => {
  it('should not throw for valid string', () => {
    expect(() => assertEdgeId('edge-123')).not.toThrow();
  });

  it('should throw for invalid values', () => {
    expect(() => assertEdgeId('')).toThrow(TypeError);
    expect(() => assertEdgeId(null as unknown as string)).toThrow(TypeError);
  });
});

describe('assertPacketId', () => {
  it('should not throw for valid string', () => {
    expect(() => assertPacketId('packet-123')).not.toThrow();
  });

  it('should throw for invalid values', () => {
    expect(() => assertPacketId('')).toThrow(TypeError);
  });
});

describe('assertSceneId', () => {
  it('should not throw for valid string', () => {
    expect(() => assertSceneId('scene-123')).not.toThrow();
  });

  it('should throw for invalid values', () => {
    expect(() => assertSceneId('')).toThrow(TypeError);
  });
});

// ============================================================================
// Type Guards Tests
// ============================================================================

describe('isValidNodeType', () => {
  it('should return true for valid node types', () => {
    const validTypes = [
      'source', 'speaker', 'pitch', 'oscillator', 'filter',
      'gate', 'delay', 'gain', 'modulator', 'tunnel',
      'teleporter', 'quantizer', 'lfo', 'splitter',
      'midi_out', 'midi_cc', 'scene_trigger', 'mutator', 'crossover'
    ];
    validTypes.forEach(type => {
      expect(isValidNodeType(type)).toBe(true);
    });
  });

  it('should return false for invalid node types', () => {
    expect(isValidNodeType('invalid')).toBe(false);
    expect(isValidNodeType('Source')).toBe(false); // Case sensitive
    expect(isValidNodeType('')).toBe(false);
    expect(isValidNodeType('SPEAKER')).toBe(false);
    expect(isValidNodeType('noise')).toBe(false); // Deprecated type
    expect(isValidNodeType('polariser')).toBe(false); // Old name
  });
});

// ============================================================================
// Typed Factories Tests
// ============================================================================

describe('createTypedNode', () => {
  it('should create source node with correct structure', () => {
    const node = createTypedNode(
      'source',
      'node-1' as NodeId,
      100, 200,
      { interval: 2, midiNote: 60 as MidiNote, noteIndex: -1, autoTrigger: true, intensity: 0.5 }
    );
    
    expect(node.id).toBe('node-1');
    expect(node.type).toBe('source');
    expect(node.x).toBe(100);
    expect(node.y).toBe(200);
    expect(node.props.interval).toBe(2);
    expect(node.timer).toBe(0);
    expect(node.lastTrigger).toBe(0);
    expect(node.flash).toBe(0);
    expect(node.heldPackets).toEqual([]);
  });

  it('should create filter node with correct props', () => {
    const node = createTypedNode(
      'filter',
      'node-2' as NodeId,
      50, 50,
      { cutoff: 5000 as Frequency, attack: 0.1, decay: 0.2, mod: 0.5 }
    );
    
    expect(node.type).toBe('filter');
    expect(node.props.cutoff).toBe(5000);
    expect(node.props.attack).toBe(0.1);
  });

  it('should create mutator node with correct props', () => {
    const node = createTypedNode(
      'mutator',
      'node-3' as NodeId,
      0, 0,
      { 
        mode: 'drift', 
        probability: 0.7, 
        pitchDrift: 3,
        pitchRadiation: 12,
        gainDrift: 0.1,
        cutoffDrift: 0.2,
        waveChange: true,
        targets: ['pitch', 'gain']
      }
    );
    
    expect(node.type).toBe('mutator');
    expect(node.props.mode).toBe('drift');
    expect(node.props.probability).toBe(0.7);
    expect(node.props.targets).toContain('pitch');
  });
});

describe('createTypedEdge', () => {
  it('should create edge with physical timing', () => {
    const edge = createTypedEdge(
      'edge-1' as EdgeId,
      'from-node' as NodeId,
      'to-node' as NodeId,
      'physical',
      null,
      null
    );
    
    expect(edge.id).toBe('edge-1');
    expect(edge.from).toBe('from-node');
    expect(edge.to).toBe('to-node');
    expect(edge.timingMode).toBe('physical');
    expect(edge.durationBeats).toBeNull();
    expect(edge.targetParam).toBeNull();
  });

  it('should create edge with fixed timing', () => {
    const edge = createTypedEdge(
      'edge-2' as EdgeId,
      'from-node' as NodeId,
      'to-node' as NodeId,
      'fixed',
      2.5,
      null
    );
    
    expect(edge.timingMode).toBe('fixed');
    expect(edge.durationBeats).toBe(2.5);
  });

  it('should create modulation edge with target param', () => {
    const edge = createTypedEdge(
      'edge-3' as EdgeId,
      'lfo-node' as NodeId,
      'filter-node' as NodeId,
      'fixed',
      null,
      'cutoff'
    );
    
    expect(edge.targetParam).toBe('cutoff');
  });
});

describe('createTypedHeldPacket', () => {
  it('should create held packet with payload and release time', () => {
    const payload = {
      freq: 440 as Frequency,
      midiNote: 69 as MidiNote,
      wave: 'sine' as const,
      timbre: 0,
      cutoff: 20000 as Frequency,
      gain: 0.5,
      holdTime: 0,
      releaseTime: 0.1,
    };
    
    const held = createTypedHeldPacket(payload, 5000);
    
    expect(held.payload.freq).toBe(440);
    expect(held.payload.midiNote).toBe(69);
    expect(held.releaseTime).toBe(5000);
  });

  it('should clone payload to prevent mutation', () => {
    const payload = {
      freq: 440 as Frequency,
      midiNote: 69 as MidiNote,
      wave: 'sine' as const,
      timbre: 0,
      cutoff: 20000 as Frequency,
      gain: 0.5,
      holdTime: 0,
      releaseTime: 0.1,
    };
    
    const held = createTypedHeldPacket(payload, 5000);
    expect(held.payload).not.toBe(payload);
    expect(held.payload).toEqual(payload);
  });
});

// ============================================================================
// Safe Casting Utilities Tests
// ============================================================================

describe('castNodeType', () => {
  const sourceNode = createTypedNode(
    'source',
    'node-1' as NodeId,
    0, 0,
    { interval: 1, midiNote: 60 as MidiNote, noteIndex: -1, autoTrigger: true, intensity: 0.5 }
  );

  it('should return node when type matches', () => {
    const result = castNodeType(sourceNode as GraphNode, 'source');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('source');
  });

  it('should return null when type does not match', () => {
    const result = castNodeType(sourceNode as GraphNode, 'filter');
    expect(result).toBeNull();
  });
});

describe('cloneNode', () => {
  const originalNode = createTypedNode(
    'filter',
    'original-id' as NodeId,
    100, 200,
    { cutoff: 5000 as Frequency, attack: 0.1, decay: 0.2, mod: 0.5 }
  );

  it('should clone node with same values', () => {
    const cloned = cloneNode(originalNode);
    expect(cloned.id).toBe(originalNode.id);
    expect(cloned.type).toBe(originalNode.type);
    expect(cloned.x).toBe(originalNode.x);
    expect(cloned.y).toBe(originalNode.y);
    expect(cloned.props).toEqual(originalNode.props);
  });

  it('should clone with new id', () => {
    const cloned = cloneNode(originalNode, 'new-id' as NodeId);
    expect(cloned.id).toBe('new-id');
  });

  it('should clone with new position', () => {
    const cloned = cloneNode(originalNode, undefined, 500, 600);
    expect(cloned.id).toBe(originalNode.id);
    expect(cloned.x).toBe(500);
    expect(cloned.y).toBe(600);
  });

  it('should reset runtime state', () => {
    const cloned = cloneNode(originalNode);
    expect(cloned.timer).toBe(0);
    expect(cloned.lastTrigger).toBe(0);
    expect(cloned.flash).toBe(0);
    expect(cloned.heldPackets).toEqual([]);
  });

  it('should deep clone props', () => {
    const cloned = cloneNode(originalNode);
    expect(cloned.props).not.toBe(originalNode.props);
  });
});

describe('updateNodeProps', () => {
  const filterNode = createTypedNode(
    'filter',
    'node-1' as NodeId,
    0, 0,
    { cutoff: 5000 as Frequency, attack: 0.1, decay: 0.2, mod: 0.5 }
  );

  it('should update specified props', () => {
    const updated = updateNodeProps(filterNode, { cutoff: 10000 as Frequency });
    expect(updated.props.cutoff).toBe(10000);
    expect(updated.props.attack).toBe(0.1); // Unchanged
  });

  it('should return new node object', () => {
    const updated = updateNodeProps(filterNode, { cutoff: 10000 as Frequency });
    expect(updated).not.toBe(filterNode);
  });

  it('should preserve other properties', () => {
    const updated = updateNodeProps(filterNode, { attack: 0.5 });
    expect(updated.id).toBe(filterNode.id);
    expect(updated.type).toBe(filterNode.type);
    expect(updated.x).toBe(filterNode.x);
    expect(updated.y).toBe(filterNode.y);
  });

  it('should handle multiple prop updates', () => {
    const updated = updateNodeProps(filterNode, { 
      cutoff: 8000 as Frequency, 
      attack: 0.3, 
      decay: 0.5 
    });
    expect(updated.props.cutoff).toBe(8000);
    expect(updated.props.attack).toBe(0.3);
    expect(updated.props.decay).toBe(0.5);
    expect(updated.props.mod).toBe(0.5); // Unchanged
  });
});
