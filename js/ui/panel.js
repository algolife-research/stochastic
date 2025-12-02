// AIGA - Property Panel

import * as state from '../core/state.js';
import { NOTE_NAMES } from '../core/constants.js';

/**
 * Update the property panel for a node
 */
export function updatePropPanel(node) {
  const panel = document.getElementById('prop-content');
  if (!node) {
    panel.innerHTML = 'Right-click to add nodes';
    return;
  }

  let html = `
    <div class="prop-row">
      <label>Type</label>
      <span>${node.type.toUpperCase()}</span>
    </div>
    <div class="prop-row">
      <label>ID</label>
      <span>${node.id.substr(0,4)}</span>
    </div>
  `;

  // Dynamic Properties based on Type
  if (node.type === 'source') {
    html += `
      <div class="prop-row">
        <label>Mode</label>
        <select id="prop-autotrigger">
          <option value="true" ${node.props.autoTrigger !== false ? 'selected' : ''}>Auto</option>
          <option value="false" ${node.props.autoTrigger === false ? 'selected' : ''}>Manual (Click)</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Interval (Beats)</label>
        <input type="number" id="prop-interval" value="${node.props.interval}" min="0.1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Note</label>
        <select id="prop-note">
          <option value="-1" ${node.props.noteIndex === -1 ? 'selected' : ''}>Random</option>
          ${NOTE_NAMES.map((n, i) => `<option value="${i}" ${node.props.noteIndex === i ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </div>
    `;
  } else if (node.type === 'gate') {
    html += `
      <div class="prop-row">
        <label>Open Prob.</label>
        <input type="number" id="prop-prob" value="${node.props.prob}" min="0" max="1" step="0.1">
      </div>
    `;
  } else if (node.type === 'pitch') {
    html += `
      <div class="prop-row">
        <label>Mode</label>
        <select id="prop-mode">
          <option value="shift" ${node.props.mode !== 'fixed' ? 'selected' : ''}>Shift (+/-)</option>
          <option value="fixed" ${node.props.mode === 'fixed' ? 'selected' : ''}>Fixed Note</option>
        </select>
      </div>
    `;
    
    if (node.props.mode === 'fixed') {
      html += `
        <div class="prop-row">
          <label>Note</label>
          <select id="prop-fixed-note">
            ${NOTE_NAMES.map((n, i) => `<option value="${i}" ${node.props.fixedNote === i ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      `;
    } else {
      html += `
        <div class="prop-row">
          <label>Shift (Semitones)</label>
          <input type="number" id="prop-shift" value="${node.props.shift}" min="-12" max="12" step="1">
        </div>
      `;
    }
  } else if (node.type === 'gain') {
    html += `
      <div class="prop-row">
        <label>Multiplier</label>
        <input type="number" id="prop-gain-val" value="${node.props.value}" min="0" max="4" step="0.1">
      </div>
    `;
  } else if (node.type === 'delay') {
    html += `
      <div class="prop-row">
        <label>Delay (Beats)</label>
        <input type="number" id="prop-delay" value="${node.props.delayTime}" min="0.25" max="8" step="0.25">
      </div>
    `;
  } else if (node.type === 'emitter') {
    html += `
      <div class="prop-row">
        <label>Reverb Send</label>
        <input type="number" id="prop-reverb" value="${node.props.reverb}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Pan (L/R)</label>
        <input type="number" id="prop-pan" value="${node.props.pan !== undefined ? node.props.pan : 0}" min="-1" max="1" step="0.1">
      </div>
    `;
  } else if (node.type === 'polariser') {
    html += `
      <div class="prop-row">
        <label>Wave</label>
        <select id="prop-wave">
          <option value="sine" ${node.props.wave === 'sine' ? 'selected' : ''}>Sine</option>
          <option value="square" ${node.props.wave === 'square' ? 'selected' : ''}>Square</option>
          <option value="sawtooth" ${node.props.wave === 'sawtooth' ? 'selected' : ''}>Saw</option>
          <option value="triangle" ${node.props.wave === 'triangle' ? 'selected' : ''}>Tri</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Attack (s)</label>
        <input type="number" id="prop-attack" value="${node.props.attack}" min="0.01" max="2" step="0.01">
      </div>
      <div class="prop-row">
        <label>Decay (s)</label>
        <input type="number" id="prop-decay" value="${node.props.decay}" min="0.1" max="5" step="0.1">
      </div>
      <div class="waveform-preview">
        <canvas id="waveform-canvas" width="190" height="60"></canvas>
      </div>
    `;
  } else if (node.type === 'tunnel') {
    const subNodes = node.props.subNodes || [];
    html += `
      <div class="prop-row">
        <label>Name</label>
        <input type="text" id="prop-tunnel-name" value="${node.props.tunnelName || 'Custom'}" style="width: 100px;">
      </div>
      <div class="prop-row">
        <label>Contains</label>
        <span style="font-size: 11px;">${subNodes.map(s => s.type).join(' → ') || 'Empty'}</span>
      </div>
    `;
    
    // Show properties for each sub-node
    subNodes.forEach((subNode, idx) => {
      html += `<div class="prop-section"><div class="prop-label">${idx + 1}. ${subNode.type.toUpperCase()}</div>`;
      
      if (subNode.type === 'pitch') {
        html += `
          <div class="prop-row">
            <label>Shift</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="shift" value="${subNode.props.shift || 0}" min="-12" max="12" step="1">
          </div>
        `;
      } else if (subNode.type === 'polariser') {
        html += `
          <div class="prop-row">
            <label>Wave</label>
            <select class="tunnel-prop" data-idx="${idx}" data-prop="wave">
              <option value="sine" ${subNode.props.wave === 'sine' ? 'selected' : ''}>Sine</option>
              <option value="square" ${subNode.props.wave === 'square' ? 'selected' : ''}>Square</option>
              <option value="sawtooth" ${subNode.props.wave === 'sawtooth' ? 'selected' : ''}>Saw</option>
              <option value="triangle" ${subNode.props.wave === 'triangle' ? 'selected' : ''}>Tri</option>
            </select>
          </div>
          <div class="prop-row">
            <label>Attack</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="attack" value="${subNode.props.attack || 0.01}" min="0.01" max="2" step="0.01">
          </div>
          <div class="prop-row">
            <label>Decay</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="decay" value="${subNode.props.decay || 0.4}" min="0.1" max="5" step="0.1">
          </div>
        `;
      } else if (subNode.type === 'gate') {
        html += `
          <div class="prop-row">
            <label>Prob</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="prob" value="${subNode.props.prob || 0.5}" min="0" max="1" step="0.1">
          </div>
        `;
      } else if (subNode.type === 'filter') {
        html += `
          <div class="prop-row">
            <label>Cutoff</label>
            <input type="number" class="tunnel-prop" data-idx="${idx}" data-prop="cutoff" value="${subNode.props.cutoff || 20000}" min="100" max="20000" step="100">
          </div>
        `;
      }
      
      html += `</div>`;
    });
  }

  panel.innerHTML = html;

  // Attach Listeners
  attachPropListeners(node);
  
  // Draw initial waveform preview for polariser
  if (node.type === 'polariser') {
    drawWaveformPreview(node);
  }
}

/**
 * Attach event listeners to property inputs
 */
function attachPropListeners(node) {
  const autoTriggerInput = document.getElementById('prop-autotrigger');
  if (autoTriggerInput) autoTriggerInput.addEventListener('change', e => node.props.autoTrigger = e.target.value === 'true');

  const intervalInput = document.getElementById('prop-interval');
  if (intervalInput) intervalInput.addEventListener('change', e => node.props.interval = parseFloat(e.target.value));

  const noteInput = document.getElementById('prop-note');
  if (noteInput) noteInput.addEventListener('change', e => node.props.noteIndex = parseInt(e.target.value));

  const probInput = document.getElementById('prop-prob');
  if (probInput) probInput.addEventListener('change', e => node.props.prob = parseFloat(e.target.value));

  const shiftInput = document.getElementById('prop-shift');
  if (shiftInput) shiftInput.addEventListener('change', e => node.props.shift = parseInt(e.target.value));

  const modeInput = document.getElementById('prop-mode');
  if (modeInput) modeInput.addEventListener('change', e => {
    node.props.mode = e.target.value;
    if (node.props.mode === 'fixed' && node.props.fixedNote === undefined) {
      node.props.fixedNote = 12; // Default to C4
    }
    updatePropPanel(node); // Re-render to show correct inputs
  });

  const fixedNoteInput = document.getElementById('prop-fixed-note');
  if (fixedNoteInput) fixedNoteInput.addEventListener('change', e => node.props.fixedNote = parseInt(e.target.value));

  const gainValInput = document.getElementById('prop-gain-val');
  if (gainValInput) gainValInput.addEventListener('change', e => node.props.value = parseFloat(e.target.value));

  const delayInput = document.getElementById('prop-delay');
  if (delayInput) delayInput.addEventListener('change', e => node.props.delayTime = parseFloat(e.target.value));

  const reverbInput = document.getElementById('prop-reverb');
  if (reverbInput) reverbInput.addEventListener('change', e => node.props.reverb = parseFloat(e.target.value));

  const panInput = document.getElementById('prop-pan');
  if (panInput) panInput.addEventListener('change', e => node.props.pan = parseFloat(e.target.value));

  const waveInput = document.getElementById('prop-wave');
  if (waveInput) {
    waveInput.addEventListener('change', e => {
      node.props.wave = e.target.value;
      drawWaveformPreview(node);
    });
  }

  const attackInput = document.getElementById('prop-attack');
  if (attackInput) {
    attackInput.addEventListener('change', e => {
      node.props.attack = parseFloat(e.target.value);
      drawWaveformPreview(node);
    });
  }

  const decayInput = document.getElementById('prop-decay');
  if (decayInput) {
    decayInput.addEventListener('change', e => {
      node.props.decay = parseFloat(e.target.value);
      drawWaveformPreview(node);
    });
  }
  
  // Tunnel name
  const tunnelNameInput = document.getElementById('prop-tunnel-name');
  if (tunnelNameInput) {
    tunnelNameInput.addEventListener('change', e => {
      node.props.tunnelName = e.target.value;
    });
  }
  
  // Tunnel sub-node properties
  document.querySelectorAll('.tunnel-prop').forEach(input => {
    input.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.idx);
      const prop = e.target.dataset.prop;
      const subNode = node.props.subNodes[idx];
      if (subNode) {
        if (prop === 'wave') {
          subNode.props[prop] = e.target.value;
        } else {
          subNode.props[prop] = parseFloat(e.target.value);
        }
      }
    });
  });
}

