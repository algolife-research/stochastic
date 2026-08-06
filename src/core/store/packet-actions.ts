// Packet Actions
// Operations for creating, updating, and deleting packets

import type { GraphStore, ImmerSet } from './types';
import type { NodeId, PacketId, Packet, Frequency, MidiNote } from '../types';
import { createPacketId } from '../types';
import { MAX_PACKETS, LEGACY_SCALE_OFFSET, midiToFreq } from '../constants';

export const createPacketActions = (
  set: ImmerSet,
  get: () => GraphStore
) => ({
  spawnPacket: (sourceNodeId: NodeId): void => {
    const state = get();
    if (state.packets.size >= MAX_PACKETS) return;
    
    const sourceNode = state.nodes.get(sourceNodeId);
    if (!sourceNode || sourceNode.type !== 'source') return;
    
    const props = sourceNode.props as { 
      noteIndex: number; 
      midiNote: MidiNote; 
      intensity: number 
    };
    
    // Determine MIDI note
    let midiNote: MidiNote;
    if (props.noteIndex >= 0) {
      midiNote = (LEGACY_SCALE_OFFSET + Math.min(36, props.noteIndex)) as MidiNote;
    } else if (props.noteIndex === -1) {
      midiNote = (36 + Math.floor(Math.random() * 49)) as MidiNote;
    } else {
      midiNote = props.midiNote ?? (60 as MidiNote);
    }
    
    const freq = midiToFreq(midiNote);
    const intensity = props.intensity ?? 0.5;
    
    // Spawn packet for each outgoing edge
    const outgoingEdges = state.getOutgoingEdges(sourceNodeId);
    
    set(stateToUpdate => {
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
        stateToUpdate.packets.set(packetId, packet);
      });
      
      // Flash source node
      const node = stateToUpdate.nodes.get(sourceNodeId);
      if (node) {
        node.flash = 1.0;
      }
    });
  },
  
  addPacket: (packet: Packet): void => {
    set(state => {
      state.packets.set(packet.id, packet);
    });
  },
  
  updatePacket: (id: PacketId, updates: Partial<Packet>): void => {
    set(state => {
      const packet = state.packets.get(id);
      if (packet) {
        Object.assign(packet, updates);
      }
    });
  },

  // Hot path: the tick loop moves every packet every frame. One store update
  // for the whole frame instead of one per packet.
  batchUpdatePacketPositions: (entries: Array<[PacketId, number]>): void => {
    if (entries.length === 0) return;
    set(state => {
      for (const [id, t] of entries) {
        const packet = state.packets.get(id);
        if (packet) {
          packet.t = t;
        }
      }
    });
  },
  
  deletePacket: (id: PacketId): void => {
    set(state => {
      state.packets.delete(id);
    });
  },
  
  clearPackets: (): void => {
    set(state => {
      state.packets.clear();
    });
  },
});
