# Stochastic: Visual Art Generator Specification

> **Implementation Status: PLANNED**
> 
> This document describes the Visual Art Generator system that will transform Stochastic
> into an audiovisual generative instrument with video export capabilities.

## Executive Summary

The Visual Art Generator extends Stochastic beyond audio synthesis into the realm of **generative visual art**. By mapping musical properties (packets, nodes, edges, frequencies, timing) to visual parameters, users can create synchronized audiovisual compositions. The system supports multiple visualization modes, real-time performance, and video export.

---

## 1. Core Concepts

### 1.1 Editor vs Visualization Modes

Stochastic operates in two distinct display modes:

| Mode | Description |
|------|-------------|
| **Editor Mode** | Default view. Shows graph topology, node controls, edges, grid. For composition and editing. |
| **Visualization Mode** | Generative art display. Musical data drives visual output. For performance and export. |

```
┌─────────────────────────────────────────────────────────────────┐
│                        DISPLAY MODES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Editor Mode]                    [Visualization Mode]          │
│  ┌───────────────────┐           ┌───────────────────┐         │
│  │  ○──────○──────○  │           │    ◆ ✦ ◇ ★ ●     │         │
│  │  │      │      │  │    ⟹     │  ∿∿∿ ╱╲ ○○○ ≋≋   │         │
│  │  ○──────○──────●  │           │    ◎ ◉ ◐ ◑ ◒     │         │
│  └───────────────────┘           └───────────────────┘         │
│  Graph topology visible          Generative art output          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Viz Mode as Scene Property

The visualization mode is a **per-scene property**, allowing different sections of a composition to have unique visual styles:

```typescript
interface Scene {
  // ... existing properties ...
  
  // Visualization settings
  vizMode: VizMode;                  // 'editor' | specific viz type
  vizConfig: VizConfig;              // Mode-specific parameters
}

type VizMode = 
  | 'editor'       // Default graph editor view
  | 'abstract'     // Organic flowing shapes
  | 'geometric'    // Crystalline/angular patterns
  | 'particles'    // Particle explosions and flows
  | 'waves'        // Interference patterns
  | 'spectral'     // Frequency spectrum visualization
  | 'kaleidoscope' // Symmetric reflections
  | 'custom';      // User-defined shader
```

### 1.3 Musical Data Sources

The visualization system draws from all available musical data:

| Data Source | Visual Potential |
|-------------|------------------|
| **Packets** | Moving elements, trails, explosions |
| **Nodes** | Anchor points, emitters, attractors |
| **Edges** | Flow lines, connections, vectors |
| **Frequency/Pitch** | Color hue, vertical position |
| **Intensity/Gain** | Brightness, size, opacity |
| **Wave Type** | Texture, shape style |
| **Envelope (AHD)** | Animation curves, lifecycle |
| **Position (x, y)** | Spatial composition |
| **Timing/Beat** | Pulse, rhythm, synchronization |
| **BPM** | Animation speed, pulse rate |

---

## 2. Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISUAL ART GENERATOR                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │   Graph     │    │  Data        │    │  Visualization  │    │
│  │   Engine    │───▶│  Extractor   │───▶│  Renderer       │    │
│  │             │    │              │    │  (WebGL/Canvas) │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
│         │                  │                     │              │
│         │           ┌──────▼──────┐              │              │
│         │           │  Viz State  │              │              │
│         └──────────▶│  Manager    │◀─────────────┘              │
│                     └──────┬──────┘                             │
│                            │                                    │
│                     ┌──────▼──────┐                             │
│                     │   Export    │                             │
│                     │   Pipeline  │───▶ Video (MP4/WebM)        │
│                     └─────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Data Extractor** | Collects real-time musical data from graph engine |
| **Viz State Manager** | Maintains visualization state, manages transitions |
| **Visualization Renderer** | Renders generative art based on mapped data |
| **Export Pipeline** | Captures frames, encodes video with audio |

### 2.3 File Structure

```
src/
  viz/
    index.ts              # Exports and initialization
    types.ts              # Viz-specific types
    state.ts              # Viz state management
    data-extractor.ts     # Musical data extraction
    renderer.ts           # Base renderer class
    modes/
      abstract.ts         # Abstract flow visualization
      geometric.ts        # Geometric patterns
      particles.ts        # Particle systems
      waves.ts            # Wave interference
      spectral.ts         # Spectrum analyzer
      kaleidoscope.ts     # Kaleidoscopic effects
    shaders/
      common.glsl         # Shared shader utilities
      abstract.frag       # Abstract mode shader
      particles.vert/frag # Particle shaders
    export/
      frame-capture.ts    # Canvas frame capture
      video-encoder.ts    # Video encoding (WebCodecs)
