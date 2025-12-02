# AIGA / Qbeat: Roadmap & Future Improvements

This document outlines the development trajectory for AIGA, moving from its current stable prototype to a fully realized "Quantum Music Engine."

## Phase 1: Foundation (Current Status)
**Goal:** A stable, testable, and usable graph-based audio toy.
- [x] **Core Graph Engine:** Nodes, Edges, Packets.
- [x] **Basic Nodes:** Source, Emitter, Pitch, Polariser.
- [x] **Audio Engine:** Web Audio API integration (Oscillators, Gain, Pan).
- [x] **Serialization:** Save/Load graph state.
- [x] **Testing:** Comprehensive Unit and E2E test suite.
- [x] **UI:** Canvas interaction, Context Menu, Property Panel.

## Phase 2: The Quantum Expansion (Short-Term)
**Goal:** Implement the "Quantum" mechanics that differentiate Qbeat from standard sequencers.

### 2.1 Advanced Nodes
- **Splitter Node:** Takes 1 packet, emits N packets. Essential for polyphony and branching paths.
- **Gate Node (Probabilistic):** A node with a 0-100% slider. Packets pass or die based on chance. (Stochastic music foundation).
- **Tunnel Node:** A container node that holds a sub-graph. Allows for "Integrated Circuits" of music (e.g., a "Snare Drum" tunnel containing noise + envelope nodes).

### 2.2 Visual Feedback
- **Particle Trails:** Visual history of where packets have been.
- **Pulse Animation:** Nodes should pulse visually when processing a packet.
- **Wire Animation:** Edges should vibrate or light up as packets travel.

### 2.3 Audio Polish
- **ADSR Envelopes:** More granular control over Attack/Decay/Sustain/Release in the Polariser or Emitter.
- **Global Effects:** Master Reverb/Delay send controls.

## Phase 3: The Living Graph (Mid-Term)
**Goal:** Introduce biological/evolutionary metaphors.

### 3.1 Mutators & LFOs
- **LFO Node:** Does not process packets but connects to *properties* of other nodes (e.g., modulating the "Shift" of a Pitch node over time).
- **Randomizer Node:** Randomly alters specific properties of passing packets (e.g., +/- 12 semitones).

### 3.2 The "Listener" System
- **Key/Scale Quantizer:** A global setting or node that forces all passing pitches into a specific scale (e.g., C Minor Pentatonic).
- **Feedback Loops:** Allow output of Emitters to feed back into Sources to trigger new events (Self-generating systems).

## Phase 4: The Ecosystem (Long-Term)
**Goal:** Professional features and community.

### 4.1 Interoperability
- **MIDI Out:** Emitters send MIDI Note On/Off instead of internal audio. Allows AIGA to drive Ableton/Logic.
- **VST/AU Plugin:** Wrap the engine (via JUCE or similar) to run inside a DAW.

### 4.2 3D / VR Interface
- Move from 2D Canvas to 3D Space (Three.js).
- **Z-Axis:** Use depth for volume or filter cutoff.
- **VR Mode:** "Walk" inside the song structure.

### 4.3 Collaboration
- **Multiplayer:** Real-time collaborative graph editing (using WebSockets/CRDTs).
- **Palette Sharing:** Share "Tunnels" (presets) as snippets of code/JSON.

## Technical Debt & Refactoring
- **TypeScript Migration:** For better type safety as the graph logic grows complex.
- **Worker Threads:** Move the physics/graph simulation to a Web Worker to prevent UI blocking during complex simulations.
- **WASM (WebAssembly):** Port the core DSP (Digital Signal Processing) to Rust/WASM for performance.
