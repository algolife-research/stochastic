// Utils Module Tests
// Unit tests for core utility functions

import { describe, it, expect } from 'vitest';
import {
  getEffectiveMusicalContext,
  nodeMapToArray,
  nodeArrayToMap,
  msToBeats,
  beatsToMs,
  secondsPerBeat,
  msPerBeat,
  shortId,
  clamp,
  lerp,
  mapRange,
  deepClone,
  deepEqual,
} from './utils';
import type { LocalKeyConfig, MusicalContext, ScenePlaybackState } from './types';

// ============================================================================
// getEffectiveMusicalContext Tests
// ============================================================================

describe('getEffectiveMusicalContext', () => {
  const defaultGlobalContext = {
    scenePlayback: {
      effectiveRoot: 2, // D
      effectiveScale: 'dorian' as const,
    } as Pick<ScenePlaybackState, 'effectiveRoot' | 'effectiveScale'>,
    musicalContext: {
      root: 0, // C
      scaleName: 'major' as const,
    } as MusicalContext,
  };

  describe('global context usage', () => {
    it('should use scene playback values when no local config', () => {
      const result = getEffectiveMusicalContext(null, defaultGlobalContext);
      expect(result.root).toBe(2);
      expect(result.scaleName).toBe('dorian');
    });

    it('should use scene playback values when local config uses global', () => {
      const localConfig: LocalKeyConfig = {
        useGlobalKey: true,
        root: 5,
        scale: 'minor',
      };
      const result = getEffectiveMusicalContext(localConfig, defaultGlobalContext);
      expect(result.root).toBe(2);
      expect(result.scaleName).toBe('dorian');
    });

    it('should use musical context when scene playback values are null', () => {
      const contextWithNullScene = {
        scenePlayback: {
          effectiveRoot: null,
          effectiveScale: null,
        } as unknown as Pick<ScenePlaybackState, 'effectiveRoot' | 'effectiveScale'>,
        musicalContext: {
          root: 0,
          scaleName: 'major' as const,
        } as MusicalContext,
      };
      const result = getEffectiveMusicalContext(null, contextWithNullScene);
      expect(result.root).toBe(0);
      expect(result.scaleName).toBe('major');
    });
  });

  describe('local config usage', () => {
    it('should use local config when useGlobalKey is false', () => {
      const localConfig: LocalKeyConfig = {
        useGlobalKey: false,
        root: 7, // G
        scale: 'pentatonic',
      };
      const result = getEffectiveMusicalContext(localConfig, defaultGlobalContext);
      expect(result.root).toBe(7);
      expect(result.scaleName).toBe('pentatonic');
    });

    it('should return correct scale intervals for local scale', () => {
      const localConfig: LocalKeyConfig = {
        useGlobalKey: false,
        root: 0,
        scale: 'blues',
      };
      const result = getEffectiveMusicalContext(localConfig, defaultGlobalContext);
      expect(result.scale).toEqual([0, 3, 5, 6, 7, 10]); // Blues scale intervals
    });
  });
});

// ============================================================================
// Collection Utilities Tests
// ============================================================================

describe('nodeMapToArray', () => {
  it('should convert empty map to empty array', () => {
    const map = new Map<string, { id: string; value: number }>();
    expect(nodeMapToArray(map)).toEqual([]);
  });

  it('should convert map values to array', () => {
    const map = new Map([
      ['a', { id: 'a', value: 1 }],
      ['b', { id: 'b', value: 2 }],
      ['c', { id: 'c', value: 3 }],
    ]);
    const result = nodeMapToArray(map);
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ id: 'a', value: 1 });
    expect(result).toContainEqual({ id: 'b', value: 2 });
    expect(result).toContainEqual({ id: 'c', value: 3 });
  });
});

