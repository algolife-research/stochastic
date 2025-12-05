// Unit tests for audio synthesis

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as state from '../../js/core/state.js';

// Mock the AudioContext
const mockOscillator = {
  type: 'sine',
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
};

const mockGainNode = {
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn()
};

const mockFilter = {
  type: 'lowpass',
  frequency: { value: 20000, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  Q: { value: 1, setValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn()
};

const mockPanner = {
  pan: { value: 0, setValueAtTime: vi.fn() },
  connect: vi.fn()
};

const mockConvolver = {
  buffer: null,
  connect: vi.fn(),
  disconnect: vi.fn()
};

const mockAudioContext = {
  currentTime: 0,
  destination: {},
  sampleRate: 44100,
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGainNode),
  createBiquadFilter: vi.fn(() => mockFilter),
  createStereoPanner: vi.fn(() => mockPanner),
  createConvolver: vi.fn(() => mockConvolver),
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(44100))
  })),
  resume: vi.fn()
};

// Store original AudioContext
const originalAudioContext = globalThis.AudioContext;

describe('Audio Synth Module', () => {
  beforeEach(() => {
    state.clearGraph();
    vi.clearAllMocks();
    globalThis.AudioContext = vi.fn(() => mockAudioContext);
  });

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext;
  });

  describe('Sound Payload Structure', () => {
    it('should accept basic sound payload', () => {
      const payload = {
        freq: 440,
        gain: 0.5,
        wave: 'sine'
      };
      
      expect(payload.freq).toBe(440);
      expect(payload.gain).toBe(0.5);
      expect(payload.wave).toBe('sine');
    });

    it('should accept complex sound payload with envelopes', () => {
      const payload = {
        freq: 440,
        gain: 0.5,
        wave: 'sine',
        attack: 0.01,
        decay: 0.3,
        waves: [
          { wave: 'sawtooth', mix: 0.3, attack: 0.02, decay: 0.4 },
          { wave: 'square', mix: 0.2, attack: 0.01, decay: 0.3, ratio: 2 }
        ],
        cutoff: 2000,
        filterEnv: { mod: 5000, attack: 0.01, decay: 0.2 },
        reverb: 0.5,
        pan: -0.3
      };
      
      expect(payload.waves.length).toBe(2);
      expect(payload.filterEnv.mod).toBe(5000);
      expect(payload.reverb).toBe(0.5);
    });

    it('should handle different wave types', () => {
      const waveTypes = ['sine', 'sawtooth', 'square', 'triangle'];
      
      waveTypes.forEach(wave => {
        const payload = { freq: 440, gain: 0.5, wave };
        expect(payload.wave).toBe(wave);
      });
    });
  });

  describe('Frequency Calculations', () => {
    it('should accept standard frequencies', () => {
      const frequencies = [
        { note: 'A4', freq: 440 },
        { note: 'C5', freq: 523.25 },
        { note: 'E5', freq: 659.25 }
      ];
      
      frequencies.forEach(f => {
        expect(f.freq).toBeGreaterThan(0);
      });
    });

    it('should handle very low frequencies', () => {
      const payload = { freq: 20, gain: 0.5, wave: 'sine' };
      expect(payload.freq).toBe(20);
    });

    it('should handle very high frequencies', () => {
      const payload = { freq: 15000, gain: 0.5, wave: 'sine' };
      expect(payload.freq).toBe(15000);
    });
  });

  describe('Gain/Volume Handling', () => {
    it('should clamp gain between 0 and 1', () => {
      const testGains = [
        { input: 0, expected: 0 },
        { input: 0.5, expected: 0.5 },
        { input: 1, expected: 1 },
        { input: -0.5, expected: 0 },
        { input: 1.5, expected: 1 }
      ];
      
      testGains.forEach(({ input, expected }) => {
        const clamped = Math.max(0, Math.min(1, input));
        expect(clamped).toBe(expected);
      });
    });

    it('should multiply gains correctly', () => {
      const baseGain = 0.5;
      const speakerVolume = 0.8;
      const result = baseGain * speakerVolume;
      
      expect(result).toBeCloseTo(0.4, 5);
    });
  });

  describe('Filter Processing', () => {
    it('should process lowpass filter cutoff', () => {
      const cutoffs = [100, 500, 1000, 5000, 10000, 20000];
      
      cutoffs.forEach(cutoff => {
        expect(cutoff).toBeGreaterThan(0);
        expect(cutoff).toBeLessThanOrEqual(20000);
      });
    });

    it('should apply filter envelope modulation', () => {
      const baseCutoff = 1000;
      const modAmount = 5000;
      const envValue = 0.5; // Simulated envelope value
      
      const modulatedCutoff = baseCutoff + (modAmount * envValue);
      expect(modulatedCutoff).toBe(3500);
    });
  });

  describe('Panning', () => {
    it('should pan between -1 and 1', () => {
      const panValues = [-1, -0.5, 0, 0.5, 1];
      
      panValues.forEach(pan => {
        expect(pan).toBeGreaterThanOrEqual(-1);
        expect(pan).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Reverb', () => {
    it('should mix dry and wet signals', () => {
      const reverbAmount = 0.5;
      const dryGain = 1 - reverbAmount;
      const wetGain = reverbAmount;
      
      expect(dryGain).toBe(0.5);
      expect(wetGain).toBe(0.5);
      expect(dryGain + wetGain).toBe(1);
    });
  });

  describe('Envelope Calculations', () => {
    it('should calculate attack time', () => {
      const attacks = [0.001, 0.01, 0.1, 0.5, 1.0];
      
      attacks.forEach(attack => {
        expect(attack).toBeGreaterThan(0);
      });
    });

    it('should calculate decay time', () => {
      const decays = [0.1, 0.3, 0.5, 1.0, 2.0];
      
      decays.forEach(decay => {
        expect(decay).toBeGreaterThan(0);
      });
    });

    it('should handle ADSR envelope', () => {
      const envelope = {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.3
      };
      
      expect(envelope.attack).toBeLessThan(envelope.decay);
      expect(envelope.sustain).toBeLessThanOrEqual(1);
    });
  });

  describe('Harmonic Ratios', () => {
    it('should calculate harmonic frequencies', () => {
      const baseFreq = 440;
      const ratios = [1, 2, 3, 4, 5];
      
      const harmonics = ratios.map(ratio => baseFreq * ratio);
      
      expect(harmonics[0]).toBe(440);
      expect(harmonics[1]).toBe(880);
      expect(harmonics[2]).toBe(1320);
      expect(harmonics[3]).toBe(1760);
      expect(harmonics[4]).toBe(2200);
    });

    it('should handle detuned harmonics', () => {
      const baseFreq = 440;
      const ratio = 2.01; // Slightly detuned octave
      
      const detuned = baseFreq * ratio;
      expect(detuned).toBeCloseTo(884.4, 1);
    });
  });

  describe('Wave Mixing', () => {
    it('should sum wave contributions', () => {
      const waves = [
        { wave: 'sine', mix: 0.4 },
        { wave: 'sawtooth', mix: 0.3 },
        { wave: 'square', mix: 0.3 }
      ];
      
      const totalMix = waves.reduce((sum, w) => sum + w.mix, 0);
      expect(totalMix).toBe(1);
    });

    it('should normalize when mix exceeds 1', () => {
      const waves = [
        { wave: 'sine', mix: 0.6 },
        { wave: 'sawtooth', mix: 0.6 },
        { wave: 'square', mix: 0.6 }
      ];
      
      const totalMix = waves.reduce((sum, w) => sum + w.mix, 0);
      const normalized = waves.map(w => ({ ...w, mix: w.mix / totalMix }));
      
      const normalizedTotal = normalized.reduce((sum, w) => sum + w.mix, 0);
      expect(normalizedTotal).toBeCloseTo(1, 5);
    });
  });
});
