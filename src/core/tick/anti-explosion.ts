// Anti-Explosion Module
// Pure functions for packet explosion prevention - separated for testability
// (loops are held by the room on a filament: see room.ts)

import type { Packet } from '../types';
import {
  MAX_PACKET_HOPS,
  MAX_PACKET_AGE_MS, EDGE_SPAWN_COOLDOWN_MS
} from '../constants';

// ============================================================================
// EDGE SPAWN RATE LIMITING
// ============================================================================

/**
 * Check if spawning on an edge is allowed (rate limiting)
 * @param lastSpawnTime - Last spawn timestamp for this edge (or undefined if never spawned)
 * @param now - Current timestamp
 * @param cooldownMs - Cooldown period in milliseconds
 */
export function canSpawnOnEdge(
  lastSpawnTime: number | undefined, 
  now: number, 
  cooldownMs: number = EDGE_SPAWN_COOLDOWN_MS
): boolean {
  if (lastSpawnTime === undefined) return true;
  return (now - lastSpawnTime) >= cooldownMs;
}

// ============================================================================
// PACKET VALIDATION
// ============================================================================

export interface ExpirationResult {
  expired: boolean;
  reason?: 'max_hops' | 'max_age';
}

/**
 * Check if a packet should be expired based on anti-explosion rules
 * @param packet - The packet to check
 * @param now - Current timestamp
 * @param maxHops - Maximum allowed hops (defaults to MAX_PACKET_HOPS)
 * @param maxAgeMs - Maximum age in milliseconds (defaults to MAX_PACKET_AGE_MS)
 */
export function shouldExpirePacket(
  packet: Packet, 
  now: number,
  maxHops: number = MAX_PACKET_HOPS,
  maxAgeMs: number = MAX_PACKET_AGE_MS
): ExpirationResult {
  // Check TTL (hop count)
  if (packet.hopCount !== undefined && packet.hopCount >= maxHops) {
    return { expired: true, reason: 'max_hops' };
  }
  
  // Check age
  if (packet.birthTime !== undefined && (now - packet.birthTime) >= maxAgeMs) {
    return { expired: true, reason: 'max_age' };
  }
  
  return { expired: false };
}

export interface PacketMetadata {
  hopCount: number;
  visitedEdges: string[];
  birthTime: number;
}

/**
 * Create packet metadata for a new/spawned packet
 * @param now - Current timestamp
 * @param parentPacket - Parent packet to inherit from (optional)
 * @param edgeId - New edge being spawned onto (optional)
 */
export function createPacketMetadata(
  now: number,
  parentPacket?: Pick<Packet, 'hopCount' | 'visitedEdges' | 'birthTime'>,
  edgeId?: string
): PacketMetadata {
  if (parentPacket) {
    // Inherit and increment from parent
    const visitedEdges = [...(parentPacket.visitedEdges ?? [])];
    if (edgeId) visitedEdges.push(edgeId);
    
    return {
      hopCount: (parentPacket.hopCount ?? 0) + 1,
      visitedEdges,
      birthTime: parentPacket.birthTime ?? now,
    };
  }
  
  // New packet (from source)
  return {
    hopCount: 0,
    visitedEdges: edgeId ? [edgeId] : [],
    birthTime: now,
  };
}

// ============================================================================
// EDGE SPAWN TRACKING (Stateful)
// ============================================================================

/**
 * Creates an edge spawn tracker instance
 * Useful for managing spawn cooldowns per edge
 */
export function createEdgeSpawnTracker() {
  const spawnTimes = new Map<string, number>();
  
  return {
    /**
     * Check if spawning is allowed on this edge
     */
    canSpawn(edgeId: string, now: number, cooldownMs: number = EDGE_SPAWN_COOLDOWN_MS): boolean {
      return canSpawnOnEdge(spawnTimes.get(edgeId), now, cooldownMs);
    },
    
    /**
     * Record a spawn on an edge
     */
    recordSpawn(edgeId: string, now: number): void {
      spawnTimes.set(edgeId, now);
    },
    
    /**
     * Clean up stale records older than threshold
     */
    cleanup(now: number, staleThresholdMs: number = 5000): number {
      let removed = 0;
      for (const [edgeId, lastTime] of spawnTimes.entries()) {
        if (now - lastTime > staleThresholdMs) {
          spawnTimes.delete(edgeId);
          removed++;
        }
      }
      return removed;
    },
    
    /**
     * Get the number of tracked edges
     */
    get size(): number {
      return spawnTimes.size;
    },
    
    /**
     * Clear all records (for testing)
     */
    clear(): void {
      spawnTimes.clear();
    },
  };
}

export type EdgeSpawnTracker = ReturnType<typeof createEdgeSpawnTracker>;