describe('nodeArrayToMap', () => {
  it('should convert empty array to empty map', () => {
    const result = nodeArrayToMap([]);
    expect(result.size).toBe(0);
  });

  it('should convert array to map keyed by id', () => {
    const array = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
    ];
    const result = nodeArrayToMap(array);
    expect(result.size).toBe(3);
    expect(result.get('a')).toEqual({ id: 'a', value: 1 });
    expect(result.get('b')).toEqual({ id: 'b', value: 2 });
    expect(result.get('c')).toEqual({ id: 'c', value: 3 });
  });

  it('should handle duplicate ids (last wins)', () => {
    const array = [
      { id: 'a', value: 1 },
      { id: 'a', value: 2 },
    ];
    const result = nodeArrayToMap(array);
    expect(result.size).toBe(1);
    expect(result.get('a')).toEqual({ id: 'a', value: 2 });
  });
});

// ============================================================================
// Timing Utilities Tests
// ============================================================================

describe('msToBeats', () => {
  it('should convert 0ms to 0 beats', () => {
    expect(msToBeats(0, 120)).toBe(0);
  });

  it('should convert correctly at 60 BPM (1 beat per second)', () => {
    expect(msToBeats(1000, 60)).toBe(1);
    expect(msToBeats(2000, 60)).toBe(2);
    expect(msToBeats(500, 60)).toBe(0.5);
  });

  it('should convert correctly at 120 BPM (2 beats per second)', () => {
    expect(msToBeats(1000, 120)).toBe(2);
    expect(msToBeats(500, 120)).toBe(1);
    expect(msToBeats(250, 120)).toBe(0.5);
  });

  it('should handle non-standard BPM values', () => {
    expect(msToBeats(1000, 90)).toBeCloseTo(1.5);
    expect(msToBeats(1000, 180)).toBeCloseTo(3);
  });
});

describe('beatsToMs', () => {
  it('should convert 0 beats to 0ms', () => {
    expect(beatsToMs(0, 120)).toBe(0);
  });

  it('should convert correctly at 60 BPM', () => {
    expect(beatsToMs(1, 60)).toBe(1000);
    expect(beatsToMs(2, 60)).toBe(2000);
    expect(beatsToMs(0.5, 60)).toBe(500);
  });

  it('should convert correctly at 120 BPM', () => {
    expect(beatsToMs(1, 120)).toBe(500);
    expect(beatsToMs(2, 120)).toBe(1000);
    expect(beatsToMs(4, 120)).toBe(2000);
  });

  it('should be inverse of msToBeats', () => {
    const bpm = 120;
    const beats = 3.5;
    expect(msToBeats(beatsToMs(beats, bpm), bpm)).toBeCloseTo(beats);
  });
});

describe('secondsPerBeat', () => {
  it('should return 1 second at 60 BPM', () => {
    expect(secondsPerBeat(60)).toBe(1);
  });

  it('should return 0.5 seconds at 120 BPM', () => {
    expect(secondsPerBeat(120)).toBe(0.5);
  });

  it('should return 2 seconds at 30 BPM', () => {
    expect(secondsPerBeat(30)).toBe(2);
  });
});

describe('msPerBeat', () => {
  it('should return 1000ms at 60 BPM', () => {
    expect(msPerBeat(60)).toBe(1000);
  });

  it('should return 500ms at 120 BPM', () => {
    expect(msPerBeat(120)).toBe(500);
  });

  it('should return 2000ms at 30 BPM', () => {
    expect(msPerBeat(30)).toBe(2000);
  });
});

// ============================================================================
// ID Generation Tests
// ============================================================================

describe('shortId', () => {
  it('should return first 8 characters', () => {
    expect(shortId('12345678-1234-1234-1234-123456789012')).toBe('12345678');
  });

  it('should handle short strings', () => {
    expect(shortId('abc')).toBe('abc');
  });

  it('should return empty for empty string', () => {
    expect(shortId('')).toBe('');
  });
});

// ============================================================================
// Array Utilities Tests
// ============================================================================

