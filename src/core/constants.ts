// Stochastic v2 - Constants
// All configuration values and lookup tables

import type { 
  MidiNote, Frequency, ScaleName, ScaleIntervals,
  SourceProps, SpeakerProps, PitchProps, OscillatorProps,
  FilterProps, GateProps, DelayProps, GainProps,
  ModulatorProps, TunnelProps, TeleporterProps,
  QuantizerProps, LfoProps, SplitterProps, MidiOutProps, MidiCcProps, SceneTriggerProps,
  MutatorProps, CrossoverProps,
  NodeType, Scene, SceneId, SceneTransition, SceneTriggerConfig, ScenePlaybackState, ArrangementSlot,
  GraphNode
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
// ANTI-EXPLOSION CONSTANTS
// ============================================================================

/** Maximum number of nodes a packet can visit before expiring (TTL) */
export const MAX_PACKET_HOPS = 64;

/** Maximum times a packet can visit the same edge (loop detection) */
export const MAX_EDGE_VISITS = 4;

/** Maximum packet age in milliseconds before forced expiry */
export const MAX_PACKET_AGE_MS = 30000; // 30 seconds

/** Cooldown period per edge to limit spawn rate (ms) */
export const EDGE_SPAWN_COOLDOWN_MS = 10; // Minimum 10ms between spawns on same edge

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
  oscillator:    '#9c27b0',  // Purple (was polariser)
  filter:        '#00bcd4',  // Cyan
  gate:          '#ffeb3b',  // Yellow
  delay:         '#795548',  // Brown
  gain:          '#607d8b',  // Blue Grey
  modulator:     '#673ab7',  // Deep Purple
  tunnel:        '#3f51b5',  // Indigo
  teleporter:    '#00e676',  // Green Accent
  quantizer:     '#ff9800',  // Orange
  lfo:           '#8bc34a',  // Light Green
  splitter:      '#64748b',  // Slate
  midi_out:      '#03a9f4',  // Light Blue
  midi_cc:       '#009688',  // Teal
  scene_trigger: '#f44336',  // Red
  mutator:       '#ff6f00',  // Amber Dark - Evolution/mutation
  crossover:     '#d500f9',  // Purple Accent - DNA mixing
} as const;

// ============================================================================
// NODE ICONS (Unicode symbols)
// ============================================================================

export const NODE_ICONS: Record<NodeType, string> = {
  source:        '💥',
  speaker:       '🔊',
  pitch:         '♪',
  oscillator:    '∿',  // Wave symbol (was polariser)
  filter:        '▼',
  gate:          '⊡',
  delay:         '⏱',
  gain:          '◐',
  modulator:     '〰',
  tunnel:        '▣',
  teleporter:    '◉',
  quantizer:     '⌗',
  lfo:           '∼',
  splitter:      '⋈',
  midi_out:      '♬',
  midi_cc:       '⚙',
  scene_trigger: '▶',
  mutator:       '🧬',  // DNA strand
  crossover:     '⚤',   // Male/Female symbol (reproduction)
} as const;

// ============================================================================
// DEFAULT NODE PROPERTIES
// ============================================================================

