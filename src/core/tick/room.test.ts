// Room on a Filament Tests
// Unit tests for the flow limit of loops: fronts, capacity, fades and chords

import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, filamentCapacity, type FilamentRoom } from './room';
import type { Packet, PacketId, EdgeId, MidiNote, Frequency } from '../types';

let nextId = 1;

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
  };
}

// ============================================================================
// filamentCapacity Tests
// ============================================================================

describe('filamentCapacity', () => {
  it('should hold one front per quarter beat, plus one leaving', () => {
    expect(filamentCapacity(1)).toBe(5);
    expect(filamentCapacity(0.25)).toBe(2);
    expect(filamentCapacity(2)).toBe(9);
  });

  it('should round a length between quarter beats down', () => {
    expect(filamentCapacity(0.3)).toBe(2);
    expect(filamentCapacity(1.6)).toBe(7);
  });

  it('should hold one front on an edge of no length', () => {
    expect(filamentCapacity(0)).toBe(1);
  });

  it('should not lose a quarter beat to rounding', () => {
    expect(filamentCapacity(0.1 + 0.2 + 0.45)).toBe(4);  // 0.75 summed in floats
  });
});

// ============================================================================
// createRoom Tests
// ============================================================================

describe('createRoom', () => {
  let capacities: Map<string, number>;
  let room: FilamentRoom;
  let madeWay: Array<[PacketId, string]>;
  const record = (id: PacketId, edgeId: string) => { madeWay.push([id, edgeId]); };

  beforeEach(() => {
    capacities = new Map([['a', 2], ['b', 3]]);
    room = createRoom(edgeId => capacities.get(edgeId));
    madeWay = [];
    room.beginFrame();
  });

  describe('fronts', () => {
    it('should count packets entering one edge on one frame as one front', () => {
      expect(room.enter(packet('a', 60), null, record)).toBe(true);
      expect(room.enter(packet('a', 64), null, record)).toBe(true);
      expect(room.frontsOn('a')).toBe(1);
    });

    it('should start a new front on the next frame', () => {
      room.enter(packet('a'), null, record);
      room.beginFrame();
      room.enter(packet('a'), null, record);
      expect(room.frontsOn('a')).toBe(2);
    });

    it('should keep each edge apart', () => {
      room.enter(packet('a'), null, record);
      room.enter(packet('b'), null, record);
      expect(room.frontsOn('a')).toBe(1);
      expect(room.frontsOn('b')).toBe(1);
    });

    it('should collapse a unison in a front to its first packet', () => {
      const first = packet('a', 60);
      const second = packet('a', 60);
      expect(room.enter(first, null, record)).toBe(true);
      expect(room.enter(second, null, record)).toBe(false);
      expect(room.onFilament(first.id)).toBe(true);
      expect(room.onFilament(second.id)).toBe(false);
    });

    it('should let a unison enter on another frame', () => {
      room.enter(packet('a', 60), null, record);
      room.beginFrame();
      expect(room.enter(packet('a', 60), null, record)).toBe(true);
    });

    it('should free a front once its packets leave', () => {
      const p = packet('a');
      room.enter(p, null, record);
      room.leave(p.id);
      expect(room.frontsOn('a')).toBe(0);
      expect(room.onFilament(p.id)).toBe(false);
    });
  });

  describe('capacity', () => {
    it('should fill an edge without a fade', () => {
      room.enter(packet('a'), null, record);
      room.beginFrame();
      room.enter(packet('a'), null, record);
      expect(room.frontsOn('a')).toBe(2);
      expect(madeWay).toEqual([]);
    });

    it('should make the oldest front fade when a front enters a full edge', () => {
      const old = packet('a', 60, 5);
      const young = packet('a', 62, 1);
      room.enter(old, null, record);
      room.beginFrame();
      room.enter(young, null, record);
      room.beginFrame();
      expect(room.enter(packet('a', 64, 0), null, record)).toBe(true);
      expect(madeWay).toEqual([[old.id, 'a']]);
      expect(room.onFilament(old.id)).toBe(false);
      expect(room.onFilament(young.id)).toBe(true);
      expect(room.frontsOn('a')).toBe(2);
    });

    it('should judge age by hops, not by entry', () => {
      const first = packet('a', 60, 1);
      const elder = packet('a', 62, 9);
      room.enter(first, null, record);
      room.beginFrame();
      room.enter(elder, null, record);
      room.beginFrame();
      room.enter(packet('a', 64, 0), null, record);
      expect(madeWay).toEqual([[elder.id, 'a']]);
    });

    it('should make the last entered fade among fronts equally old', () => {
      const head = packet('a', 60, 2);
      const tail = packet('a', 62, 2);
      room.enter(head, null, record);
      room.beginFrame();
      room.enter(tail, null, record);
      room.beginFrame();
      room.enter(packet('a', 64, 2), null, record);
      expect(madeWay).toEqual([[tail.id, 'a']]);
    });

    it('should count a manual spawn (no hop count) as new', () => {
      const manual = packet('a', 60, undefined);
      const hopped = packet('a', 62, 1);
      room.enter(manual, null, record);
      room.beginFrame();
      room.enter(hopped, null, record);
      room.beginFrame();
      room.enter(packet('a', 64, 0), null, record);
      expect(madeWay).toEqual([[hopped.id, 'a']]);
    });

    it('should make a whole front fade, never thin it apart', () => {
      const low = packet('a', 60, 3);
      const high = packet('a', 67, 3);
      room.enter(low, null, record);
      room.enter(high, null, record);
      room.beginFrame();
      room.enter(packet('a', 62, 0), null, record);
      room.beginFrame();
      room.enter(packet('a', 64, 0), null, record);
      expect(madeWay).toEqual([[low.id, 'a'], [high.id, 'a']]);
    });

    it('should never fade on an edge that no longer exists', () => {
      for (let i = 0; i < 10; i++) {
        room.beginFrame();
        room.enter(packet('gone'), null, record);
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
      room.enter(parent, chord, record);
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
      room.enter(onA, chord, record);
      room.enter(onB, chord, record);
      room.beginFrame();
      room.enter(packet('a', 62, 0), null, record);
      room.beginFrame();
      room.enter(packet('a', 64, 0), null, record);
      expect(madeWay).toEqual([[onA.id, 'a'], [onB.id, 'b']]);
      expect(room.frontsOn('b')).toBe(0);
    });

    it('should not let a packet of a chord that made way enter', () => {
      const chord = room.chordFor(2);
      const onA = packet('a', 60, 4);
      room.enter(onA, chord, record);
      room.beginFrame();
      room.enter(packet('a', 62, 0), null, record);
      room.beginFrame();
      room.enter(packet('a', 64, 0), null, record);
      expect(room.enter(packet('b', 60, 5), chord, record)).toBe(false);
      expect(room.frontsOn('b')).toBe(0);
    });

    it('should keep a chord whose packets left before the fade', () => {
      const chord = room.chordFor(2);
      const onA = packet('a', 60, 4);
      const onB = packet('b', 60, 4);
      room.enter(onA, chord, record);
      room.enter(onB, chord, record);
      room.leave(onB.id);  // it arrived
      room.beginFrame();
      room.enter(packet('a', 62, 0), null, record);
      room.beginFrame();
      room.enter(packet('a', 64, 0), null, record);
      expect(madeWay).toEqual([[onA.id, 'a']]);
    });
  });

  describe('sync and clear', () => {
    it('should forget packets no longer in flight', () => {
      const kept = packet('a');
      const removed = packet('b');
      room.enter(kept, null, record);
      room.enter(removed, null, record);
      room.sync(id => id === kept.id);
      expect(room.frontsOn('a')).toBe(1);
      expect(room.frontsOn('b')).toBe(0);
      expect(room.onFilament(removed.id)).toBe(false);
    });

    it('should empty every edge', () => {
      room.enter(packet('a'), null, record);
      room.clear();
      expect(room.frontsOn('a')).toBe(0);
    });
  });
});
