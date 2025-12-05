// Phonon v2 - Audio Worklet Processor
// Runs on the audio thread for sample-accurate scheduling
// Updated: 2025-12-05 with pan support
/// <reference path="../vite-env.d.ts" />

// Message types
interface NoteOnMessage {
  type: 'noteOn';
  id: string;
  freq: number;
  gain: number;
  wave: string;
  attack: number;
  decay: number;
  holdTime: number;
  releaseTime: number;
  cutoff: number;
  timbre: number;
  startTime: number;
  layers?: Array<{
    wave: string;
    attack: number;
    decay: number;
    gain: number;
    ratio?: number;
  }>;
  vibratoRate?: number;
  vibratoDepth?: number;
  vibratoDelay?: number;
  filterEnv?: {
    attack: number;
    decay: number;
    mod: number;
  };
  pan?: number;
}

interface NoteOffMessage {
  type: 'noteOff';
  id: string;
}

interface SetParamMessage {
  type: 'setParam';
  param: string;
  value: number;
}

type WorkletMessage = NoteOnMessage | NoteOffMessage | SetParamMessage;

// Voice state
interface Voice {
  id: string;
  freq: number;
  phase: number;
  gain: number;
  wave: string;
  startTime: number;
  attack: number;
  decay: number;
  holdTime: number;
  releaseTime: number;
  cutoff: number;
  timbre: number;
  state: 'attack' | 'hold' | 'decay' | 'release' | 'dead';
  envelope: number;
  time: number;
  
  // Multi-layer oscillators
  layers: Array<{
    wave: string;
    phase: number;
    attack: number;
    decay: number;
    gain: number;
    ratio: number;
    envelope: number;
  }>;
  
  // Vibrato
  vibratoRate: number;
  vibratoDepth: number;
  vibratoDelay: number;
  vibratoPhase: number;
  
  // Filter
  filterEnv: { attack: number; decay: number; mod: number } | null;
  filterEnvValue: number;
  
  // Panning
  pan: number;
  
  // Biquad filter state
  filterX1: number;
  filterX2: number;
  filterY1: number;
  filterY2: number;
}

// ============================================================================
// SYNTH PROCESSOR
// ============================================================================

class PhononSynthProcessor extends AudioWorkletProcessor {
  private voices: Map<string, Voice> = new Map();
  private masterGain: number = 0.5;
  private sampleRate: number;
  
  constructor() {
    super();
    this.sampleRate = sampleRate; // Global from AudioWorkletGlobalScope
    this.port.onmessage = this.handleMessage.bind(this);
  }
  
  /**
   * Handle messages from main thread
   */
  private handleMessage(event: MessageEvent<WorkletMessage>): void {
    const data = event.data;
    
    switch (data.type) {
      case 'noteOn':
        this.noteOn(data);
        break;
        
      case 'noteOff':
        this.noteOff(data.id);
        break;
        
      case 'setParam':
        if (data.param === 'masterGain') {
          this.masterGain = data.value;
        }
        break;
    }
  }
  
  /**
   * Start a new note
   */
  private noteOn(msg: NoteOnMessage): void {
    const layers = msg.layers ?? [{
      wave: msg.wave,
      attack: msg.attack,
      decay: msg.decay,
      gain: 1.0,
      ratio: 1,
    }];
    
    const voice: Voice = {
      id: msg.id,
      freq: msg.freq,
      phase: 0,
      gain: msg.gain,
      wave: msg.wave,
      startTime: msg.startTime,
      attack: msg.attack,
      decay: msg.decay,
      holdTime: msg.holdTime,
      releaseTime: msg.releaseTime,
      cutoff: msg.cutoff,
      timbre: msg.timbre,
      state: 'attack',
      envelope: 0,
      time: 0,
      
      layers: layers.map(l => ({
        wave: l.wave,
        phase: Math.random() * Math.PI * 2, // Slight random phase for chorus
        attack: l.attack,
        decay: l.decay,
        gain: l.gain,
        ratio: l.ratio ?? 1,
        envelope: 0,
      })),
      
      vibratoRate: msg.vibratoRate ?? 0,
      vibratoDepth: msg.vibratoDepth ?? 0,
      vibratoDelay: msg.vibratoDelay ?? 0,
      vibratoPhase: 0,
      
      filterEnv: msg.filterEnv ?? null,
      filterEnvValue: 0,
      
      pan: msg.pan ?? 0,
      
      filterX1: 0,
      filterX2: 0,
      filterY1: 0,
      filterY2: 0,
    };
    
    this.voices.set(msg.id, voice);
  }
  
  /**
   * Release a note
   */
  private noteOff(id: string): void {
    const voice = this.voices.get(id);
    if (voice && voice.state !== 'dead') {
      voice.state = 'release';
    }
  }
  
  /**
   * Main DSP process
   */
  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    
    const left = output[0];
    const right = output[1] ?? output[0];
    
    if (!left || !right) return true;
    
    const bufferSize = left.length;
    const dt = 1 / this.sampleRate;
    
    // Clear output
    left.fill(0);
    right.fill(0);
    
    // Process each voice
    const deadVoices: string[] = [];
    
