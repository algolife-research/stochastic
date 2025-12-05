// AIGA - Sound Synthesis

import * as state from '../core/state.js';

/**
 * Play a sound with the given parameters
 */
export function playSound(params) {
  if (!state.audioCtx || state.audioCtx.state !== 'running') return;
  if (state.isMuted) return;
  
  const t = state.audioCtx.currentTime;
  const cutoff = params.cutoff || 20000;
  const q = (params.timbre || 0) * 10;
  
  // Vibrato parameters (from payload or defaults)
  const vibratoRate = params.vibratoRate || 0;  // Hz (0 = off)
  const vibratoDepth = params.vibratoDepth || 0; // cents
  const vibratoDelay = params.vibratoDelay || 0; // seconds before vibrato starts
  
  // Stereo Panner (shared)
  const panner = state.audioCtx.createStereoPanner();
  panner.pan.value = params.pan !== undefined ? params.pan : 0;
  
  // Reverb Send (shared)
  const reverbSend = state.audioCtx.createGain();
  reverbSend.gain.value = params.reverb !== undefined ? params.reverb : 0;
  
  panner.connect(state.masterGain); // Dry
  panner.connect(reverbSend);
  reverbSend.connect(state.reverbNode); // Wet
  
  // Determine wave layers
  let layers;
  if (params.waves && params.waves.length > 0) {
    layers = params.waves;
  } else {
    layers = [{
      wave: params.wave || 'sine',
      attack: params.attack || 0.01,
      decay: params.decay || 0.4
    }];
  }
  
  // Create oscillator for each layer
  const gainPerLayer = params.gain / layers.length;
  
  layers.forEach((layer, i) => {
    let osc;
    const filter = state.audioCtx.createBiquadFilter();
    const gain = state.audioCtx.createGain();
    
    const wave = layer.wave || 'sine';
    const attack = layer.attack || 0.01;
    const decay = layer.decay || 0.4;
    const layerMix = layer.gain !== undefined ? layer.gain : 1.0;
    
    // Create Source (Oscillator or Noise)
    if (wave === 'white' || wave === 'pink' || wave === 'brown') {
      const bufferSize = state.audioCtx.sampleRate * 2; // 2s buffer
      const buffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      if (wave === 'white') {
        for (let k = 0; k < bufferSize; k++) {
          data[k] = Math.random() * 2 - 1;
        }
      } else if (wave === 'pink') {
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let k = 0; k < bufferSize; k++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[k] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[k] *= 0.11; // (roughly) compensate for gain
          b6 = white * 0.115926;
        }
      } else { // brown
        let lastOut = 0.0;
        for (let k = 0; k < bufferSize; k++) {
          const white = Math.random() * 2 - 1;
          data[k] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[k];
          data[k] *= 3.5; // (roughly) compensate for gain
        }
      }
      
      osc = state.audioCtx.createBufferSource();
      osc.buffer = buffer;
      osc.loop = true;
    } else {
      osc = state.audioCtx.createOscillator();
      osc.type = wave;
      
      // Calculate frequency - apply harmonic ratio if present
      const ratio = layer.ratio || 1;
      const layerFreq = params.freq * ratio;
      osc.frequency.setValueAtTime(layerFreq, t);
      
      // Slight detune for layers (creates richness / chorus effect)
      // Only apply to non-harmonic layers (ratio === 1)
      if (layers.length > 1 && ratio === 1) {
        osc.detune.value = (i - (layers.length - 1) / 2) * 12;
      }
      
      // Add vibrato (pitch modulation) via LFO
      if (vibratoRate > 0 && vibratoDepth > 0) {
        const lfo = state.audioCtx.createOscillator();
        const lfoGain = state.audioCtx.createGain();
        
        lfo.type = 'sine';
        lfo.frequency.value = vibratoRate;
        
        // Vibrato depth ramps in after delay
        lfoGain.gain.setValueAtTime(0, t);
        lfoGain.gain.setValueAtTime(0, t + vibratoDelay);
        lfoGain.gain.linearRampToValueAtTime(vibratoDepth, t + vibratoDelay + 0.2);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
        
        lfo.start(t);
        lfo.stop(t + attack + decay + 0.1);
      }
    }
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.Q.value = q;
    
    // Filter Envelope
    if (params.filterEnv && params.filterEnv.mod !== 0) {
      const fEnv = params.filterEnv;
      const baseFreq = cutoff;
      const peakFreq = Math.max(20, Math.min(20000, baseFreq + fEnv.mod));
      
      filter.frequency.setValueAtTime(baseFreq, t);
      filter.frequency.linearRampToValueAtTime(peakFreq, t + fEnv.attack);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, baseFreq), t + fEnv.attack + fEnv.decay);
    }
    
    // AHD Amplitude Envelope (Attack-Hold-Decay)
    // holdTime = 0 reverts to original AD behavior
    const holdTime = params.holdTime || 0;
    const releaseTime = params.releaseTime || decay;
    const totalDuration = attack + holdTime + releaseTime;
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainPerLayer * layerMix, t + attack);
    
    if (holdTime > 0) {
      // Sustain at peak level during hold time
      gain.gain.setValueAtTime(gainPerLayer * layerMix, t + attack + holdTime);
    }
    
    // Release/Decay phase
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + holdTime + releaseTime);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    
    osc.start(t);
    osc.stop(t + totalDuration + 0.1);
  });
}
