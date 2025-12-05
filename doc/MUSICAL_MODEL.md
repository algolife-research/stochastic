# Phonon Musical Model

This document describes the formal musical model underlying Phonon's graph-based audio synthesis system.

## Overview

Phonon implements a **dataflow model** for sound synthesis where discrete **packets** carry musical information through a directed graph of **nodes** connected by **edges**. This model bridges the gap between traditional music notation (discrete events) and modular synthesis (continuous signal flow).

## Core Abstractions

### 1. Packets

A packet is the fundamental unit of musical information. It represents a single sound event.

```typescript
Packet = {
  id: PacketId,
  edgeId: EdgeId,
  t: number,         // Position along edge [0, 1]
  payload: AudioPayload
}
```

**AudioPayload** contains all parameters needed to synthesize a sound:

| Property | Type | Description |
|----------|------|-------------|
| `freq` | Hz | Fundamental frequency |
| `midiNote` | 0-127 | MIDI note number |
| `wave` | enum | Base waveform: `'sine'`, `'square'`, `'sawtooth'`, `'triangle'` |
| `timbre` | 0-1 | Harmonic richness |
| `cutoff` | Hz | Filter cutoff frequency |
| `gain` | 0-1 | Amplitude/intensity |
| `holdTime` | seconds | Sustain duration (AHD envelope) |
| `releaseTime` | seconds | Decay/release time |
| `waves[]` | array | Additional oscillator layers |
| `filterEnv` | object | Filter envelope parameters |
| `vibratoRate` | Hz | Vibrato speed |
| `vibratoDepth` | cents | Vibrato amount |
| `vibratoDelay` | seconds | Vibrato onset delay |
| `modulationValue` | 0-1 | CV modulation value (from LFO) |

### 2. Nodes

Nodes are processors that transform packets. Each node has a **type** and **props**.

```typescript
GraphNode = {
  id: NodeId,
  type: NodeType,
  x, y: number,      // Canvas position
  props: TypeSpecificProps,
  
  // Runtime state
  timer: number,
  lastTrigger: number,
  flash: number,     // Visual feedback [0, 1]
  heldPackets: HeldPacket[]
}
```

#### Node Type Reference

| Type | Category | Purpose | Key Props |
|------|----------|---------|-----------|
| `source` | Generator | Emits packets at intervals | `interval`, `midiNote`, `intensity`, `autoTrigger` |
| `speaker` | Output | Renders audio | `volume`, `reverb`, `pan`, `holdTime`, `releaseTime` |
| `pitch` | Transformer | Shift/set frequency | `mode`, `shift`, `fixedMidiNote` |
| `gain` | Transformer | Amplitude + gravity | `value`, `mass` |
| `filter` | Transformer | Lowpass + envelope | `cutoff`, `attack`, `decay`, `mod` |
| `polariser` | Transformer | Add wave layer | `wave`, `attack`, `decay`, `mix` |
| `noise` | Transformer | Add noise layer | `wave`, `attack`, `decay`, `mix` |
| `harmonic` | Transformer | Add overtone | `ratio`, `wave`, `attack`, `decay`, `mix` |
| `modulator` | Transformer | Add vibrato | `rate`, `depth`, `delay` |
| `quantizer` | Transformer | Snap to scale | `strength`, `useGlobalKey` |
| `gate` | Router | Probabilistic pass | `prob` |
| `delay` | Router | Hold N beats | `delayTime` |
| `splitter` | Router | Duplicate packets | (none) |
| `teleporter` | Router | Instant transport | `channel`, `isEntry` |
| `lfo` | Modulator | CV generator | `rate`, `shape`, `min`, `max`, `phase` |
| `tunnel` | Container | Sub-node chain | `tunnelName`, `subNodes[]` |
| `midi_out` | Output | MIDI Note | `channel`, `duration`, `velocityScale` |
| `midi_cc` | Output | MIDI CC | `channel`, `ccNumber` |
| `scene_trigger` | Control | Switch scenes | `targetSceneIndex`, `behavior` |

### 3. Edges

Edges define flow paths between nodes.

```typescript
GraphEdge = {
  id: EdgeId,
  from: NodeId,
  to: NodeId,
  timingMode: 'physical' | 'fixed',
  durationBeats: number | null,
  targetParam: string | null    // CV routing target
}
```

#### Timing Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Physical** | Speed ∝ 1/length | Spatial composition |
| **Fixed** | Duration = N beats | Precise rhythmic control |

#### CV Routing

When `targetParam` is set, packets carry modulation values:

| Target | Effect |
|--------|--------|
| `null` | Normal audio signal |
| `'cutoff'` | Filter cutoff modulation |
| `'gain'` | Amplitude modulation |
| `'pan'` | Stereo position |
| `'pitch'` | Pitch bend (semitones) |
| `'rate'` | LFO speed modulation |

### 4. Tunnels

Tunnels encapsulate ordered sub-node chains:

```typescript
TunnelProps = {
  tunnelName: string,
  subNodes: [
    { type: 'pitch', props: { mode: 'shift', shift: 7 } },
    { type: 'filter', props: { cutoff: 1000, ... } },
    ...
  ]
}
```

