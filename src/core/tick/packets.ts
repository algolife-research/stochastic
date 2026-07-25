// Packet Movement Module
// Handles packet updates, movement, and arrival processing

import { getGraphStore } from '../store';
import type { Packet, GraphNode, GraphEdge, PacketId, CrossoverProps } from '../types';
import { createPacketId } from '../types';
import { 
  dist, MAX_PACKETS, MAX_PACKET_HOPS, MAX_EDGE_VISITS, 
  MAX_PACKET_AGE_MS, EDGE_SPAWN_COOLDOWN_MS 
} from '../constants';
import { processNodeArrival, getTeleporterExits, consumePendingTunnelSpeakers } from '../engine';
import { audioEngine } from '@audio/engine';
import { syncEntangledPayloads, performCrossover } from './crossover';

// ============================================================================
// EDGE SPAWN RATE LIMITING
// ============================================================================

/** Track last spawn time per edge to prevent burst spawning */
const edgeLastSpawnTime = new Map<string, number>();

/**
 * Check if spawning on an edge is allowed (rate limiting)
 */
function canSpawnOnEdge(edgeId: string, now: number): boolean {
  const lastSpawn = edgeLastSpawnTime.get(edgeId) ?? 0;
  return (now - lastSpawn) >= EDGE_SPAWN_COOLDOWN_MS;
}

/**
 * Record that a packet was spawned on an edge
 */
function recordEdgeSpawn(edgeId: string, now: number): void {
  edgeLastSpawnTime.set(edgeId, now);
}

/**
 * Clean up old edge spawn records (call periodically)
 */
export function cleanupEdgeSpawnRecords(): void {
  const now = performance.now();
  const staleThreshold = 5000; // 5 seconds
  
  for (const [edgeId, lastTime] of edgeLastSpawnTime.entries()) {
    if (now - lastTime > staleThreshold) {
      edgeLastSpawnTime.delete(edgeId);
    }
  }
}

// ============================================================================
// PACKET VALIDATION
// ============================================================================

/**
 * Check if a packet should be expired based on anti-explosion rules
 */
function shouldExpirePacket(packet: Packet, now: number): { expired: boolean; reason?: string } {
  // Check TTL (hop count)
  if (packet.hopCount !== undefined && packet.hopCount >= MAX_PACKET_HOPS) {
    return { expired: true, reason: 'max_hops' };
  }
  
  // Check age
  if (packet.birthTime !== undefined && (now - packet.birthTime) >= MAX_PACKET_AGE_MS) {
    return { expired: true, reason: 'max_age' };
  }
  
  return { expired: false };
}

/**
 * Check if a packet has visited an edge too many times (loop detection)
 */
function hasExceededEdgeVisits(packet: Packet, edgeId: string): boolean {
  if (!packet.visitedEdges) return false;
  
  const visitCount = packet.visitedEdges.filter(id => id === edgeId).length;
  return visitCount >= MAX_EDGE_VISITS;
}

/**
 * Create packet metadata for a new/spawned packet
 */