```

---

## 3. Type Definitions

### 3.1 Core Viz Types

```typescript
// ============================================================================
// VISUALIZATION TYPES
// ============================================================================

/** Available visualization modes */
export type VizMode = 
  | 'editor'        // Default graph editor (no viz)
  | 'abstract'      // Organic flowing shapes
  | 'geometric'     // Crystalline angular patterns
  | 'particles'     // Particle explosions and flows
  | 'waves'         // Interference patterns
  | 'spectral'      // Frequency spectrum
  | 'kaleidoscope'  // Symmetric reflections
  | 'custom';       // User GLSL shader

/** Base configuration for all viz modes */
export interface VizConfigBase {
  readonly mode: VizMode;
  readonly colorPalette: ColorPalette;
  readonly intensity: number;         // 0-1 global intensity
  readonly trailLength: number;       // 0-1 trail/fade duration
  readonly reactivity: number;        // 0-1 how reactive to music
  readonly backgroundOpacity: number; // 0-1 background fade
}

/** Abstract mode specific config */
export interface AbstractVizConfig extends VizConfigBase {
  readonly mode: 'abstract';
  readonly flowSpeed: number;
  readonly organicness: number;       // 0-1 organic vs angular
  readonly blobCount: number;
}

/** Geometric mode specific config */
export interface GeometricVizConfig extends VizConfigBase {
  readonly mode: 'geometric';
  readonly symmetry: number;          // 2-12 fold symmetry
  readonly lineWeight: number;
  readonly fillMode: 'outline' | 'solid' | 'gradient';
}

/** Particles mode specific config */
export interface ParticlesVizConfig extends VizConfigBase {
  readonly mode: 'particles';
  readonly particleCount: number;
  readonly particleSize: number;
  readonly gravity: number;
  readonly emitOnBeat: boolean;
}

/** Waves mode specific config */
export interface WavesVizConfig extends VizConfigBase {
  readonly mode: 'waves';
  readonly waveCount: number;
  readonly amplitude: number;
  readonly interference: boolean;
}

/** Spectral mode specific config */
export interface SpectralVizConfig extends VizConfigBase {
  readonly mode: 'spectral';
  readonly barCount: number;
  readonly mirrorMode: boolean;
  readonly circularLayout: boolean;
}

/** Kaleidoscope mode specific config */
export interface KaleidoscopeVizConfig extends VizConfigBase {
  readonly mode: 'kaleidoscope';
  readonly segments: number;          // 4-16
  readonly rotation: number;
  readonly zoom: number;
}

/** Custom shader mode config */
export interface CustomVizConfig extends VizConfigBase {
  readonly mode: 'custom';
  readonly fragmentShader: string;    // GLSL source
  readonly uniforms: Record<string, number | number[]>;
}

/** Union of all viz configs */
export type VizConfig = 
  | AbstractVizConfig 
  | GeometricVizConfig 
  | ParticlesVizConfig 
  | WavesVizConfig 
  | SpectralVizConfig 
  | KaleidoscopeVizConfig
  | CustomVizConfig;

/** Color palette for visualization */
export interface ColorPalette {
  readonly name: string;
  readonly colors: readonly string[];  // Array of hex colors
  readonly background: string;
}
```

### 3.2 Musical Data Types

```typescript
/** Extracted musical data for visualization */
export interface VizMusicalData {
  // Timing
  readonly beat: number;              // Current beat (fractional)
  readonly bpm: number;
  readonly beatPhase: number;         // 0-1 phase within beat
  readonly barPhase: number;          // 0-1 phase within bar (4 beats)
  
  // Active packets
  readonly packets: VizPacketData[];
  
  // Active nodes
  readonly nodes: VizNodeData[];
  
  // Active audio events
  readonly activeNotes: VizNoteData[];
  
  // Aggregate metrics
  readonly averageFrequency: number;
  readonly averageIntensity: number;
  readonly packetDensity: number;     // Packets per unit area
}

