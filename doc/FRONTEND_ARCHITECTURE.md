# Phonon Frontend Architecture

This document covers the TypeScript/React frontend of Phonon, including UI components, state management, audio synthesis, and the graph engine.

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
│   ├── type-guards.ts # Type-safe node/edge factories
│   ├── types.ts    # TypeScript types
│   ├── store/      # Modular Zustand store
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── node-actions.ts
│   │   ├── edge-actions.ts
│   │   ├── scene-actions.ts
│   │   └── ...
│   └── tick/       # Animation and playback
│       ├── index.ts
│       ├── sources.ts
│       └── packets.ts
├── data/           # Example compositions
├── io/             # Input/Output
│   ├── compiler.ts # Offline rendering
│   ├── file-io.ts  # Save/load logic
│   ├── filesystem.ts # Tauri FS wrapper
│   └── midi.ts     # MIDI encoding
└── ui/             # React components
    ├── App.tsx
    ├── PropertyPanel.tsx
    ├── ScenePanel.tsx
    ├── ArrangementTimeline.tsx
    ├── TransportBar.tsx
    ├── Toolbar.tsx
    └── ...
```

---

## 1. UI Layer (React + CSS Modules)

Location: `src/ui/`

### Core Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root component, orchestrates canvas and panels, manages panel collapse state |
| `VizCanvas.tsx` | HTML5 Canvas for graph visualization |
| `PropertyPanel.tsx` | Node/edge property editing |
| `ScenePanel.tsx` | Scene management (collapsible left panel) |
| `RightPanel.tsx` | Editor/Viz/Scene properties toggle (collapsible right panel) |
| `ArrangementTimeline.tsx` | Visual timeline for arrangement mode (collapsible bottom panel) |
| `Toolbar.tsx` | File operations, settings, examples menu |
| `TransportBar.tsx` | Play/Pause/Stop, BPM, playback mode |
| `ContextMenu.tsx` | Right-click node creation menu |
| `ProjectStartupModal.tsx` | Project selection on launch |
| `ExportModal.tsx` | WAV/MIDI export with scene support |

### Collapsible Panel Layout

The UI features three collapsible panels to maximize canvas workspace:

| Panel | Location | Default Size | Collapsed Size |
|-------|----------|--------------|----------------|
| ScenePanel | Left | 280px | 32px |
| RightPanel | Right | 280px | 32px |
| ArrangementTimeline | Bottom | 200px | 32px |

Each panel has an independent collapse state managed in `App.tsx`. Collapse buttons are positioned to avoid overlapping with panel content. CSS transitions (0.3s ease) provide smooth animations.

---

## 2. State Management (Zustand + Immer)

Location: `src/core/store/`

The application uses Zustand for global state management with Immer for immutable updates. The store uses `Map` and `Set` collections for O(1) node/edge lookups.

### Modular Store Structure

| Module | Purpose |
|--------|---------|
| `index.ts` | Store creation and exports |
| `types.ts` | State interface and action types |
| `initial-state.ts` | Default state values |
| `node-actions.ts` | Node CRUD operations |
| `edge-actions.ts` | Edge management |
| `packet-actions.ts` | Packet creation and updates |
| `scene-actions.ts` | Scene management |
| `bulk-actions.ts` | Multi-item operations (copy/paste, grouping) |
| `annotation-actions.ts` | Text annotation management |
| `region-actions.ts` | Visual region management |
| `selection-actions.ts` | Selection state |
| `viewport-actions.ts` | Pan/zoom state |
| `playback-actions.ts` | Transport controls |
| `project-actions.ts` | Project mode state |
| `getters.ts` | Selector functions |

### State Shape

```typescript
interface GraphState {
  // Graph Elements
  nodes: Map<NodeId, GraphNode>;
  edges: Map<EdgeId, GraphEdge>;
  packets: Map<PacketId, Packet>;
  annotations: Map<AnnotationId, Annotation>;
  regions: Map<RegionId, Region>;
  
  // Scene System
  scenes: Map<SceneId, Scene>;
  arrangement: ArrangementSlot[];
  arrangementChannels: ArrangementChannel[];
  activeSceneId: SceneId | null;
  editingSceneId: SceneId | null;
  scenePlayback: ScenePlaybackState;
  
  // Playback
  isRunning: boolean;
  masterSpeed: number;  // BPM
  playbackMode: 'jam' | 'arrangement';
  musicalContext: MusicalContext;
  globalSettings: GlobalSettings;
  
  // Selection
  selection: {
    selectedNodeIds: NodeId[];
    selectedEdgeId: EdgeId | null;
    selectedAnnotationId: AnnotationId | null;
    selectedRegionId: RegionId | null;
  };
  
  // Viewport
  viewport: { x: number; y: number; zoom: number };
  
