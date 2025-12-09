// Crossover Module
// Handles genetic crossover (sexual reproduction) between packets

import type { AudioPayload, Frequency, CrossoverProps, PacketId } from '../types';
import { midiToFreq } from '../constants';
import { getGraphStore } from '../store';

// ============================================================================
// ENTANGLEMENT SYNC
// ============================================================================

/**
 * Sync payload across all entangled packets (except those that have arrived)
 * This creates the quantum-like behavior where split packets share effects
 */
export function syncEntangledPayloads(
  groupId: string, 
  newPayload: AudioPayload, 
  store: ReturnType<typeof getGraphStore>,
  arrivingPacketIds: Set<PacketId>
): void {
  store.packets.forEach((packet) => {
    if (packet.entanglementGroupId === groupId && !arrivingPacketIds.has(packet.id)) {
      // Only sync to packets that are still traveling (not arriving this tick)
      store.updatePacket(packet.id, { payload: { ...newPayload } });
    }
  });
}

// ============================================================================
// CROSSOVER (SEXUAL REPRODUCTION)
// ============================================================================

/**
 * Perform genetic crossover between two parent packets
 * Creates an offspring with inherited properties from both parents
 */
export function performCrossover(parentA: AudioPayload, parentB: AudioPayload, props: CrossoverProps): AudioPayload {
  const offspring: AudioPayload = { ...parentA }; // Start with parent A as base
  
  // Determine pitch inheritance
  switch (props.pitchFrom) {
    case 'a':
      // Already have A's pitch
      break;
    case 'b':
      offspring.midiNote = parentB.midiNote;
      offspring.freq = parentB.freq;
      break;
    case 'average':
      const avgMidi = Math.round((parentA.midiNote + parentB.midiNote) / 2) as typeof parentA.midiNote;
      offspring.midiNote = avgMidi;
      offspring.freq = midiToFreq(avgMidi);
      break;
    case 'random':
      if (Math.random() < 0.5) {
        offspring.midiNote = parentB.midiNote;
        offspring.freq = parentB.freq;
      }
      break;
  }
  
  // Determine wave inheritance
  switch (props.waveFrom) {
    case 'a':
      // Already have A's wave
      break;
    case 'b':
      offspring.wave = parentB.wave;
      break;
    case 'random':
      if (Math.random() < 0.5) {
        offspring.wave = parentB.wave;
      }
      break;
  }
  
  // Determine gain combination
  switch (props.gainMode) {
    case 'average':
      offspring.gain = (parentA.gain + parentB.gain) / 2;
      break;
    case 'max':
      offspring.gain = Math.max(parentA.gain, parentB.gain);
      break;
    case 'min':
      offspring.gain = Math.min(parentA.gain, parentB.gain);
      break;
    case 'random':
      offspring.gain = Math.random() < 0.5 ? parentA.gain : parentB.gain;
      break;
  }
  
  // Handle inheritance mode for other properties
  switch (props.inheritance) {
    case 'random':
      // Randomly pick each property from either parent
      offspring.timbre = Math.random() < 0.5 ? parentA.timbre : parentB.timbre;
      offspring.cutoff = Math.random() < 0.5 ? parentA.cutoff : parentB.cutoff;
      offspring.holdTime = Math.random() < 0.5 ? parentA.holdTime : parentB.holdTime;
      offspring.releaseTime = Math.random() < 0.5 ? parentA.releaseTime : parentB.releaseTime;
      break;
    case 'dominant_a':
      // Keep A's properties (already the base)
      break;
    case 'dominant_b':
      // Use B's properties
      offspring.timbre = parentB.timbre;
      offspring.cutoff = parentB.cutoff;
      offspring.holdTime = parentB.holdTime;
      offspring.releaseTime = parentB.releaseTime;
      break;
    case 'blend':
      // Average/blend numeric properties
      offspring.timbre = (parentA.timbre + parentB.timbre) / 2;
      offspring.cutoff = ((parentA.cutoff + parentB.cutoff) / 2) as Frequency;
      offspring.holdTime = (parentA.holdTime + parentB.holdTime) / 2;
      offspring.releaseTime = (parentA.releaseTime + parentB.releaseTime) / 2;
      break;
  }
  
  // Merge wave layers from both parents (if they exist)
  const wavesA = parentA.waves ?? [];
  const wavesB = parentB.waves ?? [];
  if (wavesA.length > 0 || wavesB.length > 0) {
    // Take alternating layers from each parent, filtering out undefined
    const mergedWaves = [];
    const maxLen = Math.max(wavesA.length, wavesB.length);
    for (let i = 0; i < maxLen; i++) {
      if (i % 2 === 0 && wavesA[i]) {
        mergedWaves.push(wavesA[i]);
      } else if (wavesB[i]) {
        mergedWaves.push(wavesB[i]);
      } else if (wavesA[i]) {
        mergedWaves.push(wavesA[i]);
      }
    }
    // Filter to ensure no undefined values
    offspring.waves = mergedWaves.filter((w): w is NonNullable<typeof w> => w !== undefined);
  }
  
  return offspring;
}
