// Crossover Module Tests
// Unit tests for genetic crossover (sexual reproduction) between packets

import { describe, it, expect, vi } from 'vitest';
import { performCrossover } from './crossover';
import type { AudioPayload, Frequency, MidiNote, CrossoverProps, WaveOrNoiseType } from '../types';

// Helper to create test payloads
function createTestPayload(overrides: Partial<AudioPayload> = {}): AudioPayload {
  return {
    freq: 440 as Frequency,
    midiNote: 69 as MidiNote,
    wave: 'sine' as WaveOrNoiseType,
    timbre: 0.5,
    cutoff: 10000 as Frequency,
    gain: 0.7,
    holdTime: 0.1,
    releaseTime: 0.2,
    ...overrides,
  };
}

// Default crossover props for testing
const defaultProps: CrossoverProps = {
  inheritance: 'random',
  pitchFrom: 'random',
  waveFrom: 'random',
  gainMode: 'average',
  timeout: 4,
};

// ============================================================================
// Pitch Inheritance Tests
// ============================================================================

describe('performCrossover - pitch inheritance', () => {
  const parentA = createTestPayload({ 
    freq: 440 as Frequency, 
    midiNote: 69 as MidiNote 
  });
  const parentB = createTestPayload({ 
    freq: 880 as Frequency, 
    midiNote: 81 as MidiNote 
  });

  it('should inherit pitch from parent A', () => {
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'a' };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.midiNote).toBe(69);
    expect(offspring.freq).toBe(440);
  });

  it('should inherit pitch from parent B', () => {
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'b' };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.midiNote).toBe(81);
    expect(offspring.freq).toBe(880);
  });

  it('should average pitch from both parents', () => {
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'average' };
    const offspring = performCrossover(parentA, parentB, props);
    // Average of 69 and 81 = 75
    expect(offspring.midiNote).toBe(75);
    // Frequency should be recalculated from averaged MIDI note
    expect(offspring.freq).toBeCloseTo(440 * Math.pow(2, (75 - 69) / 12), 1);
  });

  it('should randomly choose pitch (with mocked random)', () => {
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'random' };
    
    // Test with random < 0.5 (use B per implementation)
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    let offspring = performCrossover(parentA, parentB, props);
    expect(offspring.midiNote).toBe(81); // Uses B
    
    // Test with random >= 0.5 (keep A per implementation)
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    offspring = performCrossover(parentA, parentB, props);
    expect(offspring.midiNote).toBe(69); // Keeps A
    
    vi.restoreAllMocks();
  });
});

// ============================================================================
// Wave Inheritance Tests
// ============================================================================

describe('performCrossover - wave inheritance', () => {
  const parentA = createTestPayload({ wave: 'sine' as WaveOrNoiseType });
  const parentB = createTestPayload({ wave: 'sawtooth' as WaveOrNoiseType });

  it('should inherit wave from parent A', () => {
    const props: CrossoverProps = { ...defaultProps, waveFrom: 'a' };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.wave).toBe('sine');
  });

  it('should inherit wave from parent B', () => {
    const props: CrossoverProps = { ...defaultProps, waveFrom: 'b' };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.wave).toBe('sawtooth');
  });

  it('should randomly choose wave', () => {
    const props: CrossoverProps = { ...defaultProps, waveFrom: 'random' };
    
    // Test with random < 0.5 (use B per implementation)
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    let offspring = performCrossover(parentA, parentB, props);
    expect(offspring.wave).toBe('sawtooth'); // Uses B
    
    // Test with random >= 0.5 (keep A per implementation)
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    offspring = performCrossover(parentA, parentB, props);
    expect(offspring.wave).toBe('sine'); // Keeps A
    
    vi.restoreAllMocks();
  });
});

// ============================================================================
// Gain Mode Tests
// ============================================================================

describe('performCrossover - gain mode', () => {
  const parentA = createTestPayload({ gain: 0.4 });
  const parentB = createTestPayload({ gain: 0.8 });

  it('should average gain', () => {
    const props: CrossoverProps = { ...defaultProps, gainMode: 'average' };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.gain).toBeCloseTo(0.6, 5); // (0.4 + 0.8) / 2
  });

  it('should use max gain', () => {
    const props: CrossoverProps = { ...defaultProps, gainMode: 'max' };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.gain).toBe(0.8);
  });

  it('should use min gain', () => {
    const props: CrossoverProps = { ...defaultProps, gainMode: 'min' };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.gain).toBe(0.4);
  });

  it('should randomly choose gain', () => {
    const props: CrossoverProps = { ...defaultProps, gainMode: 'random' };
    
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    let offspring = performCrossover(parentA, parentB, props);
    expect(offspring.gain).toBe(0.4);
    
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    offspring = performCrossover(parentA, parentB, props);
    expect(offspring.gain).toBe(0.8);
    
    vi.restoreAllMocks();
  });
});

