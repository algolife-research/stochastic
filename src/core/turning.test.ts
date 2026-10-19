// Turning Crystal Tests
// Unit tests for the pitch node's sequence mode: a note each arrival, rests,
// one turn per chord at one exact time, a look outside the tick, and a
// tunnel's organs turning apart.

import { describe, it, expect, beforeEach } from 'vitest';
import { processNodeArrival, setArrivalMoment, clearArrivalMoment, resetTurns, getTurnIndex, consumeStack } from './engine';
import type { Packet, PacketId, EdgeId, MidiNote, Frequency, GraphNode, GraphEdge, AudioPayload } from './types';

const EDGE = { targetParam: null } as GraphEdge;

function packet(midiNote = 60): Packet {
  return {
    id: 'p' as PacketId,
    edgeId: 'e' as EdgeId,
    t: 1,
    payload: {
      freq: 261.6 as Frequency,
      midiNote: midiNote as MidiNote,
      wave: 'sine',
      timbre: 0,
      cutoff: 20000 as Frequency,
      gain: 0.5,
      holdTime: 0,
      releaseTime: 0.1,
    },
  };
}

function crystal(notes: (number | null | number[])[] | undefined, id = 'turning'): GraphNode {
  return { id, type: 'pitch', x: 0, y: 0, props: { mode: 'sequence', shift: 0, fixedMidiNote: 60, notes } } as unknown as GraphNode;
}

/** One arrival at `at` (beat units), of `chord` */
function arrive(node: GraphNode, at: number, chord: object | null = null): AudioPayload {
  setArrivalMoment(at, chord);
  const out = processNodeArrival(packet(), node, EDGE);
  clearArrivalMoment();
  return out;
}

describe('the turning crystal', () => {
  beforeEach(() => resetTurns());

  it('gives its notes in turn, wrapping', () => {
    const node = crystal([62, 64, 67]);
    const heard = [1, 2, 3, 4, 5].map((at) => arrive(node, at).midiNote);
    expect(heard).toEqual([62, 64, 67, 62, 64]);
  });

  it('absorbs a packet on a rest, and still turns', () => {
    const node = crystal([62, null, 67]);
    expect(arrive(node, 1).gain).toBe(0.5);
    expect(arrive(node, 2).gain).toBe(-1);
    expect(arrive(node, 3).midiNote).toBe(67);
  });

  it('turns once for a chord arriving at one time', () => {
    const node = crystal([62, 64, 67]);
    const chord = {};
    expect(arrive(node, 10, chord).midiNote).toBe(62);
    expect(arrive(node, 10, chord).midiNote).toBe(62);
    expect(arrive(node, 10, {}).midiNote).toBe(64);  // another chord at the same time turns it
    expect(arrive(node, 11, chord).midiNote).toBe(67);  // the same chord later turns it
    expect(arrive(node, 12).midiNote).toBe(62);
    expect(arrive(node, 12).midiNote).toBe(64);  // lone packets each turn it
  });

  it('only looks outside the tick', () => {
    const node = crystal([62, 64]);
    expect(processNodeArrival(packet(), node, EDGE).midiNote).toBe(62);
    expect(processNodeArrival(packet(), node, EDGE).midiNote).toBe(62);
    expect(getTurnIndex('turning')).toBe(0);
    arrive(node, 1);
    expect(processNodeArrival(packet(), node, EDGE).midiNote).toBe(64);
    expect(getTurnIndex('turning')).toBe(1);
  });

  it('plays 60 without notes, and starts again when their count changes', () => {
    expect(arrive(crystal(undefined, 'bare'), 1).midiNote).toBe(60);
    arrive(crystal([62, 64, 67]), 1);
    expect(arrive(crystal([62, 64]), 2).midiNote).toBe(62);
  });

  it("turns a tunnel's organs apart", () => {
    const tunnel = {
      id: 'spine', type: 'tunnel', x: 0, y: 0,
      props: { subNodes: [
        { type: 'pitch', props: { mode: 'sequence', notes: [62, 64] } },
        { type: 'pitch', props: { mode: 'sequence', notes: [null, 70, 72] } },
      ] },
    } as unknown as GraphNode;
    expect(arrive(tunnel, 1).gain).toBe(-1);  // the second organ rests: the chain stops
    expect(arrive(tunnel, 2).midiNote).toBe(70);
    expect(arrive(tunnel, 3).midiNote).toBe(72);
    expect(getTurnIndex('spine', 0)).toBe(1);
    expect(getTurnIndex('spine', 1)).toBe(0);
  });
});

describe('stacked steps', () => {
  beforeEach(() => {
    resetTurns();
    consumeStack();
  });

  it('gives a stack to the tick, the packet taking its first note', () => {
    const node = crystal([[64, 60, 67], 62]);
    const out = arrive(node, 1);
    expect(out.midiNote).toBe(64);
    expect(consumeStack()).toEqual([64, 60, 67]);
    expect(consumeStack()).toBeNull();  // taken once
    expect(arrive(node, 2).midiNote).toBe(62);
    expect(consumeStack()).toBeNull();  // one note: no stack
  });

  it('reads a one-note list as one note, and an empty list as a rest', () => {
    const node = crystal([[65], [], 67]);
    expect(arrive(node, 1).midiNote).toBe(65);
    expect(consumeStack()).toBeNull();
    expect(arrive(node, 2).gain).toBe(-1);
    expect(consumeStack()).toBeNull();
    expect(arrive(node, 3).midiNote).toBe(67);
  });

  it('clamps every note of a stack', () => {
    arrive(crystal([[130, -4]]), 1);
    expect(consumeStack()).toEqual([127, 0]);
  });

  it('gives one chord at one time the same stack, turning once', () => {
    const node = crystal([[60, 64], 67]);
    const chord = {};
    arrive(node, 5, chord);
    expect(consumeStack()).toEqual([60, 64]);
    arrive(node, 5, chord);
    expect(consumeStack()).toEqual([60, 64]);
    expect(getTurnIndex('turning')).toBe(1);
    expect(arrive(node, 6, chord).midiNote).toBe(67);
  });

  it('looks at a stack without giving it', () => {
    const node = crystal([[67, 60]]);
    expect(processNodeArrival(packet(), node, EDGE).midiNote).toBe(67);
    expect(consumeStack()).toBeNull();
    expect(getTurnIndex('turning')).toBe(0);
  });

  it("gives a tunnel's organ the stack's lowest note", () => {
    const tunnel = {
      id: 'spine', type: 'tunnel', x: 0, y: 0,
      props: { subNodes: [{ type: 'pitch', props: { mode: 'sequence', notes: [[67, 60, 64], 72] } }] },
    } as unknown as GraphNode;
    expect(arrive(tunnel, 1).midiNote).toBe(60);
    expect(consumeStack()).toBeNull();
    expect(arrive(tunnel, 2).midiNote).toBe(72);
  });
});
