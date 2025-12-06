# Phonon: Scene System Design

## Executive Summary

This document proposes a comprehensive **Scene System** that transforms Phonon from a single-graph musical instrument into a **multi-scene composition environment**, enabling the creation of complex pieces with distinct sections (intro, verse, chorus, bridge, outro, etc.).

---

## 1. Core Concepts

### 1.1 What is a Scene?

A **Scene** is a self-contained musical unit consisting of:

| Component | Description |
|-----------|-------------|
| **Graph** | A complete node-edge topology |
| **Duration** | Length in beats (or "infinite" for live performance) |
| **Transitions** | Rules for entering/exiting the scene |
| **Local Settings** | Optional overrides (BPM, key, scale) |

```
┌─────────────────────────────────────────────────────────────────┐
│                          SCENE                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    GRAPH TOPOLOGY                        │   │
│  │   [Source]──▶[Pitch]──▶[Filter]──▶[Speaker]             │   │
│  │       └──▶[Gate]──▶[Harmonic]──▶[Speaker]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Duration: 16 beats │ Key: C │ Scale: minor │ BPM: inherit     │
│  Enter: crossfade 2 beats │ Exit: fade out 1 beat              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Scene vs Current Graph

| Current System | Scene System |
|----------------|--------------|
| Single graph, plays indefinitely | Multiple scenes, each with duration |
| Manual save/load for variations | Scenes saved together in one file |
| No temporal structure | Arrangement timeline defines order |
| `scene_trigger` node (limited) | Full scene orchestration |

### 1.3 The Composition Metaphor

$$ Composition = \sum_{i=0}^{n} Scene_i \times Duration_i $$

A **Composition** is an **ordered arrangement of Scenes**, where each scene contributes a musical section with defined temporal boundaries.

---

## 2. Playback Modes

Phonon supports **two distinct playback modes** to accommodate both live performance and composed pieces:

### 2.1 Arrangement Mode (Finite)

Used for **composed pieces** with defined structure:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARRANGEMENT MODE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Intro 16b] → [Verse 32b] → [Chorus 16b] → [Outro 16b]        │
│                                                                 │
│  • Scenes play for their defined duration                       │
│  • Auto-advances through arrangement                            │
│  • Transitions execute at scene boundaries                      │
│  • Total length is known (exportable to WAV)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Each scene plays for exactly `durationBeats` (or `durationBeats × loopCount`)
- Playhead advances through the arrangement timeline
- Scene transitions fire automatically
- Playback stops (or loops) at arrangement end

### 2.2 Jam Mode (Infinite)

Used for **live performance** and **experimentation**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      JAM MODE (∞)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Currently playing: [Verse A]     Beat: 847...                  │
│                                                                 │
│  • Scene plays indefinitely until manually changed              │
│  • Duration is ignored (treated as infinite)                    │
│  • User triggers scene changes (click, hotkey, MIDI)            │
│  • No arrangement timeline - just scene selection               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Scene runs until user manually switches
- Duration property is **informational only** (suggested length)
- Click a scene to queue it (plays after current bar/phrase)
- No arrangement needed - scenes are a palette

### 2.3 Playback Mode Type

```typescript
type PlaybackMode = 'arrangement' | 'jam';

interface PlaybackState {
  mode: PlaybackMode;
  
  // In arrangement mode
  arrangementBeat: number;         // Global position in arrangement
  currentSlotIndex: number;
  
  // In jam mode  
  currentSceneId: SceneId;
  sceneBeat: number;               // Beat within current scene (no limit)
  queuedSceneId: SceneId | null;   // Next scene to play
  queueTrigger: 'immediate' | 'next-bar' | 'next-phrase';
}
```

### 2.4 UI for Playback Mode

```
┌─────────────────────────────────────────────────────────────────┐
│ Transport Bar                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [▶ Play] [■ Stop]  │  Mode: [Arrangement ▼]  │  BPM: 120      │
│                           ├─ Arrangement                        │
│                           └─ Jam (∞)                            │
│                                                                 │
│  Arrangement: Beat 45 / 176  │  Scene: Verse A (12/32)         │
│  ─── or ───                                                     │
│  Jam: Scene "Verse A" │ Beat: 847 │ Queued: Chorus (next bar)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Scene Triggering in Jam Mode