// ============================================================================
// Inheritance Mode Tests
// ============================================================================

describe('performCrossover - inheritance mode', () => {
  const parentA = createTestPayload({ 
    timbre: 0.2, 
    cutoff: 5000 as Frequency,
    holdTime: 0.1,
    releaseTime: 0.3
  });
  const parentB = createTestPayload({ 
    timbre: 0.8, 
    cutoff: 15000 as Frequency,
    holdTime: 0.5,
    releaseTime: 0.7
  });

  it('should use parent A properties with dominant_a', () => {
    const props: CrossoverProps = { 
      ...defaultProps, 
      inheritance: 'dominant_a',
      pitchFrom: 'a',
      waveFrom: 'a',
      gainMode: 'average'
    };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.timbre).toBe(0.2);
    expect(offspring.cutoff).toBe(5000);
    expect(offspring.holdTime).toBe(0.1);
    expect(offspring.releaseTime).toBe(0.3);
  });

  it('should use parent B properties with dominant_b', () => {
    const props: CrossoverProps = { 
      ...defaultProps, 
      inheritance: 'dominant_b',
      pitchFrom: 'a',
      waveFrom: 'a',
      gainMode: 'average'
    };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.timbre).toBe(0.8);
    expect(offspring.cutoff).toBe(15000);
    expect(offspring.holdTime).toBe(0.5);
    expect(offspring.releaseTime).toBe(0.7);
  });

  it('should blend properties with blend mode', () => {
    const props: CrossoverProps = { 
      ...defaultProps, 
      inheritance: 'blend',
      pitchFrom: 'a',
      waveFrom: 'a',
      gainMode: 'average'
    };
    const offspring = performCrossover(parentA, parentB, props);
    expect(offspring.timbre).toBe(0.5); // (0.2 + 0.8) / 2
    expect(offspring.cutoff).toBe(10000); // (5000 + 15000) / 2
    expect(offspring.holdTime).toBe(0.3); // (0.1 + 0.5) / 2
    expect(offspring.releaseTime).toBe(0.5); // (0.3 + 0.7) / 2
  });

  it('should randomly pick properties with random mode', () => {
    const props: CrossoverProps = { 
      ...defaultProps, 
      inheritance: 'random',
      pitchFrom: 'a',
      waveFrom: 'a',
      gainMode: 'average'
    };
    
    // All random < 0.5, pick A for all
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    let offspring = performCrossover(parentA, parentB, props);
    expect(offspring.timbre).toBe(0.2);
    expect(offspring.cutoff).toBe(5000);
    
    // All random >= 0.5, pick B for all
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    offspring = performCrossover(parentA, parentB, props);
    expect(offspring.timbre).toBe(0.8);
    expect(offspring.cutoff).toBe(15000);
    
    vi.restoreAllMocks();
  });
});

// ============================================================================
// Wave Layers Merging Tests
// ============================================================================