function createPacketMetadata(parentPacket?: Packet, edgeId?: string): {
  hopCount: number;
  visitedEdges: string[];
  birthTime: number;
} {
  const now = performance.now();
  
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
// PACKET MOVEMENT
// ============================================================================

/**
 * Update all packets - movement and arrival processing
 */
export function updatePackets(deltaTime: number): void {
  const store = getGraphStore();
  const { globalSettings } = store;
  // Honor the playing scene's local BPM override (falls back to master BPM)
  const effectiveBpm = store.scenePlayback.effectiveBpm || store.masterSpeed;
  const now = performance.now();
  
  const packetsToDelete: PacketId[] = [];
  const positionUpdates: Array<[PacketId, number]> = [];
  const packetsToSpawn: Packet[] = [];
  const arrivals: Array<{ packet: Packet; node: GraphNode; edge: GraphEdge }> = [];
  
  // Periodically clean up edge spawn records
  if (Math.random() < 0.01) { // ~1% of frames
    cleanupEdgeSpawnRecords();
  }
  
  store.packets.forEach((packet) => {
    // Check anti-explosion expiry first
    const expiry = shouldExpirePacket(packet, now);
    if (expiry.expired) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    const edge = store.getEdge(packet.edgeId);
    if (!edge) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    const fromNode = store.getNode(edge.from);
    const toNode = store.getNode(edge.to);
    if (!fromNode || !toNode) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    // Calculate speed based on edge timing mode
    const secondsPerBeat = 60 / effectiveBpm;
    let traverseTime: number;
    
    if (edge.timingMode === 'fixed' && edge.durationBeats !== null) {
      // Use fixed duration in beats
      traverseTime = edge.durationBeats * secondsPerBeat;
    } else {
      // Use physical distance
      const edgeLength = dist(fromNode.x, fromNode.y, toNode.x, toNode.y);
      const beatsToTraverse = edgeLength / globalSettings.pixelsPerBeat;
      traverseTime = beatsToTraverse * secondsPerBeat;
    }
    
    // If traverseTime is 0 or very small, arrive immediately
    const speed = traverseTime > 0.0001 ? deltaTime / traverseTime : 1;

    // Update position (batched: one store update per frame, not per packet)
    const newT = packet.t + speed;
    positionUpdates.push([packet.id, newT]);

    // Check if arrived
    if (newT >= 1) {
      arrivals.push({ packet, node: toNode, edge });
    }
  });

  store.batchUpdatePacketPositions(positionUpdates);
  
  // Create set of arriving packet IDs for entanglement sync
  const arrivingPacketIds = new Set(arrivals.map(a => a.packet.id));
  
  // Process arrivals
  arrivals.forEach(({ packet, node, edge }) => {
    packetsToDelete.push(packet.id);
    
    // Flash node
    store.flashNode(node.id);
    
    // Handle modulation edges (CV routing)
    const typedEdge = edge as { targetParam?: string | null };
    if (typedEdge.targetParam) {
      // This is a modulation connection - apply value to node property
      const value = packet.payload.modulationValue !== undefined 
        ? packet.payload.modulationValue 
        : packet.payload.gain;
      
      // Update the target node's property
      const currentProps = { ...node.props } as Record<string, unknown>;
      currentProps[typedEdge.targetParam] = value;
      store.updateNode(node.id, { props: currentProps } as unknown as Partial<GraphNode>);
      
      // Different visual feedback for modulation
      store.updateNode(node.id, { flash: 0.5 } as Partial<GraphNode>);
      return; // Don't forward modulation packets
    }
    
    // Process node type
    const processedPayload = processNodeArrival(packet, node, edge);

    // Gates mark blocked packets with a negative-gain sentinel (see processGate,
    // which handles the probability roll AND all fitness modes). Tunnels forward
    // the sentinel when an internal sub-gate blocks. Drop both here — rolling
    // again would square the pass probability, and a negative-gain packet
    // reaching a speaker renders as a phase-inverted note.
    if ((node.type === 'gate' || node.type === 'tunnel') && processedPayload.gain < 0) {
      return;
    }

    if (node.type === 'speaker') {
      // Trigger audio playback with speaker settings
      const speakerProps = node.props as {
        volume?: number; reverb?: number; pan?: number;
        holdTime?: number; releaseTime?: number;
      };
      // Apply speaker volume and envelope tail to the payload
      const finalPayload = {
        ...processedPayload,
        gain: processedPayload.gain * (speakerProps.volume ?? 1),
        holdTime: speakerProps.holdTime ?? processedPayload.holdTime,
        releaseTime: speakerProps.releaseTime ?? processedPayload.releaseTime,
      };

      audioEngine.playNote(finalPayload, {
        reverb: speakerProps.reverb ?? 0.3,
        pan: speakerProps.pan ?? 0,
      });
    }
    
    if (node.type === 'teleporter') {
      const props = node.props as { channel: string; isEntry: boolean };
      if (props.isEntry) {
        // Find exit teleporters
        const exits = getTeleporterExits(props.channel);
        exits.forEach(exitId => {
          const exitNode = store.getNode(exitId);
          if (exitNode) {
            const exitEdges = store.getOutgoingEdges(exitId);
            exitEdges.forEach(outEdge => {
              // Anti-explosion checks
              if (store.packets.size >= MAX_PACKETS) return;
              if (!canSpawnOnEdge(outEdge.id, now)) return;
              if (hasExceededEdgeVisits(packet, outEdge.id)) return;
              
              const metadata = createPacketMetadata(packet, outEdge.id);
              packetsToSpawn.push({
                id: createPacketId(),
                edgeId: outEdge.id,
                t: 0,
                payload: { ...processedPayload },
                entanglementGroupId: packet.entanglementGroupId,  // Preserve entanglement
                ...metadata,
              });
              recordEdgeSpawn(outEdge.id, now);
            });
          }
        });
        return; // Don't propagate normally
      }
    }
    
    if (node.type === 'delay') {
      // Hold packet for delay time
      const props = node.props as { delayTime: number };
      store.holdPacketAtNode(node.id, packet.payload, props.delayTime);
      return; // Don't propagate immediately
    }
    
    // Handle crossover node (sexual reproduction - wait for two parents)
    if (node.type === 'crossover') {
      const props = node.props as CrossoverProps;
      const now = performance.now();
      
      // Check if there's already a waiting packet
      const heldPackets = node.heldPackets ?? [];
      
      if (heldPackets.length === 0) {
        // First parent - hold and wait for second
        store.holdPacketAtNode(node.id, packet.payload, props.timeout);
        return; // Wait for second parent
      } else {
        // Second parent arrived - perform crossover
        const firstHeld = heldPackets[0];
        if (!firstHeld) {
          // Safety check - shouldn't happen
          return;
        }
        
        const parentA = firstHeld.payload;
        const parentB = packet.payload;
        
        // Check if first parent has timed out
        const hasTimedOut = now >= firstHeld.releaseTime;
        
        if (hasTimedOut) {
          // Timeout - just pass through the new packet
          store.releaseHeldPackets(node.id, [0]);
        } else {
          // Crossover! Create offspring
          const offspring = performCrossover(parentA, parentB, props);
          
          // Clear held packets
          store.releaseHeldPackets(node.id, [0]);
          
          // Spawn offspring on outgoing edges
          const outgoingEdges = store.getOutgoingEdges(node.id);
          outgoingEdges.forEach(outEdge => {
            // Anti-explosion checks
            if (store.packets.size + packetsToSpawn.length >= MAX_PACKETS) return;
            if (!canSpawnOnEdge(outEdge.id, now)) return;
            if (hasExceededEdgeVisits(packet, outEdge.id)) return;
            
            const metadata = createPacketMetadata(packet, outEdge.id);
            packetsToSpawn.push({
              id: createPacketId(),
              edgeId: outEdge.id,
              t: 0,
              payload: offspring,
              ...metadata,
            });
            recordEdgeSpawn(outEdge.id, now);
          });
          
          return; // Don't propagate the parents
        }
      }
    }
    
    // Handle splitter entanglement and routing
    let entanglementGroupId = packet.entanglementGroupId;
    let targetEdges = store.getOutgoingEdges(node.id);

    if (node.type === 'splitter') {
      const props = node.props as { entangled?: boolean; behavior?: 'broadcast' | 'random' | 'weighted' };
      
      if (props.entangled) {
        // Create new entanglement group for packets split here
        entanglementGroupId = crypto.randomUUID();
      }

      // Handle routing behavior
      if (props.behavior === 'random') {
        // Pick one random edge
        if (targetEdges.length > 0) {
          const idx = Math.floor(Math.random() * targetEdges.length);
          const selected = targetEdges[idx];
          if (selected) {
            targetEdges = [selected];
          }
        }
      } else if (props.behavior === 'weighted') {
        // Pick one edge based on weights
        if (targetEdges.length > 0) {
          let totalWeight = 0;
          for (const edge of targetEdges) {
            totalWeight += (edge.weight ?? 1);
          }
          
          let r = Math.random() * totalWeight;
          let selectedEdge = targetEdges[0];
          
          for (const edge of targetEdges) {
            r -= (edge.weight ?? 1);
            if (r <= 0) {
              selectedEdge = edge;
              break;
            }
          }
          
          if (selectedEdge) {
            targetEdges = [selectedEdge];
          }
        }
      }
      // 'broadcast' is default (all edges)
    }
    
    // Sync payload to entangled packets (if this packet is entangled)
    if (packet.entanglementGroupId && node.type !== 'speaker' && node.type !== 'splitter') {
      syncEntangledPayloads(packet.entanglementGroupId, processedPayload, store, arrivingPacketIds);
    }
    
    // Propagate to outgoing edges
    targetEdges.forEach(outEdge => {
      // Anti-explosion checks
      if (store.packets.size + packetsToSpawn.length >= MAX_PACKETS) return;
      if (!canSpawnOnEdge(outEdge.id, now)) return;
      if (hasExceededEdgeVisits(packet, outEdge.id)) return;
      
      const metadata = createPacketMetadata(packet, outEdge.id);
      const newPayload = { ...processedPayload };
      packetsToSpawn.push({
        id: createPacketId(),
        edgeId: outEdge.id,
        t: 0,
        payload: newPayload,
        entanglementGroupId,  // Propagate entanglement
        ...metadata,
      });
      recordEdgeSpawn(outEdge.id, now);
    });
  });
  
  // Delete processed packets
  packetsToDelete.forEach(id => store.deletePacket(id));
  
  // Spawn new packets
  packetsToSpawn.forEach(packet => store.addPacket(packet));
  
  // Process any speakers that were triggered inside tunnels
  const tunnelSpeakers = consumePendingTunnelSpeakers();
  tunnelSpeakers.forEach(({ payload, speakerProps }) => {
    const volume = (speakerProps.volume as number) ?? 1;
    const reverb = (speakerProps.reverb as number) ?? 0.3;
    const pan = (speakerProps.pan as number) ?? 0;
    
    const finalPayload = {
      ...payload,
      gain: payload.gain * volume,
    };
    
    audioEngine.playNote(finalPayload, { reverb, pan });
  });
}

// ============================================================================
// NODE UPDATES
// ============================================================================

/**
 * Update node flash decay
 */
export function updateNodeFlash(deltaTime: number): void {
  // Batched: one store update decays every node's flash for the frame
  getGraphStore().decayNodeFlashes(deltaTime);
}

/**
 * Update delay nodes - release held packets
 */
export function updateDelayNodes(now: number): void {
  const store = getGraphStore();

  store.nodes.forEach((node) => {
    // Crossover: a parent whose wait expired passes through unchanged instead
    // of silently vanishing (the timeout promises pass-through semantics)
    if (node.type !== 'delay' && node.type !== 'crossover') return;
    
    const heldPackets = node.heldPackets ?? [];
    const toRelease: number[] = [];
    
    heldPackets.forEach((hp, index) => {
      if (now >= hp.releaseTime) {
        toRelease.push(index);
        
        // Spawn packets on outgoing edges
        const outgoingEdges = store.getOutgoingEdges(node.id);
        outgoingEdges.forEach(edge => {
          // Anti-explosion checks
          if (store.packets.size >= MAX_PACKETS) return;
          if (!canSpawnOnEdge(edge.id, now)) return;
          
          // Delay-released packets start fresh (no inherited hop count or history)
          store.addPacket({
            id: createPacketId(),
            edgeId: edge.id,
            t: 0,
            payload: hp.payload,
            hopCount: 0,
            visitedEdges: [edge.id],
            birthTime: now,
          });
          recordEdgeSpawn(edge.id, now);
        });
        
        // Flash node
        store.flashNode(node.id);
      }
    });
    
    // Remove released packets (in reverse order to maintain indices)
    if (toRelease.length > 0) {
      store.releaseHeldPackets(node.id, toRelease);
    }
  });
}
