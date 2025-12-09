// Core Utility Functions
// Shared logic for musical context resolution and common operations

import type { 
  LocalKeyConfig, 
  MusicalContext, 
  ScaleIntervals, 
  ScaleName,
  ScenePlaybackState 
} from './types';
import { SCALES } from './constants';

// ============================================================================
// MUSICAL CONTEXT UTILITIES
// ============================================================================

/**
 * Get effective musical context considering local overrides
 * 
 * @param localConfig - Optional local key configuration (from node props)
 * @param globalContext - Global musical context and scene playback state
 * @returns Resolved musical context with root, scale name, and scale intervals
 */
export function getEffectiveMusicalContext(
  localConfig: LocalKeyConfig | null | undefined,
  globalContext: { 
    scenePlayback: Pick<ScenePlaybackState, 'effectiveRoot' | 'effectiveScale'>; 
    musicalContext: MusicalContext;
  }
): { root: number; scale: ScaleIntervals; scaleName: ScaleName } {
  
  // Use global if no local config or local uses global
  if (!localConfig || localConfig.useGlobalKey) {
    const root = globalContext.scenePlayback.effectiveRoot ?? globalContext.musicalContext.root;
    const scaleName = globalContext.scenePlayback.effectiveScale ?? globalContext.musicalContext.scaleName;
    return {
      root,
      scaleName,
      scale: SCALES[scaleName],
    };
  }
  
  // Use local config
  return {
    root: localConfig.root,
    scaleName: localConfig.scale,
    scale: SCALES[localConfig.scale],
  };
}

// ============================================================================
// COLLECTION UTILITIES
// ============================================================================

/**
 * Convert a Map to an Array of its values
 * Useful for scene storage serialization
 */
export function nodeMapToArray<T>(map: Map<string, T>): T[] {
  return Array.from(map.values());
}

/**
 * Convert an Array to a Map keyed by item.id
 * Useful for scene loading
 */
export function nodeArrayToMap<T extends { id: string }>(
  array: T[]
): Map<string, T> {
  return new Map(array.map(item => [item.id, item]));
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Calculate beats from milliseconds given a BPM
 * 
 * @param ms - Time in milliseconds
 * @param bpm - Beats per minute
 * @returns Number of beats
 */
export function msToBeats(ms: number, bpm: number): number {
  return (ms / 1000) * (bpm / 60);
}

/**
 * Calculate milliseconds from beats given a BPM
 * 
 * @param beats - Number of beats
 * @param bpm - Beats per minute
 * @returns Time in milliseconds
 */
export function beatsToMs(beats: number, bpm: number): number {
  return (beats / bpm) * 60 * 1000;
}

/**
 * Calculate seconds per beat for a given BPM
 * 
 * @param bpm - Beats per minute
 * @returns Seconds per beat
 */
export function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

/**
 * Calculate ms per beat for a given BPM
 * 
 * @param bpm - Beats per minute
 * @returns Milliseconds per beat
 */
export function msPerBeat(bpm: number): number {
  return (60 / bpm) * 1000;
}

// ============================================================================
// ID GENERATION UTILITIES
// ============================================================================

/**
 * Generate a short unique ID (8 characters)
 * Used for display purposes, not as primary key
 */
export function shortId(fullId: string): string {
  return fullId.slice(0, 8);
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number, 
  inMin: number, 
  inMax: number, 
  outMin: number, 
  outMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Deep clone an object (JSON-safe only)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are deeply equal (JSON-safe only)
 */
export function deepEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
