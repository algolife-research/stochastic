# Phonon Musical Model

This document describes the formal musical model underlying Phonon's graph-based audio synthesis system.

## Overview

Phonon implements a **dataflow model** for sound synthesis where discrete **packets** carry musical information through a directed graph of **nodes** connected by **edges**. This model bridges the gap between traditional music notation (discrete events) and modular synthesis (continuous signal flow).

## Core Abstractions

### 1. Packets

A packet is the fundamental unit of musical information. It represents a single sound event and carries a **payload** containing:

```
Packet = {
  id: UniqueIdentifier,
  edgeId: EdgeReference,
  t: Progress ∈ [0, 1],        // Position along edge
  payload: SoundPayload
}
```

**SoundPayload** contains all parameters needed to synthesize a sound:

| Property | Type | Description |
|----------|------|-------------|
| `freq` | Hz | Fundamental frequency |
| `midiNote` | 0-127 | MIDI note number (standard piano range) |
| `scaleIndex` | 0-36 | Legacy index into chromatic scale (C2-C5) |
| `wave` | enum | Base waveform: 'sine', 'square', 'sawtooth', 'triangle' |
| `timbre` | 0-1 | Harmonic richness |
| `cutoff` | Hz | Filter cutoff frequency |
| `gain` | 0-1 | Amplitude/intensity |
| `reverb` | 0-1 | Reverb send level |
| `pan` | -1 to 1 | Stereo position |
| `holdTime` | seconds | Sustain duration before decay (AHD envelope) |
| `releaseTime` | seconds | Decay/release time |
| `waves[]` | array | Additional oscillator layers |
| `filterEnv` | object | Filter envelope parameters |
| `vibratoRate` | Hz | Vibrato speed |
| `vibratoDepth` | cents | Vibrato amount |
| `vibratoDelay` | seconds | Vibrato onset delay |
| `modulationValue` | 0-1 | CV modulation value (from LFO) |

### 2. Nodes

Nodes are stateful processors that transform packets. Each node has a **type** that determines its behavior and a **props** object containing configurable parameters.

```
Node = {
  id: UniqueIdentifier,
  type: NodeType,
  x, y: Position,
  props: TypeSpecificProperties,
  flash: VisualFeedback ∈ [0, 1]
}
```

#### Node Categories

**Generators** - Create packets
- `source`: Emits packets at regular intervals with configurable note/pitch

**Transformers** - Modify packet payload
- `pitch`: Shift frequency (relative or absolute)
- `gain`: Multiply amplitude
- `filter`: Apply lowpass filter with envelope
- `polariser`: Add oscillator layer with envelope
- `noise`: Add noise layer
- `harmonic`: Add harmonic overtone
- `modulator`: Add vibrato effect
- `quantizer`: Snap pitch to global musical key/scale

**Modulators** - Generate control signals
- `lfo`: Low-frequency oscillator for parameter modulation

**Routers** - Control packet flow
- `gate`: Probabilistic pass/block
- `delay`: Hold packet for N beats
- `splitter`: Duplicate to multiple outputs (implicit in graph)
- `teleporter`: Instant transport between linked nodes

**Outputs** - Render audio
- `speaker`: Convert packet to audible sound

**Containers** - Encapsulate sub-graphs
- `tunnel`: Sequential processing chain

### 3. Edges

Edges define the flow paths for packets between nodes.

```
Edge = {
  id: UniqueIdentifier,
  from: NodeId,
  to: NodeId,
  timingMode: 'physical' | 'fixed',  // Timing behavior
  durationBeats: number | null,       // Duration for fixed timing
  targetParam: string | null          // CV modulation target parameter
}
```

#### Timing Modes

- **Physical** (default): Packet speed depends on edge length in pixels
- **Fixed**: Packet travels for a fixed duration in beats, regardless of visual length

#### CV Modulation

When `targetParam` is set, the edge routes modulation values (from LFO nodes) to specific node parameters instead of audio signals. This enables dynamic parameter automation.

Packets travel along edges at a speed determined by the global tempo:

```
speed = PIXELS_PER_STEP / msPerBeat
msPerBeat = 60000 / BPM
```

### 4. Tunnels

Tunnels are composite nodes containing an ordered list of **sub-nodes**. When a packet enters a tunnel, it passes through each sub-node sequentially:

```
Tunnel.props = {
  tunnelName: string,
  subNodes: [
    { type: NodeType, props: TypeSpecificProperties },
    ...
  ]
}
```

Processing is synchronous - the packet emerges transformed without edge traversal delays between sub-nodes.

## Packet Lifecycle

