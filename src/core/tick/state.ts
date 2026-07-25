// Tick State Module
// Manages tick system state variables

import type { ChannelSceneState } from './types';

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
