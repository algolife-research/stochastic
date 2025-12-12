# Stochastic: Roadmap & Future Improvements

This document outlines the development trajectory for Stochastic, moving from its current stable desktop release to a fully realized "Quantum Music Engine."

## Phase 1: Foundation (Completed ✓)
**Goal:** A stable, testable, and usable graph-based audio application.
- [x] **Core Graph Engine:** Nodes, Edges, Packets.
- [x] **Basic Nodes:** Source, Speaker, Pitch, Polariser.
- [x] **Advanced Nodes:** Splitter, Gate, Tunnel (Sub-graphs).
- [x] **Audio Engine:** Web Audio API integration (Oscillators, Gain, Pan).
- [x] **Desktop Integration:** Tauri-based application with native file system access.
- [x] **Project Management:** Save/Load compositions to disk, Project Mode.
- [x] **Export:** Render compositions to WAV audio files.
- [x] **Testing:** Comprehensive Unit and E2E test suite.

## Phase 2: Scene System (Completed ✓)
**Goal:** Multi-section compositions with arrangement and live performance modes.

### 2.1 Core Scene Features
- [x] **Scene Data Model:** Scenes store graph snapshots (nodes, edges, annotations, regions)
- [x] **Scene Panel UI:** List view, create/duplicate/delete, properties editor
- [x] **Scene Properties:** Name, color, duration (beats), loop count
- [x] **Local Overrides:** Per-scene BPM, root note, and scale settings
- [x] **Auto-save:** Canvas auto-saves to scene when switching

### 2.2 Playback Modes
- [x] **Arrangement Mode:** Scenes play in defined order with enforced durations
- [x] **Jam Mode:** Scenes play indefinitely until user triggers change
- [x] **Mode Toggle:** Transport bar switch between modes

### 2.3 Transport Controls
- [x] **Play/Pause/Stop:** Full transport with pause (preserves state) and stop (resets)
- [x] **Scene Triggering:** Click to load, double-click for immediate switch
- [x] **Scene Queuing:** Queue next scene in Jam mode
- [x] **Scene Trigger Node:** In-graph node to trigger scene jumps or queued transitions

### 2.4 Arrangement
- [x] **Arrangement Timeline:** Visual timeline showing scene sequence
- [x] **Timeline Scrubbing:** Drag playhead to seek in arrangement
- [x] **Linear Rendering:** Timeline width proportional to beat duration
- [x] **Add to Arrangement:** Add scenes with automatic position calculation
- [x] **Slot Management:** Reorder, remove arrangement slots
- [x] **Multi-Channel Support:** Multiple tracks playing simultaneously
- [x] **Channel Controls:** Per-track mute, solo, volume

### 2.5 Export
- [x] **Arrangement Export:** Export entire arrangement to WAV/MIDI
- [x] **Duration Calculation:** Auto-calculate total duration from scenes
- [x] **Export Mode Toggle:** Choose between canvas or arrangement export
- [x] **Multi-Channel Export:** All channels play during export

## Phase 2.5: UX & Stability (Missing Essentials)
**Goal:** Essential features for a safe and forgiving creative workflow.

- [ ] **Undo/Redo System:** Robust history stack for graph operations (Global or Per-Scene).
- [ ] **Master Limiter:** Safety limiter on the master output to prevent clipping/volume spikes.
- [ ] **Compressor Node:** Dynamics control for taming feedback loops and generative swells.
- [ ] **Minimap:** Navigation aid for large, complex node graphs.
- [ ] **Clipboard:** Copy/Paste nodes between different scenes.

## Phase 3: The Living Graph (Current Focus)
**Goal:** Introduce biological/evolutionary metaphors and deeper modulation.

### 3.1 Mutators & LFOs
- [x] **LFO Node:** Continuous modulation of node properties
- [x] **Markov Chains:** Weighted probability routing in Splitter nodes
- [ ] **Macro Controls:** Global "Performance Knobs" that map to multiple parameters across the graph.
- [ ] **Randomizer Node:** Random property mutations on packets
- [ ] **Mutator Node (Genetic Drift):** Incremental (Drift) or drastic (Radiation) changes to packet properties.
- [ ] **Crossover Node (Sexual Reproduction):** Merges two packets, inheriting properties from both parents.
- [ ] **Fitness Gate (Natural Selection):** Filters packets based on harmonic, energy, or density criteria.

### 3.2 Visual Feedback Polish
- [ ] **Particle Trails:** Visual history of where packets have been
- [x] **Pulse Animation:** Nodes flash visually when processing a packet
- [x] **Wire Animation:** Edges animate as packets travel

### 3.3 Audio Polish
- [x] **AHD Envelopes:** Attack-Hold-Decay control on Polariser and Speaker
- [x] **Global Reverb:** Master reverb send with convolution
- [ ] **Per-Scene Transitions:** Crossfade/fade audio during scene changes

