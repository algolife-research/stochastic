// AIGA - Constants

// Canvas & Grid
export const NODE_RADIUS = 25;
export const HANDLE_OFFSET_X = 35;
export const HANDLE_RADIUS = 8;
export const PIXELS_PER_STEP = 200; // 1 Step = 1 Beat distance (Increased for faster flow)
export const GRID_SIZE = 60;

// Attractor System
export const SNAP_STEP = 20;
export const GRID_ATTRACT_STRENGTH = 0.2;
export const EDGE_ATTRACT_STRENGTH = 0.7;
export const EDGE_SNAP_INTERVAL = 60;
export const ATTRACT_RADIUS = 30;

// Zoom
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;

// Regions
export const REGION_HANDLE_SIZE = 10;
export const MIN_REGION_SIZE = 100;

// Speed
export const DEFAULT_SPEED = 120;
export const MIN_SPEED = 20;
export const MAX_SPEED = 300;

// MIDI Note System (replaces limited 37-note array)
export const MIDI_A4 = 69;
export const MIDI_A4_FREQ = 440;
export const MIDI_MIN = 0;   // C-1
export const MIDI_MAX = 127; // G9
export const DEFAULT_MIDI_NOTE = 60; // Middle C (C4)

// Note labels for display
export const NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Convert MIDI note number to frequency (Hz)
 * f = 440 × 2^((n - 69) / 12)
 */
export function midiToFreq(midiNote) {
  return MIDI_A4_FREQ * Math.pow(2, (midiNote - MIDI_A4) / 12);
}

/**
 * Convert frequency to nearest MIDI note
 */
export function freqToMidi(freq) {
  return Math.round(12 * Math.log2(freq / MIDI_A4_FREQ) + MIDI_A4);
}

/**
 * Get note name from MIDI number (e.g., 60 -> "C4")
 */
export function midiToNoteName(midiNote) {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTE_LABELS[midiNote % 12];
  return noteName + octave;
}

/**
 * Clamp MIDI note to valid range
 */
export function clampMidi(midiNote) {
  return Math.max(MIDI_MIN, Math.min(MIDI_MAX, Math.round(midiNote)));
}

// Legacy support: Generate chromatic scale array for backwards compatibility
// Maps old scaleIndex (0-36) to MIDI notes (36-72, C2-C5)
export const LEGACY_SCALE_OFFSET = 36; // scaleIndex 0 = MIDI 36 (C2)
export const BASE_FREQ = 130.81; // C3 (legacy)
export const SCALE_CHROMATIC = [];
export const NOTE_NAMES = [];

for (let i = 0; i < 37; i++) {
  const midiNote = LEGACY_SCALE_OFFSET + i;
  SCALE_CHROMATIC.push(midiToFreq(midiNote));
  NOTE_NAMES.push(midiToNoteName(midiNote));
}

// Musical Scales (intervals from root)
export const SCALES = {
  chromatic:    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major:        [0, 2, 4, 5, 7, 9, 11],
  minor:        [0, 2, 3, 5, 7, 8, 10],
  dorian:       [0, 2, 3, 5, 7, 9, 10],
  phrygian:     [0, 1, 3, 5, 7, 8, 10],
  lydian:       [0, 2, 4, 6, 7, 9, 11],
  mixolydian:   [0, 2, 4, 5, 7, 9, 10],
  locrian:      [0, 1, 3, 5, 6, 8, 10],
  pentatonic:   [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues:        [0, 3, 5, 6, 7, 10],
  wholeTone:    [0, 2, 4, 6, 8, 10],
  diminished:   [0, 2, 3, 5, 6, 8, 9, 11]
};

// Node Colors
export const NODE_COLORS = {
  source: '#03dac6',
  speaker: '#cf6679',
  filter: '#3700b3',
  polariser: '#bb86fc',
  pitch: '#ffb74d',
  splitter: '#76ff03',
  gate: '#607d8b',
  delay: '#9e9e9e',
  tunnel: '#00bcd4',
  chord: '#e91e63',
  gain: '#ffeb3b',
  noise: '#90a4ae',
  harmonic: '#ff7043',
  modulator: '#7c4dff',
  teleporter: '#18ffff',
  quantizer: '#4caf50',
  lfo: '#ff4081'
};

// Node Icons
export const NODE_ICONS = {
  source: '⚡',
  speaker: '🔊',
  filter: '🌊',
  polariser: '🔮',
  pitch: '🎵',
  splitter: '🔀',
  gate: '🚪',
  delay: '🕒',
  chord: '🎹',
  tunnel: '🚇',
  gain: '📢',
  noise: '🌫️',
  harmonic: '🎻',
  modulator: '〰️',
  teleporter: '🞆',
  quantizer: '🎼',
  lfo: '📈'
};

export const MAX_PACKETS = 500;

// Tunnel Templates
export const TUNNEL_TEMPLATES = {
  voice: {
    name: 'Voice',
    icon: '🎤',
    description: 'Pitch + Polariser (ready-to-play sound)',
    nodes: ['pitch', 'polariser']
  },
  thick: {
    name: 'Thick',
    icon: '🎸',
    description: 'Octave doubler (+12 semitones)',
    nodes: ['pitch'],
    defaults: { pitch_shift: 12 }
  },
  dark: {
    name: 'Dark',
    icon: '🌑',
    description: 'Low pass filter + low pitch',
    nodes: ['filter', 'pitch'],
    defaults: { pitch_shift: -12 }
  }
};
