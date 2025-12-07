# Sequencer Node Implementation Plan

## Overview

The **Sequencer** is a container node (like Tunnel) that simplifies melody creation. But unlike a new abstraction, it follows Phonon's existing logic:

> **A melody = multiple (pitch + delay) combinations triggered by one source**

Currently, to play C, E, G in sequence:
```
Source → Splitter ─┬─→ Pitch(C) ─→ Speaker
                   ├─→ Delay(0.5) → Pitch(E) → Speaker  
                   └─→ Delay(1.0) → Pitch(G) → Speaker
```

A Sequencer encapsulates this pattern:
```
Source → Sequencer → Speaker
```

### Design Philosophy: Consistent with Existing Model

| Concept | Implementation |
|---------|----------------|
| Tunnel | Chain of SubNodes (processing) |
| **Sequencer** | **Array of Steps, where each Step = delay + pitch + velocity** |

A **Step** is NOT a new primitive — it's just the parameters that would go into a `delay` node + a `pitch` node + a `gain` node.

---

## 1. Core Insight: Steps as Virtual Nodes

### 1.1 What a Step Really Is

A sequencer step is equivalent to this node chain:
```
→ Delay(timeOffset) → Pitch(noteOffset) → Gain(velocity) →
```

Instead of creating actual nodes, the Sequencer holds this data compactly:

```typescript
interface SequencerStep {
  // Equivalent to DelayProps.delayTime
  time: number;           // Beats from trigger
  
  // Equivalent to PitchProps (mode: 'shift')
  pitch: number;          // Semitones offset from input
  
  // Equivalent to GainProps.value
  velocity: number;       // 0-1 multiplier
  
  // Equivalent to SpeakerProps.holdTime (optional override)
  duration?: number;      // Beats (note length)
}
```

### 1.2 Why This is Consistent

- **No new audio concepts** — just delay + pitch + gain, which already exist
- **Follows packet model** — one input packet expands to N output packets
- **Same as Tunnel pattern** — container with ordered sub-operations
- **Pitch is relative** — like `PitchProps.shift`, offset from input note

### 1.3 Visual Comparison

```
TUNNEL:                           SEQUENCER:
┌──────────────────────┐          ┌──────────────────────┐
│ polariser → filter   │          │ Step 0: t=0, p=0     │
│   → harmonic         │          │ Step 1: t=0.5, p=+4  │
│                      │          │ Step 2: t=1.0, p=+7  │
└──────────────────────┘          └──────────────────────┘
   ↓                                 ↓
 1 packet in → 1 packet out        1 packet in → N packets out
 (transformed)                     (expanded in time)
```

---

## 2. Data Model (Consistent with Existing Types)

### 2.1 SequencerStep (Maps to Existing Node Props)

```typescript
// src/core/types.ts

/** 
 * A step in a sequencer pattern.
 * Conceptually equivalent to: Delay → Pitch → Gain
 * Uses same units as existing node props for consistency.
 */
export interface SequencerStep {
  /** 
   * Time offset in beats (same unit as DelayProps.delayTime)
   * 0 = plays immediately on trigger
   */
  readonly time: number;
  
  /** 
   * Pitch offset in semitones (same as PitchProps.shift)
   * 0 = same as input note, +12 = octave up, -7 = fifth down
   */
  readonly pitch: number;
  
  /** 
   * Velocity/gain multiplier (same concept as GainProps.value)
   * 1.0 = full velocity, 0.5 = half, 0 = silent
   */
  readonly velocity: number;
  
  /** 
   * Note duration in beats (maps to holdTime in AudioPayload)
   * Optional — if not set, uses default from speaker/tunnel
   */
  readonly duration?: number;
}
```

### 2.2 SequencerProps (Parallel to TunnelProps)

```typescript
export interface SequencerProps {
  /** Display name (like TunnelProps.tunnelName) */
  readonly name: string;
  
  /** Ordered array of steps (like TunnelProps.subNodes) */
  readonly steps: readonly SequencerStep[];
  
  /** Pattern length in beats — defines when pattern wraps */
  readonly length: number;
  
  /** Loop mode — if true, pattern repeats */
  readonly loop: boolean;
}

/** Default values */
export const DEFAULT_SEQUENCER_PROPS: SequencerProps = {
  name: 'Pattern',
  steps: [
    { time: 0,   pitch: 0, velocity: 1.0 },  // Root
    { time: 0.5, pitch: 4, velocity: 0.8 },  // Major 3rd
    { time: 1.0, pitch: 7, velocity: 0.9 },  // Perfect 5th
  ],
  length: 2,
  loop: true,
};
```

### 2.3 Comparison with TunnelProps

