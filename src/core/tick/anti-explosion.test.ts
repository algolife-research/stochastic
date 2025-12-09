// Anti-Explosion Module Tests
// Unit tests for packet explosion prevention mechanisms

import { describe, it, expect, beforeEach } from 'vitest';
import {
  canSpawnOnEdge,
  shouldExpirePacket,
  hasExceededEdgeVisits,
  createPacketMetadata,
  createEdgeSpawnTracker,
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
// canSpawnOnEdge Tests
// ============================================================================

describe('canSpawnOnEdge', () => {
  it('should allow spawn when no previous spawn recorded', () => {
    expect(canSpawnOnEdge(undefined, 1000, 50)).toBe(true);
  });

  it('should block spawn within cooldown period', () => {
    const lastSpawn = 1000;
    const now = 1030; // 30ms later, cooldown is 50ms
    expect(canSpawnOnEdge(lastSpawn, now, 50)).toBe(false);
  });

  it('should allow spawn after cooldown expires', () => {
    const lastSpawn = 1000;
    const now = 1050; // exactly at cooldown
    expect(canSpawnOnEdge(lastSpawn, now, 50)).toBe(true);
  });

  it('should allow spawn well after cooldown', () => {
    const lastSpawn = 1000;
    const now = 2000; // 1 second later
    expect(canSpawnOnEdge(lastSpawn, now, 50)).toBe(true);
  });

  it('should respect custom cooldown values', () => {
    const lastSpawn = 1000;
    expect(canSpawnOnEdge(lastSpawn, 1050, 100)).toBe(false); // 100ms cooldown
    expect(canSpawnOnEdge(lastSpawn, 1100, 100)).toBe(true);
  });
});

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
// hasExceededEdgeVisits Tests
// ============================================================================

describe('hasExceededEdgeVisits', () => {
  it('should return false for undefined visitedEdges', () => {
    expect(hasExceededEdgeVisits(undefined, 'edge-1')).toBe(false);
  });

  it('should return false for empty visitedEdges', () => {
    expect(hasExceededEdgeVisits([], 'edge-1')).toBe(false);
  });

  it('should return false when edge not visited', () => {
    const visited = ['edge-2', 'edge-3', 'edge-4'];
    expect(hasExceededEdgeVisits(visited, 'edge-1')).toBe(false);
  });

  it('should return false when visits below max', () => {
    const visited = ['edge-1', 'edge-2', 'edge-1', 'edge-3']; // 2 visits
    expect(hasExceededEdgeVisits(visited, 'edge-1', 4)).toBe(false);
  });

  it('should return true when visits equal max', () => {
    const visited = ['edge-1', 'edge-1', 'edge-1', 'edge-1']; // 4 visits
    expect(hasExceededEdgeVisits(visited, 'edge-1', 4)).toBe(true);
  });

  it('should return true when visits exceed max', () => {
    const visited = ['edge-1', 'edge-1', 'edge-1', 'edge-1', 'edge-1']; // 5 visits
    expect(hasExceededEdgeVisits(visited, 'edge-1', 4)).toBe(true);
  });

  it('should only count specific edge visits', () => {
    const visited = ['edge-1', 'edge-2', 'edge-1', 'edge-3', 'edge-1']; // 3 visits to edge-1
    expect(hasExceededEdgeVisits(visited, 'edge-1', 4)).toBe(false);
    expect(hasExceededEdgeVisits(visited, 'edge-2', 4)).toBe(false);
  });

  it('should respect custom max visits', () => {
    const visited = ['edge-1', 'edge-1'];
    expect(hasExceededEdgeVisits(visited, 'edge-1', 2)).toBe(true);
    expect(hasExceededEdgeVisits(visited, 'edge-1', 3)).toBe(false);
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
// EdgeSpawnTracker Tests
// ============================================================================

describe('EdgeSpawnTracker', () => {
  let tracker: ReturnType<typeof createEdgeSpawnTracker>;

  beforeEach(() => {
    tracker = createEdgeSpawnTracker();
  });

  describe('canSpawn', () => {
    it('should allow spawn on fresh edge', () => {
      expect(tracker.canSpawn('edge-1', 1000)).toBe(true);
    });

    it('should block spawn within cooldown', () => {
      tracker.recordSpawn('edge-1', 1000);
      expect(tracker.canSpawn('edge-1', 1030, 50)).toBe(false);
    });

    it('should allow spawn after cooldown', () => {
      tracker.recordSpawn('edge-1', 1000);
      expect(tracker.canSpawn('edge-1', 1050, 50)).toBe(true);
    });

    it('should track multiple edges independently', () => {
      tracker.recordSpawn('edge-1', 1000);
      tracker.recordSpawn('edge-2', 1020);
      
      // At time 1040: edge-1 is past cooldown, edge-2 is not
      expect(tracker.canSpawn('edge-1', 1050, 50)).toBe(true);
      expect(tracker.canSpawn('edge-2', 1050, 50)).toBe(false);
    });
  });

  describe('recordSpawn', () => {
    it('should update spawn time', () => {
      tracker.recordSpawn('edge-1', 1000);
      expect(tracker.canSpawn('edge-1', 1030, 50)).toBe(false);
      
      tracker.recordSpawn('edge-1', 1100); // Update to later time
      expect(tracker.canSpawn('edge-1', 1130, 50)).toBe(false);
      expect(tracker.canSpawn('edge-1', 1150, 50)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove stale records', () => {
      tracker.recordSpawn('edge-1', 1000);
      tracker.recordSpawn('edge-2', 4000);
      tracker.recordSpawn('edge-3', 6000);
      
      // At time 6500 with 5000ms threshold:
      // edge-1 (5500ms old) - stale
      // edge-2 (2500ms old) - keep
      // edge-3 (500ms old) - keep
      const removed = tracker.cleanup(6500, 5000);
      
      expect(removed).toBe(1);
      expect(tracker.size).toBe(2);
    });

    it('should keep recent records', () => {
      tracker.recordSpawn('edge-1', 1000);
      tracker.recordSpawn('edge-2', 1100);
      
      const removed = tracker.cleanup(1200, 5000);
      
      expect(removed).toBe(0);
      expect(tracker.size).toBe(2);
    });

    it('should handle empty tracker', () => {
      const removed = tracker.cleanup(1000, 5000);
      expect(removed).toBe(0);
    });
  });

  describe('size', () => {
    it('should return correct count', () => {
      expect(tracker.size).toBe(0);
      
      tracker.recordSpawn('edge-1', 1000);
      expect(tracker.size).toBe(1);
      
      tracker.recordSpawn('edge-2', 1000);
      expect(tracker.size).toBe(2);
      
      // Re-recording same edge doesn't increase size
      tracker.recordSpawn('edge-1', 2000);
      expect(tracker.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all records', () => {
      tracker.recordSpawn('edge-1', 1000);
      tracker.recordSpawn('edge-2', 1000);
      tracker.recordSpawn('edge-3', 1000);
      
      tracker.clear();
      
      expect(tracker.size).toBe(0);
      expect(tracker.canSpawn('edge-1', 1000)).toBe(true);
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

  it('should detect loop by excessive edge visits', () => {
    const loopEdges = ['edge-A', 'edge-B', 'edge-C'];
    const visitedEdges: string[] = [];
    
    // Simulate packet going through loop multiple times
    for (let loop = 0; loop < 5; loop++) {
      for (const edge of loopEdges) {
        visitedEdges.push(edge);
      }
    }
    
    // Each edge visited 5 times - should exceed limit of 4
    expect(hasExceededEdgeVisits(visitedEdges, 'edge-A', 4)).toBe(true);
    expect(hasExceededEdgeVisits(visitedEdges, 'edge-B', 4)).toBe(true);
    expect(hasExceededEdgeVisits(visitedEdges, 'edge-C', 4)).toBe(true);
  });

  it('should correctly combine spawn tracking with expiration', () => {
    const tracker = createEdgeSpawnTracker();
    const now = 10000;
    
    // Simulate rapid spawn attempts every 20ms with 50ms cooldown
    const spawnAttempts: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const canSpawn = tracker.canSpawn('loop-edge', now + i * 20, 50);
      if (canSpawn) {
        tracker.recordSpawn('loop-edge', now + i * 20);
      }
      spawnAttempts.push(canSpawn);
    }
    
    // First attempt succeeds (at now+0), then blocked until cooldown
    // At now+20, now+40, now+60, now+80 - all within 50ms of last spawn
    expect(spawnAttempts[0]).toBe(true);  // now+0: first spawn
    expect(spawnAttempts[1]).toBe(false); // now+20: 20ms since last (blocked)
    expect(spawnAttempts[2]).toBe(false); // now+40: 40ms since last (blocked)
    // spawnAttempts[3] at now+60: 60ms since spawn at now+0, should be allowed
    expect(spawnAttempts[3]).toBe(true);  // now+60: allowed and recorded
    expect(spawnAttempts[4]).toBe(false); // now+80: 20ms since spawn at now+60 (blocked)
    
    // At now+150, should be allowed (90ms since last spawn at now+60)
    expect(tracker.canSpawn('loop-edge', now + 150, 50)).toBe(true);
  });
});