## Phase 4: Advanced Scene Features (Planned)
**Goal:** Professional-grade scene orchestration.

### 4.1 Transitions
- [x] **Crossfade Transitions:** Smooth audio blend between scenes (via Scene Trigger)
- [ ] **BPM Ramping:** Gradual tempo changes during transitions
- [ ] **Transition Curves:** Configurable fade curves

### 4.2 Live Performance
- [ ] **MIDI Triggering:** Trigger scenes via MIDI notes
- [ ] **Keyboard Shortcuts:** Number keys for scene selection
- [ ] **Phrase Quantization:** Queue triggers to next bar/phrase

### 4.3 Advanced Arrangement
- [ ] **Drag-and-Drop:** Reorder scenes in timeline
- [ ] **Per-Slot Overrides:** Instance-specific BPM and loop count
- [ ] **Markers/Cue Points:** Annotation markers in arrangement

## Phase 5: Visual Art Generator (Planned)
**Goal:** Transform Stochastic into a generative audiovisual instrument with video export.

### 5.1 Visualization Mode System
- [ ] **Viz Mode Property:** Per-scene visualization mode setting
- [ ] **Mode Switching:** Toggle between Editor mode (default) and Visualization modes
- [ ] **Multiple Viz Modes:** Abstract, Geometric, Particle, Wave, Spectral, etc.
- [ ] **Mode Preview:** Quick preview of visualization without leaving editor

### 5.2 Core Visualization Engine
- [ ] **Viz Renderer:** Separate WebGL/Canvas renderer for generative art
- [ ] **Data Binding:** Map musical properties to visual parameters
- [ ] **Packet Visualization:** Transform packet flow into visual elements
- [ ] **Node Influence:** Nodes affect surrounding visual space
- [ ] **Edge Dynamics:** Edges as visual connectors/flow lines

### 5.3 Musical Data → Visual Mapping
- [ ] **Frequency → Color:** Map pitch/frequency to color palettes
- [ ] **Intensity → Size/Brightness:** Velocity/gain affects visual magnitude
- [ ] **Position → Spatial:** Node positions influence visual composition
- [ ] **Timing → Motion:** Beat/rhythm drives animation timing
- [ ] **Wave Type → Texture:** Different wave shapes create different textures
- [ ] **Envelope → Opacity/Scale:** AHD curves control visual element lifecycle

### 5.4 Generative Art Modes
- [ ] **Abstract Flow:** Organic shapes following packet paths
- [ ] **Geometric Patterns:** Crystalline structures based on graph topology
- [ ] **Particle Systems:** Explosions of particles at speaker nodes
- [ ] **Wave Interference:** Rippling patterns from overlapping frequencies
- [ ] **Spectral Visualizer:** Real-time frequency spectrum display
- [ ] **Kaleidoscope:** Symmetric reflections of graph activity

### 5.5 Video Export
- [ ] **Frame Capture:** Render visualization frames in sync with audio
- [ ] **Video Encoding:** Export to MP4/WebM with audio track
- [ ] **Resolution Options:** 720p, 1080p, 4K export targets
- [ ] **Frame Rate:** 30fps, 60fps options
- [ ] **Arrangement Export:** Full arrangement rendered as video

### 5.6 Advanced Visual Features
- [ ] **Visual Presets:** Save and load visualization configurations
- [ ] **Per-Scene Viz Settings:** Different visual styles per scene
- [ ] **Transitions:** Visual transitions between scenes (matching audio)
- [ ] **Custom Shaders:** User-defined GLSL shaders for advanced effects
- [ ] **Real-time Performance:** Optimized rendering for live performance

## Phase 6: The Ecosystem (Long-Term)
**Goal:** Professional features and community.

### 6.1 Interoperability
- [x] **MIDI Out:** Speakers can send MIDI Note On/Off
- [ ] **VST/AU Plugin:** Wrap the engine to run inside a DAW
- [ ] **OSC Support:** Control Stochastic from external applications

### 6.2 3D / VR Interface
- [ ] Move from 2D Canvas to 3D Space (Three.js)
- [ ] VR composition environment

### 6.3 Collaboration
- [ ] **Cloud Sync:** Save compositions to cloud
- [ ] **Sharing:** Publish and discover community compositions
- [ ] **Real-time Collaboration:** Multi-user editing

## Future Concepts & Experimental Ideas
**Goal:** Radical ideas inspired by biological systems.

- [ ] **Viral Packets (Horizontal Gene Transfer):** Packets that modify the properties of the Nodes they pass through (e.g., a "Minor Key Virus").
- [ ] **Breeder Interface (Artificial Selection):** UI for evolving scenes by generating variations and selecting survivors to breed the next generation.