/**
 * Draw waveform preview for polariser node
 */
function drawWaveformPreview(node) {
  const canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const wave = node.props.wave || 'sine';
  const attack = node.props.attack || 0.01;
  const decay = node.props.decay || 0.4;
  const totalTime = attack + decay;
  
  // Clear
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);
  
  // Grid lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h/2);
  ctx.lineTo(w, h/2);
  ctx.stroke();
  
  // Attack/decay boundary
  const attackX = (attack / totalTime) * w;
  ctx.strokeStyle = '#444';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(attackX, 0);
  ctx.lineTo(attackX, h);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw waveform
  ctx.strokeStyle = '#bb86fc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  const cycles = 8;
  
  for (let x = 0; x < w; x++) {
    const t = x / w;
    const timePos = t * totalTime;
    
    // Calculate envelope
    let envelope;
    if (timePos < attack) {
      envelope = timePos / attack;
    } else {
      const decayT = (timePos - attack) / decay;
      envelope = Math.exp(-3 * decayT);
    }
    
    // Calculate wave value
    const phase = (x / w) * cycles * Math.PI * 2;
    let waveVal;
    switch (wave) {
      case 'sine':
        waveVal = Math.sin(phase);
        break;
      case 'square':
        waveVal = Math.sin(phase) > 0 ? 1 : -1;
        break;
      case 'sawtooth':
        waveVal = ((phase % (Math.PI * 2)) / Math.PI) - 1;
        break;
      case 'triangle':
        const p = (phase % (Math.PI * 2)) / (Math.PI * 2);
        waveVal = 4 * Math.abs(p - 0.5) - 1;
        break;
      default:
        waveVal = Math.sin(phase);
    }
    
    const y = h/2 - (waveVal * envelope * (h/2 - 4));
    
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Labels
  ctx.fillStyle = '#666';
  ctx.font = '9px Arial';
  ctx.fillText('A', 4, 12);
  ctx.fillText('D', attackX + 4, 12);
}
