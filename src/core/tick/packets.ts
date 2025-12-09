// Packet Movement Module
// Handles packet updates, movement, and arrival processing

import { getGraphStore } from '../store';
import type { Packet, GraphNode, GraphEdge, PacketId, CrossoverProps } from '../types';
import { createPacketId } from '../types';
import { dist, MAX_PACKETS } from '../constants';
import { processNodeArrival, getTeleporterExits, consumePendingTunnelSpeakers } from '../engine';
import { audioEngine } from '@audio/engine';
import { syncEntangledPayloads, performCrossover } from './crossover';

// ============================================================================
// PACKET MOVEMENT
// ============================================================================

/**
 * Update all packets - movement and arrival processing
 */
export function updatePackets(deltaTime: number): void {
  const store = getGraphStore();
  const { globalSettings, masterSpeed } = store;
  
  const packetsToDelete: PacketId[] = [];
  const packetsToSpawn: Packet[] = [];
  const arrivals: Array<{ packet: Packet; node: GraphNode; edge: GraphEdge }> = [];
  
  store.packets.forEach((packet) => {
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
    const secondsPerBeat = 60 / masterSpeed;
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
    
    // Update position
    const newT = packet.t + speed;
    store.updatePacket(packet.id, { t: newT });
    
    // Check if arrived
    if (newT >= 1) {
      arrivals.push({ packet, node: toNode, edge });
    }
  });
  
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
    
    // Handle special node types
    if (node.type === 'gate') {
      const props = node.props as { prob: number };
      if (Math.random() > props.prob) {
        // Gate blocked - don't propagate
        return;
      }
    }
    
    if (node.type === 'speaker') {
      // Trigger audio playback with speaker settings
      const speakerProps = node.props as { volume?: number; reverb?: number; pan?: number };
      // Apply speaker volume to payload gain
      const finalPayload = {
        ...processedPayload,
        gain: processedPayload.gain * (speakerProps.volume ?? 1),
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
              if (store.packets.size < MAX_PACKETS) {
                packetsToSpawn.push({
                  id: createPacketId(),
                  edgeId: outEdge.id,
                  t: 0,
                  payload: { ...processedPayload },
                  entanglementGroupId: packet.entanglementGroupId,  // Preserve entanglement
                });
              }
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
            if (store.packets.size + packetsToSpawn.length < MAX_PACKETS) {
              packetsToSpawn.push({
                id: createPacketId(),
                edgeId: outEdge.id,
                t: 0,
                payload: offspring,
              });
            }
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
      if (store.packets.size + packetsToSpawn.length < MAX_PACKETS) {
        const newPayload = { ...processedPayload };
        packetsToSpawn.push({
          id: createPacketId(),
          edgeId: outEdge.id,
          t: 0,
          payload: newPayload,
          entanglementGroupId,  // Propagate entanglement
        });
      }
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
  const store = getGraphStore();
  
  store.nodes.forEach((node) => {
    if (node.flash > 0) {
      const newFlash = node.flash * Math.pow(0.1, deltaTime * 5);
      if (newFlash < 0.01) {
        store.updateNode(node.id, { flash: 0 } as Partial<GraphNode>);
      } else {
        store.updateNode(node.id, { flash: newFlash } as Partial<GraphNode>);
      }
    }
  });
}

/**
 * Update delay nodes - release held packets
 */
export function updateDelayNodes(now: number): void {
  const store = getGraphStore();
  
  store.nodes.forEach((node) => {
    if (node.type !== 'delay') return;
    
    const heldPackets = node.heldPackets ?? [];
    const toRelease: number[] = [];
    
    heldPackets.forEach((hp, index) => {
      if (now >= hp.releaseTime) {
        toRelease.push(index);
        
        // Spawn packets on outgoing edges
        const outgoingEdges = store.getOutgoingEdges(node.id);
        outgoingEdges.forEach(edge => {
          if (store.packets.size < MAX_PACKETS) {
            store.addPacket({
              id: createPacketId(),
              edgeId: edge.id,
              t: 0,
              payload: hp.payload,
            });
          }
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