```
┌─────────────┐
│   SOURCE    │  Spawn packet with note/intensity
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  EDGE (t)   │  Travel: t increases from 0 to 1
└──────┬──────┘
       │ t = 1 (arrival)
       ▼
┌─────────────┐
│    NODE     │  Process: transform payload
└──────┬──────┘
       │
       ▼
    ┌──┴──┐
    │Split│  Fan-out to all outgoing edges
    └──┬──┘
       │
       ▼
   [Continue or Terminate]
```

1. **Spawn**: Source node creates packet with initial payload
2. **Travel**: Packet moves along edge (visual: animated dot)
3. **Arrive**: When t ≥ 1, packet reaches destination node
4. **Process**: Node transforms payload based on type and props
5. **Forward**: Packet is copied to all outgoing edges
6. **Terminate**: At speaker (sound plays) or dead-end (discarded)

## Sound Synthesis Model

AIGA uses **additive/subtractive synthesis** with the Web Audio API.

### Signal Chain

```
[Oscillators] → [Filter] → [Gain] → [Pan] → [Reverb Send] → [Master]
     │              │
     └──[Envelope]──┘
```

### Multi-Layer Synthesis

Packets can accumulate multiple oscillator layers through `polariser`, `noise`, and `harmonic` nodes:

```javascript
payload.waves = [
  { wave: 'sawtooth', attack: 0.01, decay: 0.4, gain: 1.0 },
  { wave: 'white', attack: 0.01, decay: 0.2, gain: 0.2 },  // noise
  { wave: 'sine', attack: 0.01, decay: 0.4, gain: 0.5, ratio: 2 }  // harmonic
]
```

Each layer has its own:
- Waveform or noise type
- Amplitude envelope (attack/decay)
- Mix level (gain)
- Frequency ratio (for harmonics)

### Envelope Model

AIGA uses **AHD (Attack-Hold-Decay) envelopes**:

```
Amplitude
    │    ╱───╲
    │   ╱     ╲
    │  ╱       ╲
    │ ╱         ╲
    │╱           ╲____
    └─────────────────── Time
      │   │   │
   Attack Hold Decay/Release
```

- **Attack**: Time to reach peak amplitude
- **Hold**: Time to sustain at peak (optional, default 0)
- **Decay/Release**: Time to fade to zero

Setting `holdTime > 0` enables sustained sounds; otherwise reverts to simple AD behavior.

### Filter Envelope

Optional filter envelope modulates cutoff frequency:

```javascript
filterEnv = {
  attack: seconds,  // Time to reach peak modulation
  decay: seconds,   // Time to return to base cutoff
  mod: Hz           // Modulation amount (can be negative)
}

effectiveCutoff = baseCutoff + mod * envelope(t)
```

## Timing Model

### Global Tempo

All timing is relative to beats per minute (BPM):

```
msPerBeat = 60000 / state.masterSpeed
```

### Source Intervals

Sources emit packets at configurable intervals measured in beats:

```
if (elapsedBeats >= node.props.interval) {
  spawnPacket(node);
  node.lastTrigger = now;
}
```

### Delay Nodes

Delay nodes hold packets for a duration measured in beats:

```
delayMs = node.props.delayTime * msPerBeat
releaseTime = now + delayMs
```

## Modulation Architecture

### Control Voltage (CV) Model

Edges can carry modulation signals using the `targetParam` property:

```javascript
edge.props.targetParam = 'cutoff' | 'gain' | 'pan' | 'pitch' | 'rate' | null
```

When set, the packet's payload modulates the target parameter on arrival:
- `null`: Standard signal flow (triggers sound/passes through)
- `'cutoff'`: Modulates filter cutoff frequency
- `'gain'`: Modulates amplitude/volume  
- `'pan'`: Modulates stereo position
- `'pitch'`: Modulates pitch (semitone offset)
- `'rate'`: Modulates LFO speed

### LFO Node

The `lfo` (Low Frequency Oscillator) node generates continuous modulation signals:

```javascript
lfoProps = {
  rate: 0.1-20,     // Oscillation frequency in Hz
  depth: 0-1,       // Modulation amount
  waveform: 'sine' | 'triangle' | 'square' | 'sawtooth'
}

output = 0.5 + depth × oscillator(t)  // Normalized 0-1 range
```

LFO packets are spawned at the LFO rate and carry the current oscillator value.

### Modulation Routing Example

```
[LFO] ──(targetParam:'cutoff')──► [Speaker]
```

The LFO continuously modulates the speaker's filter cutoff, creating a wah-wah effect.

## Pitch Model

### MIDI Note System

AIGA uses the standard **MIDI note numbering** (0-127):

```
MIDI 0   = C-1  (8.18 Hz)
MIDI 36  = C2   (65.41 Hz)
MIDI 60  = C4   (261.63 Hz, Middle C)
MIDI 69  = A4   (440 Hz, Concert A)
MIDI 127 = G9   (12543.85 Hz)
```