/** Packet data for visualization */
export interface VizPacketData {
  readonly id: PacketId;
  readonly x: number;                 // World position
  readonly y: number;
  readonly vx: number;                // Velocity
  readonly vy: number;
  readonly frequency: Frequency;
  readonly midiNote: MidiNote;
  readonly intensity: number;
  readonly waveType: WaveOrNoiseType;
  readonly hue: number;               // Computed from frequency
}

/** Node data for visualization */
export interface VizNodeData {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly x: number;
  readonly y: number;
  readonly flash: number;             // 0-1 activity flash
  readonly connectionCount: number;
}

/** Active note data for visualization */
export interface VizNoteData {
  readonly frequency: Frequency;
  readonly gain: number;
  readonly pan: number;
  readonly envelope: number;          // Current envelope value
  readonly waveType: WaveOrNoiseType;
}
```

### 3.3 Video Export Types

```typescript
/** Video export configuration */
export interface VideoExportConfig {
  readonly resolution: VideoResolution;
  readonly frameRate: 30 | 60;
  readonly codec: 'h264' | 'vp9' | 'av1';
  readonly audioBitrate: number;
  readonly videoBitrate: number;
  readonly includeAudio: boolean;
}

/** Available video resolutions */
export type VideoResolution = 
  | { width: 1280; height: 720; name: '720p' }
  | { width: 1920; height: 1080; name: '1080p' }
  | { width: 2560; height: 1440; name: '1440p' }
  | { width: 3840; height: 2160; name: '4K' };

/** Export progress state */
export interface VideoExportProgress {
  readonly state: 'idle' | 'rendering' | 'encoding' | 'complete' | 'error';
  readonly currentFrame: number;
  readonly totalFrames: number;
  readonly elapsedTime: number;
  readonly estimatedTimeRemaining: number;
  readonly error?: string;
}
```

---

## 4. Data Mapping System

### 4.1 Musical → Visual Mappings

The core of the visualization system is mapping musical properties to visual parameters:

```typescript
/** Mapping from musical property to visual parameter */
export interface VizMapping {
  readonly source: MusicalSource;
  readonly target: VisualTarget;
  readonly transform: MappingTransform;
  readonly range: { min: number; max: number };
}

/** Available musical data sources */
export type MusicalSource = 
  | 'frequency'
  | 'midiNote'
  | 'gain'
  | 'pan'
  | 'envelope'
  | 'beatPhase'
  | 'barPhase'
  | 'packetX'
  | 'packetY'
  | 'packetVelocity'
  | 'nodeFlash'
  | 'waveType';

/** Available visual targets */
export type VisualTarget = 
  | 'hue'
  | 'saturation'
  | 'brightness'
  | 'size'
  | 'opacity'
  | 'positionX'
  | 'positionY'
  | 'rotation'
  | 'scale'
  | 'blur'
  | 'glowIntensity';

/** Transform functions for mapping */
export type MappingTransform = 
  | 'linear'
  | 'exponential'
  | 'logarithmic'
  | 'sine'
  | 'step'
  | 'smooth';
```

### 4.2 Default Mappings by Mode

| Mode | Frequency → | Intensity → | Beat → | Position → |
|------|-------------|-------------|--------|------------|
| **Abstract** | Hue | Blob size | Flow speed | Blob center |
| **Geometric** | Hue | Line weight | Rotation | Vertex positions |
| **Particles** | Hue | Particle count | Emit burst | Emit origin |
| **Waves** | Wave frequency | Amplitude | Phase | Center |
| **Spectral** | Bar position | Bar height | Pulse | N/A |
| **Kaleidoscope** | Hue | Zoom | Rotation | Source position |

### 4.3 Frequency → Color Mapping

```
MIDI Note 21 (A0)  ──────────────────────────────────── MIDI Note 108 (C8)
     │                                                           │
     ▼                                                           ▼
   Hue 0° ──▶ 60° ──▶ 120° ──▶ 180° ──▶ 240° ──▶ 300° ──▶ 360°
   (Red)   (Yellow) (Green)  (Cyan)  (Blue)  (Magenta)  (Red)
