export class MidiService {
  constructor() {
    this.access = null;
    this.outputs = [];
    this.selectedOutputId = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    if (!navigator.requestMIDIAccess) {
      console.warn("WebMIDI is not supported in this browser.");
      return;
    }

    try {
      this.access = await navigator.requestMIDIAccess();
      this.updateOutputs();
      
      this.access.onstatechange = (e) => {
        this.updateOutputs();
      };
      
      this.isInitialized = true;
      console.log("MIDI Service Initialized", this.outputs);
    } catch (err) {
      console.error("Could not access MIDI devices.", err);
    }
  }

  updateOutputs() {
    if (!this.access) return;
    this.outputs = Array.from(this.access.outputs.values());
    
    // Auto-select first output if none selected
    if (!this.selectedOutputId && this.outputs.length > 0) {
      this.selectedOutputId = this.outputs[0].id;
    }
  }

  getOutput() {
    if (!this.access || !this.selectedOutputId) return null;
    return this.access.outputs.get(this.selectedOutputId);
  }

  setOutput(id) {
    this.selectedOutputId = id;
  }

  sendNoteOn(note, velocity, channel = 1) {
    const output = this.getOutput();
    if (!output) return;

    // MIDI Channel is 0-15 in the protocol (1-16 in UI)
    const ch = Math.max(0, Math.min(15, channel - 1));
    const noteOnMessage = 0x90 + ch;
    
    // Ensure velocity is 0-127
    const vel = Math.max(0, Math.min(127, Math.floor(velocity)));
    const midiNote = Math.max(0, Math.min(127, Math.floor(note)));

    output.send([noteOnMessage, midiNote, vel]);
  }

  sendNoteOff(note, channel = 1) {
    const output = this.getOutput();
    if (!output) return;

    const ch = Math.max(0, Math.min(15, channel - 1));
    const noteOffMessage = 0x80 + ch;
    const midiNote = Math.max(0, Math.min(127, Math.floor(note)));

    output.send([noteOffMessage, midiNote, 0]);
  }

  sendControlChange(ccNumber, value, channel = 1) {
    const output = this.getOutput();
    if (!output) return;

    const ch = Math.max(0, Math.min(15, channel - 1));
    const ccMessage = 0xB0 + ch;
    const cc = Math.max(0, Math.min(127, Math.floor(ccNumber)));
    const val = Math.max(0, Math.min(127, Math.floor(value)));

    output.send([ccMessage, cc, val]);
  }

  sendAllNotesOff(channel = 1) {
    // CC 123 is All Notes Off
    this.sendControlChange(123, 0, channel);
  }
  
  panic() {
    // Send All Notes Off to all channels
    for (let i = 1; i <= 16; i++) {
      this.sendAllNotesOff(i);
    }
  }
}

export const midiService = new MidiService();
