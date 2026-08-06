// Stochastic v2 - Example Compositions

import type { NodeType, ScaleName, NodeId } from '@core/types';
import { getGraphStore } from '@core/store';

// ============================================================================
// EXAMPLE TYPE
// ============================================================================

export interface ExampleNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

export interface ExampleEdge {
  id: string;
  from: string;
  to: string;
  timingMode?: 'physical' | 'fixed';
  durationBeats?: number;
  targetParam?: string;
}

export interface ExampleScene {
  name: string;
  color: string;
  durationBeats: number;
  loopCount: number;
  localBpm?: number | null;
  localRoot?: number | null;
  localScale?: ScaleName | null;
  nodes: ExampleNode[];
  edges: ExampleEdge[];
}

/** Menu categories, in display order. Every example must declare one. */
export const EXAMPLE_CATEGORIES = [
  'Tutorials',
  'Demos',
  'Synthesis',
  'Generative',
  'Effects & Routing',
  'Composition',
  'Physics & Timing',
  'Orchestral',
  'Evolutionary',
] as const;

export type ExampleCategory = (typeof EXAMPLE_CATEGORIES)[number];

export interface Example {
  name: string;
  category: ExampleCategory;
  description: string;
  bpm: number;
  // Single-scene examples (legacy format)
  nodes?: ExampleNode[];
  edges?: ExampleEdge[];
  // Multi-scene examples
  scenes?: ExampleScene[];
}

// ============================================================================
// TUTORIAL EXAMPLES
// ============================================================================

/**
 * Bundled fallback examples.
 *
 * The full library (50+ examples and complete .sto compositions) lives in
 * the example library and is fetched on demand with caching — see
 * `example-library.ts`. Only the examples needed for instant, offline-safe
 * onboarding are bundled here: the tutorial and the welcome-screen demo.
 */