| Trigger Method | Behavior |
|----------------|----------|
| Click scene | Queue for next bar |
| Double-click | Immediate switch |
| Number keys 1-9 | Queue scene 1-9 |
| Shift + 1-9 | Immediate switch |
| MIDI Note | Configurable per scene |

```typescript
interface SceneTriggerConfig {
  midiNote?: number;               // MIDI note to trigger this scene
  midiChannel?: number;
  quantize: 'immediate' | 'beat' | 'bar' | 'phrase';
  phraseLength: number;            // Beats per phrase (default: 4)
}
```

---

## 3. Settings Hierarchy

### 3.1 The Inheritance Model

Settings follow a **cascade** from global → scene → runtime:

```
┌─────────────────────────────────────────────────────────────────┐
│                   SETTINGS INHERITANCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   COMPOSITION (Global Defaults)                                 │
│   ├── BPM: 120                                                  │
│   ├── Key: C                                                    │
│   ├── Scale: minor                                              │
│   └── Gravity: 0.5                                              │
│        │                                                        │
│        ▼                                                        │
│   SCENE (Optional Overrides)                                    │
│   ├── BPM: null (inherit) → 120                                │
│   ├── Key: null (inherit) → C                                  │
│   ├── Scale: "major" (override) → major                        │
│   └── Gravity: null (inherit) → 0.5                            │
│        │                                                        │
│        ▼                                                        │
│   EFFECTIVE (Runtime)                                           │
│   ├── BPM: 120                                                  │
│   ├── Key: C                                                    │
│   ├── Scale: major    ← Scene override wins                    │
│   └── Gravity: 0.5                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Setting Categories

| Setting | Scope | Rationale |
|---------|-------|-----------|
| **BPM** | Global + Scene override | Usually consistent, but bridges/breakdowns may differ |
| **Key (Root)** | Global + Scene override | Key changes between sections are common |
| **Scale** | Global + Scene override | Verse minor → Chorus major |
| **Gravity** | Global only | Physics constant, shouldn't jump |
| **Edge Behavior** | Global only | Consistency in timing model |
| **Reverb Amount** | Per-speaker (node) | Already per-node |
| **Master Volume** | Global only | Mix concern, not composition |

### 3.3 Type Definitions

```typescript
/** Global composition settings */
interface CompositionSettings {
  // Timing
  masterBpm: number;               // Default BPM for all scenes
  
  // Musical
  rootNote: number;                // 0-11 (C=0)
  scaleName: ScaleName;
  
  // Physics
  gravityConstant: number;
  defaultEdgeBehaviour: 'physical' | 'fixed';
  
  // Audio
  masterVolume: number;            // 0-1
  reverbMix: number;               // Global reverb send
}

/** Per-scene overrides (null = inherit) */
interface SceneSettings {
  localBpm: number | null;
  localRoot: number | null;
  localScale: ScaleName | null;
  // Note: gravity and edge behavior NOT overridable
}

/** Computed effective settings for current playback */
function getEffectiveSettings(
  global: CompositionSettings,
  scene: SceneSettings
): EffectiveSettings {
  return {
    bpm: scene.localBpm ?? global.masterBpm,
    root: scene.localRoot ?? global.rootNote,
    scale: scene.localScale ?? global.scaleName,
    gravity: global.gravityConstant,          // Always global
    edgeBehaviour: global.defaultEdgeBehaviour, // Always global
  };
}
```

### 3.4 BPM Transitions

When switching between scenes with different BPMs:

```typescript
interface BpmTransition {
  type: 'instant' | 'ramp';
  rampBeats?: number;              // For 'ramp' type
}

