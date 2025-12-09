// Constants Module Tests
// Unit tests for musical constants and utility functions

import { describe, it, expect } from 'vitest';
import {
  midiToFreq,
  freqToMidi,
  midiToNoteName,
  clampMidi,
  dist,
  getDefaultProps,
  getEffectiveBpm,
  getEffectiveRoot,
  getEffectiveScale,
  calculateArrangementDuration,
  createDefaultScene,
  SCALES,
  NOTE_LABELS,
  NODE_COLORS,
  NODE_ICONS,
  MIDI_A4,
  MIDI_A4_FREQ,
  MIDI_MIN,
  MIDI_MAX,
  DEFAULT_SPEED,
  MAX_PACKETS,
  SCENE_COLORS,
} from './constants';
import type { Scene, SceneId, ArrangementSlot } from './types';

// ============================================================================
// MIDI Conversion Tests
// ============================================================================

describe('midiToFreq', () => {
  it('should return A4 frequency (440Hz) for MIDI note 69', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 2);
  });

  it('should double frequency per octave', () => {
    const a4 = midiToFreq(69);
    const a5 = midiToFreq(81); // A5 = 69 + 12
    expect(a5).toBeCloseTo(a4 * 2, 2);
  });

  it('should halve frequency per octave down', () => {
    const a4 = midiToFreq(69);
    const a3 = midiToFreq(57); // A3 = 69 - 12
    expect(a3).toBeCloseTo(a4 / 2, 2);
  });

  it('should return middle C frequency for MIDI note 60', () => {
    // C4 (middle C) ≈ 261.63 Hz
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
  });

  it('should handle edge cases', () => {
    // MIDI note 0 (very low)
    expect(midiToFreq(0)).toBeCloseTo(8.18, 1);
    // MIDI note 127 (very high)
    expect(midiToFreq(127)).toBeCloseTo(12543.85, 0);
  });
});

describe('freqToMidi', () => {
  it('should return 69 for 440Hz', () => {
    expect(freqToMidi(440 as ReturnType<typeof midiToFreq>)).toBe(69);
  });

  it('should return 60 for middle C frequency', () => {
    expect(freqToMidi(261.63 as ReturnType<typeof midiToFreq>)).toBe(60);
  });

  it('should round to nearest MIDI note', () => {
    // Slightly sharp A4
    expect(freqToMidi(445 as ReturnType<typeof midiToFreq>)).toBe(69);
    // Slightly flat A4
    expect(freqToMidi(435 as ReturnType<typeof midiToFreq>)).toBe(69);
  });

  it('should be inverse of midiToFreq', () => {
    for (const midi of [36, 48, 60, 72, 84]) {
      const freq = midiToFreq(midi);
      expect(freqToMidi(freq)).toBe(midi);
    }
  });
});

describe('midiToNoteName', () => {
  it('should return correct note names', () => {
    expect(midiToNoteName(60)).toBe('C4');  // Middle C
    expect(midiToNoteName(69)).toBe('A4');  // A440
    expect(midiToNoteName(72)).toBe('C5');
  });

  it('should handle sharps', () => {
    expect(midiToNoteName(61)).toBe('C#4');
    expect(midiToNoteName(63)).toBe('D#4');
    expect(midiToNoteName(70)).toBe('A#4');
  });

  it('should handle low octaves', () => {
    expect(midiToNoteName(0)).toBe('C-1');
    expect(midiToNoteName(12)).toBe('C0');
    expect(midiToNoteName(24)).toBe('C1');
  });

  it('should handle high octaves', () => {
    expect(midiToNoteName(120)).toBe('C9');
    expect(midiToNoteName(127)).toBe('G9');
  });
});

describe('clampMidi', () => {
  it('should return same value when in range', () => {
    expect(clampMidi(60)).toBe(60);
    expect(clampMidi(0)).toBe(0);
    expect(clampMidi(127)).toBe(127);
  });

  it('should clamp values below 0', () => {
    expect(clampMidi(-1)).toBe(0);
    expect(clampMidi(-100)).toBe(0);
  });

  it('should clamp values above 127', () => {
    expect(clampMidi(128)).toBe(127);
    expect(clampMidi(200)).toBe(127);
  });

  it('should round floating point values', () => {
    expect(clampMidi(60.4)).toBe(60);
    expect(clampMidi(60.6)).toBe(61);
    expect(clampMidi(60.5)).toBe(61); // Round to nearest
  });
});