| Property | TunnelProps | SequencerProps |
|----------|-------------|----------------|
| Name | `tunnelName: string` | `name: string` |
| Content | `subNodes: SubNode[]` | `steps: SequencerStep[]` |
| SubNode has | `type` + `props` | `time` + `pitch` + `velocity` |
| Processing | Serial (transform) | Parallel (expand) |

### 2.4 Why Relative Pitch (Not Absolute)?

**Consistent with PitchProps:**
```typescript
// Existing PitchProps
interface PitchProps {
  mode: 'shift' | 'set';    // 'shift' is relative
  shift: number;            // Semitones offset
  fixedMidiNote: MidiNote;  // Only used in 'set' mode
}
```

The `shift` mode is the default and most common. Sequencer uses the same concept:
- Input packet has `midiNote: 60` (C4)
- Step has `pitch: 4`
- Output packet has `midiNote: 64` (E4)

This means the **same pattern works at any root note** — determined by the Source.

---

## 3. Processing Logic (Follows Existing Patterns)

### 3.1 How Tunnel Processes Packets

For reference, here's how Tunnel works (from `engine.ts`):
```typescript
// Tunnel: 1 packet in → transform through chain → 1 packet out
function processTunnel(payload: AudioPayload, node: GraphNode): AudioPayload {
  let result = payload;
  for (const subNode of props.subNodes) {
    result = processSubNode(result, subNode);  // Serial
  }
  return result;
}
```

### 3.2 How Sequencer Processes Packets

Sequencer is the **dual** operation — instead of serial transform, it's **parallel expand**:

```typescript
// Sequencer: 1 packet in → expand to N packets → N packets out
function processSequencer(
  payload: AudioPayload,
  node: GraphNode<'sequencer'>,
  triggerTime: number,
  beatDuration: number
): ScheduledPacket[] {
  const { steps, length, loop } = node.props;
  const results: ScheduledPacket[] = [];
  
  for (const step of steps) {
    // Apply pitch shift (like PitchProps.shift)
    const newMidiNote = payload.midiNote + step.pitch;
    
    // Apply velocity (like GainProps.value)
    const newGain = payload.gain * step.velocity;
    
    // Calculate scheduled time (like DelayProps.delayTime)
    const scheduledTime = triggerTime + step.time * beatDuration;
    
    results.push({
      payload: {
        ...payload,
        midiNote: newMidiNote as MidiNote,
        freq: midiToFreq(newMidiNote),
        gain: newGain,
        holdTime: step.duration ? step.duration * beatDuration : payload.holdTime,
      },
      scheduledTime,
    });
  }
  
  return results;
}
```

### 3.3 Equivalence Proof

A sequencer with these steps:
```typescript
steps: [
  { time: 0,   pitch: 0,  velocity: 1.0 },
  { time: 0.5, pitch: 4,  velocity: 0.8 },
  { time: 1.0, pitch: 7,  velocity: 0.9 },
]
```

Is equivalent to this graph:
```
         ┌→ Pitch(0) → Gain(1.0) →──────────────────────────┐
Source → ├→ Delay(0.5) → Pitch(4) → Gain(0.8) →─────────────┼→ Speaker
         └→ Delay(1.0) → Pitch(7) → Gain(0.9) →─────────────┘
```

The Sequencer just expresses this more compactly.

---

## 4. UI Design (Step List + Grid View)

### 4.1 Property Panel — Step List View

Consistent with Tunnel's SubNode list:

```
┌─────────────────────────────────────────────────┐
│ SEQUENCER                                       │
├─────────────────────────────────────────────────┤
│ Name: [Arpeggio        ]                        │
│                                                 │
│ Length: [2    ▼] beats    ☑ Loop               │
├─────────────────────────────────────────────────┤
│ Steps (3)                              [+ Add]  │
│ ┌─────────────────────────────────────────────┐ │
│ │ ▼ Step 1                          [↑][↓][×] │ │
│ │   Time:  [0    ] beats                      │ │
│ │   Pitch: [0    ] semitones (root)           │ │
│ │   Vel:   [1.0  ] ████████████████           │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ▶ Step 2: +0.5 beats, +4 semi, vel 0.8      │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ▶ Step 3: +1.0 beats, +7 semi, vel 0.9      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Presets ▼]                                     │
└─────────────────────────────────────────────────┘
```

### 4.2 Grid View (Optional, for visual editing)

For users who prefer visual editing, a simplified grid:

```
┌─────────────────────────────────────────────────┐
│ +12 │    │    │    │    │  ← Octave up          │
│  +7 │    │    │ ●  │    │  ← Fifth              │
│  +4 │    │ ●  │    │    │  ← Major 3rd          │
│   0 │ ●  │    │    │    │  ← Root               │
│  -5 │    │    │    │    │  ← Fourth down        │
│ -12 │    │    │    │    │  ← Octave down        │
├─────┼────┼────┼────┼────┤                       │
│     │ 0  │0.5 │1.0 │1.5 │  ← Time (beats)       │
└─────────────────────────────────────────────────┘
```

**Key difference from DAW piano roll:**
- Y-axis is **relative pitch** (semitones from root), not absolute notes
- This matches the data model and makes patterns transposable

### 4.3 Comparison with Tunnel UI

| Aspect | Tunnel | Sequencer |
|--------|--------|-----------|
| List item | SubNode type + props | Step time + pitch + velocity |
| Expand | Shows subnode properties | Shows step properties |
| Reorder | ↑↓ buttons | ↑↓ buttons (or sort by time) |
| Delete | × button | × button |
| Add | "+ Add SubNode" dropdown | "+ Add Step" button |
| Presets | TunnelPresetSelector | SequencerPresetSelector |

---

## 5. Presets Library

Presets use the same structure — just arrays of steps with common patterns:

```typescript
// src/data/sequencer-presets.ts

export interface SequencerPreset {
  readonly id: string;
  readonly name: string;
  readonly category: 'arpeggio' | 'bass' | 'melody' | 'rhythm';
  readonly description: string;
  readonly steps: readonly SequencerStep[];
  readonly length: number;
  readonly tags: readonly string[];
}

export const SEQUENCER_PRESETS: readonly SequencerPreset[] = [
  // === ARPEGGIOS (chord tones in sequence) ===
  {
    id: 'arp-triad-up',
    name: 'Triad Up',
    category: 'arpeggio',
    description: 'Major triad ascending (root, 3rd, 5th)',
    length: 1.5,
    steps: [
      { time: 0,   pitch: 0,  velocity: 1.0 },  // Root
      { time: 0.5, pitch: 4,  velocity: 0.8 },  // Major 3rd
      { time: 1.0, pitch: 7,  velocity: 0.9 },  // Perfect 5th
    ],
    tags: ['arpeggio', 'major', 'simple'],
  },
  {
    id: 'arp-triad-down',
    name: 'Triad Down',
    category: 'arpeggio',
    description: 'Major triad descending',
    length: 1.5,
    steps: [
      { time: 0,   pitch: 7,  velocity: 1.0 },
      { time: 0.5, pitch: 4,  velocity: 0.8 },
      { time: 1.0, pitch: 0,  velocity: 0.9 },
    ],
    tags: ['arpeggio', 'major', 'simple'],
  },
  {
    id: 'arp-octave',
    name: 'Octave Bounce',
    category: 'arpeggio',
    description: 'Root and octave alternating',
    length: 1,
    steps: [
      { time: 0,   pitch: 0,  velocity: 1.0 },
      { time: 0.5, pitch: 12, velocity: 0.7 },
    ],
    tags: ['arpeggio', 'octave', 'simple'],
  },
  {
    id: 'arp-7th',
    name: 'Maj7 Arpeggio',
    category: 'arpeggio',
    description: 'Major 7th chord tones',
    length: 2,
    steps: [
      { time: 0,    pitch: 0,  velocity: 1.0 },
      { time: 0.5,  pitch: 4,  velocity: 0.8 },
      { time: 1.0,  pitch: 7,  velocity: 0.85 },
      { time: 1.5,  pitch: 11, velocity: 0.75 },
    ],
    tags: ['arpeggio', 'jazz', '7th'],
  },

  // === BASS (low patterns) ===
  {
    id: 'bass-pump',
    name: 'Octave Pump',
    category: 'bass',
    description: 'Classic dance bass pattern',
    length: 2,
    steps: [
      { time: 0,   pitch: 0,  velocity: 1.0 },
      { time: 0.5, pitch: 12, velocity: 0.5 },
      { time: 1.0, pitch: 0,  velocity: 0.9 },
      { time: 1.5, pitch: 12, velocity: 0.4 },
    ],
    tags: ['bass', 'dance', 'pump'],
  },
  {
    id: 'bass-fifth',
    name: 'Root-Fifth',
    category: 'bass',
    description: 'Alternating root and fifth',
    length: 2,
    steps: [
      { time: 0, pitch: 0, velocity: 1.0 },
      { time: 1, pitch: 7, velocity: 0.85 },
    ],
    tags: ['bass', 'simple', 'fifth'],
  },

  // === MELODIES (scale fragments) ===
  {
    id: 'melody-scale-up',
    name: 'Scale Up',
    category: 'melody',
    description: 'Ascending scale fragment (Do-Re-Mi-Fa-Sol)',
    length: 2.5,
    steps: [
      { time: 0,   pitch: 0, velocity: 0.9 },
      { time: 0.5, pitch: 2, velocity: 0.8 },
      { time: 1.0, pitch: 4, velocity: 0.85 },
      { time: 1.5, pitch: 5, velocity: 0.8 },
      { time: 2.0, pitch: 7, velocity: 1.0 },
    ],
    tags: ['melody', 'scale', 'ascending'],
  },
  {
    id: 'melody-neighbor',
    name: 'Neighbor Tone',
    category: 'melody',
    description: 'Root with upper neighbor',
    length: 1.5,
    steps: [
      { time: 0,   pitch: 0, velocity: 1.0 },
      { time: 0.5, pitch: 2, velocity: 0.7 },
      { time: 1.0, pitch: 0, velocity: 0.9 },
    ],
    tags: ['melody', 'ornament', 'simple'],
  },

  // === RHYTHM (same pitch, different times) ===
  {
    id: 'rhythm-4floor',
    name: '4 on Floor',
    category: 'rhythm',
    description: 'Quarter notes on each beat',
    length: 4,
    steps: [
      { time: 0, pitch: 0, velocity: 1.0 },
      { time: 1, pitch: 0, velocity: 0.95 },
      { time: 2, pitch: 0, velocity: 1.0 },
      { time: 3, pitch: 0, velocity: 0.95 },
    ],
    tags: ['rhythm', 'kick', 'dance'],
  },
  {
    id: 'rhythm-offbeat',
    name: 'Off-beats',
    category: 'rhythm',
    description: 'Hits on the "and" of each beat',
    length: 2,
    steps: [
      { time: 0.5, pitch: 0, velocity: 0.7 },
      { time: 1.5, pitch: 0, velocity: 0.7 },
    ],
    tags: ['rhythm', 'hihat', 'house'],
  },
  {
    id: 'rhythm-syncopated',
    name: 'Syncopated',
    category: 'rhythm',
    description: 'Off-beat accents',
    length: 2,
    steps: [
      { time: 0,    pitch: 0, velocity: 1.0 },
      { time: 0.75, pitch: 0, velocity: 0.6 },
      { time: 1.5,  pitch: 0, velocity: 0.8 },
    ],
    tags: ['rhythm', 'syncopation', 'funk'],
  },
];
```

