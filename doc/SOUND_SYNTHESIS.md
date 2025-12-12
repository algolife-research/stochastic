# Stochastic Sound Synthesis Architecture

## Current Synthesis Capabilities

### Synthesis Type: **Additive/Subtractive Hybrid**

Stochastic uses a **multi-layer additive synthesis** foundation with **subtractive filtering**. It is **NOT FM synthesis** in the traditional sense.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        VOICE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                        │
│  │ Layer 1 │ + │ Layer 2 │ + │ Layer N │  ← Additive mixing     │
│  │ (osc)   │   │ (osc)   │   │ (osc)   │                        │
│  └────┬────┘   └────┬────┘   └────┬────┘                        │
│       │             │             │                              │
│       └─────────────┼─────────────┘                              │
│                     ▼                                            │
│              ┌──────────────┐                                    │
│              │   ENVELOPE   │  ← AHDR (Attack/Hold/Decay/Release)│
│              │   (per layer)│                                    │
│              └──────┬───────┘                                    │
│                     ▼                                            │
│              ┌──────────────┐                                    │
│              │    FILTER    │  ← Biquad lowpass (subtractive)   │
│              │ (+ envelope) │                                    │
│              └──────┬───────┘                                    │
│                     ▼                                            │
│              ┌──────────────┐                                    │
│              │   VIBRATO    │  ← LFO pitch modulation           │
│              └──────┬───────┘                                    │
│                     ▼                                            │
│              ┌──────────────┐                                    │
│              │    PANNING   │  ← Stereo placement               │
│              └──────────────┘                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Oscillator Types

| Waveform | Character | Use Case |
|----------|-----------|----------|
| **Sine** | Pure, clean | Sub-bass, pure tones, FM carrier |
| **Square** | Hollow, reedy | Leads, chiptune, woodwinds |
| **Sawtooth** | Bright, rich | Pads, brass, leads |
| **Triangle** | Soft, flutey | Soft leads, mellower sounds |
| **White Noise** | Full spectrum | Hi-hats, snares, textures |
| **Pink Noise** | Bass-heavy | Ocean, wind, natural sounds |
| **Brown Noise** | Very bassy | Thunder, rumbles |

### Current Processing Chain

1. **Oscillators** → Multiple layers summed additively
2. **Per-layer envelopes** → Individual AHDR per oscillator
3. **Main envelope** → Master AHDR controls overall amplitude
4. **Filter** → Biquad lowpass with resonance (Q from timbre)
5. **Filter envelope** → Dynamic cutoff modulation
6. **Vibrato** → LFO-based pitch modulation with delay
7. **Panning** → Equal-power stereo panning

---

## What We're Missing (Future Enhancements)

### 1. **FM Synthesis** ⭐ High Impact

True FM would allow one oscillator to modulate another's frequency.

```
┌──────────────┐     frequency modulation      ┌──────────────┐
│  MODULATOR   │ ──────────────────────────▶   │   CARRIER    │ → Output
│  (operator)  │                               │  (operator)  │
└──────────────┘                               └──────────────┘
```

**Implementation approach:**
- Add `modulationIndex` to oscillator layers
- Allow layers to modulate other layers' frequency
- Classic 2-op, 4-op, or 6-op configurations
- **Effort:** Medium-High

### 2. **Wavetable Synthesis** ⭐ High Impact

Instead of basic waveforms, use pre-computed wavetables that can be morphed.

**Benefits:**
- Complex evolving timbres
- Lower CPU than many additive layers
- Popular in modern synths (Serum, Vital)

**Implementation:**
- Add wavetable buffer loading
- Interpolation between wavetable positions
- Morph parameter to blend between frames
- **Effort:** Medium

### 3. **Granular Synthesis** ⭐ Medium Impact

Chop audio into tiny grains and re-assemble for textures.

**Use cases:**
- Ambient textures
- Time-stretching
- Glitch effects
- Pad creation from samples

**Implementation:**
- Grain buffer system
- Grain size, density, pitch, position params
- Random or sequenced grain triggering
- **Effort:** High

### 4. **Physical Modeling** ⭐ Medium Impact