// Example: Verse at 120 BPM → Chorus at 130 BPM
// With ramp over 4 beats: 120 → 122.5 → 125 → 127.5 → 130
```

### 3.5 UI for Settings

```
┌─────────────────────────────────────────────────────────────────┐
│ COMPOSITION SETTINGS (Global)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Master BPM:    [120___]  │  Key: [C ▼]  │  Scale: [minor ▼]   │
│  Gravity:       [0.5__]   │  Edge Mode: [Fixed ▼]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENE SETTINGS: "Chorus"                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☐ Override BPM:    [___]  (inherit: 120)                      │
│  ☑ Override Key:    [D ▼]  (global: C)                         │
│  ☑ Override Scale:  [major ▼] (global: minor)                  │
│                                                                 │
│  Note: Gravity and Edge Mode are composition-wide              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### 4.1 Scene Type Definition

```typescript
/** Scene identifier */
export type SceneId = string & { readonly __brand: 'SceneId' };

/** Scene definition */
export interface Scene {
  readonly id: SceneId;
  
  // Metadata
  name: string;                    // "Intro", "Verse A", "Chorus"
  color: string;                   // For UI visualization
  
  // Graph content (snapshot)
  nodes: GraphNode[];
  edges: GraphEdge[];
  annotations: Annotation[];
  regions: Region[];
  
  // Timing (used in Arrangement mode, informational in Jam mode)
  durationBeats: number;           // Suggested/enforced length
  loopCount: number;               // How many times to repeat (1 = play once)
  
  // Musical overrides (null = inherit from composition)
  localBpm: number | null;
  localRoot: number | null;        // 0-11
  localScale: ScaleName | null;
  
  // Transitions (used in Arrangement mode)
  enterTransition: SceneTransition;
  exitTransition: SceneTransition;
  
  // Jam mode settings
  jamTrigger: SceneTriggerConfig;
}

/** Transition between scenes */
export interface SceneTransition {
  type: 'cut' | 'crossfade' | 'fade';
  durationBeats: number;           // 0 for 'cut'
}

/** How this scene is triggered in Jam mode */
export interface SceneTriggerConfig {
  midiNote: number | null;         // MIDI note to trigger (null = none)
  midiChannel: number;             // 1-16
  quantize: 'immediate' | 'beat' | 'bar' | 'phrase';
  phraseLength: number;            // Beats per phrase (default: 4)
}
```

**Duration Semantics by Mode:**

| Mode | Duration Behavior |
|------|-------------------|
| **Arrangement** | Enforced - scene plays exactly this many beats, then advances |
| **Jam** | Informational - shown in UI, but scene plays until user switches |

### 4.2 Arrangement Type Definition

```typescript
/** Arrangement slot - a scene placed in the timeline */
export interface ArrangementSlot {
  readonly id: string;
  sceneId: SceneId;
  
  // Position in arrangement
  startBeat: number;               // Absolute position
  
  // Per-instance overrides
  instanceLoopCount?: number;      // Override scene's default
  instanceBpm?: number;            // Override for this instance
  
  // Markers
  markers: ArrangementMarker[];
}

/** Marker within an arrangement slot */
export interface ArrangementMarker {
  beatOffset: number;              // Relative to slot start
  type: 'cue' | 'automation' | 'trigger';
  data: Record<string, unknown>;
}

/** Full composition with scenes and arrangement */
export interface Composition {
  // Existing meta
  meta: ProjectMeta;
  
  // Global settings
  global: {
    rootNote: number;
    scaleName: ScaleName;
    gravity: number;
    defaultEdgeBehaviour: 'physical' | 'fixed';
    masterBpm: number;
  };
  
  // Scene library (unordered)
  scenes: Scene[];
  
  // Arrangement (ordered timeline)
  arrangement: ArrangementSlot[];
  
  // Playback state
  currentSceneIndex: number;
  loopArrangement: boolean;
}
```

