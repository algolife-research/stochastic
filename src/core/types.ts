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

/** Oscillator wave types */
export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';

/** Noise types */
export type NoiseType = 'white' | 'pink' | 'brown';

/** All wave types including noise */
export type WaveOrNoiseType = WaveType | NoiseType;

// ============================================================================
// NODE TYPES
// ============================================================================

/** All available node types */
export type NodeType = 
  | 'source'       // Generates packets
  | 'speaker'      // Audio output
  | 'pitch'        // Pitch shift/set
  | 'polariser'    // Wave shaping
  | 'filter'       // Frequency filter
  | 'gate'         // Probability gate
  | 'delay'        // Time delay
  | 'gain'         // Volume/amplitude
  | 'noise'        // Noise generator
  | 'harmonic'     // Harmonic overtone
  | 'modulator'    // Vibrato/modulation
  | 'tunnel'       // Compound node
  | 'teleporter'   // Instant transport
  | 'quantizer'    // Scale quantization
  | 'lfo'          // Low frequency oscillator
  | 'splitter'     // Split signal to multiple outputs
  | 'midi_out'     // MIDI output
  | 'midi_cc'      // MIDI CC
  | 'scene_trigger'; // Scene change

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

export interface PolariserProps {
  readonly wave: WaveType;
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly mix: number;            // 0-1
}

export interface FilterProps {
  readonly cutoff: Frequency;      // Hz
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly mod: number;            // Modulation amount
}

export interface GateProps {
  readonly prob: number;           // 0-1 pass probability
}

export interface DelayProps {
  readonly delayTime: number;      // Beats
}

export interface GainProps {
  readonly value: number;          // Multiplier
  readonly mass: number;           // For gravity physics
}

export interface NoiseProps {
  readonly wave: NoiseType;
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly mix: number;            // 0-1
}

export interface HarmonicProps {
  readonly ratio: number;          // Frequency multiplier
  readonly wave: WaveType;
  readonly attack: Seconds;
  readonly decay: Seconds;
  readonly mix: number;            // 0-1
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

export interface QuantizerProps {
  readonly strength: number;       // 0-1
  readonly useGlobalKey: boolean;
}

export interface LfoProps {
  readonly rate: Frequency;        // Hz
  readonly shape: WaveType;
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
}

/** Union type for all node properties */
export type NodeProps = 
  | { readonly type: 'source'; readonly props: SourceProps }
  | { readonly type: 'speaker'; readonly props: SpeakerProps }
  | { readonly type: 'pitch'; readonly props: PitchProps }
  | { readonly type: 'polariser'; readonly props: PolariserProps }
  | { readonly type: 'filter'; readonly props: FilterProps }
  | { readonly type: 'gate'; readonly props: GateProps }
  | { readonly type: 'delay'; readonly props: DelayProps }
  | { readonly type: 'gain'; readonly props: GainProps }
  | { readonly type: 'noise'; readonly props: NoiseProps }
  | { readonly type: 'harmonic'; readonly props: HarmonicProps }
  | { readonly type: 'modulator'; readonly props: ModulatorProps }
  | { readonly type: 'tunnel'; readonly props: TunnelProps }
  | { readonly type: 'teleporter'; readonly props: TeleporterProps }
  | { readonly type: 'quantizer'; readonly props: QuantizerProps }
  | { readonly type: 'lfo'; readonly props: LfoProps }
  | { readonly type: 'midi_out'; readonly props: MidiOutProps }
  | { readonly type: 'midi_cc'; readonly props: MidiCcProps }
  | { readonly type: 'scene_trigger'; readonly props: SceneTriggerProps }
  | { readonly type: 'splitter'; readonly props: SplitterProps };

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
}

// ============================================================================
// PACKET & PAYLOAD
// ============================================================================

/** Audio payload carried by packets */
export interface AudioPayload {
  freq: Frequency;
  midiNote: MidiNote;
  wave: WaveOrNoiseType;
  timbre: number;           // 0-1 filter resonance
  cutoff: Frequency;
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
}

/** Packet traveling along edges */
export interface Packet {
  readonly id: PacketId;
  readonly edgeId: EdgeId;
  t: number;                // 0-1 progress along edge
  payload: AudioPayload;
  entanglementGroupId?: string;  // Entangled packets share payload changes
}

// ============================================================================
// SCENE & PROJECT
// ============================================================================

/** Scene snapshot */
export interface Scene {
  readonly id: SceneId;
  readonly name: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
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

/** Global settings */
export interface GlobalSettings {
  readonly subdivisions: number;
  readonly pixelsPerBeat: number;
  readonly gravityConstant: number;
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
  | 'source' | 'speaker' | 'pitch' | 'polariser' | 'filter' 
  | 'gate' | 'delay' | 'gain' | 'noise' | 'harmonic' 
  | 'modulator' | 'tunnel' | 'teleporter' | 'quantizer' 
  | 'lfo' | 'splitter' | 'midi_out' | 'midi_cc' | 'scene_trigger'
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