export const DEFAULT_SOURCE_PROPS: SourceProps = {
  interval: 1,
  midiNote: 60 as MidiNote,
  noteIndex: -1,
  autoTrigger: true,
  intensity: 1,
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

export const DEFAULT_OSCILLATOR_PROPS: OscillatorProps = {
  wave: 'sawtooth',
  ratio: 1.0,              // Fundamental frequency
  attack: 0.01,
  decay: 0.4,
  mix: 1.0,
  mode: 'additive',        // Default: sum with other layers
  modulationIndex: 2,      // FM depth (only used when mode = 'fm')
  feedback: 0,             // Self-modulation (only used when mode = 'fm')
  unison: 1,               // Single voice by default
  detune: 0,               // No detune by default
  stereoSpread: 0.5,       // Medium stereo spread for unison
};

export const DEFAULT_FILTER_PROPS: FilterProps = {
  type: 'lowpass',
  cutoff: 20000 as Frequency,
  resonance: 0.0,          // No resonance by default (Q = 0.707)
  attack: 0,
  decay: 0,
  mod: 0,
};

export const DEFAULT_GATE_PROPS: GateProps = {
  mode: 'probability',
  probability: 0.5,
  // Fitness mode properties
  harmonicThreshold: 0.9,  // > 5/6 so harmonic mode actually filters (see MUSICAL_MODEL.md)  // 50% consonance required
  energyThreshold: 0.1,    // Min 10% gain to survive
  densityThreshold: 8,     // Max 8 packets per beat
  useGlobalKey: true,
  scale: 'major',
  root: 0,
};

export const DEFAULT_DELAY_PROPS: DelayProps = {
  delayTime: 1,
};

export const DEFAULT_GAIN_PROPS: GainProps = {
  value: 1.0,
  mass: 1.0,
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
  scale: 'major',
  root: 0,
  mode: 'nearest',
  weights: {},
  defaultPitch: 4,
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
  behavior: 'broadcast',
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
// EVOLUTIONARY NODE DEFAULTS
// ============================================================================

export const DEFAULT_MUTATOR_PROPS: MutatorProps = {
  mode: 'drift',
  probability: 0.5,
  pitchDrift: 2,           // +/- 2 semitones
  pitchRadiation: 12,      // +/- 1 octave
  gainDrift: 0.1,          // +/- 10%
  cutoffDrift: 0.2,        // +/- 20%
  waveChange: false,
  targets: ['pitch'],
};

export const DEFAULT_CROSSOVER_PROPS: CrossoverProps = {
  inheritance: 'random',
  pitchFrom: 'random',
  waveFrom: 'random',
  gainMode: 'average',
  timeout: 4,              // Wait 4 beats for second parent
};

// ============================================================================
// DEFAULT PROPS LOOKUP
// ============================================================================

type DefaultPropsMap = {
  source: SourceProps;
  speaker: SpeakerProps;
  pitch: PitchProps;
  oscillator: OscillatorProps;
  filter: FilterProps;
  gate: GateProps;
  delay: DelayProps;
  gain: GainProps;
  modulator: ModulatorProps;
  tunnel: TunnelProps;
  teleporter: TeleporterProps;
  quantizer: QuantizerProps;
  lfo: LfoProps;
  splitter: SplitterProps;
  midi_out: MidiOutProps;
  midi_cc: MidiCcProps;
  scene_trigger: SceneTriggerProps;
  mutator: MutatorProps;
  crossover: CrossoverProps;
};

const DEFAULT_PROPS_MAP: DefaultPropsMap = {
  source: DEFAULT_SOURCE_PROPS,
  speaker: DEFAULT_SPEAKER_PROPS,
  pitch: DEFAULT_PITCH_PROPS,
  oscillator: DEFAULT_OSCILLATOR_PROPS,
  filter: DEFAULT_FILTER_PROPS,
  gate: DEFAULT_GATE_PROPS,
  delay: DEFAULT_DELAY_PROPS,
  gain: DEFAULT_GAIN_PROPS,
  modulator: DEFAULT_MODULATOR_PROPS,
  tunnel: DEFAULT_TUNNEL_PROPS,
  teleporter: DEFAULT_TELEPORTER_PROPS,
  quantizer: DEFAULT_QUANTIZER_PROPS,
  lfo: DEFAULT_LFO_PROPS,
  splitter: DEFAULT_SPLITTER_PROPS,
  midi_out: DEFAULT_MIDI_OUT_PROPS,
  midi_cc: DEFAULT_MIDI_CC_PROPS,
  scene_trigger: DEFAULT_SCENE_TRIGGER_PROPS,
  mutator: DEFAULT_MUTATOR_PROPS,
  crossover: DEFAULT_CROSSOVER_PROPS,
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
    nodes: ['oscillator', 'oscillator'],  // Two oscillators for thick sound
    defaults: {},
  },
  dark: {
    name: 'Dark',
    nodes: ['filter', 'oscillator'],
    defaults: {},
  },
  voice: {
    name: 'Voice',
    nodes: ['modulator', 'filter'],
    defaults: {},
  },
  shimmer: {
    name: 'Shimmer',
    nodes: ['oscillator', 'delay'],  // Harmonic + delay
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

/**
 * Get the effective radius for a node (accounts for tunnel width)
 * Used for edge handle positioning and hit detection
 */
export function getNodeEffectiveRadius(node: GraphNode): number {
  if (node.type === 'tunnel') {
    const props = node.props as TunnelProps;
    const subNodes = props.subNodes || [];
    const subNodeCount = subNodes.length;
    const minWidth = 60;
    const subNodeSpacing = 18;
    const capsuleWidth = Math.max(minWidth, subNodeCount * subNodeSpacing + 30);
    return capsuleWidth / 2;
  }
  return NODE_RADIUS;
}

// ============================================================================
// SCENE SYSTEM CONSTANTS
// ============================================================================

/** Scene colors palette for new scenes */
export const SCENE_COLORS = [
  '#4CAF50',  // Green
  '#2196F3',  // Blue
  '#FF9800',  // Orange
  '#9C27B0',  // Purple
  '#F44336',  // Red
  '#00BCD4',  // Cyan
  '#FFEB3B',  // Yellow
  '#E91E63',  // Pink
  '#607D8B',  // Blue Grey
  '#795548',  // Brown
] as const;

/** Default scene transition */
export const DEFAULT_SCENE_TRANSITION: SceneTransition = {
  type: 'crossfade',
  durationBeats: 2,
};

/** Default scene trigger config for Jam mode */
export const DEFAULT_SCENE_JAM_TRIGGER: SceneTriggerConfig = {
  midiNote: null,
  midiChannel: 1,
  quantize: 'bar',
  phraseLength: 4,
};

/** Default scene duration in beats */
export const DEFAULT_SCENE_DURATION = 16;

/** Default scene loop count */
export const DEFAULT_SCENE_LOOP_COUNT = 1;

/** Initial playback state */
export const INITIAL_SCENE_PLAYBACK_STATE: ScenePlaybackState = {
  mode: 'jam',
  arrangementBeat: 0,
  currentSlotIndex: 0,
  activeChannels: [],
  currentSceneId: null,
  sceneBeat: 0,
  sceneLoopIteration: 0,
  queuedSceneId: null,
  queueTrigger: 'bar',
  isTransitioning: false,
  transitionProgress: 0,
  previousSceneId: null,
  effectiveBpm: DEFAULT_SPEED,
  effectiveRoot: 0,
  effectiveScale: 'major',  // must match the musicalContext default
};

/**
 * Create a new empty scene with defaults
 */
export function createDefaultScene(
  id: string, 
  name: string, 
  colorIndex: number = 0
): Scene {
  const color = SCENE_COLORS[colorIndex % SCENE_COLORS.length] ?? SCENE_COLORS[0];
  return {
    id: id as SceneId,  // Brand string as SceneId
    name,
    color,
    nodes: [],
    edges: [],
    annotations: [],
    regions: [],
    durationBeats: DEFAULT_SCENE_DURATION,
    loopCount: DEFAULT_SCENE_LOOP_COUNT,
    localBpm: null,
    localRoot: null,
    localScale: null,
    enterTransition: { ...DEFAULT_SCENE_TRANSITION },
    exitTransition: { ...DEFAULT_SCENE_TRANSITION },
    jamTrigger: { ...DEFAULT_SCENE_JAM_TRIGGER },
    // Visualization settings
    vizMode: 'editor',
    vizConfig: null,
    vizTransition: { type: 'crossfade', durationBeats: 1 },
  };
}

/**
 * Calculate effective BPM for a scene (with inheritance)
 */
export function getEffectiveBpm(scene: Scene | null, masterBpm: number): number {
  return scene?.localBpm ?? masterBpm;
}

/**
 * Calculate effective root note for a scene (with inheritance)
 */
export function getEffectiveRoot(scene: Scene | null, masterRoot: number): number {
  return scene?.localRoot ?? masterRoot;
}

/**
 * Calculate effective scale for a scene (with inheritance)
 */
export function getEffectiveScale(scene: Scene | null, masterScale: ScaleName): ScaleName {
  return scene?.localScale ?? masterScale;
}

/**
 * Calculate total duration of an arrangement in beats
 */
export function calculateArrangementDuration(
  arrangement: ArrangementSlot[],
  scenes: Map<string, Scene>
): number {
  if (arrangement.length === 0) return 0;
  
  let maxEnd = 0;
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (scene) {
      const loopCount = slot.instanceLoopCount ?? scene.loopCount;
      const duration = scene.durationBeats * loopCount;
      const end = slot.startBeat + duration;
      if (end > maxEnd) maxEnd = end;
    }
  }
  return maxEnd;
}
