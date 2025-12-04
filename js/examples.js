// AIGA - Example Compositions

export const EXAMPLES = {
  "sequential_melody": {
    "version": "1.0",
    "bpm": 120,
    "nodes": [
      { "id": "src", "type": "source", "x": 60, "y": 300, "props": { "interval": 4, "noteIndex": 12, "prob": 1 } },
      { "id": "e1", "type": "emitter", "x": 180, "y": 300, "props": { "reverb": 0.3, "pan": -0.5 } },
      { "id": "p1", "type": "pitch", "x": 300, "y": 300, "props": { "shift": 2 } },
      { "id": "e2", "type": "emitter", "x": 420, "y": 300, "props": { "reverb": 0.3, "pan": -0.25 } },
      { "id": "p2", "type": "pitch", "x": 540, "y": 300, "props": { "shift": 2 } },
      { "id": "e3", "type": "emitter", "x": 660, "y": 300, "props": { "reverb": 0.3, "pan": 0 } },
      { "id": "p3", "type": "pitch", "x": 780, "y": 300, "props": { "shift": 1 } },
      { "id": "e4", "type": "emitter", "x": 900, "y": 300, "props": { "reverb": 0.3, "pan": 0.25 } },
      { "id": "p4", "type": "pitch", "x": 1020, "y": 300, "props": { "shift": 2 } },
      { "id": "e5", "type": "emitter", "x": 1140, "y": 300, "props": { "reverb": 0.5, "pan": 0.5 } }
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
      { "id": "e1", "type": "emitter", "x": 540, "y": 180, "props": { "reverb": 0.9, "pan": -0.6 } },
      { "id": "g2", "type": "gate", "x": 300, "y": 300, "props": { "prob": 0.4 } },
      { "id": "p2", "type": "pitch", "x": 420, "y": 300, "props": { "shift": 24 } },
      { "id": "pol2", "type": "polariser", "x": 540, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.3 } },
      { "id": "e2", "type": "emitter", "x": 660, "y": 300, "props": { "reverb": 0.8, "pan": 0.6 } },
      { "id": "d3", "type": "delay", "x": 300, "y": 420, "props": { "delayTime": 1.5 } },
      { "id": "p3", "type": "pitch", "x": 420, "y": 420, "props": { "shift": -12 } },
      { "id": "pol3", "type": "polariser", "x": 540, "y": 420, "props": { "wave": "sine", "attack": 0.2, "decay": 1.5 } },
      { "id": "e3", "type": "emitter", "x": 660, "y": 420, "props": { "reverb": 0.3, "pan": 0 } }
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
      { "id": "e4", "type": "emitter", "x": 300, "y": 180, "props": { "reverb": 0.4, "pan": -0.5 } },
      { "id": "src3", "type": "source", "x": 60, "y": 300, "props": { "interval": 3, "noteIndex": 19, "prob": 1 } },
      { "id": "pol3", "type": "polariser", "x": 180, "y": 300, "props": { "wave": "triangle", "attack": 0.01, "decay": 0.4 } },
      { "id": "e3", "type": "emitter", "x": 300, "y": 300, "props": { "reverb": 0.4, "pan": 0 } },
      { "id": "src5", "type": "source", "x": 60, "y": 420, "props": { "interval": 5, "noteIndex": 7, "prob": 1 } },
      { "id": "pol5", "type": "polariser", "x": 180, "y": 420, "props": { "wave": "square", "attack": 0.01, "decay": 0.3 } },
      { "id": "e5", "type": "emitter", "x": 300, "y": 420, "props": { "reverb": 0.4, "pan": 0.5 } }
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
      { "id": "kick_out", "type": "emitter", "x": 420, "y": 180, "props": { "volume": 1.0, "reverb": 0.1, "pan": 0 } },
      { "id": "snare_src", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "noteIndex": 0, "intensity": 0.6 } },
      { "id": "snare_del", "type": "delay", "x": 140, "y": 300, "props": { "delayTime": 1 } },
      { "id": "snare_pol", "type": "polariser", "x": 220, "y": 300, "props": { "wave": "sawtooth", "attack": 0.01, "decay": 0.12 } },
      { "id": "snare_p", "type": "pitch", "x": 300, "y": 300, "props": { "shift": 12 } },
      { "id": "snare_out", "type": "emitter", "x": 420, "y": 300, "props": { "volume": 0.8, "reverb": 0.35, "pan": 0.1 } },
      { "id": "hh_src", "type": "source", "x": 60, "y": 420, "props": { "interval": 0.5, "noteIndex": 0, "intensity": 0.3 } },
      { "id": "hh_gate", "type": "gate", "x": 140, "y": 420, "props": { "prob": 0.75 } },
      { "id": "hh_pol", "type": "polariser", "x": 220, "y": 420, "props": { "wave": "square", "attack": 0.005, "decay": 0.04 } },
      { "id": "hh_p", "type": "pitch", "x": 300, "y": 420, "props": { "shift": 30 } },
      { "id": "hh_out", "type": "emitter", "x": 420, "y": 420, "props": { "volume": 0.6, "reverb": 0.15, "pan": 0.4 } }
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
      { "id": "out", "type": "emitter", "x": 340, "y": 300, "props": { "reverb": 0.8, "pan": 0 } },
      { "id": "split", "type": "splitter", "x": 200, "y": 180, "props": {} },
      { "id": "p_hi", "type": "pitch", "x": 280, "y": 180, "props": { "shift": 12 } },
      { "id": "sparkle", "type": "tunnel", "x": 380, "y": 180, "props": {
        "tunnelName": "Sparkle",
        "subNodes": [
          { "type": "polariser", "props": { "wave": "triangle", "attack": 0.01, "decay": 0.4 } }
        ]
      }},
      { "id": "out_hi", "type": "emitter", "x": 500, "y": 180, "props": { "reverb": 0.9, "pan": 0.4 } }
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
      { "id": "out", "type": "emitter", "x": 420, "y": 300, "props": { "reverb": 0.15, "pan": 0 } }
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
      
      { "id": "v1_e1", "type": "emitter", "x": 250, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p1", "type": "pitch", "x": 350, "y": 200, "props": { "shift": 7 } },
      { "id": "v1_e2", "type": "emitter", "x": 450, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p2", "type": "pitch", "x": 550, "y": 200, "props": { "shift": -4 } },
      { "id": "v1_e3", "type": "emitter", "x": 650, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p3", "type": "pitch", "x": 750, "y": 200, "props": { "shift": -3 } },
      { "id": "v1_e4", "type": "emitter", "x": 850, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p4", "type": "pitch", "x": 950, "y": 200, "props": { "shift": -1 } },
      { "id": "v1_e5", "type": "emitter", "x": 1050, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      
      { "id": "delay", "type": "delay", "x": 250, "y": 400, "props": { "delayTime": 4.0 } },
      { "id": "v2_e1", "type": "emitter", "x": 350, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p1", "type": "pitch", "x": 450, "y": 400, "props": { "shift": 7 } },
      { "id": "v2_e2", "type": "emitter", "x": 550, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p2", "type": "pitch", "x": 650, "y": 400, "props": { "shift": -4 } },
      { "id": "v2_e3", "type": "emitter", "x": 750, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p3", "type": "pitch", "x": 850, "y": 400, "props": { "shift": -3 } },
      { "id": "v2_e4", "type": "emitter", "x": 950, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p4", "type": "pitch", "x": 1050, "y": 400, "props": { "shift": -1 } },
      { "id": "v2_e5", "type": "emitter", "x": 1150, "y": 400, "props": { "reverb": 0, "pan": 0.6 } }
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
      
      { "id": "v1_e1", "type": "emitter", "x": 250, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p1", "type": "pitch", "x": 350, "y": 200, "props": { "shift": 7 } },
      { "id": "v1_e2", "type": "emitter", "x": 450, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p2", "type": "pitch", "x": 550, "y": 200, "props": { "shift": -4 } },
      { "id": "v1_e3", "type": "emitter", "x": 650, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p3", "type": "pitch", "x": 750, "y": 200, "props": { "shift": -3 } },
      { "id": "v1_e4", "type": "emitter", "x": 850, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      { "id": "v1_p4", "type": "pitch", "x": 950, "y": 200, "props": { "shift": -1 } },
      { "id": "v1_e5", "type": "emitter", "x": 1050, "y": 200, "props": { "reverb": 0, "pan": -0.6 } },
      
      { "id": "delay", "type": "delay", "x": 250, "y": 400, "props": { "delayTime": 4.0 } },
      { "id": "trans", "type": "pitch", "x": 300, "y": 400, "props": { "shift": 7 } },
      { "id": "v2_e1", "type": "emitter", "x": 350, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p1", "type": "pitch", "x": 450, "y": 400, "props": { "shift": 7 } },
      { "id": "v2_e2", "type": "emitter", "x": 550, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p2", "type": "pitch", "x": 650, "y": 400, "props": { "shift": -4 } },
      { "id": "v2_e3", "type": "emitter", "x": 750, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p3", "type": "pitch", "x": 850, "y": 400, "props": { "shift": -3 } },
      { "id": "v2_e4", "type": "emitter", "x": 950, "y": 400, "props": { "reverb": 0, "pan": 0.6 } },
      { "id": "v2_p4", "type": "pitch", "x": 1050, "y": 400, "props": { "shift": -1 } },
      { "id": "v2_e5", "type": "emitter", "x": 1150, "y": 400, "props": { "reverb": 0, "pan": 0.6 } }
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
      { "id": "out_loud", "type": "emitter", "x": 300, "y": 180, "props": { "volume": 1.0, "reverb": 0.2, "pan": -0.3 } },
      
      { "id": "src_soft", "type": "source", "x": 60, "y": 300, "props": { "interval": 2, "noteIndex": 24, "intensity": 0.2 } },
      { "id": "pol_soft", "type": "polariser", "x": 180, "y": 300, "props": { "wave": "triangle", "attack": 0.1, "decay": 0.8 } },
      { "id": "out_soft", "type": "emitter", "x": 300, "y": 300, "props": { "volume": 0.6, "reverb": 0.6, "pan": 0.3 } },
      
      { "id": "src_swell", "type": "source", "x": 60, "y": 420, "props": { "interval": 1, "noteIndex": 19, "intensity": 0.3 } },
      { "id": "gain_up", "type": "gain", "x": 160, "y": 420, "props": { "value": 1.5 } },
      { "id": "pol_swell", "type": "polariser", "x": 260, "y": 420, "props": { "wave": "sine", "attack": 0.2, "decay": 0.6 } },
      { "id": "gain_down", "type": "gain", "x": 360, "y": 420, "props": { "value": 0.5 } },
      { "id": "out_swell", "type": "emitter", "x": 460, "y": 420, "props": { "volume": 1.0, "reverb": 0.4, "pan": 0 } }
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
      { "id": "v_out", "type": "emitter", "x": 340, "y": 150, "props": { "volume": 0.7, "reverb": 0.55, "pan": -0.4 } },

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
      { "id": "c_out", "type": "emitter", "x": 340, "y": 300, "props": { "volume": 0.8, "reverb": 0.5, "pan": 0.4 } },

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
      { "id": "f_out", "type": "emitter", "x": 340, "y": 450, "props": { "volume": 0.5, "reverb": 0.7, "pan": 0 } }
    ],
    "edges": [
      { "id": "e_v1", "from": "v_src", "to": "v_tun" }, { "id": "e_v2", "from": "v_tun", "to": "v_out" },
      { "id": "e_c1", "from": "c_src", "to": "c_tun" }, { "id": "e_c2", "from": "c_tun", "to": "c_out" },
      { "id": "e_f1", "from": "f_src", "to": "f_tun" }, { "id": "e_f2", "from": "f_tun", "to": "f_out" }
    ]
  }
};