export const BUNDLED_EXAMPLES: Record<string, Example> = {
  tutorial: {
    name: "Tutorial: Learn Stochastic",
    category: "Tutorials",
    description: "A complete interactive tutorial with 10 scenes teaching you Stochastic from basics to advanced concepts. Use the Scene Panel to navigate between lessons.",
    bpm: 100,
    scenes: [
      // Scene 1: First Sound
      {
        name: "1. First Sound",
        color: "#4caf50",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 150, y: 300, props: { interval: 1, midiNote: 60, noteIndex: -2, intensity: 0.7 } },
          { id: "spk", type: "speaker", x: 350, y: 300, props: { reverb: 0.3, pan: 0 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "spk" }
        ]
      },
      // Scene 2: Pitch Shifting
      {
        name: "2. Pitch Shifting",
        color: "#8bc34a",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 48, noteIndex: -2, intensity: 0.6 } },
          { id: "p1", type: "pitch", x: 250, y: 300, props: { shift: 7 } },
          { id: "spk", type: "speaker", x: 400, y: 300, props: { reverb: 0.3, pan: 0 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "p1" },
          { id: "e2", from: "p1", to: "spk" }
        ]
      },
      // Scene 3: Shaping Sound
      {
        name: "3. Shaping Sound",
        color: "#cddc39",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "src1", type: "source", x: 100, y: 200, props: { interval: 2, midiNote: 60, noteIndex: -2, intensity: 0.6 } },
          { id: "pol1", type: "oscillator", x: 250, y: 200, props: { wave: "sine", attack: 0.1, decay: 0.8 } },
          { id: "spk1", type: "speaker", x: 400, y: 200, props: { reverb: 0.4, pan: -0.5 } },
          
          { id: "src2", type: "source", x: 100, y: 400, props: { interval: 2, midiNote: 60, noteIndex: -2, intensity: 0.6 } },
          { id: "pol2", type: "oscillator", x: 250, y: 400, props: { wave: "sawtooth", attack: 0.01, decay: 0.3 } },
          { id: "spk2", type: "speaker", x: 400, y: 400, props: { reverb: 0.2, pan: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "src1", to: "pol1" }, { id: "e2", from: "pol1", to: "spk1" },
          { id: "e3", from: "src2", to: "pol2" }, { id: "e4", from: "pol2", to: "spk2" }
        ]
      },
      // Scene 4: Chords (Splitting Paths)
      {
        name: "4. Chords",
        color: "#ffeb3b",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 60, noteIndex: -2, intensity: 0.6 } },
          
          { id: "pol1", type: "oscillator", x: 250, y: 180, props: { wave: "sine", attack: 0.05, decay: 0.6 } },
          { id: "spk1", type: "speaker", x: 400, y: 180, props: { reverb: 0.5, pan: -0.5 } },
          
          { id: "p2", type: "pitch", x: 250, y: 300, props: { shift: 4 } },
          { id: "pol2", type: "oscillator", x: 350, y: 300, props: { wave: "triangle", attack: 0.05, decay: 0.6 } },
          { id: "spk2", type: "speaker", x: 500, y: 300, props: { reverb: 0.5, pan: 0 } },
          
          { id: "p3", type: "pitch", x: 250, y: 420, props: { shift: 7 } },
          { id: "pol3", type: "oscillator", x: 350, y: 420, props: { wave: "sine", attack: 0.05, decay: 0.6 } },
          { id: "spk3", type: "speaker", x: 500, y: 420, props: { reverb: 0.5, pan: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "pol1" }, { id: "e1b", from: "pol1", to: "spk1" },
          { id: "e2", from: "src", to: "p2" }, { id: "e2b", from: "p2", to: "pol2" }, { id: "e2c", from: "pol2", to: "spk2" },
          { id: "e3", from: "src", to: "p3" }, { id: "e3b", from: "p3", to: "pol3" }, { id: "e3c", from: "pol3", to: "spk3" }
        ]
      },
      // Scene 5: Randomness
      {
        name: "5. Randomness",
        color: "#ffc107",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.5 } },
          { id: "gate", type: "gate", x: 220, y: 300, props: { probability: 0.6 } },
          { id: "pol", type: "oscillator", x: 340, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.25 } },
          { id: "spk", type: "speaker", x: 460, y: 300, props: { reverb: 0.4, pan: 0 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "gate" },
          { id: "e2", from: "gate", to: "pol" },
          { id: "e3", from: "pol", to: "spk" }
        ]
      },
      // Scene 6: Delays
      {
        name: "6. Delays",
        color: "#ff9800",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 80, y: 300, props: { interval: 4, midiNote: 60, noteIndex: -2, intensity: 0.6 } },
          
          { id: "pol1", type: "oscillator", x: 220, y: 180, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
          { id: "spk1", type: "speaker", x: 380, y: 180, props: { reverb: 0.3, pan: -0.4 } },
          
          { id: "d2", type: "delay", x: 200, y: 300, props: { delayTime: 1 } },
          { id: "pol2", type: "oscillator", x: 320, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
          { id: "spk2", type: "speaker", x: 460, y: 300, props: { reverb: 0.3, pan: 0 } },
          
          { id: "d3", type: "delay", x: 200, y: 420, props: { delayTime: 2 } },
          { id: "pol3", type: "oscillator", x: 320, y: 420, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
          { id: "spk3", type: "speaker", x: 460, y: 420, props: { reverb: 0.3, pan: 0.4 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "pol1" }, { id: "e1b", from: "pol1", to: "spk1" },
          { id: "e2", from: "src", to: "d2" }, { id: "e2b", from: "d2", to: "pol2" }, { id: "e2c", from: "pol2", to: "spk2" },
          { id: "e3", from: "src", to: "d3" }, { id: "e3b", from: "d3", to: "pol3" }, { id: "e3c", from: "pol3", to: "spk3" }
        ]
      },
      // Scene 7: Filters
      {
        name: "7. Filters",
        color: "#ff5722",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 48, noteIndex: -2, intensity: 0.7 } },
          { id: "pol", type: "oscillator", x: 220, y: 300, props: { wave: "sawtooth", attack: 0.02, decay: 1.0 } },
          { id: "flt", type: "filter", x: 340, y: 300, props: { cutoff: 800, mod: 2000, attack: 0.01, decay: 0.4 } },
          { id: "spk", type: "speaker", x: 460, y: 300, props: { reverb: 0.4, pan: 0 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "pol" },
          { id: "e2", from: "pol", to: "flt" },
          { id: "e3", from: "flt", to: "spk" }
        ]
      },
      // Scene 8: Dynamics (Gain)
      {
        name: "8. Dynamics",
        color: "#e91e63",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 80, y: 300, props: { interval: 2, midiNote: 60, noteIndex: -2, intensity: 0.5 } },
          
          { id: "g1", type: "gain", x: 200, y: 180, props: { value: 0.3 } },
          { id: "pol1", type: "oscillator", x: 320, y: 180, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
          { id: "spk1", type: "speaker", x: 440, y: 180, props: { reverb: 0.3, pan: -0.3 } },
          
          { id: "pol2", type: "oscillator", x: 250, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
          { id: "spk2", type: "speaker", x: 400, y: 300, props: { reverb: 0.3, pan: 0 } },
          
          { id: "g3", type: "gain", x: 200, y: 420, props: { value: 1.5 } },
          { id: "pol3", type: "oscillator", x: 320, y: 420, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
          { id: "spk3", type: "speaker", x: 440, y: 420, props: { reverb: 0.3, pan: 0.3 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "g1" }, { id: "e1b", from: "g1", to: "pol1" }, { id: "e1c", from: "pol1", to: "spk1" },
          { id: "e2", from: "src", to: "pol2" }, { id: "e2b", from: "pol2", to: "spk2" },
          { id: "e3", from: "src", to: "g3" }, { id: "e3b", from: "g3", to: "pol3" }, { id: "e3c", from: "pol3", to: "spk3" }
        ]
      },
      // Scene 9: Tunnels
      {
        name: "9. Tunnels",
        color: "#9c27b0",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 4, midiNote: 60, noteIndex: -2, intensity: 0.6 } },
          { id: "string", type: "tunnel", x: 280, y: 300, props: {
            tunnelName: "String",
            subNodes: [
              { type: "oscillator", props: { wave: "sawtooth", attack: 0.2, decay: 1.5, mix: 1.0 } },
              { type: "oscillator", props: { ratio: 2, wave: "sine", attack: 0.15, decay: 1.2, mix: 0.3 } },
              { type: "modulator", props: { rate: 5, depth: 15, delay: 0.3 } },
              { type: "filter", props: { cutoff: 2000, mod: 1000, attack: 0.1, decay: 0.8 } }
            ]
          }},
          { id: "spk", type: "speaker", x: 460, y: 300, props: { reverb: 0.5, pan: 0 } }
        ],
        edges: [
          { id: "e1", from: "src", to: "string" },
          { id: "e2", from: "string", to: "spk" }
        ]
      },
      // Scene 10: Scene Triggering (two sub-scenes demonstrating the concept)
      {
        name: "10. Scene Triggers",
        color: "#673ab7",
        durationBeats: 16,
        loopCount: 1,
        nodes: [
          { id: "src1", type: "source", x: 100, y: 200, props: { interval: 1, midiNote: 60, noteIndex: -2, intensity: 0.7 } },
          { id: "spk1", type: "speaker", x: 300, y: 200, props: { reverb: 0.3, pan: -0.3 } },
          { id: "src2", type: "source", x: 100, y: 400, props: { interval: 4, midiNote: 60, noteIndex: -2, intensity: 0.5 } },
          { id: "trig1", type: "scene_trigger", x: 300, y: 400, props: { targetSceneIndex: 0, behavior: "jump" } }
        ],
        edges: [
          { id: "e1", from: "src1", to: "spk1" },
          { id: "e2", from: "src2", to: "trig1", timingMode: "fixed", durationBeats: 4 }
        ]
      }
    ]
  },

  // ============================================================================
  // DEMO COMPOSITIONS
  // ============================================================================

  // Demo: Mozart's Dice Game

  pachelbel_canon: {
    name: "Orchestral: Canon in D",
    category: "Orchestral",
    description: "Pachelbel's Canon - Ground bass (D-A-B-F#-G-D-G-A) with canon melody entering on staggered string voices. One trigger starts the 8-note sequence that cascades through all voices.",
    bpm: 60,
    nodes: [
      // =====================================================================
      // GROUND BASS - 8 notes in sequence using delays
      // D(38)-A(33)-B(35)-F#(30)-G(31)-D(38)-G(31)-A(33)
      // Each note 2 beats apart, total cycle = 16 beats
      // =====================================================================
      { id: "bass_trigger", type: "source", x: 60, y: 700, props: { interval: 16, midiNote: 38, noteIndex: -2, intensity: 0.55 } },
      { id: "bass_split", type: "splitter", x: 140, y: 700, props: {} },
      
      // Note 1: D (beat 0) - direct from source
      { id: "bass_d1", type: "pitch", x: 220, y: 600, props: { mode: 'set', shift: 0, fixedMidiNote: 38 } },
      // Note 2: A (beat 2)
      { id: "bass_del2", type: "delay", x: 220, y: 640, props: { delayTime: 2 } },
      { id: "bass_a1", type: "pitch", x: 300, y: 640, props: { mode: 'set', shift: 0, fixedMidiNote: 33 } },
      // Note 3: B (beat 4)
      { id: "bass_del3", type: "delay", x: 220, y: 680, props: { delayTime: 4 } },
      { id: "bass_b1", type: "pitch", x: 300, y: 680, props: { mode: 'set', shift: 0, fixedMidiNote: 35 } },
      // Note 4: F# (beat 6)
      { id: "bass_del4", type: "delay", x: 220, y: 720, props: { delayTime: 6 } },
      { id: "bass_fs", type: "pitch", x: 300, y: 720, props: { mode: 'set', shift: 0, fixedMidiNote: 30 } },
      // Note 5: G (beat 8)
      { id: "bass_del5", type: "delay", x: 220, y: 760, props: { delayTime: 8 } },
      { id: "bass_g1", type: "pitch", x: 300, y: 760, props: { mode: 'set', shift: 0, fixedMidiNote: 31 } },
      // Note 6: D (beat 10)
      { id: "bass_del6", type: "delay", x: 220, y: 800, props: { delayTime: 10 } },
      { id: "bass_d2", type: "pitch", x: 300, y: 800, props: { mode: 'set', shift: 0, fixedMidiNote: 38 } },
      // Note 7: G (beat 12)
      { id: "bass_del7", type: "delay", x: 220, y: 840, props: { delayTime: 12 } },
      { id: "bass_g2", type: "pitch", x: 300, y: 840, props: { mode: 'set', shift: 0, fixedMidiNote: 31 } },
      // Note 8: A (beat 14)
      { id: "bass_del8", type: "delay", x: 220, y: 880, props: { delayTime: 14 } },
      { id: "bass_a2", type: "pitch", x: 300, y: 880, props: { mode: 'set', shift: 0, fixedMidiNote: 33 } },
      
      // Bass instrument (shared by all bass notes)
      { id: "bass_tun", type: "tunnel", x: 420, y: 740, props: {
        tunnelName: "Contrabass",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.28, decay: 1.8, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.32, decay: 1.6, mix: 0.22 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.25, decay: 1.5, mix: 0.45 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.22, decay: 1.3, mix: 0.2 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.3, decay: 1.2, mix: 0.04 } },
          { type: 'modulator', props: { rate: 4.2, depth: 12, delay: 0.7 } },
          { type: 'filter', props: { cutoff: 700, mod: 400, attack: 0.2, decay: 1.2 } }
        ]
      }},
      { id: "bass_out", type: "speaker", x: 560, y: 740, props: { reverb: 0.45, pan: 0 } },
      
      // =====================================================================
      // CANON MELODY - 8 notes: F#-E-D-C#-B-A-B-C# (one octave up)
      // Same structure, but enters on violin voices at staggered times
      // Voice 1 (Violin 1): immediate
      // Voice 2 (Violin 2): +16 beats (next cycle)
      // Voice 3 (Viola): +32 beats
      // =====================================================================
      
      // Melody trigger - fires every 16 beats
      { id: "mel_trigger", type: "source", x: 60, y: 100, props: { interval: 16, midiNote: 66, noteIndex: -2, intensity: 0.5 } },
      { id: "mel_split", type: "splitter", x: 140, y: 100, props: {} },
      
      // ========== VIOLIN 1 (enters immediately) ==========
      { id: "v1_split", type: "splitter", x: 220, y: 60, props: {} },
      // 8 melody notes for Violin 1
      { id: "v1_n1", type: "pitch", x: 300, y: 20, props: { mode: 'set', shift: 0, fixedMidiNote: 78 } },  // F#5
      { id: "v1_d2", type: "delay", x: 300, y: 40, props: { delayTime: 2 } },
      { id: "v1_n2", type: "pitch", x: 380, y: 40, props: { mode: 'set', shift: 0, fixedMidiNote: 76 } },  // E5
      { id: "v1_d3", type: "delay", x: 300, y: 60, props: { delayTime: 4 } },
      { id: "v1_n3", type: "pitch", x: 380, y: 60, props: { mode: 'set', shift: 0, fixedMidiNote: 74 } },  // D5
      { id: "v1_d4", type: "delay", x: 300, y: 80, props: { delayTime: 6 } },
      { id: "v1_n4", type: "pitch", x: 380, y: 80, props: { mode: 'set', shift: 0, fixedMidiNote: 73 } },  // C#5
      { id: "v1_d5", type: "delay", x: 300, y: 100, props: { delayTime: 8 } },
      { id: "v1_n5", type: "pitch", x: 380, y: 100, props: { mode: 'set', shift: 0, fixedMidiNote: 71 } }, // B4
      { id: "v1_d6", type: "delay", x: 300, y: 120, props: { delayTime: 10 } },
      { id: "v1_n6", type: "pitch", x: 380, y: 120, props: { mode: 'set', shift: 0, fixedMidiNote: 69 } }, // A4
      { id: "v1_d7", type: "delay", x: 300, y: 140, props: { delayTime: 12 } },
      { id: "v1_n7", type: "pitch", x: 380, y: 140, props: { mode: 'set', shift: 0, fixedMidiNote: 71 } }, // B4
      { id: "v1_d8", type: "delay", x: 300, y: 160, props: { delayTime: 14 } },
      { id: "v1_n8", type: "pitch", x: 380, y: 160, props: { mode: 'set', shift: 0, fixedMidiNote: 73 } }, // C#5
      
      { id: "v1_tun", type: "tunnel", x: 500, y: 90, props: {
        tunnelName: "Violin 1",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.25, decay: 1.8, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.28, decay: 1.6, mix: 0.35 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.22, decay: 1.4, mix: 0.25 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.18, decay: 1.2, mix: 0.12 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.3, decay: 1.0, mix: 0.04 } },
          { type: 'modulator', props: { rate: 5.2, depth: 18, delay: 0.5 } },
          { type: 'filter', props: { cutoff: 2800, mod: 1200, attack: 0.2, decay: 1.0 } }
        ]
      }},
      { id: "v1_out", type: "speaker", x: 640, y: 90, props: { reverb: 0.55, pan: -0.35 } },
      
      // ========== VIOLIN 2 (enters at beat 16 - one cycle later) ==========
      { id: "v2_entry", type: "delay", x: 220, y: 220, props: { delayTime: 16 } },
      { id: "v2_split", type: "splitter", x: 300, y: 220, props: {} },
      // 8 melody notes for Violin 2 (same pitches, delayed)
      { id: "v2_n1", type: "pitch", x: 380, y: 180, props: { mode: 'set', shift: 0, fixedMidiNote: 78 } },
      { id: "v2_d2", type: "delay", x: 380, y: 200, props: { delayTime: 2 } },
      { id: "v2_n2", type: "pitch", x: 460, y: 200, props: { mode: 'set', shift: 0, fixedMidiNote: 76 } },
      { id: "v2_d3", type: "delay", x: 380, y: 220, props: { delayTime: 4 } },
      { id: "v2_n3", type: "pitch", x: 460, y: 220, props: { mode: 'set', shift: 0, fixedMidiNote: 74 } },
      { id: "v2_d4", type: "delay", x: 380, y: 240, props: { delayTime: 6 } },
      { id: "v2_n4", type: "pitch", x: 460, y: 240, props: { mode: 'set', shift: 0, fixedMidiNote: 73 } },
      { id: "v2_d5", type: "delay", x: 380, y: 260, props: { delayTime: 8 } },
      { id: "v2_n5", type: "pitch", x: 460, y: 260, props: { mode: 'set', shift: 0, fixedMidiNote: 71 } },
      { id: "v2_d6", type: "delay", x: 380, y: 280, props: { delayTime: 10 } },
      { id: "v2_n6", type: "pitch", x: 460, y: 280, props: { mode: 'set', shift: 0, fixedMidiNote: 69 } },
      { id: "v2_d7", type: "delay", x: 380, y: 300, props: { delayTime: 12 } },
      { id: "v2_n7", type: "pitch", x: 460, y: 300, props: { mode: 'set', shift: 0, fixedMidiNote: 71 } },
      { id: "v2_d8", type: "delay", x: 380, y: 320, props: { delayTime: 14 } },
      { id: "v2_n8", type: "pitch", x: 460, y: 320, props: { mode: 'set', shift: 0, fixedMidiNote: 73 } },
      
      { id: "v2_tun", type: "tunnel", x: 580, y: 250, props: {
        tunnelName: "Violin 2",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.25, decay: 1.8, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.28, decay: 1.6, mix: 0.35 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.22, decay: 1.4, mix: 0.25 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.18, decay: 1.2, mix: 0.12 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.3, decay: 1.0, mix: 0.04 } },
          { type: 'modulator', props: { rate: 5.3, depth: 17, delay: 0.5 } },
          { type: 'filter', props: { cutoff: 2800, mod: 1200, attack: 0.2, decay: 1.0 } }
        ]
      }},
      { id: "v2_out", type: "speaker", x: 720, y: 250, props: { reverb: 0.55, pan: 0.35 } },
      
      // ========== VIOLA (enters at beat 32 - two cycles later, octave lower) ==========
      { id: "va_entry", type: "delay", x: 220, y: 400, props: { delayTime: 32 } },
      { id: "va_split", type: "splitter", x: 300, y: 400, props: {} },
      // 8 melody notes for Viola (one octave lower: 66-64-62-61-59-57-59-61)
      { id: "va_n1", type: "pitch", x: 380, y: 360, props: { mode: 'set', shift: 0, fixedMidiNote: 66 } },  // F#4
      { id: "va_d2", type: "delay", x: 380, y: 380, props: { delayTime: 2 } },
      { id: "va_n2", type: "pitch", x: 460, y: 380, props: { mode: 'set', shift: 0, fixedMidiNote: 64 } },  // E4
      { id: "va_d3", type: "delay", x: 380, y: 400, props: { delayTime: 4 } },
      { id: "va_n3", type: "pitch", x: 460, y: 400, props: { mode: 'set', shift: 0, fixedMidiNote: 62 } },  // D4
      { id: "va_d4", type: "delay", x: 380, y: 420, props: { delayTime: 6 } },
      { id: "va_n4", type: "pitch", x: 460, y: 420, props: { mode: 'set', shift: 0, fixedMidiNote: 61 } },  // C#4
      { id: "va_d5", type: "delay", x: 380, y: 440, props: { delayTime: 8 } },
      { id: "va_n5", type: "pitch", x: 460, y: 440, props: { mode: 'set', shift: 0, fixedMidiNote: 59 } },  // B3
      { id: "va_d6", type: "delay", x: 380, y: 460, props: { delayTime: 10 } },
      { id: "va_n6", type: "pitch", x: 460, y: 460, props: { mode: 'set', shift: 0, fixedMidiNote: 57 } },  // A3
      { id: "va_d7", type: "delay", x: 380, y: 480, props: { delayTime: 12 } },
      { id: "va_n7", type: "pitch", x: 460, y: 480, props: { mode: 'set', shift: 0, fixedMidiNote: 59 } },  // B3
      { id: "va_d8", type: "delay", x: 380, y: 500, props: { delayTime: 14 } },
      { id: "va_n8", type: "pitch", x: 460, y: 500, props: { mode: 'set', shift: 0, fixedMidiNote: 61 } },  // C#4
      
      { id: "va_tun", type: "tunnel", x: 580, y: 430, props: {
        tunnelName: "Viola",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.2, decay: 1.7, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.23, decay: 1.5, mix: 0.28 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.18, decay: 1.4, mix: 0.35 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.15, decay: 1.2, mix: 0.18 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.22, decay: 1.0, mix: 0.03 } },
          { type: 'modulator', props: { rate: 5.0, depth: 20, delay: 0.55 } },
          { type: 'filter', props: { cutoff: 2200, mod: 1100, attack: 0.16, decay: 0.9 } }
        ]
      }},
      { id: "va_out", type: "speaker", x: 720, y: 430, props: { reverb: 0.5, pan: 0 } },
      
      // ========== CELLO (enters at beat 48 - three cycles later, two octaves lower) ==========
      { id: "vc_entry", type: "delay", x: 220, y: 560, props: { delayTime: 48 } },
      { id: "vc_split", type: "splitter", x: 300, y: 560, props: {} },
      // 8 melody notes for Cello (two octaves lower: 54-52-50-49-47-45-47-49)
      { id: "vc_n1", type: "pitch", x: 380, y: 520, props: { mode: 'set', shift: 0, fixedMidiNote: 54 } },  // F#3
      { id: "vc_d2", type: "delay", x: 380, y: 540, props: { delayTime: 2 } },
      { id: "vc_n2", type: "pitch", x: 460, y: 540, props: { mode: 'set', shift: 0, fixedMidiNote: 52 } },  // E3
      { id: "vc_d3", type: "delay", x: 380, y: 560, props: { delayTime: 4 } },
      { id: "vc_n3", type: "pitch", x: 460, y: 560, props: { mode: 'set', shift: 0, fixedMidiNote: 50 } },  // D3
      { id: "vc_d4", type: "delay", x: 380, y: 580, props: { delayTime: 6 } },
      { id: "vc_n4", type: "pitch", x: 460, y: 580, props: { mode: 'set', shift: 0, fixedMidiNote: 49 } },  // C#3
      { id: "vc_d5", type: "delay", x: 380, y: 600, props: { delayTime: 8 } },
      { id: "vc_n5", type: "pitch", x: 460, y: 600, props: { mode: 'set', shift: 0, fixedMidiNote: 47 } },  // B2
      { id: "vc_d6", type: "delay", x: 380, y: 620, props: { delayTime: 10 } },
      { id: "vc_n6", type: "pitch", x: 460, y: 620, props: { mode: 'set', shift: 0, fixedMidiNote: 45 } },  // A2
      { id: "vc_d7", type: "delay", x: 380, y: 640, props: { delayTime: 12 } },
      { id: "vc_n7", type: "pitch", x: 460, y: 640, props: { mode: 'set', shift: 0, fixedMidiNote: 47 } },  // B2
      { id: "vc_d8", type: "delay", x: 380, y: 660, props: { delayTime: 14 } },
      { id: "vc_n8", type: "pitch", x: 460, y: 660, props: { mode: 'set', shift: 0, fixedMidiNote: 49 } },  // C#3
      
      { id: "vc_tun", type: "tunnel", x: 580, y: 590, props: {
        tunnelName: "Cello",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.22, decay: 2.0, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.25, decay: 1.8, mix: 0.25 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.2, decay: 1.6, mix: 0.4 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.18, decay: 1.4, mix: 0.25 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.25, decay: 1.2, mix: 0.035 } },
          { type: 'modulator', props: { rate: 4.8, depth: 22, delay: 0.6 } },
          { type: 'filter', props: { cutoff: 1600, mod: 1000, attack: 0.18, decay: 1.2 } }
        ]
      }},
      { id: "vc_out", type: "speaker", x: 720, y: 590, props: { reverb: 0.5, pan: -0.2 } }
    ],
    edges: [
      // ===== BASS LINE =====
      { id: "eb1", from: "bass_trigger", to: "bass_split" },
      { id: "eb2", from: "bass_split", to: "bass_d1" },
      { id: "eb3", from: "bass_split", to: "bass_del2" }, { id: "eb3b", from: "bass_del2", to: "bass_a1" },
      { id: "eb4", from: "bass_split", to: "bass_del3" }, { id: "eb4b", from: "bass_del3", to: "bass_b1" },
      { id: "eb5", from: "bass_split", to: "bass_del4" }, { id: "eb5b", from: "bass_del4", to: "bass_fs" },
      { id: "eb6", from: "bass_split", to: "bass_del5" }, { id: "eb6b", from: "bass_del5", to: "bass_g1" },
      { id: "eb7", from: "bass_split", to: "bass_del6" }, { id: "eb7b", from: "bass_del6", to: "bass_d2" },
      { id: "eb8", from: "bass_split", to: "bass_del7" }, { id: "eb8b", from: "bass_del7", to: "bass_g2" },
      { id: "eb9", from: "bass_split", to: "bass_del8" }, { id: "eb9b", from: "bass_del8", to: "bass_a2" },
      // All bass notes → instrument → speaker
      { id: "ebt1", from: "bass_d1", to: "bass_tun" },
      { id: "ebt2", from: "bass_a1", to: "bass_tun" },
      { id: "ebt3", from: "bass_b1", to: "bass_tun" },
      { id: "ebt4", from: "bass_fs", to: "bass_tun" },
      { id: "ebt5", from: "bass_g1", to: "bass_tun" },
      { id: "ebt6", from: "bass_d2", to: "bass_tun" },
      { id: "ebt7", from: "bass_g2", to: "bass_tun" },
      { id: "ebt8", from: "bass_a2", to: "bass_tun" },
      { id: "ebout", from: "bass_tun", to: "bass_out" },
      
      // ===== MELODY TRIGGER → VOICES =====
      { id: "em1", from: "mel_trigger", to: "mel_split" },
      // Voice routing
      { id: "em_v1", from: "mel_split", to: "v1_split" },
      { id: "em_v2", from: "mel_split", to: "v2_entry" }, { id: "em_v2b", from: "v2_entry", to: "v2_split" },
      { id: "em_va", from: "mel_split", to: "va_entry" }, { id: "em_vab", from: "va_entry", to: "va_split" },
      { id: "em_vc", from: "mel_split", to: "vc_entry" }, { id: "em_vcb", from: "vc_entry", to: "vc_split" },
      
      // ===== VIOLIN 1 NOTES =====
      { id: "ev1_1", from: "v1_split", to: "v1_n1" },
      { id: "ev1_2", from: "v1_split", to: "v1_d2" }, { id: "ev1_2b", from: "v1_d2", to: "v1_n2" },
      { id: "ev1_3", from: "v1_split", to: "v1_d3" }, { id: "ev1_3b", from: "v1_d3", to: "v1_n3" },
      { id: "ev1_4", from: "v1_split", to: "v1_d4" }, { id: "ev1_4b", from: "v1_d4", to: "v1_n4" },
      { id: "ev1_5", from: "v1_split", to: "v1_d5" }, { id: "ev1_5b", from: "v1_d5", to: "v1_n5" },
      { id: "ev1_6", from: "v1_split", to: "v1_d6" }, { id: "ev1_6b", from: "v1_d6", to: "v1_n6" },
      { id: "ev1_7", from: "v1_split", to: "v1_d7" }, { id: "ev1_7b", from: "v1_d7", to: "v1_n7" },
      { id: "ev1_8", from: "v1_split", to: "v1_d8" }, { id: "ev1_8b", from: "v1_d8", to: "v1_n8" },
      { id: "ev1_t1", from: "v1_n1", to: "v1_tun" }, { id: "ev1_t2", from: "v1_n2", to: "v1_tun" },
      { id: "ev1_t3", from: "v1_n3", to: "v1_tun" }, { id: "ev1_t4", from: "v1_n4", to: "v1_tun" },
      { id: "ev1_t5", from: "v1_n5", to: "v1_tun" }, { id: "ev1_t6", from: "v1_n6", to: "v1_tun" },
      { id: "ev1_t7", from: "v1_n7", to: "v1_tun" }, { id: "ev1_t8", from: "v1_n8", to: "v1_tun" },
      { id: "ev1_out", from: "v1_tun", to: "v1_out" },
      
      // ===== VIOLIN 2 NOTES =====
      { id: "ev2_1", from: "v2_split", to: "v2_n1" },
      { id: "ev2_2", from: "v2_split", to: "v2_d2" }, { id: "ev2_2b", from: "v2_d2", to: "v2_n2" },
      { id: "ev2_3", from: "v2_split", to: "v2_d3" }, { id: "ev2_3b", from: "v2_d3", to: "v2_n3" },
      { id: "ev2_4", from: "v2_split", to: "v2_d4" }, { id: "ev2_4b", from: "v2_d4", to: "v2_n4" },
      { id: "ev2_5", from: "v2_split", to: "v2_d5" }, { id: "ev2_5b", from: "v2_d5", to: "v2_n5" },
      { id: "ev2_6", from: "v2_split", to: "v2_d6" }, { id: "ev2_6b", from: "v2_d6", to: "v2_n6" },
      { id: "ev2_7", from: "v2_split", to: "v2_d7" }, { id: "ev2_7b", from: "v2_d7", to: "v2_n7" },
      { id: "ev2_8", from: "v2_split", to: "v2_d8" }, { id: "ev2_8b", from: "v2_d8", to: "v2_n8" },
      { id: "ev2_t1", from: "v2_n1", to: "v2_tun" }, { id: "ev2_t2", from: "v2_n2", to: "v2_tun" },
      { id: "ev2_t3", from: "v2_n3", to: "v2_tun" }, { id: "ev2_t4", from: "v2_n4", to: "v2_tun" },
      { id: "ev2_t5", from: "v2_n5", to: "v2_tun" }, { id: "ev2_t6", from: "v2_n6", to: "v2_tun" },
      { id: "ev2_t7", from: "v2_n7", to: "v2_tun" }, { id: "ev2_t8", from: "v2_n8", to: "v2_tun" },
      { id: "ev2_out", from: "v2_tun", to: "v2_out" },
      
      // ===== VIOLA NOTES =====
      { id: "eva_1", from: "va_split", to: "va_n1" },
      { id: "eva_2", from: "va_split", to: "va_d2" }, { id: "eva_2b", from: "va_d2", to: "va_n2" },
      { id: "eva_3", from: "va_split", to: "va_d3" }, { id: "eva_3b", from: "va_d3", to: "va_n3" },
      { id: "eva_4", from: "va_split", to: "va_d4" }, { id: "eva_4b", from: "va_d4", to: "va_n4" },
      { id: "eva_5", from: "va_split", to: "va_d5" }, { id: "eva_5b", from: "va_d5", to: "va_n5" },
      { id: "eva_6", from: "va_split", to: "va_d6" }, { id: "eva_6b", from: "va_d6", to: "va_n6" },
      { id: "eva_7", from: "va_split", to: "va_d7" }, { id: "eva_7b", from: "va_d7", to: "va_n7" },
      { id: "eva_8", from: "va_split", to: "va_d8" }, { id: "eva_8b", from: "va_d8", to: "va_n8" },
      { id: "eva_t1", from: "va_n1", to: "va_tun" }, { id: "eva_t2", from: "va_n2", to: "va_tun" },
      { id: "eva_t3", from: "va_n3", to: "va_tun" }, { id: "eva_t4", from: "va_n4", to: "va_tun" },
      { id: "eva_t5", from: "va_n5", to: "va_tun" }, { id: "eva_t6", from: "va_n6", to: "va_tun" },
      { id: "eva_t7", from: "va_n7", to: "va_tun" }, { id: "eva_t8", from: "va_n8", to: "va_tun" },
      { id: "eva_out", from: "va_tun", to: "va_out" },
      
      // ===== CELLO NOTES =====
      { id: "evc_1", from: "vc_split", to: "vc_n1" },
      { id: "evc_2", from: "vc_split", to: "vc_d2" }, { id: "evc_2b", from: "vc_d2", to: "vc_n2" },
      { id: "evc_3", from: "vc_split", to: "vc_d3" }, { id: "evc_3b", from: "vc_d3", to: "vc_n3" },
      { id: "evc_4", from: "vc_split", to: "vc_d4" }, { id: "evc_4b", from: "vc_d4", to: "vc_n4" },
      { id: "evc_5", from: "vc_split", to: "vc_d5" }, { id: "evc_5b", from: "vc_d5", to: "vc_n5" },
      { id: "evc_6", from: "vc_split", to: "vc_d6" }, { id: "evc_6b", from: "vc_d6", to: "vc_n6" },
      { id: "evc_7", from: "vc_split", to: "vc_d7" }, { id: "evc_7b", from: "vc_d7", to: "vc_n7" },
      { id: "evc_8", from: "vc_split", to: "vc_d8" }, { id: "evc_8b", from: "vc_d8", to: "vc_n8" },
      { id: "evc_t1", from: "vc_n1", to: "vc_tun" }, { id: "evc_t2", from: "vc_n2", to: "vc_tun" },
      { id: "evc_t3", from: "vc_n3", to: "vc_tun" }, { id: "evc_t4", from: "vc_n4", to: "vc_tun" },
      { id: "evc_t5", from: "vc_n5", to: "vc_tun" }, { id: "evc_t6", from: "vc_n6", to: "vc_tun" },
      { id: "evc_t7", from: "vc_n7", to: "vc_tun" }, { id: "evc_t8", from: "vc_n8", to: "vc_tun" },
      { id: "evc_out", from: "vc_tun", to: "vc_out" }
    ]
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply example data to the graph store (adds its scenes to the project).
 * Works for bundled examples and for examples fetched from the library.
 */
