// Virtual Channels Module
// Handles multi-channel scene processing for arrangement mode

import { getGraphStore } from '../store';
import type { Packet, GraphEdge, GraphNode, NodeId, MidiNote, Frequency, PacketId } from '../types';
import { createPacketId } from '../types';
import { dist, midiToFreq, clampMidi, LEGACY_SCALE_OFFSET, MAX_PACKETS } from '../constants';
import { processNodeArrival } from '../engine';
import { audioEngine } from '@audio/engine';
import { getActiveChannelScenes, getCanvasChannelIndex } from './state';
import type { ChannelSceneState } from './types';

// ============================================================================
// VIRTUAL CHANNEL SCENE PROCESSING
// ============================================================================

/**
 * Process virtual channel scenes - sources and packets for non-canvas channels
 * This enables multi-channel audio where scenes not on canvas still produce sound
 */
export function updateVirtualChannelScenes(now: number, dt: number): void {
  const store = getGraphStore();
  const { masterSpeed, arrangementChannels, scenePlayback } = store;
  
  // Only process in arrangement mode
  if (scenePlayback.mode !== 'arrangement') return;
  
  const msPerBeat = (60 / masterSpeed) * 1000;
  const activeChannelScenes = getActiveChannelScenes();
  const canvasChannelIndex = getCanvasChannelIndex();
  
  // Process each active virtual channel scene
  for (const [channelIndex, channelScene] of activeChannelScenes) {
    // Skip if this channel is the one on canvas (already processed by main loop)
    if (channelIndex === canvasChannelIndex) continue;
    
    // Get channel settings for volume
    const channel = arrangementChannels[channelIndex];
    const channelVolume = channel?.volume ?? 1;
    
    // Update sources - trigger auto-sources and spawn packets
    updateVirtualSources(channelScene, now, msPerBeat);
    
    // Update packets - move them and process arrivals
    updateVirtualPackets(channelScene, dt, channelVolume);
  }
}

/**
 * Update sources in a virtual channel scene
 */
function updateVirtualSources(
  channelScene: ChannelSceneState,
  now: number,
  msPerBeat: number
): void {
  const { nodes } = channelScene;
  
  nodes.forEach((node) => {
    if (node.type !== 'source') return;
    
    const props = node.props as {
      interval: number;
      autoTrigger: boolean;
      noteIndex: number;
      midiNote: MidiNote;
      intensity: number;
    };
    
    // Skip manual trigger sources
    if (props.autoTrigger === false) return;
    
    const intervalMs = props.interval * msPerBeat;
    
    if (now - node.lastTrigger >= intervalMs) {
      // Spawn packets for this source
      spawnVirtualPacket(channelScene, node.id, props);
      
      // Update last trigger time
      node.lastTrigger = now;
      node.flash = 1;
    }
  });
}

/**
 * Spawn a packet in a virtual channel scene
 */
function spawnVirtualPacket(
  channelScene: ChannelSceneState,
  sourceNodeId: NodeId,
  props: { noteIndex: number; midiNote: MidiNote; intensity: number }
): void {
  const { edges, packets } = channelScene;
  
  if (packets.size >= MAX_PACKETS) return;
  
  // Determine MIDI note
  let midiNote: MidiNote;
  if (props.noteIndex >= 0) {
    midiNote = clampMidi(LEGACY_SCALE_OFFSET + Math.min(36, props.noteIndex)) as MidiNote;
  } else if (props.noteIndex === -1) {
    // Random note
    midiNote = (36 + Math.floor(Math.random() * 49)) as MidiNote;
  } else {
    midiNote = props.midiNote ?? (60 as MidiNote);
  }
  
  const freq = midiToFreq(midiNote);
  const intensity = props.intensity ?? 0.5;
  
  // Get outgoing edges from this source
  const outgoingEdges: GraphEdge[] = [];
  edges.forEach((edge) => {
    if (edge.from === sourceNodeId) {
      outgoingEdges.push(edge);
    }
  });
  
  // Create packets for each outgoing edge
  outgoingEdges.forEach(edge => {
    const packetId = createPacketId();
    const packet: Packet = {
      id: packetId,
      edgeId: edge.id,
      t: 0,
      payload: {
        freq,
        midiNote,
        wave: 'sine',
        timbre: 0,
        cutoff: 20000 as Frequency,
        gain: intensity,
        holdTime: 0,
        releaseTime: 0.1,
      },
    };
    
    packets.set(packetId, packet);
  });
}

