// Tick State Module
// Manages tick system state variables

import type { ChannelSceneState } from './types';
import type { EdgeId, GraphEdge } from '../types';
import { getGraphStore } from '../store/getters';
import { dist } from '../constants';
import { createRoom, filamentCapacity, type FilamentRoom, type MadeWay } from './room';

// ============================================================================
// TICK STATE
// ============================================================================

let lastTime = 0;
let tickInterval: number | null = null;
let beatAccumulator = 0;     // Fractional beats accumulated

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
  return edge ? filamentCapacity(edgeBeats(edge)) : undefined;
});

/** A packet that made way on a full filament leaves flight at once */
export const removeMadeWay: MadeWay = (id) => {
  getGraphStore().deletePacket(id);
};

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
