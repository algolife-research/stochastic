// Packet Movement Module
// The step's events, in order of exact time (beat units, PPQ a beat): a
// source's release, a packet dying of hops or age in flight, a packet's
// arrival at its edge's end, a delay's or crossover's release. A packet
// arrives at depart + its edge's length, and its next edge departs then (the
// overshoot kept); ties at one time keep the old frame order (sources,
// expiries, arrivals in the order the packets entered, releases).

import { getGraphStore } from '../store';
import type { Packet, GraphNode, GraphEdge, PacketId, NodeId, CrossoverProps, AudioPayload } from '../types';
import { createPacketId } from '../types';
import {
  MAX_PACKETS, MAX_PACKET_HOPS, MAX_PACKET_AGE_BEATS, MAX_HOPS_PER_STEP, PPQ, secondsOf,
} from '../constants';
import { processNodeArrival, getTeleporterExits, consumePendingTunnelSpeakers, setArrivalMoment, clearArrivalMoment } from '../engine';
import { audioEngine } from '@audio/engine';
import { syncEntangledPayloads, performCrossover } from './crossover';
import { getFilamentRoom, removeMadeWay, edgeUnits } from './state';
import type { Chord } from './room';
import { gatherSources, sourcePayload, type SourceProps } from './sources';

// ============================================================================
// THE STEP'S EVENTS
// ============================================================================

const SOURCE = 0;
const EXPIRE = 1;
const ARRIVE = 2;
const RELEASE = 3;

/** [at, kind, seq, a (a node or packet id), b (a hold's id)] */
type StepEvent = [number, number, number, string | number, number];

let queue: StepEvent[] = [];
let seq = 0;
let windowEnd = 0;
let stepping = false;
/** Hops each packet's line took inside the current step (MAX_HOPS_PER_STEP) */
const stepHops = new Map<PacketId, number>();

function before(a: StepEvent, b: StepEvent): boolean {
  if (a[0] !== b[0]) return a[0] < b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
}

/** An event into the step's queue, in its place */
function push(at: number, kind: number, a: string | number, b: number = 0): void {
  seq += 1;
  const event: StepEvent = [at, kind, seq, a, b];
  let lo = 0;
  let hi = queue.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (before(queue[mid]!, event)) lo = mid + 1;
    else hi = mid;
  }
  queue.splice(lo, 0, event);
}

/**
 * A packet's next event, if it is due in this step: it dies (of hops, at its
 * departure; of age, MAX_PACKET_AGE_BEATS after its birth) before it would
 * arrive, or it arrives.
 */
function schedule(packet: Packet): void {
  const arrive = packet.arrive ?? 0;
  let dies = -1;
  if (packet.hopCount !== undefined && packet.hopCount >= MAX_PACKET_HOPS) dies = packet.depart ?? 0;
  if (packet.birthTime !== undefined) {
    const old = packet.birthTime + MAX_PACKET_AGE_BEATS * PPQ;
    dies = dies < 0 ? old : Math.min(dies, old);
  }
  if (dies >= 0 && dies < arrive) {
    if (dies <= windowEnd) push(dies, EXPIRE, packet.id);
  } else if (arrive <= windowEnd) {
    push(arrive, ARRIVE, packet.id);
  }
}

type Metadata = { hopCount?: number; visitedEdges?: string[]; birthTime?: number };

/** Metadata for a packet passed on from a parent at `at` (or fresh, from a source) */
function createPacketMetadata(at: number, parent?: Packet, edgeId?: string): Metadata {
  if (parent) {
    const visitedEdges = [...(parent.visitedEdges ?? [])];
    if (edgeId) visitedEdges.push(edgeId);
    return { hopCount: (parent.hopCount ?? 0) + 1, visitedEdges, birthTime: parent.birthTime ?? at };
  }
  return { hopCount: 0, visitedEdges: edgeId ? [edgeId] : [], birthTime: at };
}

/**
 * A new packet onto an edge at `at`, or null if it does not enter (a unison
 * of its front, or a chord that made way). It is in flight at once, and its
 * next event is queued if it falls in this step.
 */