// ============================================================================
// Geometry Tests
// ============================================================================

describe('dist', () => {
  it('should return 0 for same point', () => {
    expect(dist(0, 0, 0, 0)).toBe(0);
    expect(dist(100, 200, 100, 200)).toBe(0);
  });

  it('should calculate horizontal distance', () => {
    expect(dist(0, 0, 10, 0)).toBe(10);
    expect(dist(0, 5, 10, 5)).toBe(10);
  });

  it('should calculate vertical distance', () => {
    expect(dist(0, 0, 0, 10)).toBe(10);
    expect(dist(5, 0, 5, 10)).toBe(10);
  });

  it('should calculate diagonal distance (3-4-5 triangle)', () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
    expect(dist(0, 0, 6, 8)).toBe(10);
  });

  it('should handle negative coordinates', () => {
    expect(dist(-5, -5, 0, 0)).toBeCloseTo(7.071, 2);
    expect(dist(-3, 0, 0, -4)).toBe(5);
  });
});

// ============================================================================
// Scale Constants Tests
// ============================================================================

describe('SCALES', () => {
  it('should have chromatic scale with all 12 semitones', () => {
    expect(SCALES.chromatic).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('should have major scale with correct intervals', () => {
    expect(SCALES.major).toEqual([0, 2, 4, 5, 7, 9, 11]); // W-W-H-W-W-W-H
  });

  it('should have minor scale with correct intervals', () => {
    expect(SCALES.minor).toEqual([0, 2, 3, 5, 7, 8, 10]); // W-H-W-W-H-W-W
  });

  it('should have pentatonic scales with 5 notes', () => {
    expect(SCALES.pentatonic).toHaveLength(5);
    expect(SCALES.minorPentatonic).toHaveLength(5);
  });

  it('should have blues scale with blue note', () => {
    expect(SCALES.blues).toContain(6); // b5 blue note
    expect(SCALES.blues).toHaveLength(6);
  });

  it('should have whole tone scale with equal intervals', () => {
    expect(SCALES.wholeTone).toEqual([0, 2, 4, 6, 8, 10]);
  });
});

describe('NOTE_LABELS', () => {
  it('should have 12 note labels', () => {
    expect(NOTE_LABELS).toHaveLength(12);
  });

  it('should start with C', () => {
    expect(NOTE_LABELS[0]).toBe('C');
  });

  it('should include all notes', () => {
    expect(NOTE_LABELS).toContain('C');
    expect(NOTE_LABELS).toContain('D');
    expect(NOTE_LABELS).toContain('E');
    expect(NOTE_LABELS).toContain('F');
    expect(NOTE_LABELS).toContain('G');
    expect(NOTE_LABELS).toContain('A');
    expect(NOTE_LABELS).toContain('B');
    expect(NOTE_LABELS).toContain('C#');
  });
});

// ============================================================================
// Node Constants Tests
// ============================================================================

describe('NODE_COLORS', () => {
  it('should have color for all node types', () => {
    const nodeTypes = [
      'source', 'speaker', 'pitch', 'oscillator', 'filter',
      'gate', 'delay', 'gain', 'modulator', 'tunnel',
      'teleporter', 'quantizer', 'lfo', 'splitter',
      'midi_out', 'midi_cc', 'scene_trigger', 'mutator', 'crossover'
    ];
    nodeTypes.forEach(type => {
      expect(NODE_COLORS[type as keyof typeof NODE_COLORS]).toBeDefined();
      expect(NODE_COLORS[type as keyof typeof NODE_COLORS]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('NODE_ICONS', () => {
  it('should have icon for all node types', () => {
    const nodeTypes = [
      'source', 'speaker', 'pitch', 'oscillator', 'filter',
      'gate', 'delay', 'gain', 'modulator', 'tunnel',
      'teleporter', 'quantizer', 'lfo', 'splitter',
      'midi_out', 'midi_cc', 'scene_trigger', 'mutator', 'crossover'
    ];
    nodeTypes.forEach(type => {
      expect(NODE_ICONS[type as keyof typeof NODE_ICONS]).toBeDefined();
      expect(typeof NODE_ICONS[type as keyof typeof NODE_ICONS]).toBe('string');
    });
  });
});

// ============================================================================
// Default Props Tests
// ============================================================================

describe('getDefaultProps', () => {
  it('should return source props with interval', () => {
    const props = getDefaultProps('source');
    expect(props.interval).toBeDefined();
    expect(typeof props.interval).toBe('number');
  });

  it('should return speaker props with volume', () => {
    const props = getDefaultProps('speaker');
    expect(props.volume).toBeDefined();
    expect(props.volume).toBe(1.0);
  });

  it('should return filter props with cutoff', () => {
    const props = getDefaultProps('filter');
    expect(props.cutoff).toBeDefined();
    expect(props.cutoff).toBe(20000);
  });

  it('should return copies (not references)', () => {
    const props1 = getDefaultProps('source');
    const props2 = getDefaultProps('source');
    expect(props1).not.toBe(props2);
    // Modifying one should not affect the other
    expect(props1).toEqual(props2);
  });

  it('should return mutator props with probability', () => {
    const props = getDefaultProps('mutator');
    expect(props.probability).toBeDefined();
    expect(props.mode).toBe('drift');
  });

  it('should return crossover props with inheritance mode', () => {
    const props = getDefaultProps('crossover');
    expect(props.inheritance).toBe('random');
    expect(props.pitchFrom).toBe('random');
  });
});

// ============================================================================
// Scene Utility Tests
// ============================================================================

describe('getEffectiveBpm', () => {
  it('should return master BPM when scene is null', () => {
    expect(getEffectiveBpm(null, 120)).toBe(120);
  });

  it('should return master BPM when scene has no local BPM', () => {
    const scene = createDefaultScene('test', 'Test');
    expect(getEffectiveBpm(scene, 120)).toBe(120);
  });

  it('should return scene local BPM when defined', () => {
    const scene = createDefaultScene('test', 'Test');
    scene.localBpm = 90;
    expect(getEffectiveBpm(scene, 120)).toBe(90);
  });
});

describe('getEffectiveRoot', () => {
  it('should return master root when scene is null', () => {
    expect(getEffectiveRoot(null, 0)).toBe(0);
  });

  it('should return scene local root when defined', () => {
    const scene = createDefaultScene('test', 'Test');
    scene.localRoot = 5; // F
    expect(getEffectiveRoot(scene, 0)).toBe(5);
  });
});

describe('getEffectiveScale', () => {
  it('should return master scale when scene is null', () => {
    expect(getEffectiveScale(null, 'major')).toBe('major');
  });

  it('should return scene local scale when defined', () => {
    const scene = createDefaultScene('test', 'Test');
    scene.localScale = 'dorian';
    expect(getEffectiveScale(scene, 'major')).toBe('dorian');
  });
});

describe('createDefaultScene', () => {
  it('should create scene with correct id and name', () => {
    const scene = createDefaultScene('my-id', 'My Scene');
    expect(scene.id).toBe('my-id');
    expect(scene.name).toBe('My Scene');
  });

  it('should set color based on index', () => {
    const scene0 = createDefaultScene('s0', 'S0', 0);
    const scene1 = createDefaultScene('s1', 'S1', 1);
    expect(scene0.color).toBe(SCENE_COLORS[0]);
    expect(scene1.color).toBe(SCENE_COLORS[1]);
  });

  it('should wrap color index', () => {
    const sceneWrap = createDefaultScene('sw', 'SW', SCENE_COLORS.length);
    expect(sceneWrap.color).toBe(SCENE_COLORS[0]);
  });

  it('should initialize with empty arrays', () => {
    const scene = createDefaultScene('test', 'Test');
    expect(scene.nodes).toEqual([]);
    expect(scene.edges).toEqual([]);
    expect(scene.annotations).toEqual([]);
    expect(scene.regions).toEqual([]);
  });

  it('should initialize with default values', () => {
    const scene = createDefaultScene('test', 'Test');
    expect(scene.durationBeats).toBe(16);
    expect(scene.loopCount).toBe(1);
    expect(scene.localBpm).toBeNull();
    expect(scene.localRoot).toBeNull();
    expect(scene.localScale).toBeNull();
  });
});

describe('calculateArrangementDuration', () => {
  const createTestScene = (id: string, duration: number, loops: number = 1): Scene => {
    const scene = createDefaultScene(id, id);
    scene.durationBeats = duration;
    scene.loopCount = loops;
    return scene;
  };

  const createSlot = (sceneId: string, startBeat: number, channel: number = 0, instanceLoopCount?: number): ArrangementSlot => ({
    id: crypto.randomUUID(),
    sceneId: sceneId as SceneId,
    startBeat,
    channel,
    instanceLoopCount,
  });

  it('should return 0 for empty arrangement', () => {
    expect(calculateArrangementDuration([], new Map())).toBe(0);
  });

  it('should calculate duration for single slot', () => {
    const scene = createTestScene('s1', 16, 1);
    const scenes = new Map([['s1', scene]]);
    const arrangement: ArrangementSlot[] = [createSlot('s1', 0)];
    expect(calculateArrangementDuration(arrangement, scenes)).toBe(16);
  });

  it('should respect slot start beat offset', () => {
    const scene = createTestScene('s1', 16, 1);
    const scenes = new Map([['s1', scene]]);
    const arrangement: ArrangementSlot[] = [createSlot('s1', 8)];
    expect(calculateArrangementDuration(arrangement, scenes)).toBe(24); // 8 + 16
  });

  it('should calculate duration with loop count', () => {
    const scene = createTestScene('s1', 16, 2);
    const scenes = new Map([['s1', scene]]);
    const arrangement: ArrangementSlot[] = [createSlot('s1', 0)];
    expect(calculateArrangementDuration(arrangement, scenes)).toBe(32); // 16 * 2
  });

  it('should use instance loop count override', () => {
    const scene = createTestScene('s1', 16, 2);
    const scenes = new Map([['s1', scene]]);
    const arrangement: ArrangementSlot[] = [createSlot('s1', 0, 0, 4)];
    expect(calculateArrangementDuration(arrangement, scenes)).toBe(64); // 16 * 4
  });

  it('should return max end time across multiple slots', () => {
    const scene1 = createTestScene('s1', 16, 1);
    const scene2 = createTestScene('s2', 8, 1);
    const scenes = new Map([['s1', scene1], ['s2', scene2]]);
    const arrangement: ArrangementSlot[] = [
      createSlot('s1', 0),
      createSlot('s2', 20),
    ];
    expect(calculateArrangementDuration(arrangement, scenes)).toBe(28); // 20 + 8 > 16
  });

  it('should skip slots with missing scenes', () => {
    const scene1 = createTestScene('s1', 16, 1);
    const scenes = new Map([['s1', scene1]]);
    const arrangement: ArrangementSlot[] = [
      createSlot('s1', 0),
      createSlot('missing', 100),
    ];
    expect(calculateArrangementDuration(arrangement, scenes)).toBe(16);
  });
});

// ============================================================================
// Core Constants Values Tests
// ============================================================================

describe('Core Constants', () => {
  it('should have correct MIDI constants', () => {
    expect(MIDI_A4).toBe(69);
    expect(MIDI_A4_FREQ).toBe(440);
    expect(MIDI_MIN).toBe(0);
    expect(MIDI_MAX).toBe(127);
  });

  it('should have reasonable default speed', () => {
    expect(DEFAULT_SPEED).toBeGreaterThanOrEqual(60);
    expect(DEFAULT_SPEED).toBeLessThanOrEqual(200);
  });

  it('should have reasonable max packets limit', () => {
    expect(MAX_PACKETS).toBeGreaterThanOrEqual(100);
    expect(MAX_PACKETS).toBeLessThanOrEqual(10000);
  });

  it('should have multiple scene colors', () => {
    expect(SCENE_COLORS.length).toBeGreaterThanOrEqual(5);
    SCENE_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
