// Phonon v2 - Core Type Definitions
// Strict TypeScript types for the graph engine

// ============================================================================
// IDENTIFIERS
// ============================================================================

/** Unique identifier type for type safety */
export type NodeId = string & { readonly __brand: 'NodeId' };
export type EdgeId = string & { readonly __brand: 'EdgeId' };
export type PacketId = string & { readonly __brand: 'PacketId' };
export type SceneId = string & { readonly __brand: 'SceneId' };

/** Generate a unique ID with type branding */
export function createNodeId(): NodeId {
  return crypto.randomUUID() as NodeId;
}

export function createEdgeId(): EdgeId {
  return crypto.randomUUID() as EdgeId;
}

export function createPacketId(): PacketId {
  return crypto.randomUUID() as PacketId;
}

export function createSceneId(): SceneId {
  return crypto.randomUUID() as SceneId;
}

// ============================================================================
// MUSICAL TYPES
// ============================================================================

/** MIDI note number (0-127) */
export type MidiNote = number & { readonly __brand: 'MidiNote' };

/** Frequency in Hz */
export type Frequency = number & { readonly __brand: 'Frequency' };

/** Time in seconds */
export type Seconds = number;

/** Beats per minute */
export type BPM = number;

/** Scale intervals from root */
export type ScaleIntervals = readonly number[];

/** Available scale types */
export type ScaleName = 
  | 'chromatic' | 'major' | 'minor' 
  | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian'
  | 'pentatonic' | 'minorPentatonic' | 'blues'
  | 'wholeTone' | 'diminished';

/** Pure oscillator waveforms */
export type OscillatorWave = 'sine' | 'square' | 'sawtooth' | 'triangle';

/** Noise types */
export type NoiseWave = 'white' | 'pink' | 'brown';

/** All audio wave types (oscillator + noise) */
export type WaveType = OscillatorWave | NoiseWave;

/** LFO shapes (oscillator + special modes) */
export type LfoShape = OscillatorWave | 'random' | 'noise';

// Legacy alias for backwards compatibility
export type WaveOrNoiseType = WaveType;
export type NoiseType = NoiseWave;

/** Oscillator blend mode: additive sums, ring multiplies, fm modulates next oscillator */
export type OscillatorMode = 'additive' | 'ring' | 'fm';

/** Filter type for biquad filter */
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

// ============================================================================
// NODE TYPES
// ============================================================================

/** All available node types */
export type NodeType = 
  | 'source'       // Generates packets
  | 'speaker'      // Audio output
  | 'pitch'        // Pitch shift/set
  | 'oscillator'   // Add wave layer (replaces polariser/noise/harmonic)
  | 'filter'       // Frequency filter
  | 'gate'         // Probability gate
  | 'delay'        // Time delay
  | 'gain'         // Volume/amplitude
  | 'modulator'    // Vibrato/modulation
  | 'tunnel'       // Compound node
  | 'teleporter'   // Instant transport
  | 'quantizer'    // Scale quantization
  | 'lfo'          // Low frequency oscillator
  | 'splitter'     // Split signal to multiple outputs
  | 'midi_out'     // MIDI output
  | 'midi_cc'      // MIDI CC
  | 'scene_trigger' // Scene change
  | 'mutator'      // Genetic drift / radiation mutations
  | 'crossover';   // Sexual reproduction - merge two packets

// ============================================================================
// NODE PROPERTIES
// ============================================================================

export interface SourceProps {
  readonly interval: number;       // Beats between triggers
  readonly midiNote: MidiNote;     // Base note
  readonly noteIndex: number;      // Legacy (-1 = random)
  readonly autoTrigger: boolean;   // Auto-emit packets
  readonly intensity: number;      // 0-1 velocity
}

export interface SpeakerProps {
  readonly volume: number;         // 0-1
  readonly reverb: number;         // 0-1 wet/dry
  readonly pan: number;            // -1 to 1
  readonly holdTime: Seconds;      // Sustain duration
  readonly releaseTime: Seconds;   // Release duration
}