function addPacket(edgeId: string, payload: AudioPayload, meta: Metadata, chord: Chord | null, at: number,
    hops: number = 0, group?: string): Packet | null {
  const edge = getGraphStore().getEdge(edgeId as never);
  const length = edge ? edgeUnits(edge) : 0;
  const packet: Packet = {
    id: createPacketId(),
    edgeId: edgeId as never,
    t: 0,
    payload,
    depart: at,
    length,
    arrive: at + length,
  };
  if (group !== undefined) packet.entanglementGroupId = group;
  if (meta.hopCount !== undefined) packet.hopCount = meta.hopCount;
  if (meta.visitedEdges !== undefined) packet.visitedEdges = meta.visitedEdges;
  if (meta.birthTime !== undefined) packet.birthTime = meta.birthTime;
  if (!getFilamentRoom().enter(packet, chord, removeMadeWay, at)) return null;
  getGraphStore().addPacket(packet);
  stepHops.set(packet.id, hops);
  if (stepping && hops <= MAX_HOPS_PER_STEP) schedule(packet);
  return packet;
}

/** A packet made at `at` outside a step (a manual spawn): its edge's length taken, nothing queued */
export function timedPacket(packet: Packet, at: number): Packet {
  const edge = getGraphStore().getEdge(packet.edgeId);
  const length = edge ? edgeUnits(edge) : 0;
  return { ...packet, depart: at, length, arrive: at + length };
}

function bpmNow(): number {
  const store = getGraphStore();
  return store.scenePlayback.effectiveBpm || store.masterSpeed;
}

// ============================================================================
// THE STEP
// ============================================================================

/**
 * One step's events, in order of exact time: every release due in (start,
 * end], every packet arriving or dying by `end`, every hold released by
 * `end`, and what they set going inside the window.
 */
export function runEvents(start: number, end: number): void {
  windowEnd = end;
  stepping = true;
  queue = [];
  stepHops.clear();
  gatherSources(start, end, (nodeId, at) => push(at, SOURCE, nodeId));
  getGraphStore().packets.forEach((packet) => {
    stepHops.set(packet.id, 0);
    schedule(packet);
  });
  getGraphStore().nodes.forEach((node) => {
    if (node.type !== 'delay' && node.type !== 'crossover') return;  // a crossover's parent whose wait ran out passes on
    for (const held of node.heldPackets ?? []) {
      if ((held.releaseAt ?? 0) <= end) push(held.releaseAt ?? 0, RELEASE, node.id, held.heldId ?? 0);
    }
  });
  queue.sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0));
  while (queue.length > 0) {
    const event = queue.shift()!;
    switch (event[1]) {
      case SOURCE: releaseSource(event[3] as NodeId, event[0]); break;
      case EXPIRE: expire(event[3] as PacketId); break;
      case ARRIVE: arrive(event[3] as PacketId, event[0]); break;
      case RELEASE: releaseHeld(event[3] as NodeId, event[4], event[0]); break;
    }
  }
  const positions: Array<[PacketId, number]> = [];
  getGraphStore().packets.forEach((packet) => {
    const t = ((end - (packet.depart ?? 0)) / Math.max(packet.length ?? 0, 1));
    positions.push([packet.id, Math.min(1, Math.max(0, t))]);
  });
  getGraphStore().batchUpdatePacketPositions(positions);
  stepping = false;
}

/** A source's release at `at`: one packet down every edge, a chord down two or more */
function releaseSource(nodeId: NodeId, at: number): void {
  if (getGraphStore().packets.size >= MAX_PACKETS) return;
  const node = getGraphStore().getNode(nodeId);
  if (!node) return;
  const payload = sourcePayload(node.props as SourceProps);
  const outgoingEdges = getGraphStore().getOutgoingEdges(nodeId);
  const chord = getFilamentRoom().chordFor(outgoingEdges.length);
  outgoingEdges.forEach(edge => {
    if (getGraphStore().packets.size >= MAX_PACKETS) return;
    addPacket(edge.id, { ...payload }, { hopCount: 0, visitedEdges: [edge.id], birthTime: at }, chord, at);
  });
  getGraphStore().flashNode(nodeId);
}

/** A packet dies of hops or age in flight */
function expire(id: PacketId): void {
  if (!getGraphStore().packets.has(id)) return;  // it made way first
  getGraphStore().deletePacket(id);
  getFilamentRoom().leave(id);
}

