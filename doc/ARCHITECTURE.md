# Phonon Architecture

Phonon is a desktop application built using web technologies and the Tauri framework. It combines a React-based UI with a high-performance audio engine and a Rust-based backend for system integration.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Tauri Container                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  React UI   │  │   Zustand   │  │     Audio Engine        │  │
│  │             │◄─┤    Store    │──┤  (AudioWorklet Thread)  │  │
│  │  - Canvas   │  │             │  │                         │  │
│  │  - Panels   │  │  - Nodes    │  │  - PhononSynthProcessor │  │
│  │  - Scenes   │  │  - Edges    │  │  - Multi-Osc Synthesis  │  │
│  │  - Dialogs  │  │  - Packets  │  │  - Effects Chain        │  │
│  └─────────────┘  │  - Scenes   │  └─────────────────────────┘  │
│                   │  - Arrange  │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │   Tauri FS  │                               │
│                   │  - Dialog   │                               │
│                   │  - Read/Write│                              │
│                   └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend (React + TypeScript)

Location: `src/ui/`

The user interface is built with React and CSS Modules. Key components:

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root component, orchestrates canvas and panels |
| `Canvas.tsx` | HTML5 Canvas for graph visualization (via `src/canvas/renderer.ts`) |
| `PropertyPanel.tsx` | Node/edge property editing |
| `ScenePanel.tsx` | Scene management, properties, arrangement |
| `ArrangementTimeline.tsx` | Visual timeline for arrangement mode |
| `Toolbar.tsx` | File operations, Save button |
| `TransportBar.tsx` | Play/Pause/Stop, BPM, playback mode |
| `ContextMenu.tsx` | Right-click node creation |
| `ProjectStartupModal.tsx` | Project selection on launch |
| `ExportModal.tsx` | WAV/MIDI export with scene support |

### 2. State Management (Zustand + Immer)

Location: `src/core/store.ts`

The application uses Zustand for global state management with Immer for immutable updates. The store uses `Map` and `Set` collections for O(1) node/edge lookups.

```typescript
interface GraphState {
  nodes: Map<NodeId, GraphNode>;
  edges: Map<EdgeId, GraphEdge>;
  packets: Map<PacketId, Packet>;
  annotations: Map<AnnotationId, Annotation>;
  regions: Map<RegionId, Region>;
  
  // Scene System
  scenes: Map<SceneId, Scene>;
  arrangement: ArrangementSlot[];
  activeSceneId: SceneId | null;
  editingSceneId: SceneId | null;
  scenePlayback: ScenePlaybackState;
  
  isRunning: boolean;
  masterSpeed: number;  // BPM
  musicalContext: MusicalContext;
  globalSettings: GlobalSettings;
  
  // Project mode
  project: {
    path: string | null;
    isProjectMode: boolean;
    currentComposition: string | null;
  };
}
```

### 3. Scene System

Location: `src/core/store.ts` (scene actions), `src/core/tick.ts` (playback)

The scene system enables multi-section compositions:

| Feature | Description |
|---------|-------------|
| **Scenes** | Self-contained graph snapshots with duration and settings |
| **Arrangement Mode** | Scenes play in sequence with defined durations |
| **Jam Mode** | Scenes play indefinitely, user triggers changes |
| **Scene Properties** | Duration, loops, local BPM/key/scale overrides |
| **Auto-save** | Canvas auto-saves to scene when switching |

### 4. Canvas Renderer

Location: `src/canvas/renderer.ts`, `src/canvas/input.ts`

A custom 2D canvas renderer handles:
- Node and edge drawing with glow effects
- Packet animation (60fps)
- Background grid and animated stars
- Zoom/pan viewport transforms
- Selection box rendering

### 5. Audio Engine

Location: `src/audio/`

The audio system uses Web Audio API with an AudioWorklet for sample-accurate synthesis:

| File | Purpose |
|------|---------|
| `engine.ts` | Main thread: context setup, reverb, message passing |
| `worklet.ts` | Audio thread: `PhononSynthProcessor` with multi-voice polyphony |

