import * as state from '../core/state.js';
import { midiService } from '../io/midi.js';
import { SCALES } from '../core/constants.js';

export function initSettingsUI() {
  const modal = document.getElementById('settings-modal');
  const btn = document.getElementById('settingsBtn');
  const closeBtn = modal.querySelector('.close-modal');
  
  // Inputs
  const rootSelect = document.getElementById('setting-root');
  const scaleSelect = document.getElementById('setting-scale');
  const gravityInput = document.getElementById('setting-gravity');
  const midiOutSelect = document.getElementById('setting-midi-out');
  const refreshMidiBtn = document.getElementById('refresh-midi-btn');
  const midiClockCheck = document.getElementById('setting-midi-clock');

  // Open Modal
  btn.onclick = function() {
    modal.style.display = "block";
    syncValues();
    refreshMidiDevices();
  }

  // Close Modal
  closeBtn.onclick = function() {
    modal.style.display = "none";
  }

  // Sync UI with State
  function syncValues() {
    rootSelect.value = state.projectMeta.rootNote;
    scaleSelect.value = state.projectMeta.scale;
    gravityInput.value = state.projectMeta.gravity;
    midiClockCheck.checked = state.projectMeta.midiClock;
    
    // MIDI Output selection is handled by refreshMidiDevices
  }

  // Event Listeners
  rootSelect.onchange = () => {
    const root = parseInt(rootSelect.value);
    state.projectMeta.rootNote = root;
    state.setMusicalContext({ root: root });
    state.setDirty(true);
  };

  scaleSelect.onchange = () => {
    const scaleName = scaleSelect.value;
    state.projectMeta.scale = scaleName;
    if (SCALES[scaleName]) {
      state.setMusicalContext({ scale: SCALES[scaleName] });
    }
    state.setDirty(true);
  };

  gravityInput.onchange = () => {
    const g = parseFloat(gravityInput.value);
    state.projectMeta.gravity = g;
    state.globalSettings.gravityConstant = g;
    state.setDirty(true);
  };

  midiOutSelect.onchange = () => {
    const deviceId = midiOutSelect.value;
    midiService.setOutput(deviceId);
    state.projectMeta.midiOutputId = deviceId;
    state.setDirty(true);
  };

  midiClockCheck.onchange = () => {
    state.projectMeta.midiClock = midiClockCheck.checked;
    state.setDirty(true);
  };

  refreshMidiBtn.onclick = refreshMidiDevices;

  function refreshMidiDevices() {
    const outputs = midiService.getOutputs();
    
    // Save current selection
    const currentId = state.projectMeta.midiOutputId;
    
    midiOutSelect.innerHTML = '<option value="">None</option>';
    
    outputs.forEach(output => {
      const option = document.createElement('option');
      option.value = output.id;
      option.textContent = output.name;
      if (output.id === currentId) {
        option.selected = true;
      }
      midiOutSelect.appendChild(option);
    });
  }
}
