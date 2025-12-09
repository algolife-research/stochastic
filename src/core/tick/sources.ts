// Source Emission Module
// Handles source node timing and packet spawning

import { getGraphStore } from '../store';
import type { Packet, NodeId, MidiNote, Frequency } from '../types';
import { createPacketId } from '../types';
import { midiToFreq, clampMidi, LEGACY_SCALE_OFFSET, MAX_PACKETS, EDGE_SPAWN_COOLDOWN_MS } from '../constants';

// Track edge spawn times for source emissions
const sourceEdgeSpawnTimes = new Map<string, number>();

function canSpawnOnEdgeFromSource(edgeId: string, now: number): boolean {
  const lastSpawn = sourceEdgeSpawnTimes.get(edgeId);
  if (!lastSpawn) return true;
  return now - lastSpawn >= EDGE_SPAWN_COOLDOWN_MS;
}

function recordSourceEdgeSpawn(edgeId: string, now: number): void {
  sourceEdgeSpawnTimes.set(edgeId, now);
}

// ============================================================================
// SOURCE EMISSION
// ============================================================================

/**
 * Update source nodes and emit packets based on their intervals
 */
export function updateSources(now: number): void {
  const store = getGraphStore();
  const { masterSpeed } = store;
  const msPerBeat = (60 / masterSpeed) * 1000;
  
  store.nodes.forEach((node) => {
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
      // Spawn packets
      spawnPacketFromSource(node.id, props);
      
      // Update last trigger time
      store.updateNode(node.id, { lastTrigger: now });
    }
  });
}

/**
 * Spawn a packet from a source node
 */
export function spawnPacketFromSource(
  sourceNodeId: NodeId, 
  props: { noteIndex: number; midiNote: MidiNote; intensity: number }
): void {
  const store = getGraphStore();
  const now = performance.now();
  if (store.packets.size >= MAX_PACKETS) return;
  
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
  
  // Get outgoing edges
  const outgoingEdges = store.getOutgoingEdges(sourceNodeId);
  
  // Create packets for each outgoing edge
  outgoingEdges.forEach(edge => {
    // Anti-explosion check: edge cooldown
    if (!canSpawnOnEdgeFromSource(edge.id, now)) return;
    if (store.packets.size >= MAX_PACKETS) return;
    
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
      // Initialize anti-explosion metadata for new packets
      hopCount: 0,
      visitedEdges: [edge.id],
      birthTime: now,
    };
    
    // Add packet to store
    store.addPacket(packet);
    recordSourceEdgeSpawn(edge.id, now);
  });
  
  // Flash node
  store.flashNode(sourceNodeId);
}
