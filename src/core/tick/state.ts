// Tick State Module
// Manages tick system state variables

import type { ChannelSceneState } from './types';
import type { EdgeId, GraphEdge } from '../types';
import { getGraphStore } from '../store/getters';
import { dist, PPQ, toUnits } from '../constants';
import { createRoom, filamentCapacity, type FilamentRoom, type MadeWay } from './room';

// ============================================================================
// TICK STATE
// ============================================================================

let lastTime = 0;
let tickInterval: number | null = null;
let beatAccumulator = 0;     // Fractional beats accumulated

// ============================================================================
// THE BEAT CLOCK (exact time)
// ============================================================================

/** The beat clock: beat units at the end of the last step */
let beatNow = 0;
/** Its remainder, over CLOCK_DEN (60 s x 1e6 us x 100: a tempo kept to a hundredth of a BPM) */
let beatRem = 0;
const CLOCK_DEN = 6000000000;

export function getBeatNow(): number {
  return beatNow;
}

/**
 * The beat clock one step on: dt (seconds, rounded to whole microseconds) of
 * the tempo in beat units, the remainder carried; integers only (a 10 ms
 * step at 300 BPM stays well under 2^53). Returns the clock before the step.
 */
export function advanceClock(dtSeconds: number, bpm: number): number {
  const start = beatNow;
  const bpm100 = Math.floor(bpm * 100 + 0.5);
  const total = beatRem + bpm100 * PPQ * Math.round(dtSeconds * 1e6);
  const units = Math.floor(total / CLOCK_DEN);
  beatRem = total - units * CLOCK_DEN;
  beatNow += units;
  return start;
}

export function resetClock(): void {
  beatNow = 0;
  beatRem = 0;
}

// ============================================================================
// MULTI-CHANNEL SCENE STATE
// ============================================================================

/** Active channel scenes (excluding the one on canvas) */
const activeChannelScenes: Map<number, ChannelSceneState> = new Map();

/** Which channel is currently displayed on canvas (-1 for none/jam mode) */
let canvasChannelIndex: number = 0;

// ============================================================================
// ROOM ON A FILAMENT
// ============================================================================

/** The fronts on every edge of the canvas scene (see room.ts) */
const filamentRoom: FilamentRoom = createRoom((edgeId) => {
  const edge = getGraphStore().getEdge(edgeId as EdgeId);
  return edge ? filamentCapacity(edgeUnits(edge)) : undefined;
});

/** A packet that made way on a full filament leaves flight at once */
export const removeMadeWay: MadeWay = (id) => {
  getGraphStore().deletePacket(id);
};

/** An edge's length in beat units, as a packet entering it takes it */
export function edgeUnits(edge: GraphEdge): number {
  return toUnits(edgeBeats(edge));
}

/** An edge's length in beats, as the tick times it */
export function edgeBeats(edge: GraphEdge): number {
  if (edge.timingMode === 'fixed' && edge.durationBeats !== null) return edge.durationBeats;
  const store = getGraphStore();
  const fromNode = store.getNode(edge.from);
  const toNode = store.getNode(edge.to);
  if (!fromNode || !toNode) return 0;
  return dist(fromNode.x, fromNode.y, toNode.x, toNode.y) / store.globalSettings.pixelsPerBeat;
}

// ============================================================================
// STATE ACCESSORS
// ============================================================================

export function getLastTime(): number {
  return lastTime;
}

export function setLastTime(time: number): void {
  lastTime = time;
}

export function getTickInterval(): number | null {
  return tickInterval;
}

export function setTickInterval(interval: number | null): void {
  tickInterval = interval;
}

export function getBeatAccumulator(): number {
  return beatAccumulator;
}

export function setBeatAccumulator(value: number): void {
  beatAccumulator = value;
}

export function addToBeatAccumulator(delta: number): void {
  beatAccumulator += delta;
}

export function getActiveChannelScenes(): Map<number, ChannelSceneState> {
  return activeChannelScenes;
}

export function setActiveChannelScene(channelIndex: number, state: ChannelSceneState): void {
  activeChannelScenes.set(channelIndex, state);
}

export function deleteActiveChannelScene(channelIndex: number): void {
  activeChannelScenes.delete(channelIndex);
}

export function clearActiveChannelScenes(): void {
  activeChannelScenes.clear();
}

export function getCanvasChannelIndex(): number {
  return canvasChannelIndex;
}

export function setCanvasChannelIndex(index: number): void {
  canvasChannelIndex = index;
}

export function getFilamentRoom(): FilamentRoom {
  return filamentRoom;
}
