// Phonon v2 - Audio Engine
// Main thread audio management and scheduling

import type { AudioPayload, MidiNote, Frequency } from '@core/types';
import { midiToFreq } from '@core/constants';

// Import worklet URL for Vite
import workletUrl from './worklet.ts?worker&url';

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveVoice {
  id: string;
  freq: number;
  gain: number;
  pan: number;
  wave: string;
  envelope: number;
  state: 'attack' | 'hold' | 'decay' | 'release';
}

// ============================================================================
// AUDIO ENGINE CLASS
// ============================================================================

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private synthNode: AudioWorkletNode | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private isInitialized: boolean = false;
  private isMuted: boolean = false;
  private activeVoices: ActiveVoice[] = [];
  private voiceQueryPending: boolean = false;
  
  /**
   * Initialize the audio engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Create audio context
    this.audioContext = new AudioContext({ latencyHint: 'interactive' });
    
    // Load AudioWorklet using Vite's ?url import
    try {
      await this.audioContext.audioWorklet.addModule(workletUrl);
      console.log('AudioWorklet loaded successfully - with pan support');
    } catch (e) {
      console.error('Failed to load AudioWorklet:', e);
      // Continue without worklet - audio won't work but app won't crash
      return;
    }
    
    // Create worklet node
    this.synthNode = new AudioWorkletNode(this.audioContext, 'phonon-synth-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2], // Stereo output
    });
    
    // Listen for voice updates from worklet
    this.synthNode.port.onmessage = (event) => {
      if (event.data.type === 'voicesResponse') {
        this.activeVoices = event.data.voices;
        this.voiceQueryPending = false;
      }
    };
    
    // Create master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    
    // Create simple reverb (convolution)
    this.reverbNode = this.audioContext.createConvolver();
    this.reverbGain = this.audioContext.createGain();
    this.reverbGain.gain.value = 0.3;
    
    // Generate impulse response
    await this.generateImpulseResponse();
    
    // Connect nodes
    // Synth -> Master Gain -> Destination
    // Synth -> Reverb -> Reverb Gain -> Destination
    this.synthNode.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
    
    this.synthNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.audioContext.destination);
    
    this.isInitialized = true;
  }
  
  /**
   * Generate a simple impulse response for reverb
   */
  private async generateImpulseResponse(): Promise<void> {
    if (!this.audioContext || !this.reverbNode) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 2; // 2 seconds
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay noise
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    this.reverbNode.buffer = buffer;
  }
  
  /**
   * Resume audio context if suspended
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
  
  /**
   * Get current audio time
   */
  getCurrentTime(): number {
    return this.audioContext?.currentTime ?? 0;
  }
  
  /**
   * Check if audio is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.audioContext?.state === 'running';
  }
  
  /**
   * Play a note with the given payload
   */
  playNote(payload: AudioPayload, options?: { reverb?: number; pan?: number }, id?: string): void {
    if (!this.synthNode || this.isMuted) return;
    
    // Apply reverb level if specified
    if (options?.reverb !== undefined && this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(
        options.reverb,
        this.audioContext?.currentTime ?? 0,
        0.01
      );
    }
    
    const noteId = id ?? crypto.randomUUID();
    
    // Prepare layers
    const layers = payload.waves?.map(w => ({
      wave: w.wave,
      attack: w.attack,
      decay: w.decay,
      gain: w.gain,
      ratio: w.ratio ?? 1,
    }));
    
    // Calculate envelope times
    // When layers exist (from polariser/noise/harmonic), use the longest layer envelope
    // Otherwise use the default/fallback values
    let mainAttack = 0.01;
    let mainDecay = payload.releaseTime;
    
    if (layers && layers.length > 0) {
      // Use the longest attack/decay from all layers for the main envelope
      mainAttack = Math.max(...layers.map(l => l.attack));
      mainDecay = Math.max(...layers.map(l => l.decay));
    }
    
    // Send to worklet
    this.synthNode.port.postMessage({
      type: 'noteOn',
      id: noteId,
      freq: payload.freq as number,
      gain: payload.gain,
      wave: payload.wave,
      attack: mainAttack,
      decay: mainDecay,
      holdTime: payload.holdTime,
      releaseTime: payload.releaseTime,
      cutoff: payload.cutoff as number,
      timbre: payload.timbre,
      startTime: this.getCurrentTime(),
      layers,
      vibratoRate: payload.vibratoRate as number | undefined,
      vibratoDepth: payload.vibratoDepth,
      vibratoDelay: payload.vibratoDelay,
      filterEnv: payload.filterEnv,
      pan: options?.pan ?? 0,
    });
  }
  
  /**
   * Stop a specific note
   */
  stopNote(id: string): void {
    if (!this.synthNode) return;
    
    this.synthNode.port.postMessage({
      type: 'noteOff',
      id,
    });
  }
  
  /**
   * Set master gain
   */
  setMasterGain(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        value,
        this.audioContext?.currentTime ?? 0,
        0.01
      );
    }
    
    this.synthNode?.port.postMessage({
      type: 'setParam',
      param: 'masterGain',
      value,
    });
  }
  
  /**
   * Set reverb wet/dry mix
   */
  setReverbMix(value: number): void {
    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(
        value,
        this.audioContext?.currentTime ?? 0,
        0.01
      );
    }
  }
  
  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.5,
        this.audioContext?.currentTime ?? 0,
        0.01
      );
    }
  }
  
  /**
   * Get currently active voices for visualization
   * This queries the worklet and returns cached results
   */
  getActiveVoices(): ActiveVoice[] {
    // Request update from worklet if not already pending
    if (!this.voiceQueryPending && this.synthNode) {
      this.voiceQueryPending = true;
      this.synthNode.port.postMessage({ type: 'getVoices' });
    }
    
    return this.activeVoices;
  }
  
  /**
   * Dispose of audio resources
   */
  dispose(): void {
    this.synthNode?.disconnect();
    this.masterGain?.disconnect();
    this.reverbNode?.disconnect();
    this.reverbGain?.disconnect();
    
    this.audioContext?.close();
    
    this.synthNode = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.audioContext = null;
    this.isInitialized = false;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const audioEngine = new AudioEngine();

// ============================================================================
// SCHEDULED PLAYBACK
// ============================================================================

/**
 * Schedule a note to play at a specific time
 */
export function scheduleNote(
  payload: AudioPayload,
  time: number,
  options?: { reverb?: number; pan?: number },
  id?: string
): void {
  const engine = audioEngine;
  const currentTime = engine.getCurrentTime();
  const delay = Math.max(0, time - currentTime);
  
  if (delay === 0) {
    engine.playNote(payload, options, id);
  } else {
    setTimeout(() => {
      engine.playNote(payload, options, id);
    }, delay * 1000);
  }
}

/**
 * Create a payload from MIDI note and options
 */
export function createPayload(
  midiNote: MidiNote | number,
  options: Partial<AudioPayload> = {}
): AudioPayload {
  return {
    freq: midiToFreq(midiNote as number) as Frequency,
    midiNote: midiNote as MidiNote,
    wave: options.wave ?? 'sine',
    timbre: options.timbre ?? 0,
    cutoff: options.cutoff ?? (20000 as Frequency),
    gain: options.gain ?? 0.5,
    holdTime: options.holdTime ?? 0,
    releaseTime: options.releaseTime ?? 0.3,
    vibratoRate: options.vibratoRate,
    vibratoDepth: options.vibratoDepth,
    vibratoDelay: options.vibratoDelay,
    waves: options.waves,
    filterEnv: options.filterEnv,
  };
}