  // Project mode
  project: {
    path: string | null;
    isProjectMode: boolean;
    currentComposition: string | null;
  };
}
```

---

## 3. Type Safety Utilities

Location: `src/core/type-guards.ts`

The codebase uses branded types (`NodeId`, `EdgeId`, `PacketId`, `SceneId`) for compile-time safety. The type-guards module provides factories that eliminate type assertions:

| Function | Purpose |
|----------|---------|
| `createTypedNode<T>()` | Create nodes with proper discriminated union typing |
| `createTypedEdge()` | Create edges with all required properties |
| `createTypedPacket()` | Create packets with proper typing |
| `createTypedHeldPacket()` | Create held packets for gate nodes |
| `cloneNode<T>()` | Deep clone nodes with optional new ID/position |
| `castNodeType<T>()` | Safe runtime type narrowing with validation |
| `updateNodeProps<T>()` | Type-safe property updates |

### Usage Example

```typescript
// Instead of: node as GraphNode & { type: 'source'; props: SourceProps }
const newNode = createTypedNode('source', nodeId, x, y, {
  interval: 1,
  midiNote: 60,
  noteIndex: -2,
  autoTrigger: true,
  intensity: 0.5
});
```

---

## 4. Scene System

Location: `src/core/store/scene-actions.ts`, `src/core/tick/`

The scene system enables multi-section compositions:

| Feature | Description |
|---------|-------------|
| **Scenes** | Self-contained graph snapshots with duration and settings |
| **Arrangement Mode** | Scenes play on multi-channel timeline |
| **Jam Mode** | Scenes play indefinitely, user triggers changes |
| **Scene Trigger Node** | In-graph node to queue scene transitions |
| **Scene Properties** | Duration, loops, local BPM/key/scale overrides |
| **Auto-save** | Canvas auto-saves to scene when switching |
| **Multi-Channel** | Multiple tracks with independent volume, mute, solo |

### Multi-Channel Architecture

```typescript
interface ArrangementChannel {
  id: string;
  name: string;      // e.g., "Melody", "Bass", "Drums"
  color: string;     // For timeline visualization
  muted: boolean;
  solo: boolean;
  volume: number;    // 0-1 multiplier
}
```

**Virtual Scene Processing**: Scenes on non-displayed channels are processed "virtually" - their sources emit packets, packets travel, and speakers trigger audio, but without canvas rendering.

---

## 5. Canvas Renderer

Location: `src/canvas/renderer.ts`, `src/canvas/input.ts`

A custom 2D canvas renderer handles:
- Node and edge drawing with glow effects
- Packet animation (60fps via requestAnimationFrame)
- Background grid and animated stars
- Zoom/pan viewport transforms
- Selection box rendering
- Annotation and region rendering

### Input Handling

`input.ts` manages:
- Mouse events (click, drag, wheel for zoom)
- Keyboard shortcuts (Delete, Ctrl+C/V, Space for play)
- Multi-select with shift-click
- Box selection
- Node/edge creation via context menu

---

## 6. Audio Engine

Location: `src/audio/`

The audio system uses Web Audio API with an AudioWorklet for sample-accurate synthesis.

### Files

| File | Purpose |
|------|---------|
| `engine.ts` | Main thread: AudioContext setup, reverb, message passing to worklet |
| `worklet.ts` | Audio thread: `PhononSynthProcessor` with multi-voice polyphony |

### Synthesis Features

- **Multi-oscillator layering**: Up to 4 waves per voice (configurable mix)
- **Envelope**: AHD (Attack-Hold-Decay) per oscillator layer
- **Filter**: Low-pass with envelope modulation
- **Effects**: Stereo panning, convolution reverb
- **Polyphony**: Voice stealing for unlimited simultaneous notes

### Message Protocol

```typescript
// Main thread → Worklet
{ type: 'noteOn', note: number, velocity: number, params: SynthParams }
{ type: 'noteOff', note: number }
{ type: 'setReverb', amount: number }

// Worklet → Main thread
{ type: 'voiceCount', count: number }
```

---

## 7. Graph Engine

Location: `src/core/engine.ts`, `src/core/tick/`

The graph simulation runs on a fixed tick rate synchronized to BPM.

### Tick Loop

1. Calculate delta time based on BPM
2. Advance packet positions along edges
3. Process arrivals at nodes (type-specific behavior)
4. Spawn new packets from source nodes
5. Trigger audio events at speaker nodes
6. Update scene playback state (arrangement/jam mode)
7. Request next animation frame

### Node Processing

Each node type has specific behavior when a packet arrives:

| Node Type | Behavior |
|-----------|----------|
| `source` | Emits packets at interval |
| `speaker` | Triggers audio synthesis |
| `pitch` | Modifies packet's MIDI note |
| `polariser` | Assigns waveform/envelope |
| `filter` | Sets filter parameters |
| `gate` | Conditional routing based on scale |
| `delay` | Holds packet for duration |
| `splitter` | Duplicates packet to multiple outputs |
| `tunnel` | Teleports to paired tunnel |

---

## 8. Offline Compiler

Location: `src/io/compiler.ts`, `src/io/video-compiler.ts`

### Audio Compiler

Renders compositions to audio events for WAV export:

| Function | Purpose |
|----------|---------|
| `compileGraph()` | Compile single graph to audio events |
| `compileArrangement()` | Compile full arrangement (all scenes) |
| `calculateArrangementDuration()` | Calculate total duration from scenes |

### Video Compiler

Generates frame-by-frame visualization data for video export:

| Function | Purpose |
|----------|---------|
| `compileVisualization()` | Generate visualization frames |
| `renderFrame()` | Render single frame to canvas |

---

## Data Flow

### Playback Flow

```
User clicks Play
    │
    ▼
store.setIsRunning(true)
    │
    ▼
tick.ts starts animation loop
    │
    ▼
Each frame:
├── engine.processPackets() advances simulation
├── updateArrangementMode() or updateJamMode() handles scene transitions
├── Packets reaching speakers → audio events to worklet
└── renderer.render() draws current state
    │
    ▼
User clicks Stop → simulation pauses, audio fades
```

### Save/Load Flow

```
User clicks Save
    │
    ▼
saveCurrentScene() saves canvas to editing scene
    │
    ▼
serializeComposition() converts scenes/arrangement to JSON
    │
    ▼
If Project Mode: Write to {projectPath}/{name}.phono
Else: Browser download
```
