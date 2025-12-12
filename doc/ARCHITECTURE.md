# Stochastic Architecture

Stochastic is a desktop application built using web technologies and the Tauri framework. It combines a React-based UI with a high-performance audio engine and a Rust-based backend for system integration.

## Documentation

| Document | Contents |
|----------|----------|
| [Frontend Architecture](./FRONTEND_ARCHITECTURE.md) | React UI, State Management, Canvas, Audio Engine, Graph Engine |
| [Backend Architecture](./BACKEND_ARCHITECTURE.md) | Tauri/Rust, File System, Export Systems |
| [AI Generation Guide](./AI_GENERATION_GUIDE.md) | File format specification for AI-generated compositions |

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Tauri Container                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  React UI   │  │   Zustand   │  │     Audio Engine        │  │
│  │             │◄─┤    Store    │──┤  (AudioWorklet Thread)  │  │
│  │  - Canvas   │  │             │  │                         │  │
│  │  - Panels   │  │  - Nodes    │  │  - StochasticSynthProcessor │  │
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

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **UI** | React + TypeScript | Component-based interface |
| **Styling** | CSS Modules | Scoped component styles |
| **State** | Zustand + Immer | Global state with immutable updates |
| **Canvas** | HTML5 Canvas 2D | Graph visualization and animation |
| **Audio** | Web Audio API + AudioWorklet | Real-time synthesis |
| **Desktop** | Tauri (Rust) | Native file access, window management |
| **Build** | Vite | Fast development and bundling |

---

## Core Systems

### Graph Engine
The visual programming model where nodes process audio packets traveling along edges. Supports 16+ node types including sources, effects, and routing.

→ See [Frontend Architecture - Graph Engine](./FRONTEND_ARCHITECTURE.md#7-graph-engine)

### Scene System
Multi-section compositions with arrangement timeline and live performance (jam) mode. Scenes can override BPM, key, and scale.

→ See [Frontend Architecture - Scene System](./FRONTEND_ARCHITECTURE.md#4-scene-system)

### Audio Synthesis
Multi-oscillator polyphonic synthesizer with AHD envelopes, filters, and convolution reverb. Runs in AudioWorklet for low latency.

→ See [Frontend Architecture - Audio Engine](./FRONTEND_ARCHITECTURE.md#6-audio-engine)

### File I/O
`.phono` JSON format for compositions. Supports project mode for multi-file workflows. Legacy format migration.

→ See [Backend Architecture - File I/O](./BACKEND_ARCHITECTURE.md#4-file-io)

---

## Directory Structure

```
src/
├── audio/          # Audio synthesis (AudioWorklet)
├── canvas/         # 2D rendering and input handling
├── core/           # Application logic
│   ├── store/      # Modular Zustand store
│   ├── tick/       # Animation and playback
│   ├── type-guards.ts
│   ├── types.ts
│   └── engine.ts
├── data/           # Example compositions
├── io/             # File operations, export
└── ui/             # React components

src-tauri/          # Rust backend
├── src/main.rs
└── tauri.conf.json
```

---

## Data Flow

### Real-time Playback
```
Play button → setIsRunning(true) → tick loop starts
                                        │
    ┌───────────────────────────────────┴───────────────────────────┐
    │                         Each Frame                            │
    ├───────────────────────────────────────────────────────────────┤
    │  1. engine.processPackets() - advance simulation              │
    │  2. Scene transitions (arrangement/jam mode)                  │
    │  3. Speaker nodes → AudioWorklet noteOn messages              │
    │  4. renderer.render() - draw current state                    │
    └───────────────────────────────────────────────────────────────┘
```

### Save/Load
```
Save → saveCurrentScene() → serializeComposition() → Tauri writeTextFile
Load → Tauri readTextFile → deserializeComposition() → populate store
```

---

## File Format (V3)

Compositions are stored as `.phono` files (JSON):

```json
{
  "meta": { "version": "3.0.0", "name": "...", "author": "..." },
  "global": { "masterBpm": 120, "rootNote": 60, "scaleName": "major" },
  "scenes": [
    {
      "id": "scene-1",
      "name": "Main",
      "durationBeats": 16,
      "nodes": [...],
      "edges": [...]
    }
  ],
  "arrangement": [{ "id": "slot-1", "sceneId": "scene-1", "startBeat": 0 }],
  "channels": [{ "id": "channel-0", "name": "Track 1", "volume": 1 }]
}
```

→ See [AI Generation Guide](./AI_GENERATION_GUIDE.md) for complete schema reference.
