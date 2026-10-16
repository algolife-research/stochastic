// Room on a Filament
// The flow limit of loops: a filament holds so many fronts, and a front
// entering a full one makes the oldest on it fade. No random draws.
// Exact time (beat units, PPQ a beat): a front is the packets that entered a
// filament at one exact time, and it leaves at its exact exit.

import type { Packet, PacketId } from '../types';
import { FRONTS_PER_BEAT, PPQ } from '../constants';

// ============================================================================
// CAPACITY
// ============================================================================

/**
 * How many fronts a filament holds: one per quarter beat of its length (in
 * beat units), rounded up, at least one, so a stream of one front a quarter
 * beat fits it exactly. A front leaves at its exact exit, so no one more for
 * the front leaving as the next enters (as when a frame could sum late).
 */
export function filamentCapacity(units: number): number {
  return Math.max(1, Math.floor((FRONTS_PER_BEAT * units + PPQ - 1) / PPQ));
}

// ============================================================================
// FRONTS, ROOMS AND CHORDS
// ============================================================================

/**
 * The packets that entered one filament at one exact time: they count as one
 * and are never thinned apart. Its age is its eldest packet's hop count: the
 * nodes passed since its source or its last delay (a manual spawn has 0). It
 * leaves the filament at `exit`.
 */
interface Front {
  seq: number;              // entry order, over the whole run
  at: number;               // when it entered (beat units)
  exit: number;             // when it leaves: at + the filament's length
  left: boolean;            // past its exit: no longer taking room
  hops: number;
  alive: number;            // its packets still on the filament
  motes: PacketId[];
  notes: Set<number>;       // a second packet of one note does not enter
  room: Room;
}

/** A filament's fronts in entry order (the dead dropped lazily), how many are still on it, and the first that may not have left. */
interface Room {
  fronts: Front[];
  live: number;
  head: number;
}

/**
 * A chord: the packets one split put on two edges or more at one time (a
 * splitter's edges from one arriving packet, a teleporter's exits, a source's
 * emission or a manual spawn down several edges, a delay's release, a
 * crossover's offspring). A packet passed on along one edge (a quantizer, a
 * speaker, a gate, a splitter that chose one edge) stays in its parent's
 * chord; a new split starts a new chord; a delay's release and a crossover's
 * offspring start fresh. When a front makes way, every chord in it makes way
 * whole, wherever its packets are, and any of them passed on later does not
 * enter.
 */
export interface Chord {
  members: PacketId[];      // every packet that entered with it (those off a filament dropped lazily)
  alive: number;            // its packets on a filament now
  gone: boolean;            // it made way
}

/** What the room keeps of a packet: where it is, when it arrives, and the chord it belongs to. */
interface Mote {
  edgeId: string;
  arrive: number;
  front: Front | null;      // null once it left its filament
  chord: Chord | null;
}

/** A packet that made way: called once per packet, the full filament's first. */
export type MadeWay = (id: PacketId, edgeId: string) => void;

export type EnteringPacket = Pick<Packet, 'id' | 'edgeId' | 'payload' | 'hopCount' | 'length' | 'arrive'>;

// ============================================================================
// THE ROOM
// ============================================================================

/**
 * Creates the room on every filament.
 * @param capacityOf - Fronts an edge holds (filamentCapacity), or undefined
 *   for an edge that no longer exists (nothing fades there)
 */
