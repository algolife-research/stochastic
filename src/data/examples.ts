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

export interface Example {
  name: string;
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

export const EXAMPLES: Record<string, Example> = {
  // Complete Tutorial - Learn Stochastic step by step
  tutorial: {
    name: "Tutorial: Learn Stochastic",
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
          { id: "src", type: "source", x: 150, y: 300, props: { interval: 1, midiNote: 60, intensity: 0.7 } },
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
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 48, intensity: 0.6 } },
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
          { id: "src1", type: "source", x: 100, y: 200, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
          { id: "pol1", type: "oscillator", x: 250, y: 200, props: { wave: "sine", attack: 0.1, decay: 0.8 } },
          { id: "spk1", type: "speaker", x: 400, y: 200, props: { reverb: 0.4, pan: -0.5 } },
          
          { id: "src2", type: "source", x: 100, y: 400, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
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
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
          
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
          { id: "gate", type: "gate", x: 220, y: 300, props: { prob: 0.6 } },
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
          { id: "src", type: "source", x: 80, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.6 } },
          
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
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
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
          { id: "src", type: "source", x: 80, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.5 } },
          
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
          { id: "src", type: "source", x: 100, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.6 } },
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
          { id: "src1", type: "source", x: 100, y: 200, props: { interval: 1, midiNote: 60, intensity: 0.7 } },
          { id: "spk1", type: "speaker", x: 300, y: 200, props: { reverb: 0.3, pan: -0.3 } },
          { id: "src2", type: "source", x: 100, y: 400, props: { interval: 4, midiNote: 60, intensity: 0.5 } },
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
  demo_mozart_dice: {
    name: "Demo: Mozart's Dice Game",
    description: "An aleatoric system inspired by Musikalisches Würfelspiel. A Splitter creates parallel paths, and Gates randomly allow only some to pass, creating ever-changing melodies.",
    bpm: 120,
    nodes: [
      { id: "src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 60, intensity: 0.8 } },
      { id: "split", type: "splitter", x: 250, y: 300, props: {} },
      
      { id: "gate1", type: "gate", x: 400, y: 150, props: { prob: 0.33 } },
      { id: "pitch1", type: "pitch", x: 550, y: 150, props: { shift: 0 } },
      
      { id: "gate2", type: "gate", x: 400, y: 300, props: { prob: 0.33 } },
      { id: "pitch2", type: "pitch", x: 550, y: 300, props: { shift: 4 } },
      
      { id: "gate3", type: "gate", x: 400, y: 450, props: { prob: 0.33 } },
      { id: "pitch3", type: "pitch", x: 550, y: 450, props: { shift: 7 } },
      
      { id: "spk", type: "speaker", x: 700, y: 300, props: { reverb: 0.4, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "src", to: "split" },
      { id: "e2", from: "split", to: "gate1" }, { id: "e3", from: "gate1", to: "pitch1" }, { id: "e4", from: "pitch1", to: "spk" },
      { id: "e5", from: "split", to: "gate2" }, { id: "e6", from: "gate2", to: "pitch2" }, { id: "e7", from: "pitch2", to: "spk" },
      { id: "e8", from: "split", to: "gate3" }, { id: "e9", from: "gate3", to: "pitch3" }, { id: "e10", from: "pitch3", to: "spk" }
    ]
  },

  // Demo: Generative Ambient
  demo_ambient: {
    name: "Demo: Generative Ambient",
    description: "A self-evolving ambient piece with random notes and delays.",
    bpm: 60,
    nodes: [
      { id: "src1", type: "source", x: 100, y: 200, props: { interval: 3, noteIndex: -1, intensity: 0.4 } },
      { id: "gate1", type: "gate", x: 220, y: 200, props: { prob: 0.5 } },
      { id: "pol1", type: "oscillator", x: 340, y: 200, props: { wave: "sine", attack: 0.3, decay: 2.0 } },
      { id: "spk1", type: "speaker", x: 500, y: 200, props: { reverb: 0.7, pan: -0.3 } },
      
      { id: "src2", type: "source", x: 100, y: 350, props: { interval: 4, noteIndex: -1, intensity: 0.3 } },
      { id: "d1", type: "delay", x: 220, y: 350, props: { delayTime: 2 } },
      { id: "pol2", type: "oscillator", x: 340, y: 350, props: { wave: "triangle", attack: 0.5, decay: 3.0 } },
      { id: "spk2", type: "speaker", x: 500, y: 350, props: { reverb: 0.8, pan: 0.3 } },
      
      { id: "src3", type: "source", x: 100, y: 500, props: { interval: 6, midiNote: 36, intensity: 0.5 } },
      { id: "pol3", type: "oscillator", x: 250, y: 500, props: { wave: "sine", attack: 0.2, decay: 4.0 } },
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
      { id: "pol", type: "oscillator", x: 160, y: 300, props: { wave: "triangle", attack: 0.02, decay: 0.3 } },
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
      { id: "pol", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", attack: 0.01, decay: 0.5 } },
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
      { id: "kick_pol", type: "oscillator", x: 180, y: 180, props: { wave: "sine", attack: 0.01, decay: 0.25 } },
      { id: "kick_p", type: "pitch", x: 300, y: 180, props: { shift: -12 } },
      { id: "kick_out", type: "speaker", x: 420, y: 180, props: { reverb: 0.1, pan: 0 } },
      
      { id: "snare_src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "snare_del", type: "delay", x: 140, y: 300, props: { delayTime: 1 } },
      { id: "snare_pol", type: "oscillator", x: 240, y: 300, props: { wave: "sawtooth", attack: 0.01, decay: 0.12 } },
      { id: "snare_p", type: "pitch", x: 340, y: 300, props: { shift: 12 } },
      { id: "snare_out", type: "speaker", x: 460, y: 300, props: { reverb: 0.35, pan: 0.1 } },
      
      { id: "hh_src", type: "source", x: 60, y: 420, props: { interval: 0.5, midiNote: 72, intensity: 0.3 } },
      { id: "hh_gate", type: "gate", x: 160, y: 420, props: { prob: 0.75 } },
      { id: "hh_pol", type: "oscillator", x: 260, y: 420, props: { wave: "square", attack: 0.005, decay: 0.04 } },
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
      { id: "pol4", type: "oscillator", x: 180, y: 180, props: { wave: "sine", attack: 0.01, decay: 0.6 } },
      { id: "spk4", type: "speaker", x: 300, y: 180, props: { reverb: 0.4, pan: -0.5 } },
      
      { id: "src3", type: "source", x: 60, y: 300, props: { interval: 3, midiNote: 67, intensity: 0.6 } },
      { id: "pol3", type: "oscillator", x: 180, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.4 } },
      { id: "spk3", type: "speaker", x: 300, y: 300, props: { reverb: 0.4, pan: 0 } },
      
      { id: "src5", type: "source", x: 60, y: 420, props: { interval: 5, midiNote: 55, intensity: 0.6 } },
      { id: "pol5", type: "oscillator", x: 180, y: 420, props: { wave: "square", attack: 0.01, decay: 0.3 } },
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
      { id: "bass_pol", type: "oscillator", x: 180, y: 150, props: { wave: "sawtooth", attack: 0.02, decay: 0.5 } },
      { id: "bass_flt", type: "filter", x: 300, y: 150, props: { cutoff: 500, mod: 800, attack: 0.01, decay: 0.3 } },
      { id: "bass_spk", type: "speaker", x: 420, y: 150, props: { reverb: 0.15, pan: 0 } },
      
      { id: "mel_src", type: "source", x: 60, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.5 } },
      { id: "mel_gate", type: "gate", x: 160, y: 300, props: { prob: 0.5 } },
      { id: "mel_pol", type: "oscillator", x: 260, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.2 } },
      { id: "mel_spk", type: "speaker", x: 380, y: 300, props: { reverb: 0.5, pan: 0.3 } },
      
      { id: "beat_src", type: "source", x: 60, y: 450, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
      { id: "beat_p", type: "pitch", x: 160, y: 450, props: { shift: -24 } },
      { id: "beat_pol", type: "oscillator", x: 260, y: 450, props: { wave: "sine", attack: 0.005, decay: 0.15 } },
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
      
      { id: "pol1", type: "oscillator", x: 300, y: 200, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
      { id: "spk1", type: "speaker", x: 500, y: 200, props: { reverb: 0.3, pan: -0.3 } },
      
      { id: "pol2", type: "oscillator", x: 300, y: 350, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
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
      { id: "pol5", type: "oscillator", x: 200, y: 150, props: { wave: "sine", attack: 0.1, decay: 2.0 } },
      { id: "dly5", type: "delay", x: 350, y: 150, props: { delayTime: 0.5 } },
      { id: "spk5", type: "speaker", x: 500, y: 150, props: { reverb: 0.5, pan: -0.5 } },

      { id: "src7", type: "source", x: 50, y: 300, props: { interval: 7, midiNote: 64, intensity: 0.6 } },
      { id: "pol7", type: "oscillator", x: 200, y: 300, props: { wave: "triangle", attack: 0.1, decay: 2.0 } },
      { id: "dly7", type: "delay", x: 350, y: 300, props: { delayTime: 0.75 } },
      { id: "spk7", type: "speaker", x: 500, y: 300, props: { reverb: 0.5, pan: 0 } },

      { id: "src9", type: "source", x: 50, y: 450, props: { interval: 9, midiNote: 67, intensity: 0.6 } },
      { id: "pol9", type: "oscillator", x: 200, y: 450, props: { wave: "sine", attack: 0.1, decay: 2.0 } },
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
      { id: "pol", type: "oscillator", x: 140, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.4 } },
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
      { id: "pol", type: "oscillator", x: 120, y: 300, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
      
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
      { id: "pol", type: "oscillator", x: 120, y: 300, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
      
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
      { id: "pol_loud", type: "oscillator", x: 180, y: 150, props: { wave: "sawtooth", attack: 0.01, decay: 0.5 } },
      { id: "out_loud", type: "speaker", x: 300, y: 150, props: { reverb: 0.2, pan: -0.3 } },
      
      // Soft layer
      { id: "src_soft", type: "source", x: 60, y: 280, props: { interval: 2, midiNote: 72, intensity: 0.2 } },
      { id: "pol_soft", type: "oscillator", x: 180, y: 280, props: { wave: "triangle", attack: 0.1, decay: 0.8 } },
      { id: "out_soft", type: "speaker", x: 300, y: 280, props: { reverb: 0.6, pan: 0.3 } },
      
      // Swell layer - goes through gain stages
      { id: "src_swell", type: "source", x: 60, y: 420, props: { interval: 1, midiNote: 67, intensity: 0.3 } },
      { id: "gain_up", type: "gain", x: 160, y: 420, props: { value: 1.5 } },
      { id: "pol_swell", type: "oscillator", x: 260, y: 420, props: { wave: "sine", attack: 0.2, decay: 0.6 } },
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
      { id: "pol", type: "oscillator", x: 180, y: 300, props: { wave: "sine", attack: 0.02, decay: 0.5 } },
      
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
      { id: "pol1", type: "oscillator", x: 280, y: 200, props: { wave: "sine", attack: 0.01, decay: 3.0 } },
      { id: "spk1", type: "speaker", x: 400, y: 200, props: { reverb: 0.9, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 80, y: 350, props: { interval: 5, noteIndex: -1, intensity: 0.4 } },
      { id: "gate2", type: "gate", x: 180, y: 350, props: { prob: 0.5 } },
      { id: "p2", type: "pitch", x: 260, y: 350, props: { shift: 12 } },
      { id: "pol2", type: "oscillator", x: 340, y: 350, props: { wave: "triangle", attack: 0.01, decay: 2.5 } },
      { id: "spk2", type: "speaker", x: 460, y: 350, props: { reverb: 0.9, pan: 0.5 } },
      
      { id: "src3", type: "source", x: 80, y: 500, props: { interval: 7, midiNote: 36, intensity: 0.6 } },
      { id: "pol3", type: "oscillator", x: 200, y: 500, props: { wave: "sine", attack: 0.05, decay: 4.0 } },
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
      { id: "kick_pol", type: "oscillator", x: 180, y: 150, props: { wave: "sine", attack: 0.005, decay: 0.2 } },
      { id: "kick_p", type: "pitch", x: 280, y: 150, props: { shift: -12 } },
      { id: "kick_out", type: "speaker", x: 400, y: 150, props: { reverb: 0.05, pan: 0 } },
      
      // Bass - every 2 beats
      { id: "bass_src", type: "source", x: 60, y: 280, props: { interval: 2, midiNote: 36, intensity: 0.7 } },
      { id: "bass_pol", type: "oscillator", x: 180, y: 280, props: { wave: "sawtooth", attack: 0.01, decay: 0.4 } },
      { id: "bass_flt", type: "filter", x: 300, y: 280, props: { cutoff: 300, mod: 600, attack: 0.01, decay: 0.15 } },
      { id: "bass_out", type: "speaker", x: 420, y: 280, props: { reverb: 0.1, pan: 0 } },
      
      // Hi-hat - every 0.5 beats with random gates
      { id: "hh_src", type: "source", x: 60, y: 410, props: { interval: 0.5, midiNote: 96, intensity: 0.3 } },
      { id: "hh_gate", type: "gate", x: 160, y: 410, props: { prob: 0.8 } },
      { id: "hh_pol", type: "oscillator", x: 260, y: 410, props: { wave: "square", attack: 0.001, decay: 0.03 } },
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
          { type: "oscillator", props: { wave: "sine", attack: 0.8, decay: 3.0 } },
          { type: "oscillator", props: { wave: "triangle", attack: 1.2, decay: 2.5 } },
          { type: "oscillator", props: { wave: "sawtooth", attack: 0.5, decay: 2.0 } }
        ]
      }},
      { id: "out", type: "speaker", x: 340, y: 300, props: { reverb: 0.8, pan: 0 } },
      
      { id: "split", type: "splitter", x: 200, y: 150, props: {} },
      { id: "p_hi", type: "pitch", x: 280, y: 150, props: { shift: 12 } },
      { id: "sparkle", type: "tunnel", x: 380, y: 150, props: {
        subNodes: [
          { type: "oscillator", props: { wave: "triangle", attack: 0.01, decay: 0.4 } }
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
          { type: "oscillator", props: { wave: "sine", attack: 0.01, decay: 0.3 } },
          { type: "oscillator", props: { wave: "sawtooth", attack: 0.02, decay: 0.25 } },
          { type: "oscillator", props: { wave: "square", attack: 0.01, decay: 0.2 } }
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
          { type: "oscillator", props: { wave: "sawtooth", attack: 0.15, decay: 1.2 } },
          { type: "oscillator", props: { ratio: 2, wave: "sine", attack: 0.12, decay: 1.0 } },
          { type: "oscillator", props: { ratio: 3, wave: "sine", attack: 0.10, decay: 0.8 } },
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
          { type: "oscillator", props: { wave: "sawtooth", attack: 0.25, decay: 1.8 } },
          { type: "oscillator", props: { ratio: 2, wave: "sine", attack: 0.20, decay: 1.5 } },
          { type: "oscillator", props: { ratio: 3, wave: "triangle", attack: 0.18, decay: 1.2 } },
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
          { type: "oscillator", props: { wave: "sine", attack: 0.08, decay: 0.5 } },
          { type: "oscillator", props: { ratio: 2, wave: "sine", attack: 0.06, decay: 0.4 } },
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
          { type: "oscillator", props: { wave: "sine", attack: 0.05, decay: 0.8 } },
          { type: "oscillator", props: { ratio: 2, wave: "sine", attack: 0.1, decay: 0.6 } },
          { type: "filter", props: { cutoff: 2500, mod: 800, attack: 0.02, decay: 0.3 } }
        ]
      }},
      { id: "root_out", type: "speaker", x: 460, y: 180, props: { reverb: 0.5, pan: -0.4 } },
      
      // Third with delay
      { id: "d1", type: "delay", x: 260, y: 300, props: { delayTime: 0.25 } },
      { id: "third_tun", type: "tunnel", x: 340, y: 300, props: {
        subNodes: [
          { type: "pitch", props: { shift: 4 } },
          { type: "oscillator", props: { wave: "triangle", attack: 0.02, decay: 0.5 } },
          { type: "filter", props: { cutoff: 3500, mod: 1200, attack: 0.01, decay: 0.25 } }
        ]
      }},
      { id: "third_out", type: "speaker", x: 460, y: 300, props: { reverb: 0.6, pan: 0 } },
      
      // Fifth with more delay
      { id: "d2", type: "delay", x: 260, y: 420, props: { delayTime: 0.5 } },
      { id: "fifth_tun", type: "tunnel", x: 340, y: 420, props: {
        subNodes: [
          { type: "pitch", props: { shift: 7 } },
          { type: "oscillator", props: { wave: "sine", attack: 0.01, decay: 0.4 } },
          { type: "oscillator", props: { ratio: 3, wave: "sine", attack: 0.02, decay: 0.25 } }
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
      { id: "pol1", type: "oscillator", x: 260, y: 200, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out1", type: "speaker", x: 380, y: 200, props: { reverb: 0.4, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 320, props: { interval: 2, noteIndex: -1, intensity: 0.5 } },
      { id: "quant2", type: "quantizer", x: 160, y: 320, props: { strength: 0.7 } },
      { id: "pol2", type: "oscillator", x: 260, y: 320, props: { wave: "triangle", attack: 0.01, decay: 0.5 } },
      { id: "out2", type: "speaker", x: 380, y: 320, props: { reverb: 0.5, pan: 0 } },
      
      { id: "src3", type: "source", x: 60, y: 440, props: { interval: 3, noteIndex: -1, intensity: 0.4 } },
      { id: "p_oct", type: "pitch", x: 140, y: 440, props: { shift: -12 } },
      { id: "quant3", type: "quantizer", x: 220, y: 440, props: { strength: 1.0 } },
      { id: "pol3", type: "oscillator", x: 320, y: 440, props: { wave: "sawtooth", attack: 0.1, decay: 0.8 } },
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
      { id: "pol", type: "oscillator", x: 180, y: 300, props: { wave: "sawtooth", attack: 0.5, decay: 2.0 } },
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
      { id: "pol", type: "oscillator", x: 200, y: 300, props: { wave: "sawtooth", attack: 0.8, decay: 2.5 } },
      { id: "gain", type: "gain", x: 320, y: 300, props: { value: 0.8 } },
      { id: "flt", type: "filter", x: 440, y: 300, props: { cutoff: 1000, mod: 0 } },
      { id: "out", type: "speaker", x: 560, y: 300, props: { reverb: 0.7, pan: 0 } },
      
      { id: "lfo_cutoff", type: "lfo", x: 440, y: 150, props: { rate: 0.2, shape: "sine", min: 200, max: 3000 } },
      { id: "lfo_pan", type: "lfo", x: 560, y: 150, props: { rate: 0.15, shape: "triangle", min: -1, max: 1 } },
      { id: "lfo_gain", type: "lfo", x: 320, y: 450, props: { rate: 0.5, shape: "sine", min: 0.3, max: 1.0 } },
      
      { id: "src2", type: "source", x: 80, y: 500, props: { interval: 6, midiNote: 36, intensity: 0.8 } },
      { id: "pol2", type: "oscillator", x: 200, y: 500, props: { wave: "sine", attack: 0.5, decay: 3.0 } },
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
      { id: "lead_pol", type: "oscillator", x: 320, y: 200, props: { wave: "sawtooth", attack: 0.01, decay: 0.3 } },
      { id: "lead_flt", type: "filter", x: 420, y: 200, props: { cutoff: 1800, mod: 2000, attack: 0.01, decay: 0.2 } },
      { id: "lead_out", type: "speaker", x: 520, y: 200, props: { reverb: 0.4, pan: 0.3 } },
      
      { id: "bass_src", type: "source", x: 60, y: 350, props: { interval: 2, noteIndex: -1, intensity: 0.8 } },
      { id: "bass_q", type: "quantizer", x: 160, y: 350, props: { strength: 1.0 } },
      { id: "bass_p", type: "pitch", x: 260, y: 350, props: { shift: -24 } },
      { id: "bass_pol", type: "oscillator", x: 360, y: 350, props: { wave: "triangle", attack: 0.02, decay: 0.6 } },
      { id: "bass_out", type: "speaker", x: 460, y: 350, props: { reverb: 0.2, pan: -0.2 } },
      
      { id: "rhythm_src", type: "source", x: 60, y: 500, props: { interval: 0.5, noteIndex: -1, intensity: 0.4 } },
      { id: "rhythm_gate", type: "gate", x: 140, y: 500, props: { prob: 0.5 } },
      { id: "rhythm_q", type: "quantizer", x: 220, y: 500, props: { strength: 0.8 } },
      { id: "rhythm_pol", type: "oscillator", x: 320, y: 500, props: { wave: "square", attack: 0.005, decay: 0.15 } },
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
      { id: "pol1", type: "oscillator", x: 180, y: 200, props: { wave: "sine", attack: 2.0, decay: 5.0 } },
      { id: "out1", type: "speaker", x: 300, y: 200, props: { reverb: 0.95, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 350, props: { interval: 12, midiNote: 55, intensity: 0.4 } },
      { id: "pol2", type: "oscillator", x: 180, y: 350, props: { wave: "triangle", attack: 1.5, decay: 4.0 } },
      { id: "flt2", type: "filter", x: 280, y: 350, props: { cutoff: 500, mod: 300, attack: 0.5, decay: 2.0 } },
      { id: "out2", type: "speaker", x: 400, y: 350, props: { reverb: 0.9, pan: 0.5 } },
      
      { id: "src3", type: "source", x: 60, y: 500, props: { interval: 16, midiNote: 43, intensity: 0.3 } },
      { id: "d1", type: "delay", x: 150, y: 500, props: { delayTime: 4.0 } },
      { id: "pol3", type: "oscillator", x: 250, y: 500, props: { wave: "sine", attack: 1.0, decay: 6.0 } },
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
      
      { id: "pol1", type: "oscillator", x: 500, y: 150, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out1", type: "speaker", x: 620, y: 150, props: { reverb: 0.3, pan: -0.6 } },
      
      { id: "pol2", type: "oscillator", x: 500, y: 250, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out2", type: "speaker", x: 620, y: 250, props: { reverb: 0.3, pan: -0.3 } },
      
      { id: "pol3", type: "oscillator", x: 500, y: 350, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "out3", type: "speaker", x: 620, y: 350, props: { reverb: 0.3, pan: 0 } },
      
      { id: "pol4", type: "oscillator", x: 500, y: 450, props: { wave: "sine", attack: 0.01, decay: 0.3 } },
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
      { id: "hh_noise", type: "oscillator", x: 240, y: 150, props: { wave: "white", attack: 0.001, decay: 0.05 } },
      { id: "hh_flt", type: "filter", x: 330, y: 150, props: { cutoff: 8000, mod: 2000, attack: 0.001, decay: 0.03 } },
      { id: "hh_out", type: "speaker", x: 440, y: 150, props: { reverb: 0.15, pan: 0.3 } },
      
      // Snare with pink noise
      { id: "sn_src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.7 } },
      { id: "sn_del", type: "delay", x: 140, y: 300, props: { delayTime: 1 } },
      { id: "sn_noise", type: "oscillator", x: 240, y: 300, props: { wave: "pink", attack: 0.005, decay: 0.15 } },
      { id: "sn_flt", type: "filter", x: 340, y: 300, props: { cutoff: 3000, mod: 2000, attack: 0.01, decay: 0.1 } },
      { id: "sn_out", type: "speaker", x: 460, y: 300, props: { reverb: 0.3, pan: -0.1 } },
      
      // Rumble with brown noise
      { id: "rm_src", type: "source", x: 60, y: 450, props: { interval: 4, midiNote: 36, intensity: 0.5 } },
      { id: "rm_noise", type: "oscillator", x: 180, y: 450, props: { wave: "brown", attack: 0.1, decay: 1.5 } },
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
      { id: "v_pol", type: "oscillator", x: 180, y: 180, props: { wave: "sawtooth", attack: 0.2, decay: 1.5 } },
      { id: "v_mod", type: "modulator", x: 300, y: 180, props: { rate: 6.0, depth: 20 } },
      { id: "v_harm", type: "oscillator", x: 420, y: 180, props: { ratio: 2, wave: "sine", attack: 0.15, decay: 1.2 } },
      { id: "v_flt", type: "filter", x: 540, y: 180, props: { cutoff: 3000, mod: 1500, attack: 0.1, decay: 0.5 } },
      { id: "v_out", type: "speaker", x: 660, y: 180, props: { reverb: 0.5, pan: -0.4 } },
      
      // Viola with medium vibrato
      { id: "va_src", type: "source", x: 60, y: 330, props: { interval: 6, midiNote: 60, intensity: 0.65 } },
      { id: "va_pol", type: "oscillator", x: 180, y: 330, props: { wave: "sawtooth", attack: 0.25, decay: 2.0 } },
      { id: "va_mod", type: "modulator", x: 300, y: 330, props: { rate: 5.0, depth: 18 } },
      { id: "va_harm", type: "oscillator", x: 420, y: 330, props: { ratio: 3, wave: "triangle", attack: 0.2, decay: 1.5 } },
      { id: "va_flt", type: "filter", x: 540, y: 330, props: { cutoff: 2000, mod: 1000, attack: 0.12, decay: 0.6 } },
      { id: "va_out", type: "speaker", x: 660, y: 330, props: { reverb: 0.55, pan: 0 } },
      
      // Cello with slow vibrato
      { id: "c_src", type: "source", x: 60, y: 480, props: { interval: 8, midiNote: 48, intensity: 0.7 } },
      { id: "c_pol", type: "oscillator", x: 180, y: 480, props: { wave: "sawtooth", attack: 0.3, decay: 2.5 } },
      { id: "c_mod", type: "modulator", x: 300, y: 480, props: { rate: 4.5, depth: 15 } },
      { id: "c_harm", type: "oscillator", x: 420, y: 480, props: { ratio: 2, wave: "sine", attack: 0.25, decay: 2.0 } },
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
      { id: "pol", type: "oscillator", x: 160, y: 250, props: { wave: "triangle", attack: 0.02, decay: 0.4 } },
      { id: "out1", type: "speaker", x: 280, y: 250, props: { reverb: 0.3, pan: -0.5 } },
      
      // Teleporter sends to far right
      { id: "tele_in", type: "teleporter", x: 380, y: 250, props: { channel: "A", isEntry: true } },
      { id: "tele_out", type: "teleporter", x: 600, y: 250, props: { channel: "A", isEntry: false } },
      
      { id: "p_up", type: "pitch", x: 700, y: 250, props: { shift: 7 } },
      { id: "out2", type: "speaker", x: 820, y: 250, props: { reverb: 0.5, pan: 0.5 } },
      
      // Second teleporter pair for octave
      { id: "src2", type: "source", x: 60, y: 400, props: { interval: 4, midiNote: 48, intensity: 0.7 } },
      { id: "pol2", type: "oscillator", x: 160, y: 400, props: { wave: "sine", attack: 0.1, decay: 1.0 } },
      { id: "tele_in2", type: "teleporter", x: 280, y: 400, props: { channel: "B", isEntry: true } },
      { id: "tele_out2", type: "teleporter", x: 500, y: 400, props: { channel: "B", isEntry: false } },
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
      { id: "pol1", type: "oscillator", x: 300, y: 120, props: { wave: "sine", attack: 0.1, decay: 2.0 } },
      { id: "g1", type: "gain", x: 400, y: 120, props: { value: 1.0 } },
      
      // 2nd harmonic (octave)
      { id: "h2", type: "oscillator", x: 300, y: 220, props: { ratio: 2, wave: "sine", attack: 0.08, decay: 1.8 } },
      { id: "g2", type: "gain", x: 400, y: 220, props: { value: 0.5 } },
      
      // 3rd harmonic (fifth + octave)
      { id: "h3", type: "oscillator", x: 300, y: 320, props: { ratio: 3, wave: "sine", attack: 0.06, decay: 1.5 } },
      { id: "g3", type: "gain", x: 400, y: 320, props: { value: 0.33 } },
      
      // 4th harmonic (2 octaves)
      { id: "h4", type: "oscillator", x: 300, y: 420, props: { ratio: 4, wave: "sine", attack: 0.05, decay: 1.2 } },
      { id: "g4", type: "gain", x: 400, y: 420, props: { value: 0.25 } },
      
      // 5th harmonic (major third + 2 octaves)
      { id: "h5", type: "oscillator", x: 300, y: 520, props: { ratio: 5, wave: "sine", attack: 0.04, decay: 1.0 } },
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
      { id: "pol", type: "oscillator", x: 180, y: 300, props: { wave: "sawtooth", attack: 0.01, decay: 0.8 } },
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
      { id: "pol_sub", type: "oscillator", x: 260, y: 450, props: { wave: "sine", attack: 0.01, decay: 0.6 } },
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
      { id: "seq1_pol", type: "oscillator", x: 360, y: 150, props: { wave: "square", attack: 0.005, decay: 0.1 } },
      { id: "seq1_flt", type: "filter", x: 460, y: 150, props: { cutoff: 2000, mod: 1500, attack: 0.01, decay: 0.08 } },
      { id: "seq1_out", type: "speaker", x: 580, y: 150, props: { reverb: 0.3, pan: -0.4 } },
      
      // Medium sequence with splitter for harmony
      { id: "seq2_src", type: "source", x: 60, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.6 } },
      { id: "seq2_gate", type: "gate", x: 160, y: 300, props: { prob: 0.6 } },
      { id: "seq2_quant", type: "quantizer", x: 260, y: 300, props: { strength: 0.9 } },
      { id: "seq2_split", type: "splitter", x: 350, y: 300, props: {} },
      { id: "seq2_pol1", type: "oscillator", x: 460, y: 250, props: { wave: "triangle", attack: 0.01, decay: 0.2 } },
      { id: "seq2_out1", type: "speaker", x: 580, y: 250, props: { reverb: 0.4, pan: 0 } },
      { id: "seq2_p", type: "pitch", x: 460, y: 350, props: { shift: 7 } },
      { id: "seq2_pol2", type: "oscillator", x: 560, y: 350, props: { wave: "sine", attack: 0.02, decay: 0.25 } },
      { id: "seq2_out2", type: "speaker", x: 680, y: 350, props: { reverb: 0.5, pan: 0.3 } },
      
      // Slow bass with full quantization
      { id: "bass_src", type: "source", x: 60, y: 480, props: { interval: 2, noteIndex: -1, intensity: 0.7 } },
      { id: "bass_quant", type: "quantizer", x: 160, y: 480, props: { strength: 1.0 } },
      { id: "bass_p", type: "pitch", x: 260, y: 480, props: { shift: -24 } },
      { id: "bass_pol", type: "oscillator", x: 360, y: 480, props: { wave: "sawtooth", attack: 0.02, decay: 0.5 } },
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
    description: "Tunnels containing pitch, oscillator, modulator, and filter for complete synthesis.",
    bpm: 90,
    nodes: [
      { id: "src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.7 } },
      
      // Complex tunnel with full processing chain
      { id: "synth", type: "tunnel", x: 250, y: 300, props: {
        subNodes: [
          { type: "pitch", props: { shift: 0 } },
          { type: "oscillator", props: { wave: "sawtooth", attack: 0.02, decay: 0.8 } },
          { type: "oscillator", props: { ratio: 2, wave: "sine", attack: 0.03, decay: 0.6 } },
          { type: "oscillator", props: { ratio: 3, wave: "triangle", attack: 0.04, decay: 0.5 } },
          { type: "modulator", props: { rate: 5.5, depth: 20 } },
          { type: "filter", props: { cutoff: 2000, mod: 1500, attack: 0.02, decay: 0.4 } }
        ]
      }},
      { id: "out1", type: "speaker", x: 440, y: 300, props: { reverb: 0.5, pan: 0 } },
      
      // Second voice with different tunnel
      { id: "src2", type: "source", x: 60, y: 480, props: { interval: 4, midiNote: 48, intensity: 0.6 } },
      { id: "pad", type: "tunnel", x: 250, y: 480, props: {
        subNodes: [
          { type: "oscillator", props: { wave: "sine", attack: 0.5, decay: 2.0 } },
          { type: "oscillator", props: { ratio: 2, wave: "sine", attack: 0.4, decay: 1.8 } },
          { type: "oscillator", props: { wave: "triangle", attack: 0.6, decay: 1.5 } },
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
      { id: "h_pol", type: "oscillator", x: 260, y: 150, props: { wave: "square", attack: 0.001, decay: 0.04 } },
      { id: "h_p", type: "pitch", x: 360, y: 150, props: { shift: 24 } },
      { id: "h_out", type: "speaker", x: 460, y: 150, props: { reverb: 0.15, pan: 0.4 } },
      
      // Medium density - 8 steps, ~3 hits (prob 0.375)
      { id: "m_src", type: "source", x: 60, y: 300, props: { interval: 0.5, midiNote: 60, intensity: 0.6 } },
      { id: "m_gate", type: "gate", x: 160, y: 300, props: { prob: 0.375 } },
      { id: "m_pol", type: "oscillator", x: 260, y: 300, props: { wave: "triangle", attack: 0.01, decay: 0.15 } },
      { id: "m_out", type: "speaker", x: 360, y: 300, props: { reverb: 0.25, pan: 0 } },
      
      // Low density - kick pattern (prob 0.25)
      { id: "k_src", type: "source", x: 60, y: 450, props: { interval: 0.5, midiNote: 36, intensity: 0.8 } },
      { id: "k_gate", type: "gate", x: 160, y: 450, props: { prob: 0.25 } },
      { id: "k_pol", type: "oscillator", x: 260, y: 450, props: { wave: "sine", attack: 0.005, decay: 0.2 } },
      { id: "k_p", type: "pitch", x: 360, y: 450, props: { shift: -12 } },
      { id: "k_out", type: "speaker", x: 460, y: 450, props: { reverb: 0.1, pan: -0.2 } },
      
      // Accent layer - very sparse (prob 0.125)
      { id: "a_src", type: "source", x: 500, y: 300, props: { interval: 1, midiNote: 84, intensity: 0.4 } },
      { id: "a_gate", type: "gate", x: 580, y: 300, props: { prob: 0.125 } },
      { id: "a_pol", type: "oscillator", x: 660, y: 300, props: { wave: "sine", attack: 0.01, decay: 0.5 } },
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
      { id: "pol", type: "oscillator", x: 160, y: 300, props: { wave: "sine", attack: 0.05, decay: 0.6 } },
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
      { id: "gong_pol", type: "oscillator", x: 180, y: 150, props: { wave: "sine", attack: 0.02, decay: 4.0 } },
      { id: "gong_h", type: "oscillator", x: 300, y: 150, props: { ratio: 2.2, wave: "sine", attack: 0.03, decay: 3.0 } },
      { id: "gong_out", type: "speaker", x: 420, y: 150, props: { reverb: 0.8, pan: 0 } },
      
      // Kenong - medium
      { id: "ken_src", type: "source", x: 60, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "ken_pol", type: "oscillator", x: 180, y: 300, props: { wave: "triangle", attack: 0.01, decay: 1.5 } },
      { id: "ken_h1", type: "oscillator", x: 300, y: 300, props: { ratio: 2.76, wave: "sine", attack: 0.02, decay: 1.2 } },
      { id: "ken_h2", type: "oscillator", x: 400, y: 300, props: { ratio: 5.4, wave: "sine", attack: 0.03, decay: 0.8 } },
      { id: "ken_out", type: "speaker", x: 520, y: 300, props: { reverb: 0.6, pan: -0.3 } },
      
      // Bonang - high, fast
      { id: "bon_src", type: "source", x: 60, y: 450, props: { interval: 0.5, midiNote: 72, intensity: 0.5 } },
      { id: "bon_gate", type: "gate", x: 160, y: 450, props: { prob: 0.7 } },
      { id: "bon_pol", type: "oscillator", x: 260, y: 450, props: { wave: "sine", attack: 0.005, decay: 0.5 } },
      { id: "bon_h", type: "oscillator", x: 360, y: 450, props: { ratio: 3.14, wave: "sine", attack: 0.01, decay: 0.3 } },
      { id: "bon_out", type: "speaker", x: 480, y: 450, props: { reverb: 0.5, pan: 0.3 } },
      
      // Peking - highest, fastest interlocking
      { id: "pek_src", type: "source", x: 550, y: 300, props: { interval: 0.25, midiNote: 84, intensity: 0.4 } },
      { id: "pek_gate", type: "gate", x: 640, y: 300, props: { prob: 0.5 } },
      { id: "pek_pol", type: "oscillator", x: 730, y: 300, props: { wave: "sine", attack: 0.002, decay: 0.2 } },
      { id: "pek_h", type: "oscillator", x: 820, y: 300, props: { ratio: 4.16, wave: "sine", attack: 0.005, decay: 0.15 } },
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
      { id: "bass_pol", type: "oscillator", x: 360, y: 150, props: { wave: "sawtooth", attack: 0.02, decay: 0.5 } },
      { id: "bass_flt", type: "filter", x: 460, y: 150, props: { cutoff: 400, mod: 800, attack: 0.01, decay: 0.3 } },
      { id: "bass_out", type: "speaker", x: 560, y: 150, props: { reverb: 0.2, pan: 0 } },
      
      { id: "mel_src", type: "source", x: 60, y: 300, props: { interval: 0.5, noteIndex: -1, intensity: 0.5 } },
      { id: "mel_gate", type: "gate", x: 140, y: 300, props: { prob: 0.6 } },
      { id: "mel_q", type: "quantizer", x: 220, y: 300, props: { strength: 1.0 } },
      { id: "mel_split", type: "splitter", x: 300, y: 300, props: {} },
      
      { id: "mel_pol1", type: "oscillator", x: 400, y: 250, props: { wave: "triangle", attack: 0.01, decay: 0.25 } },
      { id: "mel_out1", type: "speaker", x: 500, y: 250, props: { reverb: 0.5, pan: -0.4 } },
      
      { id: "mel_pol2", type: "oscillator", x: 400, y: 350, props: { wave: "sine", attack: 0.01, decay: 0.2 } },
      { id: "mel_out2", type: "speaker", x: 500, y: 350, props: { reverb: 0.5, pan: 0.4 } },
      
      { id: "arp_src", type: "source", x: 60, y: 480, props: { interval: 4, midiNote: 72, intensity: 0.4 } },
      { id: "arp_split", type: "splitter", x: 160, y: 480, props: {} },
      { id: "arp_q", type: "quantizer", x: 260, y: 480, props: { strength: 1.0 } },
      { id: "arp_pol", type: "oscillator", x: 360, y: 480, props: { wave: "sine", attack: 0.005, decay: 0.15 } },
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
      
      { id: "pol", type: "oscillator", x: 400, y: 300, props: { wave: "sine", attack: 0.05, decay: 0.5 } },
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
      { id: "pol1", type: "oscillator", x: 340, y: 200, props: { wave: "sine", attack: 0.01, decay: 0.4 } },
      { id: "out1", type: "speaker", x: 480, y: 200, props: { reverb: 0.3, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 350, props: { interval: 2, midiNote: 60, intensity: 0.6 } },
      { id: "heavy_gain", type: "gain", x: 200, y: 350, props: { value: 1.0 } },
      { id: "pol2", type: "oscillator", x: 340, y: 350, props: { wave: "sine", attack: 0.01, decay: 0.4 } },
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
      { id: "pol1", type: "oscillator", x: 180, y: 180, props: { wave: "sine", attack: 0.01, decay: 0.2 } },
      { id: "staccato", type: "speaker", x: 300, y: 180, props: { reverb: 0.2, pan: -0.5 } },
      
      { id: "src2", type: "source", x: 60, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.7 } },
      { id: "pol2", type: "oscillator", x: 180, y: 300, props: { wave: "sine", attack: 0.3, decay: 0.5 } },
      { id: "sustained", type: "speaker", x: 300, y: 300, props: { reverb: 0.4, pan: 0 } },
      
      { id: "src3", type: "source", x: 60, y: 420, props: { interval: 4, midiNote: 60, intensity: 0.7 } },
      { id: "pol3", type: "oscillator", x: 180, y: 420, props: { wave: "triangle", attack: 0.8, decay: 0.1 } },
      { id: "organ", type: "speaker", x: 300, y: 420, props: { reverb: 0.6, pan: 0.5 } }
    ],
    edges: [
      { id: "e1a", from: "src1", to: "pol1" }, { id: "e1b", from: "pol1", to: "staccato" },
      { id: "e2a", from: "src2", to: "pol2" }, { id: "e2b", from: "pol2", to: "sustained" },
      { id: "e3a", from: "src3", to: "pol3" }, { id: "e3b", from: "pol3", to: "organ" }
    ]
  },

  // ============================================================================
  // ORCHESTRAL: Pachelbel's Canon in D
  // ============================================================================
  // 
  // The Canon structure:
  // - Ground Bass: D-A-B-F#-G-D-G-A (8 notes, 2 beats each = 16 beat cycle)
  // - Canon Melody: Same 8-note phrase enters on each voice at 16-beat intervals
  // - At 60 BPM: 16 beats = 16 seconds per cycle
  //
  // Architecture: Single trigger source → splitter → delayed voices
  // Each voice gets the same melodic block, staggered by 16 beats
  // ============================================================================
  
  pachelbel_canon: {
    name: "Orchestral: Canon in D",
    description: "Pachelbel's Canon - Ground bass (D-A-B-F#-G-D-G-A) with canon melody entering on staggered string voices. One trigger starts the 8-note sequence that cascades through all voices.",
    bpm: 60,
    nodes: [
      // =====================================================================
      // GROUND BASS - 8 notes in sequence using delays
      // D(38)-A(33)-B(35)-F#(30)-G(31)-D(38)-G(31)-A(33)
      // Each note 2 beats apart, total cycle = 16 beats
      // =====================================================================
      { id: "bass_trigger", type: "source", x: 60, y: 700, props: { interval: 16, midiNote: 38, intensity: 0.55 } },
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
      { id: "mel_trigger", type: "source", x: 60, y: 100, props: { interval: 16, midiNote: 66, intensity: 0.5 } },
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

  // ============================================================================
  // ORCHESTRAL: Bolero-Style Build
  // ============================================================================
  
  orchestral_bolero: {
    name: "Orchestral: Bolero Build",
    description: "Inspired by Ravel's Bolero - a hypnotic repetitive melody that builds with layered orchestration. Start minimal, then unmute voices progressively.",
    bpm: 72,
    nodes: [
      // ========== SNARE DRUM OSTINATO ==========
      { id: "drum_src", type: "source", x: 60, y: 100, props: { interval: 0.5, midiNote: 60, intensity: 0.25 } },
      { id: "drum_tun", type: "tunnel", x: 180, y: 100, props: {
        tunnelName: "Snare",
        subNodes: [
          { type: 'oscillator', props: { wave: 'white', attack: 0.001, decay: 0.08, mix: 0.6 } },
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.001, decay: 0.06, mix: 0.4 } },
          { type: 'filter', props: { cutoff: 3000, mod: 1500, attack: 0.001, decay: 0.05 } }
        ]
      }},
      { id: "drum_out", type: "speaker", x: 320, y: 100, props: { reverb: 0.15, pan: 0 } },
      
      // ========== FLUTE (First Statement) ==========
      { id: "flute_src", type: "source", x: 60, y: 200, props: { interval: 4, midiNote: 72, intensity: 0.45 } },
      { id: "flute_tun", type: "tunnel", x: 200, y: 200, props: {
        tunnelName: "Flute",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sine', attack: 0.1, decay: 1.0, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.12, decay: 0.9, mix: 0.1 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.1, decay: 0.8, mix: 0.18 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.08, decay: 0.6, mix: 0.06 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.06, decay: 0.35, mix: 0.1 } },
          { type: 'modulator', props: { rate: 5.5, depth: 15, delay: 0.35 } },
          { type: 'filter', props: { cutoff: 4500, mod: 800, attack: 0.08, decay: 0.6 } }
        ]
      }},
      { id: "flute_out", type: "speaker", x: 360, y: 200, props: { reverb: 0.4, pan: -0.3 } },
      
      // ========== CLARINET (Second Voice) ==========
      { id: "clar_src", type: "source", x: 60, y: 300, props: { interval: 4, midiNote: 67, intensity: 0.4 } },
      { id: "clar_delay", type: "delay", x: 160, y: 300, props: { delayTime: 0.25 } },
      { id: "clar_tun", type: "tunnel", x: 280, y: 300, props: {
        tunnelName: "Clarinet",
        subNodes: [
          { type: 'oscillator', props: { wave: 'square', attack: 0.06, decay: 0.85, mix: 1.0 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.05, decay: 0.7, mix: 0.5 } },
          { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.04, decay: 0.6, mix: 0.3 } },
          { type: 'oscillator', props: { ratio: 7, wave: 'sine', attack: 0.03, decay: 0.5, mix: 0.15 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.05, decay: 0.65, mix: 0.08 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.04, decay: 0.15, mix: 0.03 } },
          { type: 'modulator', props: { rate: 5.0, depth: 12, delay: 0.4 } },
          { type: 'filter', props: { cutoff: 1800, mod: 800, attack: 0.05, decay: 0.5 } }
        ]
      }},
      { id: "clar_out", type: "speaker", x: 420, y: 300, props: { reverb: 0.4, pan: 0.3 } },
      
      // ========== OBOE (Counter-melody) ==========
      { id: "oboe_src", type: "source", x: 60, y: 400, props: { interval: 2, midiNote: 76, intensity: 0.4 } },
      { id: "oboe_gate", type: "gate", x: 160, y: 400, props: { prob: 0.7 } },
      { id: "oboe_tun", type: "tunnel", x: 280, y: 400, props: {
        tunnelName: "Oboe",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.08, decay: 0.9, mix: 1.0 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.07, decay: 0.8, mix: 0.55 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.06, decay: 0.7, mix: 0.4 } },
          { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.05, decay: 0.6, mix: 0.28 } },
          { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.04, decay: 0.5, mix: 0.18 } },
          { type: 'oscillator', props: { ratio: 6, wave: 'sine', attack: 0.03, decay: 0.4, mix: 0.1 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.05, decay: 0.25, mix: 0.04 } },
          { type: 'modulator', props: { rate: 5.5, depth: 25, delay: 0.3 } },
          { type: 'filter', props: { cutoff: 2200, mod: 1000, attack: 0.06, decay: 0.5 } }
        ]
      }},
      { id: "oboe_out", type: "speaker", x: 420, y: 400, props: { reverb: 0.45, pan: -0.2 } },
      
      // ========== FRENCH HORN (Sustained Harmony) ==========
      { id: "horn_src", type: "source", x: 500, y: 200, props: { interval: 8, midiNote: 60, intensity: 0.5 } },
      { id: "horn_tun", type: "tunnel", x: 640, y: 200, props: {
        tunnelName: "French Horn",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.15, decay: 1.4, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.18, decay: 1.2, mix: 0.2 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.14, decay: 1.1, mix: 0.5 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.12, decay: 0.9, mix: 0.28 } },
          { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.1, decay: 0.7, mix: 0.15 } },
          { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.08, decay: 0.5, mix: 0.08 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.04, decay: 0.18, mix: 0.05 } },
          { type: 'modulator', props: { rate: 4.2, depth: 10, delay: 0.45 } },
          { type: 'filter', props: { cutoff: 800, mod: 1200, attack: 0.12, decay: 0.8 } }
        ]
      }},
      { id: "horn_out", type: "speaker", x: 800, y: 200, props: { reverb: 0.5, pan: 0.4 } },
      
      // ========== STRINGS PAD ==========
      { id: "strings_src", type: "source", x: 500, y: 320, props: { interval: 8, midiNote: 55, intensity: 0.45 } },
      { id: "strings_tun", type: "tunnel", x: 640, y: 320, props: {
        tunnelName: "String Pad",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.8, decay: 3.5, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.9, decay: 3.2, mix: 0.4 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 1.0, decay: 3.0, mix: 0.25 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.7, decay: 2.8, mix: 0.25 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.6, decay: 2.4, mix: 0.12 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.8, decay: 2.0, mix: 0.025 } },
          { type: 'modulator', props: { rate: 4.0, depth: 12, delay: 0.8 } },
          { type: 'filter', props: { cutoff: 2400, mod: 800, attack: 0.6, decay: 2.0 } }
        ]
      }},
      { id: "strings_out", type: "speaker", x: 800, y: 320, props: { reverb: 0.6, pan: 0 } },
      
      // ========== TRUMPET (Climax) ==========
      { id: "trump_src", type: "source", x: 500, y: 440, props: { interval: 4, midiNote: 79, intensity: 0.55 } },
      { id: "trump_delay", type: "delay", x: 580, y: 440, props: { delayTime: 2 } },
      { id: "trump_tun", type: "tunnel", x: 700, y: 440, props: {
        tunnelName: "Trumpet",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.06, decay: 0.8, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'square', attack: 0.04, decay: 0.6, mix: 0.15 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.05, decay: 0.65, mix: 0.4 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.04, decay: 0.55, mix: 0.28 } },
          { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.03, decay: 0.45, mix: 0.18 } },
          { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.025, decay: 0.35, mix: 0.1 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.01, decay: 0.08, mix: 0.07 } },
          { type: 'modulator', props: { rate: 5.5, depth: 8, delay: 0.25 } },
          { type: 'filter', props: { cutoff: 1800, mod: 3000, attack: 0.04, decay: 0.4 } }
        ]
      }},
      { id: "trump_out", type: "speaker", x: 860, y: 440, props: { reverb: 0.45, pan: -0.4 } },
      
      // ========== TIMPANI (Accents) ==========
      { id: "timp_src", type: "source", x: 500, y: 540, props: { interval: 4, midiNote: 43, intensity: 0.5 } },
      { id: "timp_gate", type: "gate", x: 580, y: 540, props: { prob: 0.4 } },
      { id: "timp_tun", type: "tunnel", x: 700, y: 540, props: {
        tunnelName: "Timpani",
        subNodes: [
          { type: 'pitch', props: { mode: 'shift', shift: -24, fixedMidiNote: 60 } },
          { type: 'oscillator', props: { wave: 'sine', attack: 0.005, decay: 1.5, mix: 1.0 } },
          { type: 'oscillator', props: { ratio: 1.5, wave: 'sine', attack: 0.003, decay: 0.8, mix: 0.3 } },
          { type: 'filter', props: { cutoff: 300, mod: 200, attack: 0.005, decay: 0.8 } }
        ]
      }},
      { id: "timp_out", type: "speaker", x: 860, y: 540, props: { reverb: 0.5, pan: 0 } }
    ],
    edges: [
      // Snare ostinato
      { id: "e_drum1", from: "drum_src", to: "drum_tun" },
      { id: "e_drum2", from: "drum_tun", to: "drum_out" },
      // Flute melody
      { id: "e_flute1", from: "flute_src", to: "flute_tun" },
      { id: "e_flute2", from: "flute_tun", to: "flute_out" },
      // Clarinet
      { id: "e_clar1", from: "clar_src", to: "clar_delay" },
      { id: "e_clar2", from: "clar_delay", to: "clar_tun" },
      { id: "e_clar3", from: "clar_tun", to: "clar_out" },
      // Oboe counter-melody
      { id: "e_oboe1", from: "oboe_src", to: "oboe_gate" },
      { id: "e_oboe2", from: "oboe_gate", to: "oboe_tun" },
      { id: "e_oboe3", from: "oboe_tun", to: "oboe_out" },
      // French Horn
      { id: "e_horn1", from: "horn_src", to: "horn_tun" },
      { id: "e_horn2", from: "horn_tun", to: "horn_out" },
      // Strings pad
      { id: "e_str1", from: "strings_src", to: "strings_tun" },
      { id: "e_str2", from: "strings_tun", to: "strings_out" },
      // Trumpet
      { id: "e_trump1", from: "trump_src", to: "trump_delay" },
      { id: "e_trump2", from: "trump_delay", to: "trump_tun" },
      { id: "e_trump3", from: "trump_tun", to: "trump_out" },
      // Timpani
      { id: "e_timp1", from: "timp_src", to: "timp_gate" },
      { id: "e_timp2", from: "timp_gate", to: "timp_tun" },
      { id: "e_timp3", from: "timp_tun", to: "timp_out" }
    ]
  },

  // ============================================================================
  // ORCHESTRAL: Night Symphony
  // ============================================================================
  
  night_symphony: {
    name: "Orchestral: Night Symphony",
    description: "A nocturnal orchestral piece with pizzicato strings, harp arpeggios, and ethereal choir pads. Inspired by romantic-era night music.",
    bpm: 54,
    nodes: [
      // ========== PIZZICATO STRINGS ==========
      { id: "pizz_src", type: "source", x: 60, y: 150, props: { interval: 1, midiNote: 62, intensity: 0.4 } },
      { id: "pizz_gate", type: "gate", x: 140, y: 150, props: { prob: 0.65 } },
      { id: "pizz_tun", type: "tunnel", x: 260, y: 150, props: {
        tunnelName: "Pizzicato",
        subNodes: [
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.002, decay: 0.15, mix: 1.0 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.001, decay: 0.1, mix: 0.3 } },
          { type: 'filter', props: { cutoff: 3500, mod: 2000, attack: 0.001, decay: 0.1 } }
        ]
      }},
      { id: "pizz_out", type: "speaker", x: 400, y: 150, props: { reverb: 0.55, pan: -0.4 } },
      
      // ========== HARP ARPEGGIOS ==========
      { id: "harp_src", type: "source", x: 60, y: 270, props: { interval: 0.5, midiNote: 72, intensity: 0.35 } },
      { id: "harp_split", type: "splitter", x: 140, y: 270, props: {} },
      { id: "harp_p1", type: "pitch", x: 220, y: 230, props: { mode: 'shift', shift: 0 } },
      { id: "harp_p2", type: "pitch", x: 220, y: 310, props: { mode: 'shift', shift: 4 } },
      { id: "harp_tun1", type: "tunnel", x: 340, y: 230, props: {
        tunnelName: "Harp High",
        subNodes: [
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.002, decay: 2.0, mix: 1.0 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.001, decay: 1.5, mix: 0.3 } },
          { type: 'filter', props: { cutoff: 4000, mod: 2000, attack: 0.001, decay: 1.0 } }
        ]
      }},
      { id: "harp_tun2", type: "tunnel", x: 340, y: 310, props: {
        tunnelName: "Harp Low",
        subNodes: [
          { type: 'pitch', props: { mode: 'shift', shift: -12, fixedMidiNote: 60 } },
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.003, decay: 2.5, mix: 1.0 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.002, decay: 2.0, mix: 0.25 } },
          { type: 'filter', props: { cutoff: 2500, mod: 1500, attack: 0.002, decay: 1.2 } }
        ]
      }},
      { id: "harp_out1", type: "speaker", x: 480, y: 230, props: { reverb: 0.65, pan: 0.3 } },
      { id: "harp_out2", type: "speaker", x: 480, y: 310, props: { reverb: 0.65, pan: -0.1 } },
      
      // ========== CHOIR PAD ==========
      { id: "choir_src", type: "source", x: 60, y: 420, props: { interval: 8, midiNote: 55, intensity: 0.4 } },
      { id: "choir_tun", type: "tunnel", x: 220, y: 420, props: {
        tunnelName: "Choir",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sine', attack: 0.5, decay: 3.0, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.6, decay: 2.8, mix: 0.35 } },
          { type: 'oscillator', props: { wave: 'sine', attack: 0.55, decay: 2.6, mix: 0.2 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.45, decay: 2.4, mix: 0.3 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.4, decay: 2.0, mix: 0.15 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.3, decay: 0.6, mix: 0.04 } },
          { type: 'modulator', props: { rate: 5.2, depth: 18, delay: 0.6 } },
          { type: 'filter', props: { cutoff: 2200, mod: 600, attack: 0.4, decay: 2.0 } }
        ]
      }},
      { id: "choir_out", type: "speaker", x: 400, y: 420, props: { reverb: 0.7, pan: 0 } },
      
      // ========== HORN MELODY ==========
      { id: "horn_src", type: "source", x: 560, y: 180, props: { interval: 4, midiNote: 65, intensity: 0.5 } },
      { id: "horn_delay", type: "delay", x: 640, y: 180, props: { delayTime: 1 } },
      { id: "horn_tun", type: "tunnel", x: 760, y: 180, props: {
        tunnelName: "French Horn",
        subNodes: [
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.15, decay: 1.4, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'triangle', attack: 0.18, decay: 1.2, mix: 0.2 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.14, decay: 1.1, mix: 0.5 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.12, decay: 0.9, mix: 0.28 } },
          { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.1, decay: 0.7, mix: 0.15 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.04, decay: 0.18, mix: 0.05 } },
          { type: 'filter', props: { cutoff: 800, mod: 1200, attack: 0.12, decay: 0.8 } },
          { type: 'modulator', props: { rate: 4.2, depth: 10, delay: 0.45 } }
        ]
      }},
      { id: "horn_out", type: "speaker", x: 920, y: 180, props: { reverb: 0.55, pan: 0.2 } },
      
      // ========== GLOCKENSPIEL SPARKLE ==========
      { id: "glock_src", type: "source", x: 560, y: 300, props: { interval: 2, midiNote: 84, intensity: 0.3 } },
      { id: "glock_gate", type: "gate", x: 640, y: 300, props: { prob: 0.3 } },
      { id: "glock_tun", type: "tunnel", x: 760, y: 300, props: {
        tunnelName: "Glockenspiel",
        subNodes: [
          { type: 'pitch', props: { mode: 'shift', shift: 12, fixedMidiNote: 60 } },
          { type: 'oscillator', props: { wave: 'sine', attack: 0.001, decay: 2.0, mix: 1.0 } },
          { type: 'oscillator', props: { ratio: 2.3, wave: 'sine', attack: 0.001, decay: 1.5, mix: 0.4 } },
          { type: 'oscillator', props: { ratio: 5.4, wave: 'sine', attack: 0.001, decay: 0.8, mix: 0.2 } }
        ]
      }},
      { id: "glock_out", type: "speaker", x: 920, y: 300, props: { reverb: 0.7, pan: 0.5 } },
      
      // ========== CELLO BASS ==========
      { id: "cello_src", type: "source", x: 560, y: 420, props: { interval: 4, midiNote: 48, intensity: 0.5 } },
      { id: "cello_tun", type: "tunnel", x: 720, y: 420, props: {
        tunnelName: "Cello",
        subNodes: [
          { type: 'pitch', props: { mode: 'shift', shift: -12, fixedMidiNote: 60 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.22, decay: 2.0, mix: 1.0 } },
          { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.25, decay: 1.8, mix: 0.25 } },
          { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.2, decay: 1.6, mix: 0.4 } },
          { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.18, decay: 1.4, mix: 0.25 } },
          { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.15, decay: 1.2, mix: 0.12 } },
          { type: 'oscillator', props: { wave: 'pink', attack: 0.25, decay: 1.2, mix: 0.035 } },
          { type: 'modulator', props: { rate: 4.8, depth: 22, delay: 0.6 } },
          { type: 'filter', props: { cutoff: 1600, mod: 1000, attack: 0.18, decay: 1.2 } }
        ]
      }},
      { id: "cello_out", type: "speaker", x: 880, y: 420, props: { reverb: 0.5, pan: -0.3 } }
    ],
    edges: [
      // Pizzicato
      { id: "e_pizz1", from: "pizz_src", to: "pizz_gate" },
      { id: "e_pizz2", from: "pizz_gate", to: "pizz_tun" },
      { id: "e_pizz3", from: "pizz_tun", to: "pizz_out" },
      // Harp arpeggios
      { id: "e_harp1", from: "harp_src", to: "harp_split" },
      { id: "e_harp2a", from: "harp_split", to: "harp_p1" },
      { id: "e_harp2b", from: "harp_split", to: "harp_p2" },
      { id: "e_harp3a", from: "harp_p1", to: "harp_tun1" },
      { id: "e_harp3b", from: "harp_p2", to: "harp_tun2" },
      { id: "e_harp4a", from: "harp_tun1", to: "harp_out1" },
      { id: "e_harp4b", from: "harp_tun2", to: "harp_out2" },
      // Choir
      { id: "e_choir1", from: "choir_src", to: "choir_tun" },
      { id: "e_choir2", from: "choir_tun", to: "choir_out" },
      // Horn melody
      { id: "e_horn1", from: "horn_src", to: "horn_delay" },
      { id: "e_horn2", from: "horn_delay", to: "horn_tun" },
      { id: "e_horn3", from: "horn_tun", to: "horn_out" },
      // Glockenspiel
      { id: "e_glock1", from: "glock_src", to: "glock_gate" },
      { id: "e_glock2", from: "glock_gate", to: "glock_tun" },
      { id: "e_glock3", from: "glock_tun", to: "glock_out" },
      // Cello bass
      { id: "e_cello1", from: "cello_src", to: "cello_tun" },
      { id: "e_cello2", from: "cello_tun", to: "cello_out" }
    ]
  },

  // ============================================================================
  // EVOLUTIONARY: Genetic Melodies
  // ============================================================================
  
  genetic_evolution: {
    name: "Evolutionary: Genetic Melodies",
    description: "Demonstrates genetic algorithm nodes: Mutator adds random variations, Fitness Gate filters out dissonant notes, creating melodies that naturally evolve toward harmony.",
    bpm: 100,
    nodes: [
      // Seed melody - random notes that will evolve
      { id: "seed", type: "source", x: 60, y: 250, props: { interval: 0.5, noteIndex: -1, intensity: 0.6 } },
      
      // Mutator adds genetic drift - small random pitch variations
      { id: "mutate", type: "mutator", x: 180, y: 250, props: { 
        mode: "drift", 
        probability: 0.7,
        pitchDrift: 3,
        pitchRadiation: 12,
        gainDrift: 0.1,
        cutoffDrift: 0.2,
        waveChange: false,
        targets: ["pitch"]
      }},
      
      // Fitness gate - only let through notes that fit the scale
      { id: "fitness", type: "gate", x: 300, y: 250, props: {
        mode: "oscillator",
        prob: 0.5,
        harmonicThreshold: 0.7,
        energyThreshold: 0.1,
        densityThreshold: 8,
        useGlobalKey: true,
        scale: "major",
        root: 0
      }},
      
      // Quantize survivors to scale
      { id: "quant", type: "quantizer", x: 420, y: 250, props: { strength: 1.0 } },
      
      // Shape the sound
      { id: "pol", type: "oscillator", x: 540, y: 250, props: { wave: "triangle", attack: 0.02, decay: 0.3 } },
      { id: "out", type: "speaker", x: 660, y: 250, props: { reverb: 0.4, pan: 0 } },
      
      // Bass layer - more stable with less mutation
      { id: "bass_seed", type: "source", x: 60, y: 400, props: { interval: 2, noteIndex: -1, intensity: 0.7 } },
      { id: "bass_mut", type: "mutator", x: 180, y: 400, props: { 
        mode: "drift", 
        probability: 0.3,
        pitchDrift: 2,
        pitchRadiation: 5,
        gainDrift: 0.05,
        cutoffDrift: 0.1,
        waveChange: false,
        targets: ["pitch"]
      }},
      { id: "bass_fit", type: "gate", x: 300, y: 400, props: {
        mode: "oscillator",
        prob: 0.5,
        harmonicThreshold: 0.8,
        energyThreshold: 0.2,
        densityThreshold: 4,
        useGlobalKey: true,
        scale: "major",
        root: 0
      }},
      { id: "bass_p", type: "pitch", x: 420, y: 400, props: { shift: -12 } },
      { id: "bass_pol", type: "oscillator", x: 540, y: 400, props: { wave: "sawtooth", attack: 0.05, decay: 0.5 } },
      { id: "bass_flt", type: "filter", x: 660, y: 400, props: { cutoff: 600, mod: 400, attack: 0.02, decay: 0.3 } },
      { id: "bass_out", type: "speaker", x: 780, y: 400, props: { reverb: 0.2, pan: 0 } }
    ],
    edges: [
      // Main melody chain
      { id: "e1", from: "seed", to: "mutate" },
      { id: "e2", from: "mutate", to: "fitness" },
      { id: "e3", from: "fitness", to: "quant" },
      { id: "e4", from: "quant", to: "pol" },
      { id: "e5", from: "pol", to: "out" },
      // Bass chain
      { id: "eb1", from: "bass_seed", to: "bass_mut" },
      { id: "eb2", from: "bass_mut", to: "bass_fit" },
      { id: "eb3", from: "bass_fit", to: "bass_p" },
      { id: "eb4", from: "bass_p", to: "bass_pol" },
      { id: "eb5", from: "bass_pol", to: "bass_flt" },
      { id: "eb6", from: "bass_flt", to: "bass_out" }
    ]
  },

  // ============================================================================
  // EVOLUTIONARY: Radiation Burst
  // ============================================================================
  
  radiation_burst: {
    name: "Evolutionary: Radiation Burst",
    description: "Mutator in radiation mode creates dramatic sonic explosions with large pitch jumps and wave changes. Gates control the density of mutations.",
    bpm: 85,
    nodes: [
      // Trigger source
      { id: "trigger", type: "source", x: 60, y: 300, props: { interval: 4, midiNote: 60, intensity: 0.7 } },
      { id: "split", type: "splitter", x: 160, y: 300, props: {} },
      
      // Pure voice - no mutation (for reference)
      { id: "pure_pol", type: "oscillator", x: 300, y: 180, props: { wave: "sine", attack: 0.1, decay: 1.0 } },
      { id: "pure_out", type: "speaker", x: 440, y: 180, props: { reverb: 0.5, pan: -0.5 } },
      
      // Radiation voice - wild mutations
      { id: "rad_mut", type: "mutator", x: 300, y: 300, props: { 
        mode: "radiation", 
        probability: 0.9,
        pitchDrift: 2,
        pitchRadiation: 24,
        gainDrift: 0.3,
        cutoffDrift: 0.5,
        waveChange: true,
        targets: ["pitch", "wave", "gain"]
      }},
      { id: "rad_pol", type: "oscillator", x: 440, y: 300, props: { wave: "sawtooth", attack: 0.02, decay: 0.6 } },
      { id: "rad_flt", type: "filter", x: 560, y: 300, props: { cutoff: 2000, mod: 3000, attack: 0.02, decay: 0.4 } },
      { id: "rad_out", type: "speaker", x: 700, y: 300, props: { reverb: 0.6, pan: 0.5 } },
      
      // Delayed radiation echo
      { id: "delay1", type: "delay", x: 300, y: 420, props: { delayTime: 0.5 } },
      { id: "rad_mut2", type: "mutator", x: 440, y: 420, props: { 
        mode: "radiation", 
        probability: 0.6,
        pitchDrift: 1,
        pitchRadiation: 12,
        gainDrift: 0.2,
        cutoffDrift: 0.3,
        waveChange: true,
        targets: ["pitch"]
      }},
      { id: "rad_pol2", type: "oscillator", x: 560, y: 420, props: { wave: "triangle", attack: 0.05, decay: 0.8 } },
      { id: "rad_out2", type: "speaker", x: 700, y: 420, props: { reverb: 0.7, pan: 0 } }
    ],
    edges: [
      { id: "e1", from: "trigger", to: "split" },
      // Pure voice
      { id: "ep1", from: "split", to: "pure_pol" },
      { id: "ep2", from: "pure_pol", to: "pure_out" },
      // Radiation voice  
      { id: "er1", from: "split", to: "rad_mut" },
      { id: "er2", from: "rad_mut", to: "rad_pol" },
      { id: "er3", from: "rad_pol", to: "rad_flt" },
      { id: "er4", from: "rad_flt", to: "rad_out" },
      // Delayed radiation
      { id: "ed1", from: "split", to: "delay1" },
      { id: "ed2", from: "delay1", to: "rad_mut2" },
      { id: "ed3", from: "rad_mut2", to: "rad_pol2" },
      { id: "ed4", from: "rad_pol2", to: "rad_out2" }
    ]
  },

  // ============================================================================
  // OSCILLATOR MODES TUTORIAL
  // ============================================================================

  oscillatorModes: {
    name: "Tutorial: Oscillator Modes",
    description: "Learn the three oscillator modes: Additive (layering), Ring (multiplication), and FM (frequency modulation). Each scene demonstrates one mode with the same base frequency for easy comparison.",
    bpm: 80,
    scenes: [
      // Scene 1: Introduction
      {
        name: "1. Introduction",
        color: "#9c27b0",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "intro_src", type: "source", x: 200, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
          { id: "intro_osc", type: "oscillator", x: 400, y: 300, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1 } },
          { id: "intro_spk", type: "speaker", x: 600, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.5, releaseTime: 0.8 } }
        ],
        edges: [
          { id: "e1", from: "intro_src", to: "intro_osc" },
          { id: "e2", from: "intro_osc", to: "intro_spk" }
        ]
      },

      // Scene 2: Additive Mode - Layered Harmonics
      {
        name: "2. Additive: Organ",
        color: "#4caf50",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "add_src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.6 } },
          // Fundamental
          { id: "add_osc1", type: "oscillator", x: 280, y: 200, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.01, decay: 2, mix: 1 } },
          // 2nd harmonic (octave)
          { id: "add_osc2", type: "oscillator", x: 280, y: 300, props: { wave: "sine", ratio: 2, mode: "additive", attack: 0.01, decay: 1.5, mix: 0.5 } },
          // 3rd harmonic (fifth above octave)
          { id: "add_osc3", type: "oscillator", x: 280, y: 400, props: { wave: "sine", ratio: 3, mode: "additive", attack: 0.01, decay: 1, mix: 0.3 } },
          { id: "add_spk", type: "speaker", x: 500, y: 300, props: { reverb: 0.5, pan: 0, holdTime: 0.5, releaseTime: 1 } }
        ],
        edges: [
          { id: "e1", from: "add_src", to: "add_osc1" },
          { id: "e2", from: "add_src", to: "add_osc2" },
          { id: "e3", from: "add_src", to: "add_osc3" },
          { id: "e4", from: "add_osc1", to: "add_spk" },
          { id: "e5", from: "add_osc2", to: "add_spk" },
          { id: "e6", from: "add_osc3", to: "add_spk" }
        ]
      },

      // Scene 3: Ring Mode - Metallic Bell
      {
        name: "3. Ring: Metallic",
        color: "#ff9800",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "ring_src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
          // Carrier (this will be multiplied)
          { id: "ring_osc1", type: "oscillator", x: 280, y: 250, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.01, decay: 2, mix: 1 } },
          // Modulator - non-integer ratio creates inharmonic sidebands
          { id: "ring_osc2", type: "oscillator", x: 280, y: 350, props: { wave: "sine", ratio: 1.4, mode: "ring", attack: 0.01, decay: 2, mix: 1 } },
          { id: "ring_spk", type: "speaker", x: 500, y: 300, props: { reverb: 0.6, pan: 0, holdTime: 0.3, releaseTime: 1.5 } }
        ],
        edges: [
          { id: "e1", from: "ring_src", to: "ring_osc1" },
          { id: "e2", from: "ring_src", to: "ring_osc2" },
          { id: "e3", from: "ring_osc1", to: "ring_spk" },
          { id: "e4", from: "ring_osc2", to: "ring_spk" }
        ]
      },

      // Scene 4: FM Mode - Classic Bell
      {
        name: "4. FM: Bell",
        color: "#2196f3",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "fm_src", type: "source", x: 100, y: 300, props: { interval: 2, midiNote: 60, intensity: 0.7 } },
          // Modulator (mode:fm) - this is SILENT, only modulates the next osc
          { id: "fm_mod", type: "oscillator", x: 300, y: 300, props: { wave: "sine", ratio: 3.5, mode: "fm", modulationIndex: 5, feedback: 0, attack: 0.001, decay: 1.5, mix: 0.5 } },
          // Carrier (mode:additive) - this produces the sound
          { id: "fm_car", type: "oscillator", x: 500, y: 300, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.001, decay: 3, mix: 1 } },
          { id: "fm_spk", type: "speaker", x: 700, y: 300, props: { reverb: 0.7, pan: 0, holdTime: 0.1, releaseTime: 2 } }
        ],
        edges: [
          { id: "e1", from: "fm_src", to: "fm_mod" },
          { id: "e2", from: "fm_mod", to: "fm_car" },
          { id: "e3", from: "fm_car", to: "fm_spk" }
        ]
      },

      // Scene 5: FM Mode - Electric Piano
      {
        name: "5. FM: E-Piano",
        color: "#3f51b5",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "ep_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 60, intensity: 0.6 } },
          // Modulator - ratio:2 (octave) with moderate index
          { id: "ep_mod", type: "oscillator", x: 300, y: 300, props: { wave: "sine", ratio: 2, mode: "fm", modulationIndex: 2.5, feedback: 0, attack: 0.01, decay: 0.8, mix: 0.8 } },
          // Carrier - fundamental
          { id: "ep_car", type: "oscillator", x: 500, y: 300, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1 } },
          { id: "ep_spk", type: "speaker", x: 700, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.2, releaseTime: 0.8 } }
        ],
        edges: [
          { id: "e1", from: "ep_src", to: "ep_mod" },
          { id: "e2", from: "ep_mod", to: "ep_car" },
          { id: "e3", from: "ep_car", to: "ep_spk" }
        ]
      },

      // Scene 6: FM with Feedback - Gritty Bass
      {
        name: "6. FM: Feedback Bass",
        color: "#673ab7",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "fb_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.8 } },
          // Modulator with self-feedback for grittier sound
          { id: "fb_mod", type: "oscillator", x: 300, y: 300, props: { wave: "sine", ratio: 1, mode: "fm", modulationIndex: 3, feedback: 0.4, attack: 0.001, decay: 0.3, mix: 1 } },
          // Carrier at sub-octave
          { id: "fb_car", type: "oscillator", x: 500, y: 300, props: { wave: "sine", ratio: 0.5, mode: "additive", attack: 0.001, decay: 0.5, mix: 1 } },
          { id: "fb_flt", type: "filter", x: 650, y: 300, props: { cutoff: 800, attack: 0.01, decay: 0.2, mod: 0.5 } },
          { id: "fb_spk", type: "speaker", x: 800, y: 300, props: { reverb: 0.2, pan: 0, holdTime: 0.1, releaseTime: 0.3 } }
        ],
        edges: [
          { id: "e1", from: "fb_src", to: "fb_mod" },
          { id: "e2", from: "fb_mod", to: "fb_car" },
          { id: "e3", from: "fb_car", to: "fb_flt" },
          { id: "e4", from: "fb_flt", to: "fb_spk" }
        ]
      },

      // Scene 7: Comparison - All Three Modes
      {
        name: "7. Compare All",
        color: "#e91e63",
        durationBeats: 24,
        loopCount: -1,
        nodes: [
          // Shared trigger
          { id: "cmp_src", type: "source", x: 100, y: 300, props: { interval: 3, midiNote: 48, intensity: 0.6 } },
          { id: "cmp_split", type: "splitter", x: 220, y: 300, props: { mode: "all" } },
          
          // Top: Additive (warm organ)
          { id: "cmp_add1", type: "oscillator", x: 380, y: 150, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.01, decay: 2, mix: 1 } },
          { id: "cmp_add2", type: "oscillator", x: 380, y: 220, props: { wave: "sine", ratio: 2, mode: "additive", attack: 0.01, decay: 1.5, mix: 0.4 } },
          { id: "cmp_add_spk", type: "speaker", x: 560, y: 185, props: { reverb: 0.3, pan: -0.7, holdTime: 0.5, releaseTime: 0.8 } },
          
          // Middle: Ring (metallic)
          { id: "cmp_ring1", type: "oscillator", x: 380, y: 300, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.01, decay: 2, mix: 1 } },
          { id: "cmp_ring2", type: "oscillator", x: 500, y: 300, props: { wave: "sine", ratio: 1.5, mode: "ring", attack: 0.01, decay: 2, mix: 1 } },
          { id: "cmp_ring_spk", type: "speaker", x: 650, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.5, releaseTime: 1 } },
          
          // Bottom: FM (bell)
          { id: "cmp_fm_mod", type: "oscillator", x: 380, y: 420, props: { wave: "sine", ratio: 3, mode: "fm", modulationIndex: 4, feedback: 0, attack: 0.001, decay: 1, mix: 0.6 } },
          { id: "cmp_fm_car", type: "oscillator", x: 530, y: 420, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.001, decay: 2.5, mix: 1 } },
          { id: "cmp_fm_spk", type: "speaker", x: 680, y: 420, props: { reverb: 0.6, pan: 0.7, holdTime: 0.2, releaseTime: 1.5 } }
        ],
        edges: [
          { id: "e0", from: "cmp_src", to: "cmp_split" },
          // Additive path (top, panned left)
          { id: "ea1", from: "cmp_split", to: "cmp_add1" },
          { id: "ea2", from: "cmp_split", to: "cmp_add2" },
          { id: "ea3", from: "cmp_add1", to: "cmp_add_spk" },
          { id: "ea4", from: "cmp_add2", to: "cmp_add_spk" },
          // Ring path (middle, center)
          { id: "er1", from: "cmp_split", to: "cmp_ring1" },
          { id: "er2", from: "cmp_split", to: "cmp_ring2" },
          { id: "er3", from: "cmp_ring1", to: "cmp_ring_spk" },
          { id: "er4", from: "cmp_ring2", to: "cmp_ring_spk" },
          // FM path (bottom, panned right)
          { id: "ef1", from: "cmp_split", to: "cmp_fm_mod" },
          { id: "ef2", from: "cmp_fm_mod", to: "cmp_fm_car" },
          { id: "ef3", from: "cmp_fm_car", to: "cmp_fm_spk" }
        ]
      }
    ]
  },

  // ============================================================================
  // FILTER TYPES TUTORIAL
  // ============================================================================

  filterTypesTutorial: {
    name: "Tutorial: Filter Types",
    description: "Learn the four filter types: Lowpass (removes highs), Highpass (removes lows), Bandpass (isolates a band), and Notch (removes a band). Each scene demonstrates one filter type with the same source for easy comparison.",
    bpm: 90,
    scenes: [
      // Scene 1: Introduction - Raw Source
      {
        name: "1. Raw Source",
        color: "#9c27b0",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "raw_src", type: "source", x: 150, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
          { id: "raw_osc", type: "oscillator", x: 300, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 0.8, mix: 1 } },
          { id: "raw_spk", type: "speaker", x: 500, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.2, releaseTime: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "raw_src", to: "raw_osc" },
          { id: "e2", from: "raw_osc", to: "raw_spk" }
        ]
      },

      // Scene 2: Lowpass - Removes high frequencies
      {
        name: "2. Lowpass: Warm",
        color: "#4caf50",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "lp_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
          { id: "lp_osc", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 0.8, mix: 1 } },
          { id: "lp_flt", type: "filter", x: 400, y: 300, props: { type: "lowpass", cutoff: 800, resonance: 0.3, attack: 0, decay: 0, mod: 0 } },
          { id: "lp_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.2, releaseTime: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "lp_src", to: "lp_osc" },
          { id: "e2", from: "lp_osc", to: "lp_flt" },
          { id: "e3", from: "lp_flt", to: "lp_spk" }
        ]
      },

      // Scene 3: Highpass - Removes low frequencies
      {
        name: "3. Highpass: Thin",
        color: "#2196f3",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "hp_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
          { id: "hp_osc", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 0.8, mix: 1 } },
          { id: "hp_flt", type: "filter", x: 400, y: 300, props: { type: "highpass", cutoff: 1000, resonance: 0.2, attack: 0, decay: 0, mod: 0 } },
          { id: "hp_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.2, releaseTime: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "hp_src", to: "hp_osc" },
          { id: "e2", from: "hp_osc", to: "hp_flt" },
          { id: "e3", from: "hp_flt", to: "hp_spk" }
        ]
      },

      // Scene 4: Bandpass - Isolates a frequency band
      {
        name: "4. Bandpass: Focused",
        color: "#ff9800",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "bp_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
          { id: "bp_osc", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 0.8, mix: 1 } },
          { id: "bp_flt", type: "filter", x: 400, y: 300, props: { type: "bandpass", cutoff: 500, resonance: 0.6, attack: 0, decay: 0, mod: 0 } },
          { id: "bp_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.2, releaseTime: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "bp_src", to: "bp_osc" },
          { id: "e2", from: "bp_osc", to: "bp_flt" },
          { id: "e3", from: "bp_flt", to: "bp_spk" }
        ]
      },

      // Scene 5: Notch - Removes a frequency band
      {
        name: "5. Notch: Phaser-like",
        color: "#e91e63",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "nt_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
          { id: "nt_osc", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 0.8, mix: 1 } },
          { id: "nt_flt", type: "filter", x: 400, y: 300, props: { type: "notch", cutoff: 1000, resonance: 0.7, attack: 0, decay: 0, mod: 0 } },
          { id: "nt_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.2, releaseTime: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "nt_src", to: "nt_osc" },
          { id: "e2", from: "nt_osc", to: "nt_flt" },
          { id: "e3", from: "nt_flt", to: "nt_spk" }
        ]
      },

      // Scene 6: Filter Envelope - Animated cutoff
      {
        name: "6. Filter Envelope",
        color: "#673ab7",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "env_src", type: "source", x: 100, y: 300, props: { interval: 0.5, midiNote: 36, intensity: 0.7 } },
          { id: "env_osc", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.001, decay: 0.5, mix: 1 } },
          { id: "env_flt", type: "filter", x: 400, y: 300, props: { type: "lowpass", cutoff: 200, resonance: 0.5, attack: 0.01, decay: 0.3, mod: 4000 } },
          { id: "env_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.2, pan: 0, holdTime: 0.1, releaseTime: 0.4 } }
        ],
        edges: [
          { id: "e1", from: "env_src", to: "env_osc" },
          { id: "e2", from: "env_osc", to: "env_flt" },
          { id: "e3", from: "env_flt", to: "env_spk" }
        ]
      },

      // Scene 7: High Resonance - Self-oscillation
      {
        name: "7. Resonance Peak",
        color: "#f44336",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "res_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.5 } },
          { id: "res_osc", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 0.6, mix: 1 } },
          { id: "res_flt", type: "filter", x: 400, y: 300, props: { type: "lowpass", cutoff: 600, resonance: 0.85, attack: 0, decay: 0, mod: 0 } },
          { id: "res_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.2, releaseTime: 0.5 } }
        ],
        edges: [
          { id: "e1", from: "res_src", to: "res_osc" },
          { id: "e2", from: "res_osc", to: "res_flt" },
          { id: "e3", from: "res_flt", to: "res_spk" }
        ]
      }
    ]
  },

  // ============================================================================
  // UNISON & DETUNE TUTORIAL
  // ============================================================================

  unisonTutorial: {
    name: "Tutorial: Unison & Detune",
    description: "Learn how unison voices and detuning create thick, chorus-like sounds. Unison duplicates the oscillator, detune spreads the pitch, and stereo spread places voices across the stereo field.",
    bpm: 80,
    scenes: [
      // Scene 1: Single Voice - Baseline
      {
        name: "1. Single Voice",
        color: "#9c27b0",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "sv_src", type: "source", x: 150, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
          { id: "sv_osc", type: "oscillator", x: 350, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1, unison: 1, detune: 0, stereoSpread: 0.5 } },
          { id: "sv_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.5, releaseTime: 0.8 } }
        ],
        edges: [
          { id: "e1", from: "sv_src", to: "sv_osc" },
          { id: "e2", from: "sv_osc", to: "sv_spk" }
        ]
      },

      // Scene 2: 2 Voices - Subtle thickness
      {
        name: "2. Two Voices",
        color: "#4caf50",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "2v_src", type: "source", x: 150, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
          { id: "2v_osc", type: "oscillator", x: 350, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1, unison: 2, detune: 10, stereoSpread: 0.7 } },
          { id: "2v_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.5, releaseTime: 0.8 } }
        ],
        edges: [
          { id: "e1", from: "2v_src", to: "2v_osc" },
          { id: "e2", from: "2v_osc", to: "2v_spk" }
        ]
      },

      // Scene 3: 4 Voices - Classic supersaw
      {
        name: "3. Supersaw (4)",
        color: "#2196f3",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "4v_src", type: "source", x: 150, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.7 } },
          { id: "4v_osc", type: "oscillator", x: 350, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1, unison: 4, detune: 15, stereoSpread: 0.8 } },
          { id: "4v_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.5, releaseTime: 0.8 } }
        ],
        edges: [
          { id: "e1", from: "4v_src", to: "4v_osc" },
          { id: "e2", from: "4v_osc", to: "4v_spk" }
        ]
      },

      // Scene 4: 8 Voices - Massive
      {
        name: "4. Massive (8)",
        color: "#ff9800",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "8v_src", type: "source", x: 150, y: 300, props: { interval: 2, midiNote: 48, intensity: 0.6 } },
          { id: "8v_osc", type: "oscillator", x: 350, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1, unison: 8, detune: 25, stereoSpread: 1.0 } },
          { id: "8v_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.5, releaseTime: 0.8 } }
        ],
        edges: [
          { id: "e1", from: "8v_src", to: "8v_osc" },
          { id: "e2", from: "8v_osc", to: "8v_spk" }
        ]
      },

      // Scene 5: Wide vs Narrow stereo spread
      {
        name: "5. Stereo Spread",
        color: "#e91e63",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          // Narrow spread (left)
          { id: "ns_src", type: "source", x: 100, y: 200, props: { interval: 2, midiNote: 48, intensity: 0.6 } },
          { id: "ns_osc", type: "oscillator", x: 280, y: 200, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1, unison: 4, detune: 20, stereoSpread: 0.2 } },
          { id: "ns_spk", type: "speaker", x: 460, y: 200, props: { reverb: 0.3, pan: -0.5, holdTime: 0.5, releaseTime: 0.8 } },
          // Wide spread (right)
          { id: "ws_src", type: "source", x: 100, y: 400, props: { interval: 2, midiNote: 48, intensity: 0.6 } },
          { id: "ws_osc", type: "oscillator", x: 280, y: 400, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.01, decay: 1.5, mix: 1, unison: 4, detune: 20, stereoSpread: 1.0 } },
          { id: "ws_spk", type: "speaker", x: 460, y: 400, props: { reverb: 0.3, pan: 0.5, holdTime: 0.5, releaseTime: 0.8 } }
        ],
        edges: [
          { id: "e1", from: "ns_src", to: "ns_osc" },
          { id: "e2", from: "ns_osc", to: "ns_spk" },
          { id: "e3", from: "ws_src", to: "ws_osc" },
          { id: "e4", from: "ws_osc", to: "ws_spk" }
        ]
      },

      // Scene 6: Unison with filter
      {
        name: "6. Unison + Filter",
        color: "#673ab7",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "uf_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 36, intensity: 0.7 } },
          { id: "uf_osc", type: "oscillator", x: 250, y: 300, props: { wave: "sawtooth", ratio: 1, mode: "additive", attack: 0.001, decay: 0.8, mix: 1, unison: 6, detune: 20, stereoSpread: 0.8 } },
          { id: "uf_flt", type: "filter", x: 400, y: 300, props: { type: "lowpass", cutoff: 300, resonance: 0.4, attack: 0.01, decay: 0.4, mod: 3000 } },
          { id: "uf_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.2, releaseTime: 0.6 } }
        ],
        edges: [
          { id: "e1", from: "uf_src", to: "uf_osc" },
          { id: "e2", from: "uf_osc", to: "uf_flt" },
          { id: "e3", from: "uf_flt", to: "uf_spk" }
        ]
      }
    ]
  },

  // ============================================================================
  // NOISE TYPES TUTORIAL  
  // ============================================================================

  noiseTypesTutorial: {
    name: "Tutorial: Noise Types",
    description: "Learn the three noise types: White (equal energy per frequency), Pink (-3dB/octave, natural), and Brown (-6dB/octave, deep rumble). Use noise for percussion, textures, and effects.",
    bpm: 100,
    scenes: [
      // Scene 1: White Noise - Bright, hissy
      {
        name: "1. White Noise",
        color: "#ffffff",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "wn_src", type: "source", x: 150, y: 300, props: { interval: 0.5, midiNote: 60, intensity: 0.4 } },
          { id: "wn_osc", type: "oscillator", x: 350, y: 300, props: { wave: "white", ratio: 1, mode: "additive", attack: 0.001, decay: 0.15, mix: 1 } },
          { id: "wn_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.2, pan: 0, holdTime: 0.05, releaseTime: 0.1 } }
        ],
        edges: [
          { id: "e1", from: "wn_src", to: "wn_osc" },
          { id: "e2", from: "wn_osc", to: "wn_spk" }
        ]
      },

      // Scene 2: Pink Noise - Natural, balanced
      {
        name: "2. Pink Noise",
        color: "#e91e63",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "pn_src", type: "source", x: 150, y: 300, props: { interval: 0.5, midiNote: 60, intensity: 0.5 } },
          { id: "pn_osc", type: "oscillator", x: 350, y: 300, props: { wave: "pink", ratio: 1, mode: "additive", attack: 0.001, decay: 0.2, mix: 1 } },
          { id: "pn_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.3, pan: 0, holdTime: 0.05, releaseTime: 0.15 } }
        ],
        edges: [
          { id: "e1", from: "pn_src", to: "pn_osc" },
          { id: "e2", from: "pn_osc", to: "pn_spk" }
        ]
      },

      // Scene 3: Brown Noise - Deep rumble
      {
        name: "3. Brown Noise",
        color: "#795548",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "bn_src", type: "source", x: 150, y: 300, props: { interval: 0.5, midiNote: 60, intensity: 0.6 } },
          { id: "bn_osc", type: "oscillator", x: 350, y: 300, props: { wave: "brown", ratio: 1, mode: "additive", attack: 0.001, decay: 0.3, mix: 1 } },
          { id: "bn_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.4, pan: 0, holdTime: 0.1, releaseTime: 0.2 } }
        ],
        edges: [
          { id: "e1", from: "bn_src", to: "bn_osc" },
          { id: "e2", from: "bn_osc", to: "bn_spk" }
        ]
      },

      // Scene 4: Hi-hat (white + highpass filter)
      {
        name: "4. Hi-Hat Pattern",
        color: "#9e9e9e",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "hh_src", type: "source", x: 100, y: 300, props: { interval: 0.25, midiNote: 60, intensity: 0.35 } },
          { id: "hh_osc", type: "oscillator", x: 250, y: 300, props: { wave: "white", ratio: 1, mode: "additive", attack: 0.001, decay: 0.08, mix: 1 } },
          { id: "hh_flt", type: "filter", x: 400, y: 300, props: { type: "highpass", cutoff: 8000, resonance: 0.2, attack: 0, decay: 0, mod: 0 } },
          { id: "hh_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.15, pan: 0, holdTime: 0.02, releaseTime: 0.05 } }
        ],
        edges: [
          { id: "e1", from: "hh_src", to: "hh_osc" },
          { id: "e2", from: "hh_osc", to: "hh_flt" },
          { id: "e3", from: "hh_flt", to: "hh_spk" }
        ]
      },

      // Scene 5: Snare (pink + bandpass)
      {
        name: "5. Snare Hit",
        color: "#ff5722",
        durationBeats: 8,
        loopCount: -1,
        nodes: [
          { id: "sn_src", type: "source", x: 100, y: 300, props: { interval: 1, midiNote: 60, intensity: 0.6 } },
          { id: "sn_osc", type: "oscillator", x: 250, y: 300, props: { wave: "pink", ratio: 1, mode: "additive", attack: 0.001, decay: 0.2, mix: 1 } },
          { id: "sn_flt", type: "filter", x: 400, y: 300, props: { type: "bandpass", cutoff: 2000, resonance: 0.3, attack: 0, decay: 0, mod: 0 } },
          { id: "sn_spk", type: "speaker", x: 550, y: 300, props: { reverb: 0.25, pan: 0, holdTime: 0.05, releaseTime: 0.15 } }
        ],
        edges: [
          { id: "e1", from: "sn_src", to: "sn_osc" },
          { id: "e2", from: "sn_osc", to: "sn_flt" },
          { id: "e3", from: "sn_flt", to: "sn_spk" }
        ]
      },

      // Scene 6: Ambient pad (brown noise layered with sine)
      {
        name: "6. Textured Pad",
        color: "#3f51b5",
        durationBeats: 16,
        loopCount: -1,
        nodes: [
          { id: "pad_src", type: "source", x: 100, y: 300, props: { interval: 4, midiNote: 48, intensity: 0.5 } },
          // Tonal component
          { id: "pad_sine", type: "oscillator", x: 280, y: 200, props: { wave: "sine", ratio: 1, mode: "additive", attack: 0.5, decay: 3, mix: 0.8 } },
          // Noise texture
          { id: "pad_noise", type: "oscillator", x: 280, y: 400, props: { wave: "brown", ratio: 1, mode: "additive", attack: 0.3, decay: 2.5, mix: 0.15 } },
          { id: "pad_flt", type: "filter", x: 450, y: 300, props: { type: "lowpass", cutoff: 1500, resonance: 0.1, attack: 0, decay: 0, mod: 0 } },
          { id: "pad_spk", type: "speaker", x: 600, y: 300, props: { reverb: 0.6, pan: 0, holdTime: 2, releaseTime: 2 } }
        ],
        edges: [
          { id: "e1", from: "pad_src", to: "pad_sine" },
          { id: "e2", from: "pad_src", to: "pad_noise" },
          { id: "e3", from: "pad_sine", to: "pad_flt" },
          { id: "e4", from: "pad_noise", to: "pad_flt" },
          { id: "e5", from: "pad_flt", to: "pad_spk" }
        ]
      }
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
  
  const store = getGraphStore();
  
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