```

---

## 5. Visualization Modes

### 5.1 Abstract Flow

Organic, flowing shapes that respond to packet movement:

```
┌─────────────────────────────────────────────────────────────────┐
│                      ABSTRACT MODE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│      ╭──────╮                    ╭─────╮                       │
│    ╭─╯      ╰─────╮            ╭─╯     ╰───╮                   │
│  ╭─╯              ╰──────────╮╭╯           ╰─╮                 │
│  │   ●              ●        ╰╯     ●         │                │
│  ╰─╮              ╭──────────╮╭╮              ╭╯                │
│    ╰─╮      ╭─────╯          ╰╯╰─╮       ╭───╯                 │
│      ╰──────╯                    ╰───────╯                     │
│                                                                 │
│  • Blobs follow packet paths                                   │
│  • Color = frequency                                           │
│  • Size = intensity                                            │
│  • Motion = packet velocity                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Metaballs/blob algorithm using marching squares
- Perlin noise for organic movement
- Color interpolation from active frequencies
- Smooth trails using alpha fade

### 5.2 Geometric Patterns

Angular, crystalline structures based on graph topology:

```
┌─────────────────────────────────────────────────────────────────┐
│                     GEOMETRIC MODE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              ╱╲            ╱╲                                   │
│             ╱  ╲          ╱  ╲                                  │
│            ╱    ╲────────╱    ╲                                 │
│           ╱      ╲      ╱      ╲                                │
│          ╱        ╲    ╱        ╲                               │
│         ╱──────────╲  ╱──────────╲                              │
│          ╲        ╱    ╲        ╱                               │
│           ╲      ╱      ╲      ╱                                │
│            ╲    ╱────────╲    ╱                                 │
│             ╲  ╱          ╲  ╱                                  │
│              ╲╱            ╲╱                                   │
│                                                                 │
│  • Vertices = node positions                                   │
│  • Lines = edges                                               │
│  • Symmetry from fold count                                    │
│  • Rotation synced to beat                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Polygon generation from graph topology
- N-fold symmetry reflection
- Line segments with variable weight
- Rotation animation synced to BPM

### 5.3 Particle Systems

Explosions and flows of particles from active nodes:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARTICLES MODE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              · · ·                    ·                        │
│           ·   ●   · ·              · · ·                       │
│         · ·  ╱│╲    ·            ·  ●  ·                       │
│          ·  ╱ │ ╲  ·              ·   ·                        │
│         ·  ╱  │  ╲    ·              ·                         │
│            ───●───                                              │
│             · ·                  · · ·                         │
│              ·                   ·●   ·                        │
│                                   · ·                          │
│                                                                 │
│  • Particles emit from speaker nodes                           │
│  • Burst on note trigger                                       │
│  • Color from frequency                                        │
│  • Physics: gravity, wind                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Particle pool with recycling
- Emit on audio events (speaker triggers)
- Configurable physics (gravity, drag)
- Trail rendering with alpha fade

### 5.4 Wave Interference

Rippling patterns from overlapping frequencies:

```
┌─────────────────────────────────────────────────────────────────┐
│                       WAVES MODE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     ╭──╮   ╭──╮         ╭──╮   ╭──╮                            │
│    ╱    ╲ ╱    ╲       ╱    ╲ ╱    ╲                           │
│   ╱      ╳      ╲     ╱      ╳      ╲                          │
│  ─       ○       ────        ○       ──                         │
│   ╲      ╳      ╱     ╲      ╳      ╱                          │
│    ╲    ╱ ╲    ╱       ╲    ╱ ╲    ╱                           │
│     ╰──╯   ╰──╯         ╰──╯   ╰──╯                            │
│                                                                 │
│  • Concentric waves from active notes                          │
│  • Frequency = wave frequency                                  │
│  • Gain = amplitude                                            │
│  • Interference patterns from multiple sources                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Sin/cos wave functions
- Additive interference calculation
- Color mapping from combined amplitude
- Smooth animation at 60fps

### 5.5 Spectral Visualizer

Real-time frequency spectrum display:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SPECTRAL MODE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁     (Linear)                          │
│                                                                 │
│                  █                                              │
│                ▇ █ ▇                                           │
│              ▆ ▇ █ ▇ ▆                                         │
│            ▅ ▆ ▇ █ ▇ ▆ ▅                                       │
│          ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄                                     │
│        ▃ ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄ ▃                                   │
│      ▂ ▃ ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄ ▃ ▂                                 │
│    ▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄ ▃ ▂ ▁      (Circular)              │
│                                                                 │
│  • Bars represent active frequencies                           │
│  • Height = intensity                                          │
│  • Color = frequency band                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Frequency binning from active notes
- Smooth rise/fall animation
- Mirror mode option
- Circular layout option