export function applyExampleToStore(example: Example): void {
  const store = getGraphStore();

  // Stop any running playback so the example starts from a clean transport
  if (store.isRunning) {
    store.stopPlayback();
  }

  // Set BPM
  store.setMasterSpeed(example.bpm);

  // Check if this is a multi-scene example
  if (example.scenes && example.scenes.length > 0) {
    loadMultiSceneExample(store, example);
  } else if (example.nodes && example.edges) {
    loadSingleSceneExample(store, example);
  }

  // Reset view
  store.setPan(0, 0);
  store.setZoom(1);
}

/**
 * Load a bundled example into the graph store, synchronously.
 * Only the offline-safe onboarding set is bundled; everything else loads
 * through `loadExample` in example-library.ts.
 */
export function loadBundledExample(exampleKey: string): void {
  const example = BUNDLED_EXAMPLES[exampleKey];
  if (!example) {
    console.error(`Bundled example not found: ${exampleKey}`);
    return;
  }
  applyExampleToStore(example);
}

/**
 * Load a single-scene example - ADDS a new scene to the project
 */
function loadSingleSceneExample(store: ReturnType<typeof getGraphStore>, example: Example): void {
  // Create a new scene for this example
  const sceneId = store.createScene(example.name);
  
  // Load the new scene to canvas
  store.loadSceneToCanvas(sceneId);
  
  // Create ID mapping
  const idMap = new Map<string, NodeId>();
  
  // Add nodes
  example.nodes!.forEach(node => {
    const newId = store.addNode(node.type, node.x, node.y);
    idMap.set(node.id, newId);
    store.updateNodeProps(newId, node.props);
  });
  
  // Add edges with timing options
  example.edges!.forEach(edge => {
    const fromId = idMap.get(edge.from);
    const toId = idMap.get(edge.to);
    if (fromId && toId) {
      store.addEdge(fromId, toId, {
        timingMode: edge.timingMode ?? 'physical',
        durationBeats: edge.durationBeats ?? null,
        targetParam: edge.targetParam ?? null
      });
    }
  });
  
  // Save the loaded content to the new scene
  store.saveCurrentScene();
}

