# AIGA Code Improvement Implementation Plan

> **Document Version:** 1.0  
> **Created:** 2025-12-09  
> **Status:** Planning

This document outlines a prioritized implementation plan for improving the AIGA codebase's robustness, maintainability, elegance, and consistency with the planned authentication/monetization data model.

---

## Table of Contents

1. [Overview](#overview)
2. [Priority Matrix](#priority-matrix)
3. [Phase 1: Critical Fixes (P0)](#phase-1-critical-fixes-p0)
4. [Phase 2: Type Safety & Auth Readiness (P1)](#phase-2-type-safety--auth-readiness-p1)
5. [Phase 3: Architecture Improvements (P2)](#phase-3-architecture-improvements-p2)
6. [Phase 4: Polish & Documentation (P3)](#phase-4-polish--documentation-p3)
7. [Migration Notes](#migration-notes)
8. [Testing Strategy](#testing-strategy)

---

## Overview

### Goals
- **Robustness:** Eliminate silent failures, add proper error handling
- **Maintainability:** Split large files, reduce code duplication
- **Elegance:** Standardize naming conventions, improve type safety
- **Auth Readiness:** Prepare infrastructure for USER_AUTH_SYSTEM.md implementation

### Current State Summary
| Metric | Current | Target |
|--------|---------|--------|
| Largest file (store.ts) | 2,504 lines | < 500 lines per module |
| Type assertions (`as any`) | ~20+ occurrences | 0 |
| TODO comments | 5 critical | 0 critical |
| Feature gate infrastructure | None | Complete |

---

## Priority Matrix

| Priority | Category | Est. Effort | Risk if Deferred |
|----------|----------|-------------|------------------|
| **P0** | Critical Fixes | 2-3 hours | User-facing bugs |
| **P1** | Type Safety & Auth | 4-6 hours | Technical debt accumulation |
| **P2** | Architecture | 8-12 hours | Maintenance burden |
| **P3** | Polish | 4-6 hours | Onboarding friction |

---

## Phase 1: Critical Fixes (P0)

### 1.2 Implement Audio Engine Hook for Visualization

**Problem:** `data-extractor.ts` has TODO for audio engine integration.

**File:** `src/viz/data-extractor.ts` (line 125)

**Implementation:**

```typescript
// Add to data-extractor.ts
import { audioEngine } from '@audio/engine';

function extractActiveNotes(): VizNoteData[] {
  // Get active voices from audio engine
  const activeVoices = audioEngine.getActiveVoices();
  
  return activeVoices.map(voice => ({
    frequency: voice.freq,
    gain: voice.gain,
    pan: voice.pan ?? 0,
    envelope: voice.envelope ?? 1,
    waveType: voice.wave,
  }));
}
```

**Required Changes to AudioEngine:**

```typescript
// Add to src/audio/engine.ts
interface ActiveVoice {
  id: string;
  freq: number;
  gain: number;
  pan: number;
  wave: WaveType;
  envelope: number;
}

getActiveVoices(): ActiveVoice[] {
  // Query worklet for active voices
  // Return array of currently playing notes
}
```

**Acceptance Criteria:**
- [ ] Visualization receives real-time audio data
- [ ] Active notes appear in viz musical data
- [ ] No performance regression in audio playback

---

### 1.3 Add Error State Visibility

**Problem:** Errors in tick system are caught but not surfaced to users.

**Implementation:**

```typescript
// Add to src/core/types.ts
export interface ErrorState {
  lastError: string | null;
  errorType: 'tick' | 'audio' | 'file' | 'general' | null;
  errorCount: number;
  lastErrorTime: number | null;
}

// Add to GraphState in store.ts
errorState: ErrorState;

// Add actions
setError: (error: string, type: ErrorState['errorType']) => void;
clearError: () => void;
```

```typescript
// Update tick.ts error handling
catch (error) {
  console.error('Tick error:', error);
  getGraphStore().setError(
    error instanceof Error ? error.message : 'Unknown tick error',
    'tick'
  );
}
```

```typescript
// Add to StatusBar.tsx
const errorState = useGraphStore(state => state.errorState);

{errorState.lastError && (
  <div className={styles.error} onClick={() => clearError()}>
    ⚠️ {errorState.lastError}
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Errors display in status bar
- [ ] Users can dismiss errors
- [ ] Error count tracked for diagnostics

---

## Phase 2: Type Safety & Auth Readiness (P1)

**Timeline:** Week 1  
**Estimated Effort:** 4-6 hours

### 2.1 Eliminate Type Assertions

**Problem:** `as any` and `as never` casts bypass TypeScript safety.

**Files Affected:**
- `src/core/store.ts` (~10 occurrences)
- `src/io/file-io.ts` (~5 occurrences)
- `src/core/constants.ts` (~2 occurrences)

**Implementation Strategy:**

1. **Create type guard utilities:**

```typescript
// src/core/type-guards.ts (NEW FILE)
import type { NodeType, NodeProps, PropsForNodeType } from './types';

export function assertNodeId(id: string): asserts id is NodeId {
  if (!id || typeof id !== 'string') {
    throw new TypeError(`Invalid NodeId: ${id}`);
  }
}

export function isValidNodeType(type: string): type is NodeType {
  const validTypes: NodeType[] = [
    'source', 'speaker', 'pitch', 'oscillator', 'filter',
    'gate', 'delay', 'gain', 'modulator', 'tunnel',
    'teleporter', 'quantizer', 'lfo', 'splitter',
    'midi_out', 'midi_cc', 'scene_trigger', 'mutator', 'crossover'
  ];
  return validTypes.includes(type as NodeType);
}

export function createTypedNode<T extends NodeType>(
  type: T,
  id: NodeId,
  x: number,
  y: number,
  props: PropsForNodeType<T>
): GraphNode<T> {
  return {
    id,
    type,
    x,
    y,
    props,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [],
  };
}
```

2. **Update store.ts to use typed factories:**

```typescript
// Replace in addNode
const node = createTypedNode(type, id, x, y, finalProps);
state.nodes.set(id, node);
```

3. **Fix Map type inference:**

```typescript
// Update GraphState
nodes: Map<NodeId, GraphNode>;  // Remove generic parameter issue
```

**Acceptance Criteria:**
- [ ] Zero `as any` casts in core modules
- [ ] Zero `as never` casts
- [ ] All node creation goes through typed factory
- [ ] TypeScript strict mode passes

---

### 2.2 Create Feature Gate Infrastructure

**Problem:** No infrastructure exists for auth-gated features.

**New File:** `src/core/feature-gate.ts`

```typescript
// src/core/feature-gate.ts

export type Feature = 
  | 'ai_generation'
  | 'ai_generation_advanced'
  | 'export_4k'
  | 'export_8k'
  | 'unlimited_scenes'
  | 'multi_channel'
  | 'api_access';

export type LicenseTier = 'free' | 'pro' | 'enterprise';

export interface FeatureRequirement {
  minTier: LicenseTier;
  creditCost: number;
  description: string;
}

export interface FeatureCheckResult {
  allowed: boolean;
  reason?: 'not_authenticated' | 'insufficient_tier' | 'insufficient_credits';
  requiredTier?: LicenseTier;
  creditCost?: number;
}

export const FEATURE_REQUIREMENTS: Record<Feature, FeatureRequirement> = {
  'ai_generation': { 
    minTier: 'free', 
    creditCost: 5,
    description: 'Basic AI scene generation'
  },
  'ai_generation_advanced': { 
    minTier: 'pro', 
    creditCost: 15,
    description: 'Advanced AI generation with complex prompts'
  },
  'export_4k': { 
    minTier: 'pro', 
    creditCost: 2,
    description: '4K video export (per minute)'
  },
  'export_8k': { 
    minTier: 'enterprise', 
    creditCost: 5,
    description: '8K video export (per minute)'
  },
  'unlimited_scenes': { 
    minTier: 'pro', 
    creditCost: 0,
    description: 'Unlimited scenes per composition'
  },
  'multi_channel': { 
    minTier: 'pro', 
    creditCost: 0,
    description: 'Multi-channel arrangement'
  },
  'api_access': { 
    minTier: 'enterprise', 
    creditCost: 0,
    description: 'Programmatic API access'
  },
};

// Tier hierarchy for comparison
const TIER_LEVELS: Record<LicenseTier, number> = {
  'free': 0,
  'pro': 1,
  'enterprise': 2,
};

/**
 * Check if a feature can be used.
 * Currently returns allowed: true for all features (pre-auth).
 * Will integrate with auth store when implemented.
 */
export async function canUseFeature(feature: Feature): Promise<FeatureCheckResult> {
  const requirement = FEATURE_REQUIREMENTS[feature];
  
  // TODO: Replace with actual auth check when auth system is implemented
  // const authStore = getAuthStore();
  // if (!authStore.isAuthenticated) {
  //   return { allowed: false, reason: 'not_authenticated' };
  // }
  // const userTier = authStore.license?.tier ?? 'free';
  // if (TIER_LEVELS[userTier] < TIER_LEVELS[requirement.minTier]) {
  //   return { allowed: false, reason: 'insufficient_tier', requiredTier: requirement.minTier };
  // }
  // if (requirement.creditCost > 0 && authStore.credits.balance < requirement.creditCost) {
  //   return { allowed: false, reason: 'insufficient_credits', creditCost: requirement.creditCost };
  // }
  
  // Pre-auth: allow all features
  return { allowed: true };
}

/**
 * Consume credits for a feature (no-op until auth implemented)
 */
export async function consumeFeature(feature: Feature): Promise<{
  success: boolean;
  remainingCredits: number;
}> {
  // TODO: Implement credit deduction when auth system is ready
  return { success: true, remainingCredits: Infinity };
}

/**
 * Get human-readable feature requirement description
 */
export function getFeatureRequirementText(feature: Feature): string {
  const req = FEATURE_REQUIREMENTS[feature];
  if (req.minTier === 'free' && req.creditCost === 0) {
    return 'Available to all users';
  }
  if (req.creditCost > 0) {
    return `Requires ${req.minTier} tier (${req.creditCost} credits)`;
  }
  return `Requires ${req.minTier} tier`;
}
```

**Integration Points:**

```typescript
// Example usage in ExportModal.tsx
import { canUseFeature, getFeatureRequirementText } from '@core/feature-gate';

const handle4KExport = async () => {
  const check = await canUseFeature('export_4k');
  if (!check.allowed) {
    showUpgradeModal(check.reason, check.requiredTier);
    return;
  }
  // Proceed with export
};
```

**Acceptance Criteria:**
- [ ] Feature gate module created
- [ ] All feature requirements defined per USER_AUTH_SYSTEM.md
- [ ] Export modal checks feature permissions
- [ ] Upgrade prompts show when features unavailable (future)

---

### 2.3 Extend ProjectMeta for Auth Integration

**Problem:** ProjectMeta lacks user association fields.

**Implementation:**

```typescript
// Update in src/core/types.ts
export interface ProjectMeta {
  // Existing fields
  readonly name: string;
  readonly author: string;
  readonly created: number;
  readonly modified: number;
  readonly version: string;
  readonly rootNote: number;
  readonly scale: ScaleName;
  readonly gravity: number;
  readonly midiOutputId: string | null;
  readonly midiClock: boolean;
  
  // New auth-related fields (optional until auth implemented)
  readonly ownerId?: string;              // User UUID
  readonly ownerEmail?: string;           // For display (cached)
  readonly collaboratorIds?: string[];    // Future team support
  readonly visibility?: 'private' | 'unlisted' | 'public';
  readonly licenseRequired?: LicenseTier; // Min tier to open
  readonly lastSyncedAt?: number;         // Cloud sync timestamp
}
```

```typescript
// Update file-io.ts serialization
export interface SerializedMeta {
  // Existing...
  ownerId?: string;
  visibility?: string;
  licenseRequired?: string;
}
```

**Acceptance Criteria:**
- [ ] ProjectMeta types updated
- [ ] Serialization handles new optional fields
- [ ] Backward compatibility maintained (fields optional)

---

## Phase 3: Architecture Improvements (P2)

**Timeline:** Week 2-3  
**Estimated Effort:** 8-12 hours

### 3.2 Split tick.ts into Modules

**New Structure:**

```
src/core/tick/
├── index.ts              # Main tick loop, exports
├── state.ts              # Tick state (lastTime, beatAccumulator, etc.)
├── sources.ts            # updateSources, spawn logic
├── packets.ts            # updatePackets, movement, arrivals
├── scene-playback.ts     # updateScenePlayback, arrangement/jam modes
├── crossover.ts          # performCrossover, entanglement sync
├── virtual-channels.ts   # Multi-channel scene processing
└── lfo.ts                # LFO update logic
```

---

### 3.3 Split PropertyPanel.tsx

**New Structure:**

```
src/ui/property-panels/
├── index.ts                    # Main PropertyPanel component
├── NodeProperties.tsx          # Switch component for node types
├── AnnotationProperties.tsx    # Annotation editing
├── RegionProperties.tsx        # Region editing
├── nodes/
│   ├── SourceProps.tsx
│   ├── SpeakerProps.tsx
│   ├── PitchProps.tsx
│   ├── OscillatorProps.tsx
│   ├── FilterProps.tsx
│   ├── GateProps.tsx
│   ├── DelayProps.tsx
│   ├── GainProps.tsx
│   ├── QuantizerProps.tsx
│   ├── LfoProps.tsx
│   ├── TunnelProps.tsx
│   ├── TeleporterProps.tsx
│   ├── ModulatorProps.tsx
│   ├── MidiOutProps.tsx
│   ├── MidiCcProps.tsx
│   ├── SceneTriggerProps.tsx
│   ├── SplitterProps.tsx
│   ├── MutatorProps.tsx
│   └── CrossoverProps.tsx
└── shared/
    ├── SliderInput.tsx
    ├── SelectInput.tsx
    ├── KeySelector.tsx         # Scale/root selection
    └── PropertyRow.tsx
```

---

### 3.4 Create Shared Utility Functions

**Problem:** Duplicated logic for musical context resolution.

**New File:** `src/core/utils.ts`

```typescript
// src/core/utils.ts

import type { 
  LocalKeyConfig, 
  MusicalContext, 
  ScaleIntervals, 
  ScaleName,
  ScenePlaybackState 
} from './types';
import { SCALES } from './constants';

/**
 * Get effective musical context considering local overrides
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

/**
 * Convert between Map and Array for scene storage
 */
export function nodeMapToArray<T>(map: Map<string, T>): T[] {
  return Array.from(map.values());
}

export function nodeArrayToMap<T extends { id: string }>(
  array: T[]
): Map<string, T> {
  return new Map(array.map(item => [item.id, item]));
}

/**
 * Calculate beats from milliseconds
 */
export function msToBeats(ms: number, bpm: number): number {
  return (ms / 1000) * (bpm / 60);
}

/**
 * Calculate milliseconds from beats
 */
export function beatsToMs(beats: number, bpm: number): number {
  return (beats / bpm) * 60 * 1000;
}
```

**Acceptance Criteria:**
- [ ] Utility functions cover common patterns
- [ ] Existing code migrated to use utilities
- [ ] No duplicate implementations remain

---

## Phase 4: Polish & Documentation (P3)

**Timeline:** Week 3-4  
**Estimated Effort:** 4-6 hours

### 4.1 Standardize Naming Conventions

**Conventions to Adopt:**

| Pattern | Convention | Examples |
|---------|------------|----------|
| Booleans | `is*`, `has*`, `can*` | `isRunning`, `hasSelection`, `canExport` |
| BPM/Speed | Always `bpm` | `masterBpm`, `localBpm`, `effectiveBpm` |
| Callbacks | `on*` | `onChange`, `onSelect`, `onClose` |
| Handlers | `handle*` | `handleClick`, `handleKeyDown` |

**Files Requiring Changes:**

```typescript
// store.ts
masterSpeed -> masterBpm  // Rename throughout

// types.ts - Already consistent, verify
```

**Migration:**
1. Update type definitions
2. Update store state/actions
3. Find/replace in all files
4. Update serialization (with backward compat)

---

### 4.2 Add JSDoc Documentation

**Priority Files:**
1. `src/core/store.ts` (all actions)
2. `src/core/types.ts` (all interfaces)
3. `src/core/constants.ts` (exported functions)
4. `src/core/engine.ts` (processing functions)

**Example Documentation Style:**

```typescript
/**
 * Creates a new scene with default settings and adds it to the scene collection.
 * 
 * @param name - Display name for the scene. If not provided, auto-generates
 *               "Scene N" where N is the next available number.
 * @returns The SceneId of the newly created scene
 * 
 * @remarks
 * - Sets `isDirty` flag to true
 * - Does not automatically load the scene to canvas
 * - New scene starts with default viz mode ('editor')
 * 
 * @example
 * ```typescript
 * const sceneId = store.createScene('Intro');
 * store.loadSceneToCanvas(sceneId);
 * ```
 * 
 * @see {@link loadSceneToCanvas} for displaying the scene
 * @see {@link duplicateScene} for copying existing scenes
 */
createScene: (name?: string) => SceneId;
```

---

### 4.3 Add Performance Optimizations

**4.3.1 Optimize Store Selections**

```typescript
// Before (causes re-render on any selection change)
const selection = useGraphStore(state => state.selection);

// After (only re-renders when specific value changes)
const selectedNodeIds = useGraphStore(state => state.selection.selectedNodeIds);
const hoveredNodeId = useGraphStore(state => state.selection.hoveredNodeId);
```

**Files to Update:**
- `src/ui/App.tsx`
- `src/ui/PropertyPanel.tsx`
- `src/ui/ScenePanel.tsx`
- `src/canvas/renderer.ts`

**4.3.2 Add Entanglement Index**

```typescript
// Add to tick state
const entanglementIndex: Map<string, Set<PacketId>> = new Map();

// Update when packets created/destroyed
function registerEntangledPacket(packetId: PacketId, groupId: string) {
  if (!entanglementIndex.has(groupId)) {
    entanglementIndex.set(groupId, new Set());
  }
  entanglementIndex.get(groupId)!.add(packetId);
}

// Use for efficient sync
function syncEntangledPayloads(groupId: string, payload: AudioPayload) {
  const packetIds = entanglementIndex.get(groupId);
  if (!packetIds) return;
  
  for (const id of packetIds) {
    // Direct access instead of iterating all packets
  }
}
```

---

## Migration Notes

### Backward Compatibility

All changes must maintain backward compatibility for:
1. **File Format:** `.phono` files from v2 and v3 must load correctly
2. **API:** Existing component props must not change signature
3. **Keyboard Shortcuts:** All shortcuts must continue working

### Breaking Changes (Future Major Version)

The following would be breaking changes, deferred to v4.0:
- Renaming `masterSpeed` to `masterBpm` in file format
- Changing scene storage from array to Map in serialization
- Removing deprecated `noteIndex` field from source props

---

## Testing Strategy

### Unit Tests (Add as part of refactoring)

```
tests/
├── core/
│   ├── store/
│   │   ├── node-actions.test.ts
│   │   ├── edge-actions.test.ts
│   │   └── scene-actions.test.ts
│   ├── type-guards.test.ts
│   ├── feature-gate.test.ts
│   └── utils.test.ts
└── io/
    └── file-io.test.ts
```

### Integration Tests

- [ ] File save/load round-trip
- [ ] Scene creation and switching
- [ ] Multi-channel arrangement playback
- [ ] Export with various settings

### Manual Testing Checklist

- [ ] Create new composition
- [ ] Add nodes of each type
- [ ] Create and switch scenes
- [ ] Export video at different resolutions
- [ ] Load v2 format files
- [ ] Load v3 format files

---

## Appendix: File Change Summary

| File | Changes | Priority |
|------|---------|----------|
| `src/ui/ExportModal.tsx` | Fix BPM | P0 |
| `src/io/video-compiler.ts` | Fix BPM | P0 |
| `src/viz/data-extractor.ts` | Audio hook | P0 |
| `src/audio/engine.ts` | Add getActiveVoices | P0 |
| `src/core/types.ts` | Add ErrorState, extend ProjectMeta | P1 |
| `src/core/type-guards.ts` | NEW FILE | P1 |
| `src/core/feature-gate.ts` | NEW FILE | P1 |
| `src/core/store.ts` | Split into modules | P2 |
| `src/core/tick.ts` | Split into modules | P2 |
| `src/ui/PropertyPanel.tsx` | Split into modules | P2 |
| `src/core/utils.ts` | NEW FILE | P2 |
| All files | JSDoc, naming | P3 |

---

*Document maintained by: Development Team*  
*Last Updated: 2025-12-09*
