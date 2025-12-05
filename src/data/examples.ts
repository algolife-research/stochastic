// Phonon v2 - Example Compositions

import type { NodeType } from '@core/types';

// ============================================================================
// EXAMPLE TYPE
// ============================================================================

export interface Example {
  name: string;
  description: string;
  bpm: number;
  nodes: Array<{
    id: string;
    type: NodeType;
    x: number;
    y: number;
    props: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    timingMode?: 'physical' | 'fixed';
    durationBeats?: number;
    targetParam?: string;
  }>;
}

// ============================================================================
// TUTORIAL EXAMPLES
// ============================================================================

export const EXAMPLES: Record<string, Example> = {
  // Tutorial 1: Basic sound
  tut_01_first_sound: {
    name: "Tutorial 1: First Sound",
    description: "A Source emits packets, a Speaker plays them. Press Play to hear it!",
    bpm: 120,
    nodes: [
      { id: "src", type: "source", x: 150, y: 300, props: { interval: 1, midiNote: 60, intensity: 0.7 } },
      { id: "spk", type: "speaker", x: 350, y: 300, props: { reverb: 0.3, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "spk" }
    ]
  },

  // Tutorial 2: Changing pitch
  tut_02_changing_pitch: {
    name: "Tutorial 2: Pitch Shifting",
    description: "A Pitch node shifts notes up or down. This one shifts up 7 semitones (a fifth).",
    bpm: 120,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 48, intensity: 0.6 } },
      { id: "p1", type: "pitch", x: 250, y: 300, props: { shift: 7 } },
      { id: "spk", type: "speaker", x: 400, y: 300, props: { reverb: 0.3, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "p1" },
      { id: "e2", from: "p1", to: "spk" }
    ]
  },

  // Tutorial 3: Shaping sound with polariser
  tut_03_shaping_sound: {
    name: "Tutorial 3: Shaping Sound",
    description: "A Polariser gives packets a waveform and envelope. Compare sine vs sawtooth!",
    bpm: 100,
    nodes: [
      { id: "src1", type: "source", x: 100, y: 200, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "pol1", type: "polariser", x: 250, y: 200, props: { wave: "sine", attack: 0.1, decay: 0.8 } },
      { id: "spk1", type: "speaker", x: 400, y: 200, props: { reverb: 0.4, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 100, y: 400, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "pol2", type: "polariser", x: 250, y: 400, props: { wave: "sawtooth", attack: 0.01, decay: 0.3 } },
      { id: "spk2", type: "speaker", x: 400, y: 400, props: { reverb: 0.2, pan: 0.5 } }
    ],
    edges: [
      { id: "e1", from: "src1", to: "pol1" }, { id: "e2", from: "pol1", to: "spk1" },
      { id: "e3", from: "src2", to: "pol2" }, { id: "e4", from: "pol2", to: "spk2" }
    ]
  },

  // Tutorial 4: Splitting paths for chords
  tut_04_splitting_paths: {
    name: "Tutorial 4: Chords",
    description: "Connect one source to multiple speakers with different pitch shifts for chords!",
    bpm: 90,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      
      { id: "pol1", type: "polariser", x: 250, y: 180, props: { wave: "sine", attack: 0.05, decay: 0.6 } },
      { id: "spk1", type: "speaker", x: 400, y: 180, props: { reverb: 0.5, pan: -0.5 } },
      
      { id: "p2", type: "pitch", x: 250, y: 300, props: { shift: 4 } },
      { id: "pol2", type: "polariser", x: 350, y: 300, props: { wave: "triangle", attack: 0.05, decay: 0.6 } },
      { id: "spk2", type: "speaker", x: 500, y: 300, props: { reverb: 0.5, pan: 0 } },
      
      { id: "p3", type: "pitch", x: 250, y: 420, props: { shift: 7 } },
      { id: "pol3", type: "polariser", x: 350, y: 420, props: { wave: "sine", attack: 0.05, decay: 0.6 } },
      { id: "spk3", type: "speaker", x: 500, y: 420, props: { reverb: 0.5, pan: 0.5 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol1" }, { id: "e1b", from: "pol1", to: "spk1" },
      { id: "e2", from: "src", to: "p2" }, { id: "e2b", from: "p2", to: "pol2" }, { id: "e2c", from: "pol2", to: "spk2" },
      { id: "e3", from: "src", to: "p3" }, { id: "e3b", from: "p3", to: "pol3" }, { id: "e3c", from: "pol3", to: "spk3" }
    ]
  },

  // Tutorial 5: Randomness with gates
  tut_05_randomness: {
    name: "Tutorial 5: Randomness",
    description: "A Gate randomly blocks packets. Set noteIndex to -1 for random pitches!",
    bpm: 100,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.5 } },
      { id: "gate", type: "gate", x: 220, y: 300, props: { prob: 0.6 } },
      { id: "pol", type: "polariser", x: 340, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.25 } },
      { id: "spk", type: "speaker", x: 460, y: 300, props: { reverb: 0.4, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "gate" },
      { id: "e2", from: "gate", to: "pol" },
      { id: "e3", from: "pol", to: "spk" }
    ]
  },

  // Tutorial 6: Delays for echoes
  tut_06_timing_delay: {
    name: "Tutorial 6: Delays",
    description: "A Delay holds packets before releasing them. Great for echoes and arpeggios!",
    bpm: 90,
    nodes: [
      { id: "src", type: "source", x: 80, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.6 } },
      
      { id: "pol1", type: "polariser", x: 220, y: 180, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk1", type: "speaker", x: 380, y: 180, props: { reverb: 0.3, pan: -0.4 } },
      
      { id: "d2", type: "delay", x: 200, y: 300, props: { delayTime: 1 } },
      { id: "pol2", type: "polariser", x: 320, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk2", type: "speaker", x: 460, y: 300, props: { reverb: 0.3, pan: 0 } },
      
      { id: "d3", type: "delay", x: 200, y: 420, props: { delayTime: 2 } },
      { id: "pol3", type: "polariser", x: 320, y: 420, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk3", type: "speaker", x: 460, y: 420, props: { reverb: 0.3, pan: 0.4 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol1" }, { id: "e1b", from: "pol1", to: "spk1" },
      { id: "e2", from: "src", to: "d2" }, { id: "e2b", from: "d2", to: "pol2" }, { id: "e2c", from: "pol2", to: "spk2" },
      { id: "e3", from: "src", to: "d3" }, { id: "e3b", from: "d3", to: "pol3" }, { id: "e3c", from: "pol3", to: "spk3" }
    ]
  },

  // Tutorial 7: Filters
  tut_07_filters: {
    name: "Tutorial 7: Filters",
    description: "A Filter removes frequencies. Low cutoff = darker sound. Add modulation for 'wah'!",
    bpm: 80,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
      { id: "pol", type: "polariser", x: 220, y: 300, props: { wave: "sawtooth", attack: 0.02, decay: 1.0 } },
      { id: "flt", type: "filter", x: 340, y: 300, props: { cutoff: 800, mod: 2000, attack: 0.01, decay: 0.4 } },
      { id: "spk", type: "speaker", x: 460, y: 300, props: { reverb: 0.4, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol" },
      { id: "e2", from: "pol", to: "flt" },
      { id: "e3", from: "flt", to: "spk" }
    ]
  },

  // Tutorial 8: Gain dynamics
  tut_08_gain_dynamics: {
    name: "Tutorial 8: Dynamics",
    description: "A Gain node controls volume. Values above 1 = louder, below 1 = quieter.",
    bpm: 100,
    nodes: [
      { id: "src", type: "source", x: 80, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.5 } },
      
      { id: "g1", type: "gain", x: 200, y: 180, props: { value: 0.3 } },
      { id: "pol1", type: "polariser", x: 320, y: 180, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk1", type: "speaker", x: 440, y: 180, props: { reverb: 0.3, pan: -0.3 } },
      
      { id: "pol2", type: "polariser", x: 250, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk2", type: "speaker", x: 400, y: 300, props: { reverb: 0.3, pan: 0 } },
      
      { id: "g3", type: "gain", x: 200, y: 420, props: { value: 1.5 } },
      { id: "pol3", type: "polariser", x: 320, y: 420, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk3", type: "speaker", x: 440, y: 420, props: { reverb: 0.3, pan: 0.3 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "g1" }, { id: "e1b", from: "g1", to: "pol1" }, { id: "e1c", from: "pol1", to: "spk1" },
      { id: "e2", from: "src", to: "pol2" }, { id: "e2b", from: "pol2", to: "spk2" },
      { id: "e3", from: "src", to: "g3" }, { id: "e3b", from: "g3", to: "pol3" }, { id: "e3c", from: "pol3", to: "spk3" }
    ]
  },

  // ============================================================================
  // DEMO COMPOSITIONS
  // ============================================================================

  // Demo: Generative Ambient
  demo_ambient: {
    name: "Demo: Generative Ambient",
    description: "A self-evolving ambient piece with random notes and delays.",
    bpm: 60,
    nodes: [
      { id: "src1", type: "source", x: 100, y: 200, props: { interval: 3, noteIndex: -1, intensity: 0.4 } },
      { id: "gate1", type: "gate", x: 220, y: 200, props: { prob: 0.5 } },
      { id: "pol1", type: "polariser", x: 340, y: 200, props: { wave: "sine", attack: 0.3, decay: 2.0 } },
      { id: "spk1", type: "speaker", x: 500, y: 200, props: { reverb: 0.7, pan: -0.3 } },
      
      { id: "src2", type: "source", x: 100, y: 350, props: { interval: 4, noteIndex: -1, intensity: 0.3 } },
      { id: "d1", type: "delay", x: 220, y: 350, props: { delayTime: 2 } },
      { id: "pol2", type: "polariser", x: 340, y: 350, props: { wave: "triangle", attack: 0.5, decay: 3.0 } },
      { id: "spk2", type: "speaker", x: 500, y: 350, props: { reverb: 0.8, pan: 0.3 } },
      
      { id: "src3", type: "source", x: 100, y: 500, props: { interval: 6, midiNote: 36, intensity: 0.5 } },
      { id: "pol3", type: "polariser", x: 250, y: 500, props: { wave: "sine", attack: 0.2, decay: 4.0 } },
      { id: "spk3", type: "speaker", x: 400, y: 500, props: { reverb: 0.6, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src1", to: "gate1" },
      { id: "e2", from: "gate1", to: "pol1" },
      { id: "e3", from: "pol1", to: "spk1" },
      { id: "e4", from: "src2", to: "d1" },
      { id: "e5", from: "d1", to: "pol2" },
      { id: "e6", from: "pol2", to: "spk2" },
      { id: "e7", from: "src3", to: "pol3" },
      { id: "e8", from: "pol3", to: "spk3" }
    ]
  },

  // Demo: Simple Melody
  demo_melody: {
    name: "Demo: Simple Melody",
    description: "A 4-note melody created by chaining speakers with pitch shifts.",
    bpm: 100,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "pol", type: "polariser", x: 160, y: 300, props: { wave: "triangle", attack: 0.02, decay: 0.3 } },
      { id: "spk1", type: "speaker", x: 280, y: 300, props: { reverb: 0.3, pan: -0.4 } },
      { id: "p1", type: "pitch", x: 400, y: 300, props: { shift: 4 } },
      { id: "spk2", type: "speaker", x: 520, y: 300, props: { reverb: 0.3, pan: -0.1 } },
      { id: "p2", type: "pitch", x: 640, y: 300, props: { shift: 3 } },
      { id: "spk3", type: "speaker", x: 760, y: 300, props: { reverb: 0.3, pan: 0.1 } },
      { id: "p3", type: "pitch", x: 880, y: 300, props: { shift: -2 } },
      { id: "spk4", type: "speaker", x: 1000, y: 300, props: { reverb: 0.4, pan: 0.4 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol" },
      { id: "e2", from: "pol", to: "spk1" },
      { id: "e3", from: "spk1", to: "p1" },
      { id: "e4", from: "p1", to: "spk2" },
      { id: "e5", from: "spk2", to: "p2" },
      { id: "e6", from: "p2", to: "spk3" },
      { id: "e7", from: "spk3", to: "p3" },
      { id: "e8", from: "p3", to: "spk4" }
    ]
  },

  // Demo: Filter Bass
  demo_filter_bass: {
    name: "Demo: Filter Bass",
    description: "A bass line with filter modulation for that classic 'wah' sound.",
    bpm: 80,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 0.5, midiNote: 36, intensity: 0.8 } },
      { id: "pol", type: "polariser", x: 250, y: 300, props: { wave: "sawtooth", attack: 0.01, decay: 0.5 } },
      { id: "flt", type: "filter", x: 400, y: 300, props: { cutoff: 400, mod: 2000, attack: 0.01, decay: 0.2 } },
      { id: "spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.2, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol" },
      { id: "e2", from: "pol", to: "flt" },
      { id: "e3", from: "flt", to: "spk" }
    ]
  },

  // Demo: Drum Pattern
  demo_drums: {
    name: "Demo: Drum Pattern",
    description: "A basic drum kit using different waveforms and pitches.",
    bpm: 110,
    nodes: [
      { id: "kick_src", type: "source", x: 60, y: 180, props: { interval: 2, midiNote: 36, intensity: 0.8 } },
      { id: "kick_pol", type: "polariser", x: 180, y: 180, props: { wave: "sine", attack: 0.01, decay: 0.25 } },
      { id: "kick_p", type: "pitch", x: 300, y: 180, props: { shift: -12 } },
      { id: "kick_out", type: "speaker", x: 420, y: 180, props: { reverb: 0.1, pan: 0 } },
      
      { id: "snare_src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "snare_del", type: "delay", x: 140, y: 300, props: { delayTime: 1 } },
      { id: "snare_pol", type: "polariser", x: 240, y: 300, props: { wave: "sawtooth", attack: 0.01, decay: 0.12 } },
      { id: "snare_p", type: "pitch", x: 340, y: 300, props: { shift: 12 } },
      { id: "snare_out", type: "speaker", x: 460, y: 300, props: { reverb: 0.35, pan: 0.1 } },
      
      { id: "hh_src", type: "source", x: 60, y: 420, props: { interval: 0.5, midiNote: 72, intensity: 0.3 } },
      { id: "hh_gate", type: "gate", x: 160, y: 420, props: { prob: 0.75 } },
      { id: "hh_pol", type: "polariser", x: 260, y: 420, props: { wave: "square", attack: 0.005, decay: 0.04 } },
      { id: "hh_p", type: "pitch", x: 360, y: 420, props: { shift: 24 } },
      { id: "hh_out", type: "speaker", x: 480, y: 420, props: { reverb: 0.15, pan: 0.4 } }
    ],
    edges: [
      { id: "e_k1", from: "kick_src", to: "kick_pol" }, { id: "e_k2", from: "kick_pol", to: "kick_p" }, { id: "e_k3", from: "kick_p", to: "kick_out" },
      { id: "e_s1", from: "snare_src", to: "snare_del" }, { id: "e_s2", from: "snare_del", to: "snare_pol" }, { id: "e_s3", from: "snare_pol", to: "snare_p" }, { id: "e_s4", from: "snare_p", to: "snare_out" },
      { id: "e_h1", from: "hh_src", to: "hh_gate" }, { id: "e_h2", from: "hh_gate", to: "hh_pol" }, { id: "e_h3", from: "hh_pol", to: "hh_p" }, { id: "e_h4", from: "hh_p", to: "hh_out" }
    ]
  },

  // Demo: Polyrhythm
  demo_polyrhythm: {
    name: "Demo: Polyrhythm",
    description: "Three independent rhythms at 4, 3, and 5 beats create shifting patterns.",
    bpm: 90,
    nodes: [
      { id: "src4", type: "source", x: 60, y: 180, props: { interval: 4, midiNote: 60, intensity: 0.6 } },
      { id: "pol4", type: "polariser", x: 180, y: 180, props: { wave: "sine", attack: 0.01, decay: 0.6 } },
      { id: "spk4", type: "speaker", x: 300, y: 180, props: { reverb: 0.4, pan: -0.5 } },
      
      { id: "src3", type: "source", x: 60, y: 300, props: { interval: 3, midiNote: 67, intensity: 0.6 } },
      { id: "pol3", type: "polariser", x: 180, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.4 } },
      { id: "spk3", type: "speaker", x: 300, y: 300, props: { reverb: 0.4, pan: 0 } },
      
      { id: "src5", type: "source", x: 60, y: 420, props: { interval: 5, midiNote: 55, intensity: 0.6 } },
      { id: "pol5", type: "polariser", x: 180, y: 420, props: { wave: "square", attack: 0.01, decay: 0.3 } },
      { id: "spk5", type: "speaker", x: 300, y: 420, props: { reverb: 0.4, pan: 0.5 } }
    ],
    edges: [
      { id: "e_4a", from: "src4", to: "pol4" }, { id: "e_4b", from: "pol4", to: "spk4" },
      { id: "e_3a", from: "src3", to: "pol3" }, { id: "e_3b", from: "pol3", to: "spk3" },
      { id: "e_5a", from: "src5", to: "pol5" }, { id: "e_5b", from: "pol5", to: "spk5" }
    ]
  },

  // Demo: First Song
  demo_first_song: {
    name: "Demo: First Song",
    description: "A complete piece combining bass, melody with randomness, and a beat.",
    bpm: 90,
    nodes: [
      { id: "bass_src", type: "source", x: 60, y: 150, props: { interval: 2, midiNote: 36, intensity: 0.8 } },
      { id: "bass_pol", type: "polariser", x: 180, y: 150, props: { wave: "sawtooth", attack: 0.02, decay: 0.5 } },
      { id: "bass_flt", type: "filter", x: 300, y: 150, props: { cutoff: 500, mod: 800, attack: 0.01, decay: 0.3 } },
      { id: "bass_spk", type: "speaker", x: 420, y: 150, props: { reverb: 0.15, pan: 0 } },
      
      { id: "mel_src", type: "source", x: 60, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.5 } },
      { id: "mel_gate", type: "gate", x: 160, y: 300, props: { prob: 0.5 } },
      { id: "mel_pol", type: "polariser", x: 260, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.2 } },
      { id: "mel_spk", type: "speaker", x: 380, y: 300, props: { reverb: 0.5, pan: 0.3 } },
      
      { id: "beat_src", type: "source", x: 60, y: 450, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
      { id: "beat_p", type: "pitch", x: 160, y: 450, props: { shift: -24 } },
      { id: "beat_pol", type: "polariser", x: 260, y: 450, props: { wave: "sine", attack: 0.005, decay: 0.15 } },
      { id: "beat_spk", type: "speaker", x: 380, y: 450, props: { reverb: 0.1, pan: 0 } }
    ],
    edges: [
      { id: "e_b1", from: "bass_src", to: "bass_pol" },
      { id: "e_b2", from: "bass_pol", to: "bass_flt" },
      { id: "e_b3", from: "bass_flt", to: "bass_spk" },
      { id: "e_m1", from: "mel_src", to: "mel_gate" },
      { id: "e_m2", from: "mel_gate", to: "mel_pol" },
      { id: "e_m3", from: "mel_pol", to: "mel_spk" },
      { id: "e_k1", from: "beat_src", to: "beat_p" },
      { id: "e_k2", from: "beat_p", to: "beat_pol" },
      { id: "e_k3", from: "beat_pol", to: "beat_spk" }
    ]
  },

  // Demo: Fixed Edge Timing
  demo_fixed_timing: {
    name: "Demo: Fixed Edge Timing",
    description: "Shows edge timing modes: physical (distance-based) vs fixed (beat-based) travel time.",
    bpm: 120,
    nodes: [
      { id: "src", type: "source", x: 100, y: 200, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      
      { id: "pol1", type: "polariser", x: 300, y: 200, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk1", type: "speaker", x: 500, y: 200, props: { reverb: 0.3, pan: -0.3 } },
      
      { id: "pol2", type: "polariser", x: 300, y: 350, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
      { id: "spk2", type: "speaker", x: 500, y: 350, props: { reverb: 0.3, pan: 0.3 } }
    ],
    edges: [
      // Physical timing - travels based on distance
      { id: "e1", from: "src", to: "pol1" },
      { id: "e2", from: "pol1", to: "spk1" },
      // Fixed timing - arrives exactly 1 beat later
      { id: "e3", from: "src", to: "pol2", timingMode: "fixed", durationBeats: 1 },
      { id: "e4", from: "pol2", to: "spk2" }
    ]
  },

  // Demo: Ambient Polymetric
  demo_polymetric: {
    name: "Demo: Polymetric Ambient",
    description: "Three independent loops of 5, 7, and 9 beats phase against each other.",
    bpm: 110,
    nodes: [
      { id: "src5", type: "source", x: 50, y: 150, props: { interval: 5, midiNote: 60, intensity: 0.6 } },
      { id: "pol5", type: "polariser", x: 200, y: 150, props: { wave: "sine", attack: 0.1, decay: 2.0 } },
      { id: "dly5", type: "delay", x: 350, y: 150, props: { delayTime: 0.5 } },
      { id: "spk5", type: "speaker", x: 500, y: 150, props: { reverb: 0.5, pan: -0.5 } },

      { id: "src7", type: "source", x: 50, y: 300, props: { interval: 7, midiNote: 64, intensity: 0.6 } },
      { id: "pol7", type: "polariser", x: 200, y: 300, props: { wave: "triangle", attack: 0.1, decay: 2.0 } },
      { id: "dly7", type: "delay", x: 350, y: 300, props: { delayTime: 0.75 } },
      { id: "spk7", type: "speaker", x: 500, y: 300, props: { reverb: 0.5, pan: 0 } },

      { id: "src9", type: "source", x: 50, y: 450, props: { interval: 9, midiNote: 67, intensity: 0.6 } },
      { id: "pol9", type: "polariser", x: 200, y: 450, props: { wave: "sine", attack: 0.1, decay: 2.0 } },
      { id: "dly9", type: "delay", x: 350, y: 450, props: { delayTime: 1.0 } },
      { id: "spk9", type: "speaker", x: 500, y: 450, props: { reverb: 0.5, pan: 0.5 } }
    ],
    edges: [
      { id: "e1", from: "src5", to: "pol5" }, { id: "e2", from: "pol5", to: "dly5" }, { id: "e3", from: "dly5", to: "spk5" },
      { id: "e4", from: "src7", to: "pol7" }, { id: "e5", from: "pol7", to: "dly7" }, { id: "e6", from: "dly7", to: "spk7" },
      { id: "e7", from: "src9", to: "pol9" }, { id: "e8", from: "pol9", to: "dly9" }, { id: "e9", from: "dly9", to: "spk9" }
    ]
  },

  // Demo: Sequential Melody
  demo_sequential_melody: {
    name: "Demo: Sequential Melody",
    description: "A scale pattern using chained speakers with pitch shifts - packets pass through each speaker.",
    bpm: 120,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.6 } },
      { id: "pol", type: "polariser", x: 140, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "e1", type: "speaker", x: 220, y: 300, props: { reverb: 0.3, pan: -0.5 } },
      { id: "p1", type: "pitch", x: 300, y: 300, props: { shift: 2 } },
      { id: "e2", type: "speaker", x: 380, y: 300, props: { reverb: 0.3, pan: -0.25 } },
      { id: "p2", type: "pitch", x: 460, y: 300, props: { shift: 2 } },
      { id: "e3", type: "speaker", x: 540, y: 300, props: { reverb: 0.3, pan: 0 } },
      { id: "p3", type: "pitch", x: 620, y: 300, props: { shift: 1 } },
      { id: "e4", type: "speaker", x: 700, y: 300, props: { reverb: 0.3, pan: 0.25 } },
      { id: "p4", type: "pitch", x: 780, y: 300, props: { shift: 2 } },
      { id: "e5", type: "speaker", x: 860, y: 300, props: { reverb: 0.5, pan: 0.5 } }
    ],
    edges: [
      { id: "e_1", from: "src", to: "pol" },
      { id: "e_2", from: "pol", to: "e1" },
      { id: "e_3", from: "e1", to: "p1" },
      { id: "e_4", from: "p1", to: "e2" },
      { id: "e_5", from: "e2", to: "p2" },
      { id: "e_6", from: "p2", to: "e3" },
      { id: "e_7", from: "e3", to: "p3" },
      { id: "e_8", from: "p3", to: "e4" },
      { id: "e_9", from: "e4", to: "p4" },
      { id: "e_10", from: "p4", to: "e5" }
    ]
  },

  // Demo: Canon
  demo_canon: {
    name: "Demo: Canon",
    description: "A 2-voice canon: the same melody plays in both voices, with the second voice delayed.",
    bpm: 100,
    nodes: [
      { id: "src", type: "source", x: 50, y: 300, props: { interval: 4, midiNote: 62, intensity: 0.6 } },
      { id: "pol", type: "polariser", x: 120, y: 300, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
      
      // Voice 1 - immediate
      { id: "v1_e1", type: "speaker", x: 220, y: 180, props: { reverb: 0.3, pan: -0.6 } },
      { id: "v1_p1", type: "pitch", x: 300, y: 180, props: { shift: 7 } },
      { id: "v1_e2", type: "speaker", x: 380, y: 180, props: { reverb: 0.3, pan: -0.6 } },
      { id: "v1_p2", type: "pitch", x: 460, y: 180, props: { shift: -4 } },
      { id: "v1_e3", type: "speaker", x: 540, y: 180, props: { reverb: 0.3, pan: -0.6 } },
      { id: "v1_p3", type: "pitch", x: 620, y: 180, props: { shift: -3 } },
      { id: "v1_e4", type: "speaker", x: 700, y: 180, props: { reverb: 0.4, pan: -0.6 } },
      
      // Voice 2 - delayed by 4 beats
      { id: "delay", type: "delay", x: 220, y: 420, props: { delayTime: 4 } },
      { id: "v2_e1", type: "speaker", x: 300, y: 420, props: { reverb: 0.3, pan: 0.6 } },
      { id: "v2_p1", type: "pitch", x: 380, y: 420, props: { shift: 7 } },
      { id: "v2_e2", type: "speaker", x: 460, y: 420, props: { reverb: 0.3, pan: 0.6 } },
      { id: "v2_p2", type: "pitch", x: 540, y: 420, props: { shift: -4 } },
      { id: "v2_e3", type: "speaker", x: 620, y: 420, props: { reverb: 0.3, pan: 0.6 } },
      { id: "v2_p3", type: "pitch", x: 700, y: 420, props: { shift: -3 } },
      { id: "v2_e4", type: "speaker", x: 780, y: 420, props: { reverb: 0.4, pan: 0.6 } }
    ],
    edges: [
      { id: "e_s", from: "src", to: "pol" },
      // Voice 1
      { id: "e1_1", from: "pol", to: "v1_e1" },
      { id: "e1_2", from: "v1_e1", to: "v1_p1" },
      { id: "e1_3", from: "v1_p1", to: "v1_e2" },
      { id: "e1_4", from: "v1_e2", to: "v1_p2" },
      { id: "e1_5", from: "v1_p2", to: "v1_e3" },
      { id: "e1_6", from: "v1_e3", to: "v1_p3" },
      { id: "e1_7", from: "v1_p3", to: "v1_e4" },
      // Voice 2
      { id: "e2_0", from: "pol", to: "delay" },
      { id: "e2_1", from: "delay", to: "v2_e1" },
      { id: "e2_2", from: "v2_e1", to: "v2_p1" },
      { id: "e2_3", from: "v2_p1", to: "v2_e2" },
      { id: "e2_4", from: "v2_e2", to: "v2_p2" },
      { id: "e2_5", from: "v2_p2", to: "v2_e3" },
      { id: "e2_6", from: "v2_e3", to: "v2_p3" },
      { id: "e2_7", from: "v2_p3", to: "v2_e4" }
    ]
  },

  // Demo: Fugue
  demo_fugue: {
    name: "Demo: Fugue",
    description: "A 2-voice fugue: voice 2 enters transposed up a fifth (7 semitones) after a delay.",
    bpm: 100,
    nodes: [
      { id: "src", type: "source", x: 50, y: 300, props: { interval: 4, midiNote: 62, intensity: 0.6 } },
      { id: "pol", type: "polariser", x: 120, y: 300, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
      
      // Voice 1 - subject
      { id: "v1_e1", type: "speaker", x: 220, y: 180, props: { reverb: 0.3, pan: -0.5 } },
      { id: "v1_p1", type: "pitch", x: 300, y: 180, props: { shift: 7 } },
      { id: "v1_e2", type: "speaker", x: 380, y: 180, props: { reverb: 0.3, pan: -0.5 } },
      { id: "v1_p2", type: "pitch", x: 460, y: 180, props: { shift: -4 } },
      { id: "v1_e3", type: "speaker", x: 540, y: 180, props: { reverb: 0.3, pan: -0.5 } },
      { id: "v1_p3", type: "pitch", x: 620, y: 180, props: { shift: -3 } },
      { id: "v1_e4", type: "speaker", x: 700, y: 180, props: { reverb: 0.4, pan: -0.5 } },
      
      // Voice 2 - answer (transposed up a fifth)
      { id: "delay", type: "delay", x: 180, y: 420, props: { delayTime: 4 } },
      { id: "trans", type: "pitch", x: 260, y: 420, props: { shift: 7 } },
      { id: "v2_e1", type: "speaker", x: 340, y: 420, props: { reverb: 0.3, pan: 0.5 } },
      { id: "v2_p1", type: "pitch", x: 420, y: 420, props: { shift: 7 } },
      { id: "v2_e2", type: "speaker", x: 500, y: 420, props: { reverb: 0.3, pan: 0.5 } },
      { id: "v2_p2", type: "pitch", x: 580, y: 420, props: { shift: -4 } },
      { id: "v2_e3", type: "speaker", x: 660, y: 420, props: { reverb: 0.3, pan: 0.5 } },
      { id: "v2_p3", type: "pitch", x: 740, y: 420, props: { shift: -3 } },
      { id: "v2_e4", type: "speaker", x: 820, y: 420, props: { reverb: 0.4, pan: 0.5 } }
    ],
    edges: [
      { id: "e_s", from: "src", to: "pol" },
      // Voice 1
      { id: "e1_1", from: "pol", to: "v1_e1" },
      { id: "e1_2", from: "v1_e1", to: "v1_p1" },
      { id: "e1_3", from: "v1_p1", to: "v1_e2" },
      { id: "e1_4", from: "v1_e2", to: "v1_p2" },
      { id: "e1_5", from: "v1_p2", to: "v1_e3" },
      { id: "e1_6", from: "v1_e3", to: "v1_p3" },
      { id: "e1_7", from: "v1_p3", to: "v1_e4" },
      // Voice 2
      { id: "e2_0", from: "pol", to: "delay" },
      { id: "e2_t", from: "delay", to: "trans" },
      { id: "e2_1", from: "trans", to: "v2_e1" },
      { id: "e2_2", from: "v2_e1", to: "v2_p1" },
      { id: "e2_3", from: "v2_p1", to: "v2_e2" },
      { id: "e2_4", from: "v2_e2", to: "v2_p2" },
      { id: "e2_5", from: "v2_p2", to: "v2_e3" },
      { id: "e2_6", from: "v2_e3", to: "v2_p3" },
      { id: "e2_7", from: "v2_p3", to: "v2_e4" }
    ]
  },

  // Demo: Dynamics
  demo_dynamics: {
    name: "Demo: Dynamics",
    description: "Demonstrates volume dynamics using gain nodes - loud, soft, and swelling passages.",
    bpm: 90,
    nodes: [
      // Loud layer
      { id: "src_loud", type: "source", x: 60, y: 150, props: { interval: 4, midiNote: 60, intensity: 0.8 } },
      { id: "pol_loud", type: "polariser", x: 180, y: 150, props: { wave: "sawtooth", attack: 0.01, decay: 0.5 } },
      { id: "out_loud", type: "speaker", x: 300, y: 150, props: { reverb: 0.2, pan: -0.3 } },
      
      // Soft layer
      { id: "src_soft", type: "source", x: 60, y: 280, props: { interval: 2, midiNote: 72, intensity: 0.2 } },
      { id: "pol_soft", type: "polariser", x: 180, y: 280, props: { wave: "triangle", attack: 0.1, decay: 0.8 } },
      { id: "out_soft", type: "speaker", x: 300, y: 280, props: { reverb: 0.6, pan: 0.3 } },
      
      // Swell layer - goes through gain stages
      { id: "src_swell", type: "source", x: 60, y: 420, props: { interval: 1, midiNote: 67, intensity: 0.3 } },
      { id: "gain_up", type: "gain", x: 160, y: 420, props: { value: 1.5 } },
      { id: "pol_swell", type: "polariser", x: 260, y: 420, props: { wave: "sine", attack: 0.2, decay: 0.6 } },
      { id: "gain_down", type: "gain", x: 360, y: 420, props: { value: 0.5 } },
      { id: "out_swell", type: "speaker", x: 460, y: 420, props: { reverb: 0.4, pan: 0 } }
    ],
    edges: [
      { id: "e_l1", from: "src_loud", to: "pol_loud" }, { id: "e_l2", from: "pol_loud", to: "out_loud" },
      { id: "e_s1", from: "src_soft", to: "pol_soft" }, { id: "e_s2", from: "pol_soft", to: "out_soft" },
      { id: "e_sw1", from: "src_swell", to: "gain_up" }, { id: "e_sw2", from: "gain_up", to: "pol_swell" }, 
      { id: "e_sw3", from: "pol_swell", to: "gain_down" }, { id: "e_sw4", from: "gain_down", to: "out_swell" }
    ]
  },

  // Demo: Arpeggio
  demo_arpeggio: {
    name: "Demo: Arpeggio",
    description: "A chord broken into individual notes using fixed-timing edges for precise rhythm.",
    bpm: 120,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.6 } },
      { id: "pol", type: "polariser", x: 180, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.5 } },
      
      // Root note - immediate
      { id: "spk1", type: "speaker", x: 400, y: 150, props: { reverb: 0.4, pan: -0.4 } },
      
      // Third - 0.5 beats later
      { id: "p2", type: "pitch", x: 320, y: 250, props: { shift: 4 } },
      { id: "spk2", type: "speaker", x: 450, y: 250, props: { reverb: 0.4, pan: -0.1 } },
      
      // Fifth - 1 beat later
      { id: "p3", type: "pitch", x: 320, y: 350, props: { shift: 7 } },
      { id: "spk3", type: "speaker", x: 450, y: 350, props: { reverb: 0.4, pan: 0.1 } },
      
      // Octave - 1.5 beats later
      { id: "p4", type: "pitch", x: 320, y: 450, props: { shift: 12 } },
      { id: "spk4", type: "speaker", x: 450, y: 450, props: { reverb: 0.4, pan: 0.4 } }
    ],
    edges: [
      { id: "e_s", from: "src", to: "pol" },
      // Root - immediate
      { id: "e1", from: "pol", to: "spk1", timingMode: "fixed", durationBeats: 0 },
      // Third - after 0.5 beats
      { id: "e2a", from: "pol", to: "p2", timingMode: "fixed", durationBeats: 0.5 },
      { id: "e2b", from: "p2", to: "spk2" },
      // Fifth - after 1 beat
      { id: "e3a", from: "pol", to: "p3", timingMode: "fixed", durationBeats: 1 },
      { id: "e3b", from: "p3", to: "spk3" },
      // Octave - after 1.5 beats
      { id: "e4a", from: "pol", to: "p4", timingMode: "fixed", durationBeats: 1.5 },
      { id: "e4b", from: "p4", to: "spk4" }
    ]
  },

  // Demo: Generative Bells
  demo_bells: {
    name: "Demo: Generative Bells",
    description: "Random bell-like tones with high reverb for an ambient, church-bell atmosphere.",
    bpm: 50,
    nodes: [
      { id: "src1", type: "source", x: 80, y: 200, props: { interval: 3, noteIndex: -1, intensity: 0.5 } },
      { id: "gate1", type: "gate", x: 180, y: 200, props: { prob: 0.4 } },
      { id: "pol1", type: "polariser", x: 280, y: 200, props: { wave: "sine", attack: 0.01, decay: 3.0 } },
      { id: "spk1", type: "speaker", x: 400, y: 200, props: { reverb: 0.9, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 80, y: 350, props: { interval: 5, noteIndex: -1, intensity: 0.4 } },
      { id: "gate2", type: "gate", x: 180, y: 350, props: { prob: 0.5 } },
      { id: "p2", type: "pitch", x: 260, y: 350, props: { shift: 12 } },
      { id: "pol2", type: "polariser", x: 340, y: 350, props: { wave: "triangle", attack: 0.01, decay: 2.5 } },
      { id: "spk2", type: "speaker", x: 460, y: 350, props: { reverb: 0.9, pan: 0.5 } },
      
      { id: "src3", type: "source", x: 80, y: 500, props: { interval: 7, midiNote: 36, intensity: 0.6 } },
      { id: "pol3", type: "polariser", x: 200, y: 500, props: { wave: "sine", attack: 0.05, decay: 4.0 } },
      { id: "spk3", type: "speaker", x: 350, y: 500, props: { reverb: 0.8, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src1", to: "gate1" }, { id: "e2", from: "gate1", to: "pol1" }, { id: "e3", from: "pol1", to: "spk1" },
      { id: "e4", from: "src2", to: "gate2" }, { id: "e5", from: "gate2", to: "p2" }, { id: "e6", from: "p2", to: "pol2" }, { id: "e7", from: "pol2", to: "spk2" },
      { id: "e8", from: "src3", to: "pol3" }, { id: "e9", from: "pol3", to: "spk3" }
    ]
  },

  // Demo: Techno Kick
  demo_techno: {
    name: "Demo: Techno Beat",
    description: "A basic 4-on-the-floor techno pattern with filtered bass and hi-hats.",
    bpm: 130,
    nodes: [
      // Kick - every beat
      { id: "kick_src", type: "source", x: 60, y: 150, props: { interval: 1, midiNote: 36, intensity: 0.9 } },
      { id: "kick_pol", type: "polariser", x: 180, y: 150, props: { wave: "sine", attack: 0.005, decay: 0.2 } },
      { id: "kick_p", type: "pitch", x: 280, y: 150, props: { shift: -12 } },
      { id: "kick_out", type: "speaker", x: 400, y: 150, props: { reverb: 0.05, pan: 0 } },
      
      // Bass - every 2 beats
      { id: "bass_src", type: "source", x: 60, y: 280, props: { interval: 2, midiNote: 36, intensity: 0.7 } },
      { id: "bass_pol", type: "polariser", x: 180, y: 280, props: { wave: "sawtooth", attack: 0.01, decay: 0.4 } },
      { id: "bass_flt", type: "filter", x: 300, y: 280, props: { cutoff: 300, mod: 600, attack: 0.01, decay: 0.15 } },
      { id: "bass_out", type: "speaker", x: 420, y: 280, props: { reverb: 0.1, pan: 0 } },
      
      // Hi-hat - every 0.5 beats with random gates
      { id: "hh_src", type: "source", x: 60, y: 410, props: { interval: 0.5, midiNote: 96, intensity: 0.3 } },
      { id: "hh_gate", type: "gate", x: 160, y: 410, props: { prob: 0.8 } },
      { id: "hh_pol", type: "polariser", x: 260, y: 410, props: { wave: "square", attack: 0.001, decay: 0.03 } },
      { id: "hh_out", type: "speaker", x: 380, y: 410, props: { reverb: 0.2, pan: 0.3 } }
    ],
    edges: [
      { id: "e_k1", from: "kick_src", to: "kick_pol" }, { id: "e_k2", from: "kick_pol", to: "kick_p" }, { id: "e_k3", from: "kick_p", to: "kick_out" },
      { id: "e_b1", from: "bass_src", to: "bass_pol" }, { id: "e_b2", from: "bass_pol", to: "bass_flt" }, { id: "e_b3", from: "bass_flt", to: "bass_out" },
      { id: "e_h1", from: "hh_src", to: "hh_gate" }, { id: "e_h2", from: "hh_gate", to: "hh_pol" }, { id: "e_h3", from: "hh_pol", to: "hh_out" }
    ]
  },

  // Advanced: Layered Pad using Tunnel
  layered_pad: {
    name: "Advanced: Layered Pad",
    description: "Uses a tunnel to layer multiple waveforms into a rich, complex pad sound.",
    bpm: 60,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 6, midiNote: 60, intensity: 0.6 } },
      { id: "pad", type: "tunnel", x: 200, y: 300, props: {
        subNodes: [
          { type: "polariser", props: { wave: "sine", attack: 0.8, decay: 3.0 } },
          { type: "polariser", props: { wave: "triangle", attack: 1.2, decay: 2.5 } },
          { type: "polariser", props: { wave: "sawtooth", attack: 0.5, decay: 2.0 } }
        ]
      }},
      { id: "out", type: "speaker", x: 340, y: 300, props: { reverb: 0.8, pan: 0 } },
      
      { id: "split", type: "splitter", x: 200, y: 150, props: {} },
      { id: "p_hi", type: "pitch", x: 280, y: 150, props: { shift: 12 } },
      { id: "sparkle", type: "tunnel", x: 380, y: 150, props: {
        subNodes: [
          { type: "polariser", props: { wave: "triangle", attack: 0.01, decay: 0.4 } }
        ]
      }},
      { id: "out_hi", type: "speaker", x: 500, y: 150, props: { reverb: 0.9, pan: 0.4 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pad" },
      { id: "e2", from: "pad", to: "out" },
      { id: "e3", from: "src", to: "split" },
      { id: "e4", from: "split", to: "p_hi" },
      { id: "e5", from: "p_hi", to: "sparkle" },
      { id: "e6", from: "sparkle", to: "out_hi" }
    ]
  },

  // Advanced: Synth Bass using Tunnel
  synth_bass: {
    name: "Advanced: Synth Bass",
    description: "A fat bass sound using multiple waveform layers in a tunnel for synthesis.",
    bpm: 100,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
      { id: "gate", type: "gate", x: 160, y: 300, props: { prob: 0.6 } },
      { id: "bass", type: "tunnel", x: 280, y: 300, props: {
        subNodes: [
          { type: "pitch", props: { shift: -12 } },
          { type: "polariser", props: { wave: "sine", attack: 0.01, decay: 0.3 } },
          { type: "polariser", props: { wave: "sawtooth", attack: 0.02, decay: 0.25 } },
          { type: "polariser", props: { wave: "square", attack: 0.01, decay: 0.2 } }
        ]
      }},
      { id: "out", type: "speaker", x: 420, y: 300, props: { reverb: 0.15, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "gate" },
      { id: "e2", from: "gate", to: "bass" },
      { id: "e3", from: "bass", to: "out" }
    ]
  },

  // Advanced: Orchestra with Harmonics
  orchestra: {
    name: "Advanced: Orchestra",
    description: "Three instrument voices with harmonics, modulators, and filters simulating strings, cello, and flute.",
    bpm: 80,
    nodes: [
      // Violin
      { id: "v_src", type: "source", x: 60, y: 150, props: { interval: 4, midiNote: 72, intensity: 0.7 } },
      { id: "v_tun", type: "tunnel", x: 200, y: 150, props: {
        subNodes: [
          { type: "polariser", props: { wave: "sawtooth", attack: 0.15, decay: 1.2 } },
          { type: "harmonic", props: { ratio: 2, wave: "sine", attack: 0.12, decay: 1.0 } },
          { type: "harmonic", props: { ratio: 3, wave: "sine", attack: 0.10, decay: 0.8 } },
          { type: "modulator", props: { rate: 5.5, depth: 25 } },
          { type: "filter", props: { cutoff: 2200, mod: 2000, attack: 0.12, decay: 0.5 } }
        ]
      }},
      { id: "v_out", type: "speaker", x: 340, y: 150, props: { reverb: 0.55, pan: -0.4 } },

      // Cello
      { id: "c_src", type: "source", x: 60, y: 300, props: { interval: 8, midiNote: 36, intensity: 0.8 } },
      { id: "c_tun", type: "tunnel", x: 200, y: 300, props: {
        subNodes: [
          { type: "pitch", props: { shift: -12 } },
          { type: "polariser", props: { wave: "sawtooth", attack: 0.25, decay: 1.8 } },
          { type: "harmonic", props: { ratio: 2, wave: "sine", attack: 0.20, decay: 1.5 } },
          { type: "harmonic", props: { ratio: 3, wave: "triangle", attack: 0.18, decay: 1.2 } },
          { type: "modulator", props: { rate: 5.0, depth: 20 } },
          { type: "filter", props: { cutoff: 700, mod: 1000, attack: 0.08, decay: 0.5 } }
        ]
      }},
      { id: "c_out", type: "speaker", x: 340, y: 300, props: { reverb: 0.5, pan: 0.4 } },

      // Flute
      { id: "f_src", type: "source", x: 60, y: 450, props: { interval: 2, midiNote: 84, intensity: 0.5 } },
      { id: "f_tun", type: "tunnel", x: 200, y: 450, props: {
        subNodes: [
          { type: "pitch", props: { shift: 12 } },
          { type: "polariser", props: { wave: "sine", attack: 0.08, decay: 0.5 } },
          { type: "harmonic", props: { ratio: 2, wave: "sine", attack: 0.06, decay: 0.4 } },
          { type: "modulator", props: { rate: 5.0, depth: 15 } },
          { type: "filter", props: { cutoff: 4500, mod: 1200, attack: 0.05, decay: 0.3 } }
        ]
      }},
      { id: "f_out", type: "speaker", x: 340, y: 450, props: { reverb: 0.7, pan: 0 } }
    ],
    edges: [
      { id: "e_v1", from: "v_src", to: "v_tun" }, { id: "e_v2", from: "v_tun", to: "v_out" },
      { id: "e_c1", from: "c_src", to: "c_tun" }, { id: "e_c2", from: "c_tun", to: "c_out" },
      { id: "e_f1", from: "f_src", to: "f_tun" }, { id: "e_f2", from: "f_tun", to: "f_out" }
    ]
  },

  // Advanced: Tunnel Melody with Delays
  tunnel_melody: {
    name: "Advanced: Tunnel Melody",
    description: "Demonstrates tunnels creating arpeggios and harmonies with cascading delays.",
    bpm: 100,
    nodes: [
      { id: "main_src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.7 } },
      { id: "split", type: "splitter", x: 180, y: 300, props: {} },
      
      // Root note tunnel
      { id: "root_tun", type: "tunnel", x: 340, y: 180, props: {
        subNodes: [
          { type: "polariser", props: { wave: "sine", attack: 0.05, decay: 0.8 } },
          { type: "harmonic", props: { ratio: 2, wave: "sine", attack: 0.1, decay: 0.6 } },
          { type: "filter", props: { cutoff: 2500, mod: 800, attack: 0.02, decay: 0.3 } }
        ]
      }},
      { id: "root_out", type: "speaker", x: 460, y: 180, props: { reverb: 0.5, pan: -0.4 } },
      
      // Third with delay
      { id: "d1", type: "delay", x: 260, y: 300, props: { delayTime: 0.25 } },
      { id: "third_tun", type: "tunnel", x: 340, y: 300, props: {
        subNodes: [
          { type: "pitch", props: { shift: 4 } },
          { type: "polariser", props: { wave: "triangle", attack: 0.02, decay: 0.5 } },
          { type: "filter", props: { cutoff: 3500, mod: 1200, attack: 0.01, decay: 0.25 } }
        ]
      }},
      { id: "third_out", type: "speaker", x: 460, y: 300, props: { reverb: 0.6, pan: 0 } },
      
      // Fifth with more delay
      { id: "d2", type: "delay", x: 260, y: 420, props: { delayTime: 0.5 } },
      { id: "fifth_tun", type: "tunnel", x: 340, y: 420, props: {
        subNodes: [
          { type: "pitch", props: { shift: 7 } },
          { type: "polariser", props: { wave: "sine", attack: 0.01, decay: 0.4 } },
          { type: "harmonic", props: { ratio: 3, wave: "sine", attack: 0.02, decay: 0.25 } }
        ]
      }},
      { id: "fifth_out", type: "speaker", x: 460, y: 420, props: { reverb: 0.7, pan: 0.4 } }
    ],
    edges: [
      { id: "e_s", from: "main_src", to: "split" },
      { id: "e1a", from: "split", to: "root_tun" }, { id: "e1b", from: "root_tun", to: "root_out" },
      { id: "e2a", from: "split", to: "d1" }, { id: "e2b", from: "d1", to: "third_tun" }, { id: "e2c", from: "third_tun", to: "third_out" },
      { id: "e3a", from: "split", to: "d2" }, { id: "e3b", from: "d2", to: "fifth_tun" }, { id: "e3c", from: "fifth_tun", to: "fifth_out" }
    ]
  },

  // Advanced: Quantizer Demo
  quantizer_demo: {
    name: "Advanced: Quantizer",
    description: "Random notes snapped to musical scales using quantizers for in-tune generative music.",
    bpm: 100,
    nodes: [
      { id: "src1", type: "source", x: 60, y: 200, props: { interval: 1, noteIndex: -1, intensity: 0.6 } },
      { id: "quant1", type: "quantizer", x: 160, y: 200, props: { strength: 1.0 } },
      { id: "pol1", type: "polariser", x: 260, y: 200, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out1", type: "speaker", x: 380, y: 200, props: { reverb: 0.4, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 320, props: { interval: 2, noteIndex: -1, intensity: 0.5 } },
      { id: "quant2", type: "quantizer", x: 160, y: 320, props: { strength: 0.7 } },
      { id: "pol2", type: "polariser", x: 260, y: 320, props: { wave: "triangle", attack: 0.01, decay: 0.5 } },
      { id: "out2", type: "speaker", x: 380, y: 320, props: { reverb: 0.5, pan: 0 } },
      
      { id: "src3", type: "source", x: 60, y: 440, props: { interval: 3, noteIndex: -1, intensity: 0.4 } },
      { id: "p_oct", type: "pitch", x: 140, y: 440, props: { shift: -12 } },
      { id: "quant3", type: "quantizer", x: 220, y: 440, props: { strength: 1.0 } },
      { id: "pol3", type: "polariser", x: 320, y: 440, props: { wave: "sawtooth", attack: 0.1, decay: 0.8 } },
      { id: "out3", type: "speaker", x: 440, y: 440, props: { reverb: 0.3, pan: 0.5 } }
    ],
    edges: [
      { id: "e1a", from: "src1", to: "quant1" }, { id: "e1b", from: "quant1", to: "pol1" }, { id: "e1c", from: "pol1", to: "out1" },
      { id: "e2a", from: "src2", to: "quant2" }, { id: "e2b", from: "quant2", to: "pol2" }, { id: "e2c", from: "pol2", to: "out2" },
      { id: "e3a", from: "src3", to: "p_oct" }, { id: "e3b", from: "p_oct", to: "quant3" }, { id: "e3c", from: "quant3", to: "pol3" }, { id: "e3d", from: "pol3", to: "out3" }
    ]
  },

  // Advanced: LFO Modulation
  lfo_modulation: {
    name: "Advanced: LFO Modulation",
    description: "LFO nodes generate continuous values for CV routing to modulate filter cutoff and pan.",
    bpm: 80,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
      { id: "pol", type: "polariser", x: 180, y: 300, props: { wave: "sawtooth", attack: 0.5, decay: 2.0 } },
      { id: "flt", type: "filter", x: 300, y: 300, props: { cutoff: 800, mod: 0 } },
      { id: "out", type: "speaker", x: 420, y: 300, props: { reverb: 0.6, pan: 0 } },
      
      { id: "lfo1", type: "lfo", x: 300, y: 180, props: { rate: 0.5, shape: "sine", min: 200, max: 2000 } },
      { id: "lfo2", type: "lfo", x: 420, y: 180, props: { rate: 0.25, shape: "triangle", min: -0.8, max: 0.8 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol" },
      { id: "e2", from: "pol", to: "flt" },
      { id: "e3", from: "flt", to: "out" },
      { id: "e_lfo1", from: "lfo1", to: "flt", targetParam: "cutoff" },
      { id: "e_lfo2", from: "lfo2", to: "out", targetParam: "pan" }
    ]
  },

  // Advanced: CV Routing
  cv_routing_demo: {
    name: "Advanced: CV Routing",
    description: "Multiple LFOs modulate filter cutoff, pan, and gain for complex modulation effects.",
    bpm: 70,
    nodes: [
      { id: "src", type: "source", x: 80, y: 300, props: { interval: 3, midiNote: 48, intensity: 0.7 } },
      { id: "pol", type: "polariser", x: 200, y: 300, props: { wave: "sawtooth", attack: 0.8, decay: 2.5 } },
      { id: "gain", type: "gain", x: 320, y: 300, props: { value: 0.8 } },
      { id: "flt", type: "filter", x: 440, y: 300, props: { cutoff: 1000, mod: 0 } },
      { id: "out", type: "speaker", x: 560, y: 300, props: { reverb: 0.7, pan: 0 } },
      
      { id: "lfo_cutoff", type: "lfo", x: 440, y: 150, props: { rate: 0.2, shape: "sine", min: 200, max: 3000 } },
      { id: "lfo_pan", type: "lfo", x: 560, y: 150, props: { rate: 0.15, shape: "triangle", min: -1, max: 1 } },
      { id: "lfo_gain", type: "lfo", x: 320, y: 450, props: { rate: 0.5, shape: "sine", min: 0.3, max: 1.0 } },
      
      { id: "src2", type: "source", x: 80, y: 500, props: { interval: 6, midiNote: 36, intensity: 0.8 } },
      { id: "pol2", type: "polariser", x: 200, y: 500, props: { wave: "sine", attack: 0.5, decay: 3.0 } },
      { id: "out2", type: "speaker", x: 320, y: 500, props: { reverb: 0.5, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol" },
      { id: "e2", from: "pol", to: "gain" },
      { id: "e3", from: "gain", to: "flt" },
      { id: "e4", from: "flt", to: "out" },
      { id: "e_lfo1", from: "lfo_cutoff", to: "flt", targetParam: "cutoff" },
      { id: "e_lfo2", from: "lfo_pan", to: "out", targetParam: "pan" },
      { id: "e_lfo3", from: "lfo_gain", to: "gain", targetParam: "value" },
      { id: "e5", from: "src2", to: "pol2" },
      { id: "e6", from: "pol2", to: "out2" }
    ]
  },

  // Advanced: Blues Scale
  blues_scale: {
    name: "Advanced: Blues Scale",
    description: "Jamming in blues scale with quantizer and gate for authentic bluesy feel.",
    bpm: 85,
    nodes: [
      { id: "lead_src", type: "source", x: 60, y: 200, props: { interval: 0.75, noteIndex: -1, intensity: 0.6 } },
      { id: "lead_gate", type: "gate", x: 140, y: 200, props: { prob: 0.7 } },
      { id: "lead_q", type: "quantizer", x: 220, y: 200, props: { strength: 1.0 } },
      { id: "lead_pol", type: "polariser", x: 320, y: 200, props: { wave: "sawtooth", attack: 0.01, decay: 0.3 } },
      { id: "lead_flt", type: "filter", x: 420, y: 200, props: { cutoff: 1800, mod: 2000, attack: 0.01, decay: 0.2 } },
      { id: "lead_out", type: "speaker", x: 520, y: 200, props: { reverb: 0.4, pan: 0.3 } },
      
      { id: "bass_src", type: "source", x: 60, y: 350, props: { interval: 2, noteIndex: -1, intensity: 0.8 } },
      { id: "bass_q", type: "quantizer", x: 160, y: 350, props: { strength: 1.0 } },
      { id: "bass_p", type: "pitch", x: 260, y: 350, props: { shift: -24 } },
      { id: "bass_pol", type: "polariser", x: 360, y: 350, props: { wave: "triangle", attack: 0.02, decay: 0.6 } },
      { id: "bass_out", type: "speaker", x: 460, y: 350, props: { reverb: 0.2, pan: -0.2 } },
      
      { id: "rhythm_src", type: "source", x: 60, y: 500, props: { interval: 0.5, noteIndex: -1, intensity: 0.4 } },
      { id: "rhythm_gate", type: "gate", x: 140, y: 500, props: { prob: 0.5 } },
      { id: "rhythm_q", type: "quantizer", x: 220, y: 500, props: { strength: 0.8 } },
      { id: "rhythm_pol", type: "polariser", x: 320, y: 500, props: { wave: "square", attack: 0.005, decay: 0.15 } },
      { id: "rhythm_out", type: "speaker", x: 420, y: 500, props: { reverb: 0.3, pan: -0.4 } },
      
      { id: "lfo_wah", type: "lfo", x: 420, y: 100, props: { rate: 3, shape: "sine", min: 400, max: 2500 } }
    ],
    edges: [
      { id: "e_l1", from: "lead_src", to: "lead_gate" },
      { id: "e_l2", from: "lead_gate", to: "lead_q" },
      { id: "e_l3", from: "lead_q", to: "lead_pol" },
      { id: "e_l4", from: "lead_pol", to: "lead_flt" },
      { id: "e_l5", from: "lead_flt", to: "lead_out" },
      { id: "e_b1", from: "bass_src", to: "bass_q" },
      { id: "e_b2", from: "bass_q", to: "bass_p" },
      { id: "e_b3", from: "bass_p", to: "bass_pol" },
      { id: "e_b4", from: "bass_pol", to: "bass_out" },
      { id: "e_r1", from: "rhythm_src", to: "rhythm_gate" },
      { id: "e_r2", from: "rhythm_gate", to: "rhythm_q" },
      { id: "e_r3", from: "rhythm_q", to: "rhythm_pol" },
      { id: "e_r4", from: "rhythm_pol", to: "rhythm_out" },
      { id: "e_lfo", from: "lfo_wah", to: "lead_flt", targetParam: "cutoff" }
    ]
  },

  // Advanced: Ambient Drone
  ambient_drone: {
    name: "Advanced: Ambient Drone",
    description: "Slow, evolving drone with high reverb and long decays for meditative atmosphere.",
    bpm: 40,
    nodes: [
      { id: "src1", type: "source", x: 60, y: 200, props: { interval: 8, midiNote: 48, intensity: 0.5 } },
      { id: "pol1", type: "polariser", x: 180, y: 200, props: { wave: "sine", attack: 2.0, decay: 5.0 } },
      { id: "out1", type: "speaker", x: 300, y: 200, props: { reverb: 0.95, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 350, props: { interval: 12, midiNote: 55, intensity: 0.4 } },
      { id: "pol2", type: "polariser", x: 180, y: 350, props: { wave: "triangle", attack: 1.5, decay: 4.0 } },
      { id: "flt2", type: "filter", x: 280, y: 350, props: { cutoff: 500, mod: 300, attack: 0.5, decay: 2.0 } },
      { id: "out2", type: "speaker", x: 400, y: 350, props: { reverb: 0.9, pan: 0.5 } },
      
      { id: "src3", type: "source", x: 60, y: 500, props: { interval: 16, midiNote: 43, intensity: 0.3 } },
      { id: "d1", type: "delay", x: 150, y: 500, props: { delayTime: 4.0 } },
      { id: "pol3", type: "polariser", x: 250, y: 500, props: { wave: "sine", attack: 1.0, decay: 6.0 } },
      { id: "out3", type: "speaker", x: 380, y: 500, props: { reverb: 0.85, pan: 0 } },
      
      { id: "lfo_low", type: "lfo", x: 50, y: 100, props: { rate: 0.1, min: 200, max: 800, shape: "sine" } }
    ],
    edges: [
      { id: "e1", from: "src1", to: "pol1" },
      { id: "e2", from: "pol1", to: "out1" },
      { id: "e3", from: "src2", to: "pol2" },
      { id: "e4", from: "pol2", to: "flt2" },
      { id: "e5", from: "flt2", to: "out2" },
      { id: "e6", from: "src3", to: "d1" },
      { id: "e7", from: "d1", to: "pol3" },
      { id: "e8", from: "pol3", to: "out3" },
      { id: "e_lfo", from: "lfo_low", to: "flt2", targetParam: "cutoff" }
    ]
  },

  // Advanced: Virtual Edges with Fixed Timing
  virtual_edges: {
    name: "Advanced: Virtual Edges",
    description: "Fixed-timing edges for precise rhythmic patterns independent of physical distance.",
    bpm: 120,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.7 } },
      { id: "split", type: "splitter", x: 200, y: 300, props: {} },
      
      { id: "pol1", type: "polariser", x: 500, y: 150, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out1", type: "speaker", x: 620, y: 150, props: { reverb: 0.3, pan: -0.6 } },
      
      { id: "pol2", type: "polariser", x: 500, y: 250, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out2", type: "speaker", x: 620, y: 250, props: { reverb: 0.3, pan: -0.3 } },
      
      { id: "pol3", type: "polariser", x: 500, y: 350, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out3", type: "speaker", x: 620, y: 350, props: { reverb: 0.3, pan: 0 } },
      
      { id: "pol4", type: "polariser", x: 500, y: 450, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out4", type: "speaker", x: 620, y: 450, props: { reverb: 0.3, pan: 0.3 } }
    ],
    edges: [
      { id: "e_s", from: "src", to: "split" },
      { id: "e_v1", from: "split", to: "pol1", timingMode: "fixed", durationBeats: 0 },
      { id: "e_v2", from: "split", to: "pol2", timingMode: "fixed", durationBeats: 1 },
      { id: "e_v3", from: "split", to: "pol3", timingMode: "fixed", durationBeats: 2 },
      { id: "e_v4", from: "split", to: "pol4", timingMode: "fixed", durationBeats: 3 },
      { id: "e_o1", from: "pol1", to: "out1" },
      { id: "e_o2", from: "pol2", to: "out2" },
      { id: "e_o3", from: "pol3", to: "out3" },
      { id: "e_o4", from: "pol4", to: "out4" }
    ]
  },

  // Advanced: Noise Percussion
  noise_percussion: {
    name: "Advanced: Noise Percussion",
    description: "White, pink, and brown noise sources create realistic hi-hats, snares, and rumbles.",
    bpm: 110,
    nodes: [
      // Hi-hat with white noise
      { id: "hh_src", type: "source", x: 60, y: 150, props: { interval: 0.5, midiNote: 80, intensity: 0.4 } },
      { id: "hh_gate", type: "gate", x: 150, y: 150, props: { prob: 0.75 } },
      { id: "hh_noise", type: "noise", x: 240, y: 150, props: { noiseType: "white", attack: 0.001, decay: 0.05 } },
      { id: "hh_flt", type: "filter", x: 330, y: 150, props: { cutoff: 8000, mod: 2000, attack: 0.001, decay: 0.03 } },
      { id: "hh_out", type: "speaker", x: 440, y: 150, props: { reverb: 0.15, pan: 0.3 } },
      
      // Snare with pink noise
      { id: "sn_src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.7 } },
      { id: "sn_del", type: "delay", x: 140, y: 300, props: { delayTime: 1 } },
      { id: "sn_noise", type: "noise", x: 240, y: 300, props: { noiseType: "pink", attack: 0.005, decay: 0.15 } },
      { id: "sn_flt", type: "filter", x: 340, y: 300, props: { cutoff: 3000, mod: 2000, attack: 0.01, decay: 0.1 } },
      { id: "sn_out", type: "speaker", x: 460, y: 300, props: { reverb: 0.3, pan: -0.1 } },
      
      // Rumble with brown noise
      { id: "rm_src", type: "source", x: 60, y: 450, props: { interval: 4, midiNote: 36, intensity: 0.5 } },
      { id: "rm_noise", type: "noise", x: 180, y: 450, props: { noiseType: "brown", attack: 0.1, decay: 1.5 } },
      { id: "rm_flt", type: "filter", x: 300, y: 450, props: { cutoff: 200, mod: 150, attack: 0.05, decay: 0.8 } },
      { id: "rm_out", type: "speaker", x: 420, y: 450, props: { reverb: 0.4, pan: 0 } }
    ],
    edges: [
      { id: "e_hh1", from: "hh_src", to: "hh_gate" },
      { id: "e_hh2", from: "hh_gate", to: "hh_noise" },
      { id: "e_hh3", from: "hh_noise", to: "hh_flt" },
      { id: "e_hh4", from: "hh_flt", to: "hh_out" },
      { id: "e_sn1", from: "sn_src", to: "sn_del" },
      { id: "e_sn2", from: "sn_del", to: "sn_noise" },
      { id: "e_sn3", from: "sn_noise", to: "sn_flt" },
      { id: "e_sn4", from: "sn_flt", to: "sn_out" },
      { id: "e_rm1", from: "rm_src", to: "rm_noise" },
      { id: "e_rm2", from: "rm_noise", to: "rm_flt" },
      { id: "e_rm3", from: "rm_flt", to: "rm_out" }
    ]
  },

  // Advanced: Vibrato Strings
  vibrato_strings: {
    name: "Advanced: Vibrato Strings",
    description: "Modulator nodes add expressive vibrato to create realistic string instrument sounds.",
    bpm: 70,
    nodes: [
      // Violin with fast vibrato
      { id: "v_src", type: "source", x: 60, y: 180, props: { interval: 4, midiNote: 76, intensity: 0.6 } },
      { id: "v_pol", type: "polariser", x: 180, y: 180, props: { wave: "sawtooth", attack: 0.2, decay: 1.5 } },
      { id: "v_mod", type: "modulator", x: 300, y: 180, props: { rate: 6.0, depth: 20 } },
      { id: "v_harm", type: "harmonic", x: 420, y: 180, props: { ratio: 2, wave: "sine", attack: 0.15, decay: 1.2 } },
      { id: "v_flt", type: "filter", x: 540, y: 180, props: { cutoff: 3000, mod: 1500, attack: 0.1, decay: 0.5 } },
      { id: "v_out", type: "speaker", x: 660, y: 180, props: { reverb: 0.5, pan: -0.4 } },
      
      // Viola with medium vibrato
      { id: "va_src", type: "source", x: 60, y: 330, props: { interval: 6, midiNote: 60, intensity: 0.65 } },
      { id: "va_pol", type: "polariser", x: 180, y: 330, props: { wave: "sawtooth", attack: 0.25, decay: 2.0 } },
      { id: "va_mod", type: "modulator", x: 300, y: 330, props: { rate: 5.0, depth: 18 } },
      { id: "va_harm", type: "harmonic", x: 420, y: 330, props: { ratio: 3, wave: "triangle", attack: 0.2, decay: 1.5 } },
      { id: "va_flt", type: "filter", x: 540, y: 330, props: { cutoff: 2000, mod: 1000, attack: 0.12, decay: 0.6 } },
      { id: "va_out", type: "speaker", x: 660, y: 330, props: { reverb: 0.55, pan: 0 } },
      
      // Cello with slow vibrato
      { id: "c_src", type: "source", x: 60, y: 480, props: { interval: 8, midiNote: 48, intensity: 0.7 } },
      { id: "c_pol", type: "polariser", x: 180, y: 480, props: { wave: "sawtooth", attack: 0.3, decay: 2.5 } },
      { id: "c_mod", type: "modulator", x: 300, y: 480, props: { rate: 4.5, depth: 15 } },
      { id: "c_harm", type: "harmonic", x: 420, y: 480, props: { ratio: 2, wave: "sine", attack: 0.25, decay: 2.0 } },
      { id: "c_flt", type: "filter", x: 540, y: 480, props: { cutoff: 1200, mod: 600, attack: 0.15, decay: 0.8 } },
      { id: "c_out", type: "speaker", x: 660, y: 480, props: { reverb: 0.6, pan: 0.4 } }
    ],
    edges: [
      { id: "e_v1", from: "v_src", to: "v_pol" }, { id: "e_v2", from: "v_pol", to: "v_mod" },
      { id: "e_v3", from: "v_mod", to: "v_harm" }, { id: "e_v4", from: "v_harm", to: "v_flt" },
      { id: "e_v5", from: "v_flt", to: "v_out" },
      { id: "e_va1", from: "va_src", to: "va_pol" }, { id: "e_va2", from: "va_pol", to: "va_mod" },
      { id: "e_va3", from: "va_mod", to: "va_harm" }, { id: "e_va4", from: "va_harm", to: "va_flt" },
      { id: "e_va5", from: "va_flt", to: "va_out" },
      { id: "e_c1", from: "c_src", to: "c_pol" }, { id: "e_c2", from: "c_pol", to: "c_mod" },
      { id: "e_c3", from: "c_mod", to: "c_harm" }, { id: "e_c4", from: "c_harm", to: "c_flt" },
      { id: "e_c5", from: "c_flt", to: "c_out" }
    ]
  },

  // Advanced: Teleporter Echo
  teleporter_echo: {
    name: "Advanced: Teleporter",
    description: "Teleporters instantly transport packets to create unique spatial effects and feedback loops.",
    bpm: 100,
    nodes: [
      { id: "src", type: "source", x: 60, y: 250, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "pol", type: "polariser", x: 160, y: 250, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
      { id: "out1", type: "speaker", x: 280, y: 250, props: { reverb: 0.3, pan: -0.5 } },
      
      // Teleporter sends to far right
      { id: "tele_in", type: "teleporter", x: 380, y: 250, props: { targetId: "tele_out", mode: "send" } },
      { id: "tele_out", type: "teleporter", x: 600, y: 250, props: { targetId: "tele_in", mode: "receive" } },
      
      { id: "p_up", type: "pitch", x: 700, y: 250, props: { shift: 7 } },
      { id: "out2", type: "speaker", x: 820, y: 250, props: { reverb: 0.5, pan: 0.5 } },
      
      // Second teleporter pair for octave
      { id: "src2", type: "source", x: 60, y: 400, props: { interval: 4, midiNote: 48, intensity: 0.7 } },
      { id: "pol2", type: "polariser", x: 160, y: 400, props: { wave: "sine", attack: 0.1, decay: 1.0 } },
      { id: "tele_in2", type: "teleporter", x: 280, y: 400, props: { targetId: "tele_out2", mode: "send" } },
      { id: "tele_out2", type: "teleporter", x: 500, y: 400, props: { targetId: "tele_in2", mode: "receive" } },
      { id: "p_oct", type: "pitch", x: 600, y: 400, props: { shift: 12 } },
      { id: "out3", type: "speaker", x: 720, y: 400, props: { reverb: 0.6, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol" },
      { id: "e2", from: "pol", to: "out1" },
      { id: "e3", from: "out1", to: "tele_in" },
      { id: "e4", from: "tele_out", to: "p_up" },
      { id: "e5", from: "p_up", to: "out2" },
      { id: "e6", from: "src2", to: "pol2" },
      { id: "e7", from: "pol2", to: "tele_in2" },
      { id: "e8", from: "tele_out2", to: "p_oct" },
      { id: "e9", from: "p_oct", to: "out3" }
    ]
  },

  // Advanced: Harmonic Series
  harmonic_series: {
    name: "Advanced: Harmonic Series",
    description: "Multiple harmonic nodes build a rich organ-like tone with natural overtones.",
    bpm: 60,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 4, midiNote: 48, intensity: 0.5 } },
      { id: "split", type: "splitter", x: 160, y: 300, props: {} },
      
      // Fundamental
      { id: "pol1", type: "polariser", x: 300, y: 120, props: { wave: "sine", attack: 0.1, decay: 2.0 } },
      { id: "g1", type: "gain", x: 400, y: 120, props: { value: 1.0 } },
      
      // 2nd harmonic (octave)
      { id: "h2", type: "harmonic", x: 300, y: 220, props: { ratio: 2, wave: "sine", attack: 0.08, decay: 1.8 } },
      { id: "g2", type: "gain", x: 400, y: 220, props: { value: 0.5 } },
      
      // 3rd harmonic (fifth + octave)
      { id: "h3", type: "harmonic", x: 300, y: 320, props: { ratio: 3, wave: "sine", attack: 0.06, decay: 1.5 } },
      { id: "g3", type: "gain", x: 400, y: 320, props: { value: 0.33 } },
      
      // 4th harmonic (2 octaves)
      { id: "h4", type: "harmonic", x: 300, y: 420, props: { ratio: 4, wave: "sine", attack: 0.05, decay: 1.2 } },
      { id: "g4", type: "gain", x: 400, y: 420, props: { value: 0.25 } },
      
      // 5th harmonic (major third + 2 octaves)
      { id: "h5", type: "harmonic", x: 300, y: 520, props: { ratio: 5, wave: "sine", attack: 0.04, decay: 1.0 } },
      { id: "g5", type: "gain", x: 400, y: 520, props: { value: 0.2 } },
      
      // All merge to one speaker
      { id: "out", type: "speaker", x: 550, y: 300, props: { reverb: 0.7, pan: 0 } }
    ],
    edges: [
      { id: "e_s", from: "src", to: "split" },
      { id: "e1a", from: "split", to: "pol1" }, { id: "e1b", from: "pol1", to: "g1" }, { id: "e1c", from: "g1", to: "out" },
      { id: "e2a", from: "split", to: "h2" }, { id: "e2b", from: "h2", to: "g2" }, { id: "e2c", from: "g2", to: "out" },
      { id: "e3a", from: "split", to: "h3" }, { id: "e3b", from: "h3", to: "g3" }, { id: "e3c", from: "g3", to: "out" },
      { id: "e4a", from: "split", to: "h4" }, { id: "e4b", from: "h4", to: "g4" }, { id: "e4c", from: "g4", to: "out" },
      { id: "e5a", from: "split", to: "h5" }, { id: "e5b", from: "h5", to: "g5" }, { id: "e5c", from: "g5", to: "out" }
    ]
  },

  // Advanced: Multi-LFO Wobble Bass
  wobble_bass: {
    name: "Advanced: Wobble Bass",
    description: "Multiple LFOs at different rates create complex wobble bass movements.",
    bpm: 140,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 36, intensity: 0.8 } },
      { id: "pol", type: "polariser", x: 180, y: 300, props: { wave: "sawtooth", attack: 0.01, decay: 0.8 } },
      { id: "flt", type: "filter", x: 300, y: 300, props: { cutoff: 500, mod: 0 } },
      { id: "gain", type: "gain", x: 420, y: 300, props: { value: 0.8 } },
      { id: "out", type: "speaker", x: 540, y: 300, props: { reverb: 0.2, pan: 0 } },
      
      // Fast wobble LFO for filter
      { id: "lfo_fast", type: "lfo", x: 300, y: 150, props: { rate: 4, shape: "sine", min: 200, max: 2500 } },
      
      // Slow LFO for volume swell
      { id: "lfo_slow", type: "lfo", x: 420, y: 150, props: { rate: 0.5, shape: "triangle", min: 0.4, max: 1.0 } },
      
      // Sub bass layer
      { id: "src_sub", type: "source", x: 60, y: 450, props: { interval: 2, midiNote: 36, intensity: 0.9 } },
      { id: "p_sub", type: "pitch", x: 160, y: 450, props: { shift: -12 } },
      { id: "pol_sub", type: "polariser", x: 260, y: 450, props: { wave: "sine", attack: 0.01, decay: 0.6 } },
      { id: "out_sub", type: "speaker", x: 380, y: 450, props: { reverb: 0.1, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "pol" },
      { id: "e2", from: "pol", to: "flt" },
      { id: "e3", from: "flt", to: "gain" },
      { id: "e4", from: "gain", to: "out" },
      { id: "e_lfo1", from: "lfo_fast", to: "flt", targetParam: "cutoff" },
      { id: "e_lfo2", from: "lfo_slow", to: "gain", targetParam: "value" },
      { id: "e5", from: "src_sub", to: "p_sub" },
      { id: "e6", from: "p_sub", to: "pol_sub" },
      { id: "e7", from: "pol_sub", to: "out_sub" }
    ]
  },

  // Advanced: Generative Sequencer
  generative_sequencer: {
    name: "Advanced: Generative Sequencer",
    description: "Gates and quantizers create an ever-evolving melodic sequence with controlled randomness.",
    bpm: 120,
    nodes: [
      // Fast sequence with high gate probability
      { id: "seq1_src", type: "source", x: 60, y: 150, props: { interval: 0.25, noteIndex: -1, intensity: 0.5 } },
      { id: "seq1_gate", type: "gate", x: 160, y: 150, props: { prob: 0.4 } },
      { id: "seq1_quant", type: "quantizer", x: 260, y: 150, props: { strength: 1.0 } },
      { id: "seq1_pol", type: "polariser", x: 360, y: 150, props: { wave: "square", attack: 0.005, decay: 0.1 } },
      { id: "seq1_flt", type: "filter", x: 460, y: 150, props: { cutoff: 2000, mod: 1500, attack: 0.01, decay: 0.08 } },
      { id: "seq1_out", type: "speaker", x: 580, y: 150, props: { reverb: 0.3, pan: -0.4 } },
      
      // Medium sequence with splitter for harmony
      { id: "seq2_src", type: "source", x: 60, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.6 } },
      { id: "seq2_gate", type: "gate", x: 160, y: 300, props: { prob: 0.6 } },
      { id: "seq2_quant", type: "quantizer", x: 260, y: 300, props: { strength: 0.9 } },
      { id: "seq2_split", type: "splitter", x: 350, y: 300, props: {} },
      { id: "seq2_pol1", type: "polariser", x: 460, y: 250, props: { wave: "triangle", attack: 0.01, decay: 0.2 } },
      { id: "seq2_out1", type: "speaker", x: 580, y: 250, props: { reverb: 0.4, pan: 0 } },
      { id: "seq2_p", type: "pitch", x: 460, y: 350, props: { shift: 7 } },
      { id: "seq2_pol2", type: "polariser", x: 560, y: 350, props: { wave: "sine", attack: 0.02, decay: 0.25 } },
      { id: "seq2_out2", type: "speaker", x: 680, y: 350, props: { reverb: 0.5, pan: 0.3 } },
      
      // Slow bass with full quantization
      { id: "bass_src", type: "source", x: 60, y: 480, props: { interval: 2, noteIndex: -1, intensity: 0.7 } },
      { id: "bass_quant", type: "quantizer", x: 160, y: 480, props: { strength: 1.0 } },
      { id: "bass_p", type: "pitch", x: 260, y: 480, props: { shift: -24 } },
      { id: "bass_pol", type: "polariser", x: 360, y: 480, props: { wave: "sawtooth", attack: 0.02, decay: 0.5 } },
      { id: "bass_flt", type: "filter", x: 460, y: 480, props: { cutoff: 600, mod: 400, attack: 0.02, decay: 0.2 } },
      { id: "bass_out", type: "speaker", x: 580, y: 480, props: { reverb: 0.2, pan: 0 } },
      
      // LFO for filter sweep
      { id: "lfo_sweep", type: "lfo", x: 460, y: 80, props: { rate: 0.25, shape: "sine", min: 1000, max: 4000 } }
    ],
    edges: [
      { id: "e1a", from: "seq1_src", to: "seq1_gate" }, { id: "e1b", from: "seq1_gate", to: "seq1_quant" },
      { id: "e1c", from: "seq1_quant", to: "seq1_pol" }, { id: "e1d", from: "seq1_pol", to: "seq1_flt" },
      { id: "e1e", from: "seq1_flt", to: "seq1_out" },
      { id: "e2a", from: "seq2_src", to: "seq2_gate" }, { id: "e2b", from: "seq2_gate", to: "seq2_quant" },
      { id: "e2c", from: "seq2_quant", to: "seq2_split" },
      { id: "e2d", from: "seq2_split", to: "seq2_pol1" }, { id: "e2e", from: "seq2_pol1", to: "seq2_out1" },
      { id: "e2f", from: "seq2_split", to: "seq2_p" }, { id: "e2g", from: "seq2_p", to: "seq2_pol2" },
      { id: "e2h", from: "seq2_pol2", to: "seq2_out2" },
      { id: "e3a", from: "bass_src", to: "bass_quant" }, { id: "e3b", from: "bass_quant", to: "bass_p" },
      { id: "e3c", from: "bass_p", to: "bass_pol" }, { id: "e3d", from: "bass_pol", to: "bass_flt" },
      { id: "e3e", from: "bass_flt", to: "bass_out" },
      { id: "e_lfo", from: "lfo_sweep", to: "seq1_flt", targetParam: "cutoff" }
    ]
  },

  // Advanced: Full Tunnel Processing
  tunnel_processing: {
    name: "Advanced: Full Tunnel",
    description: "Tunnels containing pitch, polariser, harmonic, modulator, and filter for complete synthesis.",
    bpm: 90,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.7 } },
      
      // Complex tunnel with full processing chain
      { id: "synth", type: "tunnel", x: 250, y: 300, props: {
        subNodes: [
          { type: "pitch", props: { shift: 0 } },
          { type: "polariser", props: { wave: "sawtooth", attack: 0.02, decay: 0.8 } },
          { type: "harmonic", props: { ratio: 2, wave: "sine", attack: 0.03, decay: 0.6 } },
          { type: "harmonic", props: { ratio: 3, wave: "triangle", attack: 0.04, decay: 0.5 } },
          { type: "modulator", props: { rate: 5.5, depth: 20 } },
          { type: "filter", props: { cutoff: 2000, mod: 1500, attack: 0.02, decay: 0.4 } }
        ]
      }},
      { id: "out1", type: "speaker", x: 440, y: 300, props: { reverb: 0.5, pan: 0 } },
      
      // Second voice with different tunnel
      { id: "src2", type: "source", x: 60, y: 480, props: { interval: 4, midiNote: 48, intensity: 0.6 } },
      { id: "pad", type: "tunnel", x: 250, y: 480, props: {
        subNodes: [
          { type: "polariser", props: { wave: "sine", attack: 0.5, decay: 2.0 } },
          { type: "harmonic", props: { ratio: 2, wave: "sine", attack: 0.4, decay: 1.8 } },
          { type: "polariser", props: { wave: "triangle", attack: 0.6, decay: 1.5 } },
          { type: "modulator", props: { rate: 4.0, depth: 15 } }
        ]
      }},
      { id: "out2", type: "speaker", x: 440, y: 480, props: { reverb: 0.8, pan: 0.3 } },
      
      // LFO for filter modulation on main synth
      { id: "lfo1", type: "lfo", x: 350, y: 180, props: { rate: 0.5, shape: "sine", min: 800, max: 3500 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "synth" },
      { id: "e2", from: "synth", to: "out1" },
      { id: "e3", from: "src2", to: "pad" },
      { id: "e4", from: "pad", to: "out2" }
    ]
  },

  // Advanced: Euclidean-style Rhythms
  euclidean_rhythms: {
    name: "Advanced: Complex Rhythms",
    description: "Gates with different probabilities create Euclidean-style distributed rhythms.",
    bpm: 125,
    nodes: [
      // High density - 8 steps, ~5 hits (prob 0.625)
      { id: "h_src", type: "source", x: 60, y: 150, props: { interval: 0.5, midiNote: 72, intensity: 0.5 } },
      { id: "h_gate", type: "gate", x: 160, y: 150, props: { prob: 0.625 } },
      { id: "h_pol", type: "polariser", x: 260, y: 150, props: { wave: "square", attack: 0.001, decay: 0.04 } },
      { id: "h_p", type: "pitch", x: 360, y: 150, props: { shift: 24 } },
      { id: "h_out", type: "speaker", x: 460, y: 150, props: { reverb: 0.15, pan: 0.4 } },
      
      // Medium density - 8 steps, ~3 hits (prob 0.375)
      { id: "m_src", type: "source", x: 60, y: 300, props: { interval: 0.5, midiNote: 60, intensity: 0.6 } },
      { id: "m_gate", type: "gate", x: 160, y: 300, props: { prob: 0.375 } },
      { id: "m_pol", type: "polariser", x: 260, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.15 } },
      { id: "m_out", type: "speaker", x: 360, y: 300, props: { reverb: 0.25, pan: 0 } },
      
      // Low density - kick pattern (prob 0.25)
      { id: "k_src", type: "source", x: 60, y: 450, props: { interval: 0.5, midiNote: 36, intensity: 0.8 } },
      { id: "k_gate", type: "gate", x: 160, y: 450, props: { prob: 0.25 } },
      { id: "k_pol", type: "polariser", x: 260, y: 450, props: { wave: "sine", attack: 0.005, decay: 0.2 } },
      { id: "k_p", type: "pitch", x: 360, y: 450, props: { shift: -12 } },
      { id: "k_out", type: "speaker", x: 460, y: 450, props: { reverb: 0.1, pan: -0.2 } },
      
      // Accent layer - very sparse (prob 0.125)
      { id: "a_src", type: "source", x: 500, y: 300, props: { interval: 1, midiNote: 84, intensity: 0.4 } },
      { id: "a_gate", type: "gate", x: 580, y: 300, props: { prob: 0.125 } },
      { id: "a_pol", type: "polariser", x: 660, y: 300, props: { wave: "sine", attack: 0.01, decay: 0.5 } },
      { id: "a_out", type: "speaker", x: 760, y: 300, props: { reverb: 0.6, pan: 0.3 } }
    ],
    edges: [
      { id: "e_h1", from: "h_src", to: "h_gate" }, { id: "e_h2", from: "h_gate", to: "h_pol" },
      { id: "e_h3", from: "h_pol", to: "h_p" }, { id: "e_h4", from: "h_p", to: "h_out" },
      { id: "e_m1", from: "m_src", to: "m_gate" }, { id: "e_m2", from: "m_gate", to: "m_pol" },
      { id: "e_m3", from: "m_pol", to: "m_out" },
      { id: "e_k1", from: "k_src", to: "k_gate" }, { id: "e_k2", from: "k_gate", to: "k_pol" },
      { id: "e_k3", from: "k_pol", to: "k_p" }, { id: "e_k4", from: "k_p", to: "k_out" },
      { id: "e_a1", from: "a_src", to: "a_gate" }, { id: "e_a2", from: "a_gate", to: "a_pol" },
      { id: "e_a3", from: "a_pol", to: "a_out" }
    ]
  },

  // Advanced: Delay Network
  delay_network: {
    name: "Advanced: Delay Network",
    description: "Multiple interconnected delays create a complex echo network with pitch shifting.",
    bpm: 90,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.6 } },
      { id: "pol", type: "polariser", x: 160, y: 300, props: { wave: "sine", attack: 0.05, decay: 0.6 } },
      { id: "split", type: "splitter", x: 260, y: 300, props: {} },
      
      // Direct path
      { id: "out_dry", type: "speaker", x: 400, y: 180, props: { reverb: 0.2, pan: 0 } },
      
      // Short delay path
      { id: "d1", type: "delay", x: 360, y: 300, props: { delayTime: 0.5 } },
      { id: "g1", type: "gain", x: 460, y: 300, props: { value: 0.7 } },
      { id: "out1", type: "speaker", x: 560, y: 300, props: { reverb: 0.4, pan: -0.4 } },
      
      // Medium delay with pitch up
      { id: "d2", type: "delay", x: 360, y: 420, props: { delayTime: 1.0 } },
      { id: "p2", type: "pitch", x: 460, y: 420, props: { shift: 5 } },
      { id: "g2", type: "gain", x: 560, y: 420, props: { value: 0.5 } },
      { id: "out2", type: "speaker", x: 660, y: 420, props: { reverb: 0.5, pan: 0.4 } },
      
      // Long delay with pitch down
      { id: "d3", type: "delay", x: 360, y: 540, props: { delayTime: 1.5 } },
      { id: "p3", type: "pitch", x: 460, y: 540, props: { shift: -7 } },
      { id: "g3", type: "gain", x: 560, y: 540, props: { value: 0.3 } },
      { id: "out3", type: "speaker", x: 660, y: 540, props: { reverb: 0.7, pan: 0 } }
    ],
    edges: [
      { id: "e_s", from: "src", to: "pol" },
      { id: "e_sp", from: "pol", to: "split" },
      { id: "e_dry", from: "split", to: "out_dry" },
      { id: "e1a", from: "split", to: "d1" }, { id: "e1b", from: "d1", to: "g1" }, { id: "e1c", from: "g1", to: "out1" },
      { id: "e2a", from: "split", to: "d2" }, { id: "e2b", from: "d2", to: "p2" }, { id: "e2c", from: "p2", to: "g2" }, { id: "e2d", from: "g2", to: "out2" },
      { id: "e3a", from: "split", to: "d3" }, { id: "e3b", from: "d3", to: "p3" }, { id: "e3c", from: "p3", to: "g3" }, { id: "e3d", from: "g3", to: "out3" }
    ]
  },

  // Advanced: Gamelan
  gamelan: {
    name: "Advanced: Gamelan",
    description: "Indonesian gamelan-inspired metallic tones with interlocking rhythms and harmonics.",
    bpm: 85,
    nodes: [
      // Gong - low, slow
      { id: "gong_src", type: "source", x: 60, y: 150, props: { interval: 8, midiNote: 36, intensity: 0.8 } },
      { id: "gong_pol", type: "polariser", x: 180, y: 150, props: { wave: "sine", attack: 0.02, decay: 4.0 } },
      { id: "gong_h", type: "harmonic", x: 300, y: 150, props: { ratio: 2.2, wave: "sine", attack: 0.03, decay: 3.0 } },
      { id: "gong_out", type: "speaker", x: 420, y: 150, props: { reverb: 0.8, pan: 0 } },
      
      // Kenong - medium
      { id: "ken_src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "ken_pol", type: "polariser", x: 180, y: 300, props: { wave: "triangle", attack: 0.01, decay: 1.5 } },
      { id: "ken_h1", type: "harmonic", x: 300, y: 300, props: { ratio: 2.76, wave: "sine", attack: 0.02, decay: 1.2 } },
      { id: "ken_h2", type: "harmonic", x: 400, y: 300, props: { ratio: 5.4, wave: "sine", attack: 0.03, decay: 0.8 } },
      { id: "ken_out", type: "speaker", x: 520, y: 300, props: { reverb: 0.6, pan: -0.3 } },
      
      // Bonang - high, fast
      { id: "bon_src", type: "source", x: 60, y: 450, props: { interval: 0.5, midiNote: 72, intensity: 0.5 } },
      { id: "bon_gate", type: "gate", x: 160, y: 450, props: { prob: 0.7 } },
      { id: "bon_pol", type: "polariser", x: 260, y: 450, props: { wave: "sine", attack: 0.005, decay: 0.5 } },
      { id: "bon_h", type: "harmonic", x: 360, y: 450, props: { ratio: 3.14, wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "bon_out", type: "speaker", x: 480, y: 450, props: { reverb: 0.5, pan: 0.3 } },
      
      // Peking - highest, fastest interlocking
      { id: "pek_src", type: "source", x: 550, y: 300, props: { interval: 0.25, midiNote: 84, intensity: 0.4 } },
      { id: "pek_gate", type: "gate", x: 640, y: 300, props: { prob: 0.5 } },
      { id: "pek_pol", type: "polariser", x: 730, y: 300, props: { wave: "sine", attack: 0.002, decay: 0.2 } },
      { id: "pek_h", type: "harmonic", x: 820, y: 300, props: { ratio: 4.16, wave: "sine", attack: 0.005, decay: 0.15 } },
      { id: "pek_out", type: "speaker", x: 910, y: 300, props: { reverb: 0.4, pan: 0.5 } }
    ],
    edges: [
      { id: "e_g1", from: "gong_src", to: "gong_pol" }, { id: "e_g2", from: "gong_pol", to: "gong_h" },
      { id: "e_g3", from: "gong_h", to: "gong_out" },
      { id: "e_k1", from: "ken_src", to: "ken_pol" }, { id: "e_k2", from: "ken_pol", to: "ken_h1" },
      { id: "e_k3", from: "ken_h1", to: "ken_h2" }, { id: "e_k4", from: "ken_h2", to: "ken_out" },
      { id: "e_b1", from: "bon_src", to: "bon_gate" }, { id: "e_b2", from: "bon_gate", to: "bon_pol" },
      { id: "e_b3", from: "bon_pol", to: "bon_h" }, { id: "e_b4", from: "bon_h", to: "bon_out" },
      { id: "e_p1", from: "pek_src", to: "pek_gate" }, { id: "e_p2", from: "pek_gate", to: "pek_pol" },
      { id: "e_p3", from: "pek_pol", to: "pek_h" }, { id: "e_p4", from: "pek_h", to: "pek_out" }
    ]
  },

  // Advanced: Pentatonic Jam
  pentatonic_jam: {
    name: "Advanced: Pentatonic Jam",
    description: "A complete jam using quantizer for pentatonic scale, LFO modulation, and virtual edges for precise timing.",
    bpm: 100,
    nodes: [
      { id: "bass_src", type: "source", x: 60, y: 150, props: { interval: 2, noteIndex: -1, intensity: 0.8 } },
      { id: "bass_q", type: "quantizer", x: 160, y: 150, props: { strength: 1.0 } },
      { id: "bass_p", type: "pitch", x: 260, y: 150, props: { shift: -12 } },
      { id: "bass_pol", type: "polariser", x: 360, y: 150, props: { wave: "sawtooth", attack: 0.02, decay: 0.5 } },
      { id: "bass_flt", type: "filter", x: 460, y: 150, props: { cutoff: 400, mod: 800, attack: 0.01, decay: 0.3 } },
      { id: "bass_out", type: "speaker", x: 560, y: 150, props: { reverb: 0.2, pan: 0 } },
      
      { id: "mel_src", type: "source", x: 60, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.5 } },
      { id: "mel_gate", type: "gate", x: 140, y: 300, props: { prob: 0.6 } },
      { id: "mel_q", type: "quantizer", x: 220, y: 300, props: { strength: 1.0 } },
      { id: "mel_split", type: "splitter", x: 300, y: 300, props: {} },
      
      { id: "mel_pol1", type: "polariser", x: 400, y: 250, props: { wave: "triangle", attack: 0.01, decay: 0.25 } },
      { id: "mel_out1", type: "speaker", x: 500, y: 250, props: { reverb: 0.5, pan: -0.4 } },
      
      { id: "mel_pol2", type: "polariser", x: 400, y: 350, props: { wave: "sine", attack: 0.01, decay: 0.2 } },
      { id: "mel_out2", type: "speaker", x: 500, y: 350, props: { reverb: 0.5, pan: 0.4 } },
      
      { id: "arp_src", type: "source", x: 60, y: 480, props: { interval: 4, midiNote: 72, intensity: 0.4 } },
      { id: "arp_split", type: "splitter", x: 160, y: 480, props: {} },
      { id: "arp_q", type: "quantizer", x: 260, y: 480, props: { strength: 1.0 } },
      { id: "arp_pol", type: "polariser", x: 360, y: 480, props: { wave: "sine", attack: 0.005, decay: 0.15 } },
      { id: "arp_out", type: "speaker", x: 460, y: 480, props: { reverb: 0.7, pan: 0 } },
      
      { id: "lfo_filter", type: "lfo", x: 460, y: 80, props: { rate: 0.3, shape: "sine", min: 300, max: 1200 } }
    ],
    edges: [
      { id: "e_b1", from: "bass_src", to: "bass_q" },
      { id: "e_b2", from: "bass_q", to: "bass_p" },
      { id: "e_b3", from: "bass_p", to: "bass_pol" },
      { id: "e_b4", from: "bass_pol", to: "bass_flt" },
      { id: "e_b5", from: "bass_flt", to: "bass_out" },
      { id: "e_m1", from: "mel_src", to: "mel_gate" },
      { id: "e_m2", from: "mel_gate", to: "mel_q" },
      { id: "e_m3", from: "mel_q", to: "mel_split" },
      { id: "e_m4", from: "mel_split", to: "mel_pol1" },
      { id: "e_m5", from: "mel_pol1", to: "mel_out1" },
      { id: "e_m6", from: "mel_split", to: "mel_pol2", timingMode: "fixed", durationBeats: 0.25 },
      { id: "e_m7", from: "mel_pol2", to: "mel_out2" },
      { id: "e_a1", from: "arp_src", to: "arp_split" },
      { id: "e_a2", from: "arp_split", to: "arp_q", timingMode: "fixed", durationBeats: 0 },
      { id: "e_a3", from: "arp_q", to: "arp_pol" },
      { id: "e_a4", from: "arp_pol", to: "arp_out" },
      { id: "e_lfo", from: "lfo_filter", to: "bass_flt", targetParam: "cutoff" }
    ]
  },

  // Advanced: Krell Patch
  ambient_krell: {
    name: "Advanced: Krell Patch",
    description: "A 'Krell' style generative patch with random notes and varying envelope lengths.",
    bpm: 80,
    nodes: [
      { id: "clock", type: "source", x: 50, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.7 } },
      { id: "gate", type: "gate", x: 150, y: 300, props: { prob: 0.4 } },
      { id: "quant", type: "quantizer", x: 250, y: 300, props: { strength: 1.0 } },
      
      { id: "lfo_decay", type: "lfo", x: 250, y: 150, props: { rate: 0.2, min: 0.1, max: 2.0, shape: "sine" } },
      
      { id: "pol", type: "polariser", x: 400, y: 300, props: { wave: "sine", attack: 0.05, decay: 0.5 } },
      { id: "delay", type: "delay", x: 550, y: 300, props: { delayTime: 0.75 } },
      { id: "spk", type: "speaker", x: 700, y: 300, props: { reverb: 0.6, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "clock", to: "gate" },
      { id: "e2", from: "gate", to: "quant" },
      { id: "e3", from: "quant", to: "pol" },
      { id: "e4", from: "pol", to: "delay" },
      { id: "e5", from: "delay", to: "spk" }
    ]
  },

  // Advanced: Gravity Tempo
  gravity_tempo: {
    name: "Advanced: Gravity Tempo",
    description: "Demonstrates gravity physics - heavy nodes (high mass) slow down approaching packets, creating ritardando effects.",
    bpm: 100,
    nodes: [
      { id: "src1", type: "source", x: 60, y: 200, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "light_gain", type: "gain", x: 200, y: 200, props: { value: 1.0 } },
      { id: "pol1", type: "polariser", x: 340, y: 200, props: { wave: "sine", attack: 0.01, decay: 0.4 } },
      { id: "out1", type: "speaker", x: 480, y: 200, props: { reverb: 0.3, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 350, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "heavy_gain", type: "gain", x: 200, y: 350, props: { value: 1.0 } },
      { id: "pol2", type: "polariser", x: 340, y: 350, props: { wave: "sine", attack: 0.01, decay: 0.4 } },
      { id: "out2", type: "speaker", x: 480, y: 350, props: { reverb: 0.3, pan: 0.5 } },
      
      { id: "src3", type: "source", x: 60, y: 500, props: { interval: 2, midiNote: 48, intensity: 0.5 } },
      { id: "heavy_spk", type: "speaker", x: 300, y: 500, props: { reverb: 0.4, pan: 0 } }
    ],
    edges: [
      { id: "e1a", from: "src1", to: "light_gain" }, { id: "e1b", from: "light_gain", to: "pol1" }, { id: "e1c", from: "pol1", to: "out1" },
      { id: "e2a", from: "src2", to: "heavy_gain" }, { id: "e2b", from: "heavy_gain", to: "pol2" }, { id: "e2c", from: "pol2", to: "out2" },
      { id: "e3a", from: "src3", to: "heavy_spk" }
    ]
  },

  // Advanced: AHD Envelopes
  ahd_envelopes: {
    name: "Advanced: AHD Envelopes",
    description: "Demonstrates AHD (Attack-Hold-Decay) envelopes. Compare short staccato vs sustained organ-like tones.",
    bpm: 60,
    nodes: [
      { id: "src1", type: "source", x: 60, y: 180, props: { interval: 4, midiNote: 60, intensity: 0.7 } },
      { id: "pol1", type: "polariser", x: 180, y: 180, props: { wave: "sine", attack: 0.01, decay: 0.2 } },
      { id: "staccato", type: "speaker", x: 300, y: 180, props: { reverb: 0.2, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.7 } },
      { id: "pol2", type: "polariser", x: 180, y: 300, props: { wave: "sine", attack: 0.3, decay: 0.5 } },
      { id: "sustained", type: "speaker", x: 300, y: 300, props: { reverb: 0.4, pan: 0 } },
      
      { id: "src3", type: "source", x: 60, y: 420, props: { interval: 4, midiNote: 60, intensity: 0.7 } },
      { id: "pol3", type: "polariser", x: 180, y: 420, props: { wave: "triangle", attack: 0.8, decay: 0.1 } },
      { id: "organ", type: "speaker", x: 300, y: 420, props: { reverb: 0.6, pan: 0.5 } }
    ],
    edges: [
      { id: "e1a", from: "src1", to: "pol1" }, { id: "e1b", from: "pol1", to: "staccato" },
      { id: "e2a", from: "src2", to: "pol2" }, { id: "e2b", from: "pol2", to: "sustained" },
      { id: "e3a", from: "src3", to: "pol3" }, { id: "e3b", from: "pol3", to: "organ" }
    ]
  }

};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load an example into the graph store
 */
export function loadExample(exampleKey: string): void {
  const example = EXAMPLES[exampleKey];
  if (!example) {
    console.error(`Example not found: ${exampleKey}`);
    return;
  }
  
  // Get store dynamically to avoid circular imports
  import('@core/store').then(({ getGraphStore }) => {
    const store = getGraphStore();
    
    // Clear current graph
    store.clear();
    
    // Set BPM
    store.setMasterSpeed(example.bpm);
    
    // Create ID mapping
    const idMap = new Map<string, string>();
    
    // Add nodes
    example.nodes.forEach(node => {
      const newId = store.addNode(node.type, node.x, node.y);
      idMap.set(node.id, newId);
      store.updateNodeProps(newId, node.props);
    });
    
    // Add edges with timing options
    example.edges.forEach(edge => {
      const fromId = idMap.get(edge.from);
      const toId = idMap.get(edge.to);
      if (fromId && toId) {
        store.addEdge(fromId as never, toId as never, {
          timingMode: edge.timingMode ?? 'physical',
          durationBeats: edge.durationBeats ?? null,
          targetParam: edge.targetParam ?? null
        } as never);
      }
    });
    
    // Reset view
    store.setPan(0, 0);
    store.setZoom(1);
    
    console.log(`Loaded example: ${example.name}`);
  });
}

/**
 * Get list of example keys
 */
export function getExampleKeys(): string[] {
  return Object.keys(EXAMPLES);
}

/**
 * Get example info
 */
export function getExampleInfo(key: string): { name: string; description: string } | null {
  const example = EXAMPLES[key];
  if (!example) return null;
  return { name: example.name, description: example.description };
}
