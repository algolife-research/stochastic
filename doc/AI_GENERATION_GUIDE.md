# Phonon AI Composition Generation Guide

This document provides complete specifications for AI systems to generate valid Phonon compositions programmatically.

> **⚠️ STRICT GENERATION RULES ⚠️**
>
> 1.  **Structure:** Output must be wrapped in `{ "meta": {...}, "global": {...}, "scenes": [...], "arrangement": [...] }`.
> 2.  **Timing:** **ALWAYS** use `timingMode: "fixed"` for edges with a valid `durationBeats` (e.g., 0.25, 0.5, 1.0). Do not rely on physical distance.
> 3.  **Global Keys:** Use `scaleName` (not `scale`), `rootNote`, and `masterBpm` inside the `"global"` object.
> 4.  **Version:** Set `meta.version` to `"3.0.0"`.
> 5.  **Scenes:** All nodes and edges must be inside a scene object. Each composition must have at least one scene.

---

## Table of Contents

1. [File Format](#file-format)
2. [Schema Reference](#schema-reference)
3. [Node Types](#node-types)
4. [Edge System](#edge-system)
5. [Design Patterns](#design-patterns)
6. [Complete Examples](#complete-examples)
7. [Generation Guidelines](#generation-guidelines)

---

## File Format

Phonon compositions are stored as `.phono` files containing JSON. **Version 3.0** uses a scene-based structure:

> **CRITICAL:** The JSON must use the following nested structure with scenes. Do not place nodes/edges at the root level.
>
> ```json
> {
>   "meta": { ... },         // Version and author info
>   "global": { ... },       // Global settings (BPM, key, scale)
>   "scenes": [ ... ],       // Array of scene objects (each with nodes/edges)
>   "arrangement": [ ... ]   // Playback order of scenes
> }
> ```

### Complete V3 Structure Example

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "My Composition",
    "author": "Composer",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": {
    "rootNote": 60,
    "scaleName": "major",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed",
    "masterBpm": 120
  },
  "scenes": [
    {
      "id": "scene-1",
      "name": "Main",
      "color": "#4CAF50",
      "durationBeats": 16,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [...],
      "edges": [...],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-1", "startBeat": 0 }
  ]
}
```

### Required Metadata Fields

The software checks for specific keys to validate the file version.

> The `meta` object requires these fields:
>
> ```json
> "meta": {
>   "version": "3.0.0",
>   "name": "Composition Name",
>   "author": "Author Name",
>   "created": <timestamp>,
>   "modified": <timestamp>
> }
> ```

### Global Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `masterBpm` | number | 120 | Master tempo in beats per minute (20-300) |
| `rootNote` | number | 60 | MIDI root note for quantizer (0-127) |
| `scaleName` | string | "major" | Scale for quantization |
| `gravity` | number | 0.5 | Physics gravity constant |
| `defaultEdgeBehaviour` | string | "fixed" | Default edge timing mode ("physical" or "fixed") |

### Scene Schema

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | - | Unique scene identifier (UUID) |
| `name` | string | "Scene 1" | Display name |
| `color` | string | "#4CAF50" | Scene color (hex) |
| `durationBeats` | number | 16 | Scene length in beats |
| `loopCount` | number | 1 | Number of times to loop |
| `localBpm` | number\|null | null | Override master BPM (null = inherit) |
| `localRoot` | number\|null | null | Override root note (null = inherit) |
| `localScale` | string\|null | null | Override scale (null = inherit) |
| `enterTransition` | object | - | Transition when entering scene |
| `exitTransition` | object | - | Transition when exiting scene |
| `nodes` | array | [] | Nodes in this scene |
| `edges` | array | [] | Edges in this scene |
| `annotations` | array | [] | Text annotations |
| `regions` | array | [] | Visual grouping regions |

### Available Scales

```
chromatic, major, minor, dorian, phrygian, lydian, mixolydian, 
locrian, pentatonic, minorPentatonic, blues, wholeTone, diminished
```

---

## Schema Reference

### Node Schema

```typescript
{
  id: string,           // Unique identifier (UUID recommended)
  type: NodeType,       // See node types below
  x: number,            // X position in canvas (pixels)
  y: number,            // Y position in canvas (pixels)
  props: NodeProps      // Type-specific properties
}
```

### Edge Schema

```typescript
{
  id: string,                    // Unique identifier
  from: string,                  // Source node ID
  to: string,                    // Target node ID
  timingMode?: "physical" | "fixed",  // Default: "physical"
  durationBeats?: number,        // Required if timingMode is "fixed"
  targetParam?: string           // CV modulation target (null for audio)
}
```


---

## Node Types

### 1. Source Node (Packet Generator)

Generates audio packets at regular intervals.

```json
{
  "type": "source",
  "props": {
    "interval": 1,        // Beats between emissions (0.125-16)
    "midiNote": 60,       // Fixed MIDI note (0-127)
    "noteIndex": -1,      // -1 = random, -2 = use midiNote
    "autoTrigger": true,  // Auto-emit when playing
    "intensity": 0.5      // Velocity/volume (0-1)
  }
}
```

**Usage Notes:**
- `noteIndex: -1` generates random notes within reasonable range (36-84)
- `noteIndex: -2` uses the `midiNote` value directly
- `interval` syncs to BPM (1 = quarter note at tempo)

---

### 2. Speaker Node (Audio Output)

Triggers audio synthesis when a packet arrives.

```json
{
  "type": "speaker",
  "props": {
    "volume": 1.0,        // Output volume (0-1)
    "reverb": 0.3,        // Reverb wet/dry mix (0-1)
    "pan": 0,             // Stereo position (-1 to 1)
    "holdTime": 0,        // Sustain duration in seconds
    "releaseTime": 0.1    // Release envelope in seconds
  }
}
```

**Important:** Speakers can also forward packets to connected nodes, enabling melodic chains.

---

### 3. Pitch Node (Pitch Modification)

Shifts or sets the pitch of passing packets.

```json
{
  "type": "pitch",
  "props": {
    "mode": "shift",      // "shift" or "set"
    "shift": 7,           // Semitones to shift (mode: shift)
    "fixedMidiNote": 60   // Target note (mode: set)
  }
}
```

**Common Intervals:**
- +12 = octave up
- +7 = perfect fifth
- +5 = perfect fourth
- +4 = major third
- +3 = minor third
- -12 = octave down

---

### 4. Polariser Node (Waveform Shaper)

Assigns waveform and envelope to packets.

```json
{
  "type": "polariser",
  "props": {
    "wave": "sawtooth",   // "sine", "square", "sawtooth", "triangle"
    "attack": 0.01,       // Attack time in seconds
    "decay": 0.4,         // Decay time in seconds
    "mix": 1.0            // Mix amount (0-1)
  }
}
```

**Wave Characteristics:**
- `sine`: Pure, mellow tone
- `sawtooth`: Bright, buzzy (good for bass/leads)
- `square`: Hollow, woody (good for retro sounds)
- `triangle`: Soft, flute-like

---

### 5. Filter Node (Frequency Filter)

Low-pass filter with envelope modulation.

```json
{
  "type": "filter",
  "props": {
    "cutoff": 2000,       // Base cutoff frequency in Hz
    "attack": 0.01,       // Filter envelope attack
    "decay": 0.3,         // Filter envelope decay
    "mod": 2000           // Modulation depth in Hz
  }
}
```

**Tips:**
- Low cutoff (200-500 Hz) = dark, muffled
- High cutoff (2000+ Hz) = bright, present
- High mod with short decay = "wah" effect

---

### 6. Gate Node (Probability Gate)

Randomly blocks packets based on probability.

```json
{
  "type": "gate",
  "props": {
    "prob": 0.5           // Pass probability (0-1)
  }
}
```

**Creative Uses:**
- Low prob (0.2-0.4) = sparse, ambient
- High prob (0.7-0.9) = mostly through, occasional gaps
- Chain multiple gates for complex probability

---

### 7. Delay Node (Time Delay)

Holds packets for a specified duration before releasing.

```json
{
  "type": "delay",
  "props": {
    "delayTime": 1        // Delay in beats
  }
}
```

**Uses:**
- Create echoes/canons
- Build arpeggios
- Offset voices for counterpoint

---

### 8. Gain Node (Volume Control)

Multiplies packet amplitude.

```json
{
  "type": "gain",
  "props": {
    "value": 1.0,         // Gain multiplier (0-2+)
    "mass": 1.0           // Gravity physics weight
  }
}
```

---

### 9. Noise Node (Noise Layer)

Adds noise component to sound.

```json
{
  "type": "noise",
  "props": {
    "wave": "white",      // "white", "pink", "brown"
    "attack": 0.01,
    "decay": 0.2,
    "mix": 0.2            // Blend amount (0-1)
  }
}
```

**Noise Types:**
- `white`: Bright, harsh (hi-hats, snares)
- `pink`: Balanced, natural
- `brown`: Dark, rumbling (bass enhancement)

---

### 10. Harmonic Node (Overtone Generator)

Adds harmonic overtone to the sound.

```json
{
  "type": "harmonic",
  "props": {
    "ratio": 2,           // Frequency multiplier
    "wave": "sine",
    "attack": 0.01,
    "decay": 0.4,
    "mix": 0.5
  }
}
```

**Common Ratios:**
- 2 = octave
- 3 = fifth + octave (12th)
- 4 = two octaves
- 5 = major third + two octaves

---

### 11. Modulator Node (Vibrato/Tremolo)

Adds pitch modulation (vibrato) to packets.

```json
{
  "type": "modulator",
  "props": {
    "rate": 5,            // Modulation rate in Hz
    "depth": 20,          // Depth in cents
    "delay": 0.2          // Onset delay in seconds
  }
}
```

**Settings:**
- Fast rate (5-8 Hz) + shallow depth = subtle vibrato
- Slow rate (1-3 Hz) + deep = expressive vibrato
- Very fast (10+ Hz) = electronic warble

---

### 12. Quantizer Node (Scale Quantization)

Snaps pitches to the global scale.

```json
{
  "type": "quantizer",
  "props": {
    "strength": 1.0,      // Quantization strength (0-1)
    "useGlobalKey": true  // Use global root/scale settings
  }
}
```

**Tips:**
- Use after random sources for melodic coherence
- Lower strength (0.5-0.8) for pitch drift
- Essential for harmonically correct generative music

---

### 13. Splitter Node (Signal Distributor)

Distributes packets to connected outputs based on behavior.

```json
{
  "type": "splitter",
  "props": {
    "entangled": false,       // Entangled mode (see below)
    "behavior": "broadcast"   // "broadcast", "random", "weighted"
  }
}
```

**Behaviors:**
- `broadcast`: Sends packets to ALL connected outputs (default).
- `random`: Sends packet to ONE random output (uniform probability).
- `weighted`: Sends packet to ONE output based on edge weights (Markov chain).

**Entanglement:** When `entangled: true`, all packets split from this node share modifications. If one passes through a pitch node, all entangled siblings receive the same pitch change.

---

### 14. Tunnel Node (Compound Processor)

Groups multiple processing nodes into one unit.

```json
{
  "type": "tunnel",
  "props": {
    "tunnelName": "Bass",
    "subNodes": [
      { "type": "pitch", "props": { "shift": -12 } },
      { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.3 } },
      { "type": "filter", "props": { "cutoff": 800, "mod": 1000 } }
    ]
  }
}
```

**SubNode Types:** Any node type except `tunnel`, `source`, `speaker`, `teleporter`.

---

### 15. Teleporter Node (Instant Transport)

Instantly transports packets between locations.

```json
{
  "type": "teleporter",
  "props": {
    "channel": "A",       // Channel identifier (A-Z)
    "isEntry": true       // true = entry, false = exit
  }
}
```

**Usage:**
- Create entry/exit pairs with same channel
- Packets entering an entry teleporter emerge from all exits on that channel
- Use for spatial effects, feedback loops, or routing

---

### 16. LFO Node (Low Frequency Oscillator)

Generates continuous modulation values for CV routing.

```json
{
  "type": "lfo",
  "props": {
    "rate": 0.5,          // Frequency in Hz
    "shape": "sine",      // "sine", "triangle", "square", "sawtooth"
    "min": 200,           // Minimum output value
    "max": 2000,          // Maximum output value
    "phase": 0            // Phase offset (0-1)
  }
}
```

**Important:** LFOs connect to other nodes via CV edges (using `targetParam`).

---

### 17. MIDI Out Node

Sends MIDI note messages to external devices.

```json
{
  "type": "midi_out",
  "props": {
    "channel": 1,         // MIDI channel (1-16)
    "duration": 200,      // Note duration in ms
    "velocityScale": 1.0  // Velocity multiplier
  }
}
```

---

### 18. MIDI CC Node

Sends MIDI CC messages.

```json
{
  "type": "midi_cc",
  "props": {
    "channel": 1,         // MIDI channel (1-16)
    "ccNumber": 74        // CC number (0-127)
  }
}
```

---

### 19. Scene Trigger Node

Triggers scene changes when a packet arrives.

```json
{
  "type": "scene_trigger",
  "props": {
    "targetSceneIndex": 0,  // Scene index to switch to
    "behavior": "jump"      // "jump" or "crossfade"
  }
}
```

---

## Edge System

### Audio Edges (Default)

Connect nodes for packet flow:

```json
{
  "id": "e1",
  "from": "source_1",
  "to": "speaker_1"
}
```

### Physical vs Fixed Timing

**Physical timing** (default): Packet travel time depends on edge length.
```json
{ "id": "e1", "from": "a", "to": "b" }
```

**Fixed timing**: Packet arrives after exact beat duration.
```json
{ 
  "id": "e1", 
  "from": "a", 
  "to": "b", 
  "timingMode": "fixed", 
  "durationBeats": 0.5,
  "weight": 1.0         // Optional: Weight for Markov splitters
}
```

> **Recommended Timing Mode:**
> AI generators should default to `timingMode: "fixed"` and explicitly provide `durationBeats`.
>
>   * **Reason:** Physical timing requires screen-coordinate physics calculations which are error-prone in pure text generation.
>   * **Requirement:** If using fixed timing, `durationBeats` must be > 0.

### Version 3.0 Schema Requirements

  * **Version Format:** Use string `"3.0.0"` (not a number).
  * **Scene Container:** Nodes and edges must be inside a scene object within the `"scenes"` array.
  * **Arrangement:** Include at least one arrangement slot pointing to a scene.
  * **Legacy V2 Support:** The app can still load V2 files (`"graph"` format) and will auto-migrate to V3.

### CV Modulation Edges

Connect LFOs to modulate node parameters:

```json
{
  "id": "lfo_edge",
  "from": "lfo_1",
  "to": "filter_1",
  "targetParam": "cutoff"
}
```

**Modulatable Parameters by Node Type:**

| Node Type | Parameters |
|-----------|------------|
| speaker | volume, pan, reverb |
| filter | cutoff |
| gain | value |
| gate | prob |
| delay | delayTime |
| polariser | mix |
| modulator | rate, depth |

---

## Design Patterns

### Pattern 1: Basic Sound Chain
```
Source → Polariser → Speaker
```
Minimal setup for a single voice.

### Pattern 2: Melodic Chain
```
Source → Polariser → Speaker → Pitch → Speaker → Pitch → Speaker
```
Packets pass through multiple speakers, creating melodic sequences.

### Pattern 3: Chord Voicing
```
                  ┌→ Pitch(+0) → Speaker
Source → Splitter ├→ Pitch(+4) → Speaker  
                  └→ Pitch(+7) → Speaker
```
Split into parallel paths for chords.

### Pattern 4: Canon/Delay
```
           ┌→ Speaker (immediate)
Source → Pol ├→ Delay(2) → Speaker
           └→ Delay(4) → Speaker
```
Same material at different times.

### Pattern 5: Generative with Gates
```
Source(random) → Gate(0.6) → Quantizer → Polariser → Speaker
```
Random notes filtered by probability, quantized to scale.

### Pattern 6: CV Modulation
```
Source → Polariser → Filter → Speaker
                       ↑
                      LFO -----(targetParam: cutoff)
```
LFO continuously modulates filter cutoff.

### Pattern 7: Layered Sound (Tunnel)
```
Source → Tunnel[Polariser, Harmonic, Filter] → Speaker
```
Complex timbre in single visual node.

### Pattern 8: Arpeggio with Fixed Timing
```
              ┌─(0.0 beats)→ Speaker (root)
Source → Pol ├─(0.5 beats)→ Pitch(+4) → Speaker (3rd)
              ├─(1.0 beats)→ Pitch(+7) → Speaker (5th)
              └─(1.5 beats)→ Pitch(+12) → Speaker (octave)
```
Precise timing creates arpeggiated chord.

---

## Complete Examples

> **Note:** The examples below demonstrate the V3 file format with scenes. Each example includes one scene for simplicity, but compositions can have multiple scenes with an arrangement.

### Example 1: Ambient Generative (V3 Format)

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "Ambient Meditation",
    "author": "AI Composer",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": {
    "rootNote": 48,
    "scaleName": "pentatonic",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed",
    "masterBpm": 60
  },
  "scenes": [
    {
      "id": "scene-ambient",
      "name": "Ambient Pad",
      "color": "#4CAF50",
      "durationBeats": 32,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [
        { "id": "src1", "type": "source", "x": 100, "y": 200, 
          "props": { "interval": 3, "noteIndex": -1, "intensity": 0.4 } },
        { "id": "gate1", "type": "gate", "x": 220, "y": 200, 
          "props": { "prob": 0.5 } },
        { "id": "quant1", "type": "quantizer", "x": 340, "y": 200, 
          "props": { "strength": 1.0, "useGlobalKey": true } },
        { "id": "pol1", "type": "polariser", "x": 460, "y": 200, 
          "props": { "wave": "sine", "attack": 0.3, "decay": 2.0 } },
        { "id": "spk1", "type": "speaker", "x": 580, "y": 200, 
          "props": { "reverb": 0.8, "pan": -0.3 } },
        
        { "id": "src2", "type": "source", "x": 100, "y": 350, 
          "props": { "interval": 5, "noteIndex": -1, "intensity": 0.3 } },
        { "id": "delay1", "type": "delay", "x": 220, "y": 350, 
          "props": { "delayTime": 2 } },
        { "id": "quant2", "type": "quantizer", "x": 340, "y": 350, 
          "props": { "strength": 1.0 } },
        { "id": "pol2", "type": "polariser", "x": 460, "y": 350, 
          "props": { "wave": "triangle", "attack": 0.5, "decay": 3.0 } },
        { "id": "spk2", "type": "speaker", "x": 580, "y": 350, 
          "props": { "reverb": 0.9, "pan": 0.3 } },
        
        { "id": "src3", "type": "source", "x": 100, "y": 500, 
          "props": { "interval": 8, "midiNote": 36, "noteIndex": -2, "intensity": 0.5 } },
        { "id": "pol3", "type": "polariser", "x": 250, "y": 500, 
          "props": { "wave": "sine", "attack": 0.2, "decay": 4.0 } },
        { "id": "spk3", "type": "speaker", "x": 400, "y": 500, 
          "props": { "reverb": 0.7, "pan": 0 } }
      ],
      "edges": [
        { "id": "e1", "from": "src1", "to": "gate1", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e2", "from": "gate1", "to": "quant1", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e3", "from": "quant1", "to": "pol1", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e4", "from": "pol1", "to": "spk1", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e5", "from": "src2", "to": "delay1", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e6", "from": "delay1", "to": "quant2", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e7", "from": "quant2", "to": "pol2", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e8", "from": "pol2", "to": "spk2", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e9", "from": "src3", "to": "pol3", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e10", "from": "pol3", "to": "spk3", "timingMode": "fixed", "durationBeats": 0.1 }
      ],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-ambient", "startBeat": 0 }
  ]
}
```

### Example 2: Techno Beat (V3 Format)

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "Techno Pattern",
    "author": "AI Composer",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": {
    "rootNote": 36,
    "scaleName": "chromatic",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed",
    "masterBpm": 130
  },
  "scenes": [
    {
      "id": "scene-techno",
      "name": "Beat",
      "color": "#FF5722",
      "durationBeats": 16,
      "loopCount": 4,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [
        { "id": "kick_src", "type": "source", "x": 60, "y": 150,
          "props": { "interval": 1, "midiNote": 36, "noteIndex": -2, "intensity": 0.9 } },
        { "id": "kick_pol", "type": "polariser", "x": 180, "y": 150,
          "props": { "wave": "sine", "attack": 0.005, "decay": 0.2 } },
        { "id": "kick_p", "type": "pitch", "x": 280, "y": 150,
          "props": { "mode": "shift", "shift": -12 } },
        { "id": "kick_out", "type": "speaker", "x": 400, "y": 150,
          "props": { "reverb": 0.05, "pan": 0 } },
        
        { "id": "bass_src", "type": "source", "x": 60, "y": 280,
          "props": { "interval": 2, "midiNote": 36, "noteIndex": -2, "intensity": 0.7 } },
        { "id": "bass_pol", "type": "polariser", "x": 180, "y": 280,
          "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.4 } },
        { "id": "bass_flt", "type": "filter", "x": 300, "y": 280,
          "props": { "cutoff": 300, "mod": 600, "attack": 0.01, "decay": 0.15 } },
        { "id": "bass_out", "type": "speaker", "x": 420, "y": 280,
          "props": { "reverb": 0.1, "pan": 0 } },
        
        { "id": "hh_src", "type": "source", "x": 60, "y": 410,
          "props": { "interval": 0.5, "midiNote": 96, "noteIndex": -2, "intensity": 0.3 } },
        { "id": "hh_gate", "type": "gate", "x": 160, "y": 410,
          "props": { "prob": 0.8 } },
        { "id": "hh_pol", "type": "polariser", "x": 260, "y": 410,
          "props": { "wave": "square", "attack": 0.001, "decay": 0.03 } },
        { "id": "hh_out", "type": "speaker", "x": 380, "y": 410,
          "props": { "reverb": 0.2, "pan": 0.3 } }
      ],
      "edges": [
        { "id": "e_k1", "from": "kick_src", "to": "kick_pol", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_k2", "from": "kick_pol", "to": "kick_p", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_k3", "from": "kick_p", "to": "kick_out", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_b1", "from": "bass_src", "to": "bass_pol", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_b2", "from": "bass_pol", "to": "bass_flt", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_b3", "from": "bass_flt", "to": "bass_out", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_h1", "from": "hh_src", "to": "hh_gate", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_h2", "from": "hh_gate", "to": "hh_pol", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_h3", "from": "hh_pol", "to": "hh_out", "timingMode": "fixed", "durationBeats": 0.1 }
      ],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-techno", "startBeat": 0 }
  ]
}
```

### Example 3: LFO Modulated Pad

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "Evolving Pad",
    "author": "AI Composer",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": {
    "rootNote": 48,
    "scaleName": "minor",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed",
    "masterBpm": 70
  },
  "scenes": [
    {
      "id": "scene-pad",
      "name": "Pad",
      "color": "#9C27B0",
      "durationBeats": 32,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "fade", "durationBeats": 4 },
      "exitTransition": { "type": "fade", "durationBeats": 4 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [
        { "id": "src", "type": "source", "x": 80, "y": 300,
          "props": { "interval": 4, "midiNote": 48, "noteIndex": -2, "intensity": 0.6 } },
        { "id": "pol", "type": "polariser", "x": 200, "y": 300,
          "props": { "wave": "sawtooth", "attack": 0.8, "decay": 3.0 } },
        { "id": "flt", "type": "filter", "x": 340, "y": 300,
          "props": { "cutoff": 1000, "mod": 0 } },
        { "id": "out", "type": "speaker", "x": 480, "y": 300,
          "props": { "reverb": 0.7, "pan": 0 } },
        
        { "id": "lfo_cutoff", "type": "lfo", "x": 340, "y": 150,
          "props": { "rate": 0.15, "shape": "sine", "min": 200, "max": 3000 } },
        { "id": "lfo_pan", "type": "lfo", "x": 480, "y": 150,
          "props": { "rate": 0.1, "shape": "triangle", "min": -0.8, "max": 0.8 } }
      ],
      "edges": [
        { "id": "e1", "from": "src", "to": "pol", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e2", "from": "pol", "to": "flt", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e3", "from": "flt", "to": "out", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e_lfo1", "from": "lfo_cutoff", "to": "flt", "targetParam": "cutoff" },
        { "id": "e_lfo2", "from": "lfo_pan", "to": "out", "targetParam": "pan" }
      ],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-pad", "startBeat": 0 }
  ]
}
```

### Example 4: Chord Progression with Entanglement

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "Entangled Chords",
    "author": "AI Composer",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": {
    "rootNote": 60,
    "scaleName": "major",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed",
    "masterBpm": 90
  },
  "scenes": [
    {
      "id": "scene-chords",
      "name": "Chords",
      "color": "#2196F3",
      "durationBeats": 16,
      "loopCount": 2,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [
        { "id": "src", "type": "source", "x": 60, "y": 250,
          "props": { "interval": 4, "midiNote": 60, "noteIndex": -2, "intensity": 0.6 } },
        { "id": "split", "type": "splitter", "x": 160, "y": 250,
          "props": { "entangled": true } },
        
        { "id": "p_root", "type": "pitch", "x": 280, "y": 150,
          "props": { "mode": "shift", "shift": 0 } },
        { "id": "pol_root", "type": "polariser", "x": 380, "y": 150,
          "props": { "wave": "sine", "attack": 0.1, "decay": 1.5 } },
        { "id": "spk_root", "type": "speaker", "x": 500, "y": 150,
          "props": { "reverb": 0.5, "pan": -0.4 } },
        
        { "id": "p_third", "type": "pitch", "x": 280, "y": 250,
          "props": { "mode": "shift", "shift": 4 } },
        { "id": "pol_third", "type": "polariser", "x": 380, "y": 250,
          "props": { "wave": "sine", "attack": 0.1, "decay": 1.5 } },
        { "id": "spk_third", "type": "speaker", "x": 500, "y": 250,
          "props": { "reverb": 0.5, "pan": 0 } },
        
        { "id": "p_fifth", "type": "pitch", "x": 280, "y": 350,
          "props": { "mode": "shift", "shift": 7 } },
        { "id": "pol_fifth", "type": "polariser", "x": 380, "y": 350,
          "props": { "wave": "sine", "attack": 0.1, "decay": 1.5 } },
        { "id": "spk_fifth", "type": "speaker", "x": 500, "y": 350,
          "props": { "reverb": 0.5, "pan": 0.4 } }
      ],
      "edges": [
        { "id": "e1", "from": "src", "to": "split", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e2", "from": "split", "to": "p_root", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e3", "from": "p_root", "to": "pol_root", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e4", "from": "pol_root", "to": "spk_root", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e5", "from": "split", "to": "p_third", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e6", "from": "p_third", "to": "pol_third", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e7", "from": "pol_third", "to": "spk_third", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e8", "from": "split", "to": "p_fifth", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e9", "from": "p_fifth", "to": "pol_fifth", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e10", "from": "pol_fifth", "to": "spk_fifth", "timingMode": "fixed", "durationBeats": 0.1 }
      ],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-chords", "startBeat": 0 }
  ]
}
```

### Example 5: Sequential Melody

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "Ascending Scale",
    "author": "AI Composer",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": {
    "rootNote": 60,
    "scaleName": "major",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed",
    "masterBpm": 120
  },
  "scenes": [
    {
      "id": "scene-melody",
      "name": "Melody",
      "color": "#FF9800",
      "durationBeats": 16,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [
        { "id": "src", "type": "source", "x": 50, "y": 300,
          "props": { "interval": 4, "midiNote": 60, "noteIndex": -2, "intensity": 0.6 } },
        { "id": "pol", "type": "polariser", "x": 130, "y": 300,
          "props": { "wave": "triangle", "attack": 0.02, "decay": 0.4 } },
        { "id": "spk1", "type": "speaker", "x": 210, "y": 300, "props": { "reverb": 0.3, "pan": -0.6 } },
        { "id": "p1", "type": "pitch", "x": 290, "y": 300, "props": { "mode": "shift", "shift": 2 } },
        { "id": "spk2", "type": "speaker", "x": 370, "y": 300, "props": { "reverb": 0.3, "pan": -0.2 } },
        { "id": "p2", "type": "pitch", "x": 450, "y": 300, "props": { "mode": "shift", "shift": 2 } },
        { "id": "spk3", "type": "speaker", "x": 530, "y": 300, "props": { "reverb": 0.3, "pan": 0.2 } },
        { "id": "p3", "type": "pitch", "x": 610, "y": 300, "props": { "mode": "shift", "shift": 1 } },
        { "id": "spk4", "type": "speaker", "x": 690, "y": 300, "props": { "reverb": 0.3, "pan": 0.6 } }
      ],
      "edges": [
        { "id": "e1", "from": "src", "to": "pol", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e2", "from": "pol", "to": "spk1", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e3", "from": "spk1", "to": "p1", "timingMode": "fixed", "durationBeats": 0.5 },
        { "id": "e4", "from": "p1", "to": "spk2", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e5", "from": "spk2", "to": "p2", "timingMode": "fixed", "durationBeats": 0.5 },
        { "id": "e6", "from": "p2", "to": "spk3", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e7", "from": "spk3", "to": "p3", "timingMode": "fixed", "durationBeats": 0.5 },
        { "id": "e8", "from": "p3", "to": "spk4", "timingMode": "fixed", "durationBeats": 0.1 }
      ],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-melody", "startBeat": 0 }
  ]
}
```

---

## Generation Guidelines

### Layout Recommendations

1. **Horizontal Flow**: Place sources on left, speakers on right
2. **Vertical Spacing**: ~120-150px between parallel paths
3. **Node Spacing**: ~100-150px between connected nodes
4. **Canvas Size**: Typical compositions fit within 1000x600px

### ID Conventions

- Use descriptive prefixes: `src_`, `spk_`, `pol_`, `flt_`, etc.
- Edge IDs: `e1`, `e2` or descriptive like `e_kick_to_speaker`
- Keep IDs unique across the composition

### Musical Guidelines

1. **Always include at least one speaker** - otherwise no sound
2. **Use polariser before speaker** for defined sound shape
3. **Quantizer after random sources** for musical coherence
4. **Balance volumes** - multiple voices may need gain adjustment
5. **Consider stereo spread** - use pan for spatial interest
6. **Reverb creates depth** - higher reverb for distant/ambient sounds

### Validation Checklist

- [ ] Root structure has `meta`, `global`, `scenes`, and `arrangement`
- [ ] `meta.version` is `"3.0.0"`
- [ ] At least one scene exists with nodes and edges
- [ ] At least one arrangement slot exists
- [ ] Every edge `from` and `to` references valid node IDs within the scene
- [ ] At least one source node exists per scene
- [ ] At least one speaker node exists per scene
- [ ] Audio paths connect source → (processing) → speaker
- [ ] CV edges have valid `targetParam` for target node type
- [ ] All edges use `timingMode: "fixed"` with `durationBeats`
- [ ] All node IDs are unique within each scene
- [ ] All edge IDs are unique within each scene
- [ ] Scene IDs are unique across the composition

### Common Mistakes to Avoid

1. **Orphan nodes**: Nodes not connected to anything
2. **Missing speakers**: Processing chains that never reach output
3. **Invalid CV targets**: Trying to modulate parameters that don't exist
4. **Circular audio paths**: Can cause infinite packet generation
5. **Too many sources**: Can overwhelm with MAX_PACKETS limit (1000)

---

## Scene System

Phonon v3 supports multi-scene compositions for creating songs with distinct sections (verse, chorus, bridge, etc.).

### Scene Data Structure

```typescript
interface Scene {
  id: string;                    // Unique identifier
  name: string;                  // Display name ("Intro", "Verse", etc.)
  color: string;                 // Hex color for UI
  
  // Graph content
  nodes: GraphNode[];
  edges: GraphEdge[];
  annotations: Annotation[];
  regions: Region[];
  
  // Timing
  durationBeats: number;         // Length in beats
  loopCount: number;             // Repetitions (1 = play once)
  
  // Local overrides (null = inherit global)
  localBpm: number | null;
  localRoot: number | null;      // 0-11 (C=0)
  localScale: ScaleName | null;
  
  // Transitions
  enterTransition: { type: 'cut' | 'crossfade' | 'fade', durationBeats: number };
  exitTransition: { type: 'cut' | 'crossfade' | 'fade', durationBeats: number };
}
```

### Playback Modes

| Mode | Description |
|------|-------------|
| **Arrangement** | Scenes play in sequence with enforced durations, auto-advance |
| **Jam** | Scenes play indefinitely until user triggers change |

### Arrangement Slots

```typescript
interface ArrangementSlot {
  id: string;
  sceneId: string;              // Reference to scene
  startBeat: number;            // Position in arrangement
  instanceLoopCount?: number;   // Override scene's loop count
  instanceBpm?: number;         // Override BPM for this instance
}
```

### Export Behavior

- **Arrangement Export:** Renders all scenes in order, calculates total duration automatically
- **Canvas Export:** Renders current canvas with user-specified duration

### Example Multi-Scene Composition

```json
{
  "meta": { 
    "version": "3.0.0", 
    "name": "Simple Song",
    "author": "AI Composer",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": { 
    "masterBpm": 120, 
    "rootNote": 0, 
    "scaleName": "minor",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed"
  },
  "scenes": [
    {
      "id": "scene-verse",
      "name": "Verse",
      "color": "#2196F3",
      "durationBeats": 32,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "crossfade", "durationBeats": 2 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [ /* verse graph */ ],
      "edges": [ /* verse edges */ ],
      "annotations": [],
      "regions": []
    },
    {
      "id": "scene-chorus",
      "name": "Chorus", 
      "color": "#FF9800",
      "durationBeats": 16,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": "major",
      "enterTransition": { "type": "crossfade", "durationBeats": 2 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [ /* chorus graph - fuller sound */ ],
      "edges": [ /* chorus edges */ ],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-verse", "startBeat": 0 },
    { "id": "slot-2", "sceneId": "scene-chorus", "startBeat": 32 },
    { "id": "slot-3", "sceneId": "scene-verse", "startBeat": 48 },
    { "id": "slot-4", "sceneId": "scene-chorus", "startBeat": 80 }
  ]
}
```

---

## Quick Reference

### Minimal Valid Composition (V3)

```json
{
  "meta": {
    "version": "3.0.0",
    "name": "Minimal",
    "author": "",
    "created": 1733500000000,
    "modified": 1733500000000
  },
  "global": {
    "masterBpm": 120,
    "rootNote": 60,
    "scaleName": "major",
    "gravity": 0.5,
    "defaultEdgeBehaviour": "fixed"
  },
  "scenes": [
    {
      "id": "scene-1",
      "name": "Main",
      "color": "#4CAF50",
      "durationBeats": 16,
      "loopCount": 1,
      "localBpm": null,
      "localRoot": null,
      "localScale": null,
      "enterTransition": { "type": "cut", "durationBeats": 0 },
      "exitTransition": { "type": "cut", "durationBeats": 0 },
      "jamTrigger": { "midiNote": null, "midiChannel": 1, "quantize": "bar", "phraseLength": 4 },
      "nodes": [
        { "id": "src", "type": "source", "x": 100, "y": 200, 
          "props": { "interval": 1, "midiNote": 60, "noteIndex": -2, "intensity": 0.5 } },
        { "id": "pol", "type": "polariser", "x": 250, "y": 200, 
          "props": { "wave": "sine", "attack": 0.01, "decay": 0.4 } },
        { "id": "spk", "type": "speaker", "x": 400, "y": 200, 
          "props": { "reverb": 0.3, "pan": 0 } }
      ],
      "edges": [
        { "id": "e1", "from": "src", "to": "pol", "timingMode": "fixed", "durationBeats": 0.1 },
        { "id": "e2", "from": "pol", "to": "spk", "timingMode": "fixed", "durationBeats": 0.1 }
      ],
      "annotations": [],
      "regions": []
    }
  ],
  "arrangement": [
    { "id": "slot-1", "sceneId": "scene-1", "startBeat": 0 }
  ]
}
```

### Node Color Reference

| Node Type | Color | Hex |
|-----------|-------|-----|
| source | Green | #4caf50 |
| speaker | Deep Orange | #ff5722 |
| pitch | Blue | #2196f3 |
| polariser | Purple | #9c27b0 |
| filter | Cyan | #00bcd4 |
| gate | Yellow | #ffeb3b |
| delay | Brown | #795548 |
| gain | Blue Grey | #607d8b |
| noise | Grey | #9e9e9e |
| harmonic | Pink | #e91e63 |
| modulator | Deep Purple | #673ab7 |
| tunnel | Indigo | #3f51b5 |
| teleporter | Green Accent | #00e676 |
| quantizer | Orange | #ff9800 |
| lfo | Light Green | #8bc34a |
| splitter | Slate | #64748b |