export interface PitchProps {
  readonly mode: 'shift' | 'set';  // Relative or absolute
  readonly shift: number;          // Semitones (shift mode)
  readonly fixedMidiNote: MidiNote; // Target note (set mode)
}

// ============================================================================
// SHARED PROPERTY TYPES
// ============================================================================

/** Envelope for layered sounds */
export interface EnvelopedLayer {
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly mix: number;            // 0-1
}

/** Local key configuration (scale/root) */
export interface LocalKeyConfig {
  readonly useGlobalKey: boolean;
  readonly scale: ScaleName;
  readonly root: number;           // 0-11
}

// ============================================================================
// NODE PROPERTIES (continued)
// ============================================================================

/** Unified oscillator/noise/harmonic layer */
export interface OscillatorProps extends EnvelopedLayer {
  readonly wave: WaveType;         // Oscillator or noise type
  readonly ratio: number;          // Frequency multiplier (1.0 = fundamental)
  readonly mode: OscillatorMode;   // Blend mode: additive, ring, or fm
  readonly modulationIndex?: number; // FM depth (0-10), only used when mode = 'fm'
  readonly feedback?: number;      // Self-modulation (0-1), only used when mode = 'fm'
  readonly unison?: number;        // Number of detuned voices (1-8)
  readonly detune?: number;        // Detune spread in cents (0-100)
  readonly stereoSpread?: number;  // Stereo width for unison (0-1)
}

export interface FilterProps {
  readonly type: FilterType;       // Filter type: lowpass, highpass, bandpass, notch
  readonly cutoff: Frequency;      // Hz
  readonly resonance: number;      // Q factor (0-1 maps to 0.5-20)
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly mod: number;            // Modulation amount
}

/** Gate mode: probability = simple random, fitness = criteria-based selection */
export type GateMode = 'probability' | 'harmonic' | 'energy' | 'density' | 'all';

export interface GateProps extends LocalKeyConfig {
  readonly mode: GateMode;         // Gating mode
  readonly probability: number;    // 0-1 pass probability (probability mode)
  // Fitness mode properties
  readonly harmonicThreshold: number;    // 0-1, kill dissonant notes below this
  readonly energyThreshold: number;      // 0-1, minimum gain to survive
  readonly densityThreshold: number;     // Max packets allowed through per beat
}

export interface DelayProps {
  readonly delayTime: number;      // Beats
}

export interface GainProps {
  readonly value: number;          // Multiplier
  readonly mass: number;           // For gravity physics
}

export interface ModulatorProps {
  readonly rate: Frequency;        // Hz
  readonly depth: number;          // Cents
  readonly delay: Seconds;         // Onset delay
}

export interface TunnelProps {
  readonly tunnelName: string;
  readonly subNodes: readonly SubNode[];
}

export interface TeleporterProps {
  readonly channel: string;        // A-Z
  readonly isEntry: boolean;       // Entry or exit point
}

export interface QuantizerProps extends LocalKeyConfig {
  readonly strength: number;       // 0-1
  readonly mode: 'nearest' | 'random';
  readonly weights: Record<number, number>; // index -> weight (0-1)
  readonly defaultPitch: number;   // Octave (e.g. 4)
}

export interface LfoProps {
  readonly rate: Frequency;        // Hz
  readonly shape: LfoShape;        // Includes 'random' and 'noise' for LFO
  readonly min: number;
  readonly max: number;
  readonly phase: number;          // 0-1
}

export interface MidiOutProps {
  readonly channel: number;        // 1-16
  readonly duration: number;       // ms
  readonly velocityScale: number;  // multiplier
}

export interface MidiCcProps {
  readonly channel: number;        // 1-16
  readonly ccNumber: number;       // 0-127
}

export interface SceneTriggerProps {
  readonly targetSceneIndex: number;
  readonly behavior: 'jump' | 'crossfade';
}

export interface SplitterProps {
  readonly entangled: boolean;  // Entangled packets share payload changes
  readonly behavior: 'broadcast' | 'random' | 'weighted'; // Routing behavior
}

