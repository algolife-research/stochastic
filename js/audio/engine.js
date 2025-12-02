// AIGA - Audio Engine

import * as state from '../core/state.js';

/**
 * Initialize the Web Audio context and effects chain
 */
export function initAudio() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  state.setAudioCtx(audioCtx);
  
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  state.setMasterGain(masterGain);
  
  // Simple Reverb (Delay Network)
  const reverbNode = audioCtx.createDelay();
  reverbNode.delayTime.value = 0.3;
  state.setReverbNode(reverbNode);
  
  const feedback = audioCtx.createGain();
  feedback.gain.value = 0.4;
  
  const delayFilter = audioCtx.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = 2000;
  
  // Routing
  masterGain.connect(audioCtx.destination);
  
  reverbNode.connect(delayFilter);
  delayFilter.connect(feedback);
  feedback.connect(reverbNode);
  reverbNode.connect(audioCtx.destination);
}

/**
 * Resume audio context if suspended
 */
export function resumeAudio() {
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

/**
 * Check if audio is ready
 */
export function isAudioReady() {
  return state.audioCtx && state.audioCtx.state === 'running';
}
