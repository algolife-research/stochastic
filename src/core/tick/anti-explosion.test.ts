// Anti-Explosion Module Tests
// Unit tests for packet explosion prevention mechanisms (the edge cooldowns
// and their tracker went with exact time, 16 Oct 2026)

import { describe, it, expect } from 'vitest';
import {
  shouldExpirePacket,
  createPacketMetadata,
} from './anti-explosion';
import type { Packet } from '../types';
import type { PacketId, EdgeId, MidiNote, Frequency } from '../types';

// Helper to create a minimal packet for testing
function createTestPacket(overrides: Partial<Packet> = {}): Packet {
  return {
    id: 'test-packet-1' as PacketId,
    edgeId: 'edge-1' as EdgeId,
    t: 0,
    payload: {
      freq: 440 as Frequency,
      midiNote: 69 as MidiNote,
      wave: 'sine',
      timbre: 0,
      cutoff: 20000 as Frequency,
      gain: 0.5,
      holdTime: 0,
      releaseTime: 0.1,
    },
    ...overrides,
  };
}

// ============================================================================
// shouldExpirePacket Tests
// ============================================================================

describe('shouldExpirePacket', () => {
  describe('hop count expiration', () => {
    it('should not expire packet with no hop count', () => {
      const packet = createTestPacket();
      const result = shouldExpirePacket(packet, 1000);
      expect(result.expired).toBe(false);
    });

    it('should not expire packet below max hops', () => {
      const packet = createTestPacket({ hopCount: 10 });
      const result = shouldExpirePacket(packet, 1000, 32);
      expect(result.expired).toBe(false);
    });

    it('should expire packet at max hops', () => {
      const packet = createTestPacket({ hopCount: 32 });
      const result = shouldExpirePacket(packet, 1000, 32);
      expect(result.expired).toBe(true);
      expect(result.reason).toBe('max_hops');
    });

    it('should expire packet exceeding max hops', () => {
      const packet = createTestPacket({ hopCount: 50 });
      const result = shouldExpirePacket(packet, 1000, 32);
      expect(result.expired).toBe(true);
      expect(result.reason).toBe('max_hops');
    });

    it('should respect custom max hops', () => {
      const packet = createTestPacket({ hopCount: 5 });
      expect(shouldExpirePacket(packet, 1000, 5).expired).toBe(true);
      expect(shouldExpirePacket(packet, 1000, 10).expired).toBe(false);
    });
  });

  describe('age expiration', () => {
    it('should not expire packet with no birth time', () => {
      const packet = createTestPacket();
      const result = shouldExpirePacket(packet, 1000);
      expect(result.expired).toBe(false);
    });

    it('should not expire young packet', () => {
      const packet = createTestPacket({ birthTime: 1000 });
      const result = shouldExpirePacket(packet, 5000, 32, 30000); // 4 seconds old
      expect(result.expired).toBe(false);
    });

    it('should expire packet at max age', () => {
      const packet = createTestPacket({ birthTime: 0 });
      const result = shouldExpirePacket(packet, 30000, 32, 30000); // exactly 30 seconds
      expect(result.expired).toBe(true);
      expect(result.reason).toBe('max_age');
    });

    it('should expire old packet', () => {
      const packet = createTestPacket({ birthTime: 0 });
      const result = shouldExpirePacket(packet, 60000, 32, 30000); // 60 seconds old
      expect(result.expired).toBe(true);
      expect(result.reason).toBe('max_age');
    });

    it('should respect custom max age', () => {
      const packet = createTestPacket({ birthTime: 0 });
      expect(shouldExpirePacket(packet, 5000, 32, 5000).expired).toBe(true);
      expect(shouldExpirePacket(packet, 5000, 32, 10000).expired).toBe(false);
    });
  });

  describe('combined checks', () => {
    it('should prioritize hop count over age', () => {
      // Packet that exceeds both limits - hop count checked first
      const packet = createTestPacket({ 
        hopCount: 32, 
        birthTime: 0 
      });
      const result = shouldExpirePacket(packet, 30000, 32, 30000);
      expect(result.expired).toBe(true);
      expect(result.reason).toBe('max_hops');
    });

    it('should return age reason when only age exceeded', () => {
      const packet = createTestPacket({ 
        hopCount: 10, 
        birthTime: 0 
      });
      const result = shouldExpirePacket(packet, 30000, 32, 30000);
      expect(result.expired).toBe(true);
      expect(result.reason).toBe('max_age');
    });
  });
});

// ============================================================================
// createPacketMetadata Tests
// ============================================================================