// ============================================================================
// EVOLUTIONARY NODE PROPERTIES
// ============================================================================

/** Mutator mode: drift = small changes, radiation = large changes */
export type MutatorMode = 'drift' | 'radiation';

/** Properties a mutator can affect */
export type MutatableProperty = 'pitch' | 'gain' | 'cutoff' | 'wave' | 'timbre';

export interface MutatorProps {
  readonly mode: MutatorMode;
  readonly probability: number;           // 0-1, chance of mutation per packet
  readonly pitchDrift: number;           // Max semitone drift (drift mode)
  readonly pitchRadiation: number;       // Max semitone jump (radiation mode)
  readonly gainDrift: number;            // Max gain change (drift mode)
  readonly cutoffDrift: number;          // Max cutoff change ratio (drift mode)
  readonly waveChange: boolean;          // Allow wave type changes (radiation)
  readonly targets: readonly MutatableProperty[];  // Which properties to mutate
}

/** Inheritance mode for crossover */
export type CrossoverInheritance = 'random' | 'dominant_a' | 'dominant_b' | 'blend';

export interface CrossoverProps {
  readonly inheritance: CrossoverInheritance;
  readonly pitchFrom: 'a' | 'b' | 'average' | 'random';  // Which parent provides pitch
  readonly waveFrom: 'a' | 'b' | 'random';               // Which parent provides wave
  readonly gainMode: 'average' | 'max' | 'min' | 'random'; // How to combine gains
  readonly timeout: number;              // Beats to wait for second parent before passing first
}



/** Union type for all node properties */
export type NodeProps = 
  | { readonly type: 'source'; readonly props: SourceProps }
  | { readonly type: 'speaker'; readonly props: SpeakerProps }
  | { readonly type: 'pitch'; readonly props: PitchProps }
  | { readonly type: 'oscillator'; readonly props: OscillatorProps }
  | { readonly type: 'filter'; readonly props: FilterProps }
  | { readonly type: 'gate'; readonly props: GateProps }
  | { readonly type: 'delay'; readonly props: DelayProps }
  | { readonly type: 'gain'; readonly props: GainProps }
  | { readonly type: 'modulator'; readonly props: ModulatorProps }
  | { readonly type: 'tunnel'; readonly props: TunnelProps }
  | { readonly type: 'teleporter'; readonly props: TeleporterProps }
  | { readonly type: 'quantizer'; readonly props: QuantizerProps }
  | { readonly type: 'lfo'; readonly props: LfoProps }
  | { readonly type: 'midi_out'; readonly props: MidiOutProps }
  | { readonly type: 'midi_cc'; readonly props: MidiCcProps }
  | { readonly type: 'scene_trigger'; readonly props: SceneTriggerProps }
  | { readonly type: 'splitter'; readonly props: SplitterProps }
  | { readonly type: 'mutator'; readonly props: MutatorProps }
  | { readonly type: 'crossover'; readonly props: CrossoverProps };

/** Get props type for a specific node type */
export type PropsForNodeType<T extends NodeType> = 
  Extract<NodeProps, { type: T }>['props'];

// ============================================================================
// NODE & GRAPH STRUCTURES
// ============================================================================

/** Sub-node within a tunnel */
export interface SubNode {
  readonly type: Exclude<NodeType, 'tunnel'>;
  readonly props: Record<string, unknown>;
}

/** Held packet data for delay nodes */
export interface HeldPacket {
  payload: AudioPayload;
  releaseTime: number;
}

/** Base node structure */
export interface GraphNode<T extends NodeType = NodeType> {
  readonly id: NodeId;
  readonly type: T;
  x: number;
  y: number;
  props: PropsForNodeType<T>;
  
  // Runtime state (mutable for performance)
  timer: number;
  lastTrigger: number;
  flash: number;
  heldPackets: HeldPacket[];
}