---

## 6. Implementation Summary

### 6.1 File Changes

| File | Change |
|------|--------|
| `src/core/types.ts` | Add `SequencerStep`, `SequencerProps` |
| `src/core/store.ts` | Add `DEFAULT_SEQUENCER_PROPS`, handle in `addNode()` |
| `src/core/engine.ts` | Add `processSequencer()` — expand 1 packet to N |
| `src/io/compiler.ts` | Handle sequencer in offline compile |
| `src/canvas/renderer.ts` | Add `drawSequencerNode()` |
| `src/ui/PropertyPanel.tsx` | Add sequencer editor (step list) |
| `src/ui/ContextMenu.tsx` | Add to node creation menu |
| `src/data/sequencer-presets.ts` | NEW — preset patterns |

### 6.2 Why This is Consistent

| Aspect | Existing Pattern | Sequencer |
|--------|------------------|-----------|
| Container | Tunnel has SubNodes | Sequencer has Steps |
| SubNode | `{ type, props }` | Step = virtual `delay+pitch+gain` |
| Processing | Serial transform | Parallel expand |
| Props naming | `tunnelName`, `subNodes` | `name`, `steps` |
| Units | beats, semitones, 0-1 | beats, semitones, 0-1 |

---

## 7. Design Rationale

### Q: Why relative pitch instead of absolute MIDI notes?

**Consistent with PitchProps.shift** — the default and most common pitch operation. This means:
- Same pattern works at any root note
- Transposable by changing Source's midiNote
- Matches how musicians think ("up a third", not "E4")

### Q: Why not include sound properties (wave, filter, etc.)?

**Separation of concerns:**
- Sequencer = *when* and *what pitch*
- Tunnel = *how it sounds*

Chain them: `Source → Sequencer → Tunnel → Speaker`

### Q: How is this different from multiple Delay nodes?

**Identical behavior, compact representation:**
```
// These are equivalent:
Sequencer with 3 steps at t=0, t=0.5, t=1.0
  = Splitter → 3× (Delay → Pitch → Gain) → Merge
```

### Q: Why no absolute pitch mode?

Keep it simple. If you want C4-E4-G4 specifically:
- Set Source to C4
- Use steps: `pitch: 0, 4, 7`

Or use `pitch` node with `mode: 'set'` before the sequencer.