Simulate physical vibrating systems (strings, tubes, membranes).

**Techniques:**
- Karplus-Strong (plucked strings)
- Waveguide synthesis (tubes, flutes)
- Modal synthesis (bells, percussion)

**Implementation:**
- Add delay lines for waveguide
- Karplus-Strong is relatively simple
- **Effort:** Medium (Karplus-Strong) to High (full waveguide)

### 5. **Ring Modulation**

Multiply two signals together for metallic, inharmonic tones.

```
Signal A × Signal B = Ring Mod Output
```

**Implementation:**
- Allow oscillator layers to multiply instead of add
- Great for bell-like and robotic sounds
- **Effort:** Low

### 6. **Phase Distortion**

Warp the phase of an oscillator for Casio CZ-style sounds.

**Implementation:**
- Non-linear phase mapping function
- Dynamic phase warping with envelope
- **Effort:** Low

### 7. **Better Filters**

Currently: Single biquad lowpass

**Add:**
- Highpass, bandpass, notch
- Filter type selection
- Multi-mode filter (morphable LP→BP→HP)
- Ladder filter emulation (Moog-style)
- Comb filter (for flanging/resonance)
- **Effort:** Low-Medium

### 8. **Effects**

Currently missing post-processing:

| Effect | Use | Effort |
|--------|-----|--------|
| **Reverb** | Space, depth | Medium |
| **Delay** | Echo, rhythm | Low |
| **Chorus** | Thickness | Low |
| **Distortion** | Grit, warmth | Low |
| **Bitcrusher** | Lo-fi, retro | Low |
| **Compressor** | Dynamics | Medium |

### 9. **Unison/Detuning**

Stack multiple detuned copies of oscillators.

**Implementation:**
- Unison count (1-8 voices)
- Detune spread
- Stereo spread
- **Effort:** Low-Medium

### 10. **Proper Noise Types**

Current pink/brown noise are placeholders.

**Implementation:**
- Voss-McCartney algorithm for pink noise
- Brownian random walk for brown noise
- **Effort:** Low

---

## Priority Roadmap

### Phase 1: Quick Wins 🚀
1. ✅ More filter types (HP, BP, notch) - Implemented with type: lowpass|highpass|bandpass|notch, resonance control
2. ✅ Ring modulation mode - Implemented via oscillator mode: 'ring'
3. ✅ FM synthesis - Implemented via oscillator mode: 'fm' with modulationIndex and feedback
4. ✅ Unison/detune - Implemented with unison (1-8), detune (cents), stereoSpread
5. ✅ Proper pink/brown noise - Paul Kellet pink noise, Brownian brown noise
6. Basic delay effect - TODO

### Phase 2: Major Features 🎹
1. ⭐ Wavetable synthesis
2. ⭐ Reverb improvements  
3. ⭐ Distortion/saturation

### Phase 3: Advanced 🎛️
1. Granular synthesis node
2. Karplus-Strong string model
3. Full effects chain
4. Sample playback node

---

## Technical Considerations

### AudioWorklet Constraints
- Runs on separate thread (good for performance)
- No access to DOM or main thread state
- Must be self-contained
- 128 sample buffer processing

### CPU Budget
- Current: ~5-10% for typical patches
- Each voice: ~0.5% CPU
- Goal: Support 32+ voices
- FM would add ~20% overhead per operator

### Memory
- Wavetables: ~1MB for comprehensive set
- Granular buffers: ~10MB per grain source
- Keep total under 50MB for web

---

## Comparison with Other Synths

| Feature | Stochastic | Vital | Serum | Dexed (FM) |
|---------|--------|-------|-------|------------|
| Additive | ✅ Multi-layer | ✅ | ✅ | ❌ |
| Subtractive | ✅ Basic | ✅ Advanced | ✅ Advanced | ❌ |
| FM | ❌ | ✅ | ✅ | ✅ (DX7) |
| Wavetable | ❌ | ✅ | ✅ | ❌ |
| Granular | ❌ | ❌ | ❌ | ❌ |
| Physical | ❌ | ❌ | ❌ | ❌ |
| Graph-based | ✅ | ❌ | ❌ | ❌ |

