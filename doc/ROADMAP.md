# Phonon: Roadmap & Future Improvements

This document outlines the development trajectory for Phonon, moving from its current stable desktop release to a fully realized "Quantum Music Engine."

## Phase 1: Foundation (Completed)
**Goal:** A stable, testable, and usable graph-based audio application.
- [x] **Core Graph Engine:** Nodes, Edges, Packets.
- [x] **Basic Nodes:** Source, Speaker, Pitch, Polariser.
- [x] **Advanced Nodes:** Splitter, Gate, Tunnel (Sub-graphs).
- [x] **Audio Engine:** Web Audio API integration (Oscillators, Gain, Pan).
- [x] **Desktop Integration:** Tauri-based application with native file system access.
- [x] **Project Management:** Save/Load compositions to disk, Project Mode.
- [x] **Export:** Render compositions to WAV audio files.
- [x] **Testing:** Comprehensive Unit and E2E test suite.

## Phase 2: The Living Graph (Current Focus)
**Goal:** Introduce biological/evolutionary metaphors and deeper modulation.

### 2.1 Mutators & LFOs
- **LFO Node:** Does not process packets but connects to *properties* of other nodes (e.g., modulating the "Shift" of a Pitch node over time).
- **Randomizer Node:** Randomly alters specific properties of passing packets (e.g., +/- 12 semitones).

### 2.2 Visual Feedback Polish
- **Particle Trails:** Visual history of where packets have been.
- **Pulse Animation:** Nodes should pulse visually when processing a packet.
- **Wire Animation:** Edges should vibrate or light up as packets travel.

### 2.3 Audio Polish
- **ADSR Envelopes:** More granular control over Attack/Decay/Sustain/Release in the Polariser or Speaker.
- **Global Effects:** Master Reverb/Delay send controls.

## Phase 3: The Ecosystem (Long-Term)
**Goal:** Professional features and community.

### 3.1 Interoperability
- **MIDI Out:** Speakers send MIDI Note On/Off instead of internal audio. Allows Phonon to drive Ableton/Logic.
- **VST/AU Plugin:** Wrap the engine (via JUCE or similar) to run inside a DAW.

### 3.2 3D / VR Interface
- Move from 2D Canvas to 3D Space (Three.js).
