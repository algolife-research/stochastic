// Autosave & Crash Recovery
//
// Periodically snapshots the whole composition to localStorage while the
// project is dirty, plus a best-effort synchronous snapshot on tab close.
// The welcome screen offers to restore the snapshot after a crash or an
// accidental close, and the error boundary can hand it out as a .sto file.

import { useGraphStore } from './index';
import { serializeComposition } from '../../io/file-io';
import type { SerializedComposition } from '../../io/file-io';

const STORAGE_KEY = 'stochastic-autosave';
const INTERVAL_MS = 15_000;
// localStorage quota guard: skip snapshots that would exceed ~4MB
const MAX_BYTES = 4_000_000;

export interface AutosaveSnapshot {
  savedAt: number;
  projectName: string;
  data: SerializedComposition;
}

let timer: ReturnType<typeof setInterval> | null = null;
let lastSavedSignature: string | null = null;

function takeSnapshot(): void {
  // Make sure the canvas content is reflected in its scene before serializing
  useGraphStore.getState().saveCurrentScene();

  // Re-read: zustand state objects are immutable snapshots, so the reference
  // taken before saveCurrentScene() would not contain the canvas changes
  const store = useGraphStore.getState();

  const data = serializeComposition(
    store.scenes,
    store.arrangement,
    store.arrangementChannels,
    store.musicalContext,
    store.globalSettings,
    store.projectMeta,
    store.masterSpeed
  );

  // Nothing worth recovering from an effectively empty project
  const nodeCount = data.scenes.reduce((n, s) => n + s.nodes.length, 0);
  if (nodeCount === 0) return;

  const snapshot: AutosaveSnapshot = {
    savedAt: Date.now(),
    projectName: store.projectMeta.name || 'Untitled Project',
    data,
  };

  try {
    const payload = JSON.stringify(snapshot);
    if (payload.length > MAX_BYTES) {
      console.warn(`Autosave skipped: project too large (${Math.round(payload.length / 1e6)}MB)`);
      return;
    }
    // Cheap change detection: don't rewrite identical content
    // (savedAt is excluded from the comparison)
    const signature = JSON.stringify(snapshot.data);
    if (signature === lastSavedSignature) return;
    localStorage.setItem(STORAGE_KEY, payload);
    lastSavedSignature = signature;
  } catch (error) {
    console.warn('Autosave failed:', error);
  }
}

/** Start periodic autosaving. Call once at app startup. */
export function initAutosave(): void {
  if (timer !== null) return;

  timer = setInterval(() => {
    if (useGraphStore.getState().isDirty) {
      takeSnapshot();
    }
  }, INTERVAL_MS);

  // Best-effort synchronous snapshot when the tab closes
  window.addEventListener('beforeunload', () => {
    if (useGraphStore.getState().isDirty) {
      takeSnapshot();
    }
  });
}

/** The stored snapshot, if any. */
export function getAutosaveSnapshot(): AutosaveSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutosaveSnapshot;
    if (!parsed?.data?.scenes) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
  lastSavedSignature = null;
}
