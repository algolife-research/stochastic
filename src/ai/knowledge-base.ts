export interface KnowledgeSnippet {
  id: string;
  keywords: string[];
  content: string;
  category: 'guide' | 'pattern' | 'technical' | 'theory';
}

/**
 * Knowledge base for AI context injection.
 * This allows us to provide relevant documentation without overloading the prompt.
 */
export const KNOWLEDGE_BASE: KnowledgeSnippet[] = [
  {
    id: 'design-patterns-generative',
    keywords: ['generative', 'random', 'probability', 'evolve', 'evolving', 'auto'],
    category: 'pattern',
    content: `
## Generative Design Patterns

1. **Probabilistic Gate**: Source -> Gate (probability=0.5) -> Speaker. Creates random rhythms.
2. **Branching Path**: Source -> Splitter (random) -> [Path A, Path B].
3. **Self-Modulation**: LFO -> Modulator -> (Target Node).
4. **Feedback Loop**: Node A -> Node B -> Node A (use with caution, add Delay).
    `
  },
  {
    id: 'design-patterns-rhythmic',
    keywords: ['rhythm', 'beat', 'drum', 'percussion', 'polymetric', 'syncopation'],
    category: 'pattern',
    content: `
## Rhythmic Patterns

1. **Polymetric**: Two Sources with different intervals (e.g., 1.0 and 0.75) feeding into the same or different speakers.
2. **Euclidean-like**: Source (fast interval) -> Gate (pattern mode) -> Speaker.
3. **Phasing**: Two identical loops with slightly different loop lengths or delay times.
    `
  },
  {
    id: 'design-patterns-ambient',
    keywords: ['ambient', 'pad', 'texture', 'drone', 'relaxing', 'calm'],
    category: 'pattern',
    content: `
## Ambient Textures

1. **Drone**: Source (high interval) -> Oscillator (Sine/Triangle) -> Reverb (high wetness).
2. **Swell**: Source -> Attack/Decay Envelope -> Filter (Lowpass).
3. **Granular-ish**: Fast Source -> Short Envelope -> Random Pitch -> Delay.
    `
  },
  {
    id: 'technical-timing',
    keywords: ['timing', 'sync', 'tempo', 'bpm', 'delay', 'phase'],
    category: 'technical',
    content: `
## Timing & Synchronization

- **Intervals**: Source intervals are in beats (1.0 = 1 beat).
- **Delays**: Delay times are in beats.
- **Phase**: LFOs and Oscillators have phase controls to offset their cycles.
- **Global BPM**: Changes the speed of the entire system.
    `
  },
  {
    id: 'advanced-logic-tunnels',
    keywords: ['turing', 'logic', 'complex', 'tunnel', 'teleport', 'feedback', 'state', 'machine'],
    category: 'technical',
    content: `
## Advanced Logic & Structure

1. **Tunnels (Sub-patches)**: Use 'tunnel' nodes to encapsulate complex chains.
   - Props: \`tunnelName\`, \`subNodes\` (array of nodes inside).
   - Useful for: Creating reusable instruments or cleaning up the graph.

2. **Teleporters (Wireless)**: Use 'teleporter' nodes to send signals without wires.
   - Pair an 'isEntry: true' node with an 'isEntry: false' node sharing the same 'channel'.
   - Useful for: Spanning large distances or creating "bus" channels (e.g., "ReverbSend").

3. **Feedback Loops**: Connect a node's output back to an earlier input.
   - **CRITICAL**: Always place a 'delay' node in the feedback path to prevent infinite instant loops.
   - Pattern: Source -> Splitter -> [Path A: Speaker, Path B: Delay -> Splitter Input].

4. **State Machines**: Use 'gate' nodes controlled by LFOs or other signals to switch between different logic paths.
    `
  },
  {
    id: 'cinematic-composition',
    keywords: ['cinematic', 'dune', 'hans zimmer', 'epic', 'score', 'soundtrack', 'atmosphere', 'scene'],
    category: 'pattern',
    content: `
## Cinematic Composition Techniques

1. **Multi-Scene Structure**: Break the song into distinct sections (e.g., "Intro", "Build", "Climax").
   - Use 'enterTransition' and 'exitTransition' (fade/crossfade) for smooth changes.

2. **The "Wall of Sound"**:
   - **Split & Stack**: Source -> Splitter -> [Pitch -12, Pitch 0, Pitch +7] -> Oscillators.
   - **Detuning**: Use multiple oscillators with slightly different 'fine' pitch or 'phase'.
   - **Wide Stereo**: Pan duplicate chains hard left (-0.8) and hard right (0.8).

3. **Atmospheric Textures**:
   - **Noise Layers**: Source -> Gate (low prob) -> Oscillator (Pink/Brown Noise) -> Reverb.
   - **Slow Modulation**: LFOs with very low rates (0.01 - 0.05 Hz) controlling filter cutoffs or panning.
   - **Massive Reverb**: Speaker props: \`reverb: 0.8+\`, \`releaseTime: 2.0+\`.
    `
  },
  {
    id: 'drum-synthesis',
    keywords: ['drum', 'kick', 'snare', 'hat', 'percussion', 'synthesis', 'beat'],
    category: 'pattern',
    content: `
## Drum Synthesis Patterns

1. **Kick Drum**:
   - **Body**: Source -> Oscillator (Sine) -> Filter (Lowpass, high resonance/mod).
   - **Click**: Parallel path -> Oscillator (Square, very short decay) -> Mixer.
   - **Envelope**: Fast attack (0.001), short decay (0.3).

2. **Hi-Hats**:
   - **Source**: Oscillator (White/Pink Noise) -> Filter (Highpass).
   - **Closed**: Short decay (0.05).
   - **Open**: Longer decay (0.3).

3. **Snare**:
   - **Tone**: Oscillator (Triangle) -> Filter (Bandpass).
   - **Rattle**: Oscillator (White Noise) -> Filter (Highpass).
   - **Mix**: Combine Tone and Rattle.
    `
  },
  {
    id: 'oscillator-modes-guide',
    keywords: ['mode', 'additive', 'ring', 'fm', 'modulation', 'synthesis', 'bell', 'metallic', 'layer'],
    category: 'theory',
    content: `
## Oscillator Modes Explained

Oscillators have three modes that determine how they combine with the next oscillator in the chain:

### Mode: 'additive' (default)
**What it does**: Sums this oscillator's output with others.
**Sound**: Each oscillator adds its own harmonic content independently.
**Use for**: Rich layered sounds, pads, organs, standard synthesis.

\`\`\`
Example: Warm pad with harmonics
  osc1 (sine, ratio:1, mode:additive) 
+ osc2 (sine, ratio:2, mode:additive)  → Speaker
+ osc3 (sine, ratio:3, mode:additive)
Result: Organ-like sound with 1st, 2nd, 3rd harmonics
\`\`\`

### Mode: 'ring'
**What it does**: Multiplies this oscillator with the previous one.
**Sound**: Creates sum and difference frequencies → metallic, inharmonic tones.
**Use for**: Bells, robots, sci-fi effects, dissonant textures.

\`\`\`
Example: Metallic bell
  osc1 (sine, ratio:1, mode:additive)
× osc2 (sine, ratio:1.4, mode:ring)  → Speaker
Result: Frequencies at (1+1.4) and (1-1.4) → inharmonic bell tone
\`\`\`

### Mode: 'fm'
**What it does**: Modulates the NEXT oscillator's frequency at audio rate.
**Sound**: Creates complex sidebands → bells, e-pianos, basses, evolving timbres.
**Use for**: DX7-style sounds, bells, metallic basses, complex timbres.

\`\`\`
Example: FM Bell
  osc1 (sine, ratio:3.5, mode:fm, modulationIndex:5)  ← modulator (silent)
→ osc2 (sine, ratio:1, mode:additive)  → Speaker      ← carrier (audible)
Result: Bell-like sound with rich harmonics from FM sidebands
\`\`\`

### Quick Reference Table

| Mode | Combines With | Math | Sound Character | Classic Use |
|------|--------------|------|-----------------|-------------|
| additive | All previous | A + B | Warm, layered | Organs, pads |
| ring | Previous osc | A × B | Metallic, harsh | Robots, bells |
| fm | Next osc | sin(A + sin(B)*idx) | Complex, evolving | E-piano, bells |

### Key Parameters for FM Mode
- **modulationIndex** (0-10): Higher = more harmonics/brightness
- **feedback** (0-1): Self-modulation for grittier sounds
- **ratio**: Non-integer ratios (1.5, 3.5) = bells; Integer ratios (1, 2, 3) = musical

### Pro Tips
1. FM mode oscillators are SILENT - they only modulate the next oscillator
2. The last oscillator in an FM chain should be mode:additive (the "carrier")
3. Start with modulationIndex:2-3, increase for brighter/harsher sounds
4. For classic DX7 e-piano: modulator ratio:2, carrier ratio:1, index:2-3
    `
  },
  {
    id: 'filter-types-guide',
    keywords: ['filter', 'lowpass', 'highpass', 'bandpass', 'notch', 'cutoff', 'resonance', 'eq', 'frequency'],
    category: 'theory',
    content: `
## Filter Types Explained

Filters shape the frequency content of sound. Four types are available:

### Type: 'lowpass' (default)
**What it does**: Passes frequencies below cutoff, removes highs.
**Sound**: Warm, muffled, bass-heavy.
**Use for**: Warm pads, bass sounds, removing harshness.

\`\`\`
Example: Warm bass
osc (sawtooth) → filter (lowpass, cutoff:400, resonance:0.3) → speaker
Result: Rich bass without harsh highs
\`\`\`

### Type: 'highpass'
**What it does**: Passes frequencies above cutoff, removes lows.
**Sound**: Thin, airy, removes rumble.
**Use for**: Removing mud, thin textures, filtering bass from effects.

\`\`\`
Example: Thin lead
osc (sawtooth) → filter (highpass, cutoff:1000, resonance:0.2) → speaker
Result: Bright, thin sound without low-end
\`\`\`

### Type: 'bandpass'
**What it does**: Passes only frequencies around cutoff, removes both highs and lows.
**Sound**: Focused, telephone-like, narrow.
**Use for**: Vocal effects, focused synth stabs, isolating frequencies.

\`\`\`
Example: Radio voice effect
osc → filter (bandpass, cutoff:1500, resonance:0.5) → speaker
Result: Focused "telephone" quality
\`\`\`

### Type: 'notch'
**What it does**: Removes frequencies around cutoff, passes everything else.
**Sound**: Hollow, phaser-like.
**Use for**: Removing specific frequencies, creating phaser effects, EQ cuts.

\`\`\`
Example: Hollow texture
osc (sawtooth) → filter (notch, cutoff:1000, resonance:0.6) → speaker
Result: Hollowed-out sound with a "sweep" character
\`\`\`

### Quick Reference Table

| Type | Passes | Removes | Character | Common Use |
|------|--------|---------|-----------|------------|
| lowpass | Below cutoff | Highs | Warm, dark | Bass, pads |
| highpass | Above cutoff | Lows | Thin, bright | Leads, cleaning |
| bandpass | Around cutoff | Both ends | Focused, nasal | Effects, stabs |
| notch | Everything except cutoff | Narrow band | Hollow | Phaser, EQ |

### Key Parameters
- **cutoff** (20-20000 Hz): The pivot frequency
- **resonance** (0-1): Emphasis at cutoff; high values = self-oscillation

### Filter Envelope
Use attack/decay/mod to animate the filter over time:
\`\`\`
filter (lowpass, cutoff:200, resonance:0.4, attack:0.01, decay:0.3, mod:4000)
Result: Filter opens quickly from 200Hz to 4200Hz, then closes
\`\`\`

### Pro Tips
1. For classic acid bass: lowpass + high resonance (0.7+) + filter envelope
2. For drums: use highpass to remove rumble, bandpass for snare body
3. Stack filters: lowpass → notch can remove harshness precisely
4. Resonance adds emphasis - use sparingly to avoid piercing sounds
    `
  },
  {
    id: 'unison-detune-guide',
    keywords: ['unison', 'detune', 'thick', 'fat', 'supersaw', 'stereo', 'spread', 'chorus', 'wide'],
    category: 'theory',
    content: `
## Unison & Detune Explained

Unison creates multiple detuned copies of an oscillator for thick, chorus-like sounds.

### Parameters

**unison** (1-8): Number of oscillator voices
- 1 = single voice (default, thin)
- 2 = subtle doubling
- 4 = classic supersaw territory
- 8 = massive wall of sound

**detune** (0-50 cents): Pitch spread between voices
- 0 = no detuning (sounds like 1 voice)
- 10 = subtle chorus
- 20-30 = classic supersaw
- 50 = very wide, almost out of tune

**stereoSpread** (0-1): How voices are panned across stereo field
- 0 = all voices center (mono)
- 0.5 = moderate stereo width
- 1.0 = full stereo spread (voices hard panned)

### Classic Sounds

\`\`\`
Supersaw Lead:
osc (sawtooth, unison:6, detune:20, stereoSpread:0.8)
Result: Huge trance/EDM lead sound
\`\`\`

\`\`\`
Subtle Chorus:
osc (sine, unison:2, detune:8, stereoSpread:0.5)
Result: Slightly thickened, animated sine
\`\`\`

\`\`\`
Massive Pad:
osc (sawtooth, unison:8, detune:30, stereoSpread:1.0) → filter (lowpass)
Result: Massive, wide pad sound
\`\`\`

### How It Works
- Each unison voice is slightly detuned from center pitch
- Voices are spread evenly: [-detune, ..., 0, ..., +detune]
- stereoSpread pans each voice: left voices pan left, right voices pan right

### Pro Tips
1. More unison = more CPU, use sparingly
2. Combine with lowpass filter for controlled thickness
3. Square waves with unison = PWM-like movement
4. High stereoSpread can sound thin in mono - check your mix
5. Detune affects perceived pitch center slightly at high values
    `
  },
  {
    id: 'noise-types-guide',
    keywords: ['noise', 'white', 'pink', 'brown', 'texture', 'hi-hat', 'snare', 'hiss', 'rumble'],
    category: 'theory',
    content: `
## Noise Types Explained

Noise generators produce random signals with different frequency characteristics.

### Type: 'white'
**Spectrum**: Equal energy at all frequencies.
**Sound**: Bright, hissy, harsh.
**Use for**: Hi-hats, cymbals, static effects, bright textures.

\`\`\`
Hi-hat pattern:
osc (white, decay:0.08) → filter (highpass, cutoff:8000) → speaker
Result: Crisp hi-hat sound
\`\`\`

### Type: 'pink'
**Spectrum**: -3dB/octave (less highs, natural balance).
**Sound**: Warmer, more natural, "analog" character.
**Use for**: Snare rattles, natural textures, wind effects, testing.

\`\`\`
Snare rattle:
osc (pink, decay:0.2) → filter (bandpass, cutoff:2000) → speaker
Result: Natural snare character
\`\`\`

### Type: 'brown' (Brownian/Red)
**Spectrum**: -6dB/octave (dominated by lows).
**Sound**: Deep rumble, thunder, ocean waves.
**Use for**: Thunder, explosions, sub-textures, ambient rumble.

\`\`\`
Ambient rumble:
osc (brown, attack:0.5, decay:3) → filter (lowpass, cutoff:500) → speaker
Result: Deep, evolving texture
\`\`\`

### Quick Reference Table

| Type | Spectrum | Character | Classic Use |
|------|----------|-----------|-------------|
| white | Flat | Bright, harsh | Hi-hats, static |
| pink | -3dB/oct | Natural, warm | Snares, wind |
| brown | -6dB/oct | Rumbling, deep | Thunder, sub |

### Pro Tips
1. Always filter noise - raw noise is harsh
2. Use short envelopes for percussion, long for textures
3. Layer noise with tonal sources for realistic drums
4. Pink noise is perceptually "flat" to human ears
5. Brown noise makes excellent ambient backgrounds
    `
  }
];

/**
 * Retrieve relevant knowledge snippets based on a user query.
 * Uses simple keyword matching.
 */
export function getRelevantKnowledge(query: string, maxSnippets: number = 2): string {
  const lowerQuery = query.toLowerCase();
  
  // Score snippets based on keyword matches
  const scored = KNOWLEDGE_BASE.map(snippet => {
    let score = 0;
    for (const keyword of snippet.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    return { snippet, score };
  });
  
  // Filter and sort
  const relevant = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSnippets)
    .map(item => item.snippet.content);
    
  if (relevant.length === 0) return '';
  
  return `\n=== RELEVANT GUIDELINES ===\n${relevant.join('\n')}\n`;
}