/** Edge between nodes */
export interface GraphEdge {
  readonly id: EdgeId;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly timingMode: 'physical' | 'fixed';
  readonly durationBeats: number | null;
  readonly targetParam: string | null;  // null = audio, string = CV
  readonly weight?: number;             // Probability weight for Markov chains
}

// ============================================================================
// PACKET & PAYLOAD
// ============================================================================

/** Audio payload carried by packets */
export interface AudioPayload {
  freq: Frequency;
  midiNote: MidiNote;
  wave: WaveOrNoiseType;
  timbre: number;           // 0-1 filter resonance (legacy)
  cutoff: Frequency;
  filterType?: FilterType;  // Filter type: lowpass, highpass, bandpass, notch
  filterResonance?: number; // Q factor (0.5-20)
  gain: number;             // 0-1
  holdTime: Seconds;
  releaseTime: Seconds;
  
  // Optional modulation
  vibratoRate?: Frequency;
  vibratoDepth?: number;    // Cents
  vibratoDelay?: Seconds;
  
  // LFO modulation value for CV routing
  modulationValue?: number;
  
  // Layer information for complex sounds
  waves?: readonly WaveLayer[];
  
  // Filter envelope
  filterEnv?: {
    readonly attack: Seconds;
    readonly decay: Seconds;
    readonly mod: number;
  };
}

/** Wave layer for multi-oscillator sounds */
export interface WaveLayer {
  readonly wave: WaveOrNoiseType;
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly gain: number;
  readonly ratio?: number;  // Harmonic ratio
  readonly mode?: OscillatorMode;  // Blend mode: additive, ring, or fm
  readonly modulationIndex?: number;  // FM depth (0-10)
  readonly feedback?: number;  // Self-modulation (0-1)
  readonly unison?: number;  // Number of detuned voices (1-8)
  readonly detune?: number;  // Detune spread in cents
  readonly stereoSpread?: number;  // Stereo width for unison (0-1)
}

/** Packet traveling along edges */
export interface Packet {
  readonly id: PacketId;
  readonly edgeId: EdgeId;
  t: number;                // 0-1 progress along edge
  payload: AudioPayload;
  entanglementGroupId?: string;  // Entangled packets share payload changes
  
  // Anti-explosion mechanisms
  hopCount?: number;        // Number of nodes visited (TTL)
  visitedEdges?: string[];  // Edge IDs visited (loop detection)
  birthTime?: number;       // Creation timestamp for age-based expiry
}

// ============================================================================
// VISUALIZATION TYPES
// ============================================================================

/** Available visualization modes */
export type VizMode = 
  | 'editor'        // Default graph editor (no viz)
  | 'abstract'      // Organic flowing shapes
  | 'geometric'     // Crystalline angular patterns
  | 'particles'     // Particle explosions and flows
  | 'waves'         // Interference patterns
  | 'spectral'      // Frequency spectrum
  | 'kaleidoscope'; // Symmetric reflections

/** Color palette for visualization */
export interface ColorPalette {
  readonly name: string;
  readonly colors: readonly string[];  // Array of hex colors
  readonly background: string;
}

/** Base configuration for all viz modes */
export interface VizConfigBase {
  readonly colorPalette: ColorPalette;
  readonly intensity: number;         // 0-1 global intensity
  readonly trailLength: number;       // 0-1 trail/fade duration
  readonly reactivity: number;        // 0-1 how reactive to music
  readonly backgroundOpacity: number; // 0-1 background fade
}

/** Abstract mode specific config */
export interface AbstractVizConfig extends VizConfigBase {
  readonly flowSpeed: number;
  readonly organicness: number;       // 0-1 organic vs angular
  readonly blobCount: number;
}

/** Geometric mode specific config */
export interface GeometricVizConfig extends VizConfigBase {
  readonly symmetry: number;          // 2-12 fold symmetry
  readonly lineWeight: number;
  readonly fillMode: 'outline' | 'solid' | 'gradient';
}