### 5.6 Kaleidoscope

Symmetric reflections of graph activity:

```
┌─────────────────────────────────────────────────────────────────┐
│                    KALEIDOSCOPE MODE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     ╲│╱                                        │
│                    ──●──                                       │
│                     ╱│╲                                        │
│               ╲│╱       ╲│╱                                    │
│              ──●─────────●──                                   │
│               ╱│╲       ╱│╲                                    │
│                     ╲│╱                                        │
│                    ──●──                                       │
│                     ╱│╲                                        │
│                                                                 │
│  • N-fold symmetry (configurable)                              │
│  • Source: packet trails or node activity                      │
│  • Rotation synced to beat                                     │
│  • Zoom pulsing with intensity                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Polar coordinate transformation
- Segment duplication with reflection
- Center rotation animation
- Zoom pulsing with beat

---

## 6. Scene Integration

### 6.1 Scene Properties Extension

```typescript
interface Scene {
  // ... existing properties ...
  
  // Visualization mode for this scene
  vizMode: VizMode;
  
  // Mode-specific configuration
  vizConfig: VizConfig;
  
  // Visual transition settings (separate from audio)
  vizTransition: VizTransition;
}

interface VizTransition {
  readonly type: 'cut' | 'crossfade' | 'morph';
  readonly durationBeats: number;
}
```

### 6.2 Default Viz Settings

```typescript
const DEFAULT_VIZ_CONFIG: VizConfigBase = {
  mode: 'editor',
  colorPalette: PALETTES.neon,
  intensity: 0.8,
  trailLength: 0.5,
  reactivity: 0.7,
  backgroundOpacity: 0.95,
};
```

### 6.3 Per-Scene Overrides

Each scene can have:
- Different visualization mode
- Unique color palette
- Custom intensity/reactivity
- Independent transition settings

Example arrangement:
```
[Intro: abstract] → [Verse: geometric] → [Chorus: particles] → [Outro: waves]
```

---

## 7. Video Export

### 7.1 Export Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     VIDEO EXPORT PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  Audio   │    │   Viz    │    │  Frame   │    │  Video   │ │
│  │ Compiler │    │ Renderer │    │ Capture  │    │ Encoder  │ │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘ │
│       │               │               │               │        │
│       ▼               ▼               ▼               ▼        │
│  Audio Events → Render Frame → Capture → Encode → MP4/WebM    │
│       │               │               │               │        │
│       └───────────────┴───────────────┴───────────────┘        │
│                           │                                     │
│                    Synchronized                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Export Process

1. **Calculate Duration:** Total frames from arrangement/canvas duration
2. **Compile Audio:** Pre-render audio track (existing compiler)
3. **Render Frames:** Step through time, render each visualization frame
4. **Capture Frames:** Read canvas pixels as ImageData
5. **Encode Video:** Use WebCodecs API to encode H.264/VP9
6. **Mux Audio/Video:** Combine streams into final container
7. **Save File:** Write to disk via Tauri FS

### 7.3 Export UI

```
┌─────────────────────────────────────────────────────────────────┐
│                     VIDEO EXPORT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Resolution:    [1920 × 1080 (1080p) ▼]                        │
│  Frame Rate:    [60 fps ▼]                                     │
│  Video Codec:   [H.264 ▼]                                      │
│  Quality:       ████████░░ 80%                                 │
│                                                                 │
│  ☑ Include Audio                                               │
│  ☑ Use Arrangement (vs single scene)                           │
│                                                                 │
│  Duration: 3:24 (12,240 frames)                                │
│  Estimated Size: ~180 MB                                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Rendering... Frame 4,521 / 12,240                       │  │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░  37%       │  │
│  │  Elapsed: 2:15  │  Remaining: ~3:50                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│           [Cancel]                     [Export]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. UI Components

### 8.1 Mode Toggle

Location: Toolbar or Transport Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ Toolbar                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [File ▼] [Edit ▼]  │  View: [Editor ◉] [Viz ○]  │  [Settings] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Viz Mode Selector

Location: Scene Panel (per-scene setting)

