# Stochastic: Development Roadmap

Stochastic is evolving from a creative tool for exploration into a professional instrument for composition, performance, and integration. This roadmap reflects our core priorities for 2025.

## Current Status
**Foundation Complete:** Core engine, scene system, basic nodes, audio/video export all working.

**Focus Areas for Next 6 Months:**
1. **Project Management UX** - Professional workflow, session management
2. **Public Projects** - Community library and project discovery
3. **Examples & Onboarding** - Curated learning paths and interactive tutorials
4. **Visualization Modes** - Clean, improve, and expand visual feedback
5. **MIDI/VST for Professionals** - DAW integration and hardware control

---

## Priority 1: Project Management UX (Q1 2025)
**Goal:** Professional-grade project workflows for serious musicians and developers.

### 1.1 Project Organization
- [ ] **Project Templates:** Start from templates (empty, minimal, example-based)
- [ ] **Project Settings:** Global metadata (title, artist, BPM, time signature)
- [ ] **Project Browser:** File picker with recent projects, starred/favorites
- [ ] **Project Backups:** Auto-versioning with ability to restore old versions
- [ ] **Session Management:** Persist UI state (zoom, pan, panel layout) per project

### 1.2 Scene Management Improvements
- [ ] **Scene Presets:** Save/load scene templates with common graphs
- [ ] **Scene Locking:** Protect critical scenes from accidental edits

### 1.3 Workflow Enhancements
- [ ] **Undo/Redo System:** Full history stack with visual timeline
- [ ] **Auto-Save:** Configurable auto-save interval with visual indicator
- [ ] **Save As:** Create project variants (live version, demo mix, etc.)
- [ ] **Diff Viewer:** Compare versions and see what changed
- [ ] **Quick Copy/Paste:** Copy nodes between scenes efficiently

### 1.4 Performance & Stability
- [ ] **Master Limiter:** Safety limiter to prevent clipping on master output
- [ ] **Compressor Node:** Dynamics control for feedback loops and swells
- [ ] **Crash Recovery:** Auto-recovery of unsaved work
- [ ] **Large Project Support:** Optimize for graphs with 100+ nodes

---

## Priority 2: Public Projects & Community (Q1-Q2 2025)
**Goal:** Build a library of community compositions and learning resources.

See detailed implementation plan: [PUBLIC_PROJECTS_STRATEGY.md](PUBLIC_PROJECTS_STRATEGY.md)

### 2.1 Community Features (MVP)
- [ ] **Browse Projects:** Search/filter community projects by category, tags, difficulty
- [ ] **Publish to Community:** Export project as public with metadata
- [ ] **Load Public Project:** Import community projects directly into workspace
- [ ] **Like/Rating System:** Users can like and provide feedback
- [ ] **Fork/Remix:** Create derivations of existing projects with attribution

### 2.2 Curation & Discovery
- [ ] **Featured Projects:** Homepage carousel of hand-picked works
- [ ] **Trending Section:** Algorithmically selected popular/recent projects
- [ ] **Curated Collections:** Staff-created playlists (e.g., "Ambient Explorations")
- [ ] **Creator Profiles:** User pages showing all published projects
- [ ] **Project Statistics:** View count, like count, remix count

### 2.3 Moderation & Safety
- [ ] **Content Policy:** Clear guidelines for publishable content
- [ ] **Report System:** Flag inappropriate or problematic projects
- [ ] **Moderation Queue:** Admin dashboard to review reports
- [ ] **Verified Badge:** Mark high-quality or official projects

### 2.4 Integration
- [ ] **Seed with Examples:** Import curated examples as public projects
- [ ] **Share Links:** Generate shareable URLs to load projects
- [ ] **Embed Button:** Share Stochastic projects on blogs/websites

---

## Priority 3: Examples & Onboarding (Q1-Q2 2025)
**Goal:** Curated learning path from beginner to advanced, with interactive guidance.

### 3.1 Examples Cleanup & Curation
- [ ] **Reduce from 50 to 15 Curated Examples** (IN PROGRESS)
  - Tutorial (10 scenes: first sound, pitch, filters, etc.)
  - Oscillator modes, Filter types, Noise types (educational)
  - Key demos: Mozart dice, Techno, Ambient drone, Gamelan, Canon in D
  - Advanced: LFO, Quantizer, Tunnels, Teleporter, Euclidean rhythms, Genetic evolution
- [ ] **Fix & Polish:** Review audio quality, fix bugs, add annotations
- [ ] **Tag System:** Mark examples by category (tutorial, ambient, rhythmic, etc.)
- [ ] **Difficulty Levels:** Label as beginner/intermediate/advanced

### 3.2 Interactive Onboarding
- [ ] **First-Time User Flow:** 30-second interactive walkthrough
  - What is Stochastic?
  - Create first sound (source → speaker)
  - Explore modifier (pitch, gain)
  - Save project
- [ ] **Interactive Lessons:** Step-by-step tutorials with guided canvas
  - Lesson 1: Basic Synthesis
  - Lesson 2: Composition & Arrangement
  - Lesson 3: Advanced Techniques
- [ ] **Tip System:** Context-sensitive hints in UI ("Did you know?", "Try this")
- [ ] **Sandbox Mode:** Safe environment to explore without breaking things