describe('performCrossover - wave layers', () => {
  it('should merge wave layers from both parents', () => {
    const parentA = createTestPayload({
      waves: [
        { wave: 'sine' as WaveOrNoiseType, attack: 0.01, decay: 0.1, gain: 1, ratio: 1 },
        { wave: 'square' as WaveOrNoiseType, attack: 0.02, decay: 0.2, gain: 0.5, ratio: 2 },
      ]
    });
    const parentB = createTestPayload({
      waves: [
        { wave: 'sawtooth' as WaveOrNoiseType, attack: 0.03, decay: 0.3, gain: 0.7, ratio: 3 },
        { wave: 'triangle' as WaveOrNoiseType, attack: 0.04, decay: 0.4, gain: 0.3, ratio: 4 },
      ]
    });
    
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'a', waveFrom: 'a' };
    const offspring = performCrossover(parentA, parentB, props);
    
    // Should have merged waves (alternating from each parent)
    expect(offspring.waves).toBeDefined();
    expect(offspring.waves!.length).toBeGreaterThan(0);
  });

  it('should handle parent with no wave layers', () => {
    const parentA = createTestPayload({ waves: [] });
    const parentB = createTestPayload({
      waves: [
        { wave: 'sawtooth' as WaveOrNoiseType, attack: 0.03, decay: 0.3, gain: 0.7, ratio: 3 },
      ]
    });
    
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'a', waveFrom: 'a' };
    const offspring = performCrossover(parentA, parentB, props);
    
    expect(offspring.waves).toBeDefined();
    expect(offspring.waves!.length).toBe(1);
  });

  it('should handle both parents with no wave layers', () => {
    const parentA = createTestPayload();
    const parentB = createTestPayload();
    
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'a', waveFrom: 'a' };
    const offspring = performCrossover(parentA, parentB, props);
    
    // Should not have waves property or should be empty
    expect(offspring.waves === undefined || offspring.waves?.length === 0).toBe(true);
  });

  it('should handle unequal number of wave layers', () => {
    const parentA = createTestPayload({
      waves: [
        { wave: 'sine' as WaveOrNoiseType, attack: 0.01, decay: 0.1, gain: 1, ratio: 1 },
      ]
    });
    const parentB = createTestPayload({
      waves: [
        { wave: 'sawtooth' as WaveOrNoiseType, attack: 0.03, decay: 0.3, gain: 0.7, ratio: 3 },
        { wave: 'triangle' as WaveOrNoiseType, attack: 0.04, decay: 0.4, gain: 0.3, ratio: 4 },
        { wave: 'square' as WaveOrNoiseType, attack: 0.05, decay: 0.5, gain: 0.2, ratio: 5 },
      ]
    });
    
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'a', waveFrom: 'a' };
    const offspring = performCrossover(parentA, parentB, props);
    
    expect(offspring.waves).toBeDefined();
    // Should include layers from both, handling unequal lengths
    expect(offspring.waves!.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('performCrossover - edge cases', () => {
  it('should handle identical parents', () => {
    const parent = createTestPayload();
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'average', gainMode: 'average' };
    const offspring = performCrossover(parent, parent, props);
    
    // Should be essentially the same
    expect(offspring.midiNote).toBe(parent.midiNote);
    expect(offspring.gain).toBe(parent.gain);
    expect(offspring.wave).toBe(parent.wave);
  });

  it('should handle extreme gain values', () => {
    const parentA = createTestPayload({ gain: 0 });
    const parentB = createTestPayload({ gain: 1 });
    
    const propsAvg: CrossoverProps = { ...defaultProps, gainMode: 'average' };
    expect(performCrossover(parentA, parentB, propsAvg).gain).toBe(0.5);
    
    const propsMax: CrossoverProps = { ...defaultProps, gainMode: 'max' };
    expect(performCrossover(parentA, parentB, propsMax).gain).toBe(1);
    
    const propsMin: CrossoverProps = { ...defaultProps, gainMode: 'min' };
    expect(performCrossover(parentA, parentB, propsMin).gain).toBe(0);
  });

  it('should handle extreme pitch values', () => {
    const parentA = createTestPayload({ midiNote: 0 as MidiNote, freq: 8.18 as Frequency });
    const parentB = createTestPayload({ midiNote: 127 as MidiNote, freq: 12543 as Frequency });
    
    const props: CrossoverProps = { ...defaultProps, pitchFrom: 'average' };
    const offspring = performCrossover(parentA, parentB, props);
    
    // Average should be ~63-64
    expect(offspring.midiNote).toBe(64); // Round((0 + 127) / 2)
  });

  it('should not mutate parent payloads', () => {
    const parentA = createTestPayload({ gain: 0.5 });
    const parentB = createTestPayload({ gain: 0.8 });
    const originalAGain = parentA.gain;
    const originalBGain = parentB.gain;
    
    performCrossover(parentA, parentB, defaultProps);
    
    expect(parentA.gain).toBe(originalAGain);
    expect(parentB.gain).toBe(originalBGain);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('performCrossover - integration', () => {
  it('should produce valid offspring with all settings combined', () => {
    const parentA = createTestPayload({
      freq: 440 as Frequency,
      midiNote: 69 as MidiNote,
      wave: 'sine' as WaveOrNoiseType,
      gain: 0.5,
      timbre: 0.3,
      cutoff: 8000 as Frequency,
      holdTime: 0.1,
      releaseTime: 0.2,
    });
    
    const parentB = createTestPayload({
      freq: 880 as Frequency,
      midiNote: 81 as MidiNote,
      wave: 'sawtooth' as WaveOrNoiseType,
      gain: 0.9,
      timbre: 0.7,
      cutoff: 16000 as Frequency,
      holdTime: 0.3,
      releaseTime: 0.4,
    });
    
    const props: CrossoverProps = {
      pitchFrom: 'average',
      waveFrom: 'b',
      gainMode: 'max',
      inheritance: 'blend',
      timeout: 4,
    };
    
    const offspring = performCrossover(parentA, parentB, props);
    
    // Pitch: averaged
    expect(offspring.midiNote).toBe(75);
    
    // Wave: from B
    expect(offspring.wave).toBe('sawtooth');
    
    // Gain: max
    expect(offspring.gain).toBe(0.9);
    
    // Other props: blended
    expect(offspring.timbre).toBe(0.5);
    expect(offspring.cutoff).toBe(12000);
    expect(offspring.holdTime).toBeCloseTo(0.2, 5);
    expect(offspring.releaseTime).toBeCloseTo(0.3, 5);
  });
});