### 4.3 File Format Extension

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "My Song",
    "author": "Composer"
  },
  "global": {
    "rootNote": 0,
    "scaleName": "minor",
    "gravity": 0.5,
    "masterBpm": 120
  },
  "scenes": [
    {
      "id": "scene-intro",
      "name": "Intro",
      "color": "#4CAF50",
      "durationBeats": 16,
      "loopCount": 1,
      "localBpm": null,
      "enterTransition": { "type": "fade", "durationBeats": 2 },
      "exitTransition": { "type": "crossfade", "durationBeats": 2 },
      "nodes": [ /* ... */ ],
      "edges": [ /* ... */ ]
    },
    {
      "id": "scene-verse",
      "name": "Verse",
      "color": "#2196F3",
      "durationBeats": 32,
      "loopCount": 2,
      "nodes": [ /* ... */ ],
      "edges": [ /* ... */ ]
    },
    {
      "id": "scene-chorus",
      "name": "Chorus",
      "color": "#FF9800",
      "durationBeats": 16,
      "loopCount": 1,
      "nodes": [ /* ... */ ],
      "edges": [ /* ... */ ]
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-intro", "startBeat": 0 },
    { "id": "slot-2", "sceneId": "scene-verse", "startBeat": 16 },
    { "id": "slot-3", "sceneId": "scene-chorus", "startBeat": 80 },
    { "id": "slot-4", "sceneId": "scene-verse", "startBeat": 96 },
    { "id": "slot-5", "sceneId": "scene-chorus", "startBeat": 160 }
  ]
}
```

---

## 5. User Interface Design

### 5.1 UI Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [File] [Edit] [View] [Scenes]           ♫ Phonon              [─] [□] [×]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┬───────────────┐ │
│ │                                                         │ Scene Panel   │ │
│ │                                                         │ ┌───────────┐ │ │
│ │                   CANVAS                                │ │ ▶ Intro   │ │ │
│ │              (Current Scene Graph)                      │ │   Verse A │ │ │
│ │                                                         │ │   Chorus  │ │ │
│ │    [Src]───▶[Pitch]───▶[Filter]───▶[Spk]               │ │   Bridge  │ │ │
│ │                                                         │ │   Outro   │ │ │
│ │                                                         │ └───────────┘ │ │
│ │                                                         │ [+ New Scene] │ │
│ │                                                         ├───────────────┤ │
│ │                                                         │ Properties    │ │
│ │                                                         │ Duration: 16  │ │
│ │                                                         │ Loop: 2x      │ │
│ │                                                         │ BPM: inherit  │ │
│ └─────────────────────────────────────────────────────────┴───────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ARRANGEMENT TIMELINE                                  │
│ ┌───────────────────────────────────────────────────────────────────────────┐│
│ │ Beat: 0    16    32    48    64    80    96   112   128   144   160      ││
│ │ ╔════════╦════════════════════╦════════════╦════════════════════╦═══════╗││
│ │ ║ Intro  ║      Verse A       ║   Chorus   ║      Verse A       ║Chorus ║││
│ │ ╚════════╩════════════════════╩════════════╩════════════════════╩═══════╝││
│ │ ▼ Playhead                                                               ││
│ └───────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ [◀◀] [▶ Play] [■ Stop] [⟳ Loop]  │ Beat: 45 / 176  │ BPM: 120  │ C minor  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Scene Panel (Right Sidebar)

The **Scene Panel** provides scene management:

```
┌─────────────────────────────────────┐
│ SCENES                    [≡] [+]  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ▶ Intro              16 beats  │ │  ← Active (highlighted)
│ │   ████████░░░░░░░░░░ (editing) │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │   Verse A            32 beats  │ │
│ │   ████████████████░░ 2x loop   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │   Chorus             16 beats  │ │
│ │   ████████░░░░░░░░░░           │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │   Bridge              8 beats  │ │
│ │   ████░░░░░░░░░░░░░░ D major   │ │  ← Local key override
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ SCENE PROPERTIES                    │
├─────────────────────────────────────┤
│ Name:     [Intro____________]       │
│ Color:    [■ Green ▼]               │
│ Duration: [16    ] beats  [∞]       │
│ Loop:     [1 ▼] times               │
│                                     │
│ ── Overrides ──                     │
│ BPM:   [ ] [___] (inherit: 120)     │
│ Key:   [ ] [___] (inherit: C)       │
│ Scale: [ ] [___] (inherit: minor)   │
│                                     │
│ ── Transitions ──                   │
│ Enter: [Crossfade ▼] [2] beats      │
│ Exit:  [Fade ▼]      [1] beats      │
└─────────────────────────────────────┘
```

### 5.3 Arrangement Timeline (Bottom Panel)

A **horizontal timeline** showing the arrangement:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ARRANGEMENT                                          [Zoom: ─●───] [Fit All] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  0        16       32       48       64       80       96      112     128   │
│  │         │        │        │        │        │        │        │       │   │
│  ▼ Playhead                                                                  │
│ ╔════════╗╔════════════════════════════════════╗╔════════════════╗╔════════╗ │
│ ║ Intro  ║║          Verse A (×2)              ║║     Chorus     ║║ Verse  ║ │
│ ║ 🟢     ║║ 🔵                                  ║║ 🟠             ║║ 🔵     ║ │
│ ╚════════╝╚════════════════════════════════════╝╚════════════════╝╚════════╝ │
│                                                                              │
│ ────────────────────────────────────────────────────────────────────────────│
│ [Add Scene ▼]  |  Drag scenes from panel to arrange  |  Total: 128 beats    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- **Drag & Drop**: Drag scenes from Scene Panel to timeline
- **Resize**: Drag edges to change duration (updates scene definition)
- **Reorder**: Drag blocks to reorder
- **Delete**: Right-click → Remove from arrangement
- **Duplicate**: Alt+drag creates new slot with same scene

### 5.4 Canvas Mode Indicator

When editing a scene, the canvas shows the active scene context:

```
┌────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Editing: Intro (16 beats)        [← Back to Arrange] │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│                     [Graph Canvas]                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.5 View Modes

