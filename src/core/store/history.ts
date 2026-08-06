// Canvas Edit History (undo/redo)
//
// Snapshot-based history of the canvas content (nodes, edges, annotations,
// regions). A debounced subscriber captures a snapshot after each burst of
// edits; undo/redo restore snapshots through loadGraph and re-save the scene.
//
// Design constraints:
// - Runtime fields (timer, flash, heldPackets, ...) are stripped so playback
//   activity does not pollute history.
// - Capture is paused while the transport is running: LFOs and CV edges write
//   node props continuously during playback, which would flood the stack.
//   Edits made while playing collapse into one entry when playback stops.
// - History resets when the canvas switches to a different scene; undo never
//   crosses scene boundaries (it would restore one scene's content into
//   another).

import { useGraphStore } from './index';
import type { GraphNode, GraphEdge, Annotation, Region } from '../types';

interface CanvasSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  annotations: Annotation[];
  regions: Region[];
}

interface HistoryEntry {
  snapshot: CanvasSnapshot;
  signature: string;
}

const MAX_HISTORY = 50;
const CAPTURE_DEBOUNCE_MS = 350;

let past: HistoryEntry[] = [];
let future: HistoryEntry[] = [];
let current: HistoryEntry | null = null;
let restoring = false;
let captureTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function takeSnapshot(): HistoryEntry {
  const state = useGraphStore.getState();
  const snapshot: CanvasSnapshot = {
    nodes: Array.from(state.nodes.values()).map(node => ({
      ...(JSON.parse(JSON.stringify(node)) as GraphNode),
      timer: 0,
      lastTrigger: 0,
      flash: 0,
      heldPackets: [],
    })),
    edges: Array.from(state.edges.values()).map(edge => ({ ...edge })),
    annotations: Array.from(state.annotations.values()).map(a => ({ ...a })),
    regions: Array.from(state.regions.values()).map(r => ({ ...r })),
  };
  return { snapshot, signature: JSON.stringify(snapshot) };
}

function capture(): void {
  captureTimer = null;
  const state = useGraphStore.getState();
  if (restoring || state.isRunning) return;

  const entry = takeSnapshot();
  if (current && entry.signature === current.signature) return;

  if (current) {
    past.push(current);
    if (past.length > MAX_HISTORY) past.shift();
  }
  future = [];
  current = entry;
}

function scheduleCapture(): void {
  if (restoring) return;
  if (captureTimer !== null) clearTimeout(captureTimer);
  captureTimer = setTimeout(capture, CAPTURE_DEBOUNCE_MS);
}

/** Run any pending capture now so the latest edit becomes undoable. */
function flushPendingCapture(): void {
  if (captureTimer !== null) {
    clearTimeout(captureTimer);
    capture();
  }
}

function restore(entry: HistoryEntry): void {
  restoring = true;
  try {
    const store = useGraphStore.getState();
    store.loadGraph(
      entry.snapshot.nodes,
      entry.snapshot.edges,
      entry.snapshot.annotations,
      entry.snapshot.regions
    );
    store.markDirty();
    store.saveCurrentScene();
  } finally {
    restoring = false;
  }
}

export function undo(): boolean {
  flushPendingCapture();
  const previous = past.pop();
  if (!previous || !current) {
    if (previous) past.push(previous);
    return false;
  }
  future.push(current);
  current = previous;
  restore(previous);
  return true;
}

export function redo(): boolean {
  flushPendingCapture();
  const next = future.pop();
  if (!next || !current) {
    if (next) future.push(next);
    return false;
  }
  past.push(current);
  current = next;
  restore(next);
  return true;
}

export function canUndo(): boolean {
  return past.length > 0;
}

export function canRedo(): boolean {
  return future.length > 0;
}

/** Drop all history and re-baseline on the current canvas content. */
export function resetHistory(): void {
  if (captureTimer !== null) {
    clearTimeout(captureTimer);
    captureTimer = null;
  }
  past = [];
  future = [];
  current = takeSnapshot();
}

/** Wire up store subscriptions. Call once at app startup. */
export function initHistory(): void {
  if (initialized) return;
  initialized = true;

  current = takeSnapshot();

  // Capture after bursts of canvas edits. The equality function keeps this
  // from firing on unrelated state changes (mouse, viewport, packets).
  useGraphStore.subscribe(
    state => [state.nodes, state.edges, state.annotations, state.regions] as const,
    scheduleCapture,
    {
      equalityFn: (a, b) =>
        a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3],
    }
  );

  // Undo must not cross scene boundaries
  useGraphStore.subscribe(
    state => state.editingSceneId,
    () => resetHistory()
  );
}
