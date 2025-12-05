// Phonon v2 - MIDI Encoding

export interface MIDIEvent {
  time: number;
  type: 'noteOn' | 'noteOff' | 'cc';
  channel: number;
  note?: number;
  velocity?: number;
  cc?: number;
  value?: number;
}

export function encodeMIDI(events: MIDIEvent[], bpm: number): Blob {
  // MIDI file header
  const header = new Uint8Array([
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // header length
    0x00, 0x00,             // format 0
    0x00, 0x01,             // 1 track
    0x00, 0x60,             // 96 ticks per quarter note
  ]);
  
  // Build track events
  const trackEvents: number[] = [];
  
  // Tempo event (microseconds per quarter note)
  const microsecondsPerBeat = Math.floor(60000000 / bpm);
  trackEvents.push(0x00); // delta time
  trackEvents.push(0xFF, 0x51, 0x03); // tempo meta event
  trackEvents.push((microsecondsPerBeat >> 16) & 0xFF);
  trackEvents.push((microsecondsPerBeat >> 8) & 0xFF);
  trackEvents.push(microsecondsPerBeat & 0xFF);
  
  // Convert events
  let lastTime = 0;
  for (const event of events.sort((a, b) => a.time - b.time)) {
    const deltaTime = Math.floor((event.time - lastTime) * 96); // ticks
    lastTime = event.time;
    
    writeVarLen(trackEvents, deltaTime);
    
    if (event.type === 'noteOn') {
      trackEvents.push(0x90 | event.channel, event.note || 60, event.velocity || 64);
    } else if (event.type === 'noteOff') {
      trackEvents.push(0x80 | event.channel, event.note || 60, 0);
    } else if (event.type === 'cc') {
      trackEvents.push(0xB0 | event.channel, event.cc || 0, event.value || 0);
    }
  }
  
  // End of track
  trackEvents.push(0x00, 0xFF, 0x2F, 0x00);
  
  // Track header
  const trackHeader = new Uint8Array([
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    (trackEvents.length >> 24) & 0xFF,
    (trackEvents.length >> 16) & 0xFF,
    (trackEvents.length >> 8) & 0xFF,
    trackEvents.length & 0xFF,
  ]);
  
  // Combine
  const result = new Uint8Array(header.length + trackHeader.length + trackEvents.length);
  result.set(header, 0);
  result.set(trackHeader, header.length);
  result.set(trackEvents, header.length + trackHeader.length);
  
  return new Blob([result], { type: 'audio/midi' });
}

function writeVarLen(arr: number[], value: number): void {
  if (value < 0x80) {
    arr.push(value);
  } else if (value < 0x4000) {
    arr.push(((value >> 7) & 0x7F) | 0x80);
    arr.push(value & 0x7F);
  } else if (value < 0x200000) {
    arr.push(((value >> 14) & 0x7F) | 0x80);
    arr.push(((value >> 7) & 0x7F) | 0x80);
    arr.push(value & 0x7F);
  } else {
    arr.push(((value >> 21) & 0x7F) | 0x80);
    arr.push(((value >> 14) & 0x7F) | 0x80);
    arr.push(((value >> 7) & 0x7F) | 0x80);
    arr.push(value & 0x7F);
  }
}
