// Unit tests for core/utils.js

import { describe, it, expect } from 'vitest';
import { uid, dist, dist2, distToSegment, hslToHex, clamp, lerp } from '../../js/core/utils.js';

describe('Utils', () => {
  describe('uid()', () => {
    it('should generate unique IDs', () => {
      const id1 = uid();
      const id2 = uid();
      expect(id1).not.toBe(id2);
    });

    it('should generate string IDs', () => {
      const id = uid();
      expect(typeof id).toBe('string');
    });

    it('should generate IDs of reasonable length', () => {
      const id = uid();
      expect(id.length).toBeGreaterThan(0);
      expect(id.length).toBeLessThanOrEqual(9);
    });
  });

  describe('dist()', () => {
    it('should calculate distance between two points', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };
      expect(dist(p1, p2)).toBe(5);
    });

    it('should return 0 for same point', () => {
      const p = { x: 5, y: 5 };
      expect(dist(p, p)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const p1 = { x: -3, y: -4 };
      const p2 = { x: 0, y: 0 };
      expect(dist(p1, p2)).toBe(5);
    });
  });

  describe('dist2()', () => {
    it('should calculate squared distance', () => {
      const v = { x: 0, y: 0 };
      const w = { x: 3, y: 4 };
      expect(dist2(v, w)).toBe(25); // 3^2 + 4^2 = 25
    });

    it('should return 0 for same point', () => {
      const p = { x: 10, y: 20 };
      expect(dist2(p, p)).toBe(0);
    });
  });

  describe('distToSegment()', () => {
    it('should calculate distance from point to line segment', () => {
      const p = { x: 0, y: 1 };
      const v = { x: 0, y: 0 };
      const w = { x: 2, y: 0 };
      expect(distToSegment(p, v, w)).toBe(1);
    });

    it('should return distance to closest endpoint if projection is outside segment', () => {
      const p = { x: -1, y: 0 };
      const v = { x: 0, y: 0 };
      const w = { x: 2, y: 0 };
      expect(distToSegment(p, v, w)).toBe(1);
    });

    it('should handle zero-length segment', () => {
      const p = { x: 3, y: 4 };
      const v = { x: 0, y: 0 };
      const w = { x: 0, y: 0 };
      expect(distToSegment(p, v, w)).toBe(5);
    });
  });

  describe('hslToHex()', () => {
    it('should convert red HSL to hex', () => {
      expect(hslToHex(0, 100, 50)).toBe('#FF0000');
    });

    it('should convert green HSL to hex', () => {
      expect(hslToHex(120, 100, 50)).toBe('#00FF00');
    });

    it('should convert blue HSL to hex', () => {
      expect(hslToHex(240, 100, 50)).toBe('#0000FF');
    });

    it('should convert white HSL to hex', () => {
      expect(hslToHex(0, 0, 100)).toBe('#FFFFFF');
    });

    it('should convert black HSL to hex', () => {
      expect(hslToHex(0, 0, 0)).toBe('#000000');
    });

    it('should convert gray HSL to hex', () => {
      expect(hslToHex(0, 0, 50)).toBe('#808080');
    });
  });

  describe('clamp()', () => {
    it('should return value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min if value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max if value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('lerp()', () => {
    it('should return start value at t=0', () => {
      expect(lerp(0, 100, 0)).toBe(0);
    });

    it('should return end value at t=1', () => {
      expect(lerp(0, 100, 1)).toBe(100);
    });

    it('should return midpoint at t=0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it('should handle negative values', () => {
      expect(lerp(-100, 100, 0.5)).toBe(0);
    });

    it('should extrapolate beyond 0-1 range', () => {
      expect(lerp(0, 100, 2)).toBe(200);
      expect(lerp(0, 100, -1)).toBe(-100);
    });
  });
});