**Stochastic's unique advantage:** Graph-based generative sequencing + synthesis in one tool.

---

## Conclusion

Stochastic is currently an **additive-subtractive hybrid synthesizer** with:
- ✅ Multi-layer oscillators
- ✅ AHDR envelopes
- ✅ Biquad lowpass filter
- ✅ Vibrato/pitch modulation
- ✅ Stereo panning

**Highest value additions:**
1. **FM synthesis** - Massive tonal palette expansion
2. **Wavetable** - Modern, evolving sounds
3. **Better filters** - Low effort, high impact
4. **Effects** - Essential for polished sounds

The graph-based architecture makes Stochastic uniquely suited for generative and experimental music—focus synthesis development on features that complement this strength.

---

## Implementation Plan

### Data Model Integration Strategy

All synthesis features follow Stochastic's existing patterns:
1. **Nodes** process/transform `AudioPayload` as packets traverse the graph
2. **AudioPayload** carries all sound data to the `speaker` node
3. **AudioWorklet** renders the final sound from payload data

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   source    │ ──▶  │  processing │ ──▶  │   speaker   │
│  (trigger)  │      │   nodes     │      │  (render)   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                     Modify AudioPayload
                     (add layers, effects, etc.)
```

---

### Phase 1: Quick Wins

#### 1.1 More Filter Types

**Data Model Changes:**

```typescript
// src/core/types.ts - Update FilterProps
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface FilterProps {
  readonly type: FilterType;      // NEW
  readonly cutoff: Frequency;
  readonly resonance: number;     // NEW (rename from timbre)
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly mod: number;
}
```

**AudioPayload Changes:**
```typescript
// Add to AudioPayload
filterType?: FilterType;
filterResonance?: number;
```

**Worklet Changes:**
- Add `calculateFilterCoefficients(type, cutoff, Q)` function
- Switch biquad formula based on type

**Files to modify:**
- `src/core/types.ts` - FilterProps, AudioPayload
- `src/audio/worklet.ts` - `applyFilter()` method
- `src/io/compiler.ts` - processArrival for filter node
- `src/ui/property-panels/` - FilterPanel UI

**Effort:** 2-3 hours

---

#### 1.2 Unison/Detune

**Data Model Changes:**

```typescript
// src/core/types.ts - Update OscillatorProps
export interface OscillatorProps extends EnvelopedLayer {
  readonly wave: WaveType;
  readonly ratio: number;
  readonly unison: number;        // NEW: 1-8 voices
  readonly detune: number;        // NEW: cents spread
  readonly stereoSpread: number;  // NEW: 0-1 stereo width
}
```

**AudioPayload Changes:**
```typescript
// Update WaveLayer
export interface WaveLayer {
  readonly wave: WaveOrNoiseType;
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly gain: number;
  readonly ratio?: number;
  readonly unison?: number;       // NEW
  readonly detune?: number;       // NEW
  readonly stereoSpread?: number; // NEW
}
```

**Worklet Changes:**
- When rendering layer, spawn N detuned copies
- Apply stereo spread across copies
- Average amplitude to maintain volume

**Files to modify:**
- `src/core/types.ts` - OscillatorProps, WaveLayer
- `src/audio/worklet.ts` - layer processing loop
- `src/io/compiler.ts` - oscillator node processing
- `src/ui/property-panels/OscillatorPanel.tsx`

**Effort:** 3-4 hours

---

#### 1.3 Ring Modulation

**Data Model Changes:**

```typescript
// src/core/types.ts - Update OscillatorProps
export interface OscillatorProps extends EnvelopedLayer {
  readonly wave: WaveType;
  readonly ratio: number;
  readonly mode: 'additive' | 'ring';  // NEW: layer blend mode
  // ... existing props
}
```

**AudioPayload Changes:**
```typescript
export interface WaveLayer {
  // ... existing
  readonly mode?: 'additive' | 'ring';  // NEW
}
```

**Worklet Changes:**
```typescript
// In layer processing
if (layer.mode === 'ring') {
  sample *= previousLayerSample;  // Multiply instead of add
} else {
  sample += layerSample;
}
```

**Files to modify:**
- `src/core/types.ts`
- `src/audio/worklet.ts`
- `src/io/compiler.ts`
- `src/ui/property-panels/OscillatorPanel.tsx`

**Effort:** 1-2 hours

---

#### 1.4 Proper Pink/Brown Noise

**Worklet-only change:**

```typescript
// src/audio/worklet.ts
class StochasticSynthProcessor {
  // Add state for filtered noise
  private pinkNoiseState = [0, 0, 0, 0, 0, 0, 0];
  private brownNoiseState = 0;
  