/** Particles mode specific config */
export interface ParticlesVizConfig extends VizConfigBase {
  readonly particleCount: number;
  readonly particleSize: number;
  readonly gravity: number;
  readonly emitOnBeat: boolean;
}

/** Waves mode specific config */
export interface WavesVizConfig extends VizConfigBase {
  readonly waveCount: number;
  readonly amplitude: number;
  readonly interference: boolean;
}

/** Spectral mode specific config */
export interface SpectralVizConfig extends VizConfigBase {
  readonly barCount: number;
  readonly mirrorMode: boolean;
  readonly circularLayout: boolean;
}

/** Kaleidoscope mode specific config */
export interface KaleidoscopeVizConfig extends VizConfigBase {
  readonly segments: number;          // 4-16
  readonly rotation: number;
  readonly zoom: number;
}

/** Union of all viz configs */
export type VizConfig = 
  | ({ readonly mode: 'abstract' } & AbstractVizConfig)
  | ({ readonly mode: 'geometric' } & GeometricVizConfig)
  | ({ readonly mode: 'particles' } & ParticlesVizConfig)
  | ({ readonly mode: 'waves' } & WavesVizConfig)
  | ({ readonly mode: 'spectral' } & SpectralVizConfig)
  | ({ readonly mode: 'kaleidoscope' } & KaleidoscopeVizConfig);

/** Visual transition types */
export type VizTransitionType = 'cut' | 'crossfade' | 'morph';

/** Visual transition between scenes */
export interface VizTransition {
  readonly type: VizTransitionType;
  readonly durationBeats: number;
}

/** Extracted packet data for visualization */
export interface VizPacketData {
  readonly id: PacketId;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly frequency: Frequency;
  readonly midiNote: MidiNote;
  readonly intensity: number;
  readonly waveType: WaveOrNoiseType;
  readonly hue: number;
}

/** Extracted node data for visualization */
export interface VizNodeData {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly x: number;
  readonly y: number;
  readonly flash: number;
  readonly connectionCount: number;
}

/** Extracted edge data for visualization (used in editor mode export) */
export interface VizEdgeData {
  readonly id: EdgeId;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
}

/** Active note data for visualization */
export interface VizNoteData {
  readonly frequency: Frequency;
  readonly gain: number;
  readonly pan: number;
  readonly envelope: number;
  readonly waveType: WaveOrNoiseType;
}

/** Extracted musical data for visualization */
export interface VizMusicalData {
  readonly beat: number;
  readonly bpm: number;
  readonly beatPhase: number;
  readonly barPhase: number;
  readonly packets: VizPacketData[];
  readonly nodes: VizNodeData[];
  readonly activeNotes: VizNoteData[];
  readonly averageFrequency: number;
  readonly averageIntensity: number;
  readonly packetDensity: number;
}

/** Global viz display state */
export interface VizDisplayState {
  readonly isVizMode: boolean;        // true = viz, false = editor
  readonly previewMode: boolean;      // Preview without committing
}

// ============================================================================
// VIDEO EXPORT TYPES
// ============================================================================

/** Video resolution presets */
export interface VideoResolution {
  readonly width: number;
  readonly height: number;
  readonly name: string;
}

export const VIDEO_RESOLUTIONS: readonly VideoResolution[] = [
  { width: 1280, height: 720, name: '720p' },
  { width: 1920, height: 1080, name: '1080p' },
  { width: 2560, height: 1440, name: '1440p' },
  { width: 3840, height: 2160, name: '4K' },
] as const;

/** Video export configuration */
export interface VideoExportConfig {
  readonly resolution: VideoResolution;
  readonly frameRate: 30 | 60;
  readonly quality: number;           // 0-1 quality level
  readonly includeAudio: boolean;
  readonly vizMode: VizMode;
  readonly vizConfig: VizConfig | null;
}

/** Video export progress state */
export interface VideoExportProgress {
  readonly state: 'idle' | 'compiling' | 'rendering' | 'encoding' | 'muxing' | 'complete' | 'error';
  readonly currentFrame: number;
  readonly totalFrames: number;
  readonly currentPhase: string;
  readonly elapsedTime: number;
  readonly estimatedTimeRemaining: number;
  readonly error?: string;
}

