// Stochastic v2 - Audio Worklet Processor
// Runs on the audio thread for sample-accurate scheduling
// Updated: 2025-12-11 with filter types, unison, proper noise
/// <reference path="../vite-env.d.ts" />

// Filter types
type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

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
  filterType?: FilterType;
  filterResonance?: number;
  startTime: number;
  layers?: Array<{
    wave: string;
    attack: number;
    decay: number;
    gain: number;
    ratio?: number;
    mode?: 'additive' | 'ring' | 'fm';
    modulationIndex?: number;
    feedback?: number;
    unison?: number;
    detune?: number;
    stereoSpread?: number;
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

interface GetVoicesMessage {
  type: 'getVoices';
}

type WorkletMessage = NoteOnMessage | NoteOffMessage | SetParamMessage | GetVoicesMessage;

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
  filterType: FilterType;
  filterResonance: number;
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
    mode: 'additive' | 'ring' | 'fm';
    modulationIndex: number;
    feedback: number;
    lastSample: number;  // For FM feedback
    unison: number;
    detune: number;
    stereoSpread: number;
    unisonPhases: number[];  // Phase for each unison voice
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
  
  // Pink noise state (Paul Kellet's refined method)
  private pinkB0 = 0;
  private pinkB1 = 0;
  private pinkB2 = 0;
  private pinkB3 = 0;
  private pinkB4 = 0;
  private pinkB5 = 0;
  private pinkB6 = 0;
  
  // Brown noise state
  private brownLast = 0;
  
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
        
      case 'getVoices':
        // Send active voices back to main thread
        const activeVoices = Array.from(this.voices.values())
          .filter(v => v.state !== 'dead')
          .map(v => ({
            id: v.id,
            freq: v.freq,
            gain: v.gain * v.envelope,
            pan: v.pan,
            wave: v.wave,
            envelope: v.envelope,
            state: v.state,
          }));
        this.port.postMessage({ type: 'voicesResponse', voices: activeVoices });
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
      filterType: msg.filterType ?? 'lowpass',
      filterResonance: msg.filterResonance ?? 0,
      state: 'attack',
      envelope: 0,
      time: 0,
      
      layers: layers.map(l => {
        const unison = l.unison ?? 1;
        return {
          wave: l.wave,
          phase: Math.random() * Math.PI * 2, // Slight random phase for chorus
          attack: l.attack,
          decay: l.decay,
          gain: l.gain,
          ratio: l.ratio ?? 1,
          envelope: 0,
          mode: l.mode ?? 'additive',
          modulationIndex: l.modulationIndex ?? 2,
          feedback: l.feedback ?? 0,
          lastSample: 0,
          unison,
          detune: l.detune ?? 0,
          stereoSpread: l.stereoSpread ?? 0.5,
          unisonPhases: Array.from({ length: unison }, () => Math.random() * Math.PI * 2),
        };
      }),
      
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
        
        // Update vibrato
        if (voice.vibratoRate > 0 && voice.time > voice.vibratoDelay) {
          voice.vibratoPhase += voice.vibratoRate * dt * Math.PI * 2;
        }
        
        const vibratoMod = voice.vibratoDepth > 0 && voice.time > voice.vibratoDelay
          ? Math.pow(2, (Math.sin(voice.vibratoPhase) * voice.vibratoDepth) / 1200)
          : 1;
        
        // Process each layer with FM/Ring/Additive modes and Unison
        let fmModulation = 0;  // Accumulated FM modulation for next layer
        let prevLayerSample = 0;  // For ring modulation
        let sampleL = 0;  // Left channel accumulator for unison stereo spread
        let sampleR = 0;  // Right channel accumulator for unison stereo spread
        
        for (let layerIdx = 0; layerIdx < voice.layers.length; layerIdx++) {
          const layer = voice.layers[layerIdx]!;
          this.updateLayerEnvelope(layer, voice.state, dt);
          
          const baseLayerFreq = voice.freq * layer.ratio * vibratoMod;
          
          // Process unison voices
          let layerSampleL = 0;
          let layerSampleR = 0;
          const unisonCount = layer.unison;
          const gainPerVoice = 1 / Math.sqrt(unisonCount); // Normalize gain
          
          for (let u = 0; u < unisonCount; u++) {
            // Calculate detune for this unison voice (-1 to +1 spread)
            const detuneSpread = unisonCount > 1 ? (u / (unisonCount - 1)) * 2 - 1 : 0;
            const detuneCents = detuneSpread * layer.detune;
            const detuneRatio = Math.pow(2, detuneCents / 1200);
            const layerFreq = baseLayerFreq * detuneRatio;
            
            const phaseDelta = (layerFreq / this.sampleRate) * Math.PI * 2;
            
            // Apply FM modulation from previous FM-mode layer
            const modulatedPhase = layer.unisonPhases[u]! + fmModulation;
            layer.unisonPhases[u]! += phaseDelta;
            
            if (layer.unisonPhases[u]! > Math.PI * 2) {
              layer.unisonPhases[u]! -= Math.PI * 2;
            }
            
            let unisonSample = this.oscillate(layer.wave, modulatedPhase) * layer.gain * layer.envelope * gainPerVoice;
            
            // Calculate stereo position for this unison voice
            const stereoPos = detuneSpread * layer.stereoSpread;
            const unisonLeftGain = Math.cos((stereoPos + 1) * Math.PI / 4);
            const unisonRightGain = Math.sin((stereoPos + 1) * Math.PI / 4);
            
            layerSampleL += unisonSample * unisonLeftGain;
            layerSampleR += unisonSample * unisonRightGain;
          }
          
          // Update main phase for backwards compatibility
          layer.phase = layer.unisonPhases[0]!;
          
          // Apply self-feedback for FM mode (use mono sum)
          const layerSampleMono = (layerSampleL + layerSampleR) / 2;
          if (layer.mode === 'fm' && layer.feedback > 0) {
            const feedbackSample = layer.lastSample * layer.feedback * 0.5;
            layerSampleL += feedbackSample;
            layerSampleR += feedbackSample;
          }
          layer.lastSample = layerSampleMono;
          
          // Handle different blend modes
          switch (layer.mode) {
            case 'fm':
              // FM mode: modulate NEXT layer's frequency, don't add to output
              fmModulation = layerSampleMono * layer.modulationIndex;
              break;
              
            case 'ring':
              // Ring mode: multiply with previous layer's output
              if (layerIdx > 0) {
                sampleL = prevLayerSample * layerSampleL;
                sampleR = prevLayerSample * layerSampleR;
              } else {
                sampleL += layerSampleL;
                sampleR += layerSampleR;
              }
              fmModulation = 0;  // Reset FM after non-FM layer
              break;
              
            case 'additive':
            default:
              // Additive mode: sum with output
              sampleL += layerSampleL;
              sampleR += layerSampleR;
              fmModulation = 0;  // Reset FM after carrier
              break;
          }
          
          prevLayerSample = layerSampleMono;
        }
        
        // Apply main envelope and gain
        sampleL *= voice.envelope * voice.gain;
        sampleR *= voice.envelope * voice.gain;
        
        // Apply filter (mono, then re-expand)
        if (voice.cutoff < 20000 || voice.filterEnv) {
          const monoForFilter = (sampleL + sampleR) / 2;
          const filtered = this.applyFilter(voice, monoForFilter);
          const filterRatio = monoForFilter !== 0 ? filtered / monoForFilter : 1;
          sampleL *= filterRatio;
          sampleR *= filterRatio;
        }
        
        // Apply voice panning on top of unison stereo spread
        const pan = voice.pan; // -1 (left) to +1 (right)
        const panLeftGain = Math.cos((pan + 1) * Math.PI / 4);
        const panRightGain = Math.sin((pan + 1) * Math.PI / 4);
        
        // Mix L/R with pan (crossfade based on pan)
        const finalL = sampleL * panLeftGain + sampleR * (1 - panRightGain) * 0.3;
        const finalR = sampleR * panRightGain + sampleL * (1 - panLeftGain) * 0.3;
        
        left[i]! += finalL * this.masterGain;
        right[i]! += finalR * this.masterGain;
        
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
        return this.generatePinkNoise();
        
      case 'brown':
        return this.generateBrownNoise();
        
      default:
        return Math.sin(phase);
    }
  }
  
  /**
   * Generate pink noise using Paul Kellet's refined method
   * -3dB/octave spectrum
   */
  private generatePinkNoise(): number {
    const white = Math.random() * 2 - 1;
    
    this.pinkB0 = 0.99886 * this.pinkB0 + white * 0.0555179;
    this.pinkB1 = 0.99332 * this.pinkB1 + white * 0.0750759;
    this.pinkB2 = 0.96900 * this.pinkB2 + white * 0.1538520;
    this.pinkB3 = 0.86650 * this.pinkB3 + white * 0.3104856;
    this.pinkB4 = 0.55000 * this.pinkB4 + white * 0.5329522;
    this.pinkB5 = -0.7616 * this.pinkB5 - white * 0.0168980;
    
    const pink = this.pinkB0 + this.pinkB1 + this.pinkB2 + this.pinkB3 + 
                 this.pinkB4 + this.pinkB5 + this.pinkB6 + white * 0.5362;
    this.pinkB6 = white * 0.115926;
    
    return pink * 0.11; // Normalize to approximately -1 to 1
  }
  
  /**
   * Generate brown noise (Brownian/red noise)
   * -6dB/octave spectrum using random walk
   */
  private generateBrownNoise(): number {
    const white = Math.random() * 2 - 1;
    this.brownLast = (this.brownLast + (0.02 * white)) / 1.02;
    return this.brownLast * 3.5; // Normalize
  }
  
  /**
   * Apply biquad filter with selectable type
   */
  private applyFilter(voice: Voice, input: number): number {
    let cutoff = voice.cutoff;
    
    // Apply filter envelope
    if (voice.filterEnv) {
      cutoff = Math.max(20, Math.min(20000, cutoff + voice.filterEnv.mod * voice.filterEnvValue));
    }
    
    // Calculate biquad coefficients based on filter type
    const w0 = (2 * Math.PI * cutoff) / this.sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    
    // Q from resonance (0-1 maps to 0.707-20)
    const Q = 0.707 + voice.filterResonance * 19.293;
    const alpha = sinw0 / (2 * Q);
    
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
    
    switch (voice.filterType) {
      case 'highpass':
        b0 = (1 + cosw0) / 2;
        b1 = -(1 + cosw0);
        b2 = (1 + cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
        
      case 'bandpass':
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
        
      case 'notch':
        b0 = 1;
        b1 = -2 * cosw0;
        b2 = 1;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
        
      case 'lowpass':
      default:
        b0 = (1 - cosw0) / 2;
        b1 = 1 - cosw0;
        b2 = (1 - cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
    }
    
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