```
┌─────────────────────────────────────────────────────────────────┐
│ Scene Properties                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Name: [Chorus A          ]                                    │
│  Color: [████] Duration: [16] beats  Loops: [2]                │
│                                                                 │
│  ── Visualization ──                                           │
│  Mode: [Particles ▼]                                           │
│         ├─ Editor (default)                                    │
│         ├─ Abstract                                            │
│         ├─ Geometric                                           │
│         ├─ Particles ✓                                         │
│         ├─ Waves                                               │
│         ├─ Spectral                                            │
│         └─ Kaleidoscope                                        │
│                                                                 │
│  Palette: [Neon ▼]  Intensity: ████░ 0.8                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Viz Config Panel

Appears when viz mode is active (not Editor):

```
┌─────────────────────────────────────────────────────────────────┐
│ Particles Config                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Particle Count:    ████████░░ 800                             │
│  Particle Size:     ███░░░░░░░ 3px                             │
│  Gravity:           ██░░░░░░░░ 0.2                             │
│  Trail Length:      █████░░░░░ 0.5                             │
│  Reactivity:        ███████░░░ 0.7                             │
│                                                                 │
│  ☑ Emit on Beat                                                │
│  ☑ Glow Effect                                                 │
│                                                                 │
│  [Reset to Default]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Color Palettes

### 9.1 Built-in Palettes

```typescript
const PALETTES = {
  neon: {
    name: 'Neon',
    colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff0080', '#00ff80'],
    background: '#0a0a0f',
  },
  sunset: {
    name: 'Sunset',
    colors: ['#ff6b6b', '#feca57', '#ff9f43', '#ee5a24', '#6ab04c'],
    background: '#1a1a2e',
  },
  ocean: {
    name: 'Ocean',
    colors: ['#0652DD', '#1B9CFC', '#25CCF7', '#55E6C1', '#58B19F'],
    background: '#0c0c1a',
  },
  monochrome: {
    name: 'Monochrome',
    colors: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333'],
    background: '#000000',
  },
  rainbow: {
    name: 'Rainbow',
    colors: ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff'],
    background: '#0f0f0f',
  },
  pastel: {
    name: 'Pastel',
    colors: ['#ffeaa7', '#dfe6e9', '#fab1a0', '#81ecec', '#a29bfe'],
    background: '#2d3436',
  },
} as const;
```

---

## 10. Implementation Phases

### Phase 1: Foundation
- [ ] Add `vizMode` and `vizConfig` to Scene type
- [ ] Create viz state manager
- [ ] Implement mode toggle UI
- [ ] Build data extractor for musical data

### Phase 2: Core Modes
- [ ] Implement Abstract mode
- [ ] Implement Particles mode
- [ ] Implement Spectral mode
- [ ] Add color palette system

### Phase 3: Advanced Modes
- [ ] Implement Geometric mode
- [ ] Implement Waves mode
- [ ] Implement Kaleidoscope mode
- [ ] Add custom shader support

### Phase 4: Export
- [ ] Frame capture system
- [ ] Video encoding with WebCodecs
- [ ] Audio/video muxing
- [ ] Export UI with progress

### Phase 5: Polish
- [ ] Visual transitions between scenes
- [ ] Preset save/load
- [ ] Performance optimization
- [ ] Full arrangement video export

---

## 11. Performance Considerations

### 11.1 Rendering Targets

| Scenario | Target FPS | Resolution |
|----------|------------|------------|
| Live performance | 60 fps | Native |
| Export preview | 30 fps | 720p |
| Final export | 60 fps | Up to 4K |

### 11.2 Optimization Strategies

- **Object pooling:** Reuse particle/shape objects
- **Off-screen canvas:** Pre-render static elements
- **WebGL shaders:** GPU-accelerated rendering for complex modes
- **Frame skipping:** Drop frames under heavy load (live only)
- **Resolution scaling:** Lower internal resolution during stress
- **Dirty rect tracking:** Only redraw changed regions

### 11.3 Memory Management

- Particle pool with fixed size
- Trail buffer ring buffer
- Texture atlas for common shapes
- Garbage-free hot paths

---

## 12. Future Extensions

### 12.1 VJ Mode
- External display output
- Beat-synced scene switching
- MIDI control of viz parameters

### 12.2 3D Visualization
- Three.js integration
- 3D particle systems
- VR visualization mode

### 12.3 AI-Assisted
- Style transfer from images
- Learned pattern generation
- Automatic palette extraction

### 12.4 Community
- Share visualization presets
- Custom shader marketplace
- Visualization templates