/** Frame data for video export (packet/node state at a specific time) */
export interface VideoFrameData {
  readonly time: number;              // Time in seconds
  readonly beat: number;
  readonly beatPhase: number;
  readonly barPhase: number;
  readonly packets: VizPacketData[];
  readonly nodes: VizNodeData[];
  readonly edges?: VizEdgeData[];     // Edge data for editor mode export
  readonly activeNotes: VizNoteData[];
  readonly averageFrequency: number;
  readonly averageIntensity: number;
  readonly packetDensity: number;
  // Scene-specific data for arrangement export
  readonly sceneId?: SceneId;         // Which scene this frame belongs to
  readonly vizMode?: VizMode;         // Viz mode for this frame's scene
  readonly vizConfig?: VizConfig;     // Full viz config for this frame's scene
}

// ============================================================================
// SCENE & PROJECT
// ============================================================================

/** Playback mode for the composition */
export type PlaybackMode = 'arrangement' | 'jam';

/** Scene transition types */
export type SceneTransitionType = 'cut' | 'crossfade' | 'fade';

/** Quantization options for scene triggering in Jam mode */
export type SceneQuantize = 'immediate' | 'beat' | 'bar' | 'phrase';

/** Transition between scenes */
export interface SceneTransition {
  readonly type: SceneTransitionType;
  readonly durationBeats: number;  // 0 for 'cut'
}

/** How a scene is triggered in Jam mode */
export interface SceneTriggerConfig {
  readonly midiNote: number | null;  // MIDI note to trigger (null = none)
  readonly midiChannel: number;      // 1-16
  readonly quantize: SceneQuantize;
  readonly phraseLength: number;     // Beats per phrase (default: 4)
}

/** Scene definition - a self-contained musical unit */
export interface Scene {
  readonly id: SceneId;
  
  // Metadata
  name: string;
  color: string;                     // For UI visualization
  
  // Graph content (snapshot)
  nodes: GraphNode[];
  edges: GraphEdge[];
  annotations: Annotation[];
  regions: Region[];
  
  // Timing (enforced in Arrangement mode, informational in Jam mode)
  durationBeats: number;             // Suggested/enforced length
  loopCount: number;                 // How many times to repeat (1 = play once)
  
  // Musical overrides (null = inherit from composition)
  localBpm: number | null;
  localRoot: number | null;          // 0-11
  localScale: ScaleName | null;
  
  // Transitions (used in Arrangement mode)
  enterTransition: SceneTransition;
  exitTransition: SceneTransition;
  
  // Jam mode settings
  jamTrigger: SceneTriggerConfig;
  
  // Visualization settings
  vizMode: VizMode;                  // 'editor' = default graph view
  vizConfig: VizConfig | null;       // null when vizMode is 'editor'
  vizTransition: VizTransition;      // Visual transition settings
}

/** Arrangement slot - a scene placed in the timeline */
export interface ArrangementSlot {
  readonly id: string;
  sceneId: SceneId;
  startBeat: number;                 // Absolute position in arrangement
  channel: number;                   // Track/channel index (0-based)
  instanceLoopCount?: number;        // Override scene's default loop count
  instanceBpm?: number;              // Override BPM for this instance
}

/** Channel/track in the arrangement */
export interface ArrangementChannel {
  readonly id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;                    // 0-1 multiplier
}

/** Playback state for a single channel */
export interface ChannelPlaybackState {
  channelIndex: number;
  currentSlotId: string | null;
  sceneBeat: number;
  sceneLoopIteration: number;
  isTransitioning: boolean;
  transitionProgress: number;
}

/** Playback state for scene system */
export interface ScenePlaybackState {
  mode: PlaybackMode;
  
  // Arrangement mode state
  arrangementBeat: number;           // Global position in arrangement
  currentSlotIndex: number;          // Legacy: for single-track compatibility
  