```typescript
type ViewMode = 
  | 'scene'        // Editing a single scene (current behavior)
  | 'arrangement'  // Timeline overview, scene blocks
  | 'split'        // Scene + mini arrangement
```

---

## 6. Scene Execution Model

### 6.1 Playback States

```typescript
interface PlaybackState {
  mode: 'stopped' | 'playing' | 'paused';
  
  // Global position
  globalBeat: number;              // Total beats from start
  
  // Current scene context
  currentSlotIndex: number;
  sceneLocalBeat: number;          // Beat within current scene
  sceneLoopIteration: number;      // Which loop (0-indexed)
  
  // Timing
  effectiveBpm: number;            // After scene overrides
  
  // Transition state
  isTransitioning: boolean;
  transitionProgress: number;      // 0-1
  previousSceneId: SceneId | null;
}
```

### 6.2 Scene Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     SCENE LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │ PENDING │───▶│ ENTERING│───▶│ RUNNING │───▶│ EXITING │     │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘     │
│       │              │              │              │            │
│       │         Crossfade      Main loop     Fade out          │
│       │         ramp up        execution     to next           │
│       │                             │                          │
│       └─────────────────────────────┴──────────────────────────┘
│                              ▲
│                              │ Loop back (if loopCount > 1)
│                              │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Transition Execution

During transitions, **two scenes run simultaneously**:

```typescript
function executeTransition(
  outgoingScene: Scene,
  incomingScene: Scene,
  transitionType: 'cut' | 'crossfade' | 'fade',
  progress: number  // 0-1
): void {
  switch (transitionType) {
    case 'cut':
      // Instant switch
      stopScene(outgoingScene);
      startScene(incomingScene);
      break;
      
    case 'crossfade':
      // Both scenes active, volume crossfade
      setSceneVolume(outgoingScene, 1 - progress);
      setSceneVolume(incomingScene, progress);
      break;
      
    case 'fade':
      // Fade out, silence, fade in
      if (progress < 0.5) {
        setSceneVolume(outgoingScene, 1 - progress * 2);
      } else {
        setSceneVolume(incomingScene, (progress - 0.5) * 2);
      }
      break;
  }
}
```

### 6.4 Packet Handling at Scene Boundaries

When a scene ends:

1. **Drain Mode**: Allow in-flight packets to reach speakers (natural decay)
2. **Kill Mode**: Immediately stop all packets
3. **Carry Mode**: Transfer packets to equivalent nodes in next scene (if exist)

```typescript
interface SceneEndBehavior {
  packets: 'drain' | 'kill' | 'carry';
  drainMaxBeats: number;  // For 'drain' mode
}
```

---

## 7. Advanced Features

### 7.1 Scene Links (Inter-Scene Connections)

Allow nodes to reference other scenes:

```typescript
/** A node that triggers scene change */
interface SceneTriggerProps {
  targetSceneId: SceneId;    // Direct reference
  behavior: 'jump' | 'crossfade' | 'queue';
  crossfadeDuration?: number;
}
```

This enables **conditional scene changes** based on graph events:

```
[Source] ──▶ [Gate 50%] ──▶ [SceneTrigger: Chorus]
                  │
                  └──▶ [SceneTrigger: Bridge]
```

### 7.2 Shared Elements (Global Nodes)

Some elements persist across scenes:

```typescript
interface GlobalElement {
  id: NodeId;
  type: 'speaker' | 'lfo' | 'filter';  // Limited types
  // ... node props
}

interface Composition {
  // ...
  globalElements: GlobalElement[];  // Available in all scenes
}
```

**Use case**: A master reverb speaker that all scenes route to.

### 7.3 Scene Templates

Pre-built scene patterns:

```typescript
const SCENE_TEMPLATES = {
  'arpeggio-4': {
    description: '4-note arpeggio pattern',
    durationBeats: 4,
    nodes: [ /* pre-configured */ ],
    edges: [ /* pre-configured */ ],
  },
  'drum-loop-8': {
    description: '8-beat drum pattern',
    durationBeats: 8,
    nodes: [ /* kick, snare, hihat sources */ ],
    edges: [ /* timing network */ ],
  },
  'pad-ambient': {
    description: 'Sustained pad with slow LFO',
    durationBeats: 16,
    nodes: [ /* ... */ ],
    edges: [ /* ... */ ],
  },
};
```

### 7.4 Scene Variations

Create variations without duplicating:

```typescript
interface SceneVariation {
  baseSceneId: SceneId;
  name: string;
  overrides: {
    nodeId: NodeId;
    propPath: string;
    value: unknown;
  }[];
}

// Example: "Verse A (with filter)" overrides filter cutoff
```

---

## 8. Store Extensions

### 8.1 New Store State

```typescript
interface GraphState {
  // Existing...
  nodes: Map<NodeId, GraphNode>;
  edges: Map<EdgeId, GraphEdge>;
  packets: Map<PacketId, Packet>;
  
  // Scene System
  scenes: Map<SceneId, Scene>;
  arrangement: ArrangementSlot[];
  activeSceneId: SceneId | null;
  
  // Playback
  playback: PlaybackState;
  
  // UI State
  viewMode: 'scene' | 'arrangement' | 'split';
  selectedSlotId: string | null;
}
```

### 8.2 New Actions