Processing is synchronous — packets emerge transformed without edge delays.

## Packet Lifecycle

```
┌─────────────┐
│   SOURCE    │  Spawn packet with note/intensity
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    EDGE     │  Travel: t increases 0 → 1
└──────┬──────┘
       │ t ≥ 1
       ▼
┌─────────────┐
│    NODE     │  Process: transform payload
└──────┬──────┘
       │
       ▼
   ┌───┴───┐
   │ Clone │  Copy to all outgoing edges
   └───┬───┘
       │
       ▼
  [Continue or Terminate at Speaker/Dead-end]
```

## Sound Synthesis

Phonon uses **additive/subtractive synthesis** via Web Audio API.

### Signal Chain

```
[Oscillators] → [Filter] → [Gain] → [Pan] → [Reverb] → [Master]
      │             │
      └──[Envelope]─┘
```

### Multi-Layer Synthesis

Packets accumulate layers through transformer nodes:

```javascript
payload.waves = [
  { wave: 'sawtooth', attack: 0.01, decay: 0.4, gain: 1.0 },           // Base
  { wave: 'white', attack: 0.01, decay: 0.2, gain: 0.2 },              // Noise
  { wave: 'sine', attack: 0.01, decay: 0.4, gain: 0.5, ratio: 2 }      // Harmonic
]
```

Each layer has independent:
- Waveform or noise type
- Amplitude envelope (AHD)
- Mix level
- Frequency ratio (for harmonics)

### Envelope Model (AHD)

```
Amplitude
    │    ╱───────╲
    │   ╱         ╲
    │  ╱           ╲
    │ ╱             ╲
    │╱               ╲____
    └───────────────────── Time
      │     │     │
   Attack  Hold  Decay
```

- **Attack:** Time to reach peak
- **Hold:** Sustain at peak (0 = pure AD envelope)
- **Decay:** Fade to zero

### Filter Envelope

```javascript
filterEnv = {
  attack: 0.01,   // Time to peak modulation
  decay: 0.2,     // Time to return to base
  mod: 2000       // Modulation amount in Hz
}

// Effective cutoff = baseCutoff + mod × envelope(t)
```

## Timing Model

### Global Tempo

All timing is relative to BPM:

```javascript
msPerBeat = 60000 / masterSpeed
```

### Source Intervals

Sources emit at configurable beat intervals:

```javascript
if (elapsedBeats >= node.props.interval) {
  spawnPacket(node);
  node.lastTrigger = now;
}
```

### Gravity Physics

Heavy nodes slow approaching packets:

```javascript
gravityDrag = 1 - (gravityConstant × mass)
effectiveSpeed = baseSpeed × gravityDrag
```

| Parameter | Range | Effect |
|-----------|-------|--------|
| `gravityConstant` | 0-2 | Global gravity strength |
| `mass` | 0.1-3.0 | Per-node weight |

## Pitch Model

### MIDI Note System

Standard MIDI numbering (0-127):

| MIDI | Note | Frequency |
|------|------|-----------|
| 36 | C2 | 65.41 Hz |
| 48 | C3 | 130.81 Hz |
| 60 | C4 | 261.63 Hz (Middle C) |
| 69 | A4 | 440 Hz (Concert A) |

### Equal Temperament

```
f(n) = 440 × 2^((n - 69) / 12)
```

### Global Musical Context

```typescript
musicalContext = {
  root: 0,           // 0-11 (C=0, C#=1, ... B=11)
  scaleName: 'major',
  scale: [0, 2, 4, 5, 7, 9, 11]  // Intervals
}
```

**Available Scales:** chromatic, major, minor, dorian, phrygian, lydian, mixolydian, locrian, pentatonic, minorPentatonic, blues, wholeTone, diminished

### Quantizer Node

Snaps pitches to nearest scale degree:

```javascript
quantizedNote = quantizeToKey(midiNote, strength)
// strength: 0 = no quantization, 1 = full snap
```

## Graph Constraints

1. **Directed:** Edges have source and target
2. **Multi-graph:** Multiple edges between nodes allowed
3. **Cycles:** Allowed but limited by `MAX_PACKETS = 1000`
4. **Multi-output:** Nodes can have unlimited outgoing edges

## State Management

```typescript
GraphState = {
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  packets: Map<PacketId, Packet>,    // Max: 1000
  annotations: Map<AnnotationId, Annotation>,
  regions: Map<RegionId, Region>,
  scenes: Map<SceneId, Scene>,
  
  masterSpeed: BPM,
  isRunning: boolean,
  musicalContext: MusicalContext,
  globalSettings: { gravityConstant, ... }
}
```

## Extension Points

The model supports extension through:

1. **New node types:** Add to `types.ts`, `constants.ts`, and processing logic
2. **New payload properties:** AudioPayload is extensible
3. **New synthesis:** AudioWorklet supports custom DSP
4. **New routing:** Custom packet flow decisions
5. **MIDI output:** `midi_out` and `midi_cc` nodes for external gear

## References

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Dataflow Programming](https://en.wikipedia.org/wiki/Dataflow_programming)
- [Modular Synthesis](https://en.wikipedia.org/wiki/Modular_synthesizer)
