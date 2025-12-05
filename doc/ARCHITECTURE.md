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
│  │  - Dialogs  │  │  - Edges    │  │  - Multi-Osc Synthesis  │  │
│  └─────────────┘  │  - Packets  │  │  - Effects Chain        │  │
│                   │  - Scenes   │  └─────────────────────────┘  │
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
| `Toolbar.tsx` | File operations, Save button |
| `TransportBar.tsx` | Play/Stop, BPM control |
| `ContextMenu.tsx` | Right-click node creation |
| `ProjectStartupModal.tsx` | Project selection on launch |
| `ExportModal.tsx` | WAV export dialog |

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
  scenes: Map<SceneId, Scene>;
  
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

### 3. Canvas Renderer

Location: `src/canvas/renderer.ts`, `src/canvas/input.ts`

A custom 2D canvas renderer handles:
- Node and edge drawing with glow effects
- Packet animation (60fps)
- Background grid and animated stars
- Zoom/pan viewport transforms
- Selection box rendering

### 4. Audio Engine

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

### 5. Graph Engine

Location: `src/core/engine.ts`, `src/core/tick.ts`

The graph simulation runs on a fixed tick rate:
1. Advance packet positions along edges
2. Process arrivals at nodes
3. Spawn new packets from sources
4. Trigger audio events at speakers

### 6. Backend (Tauri / Rust)

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
│   ├── store.ts    # Zustand state
│   ├── tick.ts     # Animation loop
│   └── types.ts    # TypeScript types
├── data/           # Example compositions
├── io/             # Input/Output
│   ├── compiler.ts # Offline WAV rendering
│   ├── file-io.ts  # Save/load logic
│   ├── filesystem.ts # Tauri FS wrapper
│   └── midi.ts     # MIDI encoding
└── ui/             # React components
    ├── App.tsx
    ├── PropertyPanel.tsx
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
   - Packets reaching speakers emit audio events
   - `renderer.render()` draws current state
4. User clicks **Stop** → simulation pauses, audio fades

### Save/Load Flow

1. User clicks **Save** → `Toolbar.handleSave()`
2. Serialize state to JSON
3. If Project Mode: Write to `{projectPath}/{name}.phono`
4. Else: Browser download

## File Format

Compositions are stored as `.phono` files (JSON):

```json
{
  "version": "2.0.0",
  "timestamp": 1733430000000,
  "projectMeta": {
    "name": "My Composition",
    "author": "",
    "created": 1733430000000,
    "modified": 1733430000000
  },
  "globalSettings": {
    "gravityConstant": 0.5
  },
  "musicalContext": {
    "root": 0,
    "scaleName": "major"
  },
  "nodes": [...],
  "edges": [...]
}
```
