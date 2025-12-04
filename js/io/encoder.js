// AIGA - Audio Encoder
// Converts AudioBuffer to downloadable file formats (WAV, MP3)

/**
 * Encode AudioBuffer to WAV format
 * @param {AudioBuffer} buffer - The audio buffer to encode
 * @returns {Blob} WAV file as a Blob
 */
export function encodeWAV(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  // Interleave channels
  const length = buffer.length;
  const interleaved = new Float32Array(length * numChannels);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      interleaved[i * numChannels + channel] = channelData[i];
    }
  }
  
  // Convert to 16-bit PCM
  const dataLength = interleaved.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Write a string to a DataView
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Trigger download of a Blob
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export to MIDI format (note events only)
 * @param {Array} events - Compiled audio events
 * @param {number} bpm - Tempo
 * @returns {Blob} MIDI file as a Blob
 */
export function encodeMIDI(events, bpm) {
  const ticksPerBeat = 480;
  const tracks = [];
  
  // Track 0: Tempo track
  const tempoTrack = [];
  // Tempo meta event: FF 51 03 tttttt (microseconds per beat)
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  tempoTrack.push({
    deltaTime: 0,
    data: [0xFF, 0x51, 0x03, 
      (microsecondsPerBeat >> 16) & 0xFF,
      (microsecondsPerBeat >> 8) & 0xFF,
      microsecondsPerBeat & 0xFF]
  });
  // End of track
  tempoTrack.push({ deltaTime: 0, data: [0xFF, 0x2F, 0x00] });
  tracks.push(tempoTrack);
  
  // Track 1: Note events
  const noteTrack = [];
  
  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => a.time - b.time);
  
  // Convert to MIDI events
  let lastTick = 0;
  for (const event of sortedEvents) {
    const tick = Math.round(event.time / (60 / bpm) * ticksPerBeat);
    const deltaTime = tick - lastTick;
    lastTick = tick;
    
    // Convert frequency to MIDI note number
    const midiNote = Math.round(12 * Math.log2(event.freq / 440) + 69);
    const clampedNote = Math.max(0, Math.min(127, midiNote));
    
    // Velocity from gain (0-127)
    const velocity = Math.max(1, Math.min(127, Math.round((event.gain || 0.5) * 127)));
    
    // Note On (channel 0)
    noteTrack.push({
      deltaTime: deltaTime,
      data: [0x90, clampedNote, velocity]
    });
    
    // Note duration - estimate from waves or default
    let noteDuration = 0.4;
    if (event.waves && event.waves.length > 0) {
      const maxDecay = Math.max(...event.waves.map(w => (w.attack || 0.01) + (w.decay || 0.4)));
      noteDuration = maxDecay;
    }
    
    const durationTicks = Math.round(noteDuration / (60 / bpm) * ticksPerBeat);
    
    // Note Off
    noteTrack.push({
      deltaTime: durationTicks,
      data: [0x80, clampedNote, 0]
    });
    
    lastTick += durationTicks;
  }
  
  // End of track
  noteTrack.push({ deltaTime: 0, data: [0xFF, 0x2F, 0x00] });
  tracks.push(noteTrack);
  
  // Build MIDI file
  const midiData = buildMIDIFile(tracks, ticksPerBeat);
  return new Blob([midiData], { type: 'audio/midi' });
}

/**
 * Build a MIDI file from tracks
 */
function buildMIDIFile(tracks, ticksPerBeat) {
  const chunks = [];
  
  // Header chunk
  const headerChunk = new Uint8Array(14);
  const headerView = new DataView(headerChunk.buffer);
  
  // MThd
  headerChunk[0] = 0x4D; headerChunk[1] = 0x54;
  headerChunk[2] = 0x68; headerChunk[3] = 0x64;
  // Chunk length (6)
  headerView.setUint32(4, 6, false);
  // Format (1 = multiple tracks)
  headerView.setUint16(8, 1, false);
  // Number of tracks
  headerView.setUint16(10, tracks.length, false);
  // Ticks per beat
  headerView.setUint16(12, ticksPerBeat, false);
  
  chunks.push(headerChunk);
  
  // Track chunks
  for (const track of tracks) {
    const trackData = [];
    
    for (const event of track) {
      // Write variable-length delta time
      trackData.push(...encodeVariableLength(event.deltaTime));
      // Write event data
      trackData.push(...event.data);
    }
    
    const trackBytes = new Uint8Array(trackData);
    const trackChunk = new Uint8Array(8 + trackBytes.length);
    const trackView = new DataView(trackChunk.buffer);
    
    // MTrk
    trackChunk[0] = 0x4D; trackChunk[1] = 0x54;
    trackChunk[2] = 0x72; trackChunk[3] = 0x6B;
    // Chunk length
    trackView.setUint32(4, trackBytes.length, false);
    // Track data
    trackChunk.set(trackBytes, 8);
    
    chunks.push(trackChunk);
  }
  
  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

/**
 * Encode a number as MIDI variable-length quantity
 */
function encodeVariableLength(value) {
  if (value < 0) value = 0;
  
  const bytes = [];
  bytes.unshift(value & 0x7F);
  value >>= 7;
  
  while (value > 0) {
    bytes.unshift((value & 0x7F) | 0x80);
    value >>= 7;
  }
  
  return bytes;
}