export function createRoom(capacityOf: (edgeId: string) => number | undefined) {
  const rooms = new Map<string, Room>();
  const motes = new Map<PacketId, Mote>();
  let nextFront = 1;

  /** A packet leaves its filament (it arrived, expired, made way or was removed). */
  function leave(id: PacketId): void {
    const mote = motes.get(id);
    if (!mote || !mote.front) return;
    const front = mote.front;
    mote.front = null;
    front.alive -= 1;
    if (front.alive === 0 && !front.left) front.room.live -= 1;
    const chord = mote.chord;
    if (chord) {
      chord.alive -= 1;
      if (chord.alive === 0) chord.members.length = 0;  // none on a filament: nothing to hold
    }
  }

  function onFilament(id: PacketId): boolean {
    return motes.get(id)?.front != null;
  }

  /**
   * The oldest front on a full filament makes way at `at`: its packets
   * leave, and with them every packet of the chords they belong to, on
   * whatever filament. The oldest has the most hops since its source or its
   * last delay; among fronts equally old the last entered makes way, so a
   * stream denser than the room (all of one age) is thinned at its tail while
   * its head still arrives. A packet arriving at `at` or before (its own
   * filament's end reached: off it, exactly) is not made to make way.
   */
  function fade(room: Room, madeWay: MadeWay, at: number): void {
    let oldest: Front | null = null;
    for (const front of room.fronts) {
      if (front.alive === 0 || front.left) continue;
      if (!oldest || front.hops > oldest.hops || (front.hops === oldest.hops && front.seq > oldest.seq)) {
        oldest = front;
      }
    }
    if (!oldest) return;
    const chords: Chord[] = [];
    const makeWay = (id: PacketId) => {
      const mote = motes.get(id);
      if (!mote) return;
      leave(id);
      madeWay(id, mote.edgeId);
    };
    for (const id of oldest.motes) {
      const mote = motes.get(id);
      if (!mote || mote.front !== oldest) continue;
      const chord = mote.chord;
      if (chord && !chord.gone) {
        chord.gone = true;
        chords.push(chord);
      }
      makeWay(id);
    }
    for (const chord of chords) {
      for (const id of [...chord.members]) {
        const mote = motes.get(id);
        if (mote && mote.front && mote.arrive > at) makeWay(id);
      }
      chord.members.length = 0;
    }
  }

  return {
    /**
     * The chord a split's packets enter with: a new one for two edges or
     * more, else the parent's (null for a fresh start: a source, a delay, a
     * crossover's offspring).
     */
    chordFor(ways: number, parentId?: PacketId): Chord | null {
      if (ways >= 2) return { members: [], alive: 0, gone: false };
      return parentId !== undefined ? motes.get(parentId)?.chord ?? null : null;
    },

    /**
     * A packet enters its filament at `at` (every spawn). Fronts whose exit is
     * past by then have left. It joins the front that entered at that same
     * time, unless that front already carries its note (a unison collapses:
     * the first entered stays); else it starts a new front, and if the
     * filament is full the oldest front on it fades first. A packet of a
     * chord that made way does not enter.
     * @returns false if the packet does not enter
     */
    enter(packet: EnteringPacket, chord: Chord | null, madeWay: MadeWay, at: number): boolean {
      if (chord?.gone) return false;
      let room = rooms.get(packet.edgeId);
      if (!room) {
        room = { fronts: [], live: 0, head: 0 };
        rooms.set(packet.edgeId, room);
      }
      while (room.head < room.fronts.length && room.fronts[room.head]!.exit <= at) {
        const gone = room.fronts[room.head]!;
        if (!gone.left) {
          gone.left = true;
          if (gone.alive > 0) room.live -= 1;
        }
        room.head += 1;
      }
      const note = Math.trunc(packet.payload.midiNote ?? -1);
      let front = room.fronts.length > 0 ? room.fronts[room.fronts.length - 1]! : null;
      if (front && front.at === at && front.alive > 0 && !front.left) {
        if (front.notes.has(note)) return false;
      } else {
        const capacity = capacityOf(packet.edgeId);
        if (capacity !== undefined && room.live >= capacity) fade(room, madeWay, at);
        if (room.fronts.length > 2 * room.live + 8) {
          room.fronts = room.fronts.filter(f => f.alive > 0 && !f.left);  // the dead dropped now and then
          room.head = 0;
        }
        front = { seq: nextFront++, at, exit: at + (packet.length ?? 0), left: false, hops: 0, alive: 0, motes: [], notes: new Set(), room };
        room.fronts.push(front);
        room.live += 1;
      }
      front.notes.add(note);
      front.alive += 1;
      front.motes.push(packet.id);
      front.hops = Math.max(front.hops, packet.hopCount ?? 0);
      motes.set(packet.id, { edgeId: packet.edgeId, arrive: packet.arrive ?? at, front, chord });
      if (chord) {
        if (chord.members.length > 2 * chord.alive + 8) {
          chord.members = chord.members.filter(id => onFilament(id));  // those off a filament dropped now and then
        }
        chord.members.push(packet.id);
        chord.alive += 1;
      }
      return true;
    },

    leave,
    onFilament,

    /** How many fronts are on an edge now. */
    frontsOn(edgeId: string): number {
      return rooms.get(edgeId)?.live ?? 0;
    },

    /**
     * Forgets the packets no longer in flight (removed by an edit, a stop, a
     * scene change, or gone since the last sync): those still on a filament
     * leave it.
     */
    sync(inFlight: (id: PacketId) => boolean): void {
      for (const id of [...motes.keys()]) {
        if (inFlight(id)) continue;
        leave(id);
        motes.delete(id);
      }
    },

    /** Empties every filament. */
    clear(): void {
      rooms.clear();
      motes.clear();
    },
  };
}

export type FilamentRoom = ReturnType<typeof createRoom>;