### Legacy Scale Index

For backwards compatibility, a 37-note `scaleIndex` (0-36) maps to MIDI notes 36-72:

```
scaleIndex = midiNote - 36
SCALE_CHROMATIC[0]  = C2  (MIDI 36)
SCALE_CHROMATIC[12] = C3  (MIDI 48)
SCALE_CHROMATIC[24] = C4  (MIDI 60)
SCALE_CHROMATIC[36] = C5  (MIDI 72)
```

### Global Musical Context

The system maintains a global musical context:

```javascript
musicalContext = {
  root: 0-11,        // Root note (0=C, 1=C#, ... 11=B)
  scale: number[]    // Scale intervals from root
}
```

Available scales: chromatic, major, minor, dorian, phrygian, lydian, mixolydian, pentatonic, minorPentatonic, blues, wholeTone, diminished.

### Quantizer Node

The `quantizer` node snaps incoming pitches to the nearest note in the global key/scale:

```javascript
quantizedMidi = quantizeToKey(midiNote, strength)
// strength: 0 = no quantization, 1 = full snap
```

### Pitch Transformation

The `pitch` node can operate in two modes:

1. **Shift Mode**: Relative transposition
   ```
   newIndex = scaleIndex + shift  // shift in semitones
   ```

2. **Fixed Mode**: Absolute pitch
   ```
   newIndex = fixedNote  // specific scale index
   ```

### Harmonic Ratios

The `harmonic` node adds overtones at frequency multiples:

```
harmonicFreq = fundamentalFreq * ratio
```

Common ratios:
- 2 = Octave
- 3 = Octave + Fifth
- 4 = Two Octaves
- 1.5 = Fifth

## Graph Constraints

1. **Directed**: Edges have source and target
2. **Acyclic recommended**: Cycles create infinite loops (limited by MAX_PACKETS)
3. **Multi-graph**: Multiple edges between same nodes allowed
4. **Single-source edges**: Each edge originates from one node
5. **Multi-target edges**: Nodes can have unlimited outgoing edges

## State Management

### Global State

```javascript
state = {
  nodes: Node[],           // All nodes in graph
  edges: Edge[],           // All connections
  packets: Packet[],       // Active packets (max: MAX_PACKETS)
  regions: Region[],       // Visual groupings
  annotations: Annotation[], // Text labels
  masterSpeed: BPM,        // Global tempo
  isPlaying: boolean,      // Playback state
  gravityConstant: 0-2,    // Gravity strength (default 0.5)
  musicalContext: {        // Global musical key
    root: 0-11,            // Root note
    scale: number[]        // Scale intervals
  }
}
```

### Packet Limits

To prevent runaway graphs:
```
MAX_PACKETS = 500
```

New packets are not spawned when limit is reached.

## Mathematical Foundations

### Frequency Calculation

Equal temperament tuning:
```
f(n) = 440 × 2^((n-69)/12)
```

Where n is MIDI note number (A4 = 69).

### Edge Travel

Packet movement along edges:

**Physical Mode** (default):
Linear interpolation with gravity drag:
```
baseSpeed = masterSpeed / edgeLength
gravityDrag = 1 - (gravityConstant × targetNode.mass)
effectiveSpeed = baseSpeed × gravityDrag
t(Δt) = t + (Δt × effectiveSpeed)
position = lerp(fromNode.pos, toNode.pos, t)
```

**Fixed Mode** (virtual edges):
Beat-synchronized travel:
```
beatsElapsed = (currentTime - startTime) × (BPM / 60)
t = beatsElapsed / durationBeats
// Packet arrives exactly after durationBeats
```

### Gravity Physics

Heavy nodes attract packets, slowing them as they approach:
```
gravityDrag = 1 - (gravityConstant × mass)
// gravityConstant: 0 = no effect, 2 = maximum slowdown
// mass: 0.1-3.0 (default 1.0)
```

Musical applications:
- Heavy nodes create ritardando (slowing) effects
- Light nodes maintain consistent timing
- Zero gravity = all packets travel at same speed

### Probability (Gate Node)

Bernoulli trial:
```
pass = random() < probability
```

## Extension Points

The model supports extension through:

1. **New node types**: Add to `getDefaultPropsForType()` and processing switch statements
2. **New payload properties**: Packets can carry arbitrary data
3. **New synthesis techniques**: Web Audio API supports extensive DSP
4. **New routing logic**: Custom packet flow decisions

## References

- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Dataflow Programming: https://en.wikipedia.org/wiki/Dataflow_programming
- Modular Synthesis: https://en.wikipedia.org/wiki/Modular_synthesizer