  private generatePinkNoise(): number {
    // Voss-McCartney algorithm
    const white = Math.random() * 2 - 1;
    // ... proper pink noise implementation
  }
  
  private generateBrownNoise(): number {
    // Brownian motion
    this.brownNoiseState += (Math.random() * 2 - 1) * 0.02;
    this.brownNoiseState = Math.max(-1, Math.min(1, this.brownNoiseState));
    return this.brownNoiseState;
  }
}
```

**Files to modify:**
- `src/audio/worklet.ts` only

**Effort:** 1 hour

---

### Phase 2: FM Synthesis (Unified Oscillator Approach)

#### 2.1 Key Insight: LFO vs FM

LFO and FM are mathematically the **same operation** at different speeds:

| Aspect | LFO (current `modulator` node) | FM Synthesis |
|--------|--------------------------------|--------------|
| **Modulator rate** | Sub-audio (0.1-20 Hz) | Audio rate (20Hz+) |
| **Perceived effect** | Pitch wobble (vibrato) | New harmonics/timbre |
| **Math** | `freq + lfo * depth` | `sin(carrier + sin(mod) * index)` |

When modulation crosses into audio rate (~20Hz+), the ear perceives **new frequencies** (sidebands) rather than pitch movement.

#### 2.2 Unified Design: Extend Existing `oscillator` Node

Instead of a new `fm_operator` node, extend the existing oscillator with a **mode** property:

**Data Model Changes:**

```typescript
// src/core/types.ts - Update OscillatorProps
export type OscillatorMode = 'additive' | 'ring' | 'fm';

export interface OscillatorProps extends EnvelopedLayer {
  readonly wave: WaveType;
  readonly ratio: number;
  readonly mix: number;               // Output level (existing)
  
  // NEW: Layer blend mode
  readonly mode: OscillatorMode;      // Default: 'additive'
  
  // NEW: FM-specific (only used when mode = 'fm')
  readonly modulationIndex?: number;  // FM depth (0-10), default 2
  readonly feedback?: number;         // Self-modulation (0-1), default 0
  
  // Existing envelope props...
  readonly attack: Seconds;
  readonly decay: Seconds;
}
```

**AudioPayload Changes:**
```typescript
// Update WaveLayer to carry mode info
export interface WaveLayer {
  readonly wave: WaveOrNoiseType;
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly gain: number;
  readonly ratio?: number;
  
  // NEW: Blend mode
  readonly mode?: OscillatorMode;           // Default: 'additive'
  readonly modulationIndex?: number;        // FM depth
  readonly feedback?: number;               // Self-modulation
}
```

**Graph Behavior:**
```
┌─────────────────────────────────────────────────────────────────┐
│                     UNIFIED OSCILLATOR MODES                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MODE: 'additive' (default)                                     │
│  ┌─────────┐   ┌─────────┐                                      │
│  │  osc 1  │ + │  osc 2  │  → Sum outputs                       │
│  └─────────┘   └─────────┘                                      │
│                                                                  │
│  MODE: 'ring'                                                   │
│  ┌─────────┐   ┌─────────┐                                      │
│  │  osc 1  │ × │  osc 2  │  → Multiply outputs                  │
│  └─────────┘   └─────────┘                                      │
│                                                                  │
│  MODE: 'fm'                                                     │
│  ┌─────────┐      ┌─────────┐                                   │
│  │  osc 1  │ ──FM──▶│  osc 2  │  → osc1 modulates osc2's freq   │
│  │(modulator)│      │(carrier)│                                   │
│  └─────────┘      └─────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Processing Order (in `waves[]` array):**
- Layers are processed in order
- `mode: 'fm'` layer modulates the **next** layer's frequency
- `mode: 'ring'` layer multiplies with **previous** layer's output
- `mode: 'additive'` layer sums with accumulated output