    this.voices.forEach((voice, id) => {
      for (let i = 0; i < bufferSize; i++) {
        // Update envelope state
        this.updateEnvelope(voice, dt);
        
        if (voice.state === 'dead') {
          deadVoices.push(id);
          break;
        }
        
        // Calculate sample
        let sample = 0;
        
        // Update vibrato
        if (voice.vibratoRate > 0 && voice.time > voice.vibratoDelay) {
          voice.vibratoPhase += voice.vibratoRate * dt * Math.PI * 2;
        }
        
        const vibratoMod = voice.vibratoDepth > 0 && voice.time > voice.vibratoDelay
          ? Math.pow(2, (Math.sin(voice.vibratoPhase) * voice.vibratoDepth) / 1200)
          : 1;
        
        // Process each layer
        for (const layer of voice.layers) {
          this.updateLayerEnvelope(layer, voice.state, dt);
          
          const layerFreq = voice.freq * layer.ratio * vibratoMod;
          const phaseDelta = (layerFreq / this.sampleRate) * Math.PI * 2;
          layer.phase += phaseDelta;
          
          if (layer.phase > Math.PI * 2) {
            layer.phase -= Math.PI * 2;
          }
          
          const osc = this.oscillate(layer.wave, layer.phase);
          sample += osc * layer.gain * layer.envelope;
        }
        
        // Apply main envelope and gain
        sample *= voice.envelope * voice.gain;
        
        // Apply filter
        if (voice.cutoff < 20000 || voice.filterEnv) {
          sample = this.applyFilter(voice, sample);
        }
        
        // Mix to output with panning
        const pan = voice.pan; // -1 (left) to +1 (right)
        const leftGain = Math.cos((pan + 1) * Math.PI / 4);
        const rightGain = Math.sin((pan + 1) * Math.PI / 4);
        const monoSample = sample * this.masterGain;
        left[i]! += monoSample * leftGain;
        right[i]! += monoSample * rightGain;
        
        voice.time += dt;
      }
    });
    
    // Remove dead voices
    deadVoices.forEach(id => this.voices.delete(id));
    
    // Clip output
    for (let i = 0; i < bufferSize; i++) {
      left[i] = Math.max(-1, Math.min(1, left[i]!));
      right[i] = Math.max(-1, Math.min(1, right[i]!));
    }
    
    return true;
  }
  
  /**
   * Update voice envelope (AHD with release)
   */
  private updateEnvelope(voice: Voice, dt: number): void {
    switch (voice.state) {
      case 'attack':
        voice.envelope += dt / Math.max(0.001, voice.attack);
        if (voice.envelope >= 1) {
          voice.envelope = 1;
          voice.state = voice.holdTime > 0 ? 'hold' : 'decay';
        }
        break;
        
      case 'hold':
        if (voice.time - voice.attack >= voice.holdTime) {
          voice.state = 'decay';
        }
        break;
        
      case 'decay':
        voice.envelope -= dt / Math.max(0.001, voice.decay);
        if (voice.envelope <= 0) {
          voice.envelope = 0;
          voice.state = 'dead';
        }
        break;
        
      case 'release':
        voice.envelope -= dt / Math.max(0.001, voice.releaseTime);
        if (voice.envelope <= 0) {
          voice.envelope = 0;
          voice.state = 'dead';
        }
        break;
    }
    
    // Update filter envelope
    if (voice.filterEnv) {
      const totalTime = voice.filterEnv.attack + voice.filterEnv.decay;
      if (voice.time < voice.filterEnv.attack) {
        voice.filterEnvValue = voice.time / voice.filterEnv.attack;
      } else if (voice.time < totalTime) {
        voice.filterEnvValue = 1 - (voice.time - voice.filterEnv.attack) / voice.filterEnv.decay;
      } else {
        voice.filterEnvValue = 0;
      }
    }
  }
  
  /**
   * Update layer envelope
   */
  private updateLayerEnvelope(
    layer: Voice['layers'][0], 
    voiceState: Voice['state'],
    dt: number
  ): void {
    if (voiceState === 'attack') {
      layer.envelope += dt / Math.max(0.001, layer.attack);
      if (layer.envelope > 1) layer.envelope = 1;
    } else if (voiceState === 'decay' || voiceState === 'release') {
      layer.envelope -= dt / Math.max(0.001, layer.decay);
      if (layer.envelope < 0) layer.envelope = 0;
    }
  }
  
  /**
   * Generate oscillator sample
   */
  private oscillate(wave: string, phase: number): number {
    switch (wave) {
      case 'sine':
        return Math.sin(phase);
        
      case 'square':
        return phase < Math.PI ? 1 : -1;
        
      case 'sawtooth':
        return (phase / Math.PI) - 1;
        
      case 'triangle':
        if (phase < Math.PI) {
          return (2 * phase / Math.PI) - 1;
        } else {
          return 3 - (2 * phase / Math.PI);
        }
        
      case 'white':
        return Math.random() * 2 - 1;
        
      case 'pink':
      case 'brown':
        // Simplified - proper pink/brown noise needs state
        return Math.random() * 2 - 1;
        
      default:
        return Math.sin(phase);
    }
  }
  
  /**
   * Apply biquad lowpass filter
   */
  private applyFilter(voice: Voice, input: number): number {
    let cutoff = voice.cutoff;
    
    // Apply filter envelope
    if (voice.filterEnv) {
      cutoff = Math.max(20, Math.min(20000, cutoff + voice.filterEnv.mod * voice.filterEnvValue));
    }
    
    // Calculate biquad coefficients (lowpass)
    const w0 = (2 * Math.PI * cutoff) / this.sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const Q = 1 + voice.timbre * 10;
    const alpha = sinw0 / (2 * Q);
    
    const b0 = (1 - cosw0) / 2;
    const b1 = 1 - cosw0;
    const b2 = (1 - cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;
    
    // Normalize
    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;
    
    // Apply filter (Direct Form II Transposed)
    const output = nb0 * input + nb1 * voice.filterX1 + nb2 * voice.filterX2
                   - na1 * voice.filterY1 - na2 * voice.filterY2;
    
    voice.filterX2 = voice.filterX1;
    voice.filterX1 = input;
    voice.filterY2 = voice.filterY1;
    voice.filterY1 = output;
    
    return output;
  }
}

registerProcessor('phonon-synth-processor', PhononSynthProcessor);