/**
 * Update packets in a virtual channel scene
 */
function updateVirtualPackets(
  channelScene: ChannelSceneState,
  dt: number,
  channelVolume: number
): void {
  const store = getGraphStore();
  const { globalSettings, masterSpeed } = store;
  const { nodes, edges, packets } = channelScene;
  
  const packetsToDelete: PacketId[] = [];
  const packetsToSpawn: Packet[] = [];
  
  const secondsPerBeat = 60 / masterSpeed;
  
  packets.forEach((packet) => {
    const edge = edges.get(packet.edgeId);
    if (!edge) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (!fromNode || !toNode) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    // Calculate traverse time based on edge timing mode
    let traverseTime: number;
    if (edge.timingMode === 'fixed' && edge.durationBeats !== null) {
      traverseTime = edge.durationBeats * secondsPerBeat;
    } else {
      // Physical distance mode
      const edgeLength = dist(fromNode.x, fromNode.y, toNode.x, toNode.y);
      const beatsToTraverse = edgeLength / globalSettings.pixelsPerBeat;
      traverseTime = beatsToTraverse * secondsPerBeat;
    }
    
    // Move packet
    const speed = 1 / Math.max(0.001, traverseTime);
    packet.t += dt * speed;
    
    // Check for arrival
    if (packet.t >= 1) {
      // Process arrival - pass the edge for proper node processing
      processVirtualArrival(channelScene, packet, toNode, edge, channelVolume);
      
      // Check if gate blocked the packet (gain set to negative)
      if (packet.payload.gain < 0) {
        packetsToDelete.push(packet.id);
        return;
      }
      
      // Get outgoing edges from destination
      const nextEdges: GraphEdge[] = [];
      edges.forEach((e) => {
        if (e.from === toNode.id) {
          nextEdges.push(e);
        }
      });
      
      if (nextEdges.length === 0) {
        // No outgoing edges, delete packet
        packetsToDelete.push(packet.id);
      } else {
        // Clone packet for additional edges
        for (let i = 1; i < nextEdges.length; i++) {
          const nextEdge = nextEdges[i];
          if (nextEdge) {
            const clone: Packet = {
              id: createPacketId(),
              edgeId: nextEdge.id,
              t: 0,
              payload: { ...packet.payload },
            };
            packetsToSpawn.push(clone);
          }
        }
        
        // Continue on first edge
        const firstEdge = nextEdges[0];
        if (firstEdge) {
          // Create new packet since we can't mutate readonly properties
          const continuedPacket: Packet = {
            id: packet.id,
            edgeId: firstEdge.id,
            t: 0,
            payload: packet.payload,
          };
          packets.set(packet.id, continuedPacket);
        } else {
          packetsToDelete.push(packet.id);
        }
      }
    }
  });
  
  // Delete dead packets
  packetsToDelete.forEach(id => packets.delete(id));
  
  // Add new packets
  packetsToSpawn.forEach(p => packets.set(p.id, p));
}

/**
 * Process packet arrival at a node in a virtual channel scene
 * Uses the same processNodeArrival as the main canvas for consistent behavior
 */
function processVirtualArrival(
  channelScene: ChannelSceneState,
  packet: Packet,
  node: GraphNode,
  edge: GraphEdge,
  channelVolume: number
): void {
  // Use the same processing as the main canvas
  const processedPayload = processNodeArrival(packet, node, edge);
  
  // Update packet payload with processed result
  packet.payload = processedPayload;
  
  // Handle gate - check if packet was blocked (gain set to -1 by processNodeArrival)
  if (node.type === 'gate' && processedPayload.gain < 0) {
    // Gate blocked - mark packet for deletion by setting gain to indicate blocked
    return;
  }
  
  // Handle speaker nodes - this triggers audio!
  if (node.type === 'speaker') {
    const props = node.props as { volume?: number; pan?: number; reverb?: number };
    const volume = (props.volume ?? 1) * channelVolume;
    const pan = props.pan ?? 0;
    const reverb = props.reverb ?? 0.3;
    
    // Apply speaker volume to processed payload
    const finalPayload = {
      ...processedPayload,
      gain: processedPayload.gain * volume,
    };
    
    audioEngine.playNote(finalPayload, { pan, reverb });
    
    // Flash the node visually
    node.flash = 1;
    return;
  }
  
  // Flash node to indicate processing
  node.flash = 1;
}