/** A tunnel's inner speakers sound as the packet passes them, after the node's own hit */
function innerSpeakers(at: number): void {
  consumePendingTunnelSpeakers().forEach(({ payload, speakerProps }) => {
    const volume = (speakerProps.volume as number) ?? 1;
    const reverb = (speakerProps.reverb as number) ?? 0.3;
    const pan = (speakerProps.pan as number) ?? 0;
    audioEngine.playNote({ ...payload, gain: payload.gain * volume }, { reverb, pan, at: secondsOf(at, bpmNow()), late: secondsOf(windowEnd - at, bpmNow()) });
  });
}

/** A packet arrives at its edge's end at `at`: what the node does to it, and its children onto the node's edges from `at` */
function arrive(id: PacketId, at: number): void {
  const store = getGraphStore();
  const packet = store.packets.get(id);
  if (!packet) return;  // it made way, or was removed, first
  store.deletePacket(id);
  const room = getFilamentRoom();
  room.leave(id);  // off its filament: it no longer takes room there
  const edge = getGraphStore().getEdge(packet.edgeId);
  const node = edge ? getGraphStore().getNode(edge.to) : undefined;
  if (!edge || !node || !getGraphStore().getNode(edge.from)) return;
  const hops = (stepHops.get(id) ?? 0) + 1;
  getGraphStore().flashNode(node.id);

  // Modulation edges (CV routing): the value is written into the prop, nothing travels on
  const typedEdge = edge as GraphEdge & { targetParam?: string | null };
  if (typedEdge.targetParam) {
    const value = packet.payload.modulationValue !== undefined ? packet.payload.modulationValue : packet.payload.gain;
    const currentProps = { ...node.props } as Record<string, unknown>;
    currentProps[typedEdge.targetParam] = value;
    getGraphStore().updateNode(node.id, { props: currentProps } as unknown as Partial<GraphNode>);
    getGraphStore().updateNode(node.id, { flash: 0.5 } as Partial<GraphNode>);
    return;
  }

  setArrivalMoment(at, room.chordOf(id));
  const processedPayload = processNodeArrival(packet, node, edge);
  clearArrivalMoment();

  // Gates mark blocked packets with a negative-gain sentinel; tunnels forward
  // it when an internal sub-gate blocks. Both are dropped here.
  if ((node.type === 'gate' || node.type === 'tunnel') && processedPayload.gain < 0) {
    innerSpeakers(at);
    return;
  }
  // A turning crystal's rest: the packet goes no further
  if (node.type === 'pitch' && processedPayload.gain < 0) return;

  if (node.type === 'speaker') {
    const speakerProps = node.props as { volume?: number; reverb?: number; pan?: number; holdTime?: number; releaseTime?: number };
    const finalPayload = {
      ...processedPayload,
      gain: processedPayload.gain * (speakerProps.volume ?? 1),
      holdTime: speakerProps.holdTime ?? processedPayload.holdTime,
      releaseTime: speakerProps.releaseTime ?? processedPayload.releaseTime,
    };
    audioEngine.playNote(finalPayload, { reverb: speakerProps.reverb ?? 0.3, pan: speakerProps.pan ?? 0, at: secondsOf(at, bpmNow()), late: secondsOf(windowEnd - at, bpmNow()) });
  }

  if (node.type === 'teleporter') {
    const props = node.props as { channel: string; isEntry: boolean };
    if (props.isEntry) {
      const exits = getTeleporterExits(props.channel).filter(exitId => getGraphStore().getNode(exitId) !== undefined);
      // Every exit's edges are one split: a chord kept or lost whole
      let ways = 0;
      exits.forEach(exitId => { ways += getGraphStore().getOutgoingEdges(exitId).length; });
      const chord = room.chordFor(ways, packet.id);
      exits.forEach(exitId => {
        getGraphStore().getOutgoingEdges(exitId).forEach(outEdge => {
          if (getGraphStore().packets.size >= MAX_PACKETS) return;
          addPacket(outEdge.id, { ...processedPayload }, createPacketMetadata(at, packet, outEdge.id), chord, at, hops,
            packet.entanglementGroupId);
        });
      });
      innerSpeakers(at);
      return;
    }
  }

  if (node.type === 'delay') {
    hold(node.id, packet.payload, (node.props as { delayTime: number }).delayTime, at);
    return;
  }

  if (node.type === 'crossover') {
    const props = node.props as CrossoverProps;
    const heldPackets = node.heldPackets ?? [];
    if (heldPackets.length === 0) {
      // First parent - hold and wait for second
      hold(node.id, packet.payload, props.timeout ?? 4, at);
      return;
    }
    const firstHeld = heldPackets[0]!;
    getGraphStore().releaseHeldById(node.id, firstHeld.heldId ?? 0);
    if (at < (firstHeld.releaseAt ?? 0)) {
      // The second parent: their offspring goes on, not they (new: no parent's chord)
      const offspring = performCrossover(firstHeld.payload, packet.payload, props);
      const outgoingEdges = getGraphStore().getOutgoingEdges(node.id);
      const brood = room.chordFor(outgoingEdges.length);
      outgoingEdges.forEach(outEdge => {
        if (getGraphStore().packets.size >= MAX_PACKETS) return;
        addPacket(outEdge.id, { ...offspring }, createPacketMetadata(at, packet, outEdge.id), brood, at, hops);
      });
      return;
    }
    // The first had waited too long: this one passes through as it is.
  }

  // Splitter entanglement and routing
  let entanglementGroupId = packet.entanglementGroupId;
  let targetEdges = getGraphStore().getOutgoingEdges(node.id);
  if (node.type === 'splitter') {
    const props = node.props as { entangled?: boolean; behavior?: 'broadcast' | 'random' | 'weighted' };
    if (props.entangled) entanglementGroupId = crypto.randomUUID();  // a new group for what it splits
    if (props.behavior === 'random') {
      if (targetEdges.length > 0) {
        const selected = targetEdges[Math.floor(Math.random() * targetEdges.length)];
        if (selected) targetEdges = [selected];
      }
    } else if (props.behavior === 'weighted') {
      if (targetEdges.length > 0) {
        let totalWeight = 0;
        for (const e of targetEdges) totalWeight += (e.weight ?? 1);
        let r = Math.random() * totalWeight;
        let selectedEdge = targetEdges[0];
        for (const e of targetEdges) {
          r -= (e.weight ?? 1);
          if (r <= 0) {
            selectedEdge = e;
            break;
          }
        }
        if (selectedEdge) targetEdges = [selectedEdge];
      }
    }
  }

  // Two edges or more make a new chord; one keeps the parent's
  const chord = room.chordFor(targetEdges.length, packet.id);

  // The twins still in flight take this payload
  if (packet.entanglementGroupId && node.type !== 'speaker' && node.type !== 'splitter') {
    syncEntangledPayloads(packet.entanglementGroupId, processedPayload, at);
  }

  targetEdges.forEach(outEdge => {
    if (getGraphStore().packets.size >= MAX_PACKETS) return;
    addPacket(outEdge.id, { ...processedPayload }, createPacketMetadata(at, packet, outEdge.id), chord, at, hops,
      entanglementGroupId);
  });
  innerSpeakers(at);
}