**Worklet Changes:**
```typescript
// src/audio/worklet.ts - Updated layer processing

private renderVoiceLayers(voice: Voice): number {
  const layers = voice.waves;
  if (!layers?.length) return this.oscillate(voice.wave, voice.phase);
  
  let output = 0;
  let fmModulation = 0;  // Accumulated FM modulation
  let prevSample = 0;    // For ring mod
  
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const freq = voice.freq * (layer.ratio ?? 1);
    const envelope = this.calculateLayerEnvelope(voice, layer);
    
    // Apply FM modulation from previous FM-mode layer
    const modulatedPhase = voice.layerPhases[i] + fmModulation;
    let sample = this.oscillate(layer.wave, modulatedPhase) * layer.gain * envelope;
    
    // Self-feedback (for FM mode)
    if (layer.mode === 'fm' && layer.feedback) {
      sample += this.lastSamples[i] * layer.feedback;
    }
    
    switch (layer.mode ?? 'additive') {
      case 'fm':
        // This layer modulates the NEXT layer
        fmModulation = sample * (layer.modulationIndex ?? 2);
        // Don't add to output - FM modulators are silent
        break;
        
      case 'ring':
        // Multiply with previous layer
        output = prevSample * sample;
        break;
        
      case 'additive':
      default:
        // Standard additive mixing
        fmModulation = 0;  // Reset FM after carrier
        output += sample;
        break;
    }
    
    prevSample = sample;
    this.lastSamples[i] = sample;
  }
  
  return output;
}
```

**Example Graph Configurations:**

```
Classic 2-op FM (e-piano, bells):
  source → osc(mode:fm, ratio:2) → osc(mode:additive, ratio:1) → speaker
           └── modulator ──────────┘     └── carrier ──────────┘

4-op FM Stack:
  source → osc(fm) → osc(fm) → osc(fm) → osc(additive) → speaker
           └─mod3───┘  └─mod2──┘  └─mod1──┘   └─carrier──┘

Parallel FM (two independent 2-op stacks):
  source ─┬→ osc(fm) → osc(additive) ─┬→ speaker
          └→ osc(fm) → osc(additive) ─┘

Ring + FM Hybrid:
  source → osc(fm) → osc(ring) → osc(additive) → speaker
```

**Files to modify:**
- `src/core/types.ts` - OscillatorProps (add mode, modulationIndex, feedback)
- `src/core/constants.ts` - DEFAULT_OSCILLATOR_PROPS update
- `src/audio/worklet.ts` - Layer processing with mode switching
- `src/io/compiler.ts` - Pass new props through to WaveLayer
- `src/ui/property-panels/OscillatorPanel.tsx` - Mode selector, FM controls
- `src/ai/prompts.ts` - Document new oscillator modes

**Effort:** 6-8 hours (simpler than new node type!)

---

#### 2.3 FM Presets (Node Templates)

Since FM uses existing oscillator nodes, presets are just node configurations:

```typescript
// src/data/synthesis-presets.ts
export const SYNTHESIS_PRESETS = {
  'fm_bell': {
    nodes: [
      { type: 'oscillator', props: { wave: 'sine', ratio: 3.5, mode: 'fm', modulationIndex: 5, attack: 0.001, decay: 1.5, mix: 0.5 }},
      { type: 'oscillator', props: { wave: 'sine', ratio: 1, mode: 'additive', attack: 0.001, decay: 3, mix: 1 }},
    ]
  },
  'fm_epiano': {
    nodes: [
      { type: 'oscillator', props: { wave: 'sine', ratio: 2, mode: 'fm', modulationIndex: 2.5, attack: 0.01, decay: 0.8, mix: 0.8 }},
      { type: 'oscillator', props: { wave: 'sine', ratio: 1, mode: 'additive', attack: 0.01, decay: 1.5, mix: 1 }},
    ]
  },
  'fm_bass': {
    nodes: [
      { type: 'oscillator', props: { wave: 'sine', ratio: 1, mode: 'fm', modulationIndex: 3, feedback: 0.3, attack: 0.001, decay: 0.3, mix: 1 }},
      { type: 'oscillator', props: { wave: 'sine', ratio: 0.5, mode: 'additive', attack: 0.001, decay: 0.5, mix: 1 }},
    ]
  },
};
```