  // Multi-channel state
  activeChannels: ChannelPlaybackState[];  // State per active channel
  
  // Jam mode state
  currentSceneId: SceneId | null;
  sceneBeat: number;                 // Beat within current scene
  sceneLoopIteration: number;        // Which loop (0-indexed)
  queuedSceneId: SceneId | null;     // Next scene to play in Jam mode
  queueTrigger: SceneQuantize;
  
  // Transition state
  isTransitioning: boolean;
  transitionProgress: number;        // 0-1
  previousSceneId: SceneId | null;
  
  // Effective settings (computed)
  effectiveBpm: number;
  effectiveRoot: number;
  effectiveScale: ScaleName;
}

/** Project metadata */
export interface ProjectMeta {
  readonly name: string;
  readonly author: string;
  readonly created: number;
  readonly modified: number;
  readonly version: string;
  readonly rootNote: number;  // 0-11
  readonly scale: ScaleName;
  readonly gravity: number;
  readonly midiOutputId: string | null;
  readonly midiClock: boolean;
}

/** Musical context */
export interface MusicalContext {
  readonly root: number;           // 0-11 (C=0)
  readonly scale: ScaleIntervals;
  readonly scaleName: ScaleName;
}

/** Universal constants (global settings) */
export interface GlobalSettings {
  readonly subdivisions: number;
  readonly pixelsPerBeat: number;
  readonly gravityConstant: number;
  readonly defaultEdgeBehaviour: 'physical' | 'fixed';
  readonly uiScale: number;  // UI scale percentage (100 = 100%)
  readonly leftPanelWidth: number;
  readonly rightPanelWidth: number;
  readonly bottomPanelHeight: number;
}

// ============================================================================
// ANNOTATION & REGION TYPES
// ============================================================================

/** Unique identifier types */
export type AnnotationId = string & { readonly __brand: 'AnnotationId' };
export type RegionId = string & { readonly __brand: 'RegionId' };

export function createAnnotationId(): AnnotationId {
  return crypto.randomUUID() as AnnotationId;
}

export function createRegionId(): RegionId {
  return crypto.randomUUID() as RegionId;
}

/** Text annotation on canvas */
export interface Annotation {
  readonly id: AnnotationId;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

/** Region grouping nodes */
export interface Region {
  readonly id: RegionId;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  description: string;
  color: string;
}

// ============================================================================
// SELECTION STATE
// ============================================================================

export type Tool = 
  | 'source' | 'speaker' | 'pitch' | 'oscillator' | 'filter' 
  | 'gate' | 'delay' | 'gain' | 'modulator' | 'tunnel' 
  | 'teleporter' | 'quantizer' | 'lfo' | 'splitter' 
  | 'midi_out' | 'midi_cc' | 'scene_trigger' | 'mutator' | 'crossover'
  | 'select' | 'pan' | 'link' | 'region' | 'annotation';

export interface SelectionState {
  selectedNodeIds: readonly NodeId[];
  selectedEdgeId: EdgeId | null;
  selectedAnnotationId: AnnotationId | null;
  selectedRegionId: RegionId | null;
  hoveredNodeId: NodeId | null;
  hoveredAnnotationId: AnnotationId | null;
  hoveredRegionId: RegionId | null;
  hoveredRegionHandle: string | null;  // 'nw', 'ne', 'sw', 'se'
  isHoveringHandle: boolean;  // Edge creation handle
  draggingNodeId: NodeId | null;
  draggingAnnotationId: AnnotationId | null;
  draggingRegionId: RegionId | null;
  resizingRegionId: RegionId | null;
  linkingFromId: NodeId | null;
  isBoxSelecting: boolean;
  boxSelectStart: { x: number; y: number } | null;
  boxSelectEnd: { x: number; y: number } | null;
}

// ============================================================================
// VIEWPORT STATE
// ============================================================================

export interface ViewportState {
  panOffset: { x: number; y: number };
  zoomLevel: number;
  isPanning: boolean;
}

export interface MouseState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  isDown: boolean;
}
