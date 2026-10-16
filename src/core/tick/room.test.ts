// Room on a Filament Tests
// Unit tests for the flow limit of loops: fronts, capacity, fades and chords.
// Exact time (16 Oct 2026): a front is the packets entering an edge at one
// exact time (`at`, beat units); "the next frame" is a time one unit on.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, filamentCapacity, type FilamentRoom } from './room';
import type { Packet, PacketId, EdgeId, MidiNote, Frequency } from '../types';
import { PPQ } from '../constants';

let nextId = 1;
// Long enough that no front leaves by its exit within a test
const LONG = 1000 * PPQ;

// Helper to create a minimal packet entering an edge
function packet(edgeId: string, midiNote = 60, hopCount?: number): Packet {
  return {
    id: `p${nextId++}` as PacketId,
    edgeId: edgeId as EdgeId,
    t: 0,
    payload: {
      freq: 440 as Frequency,
      midiNote: midiNote as MidiNote,
      wave: 'sine',
      timbre: 0,
      cutoff: 20000 as Frequency,
      gain: 0.5,
      holdTime: 0,
      releaseTime: 0.1,
    },
    hopCount,
    length: LONG,
    arrive: LONG,
  };
}

// ============================================================================
// filamentCapacity Tests
// ============================================================================

describe('filamentCapacity', () => {
  it('should hold one front per quarter beat', () => {
    expect(filamentCapacity(1 * PPQ)).toBe(4);
    expect(filamentCapacity(0.25 * PPQ)).toBe(1);
    expect(filamentCapacity(2 * PPQ)).toBe(8);
  });

  it('should round a length between quarter beats up', () => {
    expect(filamentCapacity(0.3 * PPQ)).toBe(2);
    expect(filamentCapacity(1.6 * PPQ)).toBe(7);
  });

  it('should hold one front on an edge of no length', () => {
    expect(filamentCapacity(0)).toBe(1);
  });

  it('should count in whole beat units, so a quarter beat is never lost to rounding', () => {
    expect(filamentCapacity(0.75 * PPQ)).toBe(3);
  });
});

// ============================================================================
// createRoom Tests
// ============================================================================