#### 2.4 Benefits of Unified Approach

| Aspect | Separate `fm_operator` | Unified `oscillator` |
|--------|------------------------|----------------------|
| New node type | ✅ Required | ❌ Not needed |
| Learning curve | Higher (new concept) | Lower (extends existing) |
| Graph complexity | More nodes | Fewer nodes |
| Flexibility | FM only | FM + Ring + Additive |
| Code changes | ~500 lines new | ~150 lines modified |
| AI integration | New prompts needed | Minor prompt updates |

---

### Phase 3: Effects System

#### 3.1 Architecture Decision

**Option A: Per-Speaker Effects**
- Each speaker node has effect params
- Simple, predictable
- ✅ Recommended for v1

**Option B: Effect Nodes**
- Dedicated `reverb`, `delay`, `distortion` nodes
- More flexible routing
- Higher complexity

#### 3.2 Per-Speaker Effects (Option A)

**Data Model Changes:**

```typescript
// src/core/types.ts - Update SpeakerProps
export interface SpeakerProps {
  readonly volume: number;
  readonly pan: number;
  
  // Effects
  readonly reverb: number;         // 0-1 (existing)
  readonly reverbSize: number;     // NEW: 0-1 room size
  readonly reverbDamping: number;  // NEW: 0-1 high freq damping
  
  readonly delay: number;          // NEW: 0-1 wet/dry
  readonly delayTime: number;      // NEW: seconds
  readonly delayFeedback: number;  // NEW: 0-1
  
  readonly distortion: number;     // NEW: 0-1 drive
  readonly distortionType: 'soft' | 'hard' | 'fuzz'; // NEW
  
  // Envelope
  readonly holdTime: Seconds;
  readonly releaseTime: Seconds;
}
```

**AudioPayload Changes:**
```typescript
// Add effect settings to carry to worklet
export interface AudioPayload {
  // ... existing
  
  effects?: {
    reverb?: { size: number; damping: number; wet: number };
    delay?: { time: number; feedback: number; wet: number };
    distortion?: { drive: number; type: string };
  };
}
```

**Worklet Changes:**
- Add `DelayLine` class for delay effect
- Add `Reverb` class (Freeverb algorithm)
- Add `Distortion` waveshaping functions
- Apply effects after voice mixing, before output

**Files to modify:**
- `src/core/types.ts` - SpeakerProps
- `src/audio/worklet.ts` - Effect processors
- `src/io/compiler.ts` - Map speaker props to payload
- `src/ui/property-panels/SpeakerPanel.tsx` - Effect controls

**Effort:** 12-16 hours (reverb is complex)

---

### Phase 4: Wavetable Synthesis

#### 4.1 New Node Type: `wavetable`

**Data Model Changes:**

```typescript
// src/core/types.ts

export type NodeType = 
  // ... existing
  | 'wavetable';

export interface WavetableProps extends EnvelopedLayer {
  readonly table: string;         // Preset name or 'custom'
  readonly position: number;      // 0-1 wavetable position
  readonly positionMod: number;   // LFO modulation depth
}

// Built-in wavetables
export type WavetablePreset = 
  | 'basic'      // Sine → Saw → Square → Pulse
  | 'analog'     // Classic analog shapes
  | 'digital'    // Digital/FM-like
  | 'vocal'      // Formant-like
  | 'texture';   // Noise/texture based
```

