// Unit tests for tunnel functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as state from '../../js/core/state.js';
import { 
  createNode,
  createTunnelFromTemplate,
  getDefaultPropsForType
} from '../../js/graph/nodes.js';
import { processTunnelSubNode } from '../../js/graph/packets.js';
import { SCALE_CHROMATIC } from '../../js/core/constants.js';

// Mock modules
vi.mock('../../js/ui/panel.js', () => ({
  updatePropPanel: vi.fn()
}));

vi.mock('../../js/audio/synth.js', () => ({
  playSound: vi.fn()
}));

import { playSound } from '../../js/audio/synth.js';

describe('Tunnel Functionality', () => {
  beforeEach(() => {
    state.clearGraph();
    vi.clearAllMocks();
  });

  describe('Tunnel Templates', () => {
    it('should create voice tunnel with correct subnodes', () => {
      const tunnel = createTunnelFromTemplate('voice', 100, 100);
      
      expect(tunnel.type).toBe('tunnel');
      expect(tunnel.props.tunnelName).toBe('Voice');
      expect(tunnel.props.subNodes.length).toBeGreaterThan(0);
      
      // Voice should have pitch and polariser
      const hasPitch = tunnel.props.subNodes.some(n => n.type === 'pitch');
      const hasPolariser = tunnel.props.subNodes.some(n => n.type === 'polariser');
      expect(hasPitch).toBe(true);
      expect(hasPolariser).toBe(true);
    });

    it('should create thick tunnel with octave pitch shift', () => {
      const tunnel = createTunnelFromTemplate('thick', 100, 100);
      
      expect(tunnel.props.tunnelName).toBe('Thick');
      
      const pitch = tunnel.props.subNodes.find(n => n.type === 'pitch');
      expect(pitch).toBeDefined();
      expect(pitch.props.shift).toBe(12); // Octave up
    });

    it('should create dark tunnel with filter and low pitch', () => {
      const tunnel = createTunnelFromTemplate('dark', 100, 100);
      
      expect(tunnel.props.tunnelName).toBe('Dark');
      
      const filter = tunnel.props.subNodes.find(n => n.type === 'filter');
      const pitch = tunnel.props.subNodes.find(n => n.type === 'pitch');
      expect(filter).toBeDefined();
      expect(pitch).toBeDefined();
      expect(pitch.props.shift).toBe(-12); // Octave down
    });

    it('should return null for unknown template', () => {
      const tunnel = createTunnelFromTemplate('nonexistent', 100, 100);
      expect(tunnel).toBeNull();
    });

    it('should position tunnel at specified coordinates', () => {
      const tunnel = createTunnelFromTemplate('voice', 250, 350);
      
      expect(tunnel.x).toBe(250);
      expect(tunnel.y).toBe(350);
    });
  });

  describe('Tunnel Sub-node Processing', () => {
    it('should chain multiple effects in order', () => {
      const payload = { 
        freq: 440, 
        gain: 1.0, 
        scaleIndex: 12,
        midiNote: 48,  // scaleIndex 12 = MIDI 48 (C3)
        wave: 'sine',
        cutoff: 20000
      };
      
      // Process pitch shift
      const pitchNode = { type: 'pitch', props: { shift: 5, mode: 'shift' } };
      let result = processTunnelSubNode(pitchNode, payload);
      
      expect(result.scaleIndex).toBe(17);
      expect(result.midiNote).toBe(53);
      
      // Process gain
      const gainNode = { type: 'gain', props: { value: 0.5 } };
      result = processTunnelSubNode(gainNode, result);
      
      expect(result.gain).toBe(0.5);
      
      // Process filter
      const filterNode = { type: 'filter', props: { cutoff: 2000, mod: 0 } };
      result = processTunnelSubNode(filterNode, result);
      
      expect(result.cutoff).toBe(2000);
    });

    it('should preserve unmodified payload properties', () => {
      const payload = { 
        freq: 440, 
        gain: 0.5, 
        scaleIndex: 12, 
        wave: 'sine',
        timbre: 0.5,
        customProp: 'test'
      };
      
      const pitchNode = { type: 'pitch', props: { shift: 2, mode: 'shift' } };
      const result = processTunnelSubNode(pitchNode, payload);
      
      expect(result.wave).toBe('sine');
      expect(result.timbre).toBe(0.5);
      expect(result.customProp).toBe('test');
    });

    it('should accumulate multiple waves from polarisers', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const pol1 = { type: 'polariser', props: { wave: 'sawtooth', attack: 0.01, decay: 0.3, mix: 0.5 } };
      let result = processTunnelSubNode(pol1, payload);
      
      expect(result.waves.length).toBe(1);
      
      const pol2 = { type: 'polariser', props: { wave: 'square', attack: 0.02, decay: 0.4, mix: 0.3 } };
      result = processTunnelSubNode(pol2, result);
      
      expect(result.waves.length).toBe(2);
      expect(result.waves[0].wave).toBe('sawtooth');
      expect(result.waves[1].wave).toBe('square');
    });

    it('should add harmonics with ratio', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const harmonic = { 
        type: 'harmonic', 
        props: { wave: 'sine', ratio: 2, attack: 0.01, decay: 0.3, mix: 0.5 } 
      };
      const result = processTunnelSubNode(harmonic, payload);
      
      expect(result.waves).toBeDefined();
      expect(result.waves[0].ratio).toBe(2);
    });

    it('should apply filter envelope when mod is set', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const filter = { 
        type: 'filter', 
        props: { cutoff: 1000, attack: 0.01, decay: 0.3, mod: 5000 } 
      };
      const result = processTunnelSubNode(filter, payload);
      
      expect(result.cutoff).toBe(1000);
      expect(result.filterEnv).toBeDefined();
      expect(result.filterEnv.mod).toBe(5000);
    });

    it('should clamp pitch to valid range', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 60, midiNote: 96, wave: 'sine' };
      
      // Try to shift way above max - MIDI max is 127
      const pitch = { type: 'pitch', props: { shift: 100, mode: 'shift' } };
      const result = processTunnelSubNode(pitch, payload);
      
      // MIDI notes are clamped to 0-127, scaleIndex is midiNote - 36
      expect(result.midiNote).toBeLessThanOrEqual(127);
    });

    it('should clamp pitch to minimum 0', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 5, midiNote: 41, wave: 'sine' };
      
      // Try to shift below 0
      const pitch = { type: 'pitch', props: { shift: -50, mode: 'shift' } };
      const result = processTunnelSubNode(pitch, payload);
      
      // MIDI notes are clamped to 0-127
      expect(result.midiNote).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tunnel Speaker Integration', () => {
    it('should call playSound when speaker subnode processes packet', () => {
      const payload = { 
        freq: 440, 
        gain: 0.5, 
        scaleIndex: 12, 
        wave: 'sine',
        waves: [],
        cutoff: 20000
      };
      
      const speaker = { 
        type: 'speaker', 
        props: { volume: 0.8, reverb: 0.2, pan: 0 } 
      };
      
      processTunnelSubNode(speaker, payload);
      
      expect(playSound).toHaveBeenCalledTimes(1);
    });

    it('should apply speaker volume to payload gain', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const speaker = { type: 'speaker', props: { volume: 0.5, reverb: 0, pan: 0 } };
      
      processTunnelSubNode(speaker, payload);
      
      const callPayload = playSound.mock.calls[0][0];
      expect(callPayload.gain).toBeCloseTo(0.25, 2);
    });

    it('should apply speaker reverb', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const speaker = { type: 'speaker', props: { volume: 1, reverb: 0.7, pan: 0 } };
      
      processTunnelSubNode(speaker, payload);
      
      const callPayload = playSound.mock.calls[0][0];
      expect(callPayload.reverb).toBe(0.7);
    });

    it('should apply speaker pan', () => {
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const speaker = { type: 'speaker', props: { volume: 1, reverb: 0, pan: -0.8 } };
      
      processTunnelSubNode(speaker, payload);
      
      const callPayload = playSound.mock.calls[0][0];
      expect(callPayload.pan).toBe(-0.8);
    });
  });

  describe('Custom Tunnel Creation', () => {
    it('should create empty custom tunnel', () => {
      const tunnel = createNode('tunnel', 100, 100);
      
      expect(tunnel.type).toBe('tunnel');
      expect(tunnel.props.tunnelName).toBe('Custom');
      expect(tunnel.props.subNodes).toEqual([]);
    });

    it('should allow adding subnodes to custom tunnel', () => {
      const tunnel = createNode('tunnel', 100, 100);
      
      tunnel.props.subNodes.push({
        type: 'pitch',
        props: { shift: 7, mode: 'shift' }
      });
      
      expect(tunnel.props.subNodes.length).toBe(1);
      expect(tunnel.props.subNodes[0].type).toBe('pitch');
    });
  });
});