describe('createRoom', () => {
  let capacities: Map<string, number>;
  let room: FilamentRoom;
  let madeWay: Array<[PacketId, string]>;
  let at = 1;
  const record = (id: PacketId, edgeId: string) => { madeWay.push([id, edgeId]); };

  beforeEach(() => {
    capacities = new Map([['a', 2], ['b', 3]]);
    room = createRoom(edgeId => capacities.get(edgeId));
    madeWay = [];
    at = 1;
  });

  describe('fronts', () => {
    it('should count packets entering one edge at one time as one front', () => {
      expect(room.enter(packet('a', 60), null, record, at)).toBe(true);
      expect(room.enter(packet('a', 64), null, record, at)).toBe(true);
      expect(room.frontsOn('a')).toBe(1);
    });

    it('should start a new front at a later time', () => {
      room.enter(packet('a'), null, record, at);
      at += 1;
      room.enter(packet('a'), null, record, at);
      expect(room.frontsOn('a')).toBe(2);
    });

    it('should keep each edge apart', () => {
      room.enter(packet('a'), null, record, at);
      room.enter(packet('b'), null, record, at);
      expect(room.frontsOn('a')).toBe(1);
      expect(room.frontsOn('b')).toBe(1);
    });

    it('should collapse a unison in a front to its first packet', () => {
      const first = packet('a', 60);
      const second = packet('a', 60);
      expect(room.enter(first, null, record, at)).toBe(true);
      expect(room.enter(second, null, record, at)).toBe(false);
      expect(room.onFilament(first.id)).toBe(true);
      expect(room.onFilament(second.id)).toBe(false);
    });

    it('should let a unison enter at another time', () => {
      room.enter(packet('a', 60), null, record, at);
      at += 1;
      expect(room.enter(packet('a', 60), null, record, at)).toBe(true);
    });

    it('should free a front once its packets leave', () => {
      const p = packet('a');
      room.enter(p, null, record, at);
      room.leave(p.id);
      expect(room.frontsOn('a')).toBe(0);
      expect(room.onFilament(p.id)).toBe(false);
    });
  });

  describe('capacity', () => {
    it('should fill an edge without a fade', () => {
      room.enter(packet('a'), null, record, at);
      at += 1;
      room.enter(packet('a'), null, record, at);
      expect(room.frontsOn('a')).toBe(2);
      expect(madeWay).toEqual([]);
    });

    it('should make the oldest front fade when a front enters a full edge', () => {
      const old = packet('a', 60, 5);
      const young = packet('a', 62, 1);
      room.enter(old, null, record, at);
      at += 1;
      room.enter(young, null, record, at);
      at += 1;
      expect(room.enter(packet('a', 64, 0), null, record, at)).toBe(true);
      expect(madeWay).toEqual([[old.id, 'a']]);
      expect(room.onFilament(old.id)).toBe(false);
      expect(room.onFilament(young.id)).toBe(true);
      expect(room.frontsOn('a')).toBe(2);
    });

    it('should judge age by hops, not by entry', () => {
      const first = packet('a', 60, 1);
      const elder = packet('a', 62, 9);
      room.enter(first, null, record, at);
      at += 1;
      room.enter(elder, null, record, at);
      at += 1;
      room.enter(packet('a', 64, 0), null, record, at);
      expect(madeWay).toEqual([[elder.id, 'a']]);
    });

    it('should make the last entered fade among fronts equally old', () => {
      const head = packet('a', 60, 2);
      const tail = packet('a', 62, 2);
      room.enter(head, null, record, at);
      at += 1;
      room.enter(tail, null, record, at);
      at += 1;
      room.enter(packet('a', 64, 2), null, record, at);
      expect(madeWay).toEqual([[tail.id, 'a']]);
    });

    it('should count a manual spawn (no hop count) as new', () => {
      const manual = packet('a', 60, undefined);
      const hopped = packet('a', 62, 1);
      room.enter(manual, null, record, at);
      at += 1;
      room.enter(hopped, null, record, at);
      at += 1;
      room.enter(packet('a', 64, 0), null, record, at);
      expect(madeWay).toEqual([[hopped.id, 'a']]);
    });

    it('should make a whole front fade, never thin it apart', () => {
      const low = packet('a', 60, 3);
      const high = packet('a', 67, 3);
      room.enter(low, null, record, at);
      room.enter(high, null, record, at);
      at += 1;
      room.enter(packet('a', 62, 0), null, record, at);
      at += 1;
      room.enter(packet('a', 64, 0), null, record, at);
      expect(madeWay).toEqual([[low.id, 'a'], [high.id, 'a']]);
    });

    it('should never fade on an edge that no longer exists', () => {
      for (let i = 0; i < 10; i++) {
        at += 1;
        room.enter(packet('gone'), null, record, at);
      }
      expect(madeWay).toEqual([]);
      expect(room.frontsOn('gone')).toBe(10);
    });
  });

  describe('chords', () => {
    it('should make a new chord for two edges or more', () => {
      expect(room.chordFor(2)).not.toBeNull();
      expect(room.chordFor(3)).not.toBe(room.chordFor(3));
    });

    it('should keep the parent\'s chord along one edge', () => {
      const chord = room.chordFor(2);
      const parent = packet('a');
      room.enter(parent, chord, record, at);
      expect(room.chordFor(1, parent.id)).toBe(chord);
      expect(room.chordFor(0, parent.id)).toBe(chord);
    });

    it('should start fresh with no parent', () => {
      expect(room.chordFor(1)).toBeNull();
      expect(room.chordFor(1, 'unknown' as PacketId)).toBeNull();
    });

    it('should make a chord fade whole, wherever its packets are', () => {
      const chord = room.chordFor(2);
      const onA = packet('a', 60, 4);
      const onB = packet('b', 60, 4);
      room.enter(onA, chord, record, at);
      room.enter(onB, chord, record, at);
      at += 1;
      room.enter(packet('a', 62, 0), null, record, at);
      at += 1;
      room.enter(packet('a', 64, 0), null, record, at);
      expect(madeWay).toEqual([[onA.id, 'a'], [onB.id, 'b']]);
      expect(room.frontsOn('b')).toBe(0);
    });

    it('should not let a packet of a chord that made way enter', () => {
      const chord = room.chordFor(2);
      const onA = packet('a', 60, 4);
      room.enter(onA, chord, record, at);
      at += 1;
      room.enter(packet('a', 62, 0), null, record, at);
      at += 1;
      room.enter(packet('a', 64, 0), null, record, at);
      expect(room.enter(packet('b', 60, 5), chord, record, at)).toBe(false);
      expect(room.frontsOn('b')).toBe(0);
    });

    it('should keep a chord whose packets left before the fade', () => {
      const chord = room.chordFor(2);
      const onA = packet('a', 60, 4);
      const onB = packet('b', 60, 4);
      room.enter(onA, chord, record, at);
      room.enter(onB, chord, record, at);
      room.leave(onB.id);  // it arrived
      at += 1;
      room.enter(packet('a', 62, 0), null, record, at);
      at += 1;
      room.enter(packet('a', 64, 0), null, record, at);
      expect(madeWay).toEqual([[onA.id, 'a']]);
    });
  });

  describe('exact time', () => {
    it('should let a front leave at its exact exit', () => {
      capacities.set('one', 1);
      const first = { ...packet('one'), length: PPQ, arrive: PPQ };
      room.enter(first, null, record, 0);
      expect(room.enter({ ...packet('one'), length: PPQ, arrive: 2 * PPQ }, null, record, PPQ)).toBe(true);
      expect(madeWay).toEqual([]);  // the first had left as the second entered
    });

    it('should not make a packet arriving at the time of the fade make way', () => {
      const chord = room.chordFor(2);
      const onA = packet('a', 60, 5);
      const arriving = { ...packet('b', 60, 5), length: 3, arrive: at + 2 };
      room.enter(onA, chord, record, at);
      room.enter(arriving, chord, record, at);
      at += 1;
      room.enter(packet('a', 62, 0), null, record, at);
      at += 1;  // the chord's packet on b arrives now, as the fade comes
      room.enter(packet('a', 64, 0), null, record, at);
      expect(madeWay).toEqual([[onA.id, 'a']]);
      expect(room.onFilament(arriving.id)).toBe(true);
    });
  });

  describe('sync and clear', () => {
    it('should forget packets no longer in flight', () => {
      const kept = packet('a');
      const removed = packet('b');
      room.enter(kept, null, record, at);
      room.enter(removed, null, record, at);
      room.sync(id => id === kept.id);
      expect(room.frontsOn('a')).toBe(1);
      expect(room.frontsOn('b')).toBe(0);
      expect(room.onFilament(removed.id)).toBe(false);
    });

    it('should empty every edge', () => {
      room.enter(packet('a'), null, record, at);
      room.clear();
      expect(room.frontsOn('a')).toBe(0);
    });
  });
});
