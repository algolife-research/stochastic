// Example Library — fetch-on-demand example and composition loading
//
// The full example library (50+ graph examples plus complete .sto
// compositions) is not bundled with the app. It is fetched lazily from a
// static library (manifest + per-item JSON) and cached in localStorage.
//
// Source resolution:
//   VITE_EXAMPLES_BASE_URL  — e.g. a raw GitHub URL of the examples repo
//   default '/examples-library' — served alongside the app
//
// Offline safety: the tutorial and the welcome-screen demo are bundled
// (see examples.ts BUNDLED_EXAMPLES) and never require the network.

import { getGraphStore } from '@core/store';
import { getDefaultProps, SCALES } from '@core/constants';
import { isValidNodeType } from '@core/type-guards';
import type { NodeType, ScaleName } from '@core/types';
import {
  BUNDLED_EXAMPLES,
  applyExampleToStore,
  EXAMPLE_CATEGORIES,
} from './examples';
import type { Example, ExampleCategory, ExampleNode, ExampleScene } from './examples';
import { deserializeComposition, detectFileVersion, migrateV2ToV3 } from '../io/file-io';
import type { SerializedComposition, SerializedGraph } from '../io/file-io';

// ============================================================================
// TYPES
// ============================================================================

export interface ExampleIndexEntry {
  key: string;
  name: string;
  category: ExampleCategory;
  description: string;
  bpm: number;
  path: string;
}

export interface CompositionIndexEntry {
  key: string;
  name: string;
  description: string;
  scenes: number;
  path: string;
}

export interface LibraryIndex {
  version: number;
  categories: readonly string[];
  examples: ExampleIndexEntry[];
  compositions: CompositionIndexEntry[];
}

// ============================================================================
// CONFIGURATION & CACHE
// ============================================================================

const BASE_URL = (import.meta.env.VITE_EXAMPLES_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || '/examples-library';

const INDEX_CACHE_KEY = 'stochastic-library:index';
const INDEX_TTL_MS = 60 * 60 * 1000; // refresh the manifest at most hourly

function readCache<T>(key: string): { at: number; data: T } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { at: number; data: T }) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Storage full or unavailable — caching is best-effort
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}/${path}`, { cache: 'default' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${path}`);
  }
  return response.json() as Promise<T>;
}

// ============================================================================
// MANIFEST
// ============================================================================

let indexPromise: Promise<LibraryIndex | null> | null = null;

/**
 * Get the library manifest. Serves a cached copy when fresh, refreshes in
 * the background when stale, and returns null only when there is no cache
 * and the network fails (callers fall back to bundled examples).
 */
export function getLibraryIndex(): Promise<LibraryIndex | null> {
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const cached = readCache<LibraryIndex>(INDEX_CACHE_KEY);
    if (cached && Date.now() - cached.at < INDEX_TTL_MS) {
      return cached.data;
    }
    try {
      const index = await fetchJson<LibraryIndex>('index.json');
      writeCache(INDEX_CACHE_KEY, index);
      return index;
    } catch (error) {
      console.warn('Example library unavailable:', error);
      return cached?.data ?? null;
    }
  })();

  // Allow a retry on the next call if this attempt failed entirely
  indexPromise.then(result => {
    if (result === null) indexPromise = null;
  });

  return indexPromise;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate fetched example data before it touches the store. Remote content
 * is data, not code — but a stale or hand-edited library entry must fail
 * loudly here rather than half-load into someone's project.
 */
