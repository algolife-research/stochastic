// A Tunnel Is a Voice
// Unit tests for the oscillator's layers inside and outside a tunnel: the
// first oscillator of a tunnel's chain replaces the waves a packet came with,
// later ones in the chain add to them, a tunnel without one leaves them, and a
// lone oscillator adds as it always has.

import { describe, it, expect } from 'vitest';
import { processNodeArrival } from './engine';
import type { Packet, PacketId, EdgeId, MidiNote, Frequency, GraphNode, GraphEdge, AudioPayload, WaveType } from './types';

const EDGE = { targetParam: null } as GraphEdge;

function packet(payload: Partial<AudioPayload> = {}): Packet {
  return {
    id: 'p' as PacketId,
    edgeId: 'e' as EdgeId,
    t: 1,
    payload: {
      freq: 261.6 as Frequency,
      midiNote: 60 as MidiNote,
      wave: 'sine',
      timbre: 0,
      cutoff: 20000 as Frequency,
      gain: 0.5,
      holdTime: 0,
      releaseTime: 0.1,
      ...payload,
    },
  };
}

function string(wave: WaveType, ratio = 1) {
  return { type: 'oscillator', props: { wave, ratio, attack: 0.01, decay: 0.3, mix: 0.5 } };
}

function tunnel(id: string, subNodes: Array<{ type: string; props: Record<string, unknown> }>): GraphNode {
  return { id, type: 'tunnel', x: 0, y: 0, props: { subNodes } } as unknown as GraphNode;
}

function lone(wave: WaveType): GraphNode {
  return { id: 'lone', type: 'oscillator', x: 0, y: 0, props: string(wave).props } as unknown as GraphNode;
}

function through(node: GraphNode, payload: AudioPayload): AudioPayload {
  return processNodeArrival(packet(payload), node, EDGE);
}

const waves = (p: AudioPayload) => (p.waves ?? []).map((w) => w.wave);

describe('a tunnel is a voice', () => {
  it('keeps one voice on a packet looping through it', () => {
    const spine = tunnel('tom', [string('triangle'), { type: 'filter', props: { cutoff: 800 } }, string('sine', 2)]);
    let payload = packet().payload;
    for (let lap = 0; lap < 12; lap++) {
      payload = through(spine, payload);
      expect(waves(payload)).toEqual(['triangle', 'sine']);
    }
  });

  it('dresses a packet passing a tunnel after a tunnel in the second voice', () => {
    const choir = tunnel('choir', [string('sawtooth'), string('square')]);
    const tom = tunnel('tom', [string('triangle')]);
    const out = through(tom, through(choir, packet().payload));
    expect(waves(out)).toEqual(['triangle']);
    expect(out.wave).toBe('triangle');
    expect(out.timbre).toBe(0.8);
  });

  it('still adds a lone oscillator to the voice a tunnel gave', () => {
    const tom = tunnel('tom', [string('triangle')]);
    const out = through(lone('square'), through(tom, packet().payload));
    expect(waves(out)).toEqual(['triangle', 'square']);
    expect(waves(through(lone('sine'), out))).toEqual(['triangle', 'square', 'sine']);
  });

  it('stacks two oscillators of one tunnel, whatever the packet wore', () => {
    const spine = tunnel('organ', [string('sine'), { type: 'gain', props: { value: 0.9 } }, string('square', 3)]);
    expect(waves(through(spine, packet().payload))).toEqual(['sine', 'square']);
    const worn = through(lone('sawtooth'), through(lone('triangle'), packet().payload));
    const out = through(spine, worn);
    expect(waves(out)).toEqual(['sine', 'square']);
    expect(out.waves?.[1]?.ratio).toBe(3);
  });

  it('leaves the waves of a packet passing a tunnel without an oscillator', () => {
    const dressed = through(tunnel('tom', [string('triangle')]), packet().payload);
    const out = through(tunnel('tone', [{ type: 'filter', props: { cutoff: 500 } }, { type: 'gain', props: { value: 0.8 } }]), dressed);
    expect(out.waves).toEqual(dressed.waves);
  });

  it('dresses at the first oscillator wherever it sits in the chain, the packet it came as untouched', () => {
    const dressed = through(lone('sawtooth'), packet().payload);
    const out = through(tunnel('late', [{ type: 'filter', props: { cutoff: 900 } }, string('sine')]), dressed);
    expect(waves(out)).toEqual(['sine']);
    expect(waves(dressed)).toEqual(['sawtooth']);  // the packet it came as is untouched
  });
});