### 3.3 Video Content
- [ ] **Getting Started Video:** 5-10 min overview
- [ ] **Technique Videos:** Feature-specific tutorials (scenes, tunnels, quantizers)
- [ ] **Showcase Videos:** Examples of finished compositions
- [ ] **YouTube Integration:** Embed videos in help system

### 3.4 Documentation
- [ ] **Interactive Docs:** In-app help system with examples
- [ ] **Glossary:** Define musical and technical terms
- [ ] **API Docs:** For developers extending Stochastic
- [ ] **FAQ:** Common issues and solutions

---

## Priority 4: Visualization Modes (Q2-Q3 2025)
**Goal:** Rich visual feedback that brings compositions to life.

### 4.1 Visualization System Architecture
- [ ] **Viz Mode Framework:** Plugin architecture for different visualizers
- [ ] **Scene Viz Settings:** Per-scene visualization mode selection
- [ ] **Real-time Switching:** Toggle between editor and viz modes instantly
- [ ] **Performance Optimization:** WebGL rendering for smooth 60fps

### 4.2 Core Visualization Modes
- [ ] **Flow Visualization:** Packet paths as animated trails
- [ ] **Frequency Spectrum:** Real-time FFT display of audio output
- [ ] **Waveform Analyzer:** Shows the generated waveform in real-time
- [ ] **Node Activity Heat Map:** Intensity indicates node activity
- [ ] **Particle System:** Sparks/particles at key nodes and events

### 4.3 Advanced Visualizations
- [ ] **Geometric Patterns:** Graph topology rendered as evolving geometry
- [ ] **Color Mapping:** Pitch → hue, Intensity → brightness, Pan → position
- [ ] **Kaleidoscope:** Symmetric reflections of graph/audio data
- [ ] **Wave Interference:** Rippling patterns from frequency interactions
- [ ] **3D Node Space:** Experimental 3D graph visualization

### 4.4 Customization & Export
- [ ] **Viz Presets:** Save/load visualization configurations
- [ ] **Custom Palettes:** User-defined color schemes
- [ ] **Video Capture:** Record visualization as video with audio
- [ ] **Video Export:** Render full arrangement as synchronized video
- [ ] **Resolution/Quality:** 720p, 1080p, 4K options

---

## Priority 5: MIDI & VST for Professionals (Q2-Q3 2025)
**Goal:** Professional integration with DAWs and hardware controllers.

### 5.1 MIDI Control & Sync
- [ ] **MIDI Note Input:** Trigger notes via external keyboard/controller
- [ ] **MIDI CC Mapping:** Map hardware knobs to Stochastic parameters
- [ ] **MIDI Clock Sync:** Sync playback tempo with DAW or external sequencer
- [ ] **MIDI Learn:** Easy parameter assignment via hardware
- [ ] **Multi-Port Support:** Connect multiple MIDI devices simultaneously

### 5.2 DAW Integration
- [ ] **VST3 Plugin:** Run Stochastic as synth inside Ableton, Logic, Reaper, etc.
- [ ] **AU Plugin:** Apple Audio Unit format for Mac compatibility
- [ ] **Preset Management:** Save/load plugin states as presets
- [ ] **Automation:** Host can automate Stochastic parameters
- [ ] **MIDI In:** Receive note/CC data from host DAW

### 5.3 Hardware Control
- [ ] **Mixer Integration:** System audio routing to other apps
- [ ] **External MIDI Clock:** Receive tempo from external hardware
- [ ] **Controller Presets:** Pre-mapped layouts for popular controllers
- [ ] **Surface Feedback:** MIDI feedback (LED lights) for controller sync

### 5.4 Audio I/O Improvements
- [ ] **Multi-Output:** Separate channels for individual tracks/stems
- [ ] **Audio Input:** Optional audio input node for live input processing
- [ ] **Routing Matrix:** Advanced audio send/return architecture
- [ ] **Headroom Management:** Ensure adequate headroom for mixing

### 5.5 Professional Monitoring
- [ ] **Master Metering:** RMS, peak, loudness (LUFS) display
- [ ] **Per-Channel Metering:** Meter each scene/track independently
- [ ] **Spectrum Analyzer:** Frequency balance across range
- [ ] **Loudness Normalization:** Standards-compliant loudness metering

---

## Future Priorities (Q4 2025+)

### Advanced Features
- [ ] **Macro Controls:** Global performance knobs mapping to multiple parameters
- [ ] **Randomizer Node:** Controlled randomization with seed support
- [ ] **Crossover Node:** Genetic "crossover" merging two packets
- [ ] **Fitness Gate Improvements:** More sophisticated harmonic analysis
- [ ] **Transition Curves:** Configurable fade curves during scene changes
- [ ] **BPM Ramping:** Tempo changes during transitions
- [ ] **Phrase Quantization:** Queue triggers to next bar/beat

### Experimental & Long-Term
- [ ] **3D Visualization:** Move to 3D space with Three.js
- [ ] **VR Interface:** Immersive composition in VR
- [ ] **Real-time Collaboration:** Multi-user editing sessions
- [ ] **Cloud Sync:** Seamless project syncing across devices
- [ ] **Custom Shaders:** User-defined GLSL for advanced effects
- [ ] **OSC Support:** Open Sound Control for external applications
- [ ] **Breeder Interface:** Artificial selection UI for evolving variations
- [ ] **Viral Packets:** Horizontal gene transfer between nodes