export function validateExample(data: unknown): string[] {
  const errors: string[] = [];
  const example = data as Partial<Example>;

  if (!example || typeof example !== 'object') return ['not an object'];
  if (typeof example.name !== 'string' || example.name.length === 0) errors.push('missing name');
  if (typeof example.bpm !== 'number' || example.bpm <= 0) errors.push('invalid bpm');

  const scenes: Array<Pick<ExampleScene, 'nodes' | 'edges'> & { name?: string }> =
    example.scenes && example.scenes.length > 0
      ? example.scenes
      : [{ name: 'main', nodes: example.nodes ?? [], edges: example.edges ?? [] }];

  for (const scene of scenes) {
    const label = scene.name ?? 'scene';
    if (!Array.isArray(scene.nodes) || !Array.isArray(scene.edges)) {
      errors.push(`${label}: nodes/edges not arrays`);
      continue;
    }
    const ids = new Set<string>();
    for (const node of scene.nodes as ExampleNode[]) {
      if (!isValidNodeType(node.type)) {
        errors.push(`${label}: invalid node type "${node.type}"`);
        continue;
      }
      ids.add(node.id);
      const known = new Set(Object.keys(getDefaultProps(node.type as NodeType)));
      for (const prop of Object.keys(node.props ?? {})) {
        if (!known.has(prop)) errors.push(`${label}: node "${node.id}" unknown prop "${prop}"`);
      }
    }
    for (const edge of scene.edges) {
      if (!ids.has(edge.from) || !ids.has(edge.to)) {
        errors.push(`${label}: edge "${edge.id}" references missing node`);
      }
    }
  }

  return errors;
}

// ============================================================================
// LOADING
// ============================================================================

/**
 * Load an example by key: bundled instantly, otherwise fetched from the
 * library (cached per manifest version). Throws with a readable message on
 * network or validation failure.
 */
export async function loadExample(key: string): Promise<void> {
  const bundled = BUNDLED_EXAMPLES[key];
  if (bundled) {
    applyExampleToStore(bundled);
    return;
  }

  const index = await getLibraryIndex();
  const entry = index?.examples.find(e => e.key === key);
  if (!entry) {
    throw new Error(`Example "${key}" not found in the library`);
  }

  const cacheKey = `stochastic-library:example:${key}@v${index!.version}`;
  let data = readCache<Example>(cacheKey)?.data ?? null;

  if (!data) {
    data = await fetchJson<Example>(entry.path);
    const problems = validateExample(data);
    if (problems.length > 0) {
      throw new Error(`Example "${key}" failed validation: ${problems[0]}`);
    }
    writeCache(cacheKey, data);
  }

  applyExampleToStore(data);
}

/**
 * Load a full .sto composition from the library. Replaces the current
 * project (like File → Open), so callers should confirm when dirty.
 */
export async function loadLibraryComposition(entry: CompositionIndexEntry): Promise<void> {
  const raw = await fetchJson<Record<string, unknown>>(entry.path);

  const version = detectFileVersion(raw);
  const data = version === '2.0'
    ? deserializeComposition(migrateV2ToV3(raw as unknown as SerializedGraph))
    : deserializeComposition(raw as unknown as SerializedComposition);

  const store = getGraphStore();
  if (store.isRunning) {
    store.stopPlayback();
  }

  store.loadComposition(data.scenes, data.arrangement, data.channels, data.masterBpm);

  const scaleName = data.musicalContext.scaleName as ScaleName;
  const scale = SCALES[scaleName];
  if (scale) {
    store.setMusicalContext({
      root: data.musicalContext.root,
      scaleName,
      scale,
    });
  }

  store.setGlobalSettings(data.globalSettings);
  store.setProjectMeta({
    name: entry.name,
    author: data.projectMeta.author || '',
    created: data.projectMeta.created || Date.now(),
    modified: Date.now(),
  });
  store.markClean();
}

/** Bundled entries in index form, for merging into the menu when offline. */
export function getBundledIndexEntries(): ExampleIndexEntry[] {
  return Object.entries(BUNDLED_EXAMPLES).map(([key, ex]) => ({
    key,
    name: ex.name,
    category: ex.category,
    description: ex.description,
    bpm: ex.bpm,
    path: '',
  }));
}

export { EXAMPLE_CATEGORIES };
