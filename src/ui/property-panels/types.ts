// Shared Property Panel Types
import type { ScaleName } from '@core/types';

// ============================================================================
// PROPERTY TYPE DEFINITIONS
// ============================================================================

export type SourcePropsType = { interval: number; midiNote: number; noteIndex: number; intensity: number; autoTrigger: boolean };
export type SpeakerPropsType = { volume: number; reverb: number; pan: number; holdTime: number; releaseTime: number };
export type PitchPropsType = { mode: string; shift: number; fixedMidiNote: number };
export type OscillatorPropsType = { 
  wave: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'white' | 'pink' | 'brown'; 
  ratio: number; 
  attack: number; 
  decay: number; 
  mix: number;
  mode?: 'additive' | 'ring' | 'fm';
  modulationIndex?: number;
  feedback?: number;
  unison?: number;
  detune?: number;
  stereoSpread?: number;
};
export type FilterPropsType = { 
  cutoff: number; 
  attack: number; 
  decay: number; 
  mod: number;
  type?: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  resonance?: number;
};
export type GatePropsType = { 
  mode: 'probability' | 'harmonic' | 'energy' | 'density' | 'all';
  probability: number; 
  harmonicThreshold: number;
  energyThreshold: number;
  densityThreshold: number;
  useGlobalKey: boolean;
  scale: ScaleName;
  root: number;
};
export type DelayPropsType = { delayTime: number };
export type GainPropsType = { value: number; mass: number };
export type TeleporterPropsType = { channel: string; isEntry: boolean };
export type ModulatorPropsType = { rate: number; depth: number; delay: number };
export type SubNodeType = { type: string; props: Record<string, unknown> };
export type TunnelPropsType = { tunnelName: string; subNodes: SubNodeType[] };
export type QuantizerPropsType = {
  strength: number;
  useGlobalKey: boolean;
  scale: ScaleName;
  root: number;
  mode: 'nearest' | 'random';
  weights: Record<number, number>;
  defaultPitch: number;
};
export type LfoPropsType = { rate: number; shape: 'sine' | 'square' | 'sawtooth' | 'triangle'; min: number; max: number; phase: number };
export type MidiOutPropsType = { channel: number; duration: number; velocityScale: number };
export type MidiCcPropsType = { channel: number; ccNumber: number };
export type SceneTriggerPropsType = { targetSceneIndex: number; behavior: 'jump' | 'crossfade' };
export type SplitterPropsType = { entangled: boolean; behavior: 'broadcast' | 'random' | 'weighted' };

// Evolutionary node types
export type MutatableProperty = 'pitch' | 'gain' | 'cutoff' | 'wave' | 'timbre';
export type MutatorPropsType = {
  mode: 'drift' | 'radiation';
  probability: number;
  pitchDrift: number;
  pitchRadiation: number;
  gainDrift: number;
  cutoffDrift: number;
  waveChange: boolean;
  targets: MutatableProperty[];
};
export type CrossoverPropsType = {
  inheritance: 'random' | 'dominant_a' | 'dominant_b' | 'blend';
  pitchFrom: 'a' | 'b' | 'average' | 'random';
  waveFrom: 'a' | 'b' | 'random';
  gainMode: 'average' | 'max' | 'min' | 'random';
  timeout: number;
};

// ============================================================================
// PROPS EDITOR INTERFACE
// ============================================================================

export interface PropsEditorProps<T> {
  props: T;
  onChange: (key: string, value: unknown) => void;
}
