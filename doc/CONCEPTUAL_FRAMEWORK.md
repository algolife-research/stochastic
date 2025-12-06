# Phonon: Conceptual & Theoretical Framework

## 1. Core Philosophy: Music as Graph Physics

Phonon represents a paradigm shift from linear, timeline-based music creation (DAWs, Piano Rolls) to a **spatial, discrete-event simulation**.

In this framework, music is not "played back" from a recording; it is **simulated** in real-time. The composition is a living system defined by topology (connections) and physics (rules of travel), rather than a fixed sequence of events.

### 1.1 The Fundamental Equation

$$ Rhythm = \frac{Distance}{Velocity} $$

In Phonon, **Space is Time**.
- An **Edge** is not just a connection; it is a duration.
- A **Packet** traveling along an edge represents a rhythmic interval.
- Changing the visual layout of the graph inherently changes the musical rhythm.

### 1.2 Gravity Physics

Phonon introduces **node mass** as a musical parameter:

$$ EffectiveSpeed = BaseSpeed \times (1 - GravityConstant \times Mass) $$

Heavy nodes slow down approaching packets, creating natural ritardando effects. This allows tempo variations to emerge organically from the graph structure.

## 2. The Quantum Metaphor

The framework borrows from quantum mechanics to describe sound generation and manipulation.

### 2.1 The Packet (The Wavefunction)

The fundamental unit of the system is the **Packet**.

| Concept | Musical Interpretation |
|---------|----------------------|
| **State** | Carries "DNA" — Pitch, Intensity, Timbre, Waveform |
| **Silence** | A traveling packet is silent (potential energy) |
| **Superposition** | Splitting creates multiple simultaneous states |
| **Intensity** | Packet gain (0-1) determines final loudness |

### 2.2 The Speaker (The Observer)

Sound is only produced when a Packet enters a **Speaker** node.

- **Collapse:** Potential energy converts to acoustic energy
- **Localization:** Sound happens *at* the speaker — position can dictate stereo panning
- **Master Volume:** Each speaker scales all incoming packets

### 2.3 Tunneling

The **Tunnel** node represents a wormhole in the graph.
- Encapsulates complex sub-node chains
- Travel through is sequential but instantaneous
- Decouples internal complexity from external rhythm

## 3. The Biological Metaphor

The architecture supports an evolutionary biology interpretation.

### 3.1 Sound as DNA

The packet payload acts as a genome:
```typescript
{
  midiNote: 60,
  wave: 'sawtooth',
  cutoff: 2000,
  gain: 0.8,
  waves: [...]  // Accumulated layers
}
```

### 3.2 Mutation (Transformer Nodes)

As packets travel through modifier nodes, their DNA is altered:

| Node | Mutation |
|------|----------|
| **Pitch** | Frequency gene shift |
| **Polariser** | Adds waveform layer gene |
| **Harmonic** | Adds overtone gene at frequency ratio |
| **Modulator** | Adds vibrato expression gene |
| **Noise** | Adds textural gene (breath, friction) |
| **Gain** | Intensity gene multiplier |
| **Filter** | Brightness gene with envelope |

### 3.3 Natural Selection

- **Gate Node:** Probabilistic survival (0-100% pass rate)
- **Quantizer Node:** Only "correct" pitches survive (snap to scale)
- **Dead Ends:** Packets without speaker paths are discarded

## 4. System Architecture

### 4.1 The Graph Topology

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  SOURCE  │────▶│   NODE   │────▶│ SPEAKER  │
│ (Generator)    │(Transformer)   │ (Output) │
└──────────┘     └──────────┘     └──────────┘
```

- **Nodes:** Operators that transform state or generate events
- **Edges:** Transport rails defining temporal structure
- **Payloads:** Transient data structures moving through the system

### 4.2 Timing Modes

Phonon supports two edge timing modes:

| Mode | Behavior |
|------|----------|
| **Physical** | Duration = Edge Length ÷ Speed (spatial) |
| **Fixed** | Duration = N beats (musical, regardless of visual length) |

### 4.3 CV Modulation Routing

Edges can route control signals instead of audio:

```
[LFO] ──(targetParam:'cutoff')──▶ [Filter] ──▶ [Speaker]
```

The `targetParam` property enables parameter automation: `'cutoff'`, `'gain'`, `'pan'`, `'pitch'`, `'rate'`.

## 5. Node Categories

### Generators
| Node | Function |
|------|----------|
| `source` | Emits packets at regular intervals |
| `lfo` | Generates continuous modulation signal |

### Transformers
| Node | Function |
|------|----------|
| `pitch` | Shift or set frequency |
| `gain` | Multiply amplitude, add mass |
| `filter` | Lowpass with envelope |
| `polariser` | Add oscillator layer |
| `noise` | Add noise texture |
| `harmonic` | Add overtone at ratio |
| `modulator` | Add vibrato |
| `quantizer` | Snap to scale |

### Routers
| Node | Function |
|------|----------|
| `gate` | Probabilistic pass/block |
| `delay` | Hold for N beats |
| `splitter` | Duplicate to outputs |
| `teleporter` | Instant transport |

### Outputs
| Node | Function |
|------|----------|
| `speaker` | Render audio |
| `midi_out` | Send MIDI Note |
| `midi_cc` | Send MIDI CC |

### Containers
| Node | Function |
|------|----------|
| `tunnel` | Sequential sub-node chain |

## 6. Theoretical Extensions

### 6.1 Entanglement Nodes (Future)

Two nodes linked by quantum entanglement: modifying one instantly affects the other regardless of graph distance.

### 6.2 Gravity Wells (Implemented)

High-mass nodes create "gravitational" drag:
- Packets slow down approaching heavy nodes
- Creates natural rubato effects
- Adjustable via `gravityConstant` global setting

### 6.3 Scenes System (Implemented)

The scene system enables multi-section compositions:

**Core Features:**
- **Scene Storage:** Each scene stores a complete graph snapshot
- **Scene Properties:** Duration (beats), loop count, local overrides
- **Auto-save:** Canvas content auto-saves when switching scenes

**Playback Modes:**

| Mode | Behavior |
|------|----------|
| **Arrangement** | Scenes play in sequence with enforced durations |
| **Jam** | Scenes play indefinitely until user triggers change |

**Scene Transitions:**
- Click scene to load for editing (when stopped)
- Double-click for immediate switch (when playing)
- Scenes can override global BPM, root note, and scale

**Arrangement Timeline:**
- Visual representation of scene sequence
- Add scenes to build complete compositions
- Export renders all scenes in order

### 6.4 Entanglement Nodes (Future)

Two nodes linked by quantum entanglement: modifying one instantly affects the other regardless of graph distance.
