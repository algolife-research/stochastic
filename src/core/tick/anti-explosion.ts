// Anti-Explosion Module
// Pure functions for packet explosion prevention - separated for testability
// (loops are held by the room on a filament: see room.ts). Times are beat
// units (exact time, 16 Oct 2026: a packet's age is MAX_PACKET_AGE_BEATS; the
// 10 ms edge cooldowns went, the room on a filament bounding density instead).

import type { Packet } from '../types';
import { MAX_PACKET_HOPS, MAX_PACKET_AGE_BEATS, PPQ } from '../constants';

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
 * @param now - The time (beat units)
 * @param maxHops - Maximum allowed hops (defaults to MAX_PACKET_HOPS)
 * @param maxAge - Maximum age in beat units (defaults to MAX_PACKET_AGE_BEATS)
 */
export function shouldExpirePacket(
  packet: Packet, 
  now: number,
  maxHops: number = MAX_PACKET_HOPS,
  maxAge: number = MAX_PACKET_AGE_BEATS * PPQ
): ExpirationResult {
  // Check TTL (hop count)
  if (packet.hopCount !== undefined && packet.hopCount >= maxHops) {
    return { expired: true, reason: 'max_hops' };
  }
  
  // Check age
  if (packet.birthTime !== undefined && (now - packet.birthTime) >= maxAge) {
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
 * @param now - The time (beat units)
 * @param parentPacket - Parent packet to inherit from (optional)
 * @param edgeId - New edge being spawned onto (optional)
 */
export function createPacketMetadata(
  now: number,
  parentPacket?: Pick<Packet, 'hopCount' | 'visitedEdges' | 'birthTime'>,
  edgeId?: string
): PacketMetadata {
  if (parentPacket) {
    const visitedEdges = [...(parentPacket.visitedEdges ?? [])];
    if (edgeId) visitedEdges.push(edgeId);
    return {
      hopCount: (parentPacket.hopCount ?? 0) + 1,
      visitedEdges,
      birthTime: parentPacket.birthTime ?? now,
    };
  }
  return {
    hopCount: 0,
    visitedEdges: edgeId ? [edgeId] : [],
    birthTime: now,
  };
}
