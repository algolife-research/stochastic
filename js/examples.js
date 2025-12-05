// AIGA - Example Compositions

export const EXAMPLES = {
  // ============================================
  // TUTORIALS - Learn the basics step by step
  // ============================================

  "tut_01_first_sound": {
    "version": "1.0",
    "bpm": 120,
    "description": "Tutorial 1: Your first sound! A Source emits packets, and a Speaker plays them. Press Play to hear it. Try changing the Source's interval (beats between notes) in the properties panel.",
    "nodes": [
      { "id": "src", "type": "source", "x": 150, "y": 300, "props": { "interval": 1, "midiNote": 60, "intensity": 0.7 } },
      { "id": "spk", "type": "speaker", "x": 350, "y": 300, "props": { "reverb": 0.3, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "spk" }
    ]
  },

  "tut_02_changing_pitch": {
    "version": "1.0",
    "bpm": 120,
    "description": "Tutorial 2: Changing pitch. Add a Pitch node between Source and Speaker to shift notes up or down. This one shifts up 7 semitones (a fifth). Try changing the shift value!",
    "nodes": [
      { "id": "src", "type": "source", "x": 100, "y": 300, "props": { "interval": 1, "midiNote": 48, "intensity": 0.6 } },
      { "id": "p1", "type": "pitch", "x": 250, "y": 300, "props": { "shift": 7 } },
      { "id": "spk", "type": "speaker", "x": 400, "y": 300, "props": { "reverb": 0.3, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "p1" },
      { "id": "e2", "from": "p1", "to": "spk" }
    ]
  },

  "tut_03_shaping_sound": {
    "version": "1.0",
    "bpm": 100,
    "description": "Tutorial 3: Shaping your sound. A Polariser gives packets a waveform (sine, saw, square, triangle) and envelope (attack/decay). Compare the soft sine vs harsh sawtooth!",
    "nodes": [
      { "id": "src1", "type": "source", "x": 100, "y": 200, "props": { "interval": 2, "midiNote": 60, "intensity": 0.6 } },
      { "id": "pol1", "type": "polariser", "x": 250, "y": 200, "props": { "wave": "sine", "attack": 0.1, "decay": 0.8 } },
      { "id": "spk1", "type": "speaker", "x": 400, "y": 200, "props": { "reverb": 0.4, "pan": -0.5 } },
      
      { "id": "src2", "type": "source", "x": 100, "y": 400, "props": { "interval": 2, "midiNote": 60, "intensity": 0.6 } },
      { "id": "pol2", "type": "polariser", "x": 250, "y": 400, "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.3 } },
      { "id": "spk2", "type": "speaker", "x": 400, "y": 400, "props": { "reverb": 0.2, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e1", "from": "src1", "to": "pol1" }, { "id": "e2", "from": "pol1", "to": "spk1" },
      { "id": "e3", "from": "src2", "to": "pol2" }, { "id": "e4", "from": "pol2", "to": "spk2" }
    ]
  },

  "tut_04_splitting_paths": {
    "version": "1.0",
    "bpm": 90,
    "description": "Tutorial 4: Splitting paths. A Splitter sends packets to ALL connected outputs. One source can trigger multiple sounds at once - creating chords or layers!",
    "nodes": [
      { "id": "src", "type": "source", "x": 100, "y": 300, "props": { "interval": 2, "midiNote": 60, "intensity": 0.6 } },
      { "id": "split", "type": "splitter", "x": 220, "y": 300, "props": {} },
      
      { "id": "pol1", "type": "polariser", "x": 340, "y": 180, "props": { "wave": "sine", "attack": 0.05, "decay": 0.6 } },
      { "id": "spk1", "type": "speaker", "x": 460, "y": 180, "props": { "reverb": 0.5, "pan": -0.5 } },
      
      { "id": "p2", "type": "pitch", "x": 340, "y": 300, "props": { "shift": 4 } },
      { "id": "pol2", "type": "polariser", "x": 420, "y": 300, "props": { "wave": "triangle", "attack": 0.05, "decay": 0.6 } },
      { "id": "spk2", "type": "speaker", "x": 540, "y": 300, "props": { "reverb": 0.5, "pan": 0 } },
      
      { "id": "p3", "type": "pitch", "x": 340, "y": 420, "props": { "shift": 7 } },
      { "id": "pol3", "type": "polariser", "x": 420, "y": 420, "props": { "wave": "sine", "attack": 0.05, "decay": 0.6 } },
      { "id": "spk3", "type": "speaker", "x": 540, "y": 420, "props": { "reverb": 0.5, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e1", "from": "split", "to": "pol1" }, { "id": "e1b", "from": "pol1", "to": "spk1" },
      { "id": "e2", "from": "split", "to": "p2" }, { "id": "e2b", "from": "p2", "to": "pol2" }, { "id": "e2c", "from": "pol2", "to": "spk2" },
      { "id": "e3", "from": "split", "to": "p3" }, { "id": "e3b", "from": "p3", "to": "pol3" }, { "id": "e3c", "from": "pol3", "to": "spk3" }
    ]
  },

  "tut_05_randomness": {
    "version": "1.0",
    "bpm": 100,
    "description": "Tutorial 5: Adding randomness. A Gate randomly blocks packets (probability 0-1). Set noteIndex to -1 on Source for random pitches. This creates generative music!",
    "nodes": [
      { "id": "src", "type": "source", "x": 100, "y": 300, "props": { "interval": 0.5, "noteIndex": -1, "intensity": 0.5 } },
      { "id": "gate", "type": "gate", "x": 220, "y": 300, "props": { "prob": 0.6 } },
      { "id": "pol", "type": "polariser", "x": 340, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.25 } },
      { "id": "spk", "type": "speaker", "x": 460, "y": 300, "props": { "reverb": 0.4, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "gate" },
      { "id": "e2", "from": "gate", "to": "pol" },
      { "id": "e3", "from": "pol", "to": "spk" }
    ]
  },

  "tut_06_timing_delay": {
    "version": "1.0",
    "bpm": 90,
    "description": "Tutorial 6: Timing with Delay. A Delay node holds packets for a set number of beats before releasing them. Great for echoes, arpeggios, and rhythmic patterns!",
    "nodes": [
      { "id": "src", "type": "source", "x": 80, "y": 300, "props": { "interval": 4, "midiNote": 60, "intensity": 0.6 } },
      { "id": "split", "type": "splitter", "x": 180, "y": 300, "props": {} },
      
      { "id": "pol1", "type": "polariser", "x": 300, "y": 180, "props": { "wave": "sine", "attack": 0.02, "decay": 0.4 } },
      { "id": "spk1", "type": "speaker", "x": 420, "y": 180, "props": { "reverb": 0.3, "pan": -0.4 } },
      
      { "id": "d2", "type": "delay", "x": 280, "y": 300, "props": { "delayTime": 1 } },
      { "id": "pol2", "type": "polariser", "x": 380, "y": 300, "props": { "wave": "sine", "attack": 0.02, "decay": 0.4 } },
      { "id": "spk2", "type": "speaker", "x": 480, "y": 300, "props": { "reverb": 0.3, "pan": 0 } },
      
      { "id": "d3", "type": "delay", "x": 280, "y": 420, "props": { "delayTime": 2 } },
      { "id": "pol3", "type": "polariser", "x": 380, "y": 420, "props": { "wave": "sine", "attack": 0.02, "decay": 0.4 } },
      { "id": "spk3", "type": "speaker", "x": 480, "y": 420, "props": { "reverb": 0.3, "pan": 0.4 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e1", "from": "split", "to": "pol1" }, { "id": "e1b", "from": "pol1", "to": "spk1" },
      { "id": "e2", "from": "split", "to": "d2" }, { "id": "e2b", "from": "d2", "to": "pol2" }, { "id": "e2c", "from": "pol2", "to": "spk2" },
      { "id": "e3", "from": "split", "to": "d3" }, { "id": "e3b", "from": "d3", "to": "pol3" }, { "id": "e3c", "from": "pol3", "to": "spk3" }
    ]
  },

  "tut_07_filters": {
    "version": "1.0",
    "bpm": 80,
    "description": "Tutorial 7: Filters shape tone. A Filter removes high frequencies (low cutoff = darker sound). Add envelope modulation for 'wah' effects. Try adjusting cutoff!",
    "nodes": [
      { "id": "src", "type": "source", "x": 100, "y": 300, "props": { "interval": 2, "midiNote": 48, "intensity": 0.7 } },
      { "id": "pol", "type": "polariser", "x": 220, "y": 300, "props": { "wave": "sawtooth", "attack": 0.02, "decay": 1.0 } },
      { "id": "flt", "type": "filter", "x": 340, "y": 300, "props": { "cutoff": 800, "mod": 2000, "attack": 0.01, "decay": 0.4 } },
      { "id": "spk", "type": "speaker", "x": 460, "y": 300, "props": { "reverb": 0.4, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "pol" },
      { "id": "e2", "from": "pol", "to": "flt" },
      { "id": "e3", "from": "flt", "to": "spk" }
    ]
  },

  "tut_08_gain_dynamics": {
    "version": "1.0",
    "bpm": 100,
    "description": "Tutorial 8: Volume control. A Gain node multiplies the volume. Use it to make some notes louder or softer. Values above 1 = louder, below 1 = quieter.",
    "nodes": [
      { "id": "src", "type": "source", "x": 80, "y": 300, "props": { "interval": 2, "midiNote": 60, "intensity": 0.5 } },
      { "id": "split", "type": "splitter", "x": 180, "y": 300, "props": {} },
      
      { "id": "g1", "type": "gain", "x": 280, "y": 200, "props": { "value": 0.3 } },
      { "id": "pol1", "type": "polariser", "x": 380, "y": 200, "props": { "wave": "sine", "attack": 0.02, "decay": 0.4 } },
      { "id": "spk1", "type": "speaker", "x": 480, "y": 200, "props": { "reverb": 0.3, "pan": -0.3 } },
      
      { "id": "pol2", "type": "polariser", "x": 330, "y": 300, "props": { "wave": "sine", "attack": 0.02, "decay": 0.4 } },
      { "id": "spk2", "type": "speaker", "x": 450, "y": 300, "props": { "reverb": 0.3, "pan": 0 } },
      
      { "id": "g3", "type": "gain", "x": 280, "y": 400, "props": { "value": 1.5 } },
      { "id": "pol3", "type": "polariser", "x": 380, "y": 400, "props": { "wave": "sine", "attack": 0.02, "decay": 0.4 } },
      { "id": "spk3", "type": "speaker", "x": 480, "y": 400, "props": { "reverb": 0.3, "pan": 0.3 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e1", "from": "split", "to": "g1" }, { "id": "e1b", "from": "g1", "to": "pol1" }, { "id": "e1c", "from": "pol1", "to": "spk1" },
      { "id": "e2", "from": "split", "to": "pol2" }, { "id": "e2b", "from": "pol2", "to": "spk2" },
      { "id": "e3", "from": "split", "to": "g3" }, { "id": "e3b", "from": "g3", "to": "pol3" }, { "id": "e3c", "from": "pol3", "to": "spk3" }
    ]
  },

  "tut_09_simple_melody": {
    "version": "1.0",
    "bpm": 100,
    "description": "Tutorial 9: Building a melody! Chain pitch nodes after speakers to create sequences. Each speaker plays, then passes to the next pitch shift. This creates a 4-note pattern!",
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "midiNote": 60, "intensity": 0.6 } },
      { "id": "pol", "type": "polariser", "x": 160, "y": 300, "props": { "wave": "triangle", "attack": 0.02, "decay": 0.3 } },
      { "id": "spk1", "type": "speaker", "x": 260, "y": 300, "props": { "reverb": 0.3, "pan": -0.4 } },
      { "id": "p1", "type": "pitch", "x": 360, "y": 300, "props": { "shift": 4 } },
      { "id": "spk2", "type": "speaker", "x": 460, "y": 300, "props": { "reverb": 0.3, "pan": -0.1 } },
      { "id": "p2", "type": "pitch", "x": 560, "y": 300, "props": { "shift": 3 } },
      { "id": "spk3", "type": "speaker", "x": 660, "y": 300, "props": { "reverb": 0.3, "pan": 0.1 } },
      { "id": "p3", "type": "pitch", "x": 760, "y": 300, "props": { "shift": -2 } },
      { "id": "spk4", "type": "speaker", "x": 860, "y": 300, "props": { "reverb": 0.4, "pan": 0.4 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "pol" },
      { "id": "e2", "from": "pol", "to": "spk1" },
      { "id": "e3", "from": "spk1", "to": "p1" },
      { "id": "e4", "from": "p1", "to": "spk2" },
      { "id": "e5", "from": "spk2", "to": "p2" },
      { "id": "e6", "from": "p2", "to": "spk3" },
      { "id": "e7", "from": "spk3", "to": "p3" },
      { "id": "e8", "from": "p3", "to": "spk4" }
    ]
  },

  "tut_10_first_song": {
    "version": "1.0",
    "bpm": 90,
    "description": "Tutorial 10: Your first song! Combines everything: bass line, melody with randomness, and a simple beat. Experiment by changing values and adding more nodes!",
    "nodes": [
      { "id": "bass_src", "type": "source", "x": 60, "y": 150, "props": { "interval": 2, "midiNote": 36, "intensity": 0.8 } },
      { "id": "bass_pol", "type": "polariser", "x": 180, "y": 150, "props": { "wave": "sawtooth", "attack": 0.02, "decay": 0.5 } },
      { "id": "bass_flt", "type": "filter", "x": 300, "y": 150, "props": { "cutoff": 500, "mod": 800, "attack": 0.01, "decay": 0.3 } },
      { "id": "bass_spk", "type": "speaker", "x": 420, "y": 150, "props": { "reverb": 0.15, "pan": 0 } },
      
      { "id": "mel_src", "type": "source", "x": 60, "y": 300, "props": { "interval": 0.5, "noteIndex": -1, "intensity": 0.5 } },
      { "id": "mel_gate", "type": "gate", "x": 160, "y": 300, "props": { "prob": 0.5 } },
      { "id": "mel_pol", "type": "polariser", "x": 260, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.2 } },
      { "id": "mel_spk", "type": "speaker", "x": 380, "y": 300, "props": { "reverb": 0.5, "pan": 0.3 } },
      
      { "id": "beat_src", "type": "source", "x": 60, "y": 450, "props": { "interval": 1, "midiNote": 36, "intensity": 0.7 } },
      { "id": "beat_p", "type": "pitch", "x": 160, "y": 450, "props": { "shift": -24 } },
      { "id": "beat_pol", "type": "polariser", "x": 260, "y": 450, "props": { "wave": "sine", "attack": 0.005, "decay": 0.15 } },
      { "id": "beat_spk", "type": "speaker", "x": 380, "y": 450, "props": { "reverb": 0.1, "pan": 0 } }
    ],
    "edges": [
      { "id": "e_b1", "from": "bass_src", "to": "bass_pol" },
      { "id": "e_b2", "from": "bass_pol", "to": "bass_flt" },
      { "id": "e_b3", "from": "bass_flt", "to": "bass_spk" },
      { "id": "e_m1", "from": "mel_src", "to": "mel_gate" },
      { "id": "e_m2", "from": "mel_gate", "to": "mel_pol" },
      { "id": "e_m3", "from": "mel_pol", "to": "mel_spk" },
      { "id": "e_k1", "from": "beat_src", "to": "beat_p" },
      { "id": "e_k2", "from": "beat_p", "to": "beat_pol" },
      { "id": "e_k3", "from": "beat_pol", "to": "beat_spk" }
    ]
  },

  // ============================================
  // EXAMPLE COMPOSITIONS
  // ============================================

  "sequential_melody": {
    "version": "1.0",
    "bpm": 120,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 4, "noteIndex": 12, "prob": 1 } },
      { "id": "e1", "type": "speaker", "x": 180, "y": 300, "props": { "reverb": 0.3, "pan": -0.5 } },
      { "id": "p1", "type": "pitch", "x": 300, "y": 300, "props": { "shift": 2 } },
      { "id": "e2", "type": "speaker", "x": 420, "y": 300, "props": { "reverb": 0.3, "pan": -0.25 } },
      { "id": "p2", "type": "pitch", "x": 540, "y": 300, "props": { "shift": 2 } },
      { "id": "e3", "type": "speaker", "x": 660, "y": 300, "props": { "reverb": 0.3, "pan": 0 } },
      { "id": "p3", "type": "pitch", "x": 780, "y": 300, "props": { "shift": 1 } },
      { "id": "e4", "type": "speaker", "x": 900, "y": 300, "props": { "reverb": 0.3, "pan": 0.25 } },
      { "id": "p4", "type": "pitch", "x": 1020, "y": 300, "props": { "shift": 2 } },
      { "id": "e5", "type": "speaker", "x": 1140, "y": 300, "props": { "reverb": 0.5, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e_1", "from": "src", "to": "e1" },
      { "id": "e_2", "from": "e1", "to": "p1" },
      { "id": "e_3", "from": "p1", "to": "e2" },
      { "id": "e_4", "from": "e2", "to": "p2" },
      { "id": "e_5", "from": "p2", "to": "e3" },
      { "id": "e_6", "from": "e3", "to": "p3" },
      { "id": "e_7", "from": "p3", "to": "e4" },
      { "id": "e_8", "from": "e4", "to": "p4" },
      { "id": "e_9", "from": "p4", "to": "e5" }
    ]
  },
  "generative_ambient": {
    "version": "1.0",
    "bpm": 60,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 3, "noteIndex": -1, "prob": 1 } },
      { "id": "split", "type": "splitter", "x": 180, "y": 300, "props": { "prob": 1 } },
      { "id": "f1", "type": "filter", "x": 300, "y": 180, "props": { "cutoff": 600 } },
      { "id": "pol1", "type": "polariser", "x": 420, "y": 180, "props": { "wave": "sine", "attack": 1.5, "decay": 3.0 } },
      { "id": "e1", "type": "speaker", "x": 540, "y": 180, "props": { "reverb": 0.9, "pan": -0.6 } },
      { "id": "g2", "type": "gate", "x": 300, "y": 300, "props": { "prob": 0.4 } },
      { "id": "p2", "type": "pitch", "x": 420, "y": 300, "props": { "shift": 24 } },
      { "id": "pol2", "type": "polariser", "x": 540, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.3 } },
      { "id": "e2", "type": "speaker", "x": 660, "y": 300, "props": { "reverb": 0.8, "pan": 0.6 } },
      { "id": "d3", "type": "delay", "x": 300, "y": 420, "props": { "delayTime": 1.5 } },
      { "id": "p3", "type": "pitch", "x": 420, "y": 420, "props": { "shift": -12 } },
      { "id": "pol3", "type": "polariser", "x": 540, "y": 420, "props": { "wave": "sine", "attack": 0.2, "decay": 1.5 } },
      { "id": "e3", "type": "speaker", "x": 660, "y": 420, "props": { "reverb": 0.3, "pan": 0 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e_1a", "from": "split", "to": "f1" }, { "id": "e_1b", "from": "f1", "to": "pol1" }, { "id": "e_1c", "from": "pol1", "to": "e1" },
      { "id": "e_2a", "from": "split", "to": "g2" }, { "id": "e_2b", "from": "g2", "to": "p2" }, { "id": "e_2c", "from": "p2", "to": "pol2" }, { "id": "e_2d", "from": "pol2", "to": "e2" },
      { "id": "e_3a", "from": "split", "to": "d3" }, { "id": "e_3b", "from": "d3", "to": "p3" }, { "id": "e_3c", "from": "p3", "to": "pol3" }, { "id": "e_3d", "from": "pol3", "to": "e3" }
    ]
  },
  "polyrhythm": {
    "version": "1.0",
    "bpm": 90,
    "nodes": [
      { "id": "src4", "type": "source", "x": 60, "y": 180, "props": { "interval": 4, "noteIndex": 12, "prob": 1 } },
      { "id": "pol4", "type": "polariser", "x": 180, "y": 180, "props": { "wave": "sine", "attack": 0.01, "decay": 0.6 } },
      { "id": "e4", "type": "speaker", "x": 300, "y": 180, "props": { "reverb": 0.4, "pan": -0.5 } },
      { "id": "src3", "type": "source", "x": 60, "y": 300, "props": { "interval": 3, "noteIndex": 19, "prob": 1 } },
      { "id": "pol3", "type": "polariser", "x": 180, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.4 } },
      { "id": "e3", "type": "speaker", "x": 300, "y": 300, "props": { "reverb": 0.4, "pan": 0 } },
      { "id": "src5", "type": "source", "x": 60, "y": 420, "props": { "interval": 5, "noteIndex": 7, "prob": 1 } },
      { "id": "pol5", "type": "polariser", "x": 180, "y": 420, "props": { "wave": "square", "attack": 0.01, "decay": 0.3 } },
      { "id": "e5", "type": "speaker", "x": 300, "y": 420, "props": { "reverb": 0.4, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e_4a", "from": "src4", "to": "pol4" }, { "id": "e_4b", "from": "pol4", "to": "e4" },
      { "id": "e_3a", "from": "src3", "to": "pol3" }, { "id": "e_3b", "from": "pol3", "to": "e3" },
      { "id": "e_5a", "from": "src5", "to": "pol5" }, { "id": "e_5b", "from": "pol5", "to": "e5" }
    ]
  },
  "drum_pattern": {
    "version": "1.0",
    "bpm": 110,
    "nodes": [
      { "id": "kick_src", "type": "source", "x": 60, "y": 180, "props": { "interval": 2, "noteIndex": 0, "intensity": 0.8 } },
      { "id": "kick_pol", "type": "polariser", "x": 180, "y": 180, "props": { "wave": "sine", "attack": 0.01, "decay": 0.25 } },
      { "id": "kick_p", "type": "pitch", "x": 300, "y": 180, "props": { "shift": -12 } },
      { "id": "kick_out", "type": "speaker", "x": 420, "y": 180, "props": { "volume": 1.0, "reverb": 0.1, "pan": 0 } },
      { "id": "snare_src", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "noteIndex": 0, "intensity": 0.6 } },
      { "id": "snare_del", "type": "delay", "x": 140, "y": 300, "props": { "delayTime": 1 } },
      { "id": "snare_pol", "type": "polariser", "x": 220, "y": 300, "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.12 } },
      { "id": "snare_p", "type": "pitch", "x": 300, "y": 300, "props": { "shift": 12 } },
      { "id": "snare_out", "type": "speaker", "x": 420, "y": 300, "props": { "volume": 0.8, "reverb": 0.35, "pan": 0.1 } },
      { "id": "hh_src", "type": "source", "x": 60, "y": 420, "props": { "interval": 0.5, "noteIndex": 0, "intensity": 0.3 } },
      { "id": "hh_gate", "type": "gate", "x": 140, "y": 420, "props": { "prob": 0.75 } },
      { "id": "hh_pol", "type": "polariser", "x": 220, "y": 420, "props": { "wave": "square", "attack": 0.005, "decay": 0.04 } },
      { "id": "hh_p", "type": "pitch", "x": 300, "y": 420, "props": { "shift": 30 } },
      { "id": "hh_out", "type": "speaker", "x": 420, "y": 420, "props": { "volume": 0.6, "reverb": 0.15, "pan": 0.4 } }
    ],
    "edges": [
      { "id": "e_k1", "from": "kick_src", "to": "kick_pol" }, { "id": "e_k2", "from": "kick_pol", "to": "kick_p" }, { "id": "e_k3", "from": "kick_p", "to": "kick_out" },
      { "id": "e_s1", "from": "snare_src", "to": "snare_del" }, { "id": "e_s2", "from": "snare_del", "to": "snare_pol" }, { "id": "e_s3", "from": "snare_pol", "to": "snare_p" }, { "id": "e_s4", "from": "snare_p", "to": "snare_out" },
      { "id": "e_h1", "from": "hh_src", "to": "hh_gate" }, { "id": "e_h2", "from": "hh_gate", "to": "hh_pol" }, { "id": "e_h3", "from": "hh_pol", "to": "hh_p" }, { "id": "e_h4", "from": "hh_p", "to": "hh_out" }
    ]
  },
  "layered_pad": {
    "version": "1.0",
    "bpm": 60,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 6, "noteIndex": 12 } },
      { "id": "pad", "type": "tunnel", "x": 200, "y": 300, "props": { 
        "tunnelName": "Pad",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.8, "decay": 3.0 } },
          { "type": "polariser", "props": { "wave": "triangle", "attack": 1.2, "decay": 2.5 } },
          { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.5, "decay": 2.0 } }
        ]
      }},
      { "id": "out", "type": "speaker", "x": 340, "y": 300, "props": { "reverb": 0.8, "pan": 0 } },
      { "id": "split", "type": "splitter", "x": 200, "y": 180, "props": {} },
      { "id": "p_hi", "type": "pitch", "x": 280, "y": 180, "props": { "shift": 12 } },
      { "id": "sparkle", "type": "tunnel", "x": 380, "y": 180, "props": {
        "tunnelName": "Sparkle",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "triangle", "attack": 0.01, "decay": 0.4 } }
        ]
      }},
      { "id": "out_hi", "type": "speaker", "x": 500, "y": 180, "props": { "reverb": 0.9, "pan": 0.4 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "pad" },
      { "id": "e2", "from": "pad", "to": "out" },
      { "id": "e3", "from": "src", "to": "split" },
      { "id": "e4", "from": "split", "to": "p_hi" },
      { "id": "e5", "from": "p_hi", "to": "sparkle" },
      { "id": "e6", "from": "sparkle", "to": "out_hi" }
    ]
  },
  "synth_bass": {
    "version": "1.0",
    "bpm": 100,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 1, "noteIndex": 0 } },
      { "id": "gate", "type": "gate", "x": 160, "y": 300, "props": { "prob": 0.6 } },
      { "id": "bass", "type": "tunnel", "x": 280, "y": 300, "props": {
        "tunnelName": "FatBass",
        "subNodes": [
          { "type": "pitch", "props": { "shift": -12 } },
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.01, "decay": 0.3 } },
          { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.02, "decay": 0.25 } },
          { "type": "polariser", "props": { "wave": "square", "attack": 0.01, "decay": 0.2 } }
        ]
      }},
      { "id": "out", "type": "speaker", "x": 420, "y": 300, "props": { "reverb": 0.15, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "gate" },
      { "id": "e2", "from": "gate", "to": "bass" },
      { "id": "e3", "from": "bass", "to": "out" }
    ]
  },
  "canon": {
    "version": "1.0",
    "bpm": 100,
    "nodes": [
      { "id": "src", "type": "source", "x": 50, "y": 300, "props": { "interval": 4, "noteIndex": 14 } },
      { "id": "split", "type": "splitter", "x": 150, "y": 300, "props": { "prob": 1 } },
      
      { "id": "v1_e1", "type": "speaker", "x": 250, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p1", "type": "pitch", "x": 350, "y": 200, "props": { "shift": 7 } },
      { "id": "v1_e2", "type": "speaker", "x": 450, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p2", "type": "pitch", "x": 550, "y": 200, "props": { "shift": -4 } },
      { "id": "v1_e3", "type": "speaker", "x": 650, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p3", "type": "pitch", "x": 750, "y": 200, "props": { "shift": -3 } },
      { "id": "v1_e4", "type": "speaker", "x": 850, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p4", "type": "pitch", "x": 950, "y": 200, "props": { "shift": -1 } },
      { "id": "v1_e5", "type": "speaker", "x": 1050, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      
      { "id": "delay", "type": "delay", "x": 250, "y": 400, "props": { "delayTime": 4.0 } },
      { "id": "v2_e1", "type": "speaker", "x": 350, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p1", "type": "pitch", "x": 450, "y": 400, "props": { "shift": 7 } },
      { "id": "v2_e2", "type": "speaker", "x": 550, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p2", "type": "pitch", "x": 650, "y": 400, "props": { "shift": -4 } },
      { "id": "v2_e3", "type": "speaker", "x": 750, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p3", "type": "pitch", "x": 850, "y": 400, "props": { "shift": -3 } },
      { "id": "v2_e4", "type": "speaker", "x": 950, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p4", "type": "pitch", "x": 1050, "y": 400, "props": { "shift": -1 } },
      { "id": "v2_e5", "type": "speaker", "x": 1150, "y": 400, "props": { "reverb": 0, "pan": 0.6 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e1_1", "from": "split", "to": "v1_e1" }, { "id": "e1_2", "from": "v1_e1", "to": "v1_p1" }, { "id": "e1_3", "from": "v1_p1", "to": "v1_e2" }, { "id": "e1_4", "from": "v1_e2", "to": "v1_p2" }, { "id": "e1_5", "from": "v1_p2", "to": "v1_e3" }, { "id": "e1_6", "from": "v1_e3", "to": "v1_p3" }, { "id": "e1_7", "from": "v1_p3", "to": "v1_e4" }, { "id": "e1_8", "from": "v1_e4", "to": "v1_p4" }, { "id": "e1_9", "from": "v1_p4", "to": "v1_e5" },
      { "id": "e2_0", "from": "split", "to": "delay" }, { "id": "e2_1", "from": "delay", "to": "v2_e1" }, { "id": "e2_2", "from": "v2_e1", "to": "v2_p1" }, { "id": "e2_3", "from": "v2_p1", "to": "v2_e2" }, { "id": "e2_4", "from": "v2_e2", "to": "v2_p2" }, { "id": "e2_5", "from": "v2_p2", "to": "v2_e3" }, { "id": "e2_6", "from": "v2_e3", "to": "v2_p3" }, { "id": "e2_7", "from": "v2_p3", "to": "v2_e4" }, { "id": "e2_8", "from": "v2_e4", "to": "v2_p4" }, { "id": "e2_9", "from": "v2_p4", "to": "v2_e5" }
    ]
  },
  "fugue": {
    "version": "1.0",
    "bpm": 100,
    "nodes": [
      { "id": "src", "type": "source", "x": 50, "y": 300, "props": { "interval": 4, "noteIndex": 14 } },
      { "id": "split", "type": "splitter", "x": 150, "y": 300, "props": { "prob": 1 } },
      
      { "id": "v1_e1", "type": "speaker", "x": 250, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p1", "type": "pitch", "x": 350, "y": 200, "props": { "shift": 7 } },
      { "id": "v1_e2", "type": "speaker", "x": 450, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p2", "type": "pitch", "x": 550, "y": 200, "props": { "shift": -4 } },
      { "id": "v1_e3", "type": "speaker", "x": 650, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p3", "type": "pitch", "x": 750, "y": 200, "props": { "shift": -3 } },
      { "id": "v1_e4", "type": "speaker", "x": 850, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p4", "type": "pitch", "x": 950, "y": 200, "props": { "shift": -1 } },
      { "id": "v1_e5", "type": "speaker", "x": 1050, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      
      { "id": "delay", "type": "delay", "x": 250, "y": 400, "props": { "delayTime": 4.0 } },
      { "id": "trans", "type": "pitch", "x": 300, "y": 400, "props": { "shift": 7 } },
      { "id": "v2_e1", "type": "speaker", "x": 350, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p1", "type": "pitch", "x": 450, "y": 400, "props": { "shift": 7 } },
      { "id": "v2_e2", "type": "speaker", "x": 550, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p2", "type": "pitch", "x": 650, "y": 400, "props": { "shift": -4 } },
      { "id": "v2_e3", "type": "speaker", "x": 750, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p3", "type": "pitch", "x": 850, "y": 400, "props": { "shift": -3 } },
      { "id": "v2_e4", "type": "speaker", "x": 950, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p4", "type": "pitch", "x": 1050, "y": 400, "props": { "shift": -1 } },
      { "id": "v2_e5", "type": "speaker", "x": 1150, "y": 400, "props": { "reverb": 0, "pan": 0.6 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e1_1", "from": "split", "to": "v1_e1" }, { "id": "e1_2", "from": "v1_e1", "to": "v1_p1" }, { "id": "e1_3", "from": "v1_p1", "to": "v1_e2" }, { "id": "e1_4", "from": "v1_e2", "to": "v1_p2" }, { "id": "e1_5", "from": "v1_p2", "to": "v1_e3" }, { "id": "e1_6", "from": "v1_e3", "to": "v1_p3" }, { "id": "e1_7", "from": "v1_p3", "to": "v1_e4" }, { "id": "e1_8", "from": "v1_e4", "to": "v1_p4" }, { "id": "e1_9", "from": "v1_p4", "to": "v1_e5" },
      { "id": "e2_0", "from": "split", "to": "delay" }, { "id": "e2_t", "from": "delay", "to": "trans" }, { "id": "e2_1", "from": "trans", "to": "v2_e1" }, { "id": "e2_2", "from": "v2_e1", "to": "v2_p1" }, { "id": "e2_3", "from": "v2_p1", "to": "v2_e2" }, { "id": "e2_4", "from": "v2_e2", "to": "v2_p2" }, { "id": "e2_5", "from": "v2_p2", "to": "v2_e3" }, { "id": "e2_6", "from": "v2_e3", "to": "v2_p3" }, { "id": "e2_7", "from": "v2_p3", "to": "v2_e4" }, { "id": "e2_8", "from": "v2_e4", "to": "v2_p4" }, { "id": "e2_9", "from": "v2_p4", "to": "v2_e5" }
    ]
  },
  "dynamics": {
    "version": "1.0",
    "bpm": 90,
    "nodes": [
      { "id": "src_loud", "type": "source", "x": 60, "y": 180, "props": { "interval": 4, "noteIndex": 12, "intensity": 0.8 } },
      { "id": "pol_loud", "type": "polariser", "x": 180, "y": 180, "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.5 } },
      { "id": "out_loud", "type": "speaker", "x": 300, "y": 180, "props": { "volume": 1.0, "reverb": 0.2, "pan": -0.3 } },
      
      { "id": "src_soft", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "noteIndex": 24, "intensity": 0.2 } },
      { "id": "pol_soft", "type": "polariser", "x": 180, "y": 300, "props": { "wave": "triangle", "attack": 0.1, "decay": 0.8 } },
      { "id": "out_soft", "type": "speaker", "x": 300, "y": 300, "props": { "volume": 0.6, "reverb": 0.6, "pan": 0.3 } },
      
      { "id": "src_swell", "type": "source", "x": 60, "y": 420, "props": { "interval": 1, "noteIndex": 19, "intensity": 0.3 } },
      { "id": "gain_up", "type": "gain", "x": 160, "y": 420, "props": { "value": 1.5 } },
      { "id": "pol_swell", "type": "polariser", "x": 260, "y": 420, "props": { "wave": "sine", "attack": 0.2, "decay": 0.6 } },
      { "id": "gain_down", "type": "gain", "x": 360, "y": 420, "props": { "value": 0.5 } },
      { "id": "out_swell", "type": "speaker", "x": 460, "y": 420, "props": { "volume": 1.0, "reverb": 0.4, "pan": 0 } }
    ],
    "edges": [
      { "id": "e_l1", "from": "src_loud", "to": "pol_loud" }, { "id": "e_l2", "from": "pol_loud", "to": "out_loud" },
      { "id": "e_s1", "from": "src_soft", "to": "pol_soft" }, { "id": "e_s2", "from": "pol_soft", "to": "out_soft" },
      { "id": "e_sw1", "from": "src_swell", "to": "gain_up" }, { "id": "e_sw2", "from": "gain_up", "to": "pol_swell" }, { "id": "e_sw3", "from": "pol_swell", "to": "gain_down" }, { "id": "e_sw4", "from": "gain_down", "to": "out_swell" }
    ]
  },
  "orchestra": {
    "version": "1.0",
    "bpm": 80,
    "nodes": [
      { "id": "v_src", "type": "source", "x": 60, "y": 150, "props": { "interval": 4, "noteIndex": 12, "intensity": 0.7 } },
      { "id": "v_tun", "type": "tunnel", "x": 200, "y": 150, "props": {
        "tunnelName": "Violin",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.15, "decay": 1.2, "mix": 0.8 } },
          { "type": "harmonic", "props": { "ratio": 2, "wave": "sine", "attack": 0.12, "decay": 1.0, "mix": 0.6 } },
          { "type": "harmonic", "props": { "ratio": 3, "wave": "sine", "attack": 0.10, "decay": 0.8, "mix": 0.35 } },
          { "type": "harmonic", "props": { "ratio": 4, "wave": "sine", "attack": 0.08, "decay": 0.6, "mix": 0.2 } },
          { "type": "noise", "props": { "wave": "pink", "attack": 0.08, "decay": 0.25, "mix": 0.1 } },
          { "type": "modulator", "props": { "rate": 5.5, "depth": 25, "delay": 0.3 } },
          { "type": "filter", "props": { "cutoff": 2200, "mod": 2000, "attack": 0.12, "decay": 0.5 } }
        ]
      }},
      { "id": "v_out", "type": "speaker", "x": 340, "y": 150, "props": { "volume": 0.7, "reverb": 0.55, "pan": -0.4 } },

      { "id": "c_src", "type": "source", "x": 60, "y": 300, "props": { "interval": 8, "noteIndex": 0, "intensity": 0.8 } },
      { "id": "c_tun", "type": "tunnel", "x": 200, "y": 300, "props": {
        "tunnelName": "Cello",
        "subNodes": [
          { "type": "pitch", "props": { "shift": -12 } },
          { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.25, "decay": 1.8, "mix": 0.85 } },
          { "type": "harmonic", "props": { "ratio": 2, "wave": "sine", "attack": 0.20, "decay": 1.5, "mix": 0.5 } },
          { "type": "harmonic", "props": { "ratio": 3, "wave": "triangle", "attack": 0.18, "decay": 1.2, "mix": 0.3 } },
          { "type": "noise", "props": { "wave": "brown", "attack": 0.08, "decay": 0.4, "mix": 0.15 } },
          { "type": "modulator", "props": { "rate": 5.0, "depth": 20, "delay": 0.4 } },
          { "type": "filter", "props": { "cutoff": 700, "mod": 1000, "attack": 0.08, "decay": 0.5 } }
        ]
      }},
      { "id": "c_out", "type": "speaker", "x": 340, "y": 300, "props": { "volume": 0.8, "reverb": 0.5, "pan": 0.4 } },

      { "id": "f_src", "type": "source", "x": 60, "y": 450, "props": { "interval": 2, "noteIndex": 24, "intensity": 0.5 } },
      { "id": "f_tun", "type": "tunnel", "x": 200, "y": 450, "props": {
        "tunnelName": "Flute",
        "subNodes": [
          { "type": "pitch", "props": { "shift": 12 } },
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.08, "decay": 0.5, "mix": 1.0 } },
          { "type": "harmonic", "props": { "ratio": 2, "wave": "sine", "attack": 0.06, "decay": 0.4, "mix": 0.25 } },
          { "type": "harmonic", "props": { "ratio": 3, "wave": "sine", "attack": 0.05, "decay": 0.3, "mix": 0.1 } },
          { "type": "noise", "props": { "wave": "white", "attack": 0.02, "decay": 0.15, "mix": 0.08 } },
          { "type": "modulator", "props": { "rate": 5.0, "depth": 15, "delay": 0.2 } },
          { "type": "filter", "props": { "cutoff": 4500, "mod": 1200, "attack": 0.05, "decay": 0.3 } }
        ]
      }},
      { "id": "f_out", "type": "speaker", "x": 340, "y": 450, "props": { "volume": 0.5, "reverb": 0.7, "pan": 0 } }
    ],
    "edges": [
      { "id": "e_v1", "from": "v_src", "to": "v_tun" }, { "id": "e_v2", "from": "v_tun", "to": "v_out" },
      { "id": "e_c1", "from": "c_src", "to": "c_tun" }, { "id": "e_c2", "from": "c_tun", "to": "c_out" },
      { "id": "e_f1", "from": "f_src", "to": "f_tun" }, { "id": "e_f2", "from": "f_tun", "to": "f_out" }
    ]
  },
  
  "tunnel_melody": {
    "version": "1.0",
    "bpm": 100,
    "description": "Demonstrates tunnels for melody making: one source feeding multiple tunnels with different pitch shifts creates arpeggios and harmonies",
    "nodes": [
      // Single source that triggers the whole melody pattern
      { "id": "main_src", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "noteIndex": 12, "intensity": 0.7 } },
      
      // Splitter to create multiple voices from one source
      { "id": "split", "type": "splitter", "x": 180, "y": 300, "props": {} },
      
      // Root note tunnel - warm pad sound
      { "id": "root_tun", "type": "tunnel", "x": 340, "y": 180, "props": {
        "tunnelName": "Root",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.05, "decay": 0.8, "mix": 1.0 } },
          { "type": "harmonic", "props": { "ratio": 2, "wave": "sine", "attack": 0.1, "decay": 0.6, "mix": 0.3 } },
          { "type": "modulator", "props": { "rate": 4.5, "depth": 8, "delay": 0.3 } },
          { "type": "filter", "props": { "cutoff": 2500, "mod": 800, "attack": 0.02, "decay": 0.3 } }
        ]
      }},
      { "id": "root_out", "type": "speaker", "x": 460, "y": 180, "props": { "volume": 0.6, "reverb": 0.5, "pan": -0.4 } },
      
      // Third (+4 semitones) - brighter sound, delayed
      { "id": "d1", "type": "delay", "x": 260, "y": 300, "props": { "delayTime": 0.25 } },
      { "id": "third_tun", "type": "tunnel", "x": 340, "y": 300, "props": {
        "tunnelName": "+3rd",
        "subNodes": [
          { "type": "pitch", "props": { "shift": 4 } },
          { "type": "polariser", "props": { "wave": "triangle", "attack": 0.02, "decay": 0.5, "mix": 1.0 } },
          { "type": "modulator", "props": { "rate": 5, "depth": 12, "delay": 0.2 } },
          { "type": "filter", "props": { "cutoff": 3500, "mod": 1200, "attack": 0.01, "decay": 0.25 } }
        ]
      }},
      { "id": "third_out", "type": "speaker", "x": 460, "y": 300, "props": { "volume": 0.5, "reverb": 0.6, "pan": 0 } },
      
      // Fifth (+7 semitones) - bell-like, more delay
      { "id": "d2", "type": "delay", "x": 260, "y": 420, "props": { "delayTime": 0.5 } },
      { "id": "fifth_tun", "type": "tunnel", "x": 340, "y": 420, "props": {
        "tunnelName": "+5th",
        "subNodes": [
          { "type": "pitch", "props": { "shift": 7 } },
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.01, "decay": 0.4, "mix": 1.0 } },
          { "type": "harmonic", "props": { "ratio": 3, "wave": "sine", "attack": 0.02, "decay": 0.25, "mix": 0.2 } },
          { "type": "filter", "props": { "cutoff": 4000, "mod": 0, "attack": 0, "decay": 0 } }
        ]
      }},
      { "id": "fifth_out", "type": "speaker", "x": 460, "y": 420, "props": { "volume": 0.4, "reverb": 0.7, "pan": 0.4 } },
      
      // Octave (+12 semitones) - sparkle layer, most delay
      { "id": "d3", "type": "delay", "x": 260, "y": 540, "props": { "delayTime": 0.75 } },
      { "id": "oct_tun", "type": "tunnel", "x": 340, "y": 540, "props": {
        "tunnelName": "+Octave",
        "subNodes": [
          { "type": "pitch", "props": { "shift": 12 } },
          { "type": "polariser", "props": { "wave": "sine", "attack": 0.005, "decay": 0.3, "mix": 0.8 } },
          { "type": "noise", "props": { "wave": "white", "attack": 0.002, "decay": 0.05, "mix": 0.1 } },
          { "type": "filter", "props": { "cutoff": 6000, "mod": 2000, "attack": 0.01, "decay": 0.15 } }
        ]
      }},
      { "id": "oct_out", "type": "speaker", "x": 460, "y": 540, "props": { "volume": 0.3, "reverb": 0.8, "pan": 0.2 } },
      
      // Random variation path with gate
      { "id": "g1", "type": "gate", "x": 260, "y": 660, "props": { "prob": 0.4 } },
      { "id": "var_tun", "type": "tunnel", "x": 340, "y": 660, "props": {
        "tunnelName": "Random+",
        "subNodes": [
          { "type": "pitch", "props": { "shift": 5 } },
          { "type": "polariser", "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.2, "mix": 0.7 } },
          { "type": "filter", "props": { "cutoff": 2000, "mod": 3000, "attack": 0.005, "decay": 0.15 } }
        ]
      }},
      { "id": "var_out", "type": "speaker", "x": 460, "y": 660, "props": { "volume": 0.35, "reverb": 0.5, "pan": -0.3 } }
    ],
    "edges": [
      { "id": "e_m1", "from": "main_src", "to": "split" },
      { "id": "e_r1", "from": "split", "to": "root_tun" }, { "id": "e_r2", "from": "root_tun", "to": "root_out" },
      { "id": "e_3a", "from": "split", "to": "d1" }, { "id": "e_3b", "from": "d1", "to": "third_tun" }, { "id": "e_3c", "from": "third_tun", "to": "third_out" },
      { "id": "e_5a", "from": "split", "to": "d2" }, { "id": "e_5b", "from": "d2", "to": "fifth_tun" }, { "id": "e_5c", "from": "fifth_tun", "to": "fifth_out" },
      { "id": "e_oa", "from": "split", "to": "d3" }, { "id": "e_ob", "from": "d3", "to": "oct_tun" }, { "id": "e_oc", "from": "oct_tun", "to": "oct_out" },
      { "id": "e_va", "from": "split", "to": "g1" }, { "id": "e_vb", "from": "g1", "to": "var_tun" }, { "id": "e_vc", "from": "var_tun", "to": "var_out" }
    ]
  },

  // ============================================
  // NEW FEATURE EXAMPLES
  // ============================================

  "quantizer_demo": {
    "version": "1.0",
    "bpm": 90,
    "description": "Demonstrates the Quantizer node - random pitches are snapped to the global key/scale. Change root note and scale in Settings to hear different harmonies.",
    "musicalContext": { "root": 0, "scale": [0, 2, 4, 5, 7, 9, 11] },
    "nodes": [
      { "id": "src1", "type": "source", "x": 60, "y": 200, "props": { "interval": 1, "noteIndex": -1, "intensity": 0.6 } },
      { "id": "quant1", "type": "quantizer", "x": 180, "y": 200, "props": { "strength": 1.0, "useGlobalKey": true } },
      { "id": "pol1", "type": "polariser", "x": 300, "y": 200, "props": { "wave": "sine", "attack": 0.02, "decay": 0.4 } },
      { "id": "out1", "type": "speaker", "x": 420, "y": 200, "props": { "reverb": 0.4, "pan": -0.5 } },
      
      { "id": "src2", "type": "source", "x": 60, "y": 350, "props": { "interval": 0.75, "noteIndex": -1, "intensity": 0.5 } },
      { "id": "quant2", "type": "quantizer", "x": 180, "y": 350, "props": { "strength": 0.5, "useGlobalKey": true } },
      { "id": "pol2", "type": "polariser", "x": 300, "y": 350, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.3 } },
      { "id": "out2", "type": "speaker", "x": 420, "y": 350, "props": { "reverb": 0.5, "pan": 0.5 } },
      
      { "id": "src3", "type": "source", "x": 60, "y": 500, "props": { "interval": 2, "noteIndex": -1, "intensity": 0.4 } },
      { "id": "p_oct", "type": "pitch", "x": 140, "y": 500, "props": { "shift": -12 } },
      { "id": "quant3", "type": "quantizer", "x": 220, "y": 500, "props": { "strength": 1.0, "useGlobalKey": true } },
      { "id": "pol3", "type": "polariser", "x": 320, "y": 500, "props": { "wave": "sawtooth", "attack": 0.1, "decay": 0.8 } },
      { "id": "out3", "type": "speaker", "x": 440, "y": 500, "props": { "reverb": 0.3, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1a", "from": "src1", "to": "quant1" }, { "id": "e1b", "from": "quant1", "to": "pol1" }, { "id": "e1c", "from": "pol1", "to": "out1" },
      { "id": "e2a", "from": "src2", "to": "quant2" }, { "id": "e2b", "from": "quant2", "to": "pol2" }, { "id": "e2c", "from": "pol2", "to": "out2" },
      { "id": "e3a", "from": "src3", "to": "p_oct" }, { "id": "e3b", "from": "p_oct", "to": "quant3" }, { "id": "e3c", "from": "quant3", "to": "pol3" }, { "id": "e3d", "from": "pol3", "to": "out3" }
    ]
  },

  "lfo_modulation": {
    "version": "1.0",
    "bpm": 80,
    "description": "Demonstrates LFO nodes for modulation. LFOs generate continuous values that can modulate filter cutoff, gain, or pan via CV routing.",
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "midiNote": 48, "intensity": 0.7 } },
      { "id": "pol", "type": "polariser", "x": 180, "y": 300, "props": { "wave": "sawtooth", "attack": 0.5, "decay": 2.0 } },
      { "id": "flt", "type": "filter", "x": 300, "y": 300, "props": { "cutoff": 800, "mod": 0 } },
      { "id": "out", "type": "speaker", "x": 420, "y": 300, "props": { "reverb": 0.6, "pan": 0 } },
      
      { "id": "lfo1", "type": "lfo", "x": 300, "y": 180, "props": { "rate": 0.5, "shape": "sine", "min": 200, "max": 2000, "phase": 0 } },
      
      { "id": "lfo2", "type": "lfo", "x": 420, "y": 180, "props": { "rate": 0.25, "shape": "triangle", "min": -0.8, "max": 0.8, "phase": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "pol" },
      { "id": "e2", "from": "pol", "to": "flt" },
      { "id": "e3", "from": "flt", "to": "out" },
      { "id": "e_lfo1", "from": "lfo1", "to": "flt", "props": { "targetParam": "cutoff" } },
      { "id": "e_lfo2", "from": "lfo2", "to": "out", "props": { "targetParam": "pan" } }
    ]
  },

  "virtual_edges": {
    "version": "1.0",
    "bpm": 120,
    "description": "Demonstrates virtual edges with fixed timing. Unlike physical edges where travel time depends on distance, virtual edges arrive exactly after the specified beats.",
    "nodes": [
      { "id": "src", "type": "source", "x": 100, "y": 300, "props": { "interval": 4, "midiNote": 60, "intensity": 0.7 } },
      { "id": "split", "type": "splitter", "x": 200, "y": 300, "props": {} },
      
      { "id": "pol1", "type": "polariser", "x": 500, "y": 150, "props": { "wave": "sine", "attack": 0.01, "decay": 0.3 } },
      { "id": "out1", "type": "speaker", "x": 620, "y": 150, "props": { "reverb": 0.3, "pan": -0.6 } },
      
      { "id": "pol2", "type": "polariser", "x": 500, "y": 250, "props": { "wave": "sine", "attack": 0.01, "decay": 0.3 } },
      { "id": "out2", "type": "speaker", "x": 620, "y": 250, "props": { "reverb": 0.3, "pan": -0.3 } },
      
      { "id": "pol3", "type": "polariser", "x": 500, "y": 350, "props": { "wave": "sine", "attack": 0.01, "decay": 0.3 } },
      { "id": "out3", "type": "speaker", "x": 620, "y": 350, "props": { "reverb": 0.3, "pan": 0 } },
      
      { "id": "pol4", "type": "polariser", "x": 500, "y": 450, "props": { "wave": "sine", "attack": 0.01, "decay": 0.3 } },
      { "id": "out4", "type": "speaker", "x": 620, "y": 450, "props": { "reverb": 0.3, "pan": 0.3 } }
    ],
    "edges": [
      { "id": "e_s", "from": "src", "to": "split" },
      { "id": "e_v1", "from": "split", "to": "pol1", "props": { "timingMode": "fixed", "durationBeats": 0 } },
      { "id": "e_v2", "from": "split", "to": "pol2", "props": { "timingMode": "fixed", "durationBeats": 1 } },
      { "id": "e_v3", "from": "split", "to": "pol3", "props": { "timingMode": "fixed", "durationBeats": 2 } },
      { "id": "e_v4", "from": "split", "to": "pol4", "props": { "timingMode": "fixed", "durationBeats": 3 } },
      { "id": "e_o1", "from": "pol1", "to": "out1" },
      { "id": "e_o2", "from": "pol2", "to": "out2" },
      { "id": "e_o3", "from": "pol3", "to": "out3" },
      { "id": "e_o4", "from": "pol4", "to": "out4" }
    ]
  },

  "gravity_tempo": {
    "version": "1.0",
    "bpm": 100,
    "description": "Demonstrates gravity physics - heavy nodes (high mass) slow down approaching packets, creating ritardando effects. Adjust Gravity Strength in Settings.",
    "gravityConstant": 0.8,
    "nodes": [
      { "id": "src1", "type": "source", "x": 60, "y": 200, "props": { "interval": 2, "midiNote": 60, "intensity": 0.6 } },
      { "id": "light_gain", "type": "gain", "x": 200, "y": 200, "props": { "value": 1.0, "mass": 0.2 } },
      { "id": "pol1", "type": "polariser", "x": 340, "y": 200, "props": { "wave": "sine", "attack": 0.01, "decay": 0.4 } },
      { "id": "out1", "type": "speaker", "x": 480, "y": 200, "props": { "reverb": 0.3, "pan": -0.5 } },
      
      { "id": "src2", "type": "source", "x": 60, "y": 350, "props": { "interval": 2, "midiNote": 60, "intensity": 0.6 } },
      { "id": "heavy_gain", "type": "gain", "x": 200, "y": 350, "props": { "value": 1.0, "mass": 2.5 } },
      { "id": "pol2", "type": "polariser", "x": 340, "y": 350, "props": { "wave": "sine", "attack": 0.01, "decay": 0.4 } },
      { "id": "out2", "type": "speaker", "x": 480, "y": 350, "props": { "reverb": 0.3, "pan": 0.5 } },
      
      { "id": "src3", "type": "source", "x": 60, "y": 500, "props": { "interval": 2, "midiNote": 48, "intensity": 0.5 } },
      { "id": "heavy_spk", "type": "speaker", "x": 300, "y": 500, "props": { "reverb": 0.4, "pan": 0, "mass": 3.0 } }
    ],
    "edges": [
      { "id": "e1a", "from": "src1", "to": "light_gain" }, { "id": "e1b", "from": "light_gain", "to": "pol1" }, { "id": "e1c", "from": "pol1", "to": "out1" },
      { "id": "e2a", "from": "src2", "to": "heavy_gain" }, { "id": "e2b", "from": "heavy_gain", "to": "pol2" }, { "id": "e2c", "from": "pol2", "to": "out2" },
      { "id": "e3a", "from": "src3", "to": "heavy_spk" }
    ]
  },

  "ahd_envelopes": {
    "version": "1.0",
    "bpm": 60,
    "description": "Demonstrates AHD (Attack-Hold-Decay) envelopes. holdTime sustains the note at peak volume before decay. Compare short staccato vs sustained organ-like tones.",
    "nodes": [
      { "id": "src1", "type": "source", "x": 60, "y": 180, "props": { "interval": 4, "midiNote": 60, "intensity": 0.7 } },
      { "id": "pol1", "type": "polariser", "x": 180, "y": 180, "props": { "wave": "sine", "attack": 0.01, "decay": 0.2 } },
      { "id": "staccato", "type": "speaker", "x": 300, "y": 180, "props": { "reverb": 0.2, "pan": -0.5, "holdTime": 0, "releaseTime": 0.1 } },
      
      { "id": "src2", "type": "source", "x": 60, "y": 300, "props": { "interval": 4, "midiNote": 60, "intensity": 0.7 } },
      { "id": "pol2", "type": "polariser", "x": 180, "y": 300, "props": { "wave": "sine", "attack": 0.3, "decay": 0.5 } },
      { "id": "sustained", "type": "speaker", "x": 300, "y": 300, "props": { "reverb": 0.4, "pan": 0, "holdTime": 1.5, "releaseTime": 0.8 } },
      
      { "id": "src3", "type": "source", "x": 60, "y": 420, "props": { "interval": 4, "midiNote": 60, "intensity": 0.7 } },
      { "id": "pol3", "type": "polariser", "x": 180, "y": 420, "props": { "wave": "triangle", "attack": 0.8, "decay": 0.1 } },
      { "id": "organ", "type": "speaker", "x": 300, "y": 420, "props": { "reverb": 0.6, "pan": 0.5, "holdTime": 2.0, "releaseTime": 1.2 } }
    ],
    "edges": [
      { "id": "e1a", "from": "src1", "to": "pol1" }, { "id": "e1b", "from": "pol1", "to": "staccato" },
      { "id": "e2a", "from": "src2", "to": "pol2" }, { "id": "e2b", "from": "pol2", "to": "sustained" },
      { "id": "e3a", "from": "src3", "to": "pol3" }, { "id": "e3b", "from": "pol3", "to": "organ" }
    ]
  },

  "pentatonic_jam": {
    "version": "1.0",
    "bpm": 100,
    "description": "A complete jam using quantizer for pentatonic scale, LFO modulation, and virtual edges for precise timing. Set scale to 'Pentatonic' in Settings.",
    "musicalContext": { "root": 2, "scale": [0, 2, 4, 7, 9] },
    "nodes": [
      { "id": "bass_src", "type": "source", "x": 60, "y": 150, "props": { "interval": 2, "noteIndex": -1, "intensity": 0.8 } },
      { "id": "bass_q", "type": "quantizer", "x": 160, "y": 150, "props": { "strength": 1.0 } },
      { "id": "bass_p", "type": "pitch", "x": 260, "y": 150, "props": { "shift": -12 } },
      { "id": "bass_pol", "type": "polariser", "x": 360, "y": 150, "props": { "wave": "sawtooth", "attack": 0.02, "decay": 0.5 } },
      { "id": "bass_flt", "type": "filter", "x": 460, "y": 150, "props": { "cutoff": 400, "mod": 800 } },
      { "id": "bass_out", "type": "speaker", "x": 560, "y": 150, "props": { "reverb": 0.2, "pan": 0, "holdTime": 0.1 } },
      
      { "id": "mel_src", "type": "source", "x": 60, "y": 300, "props": { "interval": 0.5, "noteIndex": -1, "intensity": 0.5 } },
      { "id": "mel_gate", "type": "gate", "x": 140, "y": 300, "props": { "prob": 0.6 } },
      { "id": "mel_q", "type": "quantizer", "x": 220, "y": 300, "props": { "strength": 1.0 } },
      { "id": "mel_split", "type": "splitter", "x": 300, "y": 300, "props": {} },
      
      { "id": "mel_pol1", "type": "polariser", "x": 400, "y": 250, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.25 } },
      { "id": "mel_out1", "type": "speaker", "x": 500, "y": 250, "props": { "reverb": 0.5, "pan": -0.4 } },
      
      { "id": "mel_pol2", "type": "polariser", "x": 400, "y": 350, "props": { "wave": "sine", "attack": 0.01, "decay": 0.2 } },
      { "id": "mel_out2", "type": "speaker", "x": 500, "y": 350, "props": { "reverb": 0.5, "pan": 0.4 } },
      
      { "id": "arp_src", "type": "source", "x": 60, "y": 480, "props": { "interval": 4, "midiNote": 72, "intensity": 0.4 } },
      { "id": "arp_split", "type": "splitter", "x": 160, "y": 480, "props": {} },
      { "id": "arp_q", "type": "quantizer", "x": 260, "y": 480, "props": { "strength": 1.0 } },
      { "id": "arp_pol", "type": "polariser", "x": 360, "y": 480, "props": { "wave": "sine", "attack": 0.005, "decay": 0.15 } },
      { "id": "arp_out", "type": "speaker", "x": 460, "y": 480, "props": { "reverb": 0.7, "pan": 0 } },
      
      { "id": "lfo_filter", "type": "lfo", "x": 460, "y": 80, "props": { "rate": 0.3, "shape": "sine", "min": 300, "max": 1200 } }
    ],
    "edges": [
      { "id": "e_b1", "from": "bass_src", "to": "bass_q" },
      { "id": "e_b2", "from": "bass_q", "to": "bass_p" },
      { "id": "e_b3", "from": "bass_p", "to": "bass_pol" },
      { "id": "e_b4", "from": "bass_pol", "to": "bass_flt" },
      { "id": "e_b5", "from": "bass_flt", "to": "bass_out" },
      
      { "id": "e_m1", "from": "mel_src", "to": "mel_gate" },
      { "id": "e_m2", "from": "mel_gate", "to": "mel_q" },
      { "id": "e_m3", "from": "mel_q", "to": "mel_split" },
      { "id": "e_m4", "from": "mel_split", "to": "mel_pol1" },
      { "id": "e_m5", "from": "mel_pol1", "to": "mel_out1" },
      { "id": "e_m6", "from": "mel_split", "to": "mel_pol2", "props": { "timingMode": "fixed", "durationBeats": 0.25 } },
      { "id": "e_m7", "from": "mel_pol2", "to": "mel_out2" },
      
      { "id": "e_a1", "from": "arp_src", "to": "arp_split" },
      { "id": "e_a2", "from": "arp_split", "to": "arp_q", "props": { "timingMode": "fixed", "durationBeats": 0 } },
      { "id": "e_a3", "from": "arp_split", "to": "arp_q", "props": { "timingMode": "fixed", "durationBeats": 0.5 } },
      { "id": "e_a4", "from": "arp_split", "to": "arp_q", "props": { "timingMode": "fixed", "durationBeats": 1 } },
      { "id": "e_a5", "from": "arp_split", "to": "arp_q", "props": { "timingMode": "fixed", "durationBeats": 1.5 } },
      { "id": "e_a6", "from": "arp_q", "to": "arp_pol" },
      { "id": "e_a7", "from": "arp_pol", "to": "arp_out" },
      
      { "id": "e_lfo", "from": "lfo_filter", "to": "bass_flt", "props": { "targetParam": "cutoff" } }
    ]
  },

  "cv_routing_demo": {
    "version": "1.0",
    "bpm": 70,
    "description": "Advanced CV routing - LFOs modulate different parameters. One LFO sweeps the filter, another modulates pan for stereo movement, a third affects gain.",
    "nodes": [
      { "id": "src", "type": "source", "x": 80, "y": 300, "props": { "interval": 3, "midiNote": 48, "intensity": 0.7 } },
      { "id": "pol", "type": "polariser", "x": 200, "y": 300, "props": { "wave": "sawtooth", "attack": 0.8, "decay": 2.5 } },
      { "id": "gain", "type": "gain", "x": 320, "y": 300, "props": { "value": 0.8 } },
      { "id": "flt", "type": "filter", "x": 440, "y": 300, "props": { "cutoff": 1000, "mod": 0, "attack": 0, "decay": 0 } },
      { "id": "out", "type": "speaker", "x": 560, "y": 300, "props": { "reverb": 0.7, "pan": 0, "holdTime": 0.5, "releaseTime": 1.0 } },
      
      { "id": "lfo_cutoff", "type": "lfo", "x": 440, "y": 150, "props": { "rate": 0.2, "shape": "sine", "min": 200, "max": 3000, "phase": 0 } },
      { "id": "lfo_pan", "type": "lfo", "x": 560, "y": 150, "props": { "rate": 0.15, "shape": "triangle", "min": -1, "max": 1, "phase": 0.25 } },
      { "id": "lfo_gain", "type": "lfo", "x": 320, "y": 450, "props": { "rate": 0.5, "shape": "sine", "min": 0.3, "max": 1.0, "phase": 0 } },
      
      { "id": "src2", "type": "source", "x": 80, "y": 500, "props": { "interval": 6, "midiNote": 36, "intensity": 0.8 } },
      { "id": "pol2", "type": "polariser", "x": 200, "y": 500, "props": { "wave": "sine", "attack": 0.5, "decay": 3.0 } },
      { "id": "out2", "type": "speaker", "x": 320, "y": 500, "props": { "reverb": 0.5, "pan": 0, "holdTime": 1.0, "releaseTime": 1.5 } }
    ],
    "edges": [
      { "id": "e1", "from": "src", "to": "pol" },
      { "id": "e2", "from": "pol", "to": "gain" },
      { "id": "e3", "from": "gain", "to": "flt" },
      { "id": "e4", "from": "flt", "to": "out" },
      { "id": "e_lfo1", "from": "lfo_cutoff", "to": "flt", "props": { "targetParam": "cutoff" } },
      { "id": "e_lfo2", "from": "lfo_pan", "to": "out", "props": { "targetParam": "pan" } },
      { "id": "e_lfo3", "from": "lfo_gain", "to": "gain", "props": { "targetParam": "gain" } },
      { "id": "e5", "from": "src2", "to": "pol2" },
      { "id": "e6", "from": "pol2", "to": "out2" }
    ]
  },

  "blues_scale": {
    "version": "1.0",
    "bpm": 85,
    "description": "Blues jam using the blues scale quantizer. Random notes snap to the blues scale for authentic bluesy feel. Try changing root note in Settings.",
    "musicalContext": { "root": 7, "scale": [0, 3, 5, 6, 7, 10] },
    "nodes": [
      { "id": "lead_src", "type": "source", "x": 60, "y": 200, "props": { "interval": 0.75, "noteIndex": -1, "intensity": 0.6 } },
      { "id": "lead_gate", "type": "gate", "x": 140, "y": 200, "props": { "prob": 0.7 } },
      { "id": "lead_q", "type": "quantizer", "x": 220, "y": 200, "props": { "strength": 1.0 } },
      { "id": "lead_pol", "type": "polariser", "x": 320, "y": 200, "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.3 } },
      { "id": "lead_flt", "type": "filter", "x": 420, "y": 200, "props": { "cutoff": 1800, "mod": 2000, "attack": 0.01, "decay": 0.2 } },
      { "id": "lead_out", "type": "speaker", "x": 520, "y": 200, "props": { "reverb": 0.4, "pan": 0.3 } },
      
      { "id": "bass_src", "type": "source", "x": 60, "y": 350, "props": { "interval": 2, "noteIndex": -1, "intensity": 0.8 } },
      { "id": "bass_q", "type": "quantizer", "x": 160, "y": 350, "props": { "strength": 1.0 } },
      { "id": "bass_p", "type": "pitch", "x": 260, "y": 350, "props": { "shift": -24 } },
      { "id": "bass_pol", "type": "polariser", "x": 360, "y": 350, "props": { "wave": "triangle", "attack": 0.02, "decay": 0.6 } },
      { "id": "bass_out", "type": "speaker", "x": 460, "y": 350, "props": { "reverb": 0.2, "pan": -0.2, "holdTime": 0.2 } },
      
      { "id": "rhythm_src", "type": "source", "x": 60, "y": 500, "props": { "interval": 0.5, "noteIndex": -1, "intensity": 0.4 } },
      { "id": "rhythm_gate", "type": "gate", "x": 140, "y": 500, "props": { "prob": 0.5 } },
      { "id": "rhythm_q", "type": "quantizer", "x": 220, "y": 500, "props": { "strength": 0.8 } },
      { "id": "rhythm_pol", "type": "polariser", "x": 320, "y": 500, "props": { "wave": "square", "attack": 0.005, "decay": 0.15 } },
      { "id": "rhythm_out", "type": "speaker", "x": 420, "y": 500, "props": { "reverb": 0.3, "pan": -0.4 } },
      
      { "id": "lfo_wah", "type": "lfo", "x": 420, "y": 100, "props": { "rate": 3, "shape": "sine", "min": 400, "max": 2500 } }
    ],
    "edges": [
      { "id": "e_l1", "from": "lead_src", "to": "lead_gate" },
      { "id": "e_l2", "from": "lead_gate", "to": "lead_q" },
      { "id": "e_l3", "from": "lead_q", "to": "lead_pol" },
      { "id": "e_l4", "from": "lead_pol", "to": "lead_flt" },
      { "id": "e_l5", "from": "lead_flt", "to": "lead_out" },
      { "id": "e_wah", "from": "lfo_wah", "to": "lead_flt", "props": { "targetParam": "cutoff" } },
      { "id": "e_b1", "from": "bass_src", "to": "bass_q" },
      { "id": "e_b2", "from": "bass_q", "to": "bass_p" },
      { "id": "e_b3", "from": "bass_p", "to": "bass_pol" },
      { "id": "e_b4", "from": "bass_pol", "to": "bass_out" },
      { "id": "e_r1", "from": "rhythm_src", "to": "rhythm_gate" },
      { "id": "e_r2", "from": "rhythm_gate", "to": "rhythm_q" },
      { "id": "e_r3", "from": "rhythm_q", "to": "rhythm_pol" },
      { "id": "e_r4", "from": "rhythm_pol", "to": "rhythm_out" }
    ]
  },

  "ambient_drone": {
    "version": "1.0",
    "bpm": 40,
    "description": "Deep, evolving drone textures. Uses slow LFOs to modulate filter cutoffs, creating movement within a static chord.",
    "nodes": [
      { "id": "src_low", "type": "source", "x": 50, "y": 200, "props": { "interval": 8, "midiNote": 36, "intensity": 0.8 } },
      { "id": "lfo_low", "type": "lfo", "x": 50, "y": 100, "props": { "rate": 0.1, "min": 200, "max": 800, "shape": "sine" } },
      { "id": "flt_low", "type": "filter", "x": 200, "y": 200, "props": { "cutoff": 400, "resonance": 5, "attack": 2.0, "decay": 4.0 } },
      { "id": "pol_low", "type": "polariser", "x": 350, "y": 200, "props": { "wave": "sawtooth", "attack": 2.0, "decay": 6.0 } },
      { "id": "spk_low", "type": "speaker", "x": 500, "y": 200, "props": { "reverb": 0.8, "pan": -0.3 } },

      { "id": "src_mid", "type": "source", "x": 50, "y": 350, "props": { "interval": 6, "midiNote": 48, "intensity": 0.6 } },
      { "id": "pol_mid", "type": "polariser", "x": 200, "y": 350, "props": { "wave": "sine", "attack": 1.5, "decay": 4.0 } },
      { "id": "dly_mid", "type": "delay", "x": 350, "y": 350, "props": { "delayTime": 0.5, "feedback": 0.4 } },
      { "id": "spk_mid", "type": "speaker", "x": 500, "y": 350, "props": { "reverb": 0.9, "pan": 0.3 } },

      { "id": "src_hi", "type": "source", "x": 50, "y": 500, "props": { "interval": 3, "noteIndex": -1, "intensity": 0.4 } },
      { "id": "gate_hi", "type": "gate", "x": 150, "y": 500, "props": { "prob": 0.3 } },
      { "id": "q_hi", "type": "quantizer", "x": 250, "y": 500, "props": { "scale": "pentatonic", "key": "C" } },
      { "id": "pol_hi", "type": "polariser", "x": 350, "y": 500, "props": { "wave": "triangle", "attack": 0.1, "decay": 1.5 } },
      { "id": "spk_hi", "type": "speaker", "x": 500, "y": 500, "props": { "reverb": 0.7, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "src_low", "to": "flt_low" },
      { "id": "e2", "from": "lfo_low", "to": "flt_low", "props": { "targetParam": "cutoff" } },
      { "id": "e3", "from": "flt_low", "to": "pol_low" },
      { "id": "e4", "from": "pol_low", "to": "spk_low" },
      
      { "id": "e5", "from": "src_mid", "to": "pol_mid" },
      { "id": "e6", "from": "pol_mid", "to": "dly_mid" },
      { "id": "e7", "from": "dly_mid", "to": "spk_mid" },

      { "id": "e8", "from": "src_hi", "to": "gate_hi" },
      { "id": "e9", "from": "gate_hi", "to": "q_hi" },
      { "id": "e10", "from": "q_hi", "to": "pol_hi" },
      { "id": "e11", "from": "pol_hi", "to": "spk_hi" }
    ]
  },

  "ambient_krell": {
    "version": "1.0",
    "bpm": 80,
    "description": "A 'Krell' style patch. Random notes with random envelopes. The LFO modulates the decay time of the Polariser, creating notes of varying lengths.",
    "nodes": [
      { "id": "clock", "type": "source", "x": 50, "y": 300, "props": { "interval": 0.5, "noteIndex": -1, "intensity": 0.7 } },
      { "id": "gate", "type": "gate", "x": 150, "y": 300, "props": { "prob": 0.4 } },
      { "id": "quant", "type": "quantizer", "x": 250, "y": 300, "props": { "scale": "lydian", "key": "C" } },
      
      { "id": "lfo_decay", "type": "lfo", "x": 250, "y": 150, "props": { "rate": 0.2, "min": 0.1, "max": 2.0, "shape": "random" } },
      
      { "id": "pol", "type": "polariser", "x": 400, "y": 300, "props": { "wave": "sine", "attack": 0.05, "decay": 0.5 } },
      { "id": "delay", "type": "delay", "x": 550, "y": 300, "props": { "delayTime": 0.75, "feedback": 0.5 } },
      { "id": "spk", "type": "speaker", "x": 700, "y": 300, "props": { "reverb": 0.6, "pan": 0 } }
    ],
    "edges": [
      { "id": "e1", "from": "clock", "to": "gate" },
      { "id": "e2", "from": "gate", "to": "quant" },
      { "id": "e3", "from": "quant", "to": "pol" },
      { "id": "e4", "from": "lfo_decay", "to": "pol", "props": { "targetParam": "decay" } },
      { "id": "e5", "from": "pol", "to": "delay" },
      { "id": "e6", "from": "delay", "to": "spk" }
    ]
  },

  "ambient_polymetric": {
    "version": "1.0",
    "bpm": 110,
    "description": "Three independent loops of lengths 5, 7, and 9 beats. They phase against each other, creating a constantly shifting harmonic pattern that rarely repeats.",
    "nodes": [
      { "id": "src5", "type": "source", "x": 50, "y": 150, "props": { "interval": 5, "midiNote": 60, "intensity": 0.6 } },
      { "id": "pol5", "type": "polariser", "x": 200, "y": 150, "props": { "wave": "sine", "attack": 0.1, "decay": 2.0 } },
      { "id": "dly5", "type": "delay", "x": 350, "y": 150, "props": { "delayTime": 0.5 } },
      { "id": "spk5", "type": "speaker", "x": 500, "y": 150, "props": { "reverb": 0.5, "pan": -0.5 } },

      { "id": "src7", "type": "source", "x": 50, "y": 300, "props": { "interval": 7, "midiNote": 64, "intensity": 0.6 } },
      { "id": "pol7", "type": "polariser", "x": 200, "y": 300, "props": { "wave": "triangle", "attack": 0.1, "decay": 2.0 } },
      { "id": "dly7", "type": "delay", "x": 350, "y": 300, "props": { "delayTime": 0.75 } },
      { "id": "spk7", "type": "speaker", "x": 500, "y": 300, "props": { "reverb": 0.5, "pan": 0 } },

      { "id": "src9", "type": "source", "x": 50, "y": 450, "props": { "interval": 9, "midiNote": 67, "intensity": 0.6 } },
      { "id": "pol9", "type": "polariser", "x": 200, "y": 450, "props": { "wave": "sine", "attack": 0.1, "decay": 2.0 } },
      { "id": "dly9", "type": "delay", "x": 350, "y": 450, "props": { "delayTime": 1.0 } },
      { "id": "spk9", "type": "speaker", "x": 500, "y": 450, "props": { "reverb": 0.5, "pan": 0.5 } }
    ],
    "edges": [
      { "id": "e1", "from": "src5", "to": "pol5" }, { "id": "e2", "from": "pol5", "to": "dly5" }, { "id": "e3", "from": "dly5", "to": "spk5" },
      { "id": "e4", "from": "src7", "to": "pol7" }, { "id": "e5", "from": "pol7", "to": "dly7" }, { "id": "e6", "from": "dly7", "to": "spk7" },
      { "id": "e7", "from": "src9", "to": "pol9" }, { "id": "e8", "from": "pol9", "to": "dly9" }, { "id": "e9", "from": "dly9", "to": "spk9" }
    ]
  }
};