```typescript
interface SceneActions {
  // Scene CRUD
  createScene: (name: string) => SceneId;
  duplicateScene: (id: SceneId) => SceneId;
  deleteScene: (id: SceneId) => void;
  updateScene: (id: SceneId, updates: Partial<Scene>) => void;
  
  // Scene content
  saveCurrentToScene: (id: SceneId) => void;
  loadSceneToCanvas: (id: SceneId) => void;
  
  // Arrangement
  addToArrangement: (sceneId: SceneId, position?: number) => void;
  removeFromArrangement: (slotId: string) => void;
  reorderArrangement: (slotId: string, newIndex: number) => void;
  
  // Playback
  playFromScene: (sceneId: SceneId) => void;
  playFromBeat: (beat: number) => void;
  skipToNextScene: () => void;
  skipToPreviousScene: () => void;
  
  // View
  setViewMode: (mode: 'scene' | 'arrangement' | 'split') => void;
}
```

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+N` | New Scene |
| `Ctrl+Shift+D` | Duplicate Scene |
| `Tab` | Next Scene (while editing) |
| `Shift+Tab` | Previous Scene |
| `Ctrl+Enter` | Save current to active scene |
| `1-9` | Quick-load scene 1-9 |
| `A` | Toggle Arrangement view |
| `Space` | Play/Pause |
| `Ctrl+Space` | Play from current scene start |

---

## 10. Migration Path

### 10.1 Backward Compatibility

Existing files (single graph) are treated as:

```typescript
function migrateV2ToV3(oldData: SerializedGraph): Composition {
  return {
    meta: oldData.meta,
    global: oldData.global,
    scenes: [{
      id: createSceneId(),
      name: 'Main',
      durationBeats: null,  // Infinite
      loopCount: 1,
      nodes: oldData.graph.nodes,
      edges: oldData.graph.edges,
      // ... defaults
    }],
    arrangement: [{
      id: 'slot-main',
      sceneId: /* the one scene */,
      startBeat: 0,
    }],
  };
}
```

### 10.2 File Version Detection

```typescript
function detectVersion(data: unknown): '1.0' | '2.0' | '3.0' {
  if (data.scenes && Array.isArray(data.scenes)) return '3.0';
  if (data.graph && data.meta) return '2.0';
  return '1.0';
}
```

---

## 11. Implementation Phases

### Phase 1: Core Scene Infrastructure
- [ ] Scene type definitions
- [ ] Store extensions for scene management
- [ ] Scene CRUD operations
- [ ] Save/Load with scenes

### Phase 2: Basic UI
- [ ] Scene Panel component
- [ ] Scene list with selection
- [ ] Scene properties editor
- [ ] Canvas scene indicator

### Phase 3: Arrangement Timeline
- [ ] Arrangement Panel component
- [ ] Drag & drop scene placement
- [ ] Playback position indicator
- [ ] Scene duration resize

### Phase 4: Playback Engine
- [ ] Multi-scene playback state
- [ ] Scene transition logic
- [ ] Crossfade audio implementation
- [ ] Loop handling

### Phase 5: Advanced Features
- [ ] Scene templates
- [ ] Global elements
- [ ] Scene variations
- [ ] Export per-scene or full arrangement

---

## 12. Example Composition Structure

### "Minimal Techno Track"

```
Scenes:
├── Intro (8 bars / 32 beats)
│   └── Single kick drum source, sparse
├── Build (8 bars)
│   └── Add hi-hat, filter opens gradually
├── Drop A (16 bars)
│   └── Full drums, bass, synth stab
├── Break (8 bars)
│   └── Remove kick, atmospheric
├── Drop B (16 bars)
│   └── Variation of Drop A with added elements
└── Outro (8 bars)
    └── Elements drop out, reverb tail

Arrangement:
[Intro] → [Build] → [Drop A] → [Break] → [Drop B] → [Drop A] → [Outro]
   32       32         64        32         64         64        32    = 320 beats
