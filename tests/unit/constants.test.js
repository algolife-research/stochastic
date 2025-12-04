// Unit tests for core/constants.js

import { describe, it, expect } from 'vitest';
import {
  NODE_RADIUS,
  HANDLE_OFFSET_X,
  HANDLE_RADIUS,
  PIXELS_PER_STEP,
  GRID_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_SPEED,
  MIN_SPEED,
  MAX_SPEED,
  BASE_FREQ,
  NOTE_LABELS,
  SCALE_CHROMATIC,
  NOTE_NAMES,
  NODE_COLORS,
  NODE_ICONS,
  TUNNEL_TEMPLATES,
} from '../../js/core/constants.js';

describe('Constants', () => {
  describe('Canvas & Grid Constants', () => {
    it('should have valid NODE_RADIUS', () => {
      expect(NODE_RADIUS).toBeGreaterThan(0);
      expect(typeof NODE_RADIUS).toBe('number');
    });

    it('should have valid grid constants', () => {
      expect(GRID_SIZE).toBeGreaterThan(0);
      expect(PIXELS_PER_STEP).toBeGreaterThan(0);
    });

    it('should have handle radius smaller than node radius', () => {
      expect(HANDLE_RADIUS).toBeLessThan(NODE_RADIUS);
    });
  });

  describe('Zoom Constants', () => {
    it('should have valid zoom range', () => {
      expect(MIN_ZOOM).toBeGreaterThan(0);
      expect(MAX_ZOOM).toBeGreaterThan(MIN_ZOOM);
    });
  });

  describe('Speed Constants', () => {
    it('should have valid speed range', () => {
      expect(MIN_SPEED).toBeGreaterThan(0);
      expect(MAX_SPEED).toBeGreaterThan(MIN_SPEED);
    });

    it('should have default speed within range', () => {
      expect(DEFAULT_SPEED).toBeGreaterThanOrEqual(MIN_SPEED);
      expect(DEFAULT_SPEED).toBeLessThanOrEqual(MAX_SPEED);
    });
  });

  describe('Audio Constants', () => {
    it('should have valid base frequency', () => {
      expect(BASE_FREQ).toBeGreaterThan(0);
      // C3 should be around 130.81 Hz
      expect(BASE_FREQ).toBeCloseTo(130.81, 1);
    });

    it('should have 12 note labels for chromatic scale', () => {
      expect(NOTE_LABELS).toHaveLength(12);
      expect(NOTE_LABELS).toContain('C');
      expect(NOTE_LABELS).toContain('A');
    });

    it('should have 37 notes in chromatic scale (3 octaves + 1)', () => {
      expect(SCALE_CHROMATIC).toHaveLength(37);
      expect(NOTE_NAMES).toHaveLength(37);
    });

    it('should have frequencies increasing by semitone ratio', () => {
      const semitoneRatio = Math.pow(2, 1/12);
      for (let i = 1; i < SCALE_CHROMATIC.length; i++) {
        const ratio = SCALE_CHROMATIC[i] / SCALE_CHROMATIC[i - 1];
        expect(ratio).toBeCloseTo(semitoneRatio, 5);
      }
    });

    it('should have note names with correct octave numbers', () => {
      expect(NOTE_NAMES[0]).toBe('C3');
      expect(NOTE_NAMES[12]).toBe('C4');
      expect(NOTE_NAMES[24]).toBe('C5');
      expect(NOTE_NAMES[36]).toBe('C6');
    });
  });

  describe('Node Colors', () => {
    it('should have colors for all node types', () => {
      const expectedTypes = ['source', 'speaker', 'filter', 'polariser', 'pitch', 'splitter', 'gate', 'delay', 'tunnel', 'chord'];
      expectedTypes.forEach(type => {
        expect(NODE_COLORS[type]).toBeDefined();
        expect(typeof NODE_COLORS[type]).toBe('string');
        expect(NODE_COLORS[type]).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('Node Icons', () => {
    it('should have icons for all node types', () => {
      const expectedTypes = ['source', 'speaker', 'filter', 'polariser', 'pitch', 'splitter', 'gate', 'delay', 'tunnel', 'chord'];
      expectedTypes.forEach(type => {
        expect(NODE_ICONS[type]).toBeDefined();
        expect(typeof NODE_ICONS[type]).toBe('string');
      });
    });
  });

  describe('Tunnel Templates', () => {
    it('should have predefined tunnel templates', () => {
      expect(TUNNEL_TEMPLATES).toBeDefined();
      expect(Object.keys(TUNNEL_TEMPLATES).length).toBeGreaterThan(0);
    });

    it('should have valid template structure', () => {
      Object.values(TUNNEL_TEMPLATES).forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.icon).toBeDefined();
        expect(template.description).toBeDefined();
        expect(Array.isArray(template.nodes)).toBe(true);
        expect(template.nodes.length).toBeGreaterThan(0);
      });
    });
  });
});