describe('clamp', () => {
  it('should return value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('should clamp to min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, 0, 10)).toBe(0);
  });

  it('should clamp to max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, 0, 10)).toBe(10);
  });

  it('should handle negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
    expect(clamp(-15, -10, -1)).toBe(-10);
  });

  it('should handle floating point values', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-0.5, 0, 1)).toBe(0);
  });
});

describe('lerp', () => {
  it('should return a when t is 0', () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(-50, 50, 0)).toBe(-50);
  });

  it('should return b when t is 1', () => {
    expect(lerp(0, 100, 1)).toBe(100);
    expect(lerp(-50, 50, 1)).toBe(50);
  });

  it('should interpolate at midpoint', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(-100, 100, 0.5)).toBe(0);
  });

  it('should interpolate at arbitrary t values', () => {
    expect(lerp(0, 100, 0.25)).toBe(25);
    expect(lerp(0, 100, 0.75)).toBe(75);
  });

  it('should handle extrapolation when t is outside 0-1', () => {
    expect(lerp(0, 100, -0.5)).toBe(-50);
    expect(lerp(0, 100, 1.5)).toBe(150);
  });
});

describe('mapRange', () => {
  it('should map 0-1 to 0-100', () => {
    expect(mapRange(0, 0, 1, 0, 100)).toBe(0);
    expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50);
    expect(mapRange(1, 0, 1, 0, 100)).toBe(100);
  });

  it('should map to inverted range', () => {
    expect(mapRange(0, 0, 1, 100, 0)).toBe(100);
    expect(mapRange(0.5, 0, 1, 100, 0)).toBe(50);
    expect(mapRange(1, 0, 1, 100, 0)).toBe(0);
  });

  it('should map between arbitrary ranges', () => {
    // Map from 20-80 to -1 to 1
    expect(mapRange(20, 20, 80, -1, 1)).toBe(-1);
    expect(mapRange(50, 20, 80, -1, 1)).toBe(0);
    expect(mapRange(80, 20, 80, -1, 1)).toBe(1);
  });

  it('should handle negative input ranges', () => {
    expect(mapRange(-10, -10, 10, 0, 100)).toBe(0);
    expect(mapRange(0, -10, 10, 0, 100)).toBe(50);
    expect(mapRange(10, -10, 10, 0, 100)).toBe(100);
  });
});

// ============================================================================
// Object Utilities Tests
// ============================================================================

describe('deepClone', () => {
  it('should clone primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('should clone arrays', () => {
    const original = [1, 2, 3];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it('should clone nested objects', () => {
    const original = { a: 1, b: { c: 2, d: { e: 3 } } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.b.d).not.toBe(original.b.d);
  });

  it('should clone arrays within objects', () => {
    const original = { arr: [1, 2, { nested: true }] };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned.arr).not.toBe(original.arr);
    expect(cloned.arr[2]).not.toBe(original.arr[2]);
  });

  it('should not mutate original when cloned is modified', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);
    cloned.a = 99;
    cloned.b.c = 99;
    expect(original.a).toBe(1);
    expect(original.b.c).toBe(2);
  });
});

describe('deepEqual', () => {
  it('should return true for equal primitives', () => {
    expect(deepEqual(42, 42)).toBe(true);
    expect(deepEqual('hello', 'hello')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  it('should return false for different primitives', () => {
    expect(deepEqual(42, 43)).toBe(false);
    expect(deepEqual('hello', 'world')).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
  });

  it('should return true for equal arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([], [])).toBe(true);
  });

  it('should return false for different arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('should return true for equal nested objects', () => {
    const a = { x: 1, y: { z: 2 } };
    const b = { x: 1, y: { z: 2 } };
    expect(deepEqual(a, b)).toBe(true);
  });

  it('should return false for different nested objects', () => {
    const a = { x: 1, y: { z: 2 } };
    const b = { x: 1, y: { z: 3 } };
    expect(deepEqual(a, b)).toBe(false);
  });

  it('should handle objects with different keys', () => {
    const a = { x: 1 };
    const b = { x: 1, y: 2 };
    expect(deepEqual(a, b)).toBe(false);
  });
});