/** A packet held at a delay (its hold) or a crossover (its wait), in beats: released at `at` + that, exactly */
function hold(nodeId: NodeId, payload: AudioPayload, beats: number, at: number): void {
  const heldId = getGraphStore().holdPacketAtNode(nodeId, payload, beats, at);
  const held = getGraphStore().getNode(nodeId)?.heldPackets.find(h => h.heldId === heldId);
  if (stepping && held && (held.releaseAt ?? 0) <= windowEnd) push(held.releaseAt ?? 0, RELEASE, nodeId, heldId);
}

/** A held packet released: fresh onto every edge (no inherited hops or history), a chord of its own */
function releaseHeld(nodeId: NodeId, heldId: number, at: number): void {
  const node = getGraphStore().getNode(nodeId);
  const held = node?.heldPackets.find(h => h.heldId === heldId);
  if (!node || !held) return;  // a crossover's second parent took it first
  const outgoingEdges = getGraphStore().getOutgoingEdges(nodeId);
  const chord = getFilamentRoom().chordFor(outgoingEdges.length);  // a delay renews: its release is a chord of its own
  outgoingEdges.forEach(edge => {
    if (getGraphStore().packets.size >= MAX_PACKETS) return;
    addPacket(edge.id, { ...held.payload }, { hopCount: 0, visitedEdges: [edge.id], birthTime: at }, chord, at);
  });
  getGraphStore().flashNode(nodeId);
  getGraphStore().releaseHeldById(nodeId, heldId);
}

// ============================================================================
// NODE UPDATES
// ============================================================================

/**
 * Update node flash decay
 */
export function updateNodeFlash(deltaTime: number): void {
  // Batched: one store update decays every node's flash for the frame
  getGraphStore().decayNodeFlashes(deltaTime);
}