describe('createPacketMetadata', () => {
  const NOW = 10000;

  describe('new packet (no parent)', () => {
    it('should create fresh metadata with no edge', () => {
      const metadata = createPacketMetadata(NOW);
      expect(metadata.hopCount).toBe(0);
      expect(metadata.visitedEdges).toEqual([]);
      expect(metadata.birthTime).toBe(NOW);
    });

    it('should create fresh metadata with edge', () => {
      const metadata = createPacketMetadata(NOW, undefined, 'edge-1');
      expect(metadata.hopCount).toBe(0);
      expect(metadata.visitedEdges).toEqual(['edge-1']);
      expect(metadata.birthTime).toBe(NOW);
    });
  });

  describe('spawned packet (with parent)', () => {
    it('should increment hop count from parent', () => {
      const parent = { hopCount: 5, visitedEdges: [], birthTime: 5000 };
      const metadata = createPacketMetadata(NOW, parent);
      expect(metadata.hopCount).toBe(6);
    });

    it('should handle parent with undefined hop count', () => {
      const parent = { visitedEdges: [], birthTime: 5000 };
      const metadata = createPacketMetadata(NOW, parent);
      expect(metadata.hopCount).toBe(1);
    });

    it('should inherit visited edges and add new edge', () => {
      const parent = { hopCount: 2, visitedEdges: ['edge-1', 'edge-2'], birthTime: 5000 };
      const metadata = createPacketMetadata(NOW, parent, 'edge-3');
      expect(metadata.visitedEdges).toEqual(['edge-1', 'edge-2', 'edge-3']);
    });

    it('should inherit visited edges without adding when no new edge', () => {
      const parent = { hopCount: 2, visitedEdges: ['edge-1', 'edge-2'], birthTime: 5000 };
      const metadata = createPacketMetadata(NOW, parent);
      expect(metadata.visitedEdges).toEqual(['edge-1', 'edge-2']);
    });

    it('should handle parent with undefined visited edges', () => {
      const parent = { hopCount: 2, birthTime: 5000 };
      const metadata = createPacketMetadata(NOW, parent, 'edge-1');
      expect(metadata.visitedEdges).toEqual(['edge-1']);
    });

    it('should preserve parent birth time', () => {
      const parent = { hopCount: 2, visitedEdges: [], birthTime: 5000 };
      const metadata = createPacketMetadata(NOW, parent);
      expect(metadata.birthTime).toBe(5000);
    });

    it('should use now if parent has no birth time', () => {
      const parent = { hopCount: 2, visitedEdges: [] };
      const metadata = createPacketMetadata(NOW, parent);
      expect(metadata.birthTime).toBe(NOW);
    });

    it('should not mutate parent visited edges', () => {
      const parentEdges = ['edge-1', 'edge-2'];
      const parent = { hopCount: 2, visitedEdges: parentEdges, birthTime: 5000 };
      createPacketMetadata(NOW, parent, 'edge-3');
      expect(parentEdges).toEqual(['edge-1', 'edge-2']);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Anti-Explosion Integration', () => {
  it('should correctly track a packet through multiple hops', () => {
    const now = 10000;
    
    // Source emits packet
    let metadata = createPacketMetadata(now, undefined, 'edge-1');
    expect(metadata.hopCount).toBe(0);
    expect(metadata.visitedEdges).toEqual(['edge-1']);
    
    // Packet arrives at node 1, spawns on edge-2
    metadata = createPacketMetadata(now + 100, { 
      hopCount: metadata.hopCount,
      visitedEdges: metadata.visitedEdges,
      birthTime: metadata.birthTime
    }, 'edge-2');
    expect(metadata.hopCount).toBe(1);
    expect(metadata.visitedEdges).toEqual(['edge-1', 'edge-2']);
    
    // Simulate 30 more hops
    for (let i = 0; i < 30; i++) {
      metadata = createPacketMetadata(now + 200 + i * 100, {
        hopCount: metadata.hopCount,
        visitedEdges: metadata.visitedEdges,
        birthTime: metadata.birthTime
      }, `edge-${i + 3}`);
    }
    
    expect(metadata.hopCount).toBe(31);
    
    // Next hop should trigger expiration
    const packet = createTestPacket({
      hopCount: metadata.hopCount,
      visitedEdges: metadata.visitedEdges,
      birthTime: metadata.birthTime
    });
    
    const finalMetadata = createPacketMetadata(now + 5000, {
      hopCount: packet.hopCount,
      visitedEdges: packet.visitedEdges,
      birthTime: packet.birthTime
    }, 'edge-final');
    
    const testPacket = createTestPacket({
      hopCount: finalMetadata.hopCount,
      visitedEdges: finalMetadata.visitedEdges,
      birthTime: finalMetadata.birthTime
    });
    
    const result = shouldExpirePacket(testPacket, now + 5000, 32);
    expect(result.expired).toBe(true);
    expect(result.reason).toBe('max_hops');
  });

  it('should end a loop by hops, not by edge visits', () => {
    // A loop with no delay: the room on a filament holds it (room.ts), and a
    // line goes round until its packets run out of hops
    const loopEdges = ['edge-A', 'edge-B', 'edge-C'];
    let metadata = createPacketMetadata(0, undefined, 'edge-A');
    let laps = 0;
    while (!shouldExpirePacket(createTestPacket(metadata), 0).expired) {
      for (const edge of loopEdges) {
        metadata = createPacketMetadata(0, metadata, edge);
      }
      laps += 1;
    }
    expect(laps).toBe(22);  // 64 hops at three a lap: well past a fourth lap
    expect(shouldExpirePacket(createTestPacket(metadata), 0).reason).toBe('max_hops');
  });

});