/**
 * Load a multi-scene example - ADDS new scenes to the project
 */
function loadMultiSceneExample(store: ReturnType<typeof getGraphStore>, example: Example): void {
  // Track the first scene we create so we can switch to it at the end
  let firstSceneId: string | null = null;
  
  // Create new scenes from the example (don't delete existing scenes!)
  example.scenes!.forEach((sceneData, index) => {
    // Create a new scene for each example scene
    const sceneId = store.createScene(sceneData.name);
    
    // Update scene properties
    store.updateScene(sceneId, {
      color: sceneData.color,
      durationBeats: sceneData.durationBeats,
      loopCount: sceneData.loopCount,
      localBpm: sceneData.localBpm ?? null,
      localRoot: sceneData.localRoot ?? null,
      localScale: sceneData.localScale ?? null
    });
    
    // Track first scene
    if (index === 0) {
      firstSceneId = sceneId;
    }
    
    // Load this scene to canvas and populate it
    store.loadSceneToCanvas(sceneId);
    
    // Create ID mapping for this scene
    const idMap = new Map<string, NodeId>();
    
    // Add nodes
    sceneData.nodes.forEach(node => {
      const newId = store.addNode(node.type, node.x, node.y);
      idMap.set(node.id, newId);
      store.updateNodeProps(newId, node.props);
    });
    
    // Add edges
    sceneData.edges.forEach(edge => {
      const fromId = idMap.get(edge.from);
      const toId = idMap.get(edge.to);
      if (fromId && toId) {
        store.addEdge(fromId, toId, {
          timingMode: edge.timingMode ?? 'physical',
          durationBeats: edge.durationBeats ?? null,
          targetParam: edge.targetParam ?? null
        });
      }
    });
    
    // Save this scene
    store.saveCurrentScene();
  });
  
  // Load the first new scene
  if (firstSceneId) {
    store.loadSceneToCanvas(firstSceneId);
  }
}