**Synthesis Features:**
- Multi-oscillator layering (up to 4 waves per voice)
- AHD envelope (Attack-Hold-Decay)
- Filter with envelope modulation
- Stereo panning
- Convolution reverb

### 6. Graph Engine

Location: `src/core/engine.ts`, `src/core/tick.ts`

The graph simulation runs on a fixed tick rate:
1. Advance packet positions along edges
2. Process arrivals at nodes
3. Spawn new packets from sources
4. Trigger audio events at speakers
5. Update scene playback state (arrangement/jam mode)

### 7. Offline Compiler

Location: `src/io/compiler.ts`

The compiler renders compositions to audio files:

| Function | Purpose |
|----------|---------|
| `compileGraph()` | Compile single graph to audio events |
| `compileArrangement()` | Compile full arrangement (all scenes) |
| `calculateArrangementDuration()` | Calculate total duration from scenes |

### 8. Backend (Tauri / Rust)

Location: `src-tauri/`

Tauri provides:
- Native file dialogs (`@tauri-apps/api/dialog`)
- Direct filesystem access (`@tauri-apps/api/fs`)
- Window management and system tray
- Cross-platform builds (Windows, macOS, Linux)

## Directory Structure

```
src/
├── audio/          # Audio synthesis
│   ├── engine.ts   # Main thread audio management
│   └── worklet.ts  # AudioWorklet processor
├── canvas/         # Rendering
│   ├── renderer.ts # Canvas drawing
│   └── input.ts    # Mouse/keyboard handling
├── core/           # Application core
│   ├── constants.ts # Config values, scales
│   ├── engine.ts   # Graph processing
│   ├── store.ts    # Zustand state (includes scenes)
│   ├── tick.ts     # Animation loop + scene playback
│   └── types.ts    # TypeScript types
├── data/           # Example compositions
├── io/             # Input/Output
│   ├── compiler.ts # Offline rendering (single + arrangement)
│   ├── file-io.ts  # Save/load logic
│   ├── filesystem.ts # Tauri FS wrapper
│   └── midi.ts     # MIDI encoding
└── ui/             # React components
    ├── App.tsx
    ├── PropertyPanel.tsx
    ├── ScenePanel.tsx        # Scene management
    ├── ArrangementTimeline.tsx # Arrangement view
    ├── TransportBar.tsx      # Play/Pause/Stop + mode
    ├── Toolbar.tsx
    └── ...

src-tauri/          # Rust backend
├── src/main.rs
├── tauri.conf.json
└── icons/
```

## Data Flow

### Playback Flow

1. User clicks **Play** → `store.setIsRunning(true)`
2. `tick.ts` starts animation loop
3. Each frame:
   - `engine.processPackets()` advances simulation
   - `updateArrangementMode()` or `updateJamMode()` handles scene transitions
   - Packets reaching speakers emit audio events
   - `renderer.render()` draws current state
4. User clicks **Stop** → simulation pauses, audio fades

### Save/Load Flow

1. User clicks **Save** → `Toolbar.handleSave()`
2. `saveCurrentScene()` saves canvas to editing scene
3. `serializeComposition()` converts scenes/arrangement to JSON
4. If Project Mode: Write to `{projectPath}/{name}.phono`
5. Else: Browser download

## File Format

Compositions are stored as `.phono` files (JSON). **Version 3.0** uses scene-based structure:

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "My Composition",
    "author": "",
    "created": 1733430000000,
    "modified": 1733430000000
  },
  "global": {
    "rootNote": 0,
    "scaleName": "major",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed",
    "masterBpm": 120
  },
  "scenes": [
    {
      "id": "scene-1",
      "name": "Main",
      "color": "#4CAF50",
      "durationBeats": 16,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [...],
      "edges": [...],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-1", "startBeat": 0 }
  ]
}
```

> **Note:** The app supports loading legacy V2 files (with `graph.nodes`/`graph.edges`) and automatically migrates them to V3 format.