**Worklet Changes:**
```typescript
// Pre-computed wavetables (loaded on init)
const WAVETABLES: Map<string, Float32Array[]> = new Map();

// Wavetable oscillator
private wavetableOscillate(
  table: string, 
  position: number, 
  phase: number
): number {
  const frames = WAVETABLES.get(table);
  if (!frames) return Math.sin(phase);
  
  // Interpolate between frames
  const frameIndex = position * (frames.length - 1);
  const frame1 = frames[Math.floor(frameIndex)];
  const frame2 = frames[Math.ceil(frameIndex)];
  const blend = frameIndex % 1;
  
  // Read from wavetable with interpolation
  const sampleIndex = (phase / (2 * Math.PI)) * frame1.length;
  // ... interpolation logic
}
```

**Files to modify:**
- `src/core/types.ts` - WavetableProps
- `src/audio/worklet.ts` - Wavetable rendering
- `src/audio/wavetables.ts` (new) - Wavetable generation
- `src/io/compiler.ts` - wavetable node
- `src/ui/property-panels/WavetablePanel.tsx` (new)

**Effort:** 10-14 hours

---

### Implementation Order

```
Week 1: Quick Wins + FM Foundation
├── Day 1-2: More filter types
├── Day 3: Oscillator mode property (additive/ring/fm)
├── Day 4: FM worklet implementation
└── Day 5: Unison/detune

Week 2: Effects + Polish
├── Day 1-2: Delay effect
├── Day 3-4: Distortion
└── Day 5: Proper pink/brown noise

Week 3: Advanced Synthesis
├── Day 1-2: Basic reverb (Schroeder)
├── Day 3-4: Full reverb (Freeverb)
└── Day 5: Testing + bug fixes

Week 4: Wavetable (Optional)
├── Day 1-3: Wavetable basics
└── Day 4-5: Presets + documentation
```

---

### Testing Strategy

1. **Unit tests** for worklet algorithms (run in Node with mock AudioWorkletProcessor)
2. **Visual tests** - Oscilloscope view for waveform verification
3. **Audio tests** - A/B comparison with reference synths
4. **Integration tests** - Full graph → audio pipeline

### Performance Targets

| Feature | CPU Budget | Notes |
|---------|------------|-------|
| Base voice | 0.3% | Current |
| + FM (4-op) | 0.8% | 4x more oscillators |
| + Unison (4x) | 0.6% | Per voice |
| + Effects | 2% | Shared, not per-voice |
| **Total (32 voices)** | <40% | Target |

---

### AI Integration

Update `src/ai/prompts.ts` with updated oscillator documentation:

```typescript
{
  type: 'oscillator',
  name: 'Oscillator',
  description: 'Sound generator with multiple blend modes. Chain oscillators for FM synthesis.',
  props: [
    { name: 'wave', type: 'WaveType', description: 'Waveform shape', default: 'sine' },
    { name: 'ratio', type: 'number', description: 'Frequency ratio (1 = fundamental)', default: 1 },
    { name: 'mix', type: 'number', description: 'Output level (0-1)', default: 1 },
    { name: 'mode', type: 'OscillatorMode', description: 'additive (sum), ring (multiply), fm (modulate next)', default: 'additive' },
    { name: 'modulationIndex', type: 'number', description: 'FM depth (0-10, only for fm mode)', default: 2 },
    { name: 'feedback', type: 'number', description: 'Self-modulation (0-1, only for fm mode)', default: 0 },
    { name: 'attack', type: 'number', description: 'Envelope attack time', default: 0.01 },
    { name: 'decay', type: 'number', description: 'Envelope decay time', default: 0.5 },
  ],
  examples: [
    'For FM bell: osc(mode:fm, ratio:3.5, modulationIndex:5) → osc(mode:additive, ratio:1)',
    'For ring mod: osc(mode:ring) multiplies with previous oscillator output',
  ]
},
```

Example AI prompts to support:
- "Create an FM bell sound" → Two oscillators with mode:fm → mode:additive
- "Make a DX7-style electric piano" → FM chain with ratio:2 modulating ratio:1
- "Add ring modulation for metallic sound" → Set mode:ring on second oscillator
- "Create a thick unison pad" → Oscillator with unison:4, detune:15
