// Phonon v2 - Constants
// All configuration values and lookup tables

import type { 
  MidiNote, Frequency, ScaleName, ScaleIntervals,
  SourceProps, SpeakerProps, PitchProps, PolariserProps,
  FilterProps, GateProps, DelayProps, GainProps, NoiseProps,
  HarmonicProps, ModulatorProps, TunnelProps, TeleporterProps,
  QuantizerProps, LfoProps, SplitterProps, MidiOutProps, MidiCcProps, SceneTriggerProps,
  NodeType
} from './types';

// ============================================================================
// CANVAS & RENDERING
// ============================================================================

export const NODE_RADIUS = 25;
export const HANDLE_OFFSET_X = 35;
export const HANDLE_RADIUS = 8;
export const GRID_SIZE = 60;
export const PIXELS_PER_BEAT = 200;

// Zoom limits
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3.0;

// Region constants
export const REGION_HANDLE_SIZE = 10;
export const MIN_REGION_SIZE = 100;

// Attractor system
export const SNAP_STEP = 20;
export const GRID_ATTRACT_STRENGTH = 0.2;
export const EDGE_ATTRACT_STRENGTH = 0.7;
export const EDGE_SNAP_INTERVAL = 60;
export const ATTRACT_RADIUS = 30;

// ============================================================================
// TIMING & PERFORMANCE
// ============================================================================

export const DEFAULT_SPEED: number = 120;  // BPM
export const MIN_SPEED = 20;
export const MAX_SPEED = 300;

export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

export const MAX_PACKETS = 1000;

// ============================================================================
// MIDI CONSTANTS
// ============================================================================

export const MIDI_A4 = 69;
export const MIDI_A4_FREQ = 440;
export const MIDI_MIN = 0;
export const MIDI_MAX = 127;
export const DEFAULT_MIDI_NOTE = 60 as MidiNote;

// Legacy compatibility
export const LEGACY_SCALE_OFFSET = 36;

// ============================================================================
// NOTE LABELS
// ============================================================================

export const NOTE_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// ============================================================================
// MUSICAL SCALES
// ============================================================================

