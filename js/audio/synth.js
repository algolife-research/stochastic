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
    const osc = state.audioCtx.createOscillator();
    const filter = state.audioCtx.createBiquadFilter();
    const gain = state.audioCtx.createGain();
    
    const wave = layer.wave || 'sine';
    const attack = layer.attack || 0.01;
    const decay = layer.decay || 0.4;
    
    osc.type = wave;
    osc.frequency.setValueAtTime(params.freq, t);
    
    // Slight detune for layers (creates richness)
    if (layers.length > 1) {
      osc.detune.value = (i - (layers.length - 1) / 2) * 8;
    }
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.Q.value = q;
    
    // Envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainPerLayer, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    
    osc.start(t);
    osc.stop(t + attack + decay + 0.1);
  });
}
