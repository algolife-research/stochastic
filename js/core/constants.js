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

// Speed
export const DEFAULT_SPEED = 120;
export const MIN_SPEED = 20;
export const MAX_SPEED = 300;

// Audio Scale (C3 to C6 - 3 Octaves)
export const BASE_FREQ = 130.81; // C3
export const NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Generate chromatic scale
export const SCALE_CHROMATIC = [];
export const NOTE_NAMES = [];

for (let i = 0; i < 37; i++) {
  const freq = BASE_FREQ * Math.pow(2, i / 12);
  SCALE_CHROMATIC.push(freq);
  
  const octave = Math.floor(i / 12) + 3;
  const noteName = NOTE_LABELS[i % 12] + octave;
  NOTE_NAMES.push(noteName);
}

// Node Colors
export const NODE_COLORS = {
  source: '#03dac6',
  emitter: '#cf6679',
  filter: '#3700b3',
  polariser: '#bb86fc',
  pitch: '#ffb74d',
  splitter: '#76ff03',
  gate: '#607d8b',
  delay: '#9e9e9e',
  tunnel: '#00bcd4',
  chord: '#e91e63',
  gain: '#ffeb3b'
};

// Node Icons
export const NODE_ICONS = {
  source: '⚡',
  emitter: '🔊',
  filter: '🌊',
  polariser: '🔮',
  pitch: '🎵',
  splitter: '🔀',
  gate: '🚪',
  delay: '🕒',
  chord: '🎹',
  tunnel: '🚇',
  gain: '📢'
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