export const SCALES: Record<ScaleName, ScaleIntervals> = {
  chromatic:      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major:          [0, 2, 4, 5, 7, 9, 11],
  minor:          [0, 2, 3, 5, 7, 8, 10],
  dorian:         [0, 2, 3, 5, 7, 9, 10],
  phrygian:       [0, 1, 3, 5, 7, 8, 10],
  lydian:         [0, 2, 4, 6, 7, 9, 11],
  mixolydian:     [0, 2, 4, 5, 7, 9, 10],
  locrian:        [0, 1, 3, 5, 6, 8, 10],
  pentatonic:     [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues:          [0, 3, 5, 6, 7, 10],
  wholeTone:      [0, 2, 4, 6, 8, 10],
  diminished:     [0, 2, 3, 5, 6, 8, 9, 11],
} as const;

// ============================================================================
// NODE COLORS
// ============================================================================

export const NODE_COLORS: Record<NodeType, string> = {
  source:        '#4caf50',  // Green
  speaker:       '#ff5722',  // Deep Orange
  pitch:         '#2196f3',  // Blue
  polariser:     '#9c27b0',  // Purple
  filter:        '#00bcd4',  // Cyan
  gate:          '#ffeb3b',  // Yellow
  delay:         '#795548',  // Brown
  gain:          '#607d8b',  // Blue Grey
  noise:         '#9e9e9e',  // Grey
  harmonic:      '#e91e63',  // Pink
  modulator:     '#673ab7',  // Deep Purple
  tunnel:        '#3f51b5',  // Indigo
  teleporter:    '#00e676',  // Green Accent
  quantizer:     '#ff9800',  // Orange
  lfo:           '#8bc34a',  // Light Green
  splitter:      '#64748b',  // Slate
  midi_out:      '#03a9f4',  // Light Blue
  midi_cc:       '#009688',  // Teal
  scene_trigger: '#f44336',  // Red
} as const;

// ============================================================================
// NODE ICONS (Unicode symbols)
// ============================================================================

export const NODE_ICONS: Record<NodeType, string> = {
  source:        '◉',
  speaker:       '🔊',
  pitch:         '♪',
  polariser:     '∿',
  filter:        '⋈',
  gate:          '⊡',
  delay:         '⏱',
  gain:          '◐',
  noise:         '≋',
  harmonic:      '∞',
  modulator:     '〰',
  tunnel:        '▣',
  teleporter:    '⚡',
  quantizer:     '⌗',
  lfo:           '∼',
  splitter:      '⋈',
  midi_out:      '♬',
  midi_cc:       '⚙',
  scene_trigger: '▶',
} as const;

// ============================================================================
// DEFAULT NODE PROPERTIES
// ============================================================================

export const DEFAULT_SOURCE_PROPS: SourceProps = {
  interval: 1,
  midiNote: 60 as MidiNote,
  noteIndex: -1,
  autoTrigger: true,
  intensity: 0.5,
};

export const DEFAULT_SPEAKER_PROPS: SpeakerProps = {
  volume: 1.0,
  reverb: 0,
  pan: 0,
  holdTime: 0,
  releaseTime: 0.1,
};

export const DEFAULT_PITCH_PROPS: PitchProps = {
  mode: 'shift',
  shift: 0,
  fixedMidiNote: 60 as MidiNote,
};

export const DEFAULT_POLARISER_PROPS: PolariserProps = {
  wave: 'sawtooth',
  attack: 0.01,
  decay: 0.4,
  mix: 1.0,
};

export const DEFAULT_FILTER_PROPS: FilterProps = {
  cutoff: 20000 as Frequency,
  attack: 0,
  decay: 0,
  mod: 0,
};

export const DEFAULT_GATE_PROPS: GateProps = {
  prob: 0.5,
};

export const DEFAULT_DELAY_PROPS: DelayProps = {
  delayTime: 1,
};

export const DEFAULT_GAIN_PROPS: GainProps = {
  value: 1.0,
  mass: 1.0,
};

export const DEFAULT_NOISE_PROPS: NoiseProps = {
  wave: 'white',
  attack: 0.01,
  decay: 0.2,
  mix: 0.2,
};

export const DEFAULT_HARMONIC_PROPS: HarmonicProps = {
  ratio: 2,
  wave: 'sine',
  attack: 0.01,
  decay: 0.4,
  mix: 0.5,
};

export const DEFAULT_MODULATOR_PROPS: ModulatorProps = {
  rate: 5 as Frequency,
  depth: 20,
  delay: 0.2,
};

export const DEFAULT_TUNNEL_PROPS: TunnelProps = {
  tunnelName: 'Custom',
  subNodes: [],
};

export const DEFAULT_TELEPORTER_PROPS: TeleporterProps = {
  channel: 'A',
  isEntry: true,
};

export const DEFAULT_QUANTIZER_PROPS: QuantizerProps = {
  strength: 1.0,
  useGlobalKey: true,
};

export const DEFAULT_LFO_PROPS: LfoProps = {
  rate: 1 as Frequency,
  shape: 'sine',
  min: 0,
  max: 1,
  phase: 0,
};

export const DEFAULT_SPLITTER_PROPS: SplitterProps = {
  entangled: false,  // When true, split packets share payload changes
};

export const DEFAULT_MIDI_OUT_PROPS: MidiOutProps = {
  channel: 1,
  duration: 200,
  velocityScale: 1.0,
};

export const DEFAULT_MIDI_CC_PROPS: MidiCcProps = {
  channel: 1,
  ccNumber: 74,
};

export const DEFAULT_SCENE_TRIGGER_PROPS: SceneTriggerProps = {
  targetSceneIndex: -1,
  behavior: 'jump',
};

// ============================================================================
// DEFAULT PROPS LOOKUP
// ============================================================================

type DefaultPropsMap = {
  source: SourceProps;
  speaker: SpeakerProps;
  pitch: PitchProps;
  polariser: PolariserProps;
  filter: FilterProps;
  gate: GateProps;
  delay: DelayProps;
  gain: GainProps;
  noise: NoiseProps;
  harmonic: HarmonicProps;
  modulator: ModulatorProps;
  tunnel: TunnelProps;
  teleporter: TeleporterProps;
  quantizer: QuantizerProps;
  lfo: LfoProps;
  splitter: SplitterProps;
  midi_out: MidiOutProps;
  midi_cc: MidiCcProps;
  scene_trigger: SceneTriggerProps;
};

const DEFAULT_PROPS_MAP: DefaultPropsMap = {
  source: DEFAULT_SOURCE_PROPS,
  speaker: DEFAULT_SPEAKER_PROPS,
  pitch: DEFAULT_PITCH_PROPS,
  polariser: DEFAULT_POLARISER_PROPS,
  filter: DEFAULT_FILTER_PROPS,
  gate: DEFAULT_GATE_PROPS,
  delay: DEFAULT_DELAY_PROPS,
  gain: DEFAULT_GAIN_PROPS,
  noise: DEFAULT_NOISE_PROPS,
  harmonic: DEFAULT_HARMONIC_PROPS,
  modulator: DEFAULT_MODULATOR_PROPS,
  tunnel: DEFAULT_TUNNEL_PROPS,
  teleporter: DEFAULT_TELEPORTER_PROPS,
  quantizer: DEFAULT_QUANTIZER_PROPS,
  lfo: DEFAULT_LFO_PROPS,
  splitter: DEFAULT_SPLITTER_PROPS,
  midi_out: DEFAULT_MIDI_OUT_PROPS,
  midi_cc: DEFAULT_MIDI_CC_PROPS,
  scene_trigger: DEFAULT_SCENE_TRIGGER_PROPS,
};

/**
 * Get default properties for a node type (type-safe)
 */
export function getDefaultProps<T extends NodeType>(type: T): DefaultPropsMap[T] {
  return { ...DEFAULT_PROPS_MAP[type] };
}

// ============================================================================
// TUNNEL TEMPLATES
// ============================================================================

export interface TunnelTemplate {
  readonly name: string;
  readonly nodes: readonly NodeType[];
  readonly defaults?: Record<string, unknown>;
}

export const TUNNEL_TEMPLATES: Record<string, TunnelTemplate> = {
  thick: {
    name: 'Thick',
    nodes: ['polariser', 'noise'],
    defaults: {},
  },
  dark: {
    name: 'Dark',
    nodes: ['filter', 'polariser'],
    defaults: {},
  },
  voice: {
    name: 'Voice',
    nodes: ['modulator', 'filter'],
    defaults: {},
  },
  shimmer: {
    name: 'Shimmer',
    nodes: ['harmonic', 'delay'],
    defaults: {},
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert MIDI note to frequency
 */
export function midiToFreq(midiNote: number): Frequency {
  return (MIDI_A4_FREQ * Math.pow(2, (midiNote - MIDI_A4) / 12)) as Frequency;
}

/**
 * Convert frequency to MIDI note
 */
export function freqToMidi(freq: Frequency): MidiNote {
  return Math.round(12 * Math.log2((freq as number) / MIDI_A4_FREQ) + MIDI_A4) as MidiNote;
}

/**
 * Get note name from MIDI (e.g., 60 -> "C4")
 */
export function midiToNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  const noteName = NOTE_LABELS[noteIndex];
  return `${noteName ?? '?'}${octave}`;
}

/**
 * Clamp MIDI note to valid range
 */
export function clampMidi(midiNote: number): MidiNote {
  return Math.max(MIDI_MIN, Math.min(MIDI_MAX, Math.round(midiNote))) as MidiNote;
}

/**
 * Calculate distance between two points
 */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