```

---

## 13. Open Questions

1. **Scene inheritance?** Should scenes be able to "extend" other scenes?
2. **Per-scene undo history?** Or global undo across scene switches?
3. ~~**Live performance mode?** Trigger scenes with MIDI controllers?~~ ✅ Addressed by Jam Mode
4. **Scene-level effects?** Different reverb per scene?
5. **Parallel scenes?** Multiple scenes running simultaneously (layers)?
6. **Jam mode quantization options?** More granular than bar/phrase (e.g., half-bar)?
7. **BPM ramp during transitions?** Smooth tempo changes between scenes?
8. **Export in Jam mode?** Record a live jam session?

---

## Appendix: Visual Mockups

### A. Full Application with Scene System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phonon - My Song.phonon                                      [─] [□] [×]   │
├───────┬─────────────────────────────────────────────────────────────────────┤
│ FILE  │ EDIT │ VIEW │ SCENES │ HELP                                         │
├───────┴─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┬───────────────┐ │
│ │                                                         │ ┌───────────┐ │ │
│ │     ┌──────────────────────────────────────────┐        │ │  SCENES   │ │ │
│ │     │  Editing: Verse A (32 beats)    [◀][▶]  │        │ ├───────────┤ │ │
│ │     └──────────────────────────────────────────┘        │ │ ▶ Intro   │ │ │
│ │                                                         │ │ ● Verse A │ │ │
│ │                                                         │ │   Chorus  │ │ │
│ │        ○ src1 ──────────▶ ○ pitch ──────▶ ○ spk1       │ │   Bridge  │ │ │
│ │              \                                          │ │   Outro   │ │ │
│ │               \───▶ ○ filter ──────────▶ ○ spk2        │ │───────────│ │ │
│ │                                                         │ │ + New     │ │ │
│ │                                                         │ ├───────────┤ │ │
│ │        ○ src2 ──────────▶ ○ harm ──────▶ ○ spk3        │ │ PROPERTIES│ │ │
│ │                                                         │ │           │ │ │
│ │                                                         │ │ Dur: 32   │ │ │
│ │                                                         │ │ Loop: 2x  │ │ │
│ └─────────────────────────────────────────────────────────┴───────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ARRANGEMENT                                                         [─][+] │
│ ┌───────────────────────────────────────────────────────────────────────────┤
│ │  |0   |16  |32  |48  |64  |80  |96  |112 |128 |144 |160 |176 |192       │
│ │  ████ ████████████████ ████████ ████████████████ ████████ ████          │
│ │  Into Verse A ×2       Chorus   Verse A ×2       Chorus   Outro         │
│ │       ▲                                                                  │
│ └───────┴────────────────────────────────────────────────── Playhead ──────┤
├─────────────────────────────────────────────────────────────────────────────┤
│  [⏮][▶ Play][⏹][⏭]  │  Beat: 45 / 192  │  Scene: Verse A  │  BPM: 120    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### B. Scene Panel Expanded

```
┌─────────────────────────────────┐
│ SCENES              [+] [⚙]    │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ ▶ Intro           16 beats │ │
│ │   🟢 C minor              │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ● Verse A         32 beats │ │  ← Currently editing
│ │   🔵 (×2 loop)            │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │   Chorus          16 beats │ │
│ │   🟠               +5 BPM │ │  ← BPM override
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │   Bridge           8 beats │ │
│ │   🟣 D major              │ │  ← Key override
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │   Outro           16 beats │ │
│ │   ⚫                       │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ─── SCENE PROPERTIES ───        │
│                                 │
│ Name: [Verse A__________]       │
│ Color: [🔵 Blue      ▼]         │
│                                 │
│ Duration: [32] beats  [ ] ∞     │
│ Loop: [2▼] times                │
│                                 │
│ ─── Overrides ───               │
│ [ ] BPM    [   ] (inherit 120)  │
│ [ ] Key    [   ] (inherit C)    │
│ [ ] Scale  [   ] (inherit min)  │
│                                 │
│ ─── Transitions ───             │
│ Enter: [Crossfade▼] [2] beats   │
│ Exit:  [Fade     ▼] [1] beats   │
│                                 │
│ [Duplicate] [Delete] [Export]   │
└─────────────────────────────────┘
```

---

*Document Version: 1.0*  
*Last Updated: December 2024*
