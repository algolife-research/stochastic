// Unit tests for io/compiler.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compileGraph } from '../../js/io/compiler.js';
import { SCALE_CHROMATIC } from '../../js/core/constants.js';

describe('Compiler', () => {
  describe('compileGraph()', () => {
    it('should return empty array for empty graph', () => {
      const events = compileGraph([], [], 1, 120, {});
      expect(events).toEqual([]);
    });

    it('should return empty array for graph without speakers', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12 } },
        { id: 'n2', type: 'pitch', x: 100, y: 0, props: { shift: 2 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' }
      ];
      
      const events = compileGraph(nodes, edges, 2, 120, { pixelsPerBeat: 200 });
      expect(events).toEqual([]);
    });

    it('should generate events for source-speaker graph', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' }
      ];
      
      const events = compileGraph(nodes, edges, 3, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('freq');
      expect(events[0]).toHaveProperty('gain');
      expect(events[0]).toHaveProperty('time');
    });

    it('should respect source interval for emission timing', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 2, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' }
      ];
      
      // 4 seconds at 120 BPM = 8 beats, with interval 2 = ~4 emissions (minus travel time)
      const events = compileGraph(nodes, edges, 4, 120, { pixelsPerBeat: 200 });
      
      // Should have fewer events with longer interval
      expect(events.length).toBeLessThanOrEqual(4);
    });

    it('should apply pitch shift to events', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'pitch', x: 100, y: 0, props: { shift: 5, mode: 'shift' } },
        { id: 'n3', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' }
      ];
      
      const events = compileGraph(nodes, edges, 3, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
      // With noteIndex 12 and shift 5, scaleIndex should be 17
      expect(events[0].scaleIndex).toBe(17);
    });

    it('should apply speaker volume to events', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'speaker', x: 200, y: 0, props: { volume: 0.5, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' }
      ];
      
      const events = compileGraph(nodes, edges, 2, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
      // intensity 0.5 * volume 0.5 = 0.25
      expect(events[0].gain).toBeCloseTo(0.25, 2);
    });

    it('should apply speaker reverb and pan to events', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0.5, pan: -0.3 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' }
      ];
      
      const events = compileGraph(nodes, edges, 2, 120, { pixelsPerBeat: 200 });
      
      expect(events[0].reverb).toBe(0.5);
      expect(events[0].pan).toBe(-0.3);
    });

    it('should process delay nodes correctly', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'delay', x: 100, y: 0, props: { delayTime: 1 } },
        { id: 'n3', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' }
      ];
      
      const events = compileGraph(nodes, edges, 4, 120, { pixelsPerBeat: 200 });
      
      // Events should be delayed
      expect(events.length).toBeGreaterThan(0);
    });

    it('should process gain nodes correctly', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'gain', x: 100, y: 0, props: { value: 2.0 } },
        { id: 'n3', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' }
      ];
      
      const events = compileGraph(nodes, edges, 2, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
      // intensity 0.5 * gain 2.0 * volume 1.0 = 1.0
      expect(events[0].gain).toBeCloseTo(1.0, 2);
    });

    it('should process filter nodes correctly', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'filter', x: 100, y: 0, props: { cutoff: 5000, attack: 0, decay: 0, mod: 0 } },
        { id: 'n3', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' }
      ];
      
      const events = compileGraph(nodes, edges, 2, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].cutoff).toBe(5000);
    });

    it('should process polariser nodes correctly', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'polariser', x: 100, y: 0, props: { wave: 'sawtooth', attack: 0.01, decay: 0.4, mix: 1.0 } },
        { id: 'n3', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' }
      ];
      
      const events = compileGraph(nodes, edges, 2, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].waves).toBeDefined();
      expect(events[0].waves[0].wave).toBe('sawtooth');
    });

    it('should process tunnel with speaker inside', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'tunnel', x: 200, y: 0, props: { 
          tunnelName: 'Test',
          subNodes: [
            { type: 'pitch', props: { shift: 3, mode: 'shift' } },
            { type: 'speaker', props: { volume: 1.0, reverb: 0.2, pan: 0 } }
          ]
        }}
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' }
      ];
      
      const events = compileGraph(nodes, edges, 2, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
      // Pitch shift of 3 from note 12 = 15
      expect(events[0].scaleIndex).toBe(15);
      expect(events[0].reverb).toBe(0.2);
    });

    it('should sort events by time', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 'n2', type: 'speaker', x: 200, y: 0, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 'n2' }
      ];
      
      const events = compileGraph(nodes, edges, 5, 120, { pixelsPerBeat: 200 });
      
      for (let i = 1; i < events.length; i++) {
        expect(events[i].time).toBeGreaterThanOrEqual(events[i - 1].time);
      }
    });

    it('should handle teleporter nodes', () => {
      const nodes = [
        { id: 'n1', type: 'source', x: 0, y: 0, props: { interval: 1, noteIndex: 12, intensity: 0.5 } },
        { id: 't1', type: 'teleporter', x: 100, y: 0, props: { channel: 'A' } },
        { id: 't2', type: 'teleporter', x: 200, y: 100, props: { channel: 'A' } },
        { id: 'n3', type: 'speaker', x: 300, y: 100, props: { volume: 1.0, reverb: 0, pan: 0 } }
      ];
      const edges = [
        { id: 'e1', from: 'n1', to: 't1' },
        { id: 'e2', from: 't2', to: 'n3' }
      ];
      
      const events = compileGraph(nodes, edges, 3, 120, { pixelsPerBeat: 200 });
      
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
