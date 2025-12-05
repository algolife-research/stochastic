// Unit tests for graph/packets.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as state from '../../js/core/state.js';
import { 
  spawnPacket, 
  processArrival,
  processTunnelSubNode 
} from '../../js/graph/packets.js';
import { createNode } from '../../js/graph/nodes.js';
import { createEdge } from '../../js/graph/edges.js';
import { SCALE_CHROMATIC } from '../../js/core/constants.js';

// Mock the panel module
vi.mock('../../js/ui/panel.js', () => ({
  updatePropPanel: vi.fn()
}));

// Mock the synth module
vi.mock('../../js/audio/synth.js', () => ({
  playSound: vi.fn()
}));

import { playSound } from '../../js/audio/synth.js';

describe('Packets', () => {
  beforeEach(() => {
    state.clearGraph();
    vi.clearAllMocks();
  });

  describe('spawnPacket()', () => {
    it('should create packet on outgoing edges', () => {
      const source = createNode('source', 0, 0);
      const speaker = createNode('speaker', 100, 0);
      createEdge(source, speaker);
      
      spawnPacket(source);
      
      expect(state.packets.length).toBe(1);
      expect(state.packets[0].edgeId).toBe(state.edges[0].id);
    });

    it('should create packets for all outgoing edges', () => {
      const source = createNode('source', 0, 0);
      const speaker1 = createNode('speaker', 100, 0);
      const speaker2 = createNode('speaker', 100, 100);
      createEdge(source, speaker1);
      createEdge(source, speaker2);
      
      spawnPacket(source);
      
      expect(state.packets.length).toBe(2);
    });

    it('should use random note when noteIndex is -1', () => {
      const source = createNode('source', 0, 0);
      source.props.noteIndex = -1;
      const speaker = createNode('speaker', 100, 0);
      createEdge(source, speaker);
      
      spawnPacket(source);
      
      // Random midiNote is 36-84 (C2-C6), scaleIndex = midiNote - 36 = 0-48
      expect(state.packets[0].payload.midiNote).toBeGreaterThanOrEqual(36);
      expect(state.packets[0].payload.midiNote).toBeLessThan(85);
      // Legacy scaleIndex is still derived
      expect(state.packets[0].payload.scaleIndex).toBe(state.packets[0].payload.midiNote - 36);
    });

    it('should use fixed note when noteIndex is set', () => {
      const source = createNode('source', 0, 0);
      source.props.noteIndex = 15;
      const speaker = createNode('speaker', 100, 0);
      createEdge(source, speaker);
      
      spawnPacket(source);
      
      expect(state.packets[0].payload.scaleIndex).toBe(15);
    });

    it('should apply source intensity to packet gain', () => {
      const source = createNode('source', 0, 0);
      source.props.intensity = 0.7;
      const speaker = createNode('speaker', 100, 0);
      createEdge(source, speaker);
      
      spawnPacket(source);
      
      expect(state.packets[0].payload.gain).toBe(0.7);
    });

    it('should initialize packet at t=0', () => {
      const source = createNode('source', 0, 0);
      const speaker = createNode('speaker', 100, 0);
      createEdge(source, speaker);
      
      spawnPacket(source);
      
      expect(state.packets[0].t).toBe(0);
    });

    it('should initialize packet with default wave and timbre', () => {
      const source = createNode('source', 0, 0);
      const speaker = createNode('speaker', 100, 0);
      createEdge(source, speaker);
      
      spawnPacket(source);
      
      expect(state.packets[0].payload.wave).toBe('sine');
      expect(state.packets[0].payload.timbre).toBe(0);
      expect(state.packets[0].payload.cutoff).toBe(20000);
    });
  });

  describe('processArrival()', () => {
    it('should trigger flash on node arrival', () => {
      const speaker = createNode('speaker', 100, 0);
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12 } };
      
      processArrival(packet, speaker);
      
      expect(speaker.flash).toBe(1.0);
    });

    it('should call playSound for speaker node', () => {
      const speaker = createNode('speaker', 100, 0);
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, speaker);
      
      expect(playSound).toHaveBeenCalled();
    });

    it('should apply speaker volume to gain', () => {
      const speaker = createNode('speaker', 100, 0);
      speaker.props.volume = 0.5;
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, speaker);
      
      const call = playSound.mock.calls[0][0];
      expect(call.gain).toBeCloseTo(0.25, 2);
    });

    it('should apply speaker reverb and pan', () => {
      const speaker = createNode('speaker', 100, 0);
      speaker.props.reverb = 0.3;
      speaker.props.pan = -0.5;
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, speaker);
      
      const call = playSound.mock.calls[0][0];
      expect(call.reverb).toBe(0.3);
      expect(call.pan).toBe(-0.5);
    });

    it('should shift pitch for pitch node in shift mode', () => {
      const source = createNode('source', 0, 0);
      const pitch = createNode('pitch', 50, 0);
      const speaker = createNode('speaker', 100, 0);
      pitch.props.shift = 5;
      pitch.props.mode = 'shift';
      createEdge(source, pitch);
      createEdge(pitch, speaker);
      
      // midiNote 48 = scaleIndex 12 + 36 (LEGACY_SCALE_OFFSET)
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, midiNote: 48, wave: 'sine' } };
      
      processArrival(packet, pitch);
      
      // Shift by 5: midiNote 48 + 5 = 53, scaleIndex = 53 - 36 = 17
      expect(state.packets.length).toBe(1);
      expect(state.packets[0].payload.scaleIndex).toBe(17);
      expect(state.packets[0].payload.midiNote).toBe(53);
    });

    it('should use fixed note for pitch node in fixed mode', () => {
      const source = createNode('source', 0, 0);
      const pitch = createNode('pitch', 50, 0);
      const speaker = createNode('speaker', 100, 0);
      pitch.props.mode = 'fixed';
      pitch.props.fixedNote = 20;
      createEdge(source, pitch);
      createEdge(pitch, speaker);
      
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, midiNote: 48, wave: 'sine' } };
      
      processArrival(packet, pitch);
      
      // Fixed note 20 + LEGACY_SCALE_OFFSET 36 = midiNote 56, scaleIndex = 56 - 36 = 20
      expect(state.packets[0].payload.scaleIndex).toBe(20);
      expect(state.packets[0].payload.midiNote).toBe(56);
    });

    it('should multiply gain for gain node', () => {
      const source = createNode('source', 0, 0);
      const gain = createNode('gain', 50, 0);
      const speaker = createNode('speaker', 100, 0);
      gain.props.value = 2.0;
      createEdge(source, gain);
      createEdge(gain, speaker);
      
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, gain);
      
      expect(state.packets[0].payload.gain).toBeCloseTo(1.0, 2);
    });

    it('should set cutoff for filter node', () => {
      const source = createNode('source', 0, 0);
      const filter = createNode('filter', 50, 0);
      const speaker = createNode('speaker', 100, 0);
      filter.props.cutoff = 5000;
      createEdge(source, filter);
      createEdge(filter, speaker);
      
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, filter);
      
      expect(state.packets[0].payload.cutoff).toBe(5000);
    });

    it('should add wave for polariser node', () => {
      const source = createNode('source', 0, 0);
      const polariser = createNode('polariser', 50, 0);
      const speaker = createNode('speaker', 100, 0);
      polariser.props.wave = 'sawtooth';
      createEdge(source, polariser);
      createEdge(polariser, speaker);
      
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, polariser);
      
      expect(state.packets[0].payload.waves).toBeDefined();
      expect(state.packets[0].payload.waves[0].wave).toBe('sawtooth');
    });

    it('should hold packet for delay node', () => {
      const delay = createNode('delay', 50, 0);
      delay.props.delayTime = 1;
      
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, delay);
      
      expect(delay.heldPackets.length).toBe(1);
      expect(state.packets.length).toBe(0); // No immediate output
    });

    it('should add vibrato for modulator node', () => {
      const source = createNode('source', 0, 0);
      const modulator = createNode('modulator', 50, 0);
      const speaker = createNode('speaker', 100, 0);
      modulator.props.rate = 6;
      modulator.props.depth = 30;
      modulator.props.delay = 0.3;
      createEdge(source, modulator);
      createEdge(modulator, speaker);
      
      const packet = { payload: { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' } };
      
      processArrival(packet, modulator);
      
      expect(state.packets[0].payload.vibratoRate).toBe(6);
      expect(state.packets[0].payload.vibratoDepth).toBe(30);
      expect(state.packets[0].payload.vibratoDelay).toBe(0.3);
    });
  });

  describe('processTunnelSubNode()', () => {
    it('should apply pitch shift to payload', () => {
      const subNode = { type: 'pitch', props: { shift: 3, mode: 'shift' } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, midiNote: 48, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.scaleIndex).toBe(15);
      expect(result.midiNote).toBe(51);
    });

    it('should apply fixed pitch to payload', () => {
      const subNode = { type: 'pitch', props: { mode: 'fixed', fixedNote: 24, shift: 0 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.scaleIndex).toBe(24);
    });

    it('should add polariser wave to payload', () => {
      const subNode = { type: 'polariser', props: { wave: 'square', attack: 0.01, decay: 0.3, mix: 0.8 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.waves).toBeDefined();
      expect(result.waves[0].wave).toBe('square');
      expect(result.waves[0].gain).toBe(0.8);
    });

    it('should add noise to payload', () => {
      const subNode = { type: 'noise', props: { wave: 'pink', attack: 0.02, decay: 0.5, mix: 0.3 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.waves).toBeDefined();
      expect(result.waves[0].wave).toBe('pink');
    });

    it('should add harmonic to payload', () => {
      const subNode = { type: 'harmonic', props: { wave: 'triangle', ratio: 3, attack: 0.01, decay: 0.4, mix: 0.5 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.waves).toBeDefined();
      expect(result.waves[0].ratio).toBe(3);
    });

    it('should apply filter cutoff to payload', () => {
      const subNode = { type: 'filter', props: { cutoff: 8000, attack: 0, decay: 0, mod: 0 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.cutoff).toBe(8000);
    });

    it('should multiply gain for gain subnode', () => {
      const subNode = { type: 'gain', props: { value: 0.5 } };
      const payload = { freq: 440, gain: 0.8, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.gain).toBeCloseTo(0.4, 2);
    });

    it('should return null when gate blocks packet', () => {
      const subNode = { type: 'gate', props: { prob: 0 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result).toBeNull();
    });

    it('should pass through when gate allows packet', () => {
      const subNode = { type: 'gate', props: { prob: 1 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result).not.toBeNull();
    });

    it('should add modulator vibrato to payload', () => {
      const subNode = { type: 'modulator', props: { rate: 7, depth: 25, delay: 0.15 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      const result = processTunnelSubNode(subNode, payload);
      
      expect(result.vibratoRate).toBe(7);
      expect(result.vibratoDepth).toBe(25);
      expect(result.vibratoDelay).toBe(0.15);
    });

    it('should play sound for speaker inside tunnel', () => {
      const subNode = { type: 'speaker', props: { volume: 0.8, reverb: 0.1, pan: 0.2 } };
      const payload = { freq: 440, gain: 0.5, scaleIndex: 12, wave: 'sine' };
      
      processTunnelSubNode(subNode, payload);
      
      expect(playSound).toHaveBeenCalled();
      const call = playSound.mock.calls[0][0];
      expect(call.reverb).toBe(0.1);
      expect(call.pan).toBe(0.2);
    });
  });
});
