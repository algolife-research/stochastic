// AIGA - Offline Audio Renderer
// Renders compiled events to an AudioBuffer using OfflineAudioContext

/**
 * Render a list of audio events to a WAV buffer
 * @param {Array} events - Compiled audio events from compiler.js
 * @param {number} durationSeconds - Total duration
 * @param {number} sampleRate - Sample rate (default 44100)
 * @returns {Promise<AudioBuffer>}
 */
export async function renderToBuffer(events, durationSeconds, sampleRate = 44100) {
  const channels = 2; // Stereo
  const length = Math.ceil(durationSeconds * sampleRate);
  
  const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);
  
  // Create reverb (simplified for offline - convolution would be better but heavier)
  const reverbGain = offlineCtx.createGain();
  reverbGain.gain.value = 0.3;
  
  const reverbDelay = offlineCtx.createDelay(1.0);
  reverbDelay.delayTime.value = 0.05;
  
  const reverbFilter = offlineCtx.createBiquadFilter();
  reverbFilter.type = 'lowpass';
  reverbFilter.frequency.value = 2000;
  
  const reverbFeedback = offlineCtx.createGain();
  reverbFeedback.gain.value = 0.4;
  
  reverbGain.connect(reverbDelay);
  reverbDelay.connect(reverbFilter);
  reverbFilter.connect(reverbFeedback);
  reverbFeedback.connect(reverbDelay);
  reverbFilter.connect(offlineCtx.destination);
  
  // Master gain
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = 0.7;
  masterGain.connect(offlineCtx.destination);
  
  // Schedule all events
  for (const event of events) {
    scheduleNote(offlineCtx, event, masterGain, reverbGain);
  }
  
  // Render
  const buffer = await offlineCtx.startRendering();
  return buffer;
}

/**
 * Schedule a single note event
 */
function scheduleNote(ctx, event, masterGain, reverbGain) {
  const t = event.time;
  const cutoff = event.cutoff || 20000;
  const q = (event.timbre || 0) * 10;
  
  const vibratoRate = event.vibratoRate || 0;
  const vibratoDepth = event.vibratoDepth || 0;
  const vibratoDelay = event.vibratoDelay || 0;
  
  // Panner
  const panner = ctx.createStereoPanner();
  panner.pan.value = event.pan !== undefined ? event.pan : 0;
  
  // Reverb send
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = event.reverb !== undefined ? event.reverb : 0;
  
  panner.connect(masterGain);
  panner.connect(reverbSend);
  reverbSend.connect(reverbGain);
  
  // Determine layers
  let layers;
  if (event.waves && event.waves.length > 0) {
    layers = event.waves;
  } else {
    layers = [{
      wave: event.wave || 'sine',
      attack: 0.01,
      decay: 0.4
    }];
  }
  
  const gainPerLayer = event.gain / layers.length;
  
  layers.forEach((layer, i) => {
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    const wave = layer.wave || 'sine';
    const attack = layer.attack || 0.01;
    const decay = layer.decay || 0.4;
    const layerMix = layer.gain !== undefined ? layer.gain : 1.0;
    
    let osc;
    
    // Create source
    if (wave === 'white' || wave === 'pink' || wave === 'brown') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      if (wave === 'white') {
        for (let k = 0; k < bufferSize; k++) {
          data[k] = Math.random() * 2 - 1;
        }
      } else if (wave === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let k = 0; k < bufferSize; k++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[k] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else { // brown
        let lastOut = 0;
        for (let k = 0; k < bufferSize; k++) {
          const white = Math.random() * 2 - 1;
          data[k] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[k];
          data[k] *= 3.5;
        }
      }
      
      osc = ctx.createBufferSource();
      osc.buffer = buffer;
      osc.loop = true;
    } else {
      osc = ctx.createOscillator();
      osc.type = wave;
      
      const ratio = layer.ratio || 1;
      const layerFreq = event.freq * ratio;
      osc.frequency.setValueAtTime(layerFreq, t);
      
      if (layers.length > 1 && ratio === 1) {
        osc.detune.value = (i - (layers.length - 1) / 2) * 12;
      }
      
      // Vibrato
      if (vibratoRate > 0 && vibratoDepth > 0) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        
        lfo.type = 'sine';
        lfo.frequency.value = vibratoRate;
        
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
    
    // Filter envelope
    if (event.filterEnv && event.filterEnv.mod !== 0) {
      const fEnv = event.filterEnv;
      const baseFreq = cutoff;
      const peakFreq = Math.max(20, Math.min(20000, baseFreq + fEnv.mod));
      
      filter.frequency.setValueAtTime(baseFreq, t);
      filter.frequency.linearRampToValueAtTime(peakFreq, t + fEnv.attack);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, baseFreq), t + fEnv.attack + fEnv.decay);
    }
    
    // Amplitude envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainPerLayer * layerMix, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    
    osc.start(t);
    osc.stop(t + attack + decay + 0.1);
  });
}
