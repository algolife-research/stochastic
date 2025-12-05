// AIGA - Property Panel

import * as state from '../core/state.js';
import { NOTE_NAMES } from '../core/constants.js';
import { getDefaultPropsForType } from '../graph/nodes.js';

/**
 * Generate property HTML for a node type (reusable for standalone and tunnel sub-nodes)
 * Uses getDefaultPropsForType() as the single source of truth for default values.
 * @param {string} type - The node type
 * @param {Object} props - The node's properties
 * @param {Object} options - Options: { isTunnel: boolean, idx: number }
 */
function buildNodePropsHtml(type, props, options = {}) {
  const { isTunnel = false, idx = 0 } = options;
  const defaults = getDefaultPropsForType(type);
  
  // Helper to get prop value with fallback to default
  const val = (propName) => props[propName] !== undefined ? props[propName] : defaults[propName];
  
  // For tunnel sub-nodes, use class and data attributes; for standalone use id
  const attr = (propName) => isTunnel 
    ? `class="tunnel-prop" data-idx="${idx}" data-prop="${propName}"`
    : `id="prop-${propName}"`;
  
  let html = '';
  
  if (type === 'pitch') {
    html += `
      <div class="prop-row">
        <label>Mode</label>
        <select ${attr('mode')}>
          <option value="shift" ${val('mode') !== 'fixed' ? 'selected' : ''}>Shift (+/-)</option>
          <option value="fixed" ${val('mode') === 'fixed' ? 'selected' : ''}>Fixed Note</option>
        </select>
      </div>
    `;
    
    if (val('mode') === 'fixed') {
      html += `
        <div class="prop-row">
          <label>Note</label>
          <select ${attr('fixedNote')}>
            ${NOTE_NAMES.map((n, i) => `<option value="${i}" ${val('fixedNote') === i ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      `;
    } else {
      html += `
        <div class="prop-row">
          <label>Shift (Semitones)</label>
          <input type="number" ${attr('shift')} value="${val('shift')}" min="-12" max="12" step="1">
        </div>
      `;
    }
  } else if (type === 'gate') {
    html += `
      <div class="prop-row">
        <label>Open Prob.</label>
        <input type="number" ${attr('prob')} value="${val('prob')}" min="0" max="1" step="0.1">
      </div>
    `;
  } else if (type === 'gain') {
    html += `
      <div class="prop-row">
        <label>Multiplier</label>
        <input type="number" ${attr('value')} value="${val('value')}" min="0" max="4" step="0.1">
      </div>
    `;
  } else if (type === 'delay') {
    html += `
      <div class="prop-row">
        <label>Delay (Beats)</label>
        <input type="number" ${attr('delayTime')} value="${val('delayTime')}" min="0.25" max="8" step="0.25">
      </div>
    `;
  } else if (type === 'filter') {
    html += `
      <div class="prop-row">
        <label>Cutoff (Hz)</label>
        <input type="number" ${attr('cutoff')} value="${val('cutoff')}" min="100" max="20000" step="100">
      </div>
      <div class="prop-row">
        <label>Env. Mod</label>
        <input type="number" ${attr('mod')} value="${val('mod')}" min="-10000" max="10000" step="100">
      </div>
      <div class="prop-row">
        <label>Attack (s)</label>
        <input type="number" ${attr('attack')} value="${val('attack')}" min="0" max="2" step="0.01">
      </div>
      <div class="prop-row">
        <label>Decay (s)</label>
        <input type="number" ${attr('decay')} value="${val('decay')}" min="0" max="5" step="0.1">
      </div>
    `;
  } else if (type === 'noise') {
    html += `
      <div class="prop-row">
        <label>Type</label>
        <select ${attr('wave')}>
          <option value="white" ${val('wave') === 'white' ? 'selected' : ''}>White</option>
          <option value="pink" ${val('wave') === 'pink' ? 'selected' : ''}>Pink</option>
          <option value="brown" ${val('wave') === 'brown' ? 'selected' : ''}>Brown</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Attack (s)</label>
        <input type="number" ${attr('attack')} value="${val('attack')}" min="0.01" max="2" step="0.01">
      </div>
      <div class="prop-row">
        <label>Decay (s)</label>
        <input type="number" ${attr('decay')} value="${val('decay')}" min="0.1" max="5" step="0.1">
      </div>
      <div class="prop-row">
        <label>Mix Level</label>
        <input type="number" ${attr('mix')} value="${val('mix')}" min="0" max="1" step="0.05">
      </div>
    `;
  } else if (type === 'polariser') {
    html += `
      <div class="prop-row">
        <label>Wave</label>
        <select ${attr('wave')}>
          <option value="sine" ${val('wave') === 'sine' ? 'selected' : ''}>Sine</option>
          <option value="square" ${val('wave') === 'square' ? 'selected' : ''}>Square</option>
          <option value="sawtooth" ${val('wave') === 'sawtooth' ? 'selected' : ''}>Saw</option>
          <option value="triangle" ${val('wave') === 'triangle' ? 'selected' : ''}>Tri</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Attack (s)</label>
        <input type="number" ${attr('attack')} value="${val('attack')}" min="0.01" max="2" step="0.01">
      </div>
      <div class="prop-row">
        <label>Decay (s)</label>
        <input type="number" ${attr('decay')} value="${val('decay')}" min="0.1" max="5" step="0.1">
      </div>
      <div class="prop-row">
        <label>Mix Level</label>
        <input type="number" ${attr('mix')} value="${val('mix')}" min="0" max="1" step="0.05">
      </div>
    `;
  } else if (type === 'harmonic') {
    html += `
      <div class="prop-row">
        <label>Ratio</label>
        <input type="number" ${attr('ratio')} value="${val('ratio')}" min="1" max="16" step="0.5">
      </div>
      <div class="prop-row">
        <label>Wave</label>
        <select ${attr('wave')}>
          <option value="sine" ${val('wave') === 'sine' ? 'selected' : ''}>Sine</option>
          <option value="triangle" ${val('wave') === 'triangle' ? 'selected' : ''}>Tri</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Attack (s)</label>
        <input type="number" ${attr('attack')} value="${val('attack')}" min="0.01" max="2" step="0.01">
      </div>
      <div class="prop-row">
        <label>Decay (s)</label>
        <input type="number" ${attr('decay')} value="${val('decay')}" min="0.1" max="5" step="0.1">
      </div>
      <div class="prop-row">
        <label>Mix Level</label>
        <input type="number" ${attr('mix')} value="${val('mix')}" min="0" max="1" step="0.05">
      </div>
    `;
  } else if (type === 'modulator') {
    html += `
      <div class="prop-row">
        <label>Rate (Hz)</label>
        <input type="number" ${attr('rate')} value="${val('rate')}" min="0.5" max="15" step="0.5">
      </div>
      <div class="prop-row">
        <label>Depth (cents)</label>
        <input type="number" ${attr('depth')} value="${val('depth')}" min="0" max="100" step="5">
      </div>
      <div class="prop-row">
        <label>Delay (s)</label>
        <input type="number" ${attr('delay')} value="${val('delay')}" min="0" max="2" step="0.05">
      </div>
    `;
  } else if (type === 'quantizer') {
    html += `
      <div class="prop-row">
        <label>Strength</label>
        <input type="number" ${attr('strength')} value="${val('strength')}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Use Global Key</label>
        <select ${attr('useGlobalKey')}>
          <option value="true" ${val('useGlobalKey') !== false ? 'selected' : ''}>Yes</option>
          <option value="false" ${val('useGlobalKey') === false ? 'selected' : ''}>No</option>
        </select>
      </div>
    `;
  } else if (type === 'lfo') {
    html += `
      <div class="prop-row">
        <label>Rate (Hz)</label>
        <input type="number" ${attr('rate')} value="${val('rate')}" min="0.1" max="20" step="0.1">
      </div>
      <div class="prop-row">
        <label>Shape</label>
        <select ${attr('shape')}>
          <option value="sine" ${val('shape') === 'sine' ? 'selected' : ''}>Sine</option>
          <option value="triangle" ${val('shape') === 'triangle' ? 'selected' : ''}>Triangle</option>
          <option value="square" ${val('shape') === 'square' ? 'selected' : ''}>Square</option>
          <option value="sawtooth" ${val('shape') === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Min</label>
        <input type="number" ${attr('min')} value="${val('min')}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Max</label>
        <input type="number" ${attr('max')} value="${val('max')}" min="0" max="1" step="0.1">
      </div>
    `;
  } else if (type === 'speaker') {
    html += `
      <div class="prop-row">
        <label>Volume</label>
        <input type="number" ${attr('volume')} value="${val('volume')}" min="0" max="2" step="0.1">
      </div>
      <div class="prop-row">
        <label>Reverb</label>
        <input type="number" ${attr('reverb')} value="${val('reverb')}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Pan</label>
        <input type="number" ${attr('pan')} value="${val('pan')}" min="-1" max="1" step="0.1">
      </div>
    `;
  }
  
  return html;
}

/**
 * Update the property panel for a node, annotation, or region
 * @param {Object} node - The node to show (null if showing annotation/region/edge)
 * @param {string} type - Optional type: 'annotation', 'region', or 'edge'
 * @param {Object} obj - The annotation, region, or edge object
 */
export function updatePropPanel(node, type = null, obj = null) {
  const panel = document.getElementById('prop-content');
  
  // Handle annotations
  if (type === 'annotation' && obj) {
    panel.innerHTML = buildAnnotationPanel(obj);
    setupAnnotationListeners(obj);
    return;
  }
  
  // Handle regions
  if (type === 'region' && obj) {
    panel.innerHTML = buildRegionPanel(obj);
    setupRegionListeners(obj);
    return;
  }
  
  // Handle edges
  if (type === 'edge' && obj) {
    panel.innerHTML = buildEdgePanel(obj);
    setupEdgeListeners(obj);
    return;
  }
  
  if (!node) {
    panel.innerHTML = 'Right-click to add nodes<br><small>Double-click to add text</small>';
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
      <div class="prop-row">
        <label>Intensity</label>
        <input type="number" id="prop-intensity" value="${node.props.intensity !== undefined ? node.props.intensity : 0.5}" min="0" max="1" step="0.1">
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
      <div class="prop-row">
        <label>Mass (Gravity)</label>
        <input type="number" id="prop-mass" value="${node.props.mass !== undefined ? node.props.mass : 1.0}" min="0" max="10" step="0.5">
      </div>
      <div class="prop-row" style="font-size: 10px; color: #888;">
        Higher mass slows nearby packets (requires gravity > 0 in settings)
      </div>
    `;
  } else if (node.type === 'delay') {
    html += `
      <div class="prop-row">
        <label>Delay (Beats)</label>
        <input type="number" id="prop-delay" value="${node.props.delayTime}" min="0.25" max="8" step="0.25">
      </div>
    `;
  } else if (node.type === 'filter') {
    html += `
      <div class="prop-row">
        <label>Cutoff (Hz)</label>
        <input type="number" id="prop-cutoff" value="${node.props.cutoff}" min="100" max="20000" step="100">
      </div>
      <div class="prop-row">
        <label>Env. Mod</label>
        <input type="number" id="prop-mod" value="${node.props.mod !== undefined ? node.props.mod : 0}" min="-10000" max="10000" step="100">
      </div>
      <div class="prop-row">
        <label>Attack (s)</label>
        <input type="number" id="prop-attack" value="${node.props.attack !== undefined ? node.props.attack : 0}" min="0" max="2" step="0.01">
      </div>
      <div class="prop-row">
        <label>Decay (s)</label>
        <input type="number" id="prop-decay" value="${node.props.decay !== undefined ? node.props.decay : 0}" min="0" max="5" step="0.1">
      </div>
    `;
  } else if (node.type === 'noise') {
    html += `
      <div class="prop-row">
        <label>Type</label>
        <select id="prop-wave">
          <option value="white" ${node.props.wave === 'white' ? 'selected' : ''}>White</option>
          <option value="pink" ${node.props.wave === 'pink' ? 'selected' : ''}>Pink</option>
          <option value="brown" ${node.props.wave === 'brown' ? 'selected' : ''}>Brown</option>
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
      <div class="prop-row">
        <label>Mix Level</label>
        <input type="number" id="prop-mix" value="${node.props.mix !== undefined ? node.props.mix : 0.2}" min="0" max="1" step="0.05">
      </div>
      <div class="waveform-preview">
        <canvas id="waveform-canvas" width="190" height="60"></canvas>
      </div>
    `;
  } else if (node.type === 'speaker') {
    html += `
      <div class="prop-row">
        <label>Volume</label>
        <input type="number" id="prop-volume" value="${node.props.volume !== undefined ? node.props.volume : 1.0}" min="0" max="2" step="0.1">
      </div>
      <div class="prop-row">
        <label>Reverb Send</label>
        <input type="number" id="prop-reverb" value="${node.props.reverb}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Pan (L/R)</label>
        <input type="number" id="prop-pan" value="${node.props.pan !== undefined ? node.props.pan : 0}" min="-1" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Hold Time (s)</label>
        <input type="number" id="prop-hold" value="${node.props.holdTime !== undefined ? node.props.holdTime : 0}" min="0" max="5" step="0.1">
      </div>
      <div class="prop-row">
        <label>Release (s)</label>
        <input type="number" id="prop-release" value="${node.props.releaseTime !== undefined ? node.props.releaseTime : 0.1}" min="0.01" max="5" step="0.1">
      </div>
    `;
  } else if (node.type === 'modulator') {
    html += `
      <div class="prop-row">
        <label>Rate (Hz)</label>
        <input type="number" id="prop-mod-rate" value="${node.props.rate !== undefined ? node.props.rate : 5}" min="0.5" max="15" step="0.5">
      </div>
      <div class="prop-row">
        <label>Depth (cents)</label>
        <input type="number" id="prop-mod-depth" value="${node.props.depth !== undefined ? node.props.depth : 20}" min="0" max="100" step="5">
      </div>
      <div class="prop-row">
        <label>Delay (s)</label>
        <input type="number" id="prop-mod-delay" value="${node.props.delay !== undefined ? node.props.delay : 0.2}" min="0" max="2" step="0.05">
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
      <div class="prop-row">
        <label>Mix Level</label>
        <input type="number" id="prop-mix" value="${node.props.mix !== undefined ? node.props.mix : 1.0}" min="0" max="1" step="0.05">
      </div>
      <div class="waveform-preview">
        <canvas id="waveform-canvas" width="190" height="60"></canvas>
      </div>
    `;
  } else if (node.type === 'harmonic') {
    html += `
      <div class="prop-row">
        <label>Ratio</label>
        <input type="number" id="prop-ratio" value="${node.props.ratio !== undefined ? node.props.ratio : 2}" min="1" max="16" step="0.5">
      </div>
      <div class="prop-row">
        <label>Wave</label>
        <select id="prop-wave">
          <option value="sine" ${node.props.wave === 'sine' ? 'selected' : ''}>Sine</option>
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
      <div class="prop-row">
        <label>Mix Level</label>
        <input type="number" id="prop-mix" value="${node.props.mix !== undefined ? node.props.mix : 0.5}" min="0" max="1" step="0.05">
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
    
    // Show properties for each sub-node using the generic function
    subNodes.forEach((subNode, idx) => {
      html += `<div class="prop-section"><div class="prop-label">${idx + 1}. ${subNode.type.toUpperCase()}</div>`;
      
      // Use the generic buildNodePropsHtml for all sub-node types
      html += buildNodePropsHtml(subNode.type, subNode.props, { isTunnel: true, idx });
      
      // Add remove button for each sub-node
      html += `<button class="tunnel-remove-btn" data-idx="${idx}" style="width: 100%; margin-top: 4px; padding: 4px; font-size: 11px;">Remove</button>`;
      
      html += `</div>`;
    });
    
    // Add sub-node dropdown
    html += `
      <div class="prop-row" style="margin-top: 10px;">
        <label>Add</label>
        <select id="tunnel-add-subnode" style="flex: 1;">
          <option value="">Select type...</option>
          <option value="pitch">Pitch</option>
          <option value="polariser">Polariser</option>
          <option value="noise">Noise</option>
          <option value="filter">Filter</option>
          <option value="gate">Gate</option>
          <option value="gain">Gain</option>
          <option value="delay">Delay</option>
          <option value="harmonic">Harmonic</option>
          <option value="modulator">Modulator</option>
          <option value="speaker">Speaker</option>
        </select>
      </div>
    `;
  } else if (node.type === 'teleporter') {
    // Find all existing channels
    const allChannels = [...new Set(state.nodes.filter(n => n.type === 'teleporter').map(n => n.props.channel))].sort();
    const linkedCount = state.nodes.filter(n => n.type === 'teleporter' && n.id !== node.id && n.props.channel === node.props.channel).length;
    
    html += `
      <div class="prop-row">
        <label>Channel</label>
        <select id="prop-channel">
          ${allChannels.map(ch => `<option value="${ch}" ${node.props.channel === ch ? 'selected' : ''}>${ch}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row">
        <label>Linked</label>
        <span style="font-size: 11px;">${linkedCount} other teleporter${linkedCount !== 1 ? 's' : ''} on channel ${node.props.channel}</span>
      </div>
    `;
  } else if (node.type === 'quantizer') {
    html += `
      <div class="prop-row">
        <label>Strength</label>
        <input type="number" id="prop-strength" value="${node.props.strength !== undefined ? node.props.strength : 1.0}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Use Global Key</label>
        <select id="prop-use-global">
          <option value="true" ${node.props.useGlobalKey !== false ? 'selected' : ''}>Yes</option>
          <option value="false" ${node.props.useGlobalKey === false ? 'selected' : ''}>No</option>
        </select>
      </div>
      <div class="prop-row" style="margin-top: 8px; font-size: 10px; color: #888;">
        Snaps pitches to the global key/scale set in settings
      </div>
    `;
  } else if (node.type === 'lfo') {
    html += `
      <div class="prop-row">
        <label>Rate (Hz)</label>
        <input type="number" id="prop-lfo-rate" value="${node.props.rate !== undefined ? node.props.rate : 1}" min="0.1" max="20" step="0.1">
      </div>
      <div class="prop-row">
        <label>Shape</label>
        <select id="prop-lfo-shape">
          <option value="sine" ${node.props.shape === 'sine' ? 'selected' : ''}>Sine</option>
          <option value="triangle" ${node.props.shape === 'triangle' ? 'selected' : ''}>Triangle</option>
          <option value="square" ${node.props.shape === 'square' ? 'selected' : ''}>Square</option>
          <option value="sawtooth" ${node.props.shape === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Min Value</label>
        <input type="number" id="prop-lfo-min" value="${node.props.min !== undefined ? node.props.min : 0}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row">
        <label>Max Value</label>
        <input type="number" id="prop-lfo-max" value="${node.props.max !== undefined ? node.props.max : 1}" min="0" max="1" step="0.1">
      </div>
      <div class="prop-row" style="margin-top: 8px; font-size: 10px; color: #888;">
        LFO modulates connected node parameters via CV edges
      </div>
    `;
  }

  panel.innerHTML = html;

  // Attach Listeners
  attachPropListeners(node);
  
  // Draw initial waveform preview for polariser or noise
  if (node.type === 'polariser' || node.type === 'noise') {
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

  const intensityInput = document.getElementById('prop-intensity');
  if (intensityInput) intensityInput.addEventListener('change', e => node.props.intensity = parseFloat(e.target.value));

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

  const massInput = document.getElementById('prop-mass');
  if (massInput) massInput.addEventListener('change', e => node.props.mass = parseFloat(e.target.value));

  const delayInput = document.getElementById('prop-delay');
  if (delayInput) delayInput.addEventListener('change', e => node.props.delayTime = parseFloat(e.target.value));

  const cutoffInput = document.getElementById('prop-cutoff');
  if (cutoffInput) cutoffInput.addEventListener('change', e => node.props.cutoff = parseFloat(e.target.value));

  const modInput = document.getElementById('prop-mod');
  if (modInput) modInput.addEventListener('change', e => node.props.mod = parseFloat(e.target.value));

  const ratioInput = document.getElementById('prop-ratio');
  if (ratioInput) ratioInput.addEventListener('change', e => node.props.ratio = parseFloat(e.target.value));

  const reverbInput = document.getElementById('prop-reverb');
  if (reverbInput) reverbInput.addEventListener('change', e => node.props.reverb = parseFloat(e.target.value));

  const volumeInput = document.getElementById('prop-volume');
  if (volumeInput) volumeInput.addEventListener('change', e => node.props.volume = parseFloat(e.target.value));

  const panInput = document.getElementById('prop-pan');
  if (panInput) panInput.addEventListener('change', e => node.props.pan = parseFloat(e.target.value));

  const holdInput = document.getElementById('prop-hold');
  if (holdInput) holdInput.addEventListener('change', e => node.props.holdTime = parseFloat(e.target.value));

  const releaseInput = document.getElementById('prop-release');
  if (releaseInput) releaseInput.addEventListener('change', e => node.props.releaseTime = parseFloat(e.target.value));

  const modRateInput = document.getElementById('prop-mod-rate');
  if (modRateInput) modRateInput.addEventListener('change', e => node.props.rate = parseFloat(e.target.value));

  const modDepthInput = document.getElementById('prop-mod-depth');
  if (modDepthInput) modDepthInput.addEventListener('change', e => node.props.depth = parseFloat(e.target.value));

  const modDelayInput = document.getElementById('prop-mod-delay');
  if (modDelayInput) modDelayInput.addEventListener('change', e => node.props.delay = parseFloat(e.target.value));

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
        if (prop === 'wave' || prop === 'mode') {
          subNode.props[prop] = e.target.value;
          // Re-render panel if mode changed (to show/hide shift vs fixedNote)
          if (prop === 'mode') {
            updatePropPanel(node);
          }
        } else if (prop === 'fixedNote') {
          subNode.props[prop] = parseInt(e.target.value);
        } else {
          subNode.props[prop] = parseFloat(e.target.value);
        }
      }
    });
  });
  
  // Tunnel add sub-node
  const addSubNodeSelect = document.getElementById('tunnel-add-subnode');
  if (addSubNodeSelect) {
    addSubNodeSelect.addEventListener('change', e => {
      const type = e.target.value;
      if (!type) return;
      
      // Use getDefaultPropsForType as single source of truth
      if (!node.props.subNodes) node.props.subNodes = [];
      node.props.subNodes.push({ type, props: { ...getDefaultPropsForType(type) } });
      updatePropPanel(node); // Re-render panel
    });
  }
  
  // Tunnel remove sub-node buttons
  document.querySelectorAll('.tunnel-remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = parseInt(e.target.dataset.idx);
      if (node.props.subNodes && node.props.subNodes[idx]) {
        node.props.subNodes.splice(idx, 1);
        updatePropPanel(node); // Re-render panel
      }
    });
  });
  
  // Teleporter channel
  const channelInput = document.getElementById('prop-channel');
  if (channelInput) {
    channelInput.addEventListener('change', e => {
      node.props.channel = e.target.value;
      updatePropPanel(node); // Re-render to update linked count
    });
  }
  
  // Quantizer properties
  const strengthInput = document.getElementById('prop-strength');
  if (strengthInput) {
    strengthInput.addEventListener('change', e => {
      node.props.strength = parseFloat(e.target.value);
    });
  }
  
  const useGlobalInput = document.getElementById('prop-use-global');
  if (useGlobalInput) {
    useGlobalInput.addEventListener('change', e => {
      node.props.useGlobalKey = e.target.value === 'true';
    });
  }
  
  // LFO properties
  const lfoRateInput = document.getElementById('prop-lfo-rate');
  if (lfoRateInput) {
    lfoRateInput.addEventListener('change', e => {
      node.props.rate = parseFloat(e.target.value);
    });
  }
  
  const lfoShapeInput = document.getElementById('prop-lfo-shape');
  if (lfoShapeInput) {
    lfoShapeInput.addEventListener('change', e => {
      node.props.shape = e.target.value;
    });
  }
  
  const lfoMinInput = document.getElementById('prop-lfo-min');
  if (lfoMinInput) {
    lfoMinInput.addEventListener('change', e => {
      node.props.min = parseFloat(e.target.value);
    });
  }
  
  const lfoMaxInput = document.getElementById('prop-lfo-max');
  if (lfoMaxInput) {
    lfoMaxInput.addEventListener('change', e => {
      node.props.max = parseFloat(e.target.value);
    });
  }
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
      case 'white':
      case 'pink':
      case 'brown':
        waveVal = (Math.random() * 2) - 1;
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

/**
 * Build HTML for annotation property panel
 */
function buildAnnotationPanel(annotation) {
  return `
    <div class="prop-row">
      <label>Type</label>
      <span>ANNOTATION</span>
    </div>
    <div class="prop-row">
      <label>Text</label>
      <textarea id="prop-ann-text" rows="3" style="width: 100%; resize: vertical;">${annotation.text}</textarea>
    </div>
    <div class="prop-row">
      <label>Font Size</label>
      <input type="number" id="prop-ann-fontsize" value="${annotation.fontSize || 14}" min="8" max="72" step="1">
    </div>
    <div class="prop-row">
      <label>Color</label>
      <input type="color" id="prop-ann-color" value="${annotation.color || '#cccccc'}" style="width: 100%;">
    </div>
    <div class="prop-row">
      <label>Position</label>
      <span>X: ${Math.round(annotation.x)}, Y: ${Math.round(annotation.y)}</span>
    </div>
  `;
}

/**
 * Setup event listeners for annotation panel
 */
function setupAnnotationListeners(annotation) {
  setTimeout(() => {
    const textInput = document.getElementById('prop-ann-text');
    const fontSizeInput = document.getElementById('prop-ann-fontsize');
    const colorInput = document.getElementById('prop-ann-color');
    
    if (textInput) {
      textInput.addEventListener('input', () => {
        annotation.text = textInput.value;
      });
    }
    
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', () => {
        annotation.fontSize = parseInt(fontSizeInput.value);
      });
    }
    
    if (colorInput) {
      colorInput.addEventListener('input', () => {
        annotation.color = colorInput.value;
      });
    }
  }, 0);
}

/**
 * Build HTML for region property panel
 */
function buildRegionPanel(region) {
  return `
    <div class="prop-row">
      <label>Type</label>
      <span>REGION</span>
    </div>
    <div class="prop-row">
      <label>Name</label>
      <input type="text" id="prop-region-name" value="${region.name || ''}" style="width: 100%;">
    </div>
    <div class="prop-row">
      <label>Description</label>
      <textarea id="prop-region-desc" rows="2" style="width: 100%; resize: vertical;">${region.description || ''}</textarea>
    </div>
    <div class="prop-row">
      <label>Color</label>
      <input type="color" id="prop-region-color" value="${rgbaToHex(region.color) || '#3c3c50'}" style="width: 100%;">
    </div>
    <div class="prop-row">
      <label>Opacity</label>
      <input type="range" id="prop-region-opacity" value="${getOpacityFromRgba(region.color) * 100}" min="10" max="80" step="5" style="width: 100%;">
    </div>
    <div class="prop-row">
      <label>Size</label>
      <span>${Math.round(region.width)} × ${Math.round(region.height)}</span>
    </div>
    <div class="prop-row">
      <button id="prop-region-duplicate" style="width: 100%; padding: 6px;">Duplicate Region</button>
    </div>
  `;
}

/**
 * Convert rgba string to hex (for color input)
 */
function rgbaToHex(rgba) {
  if (!rgba || !rgba.startsWith('rgba')) return '#3c3c50';
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#3c3c50';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Get opacity from rgba string
 */
function getOpacityFromRgba(rgba) {
  if (!rgba || !rgba.startsWith('rgba')) return 0.3;
  const match = rgba.match(/rgba?\([^)]*,\s*([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 0.3;
}

/**
 * Convert hex + opacity to rgba
 */
function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Setup event listeners for region panel
 */
function setupRegionListeners(region) {
  // Import duplicateRegion dynamically to avoid circular dependency
  setTimeout(async () => {
    const nameInput = document.getElementById('prop-region-name');
    const descInput = document.getElementById('prop-region-desc');
    const colorInput = document.getElementById('prop-region-color');
    const opacityInput = document.getElementById('prop-region-opacity');
    const duplicateBtn = document.getElementById('prop-region-duplicate');
    
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        region.name = nameInput.value;
      });
    }
    
    if (descInput) {
      descInput.addEventListener('input', () => {
        region.description = descInput.value;
      });
    }
    
    if (colorInput) {
      colorInput.addEventListener('input', () => {
        const opacity = getOpacityFromRgba(region.color);
        region.color = hexToRgba(colorInput.value, opacity);
      });
    }
    
    if (opacityInput) {
      opacityInput.addEventListener('input', () => {
        const hex = rgbaToHex(region.color);
        region.color = hexToRgba(hex, opacityInput.value / 100);
      });
    }
    
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', async () => {
        const { duplicateRegion } = await import('./input.js');
        duplicateRegion(region);
      });
    }
  }, 0);
}

/**
 * Build HTML for edge property panel
 */
function buildEdgePanel(edge) {
  const fromNode = state.nodes.find(n => n.id === edge.from);
  const toNode = state.nodes.find(n => n.id === edge.to);
  const fromName = fromNode ? `${fromNode.type} (${fromNode.id.substr(0,4)})` : 'Unknown';
  const toName = toNode ? `${toNode.type} (${toNode.id.substr(0,4)})` : 'Unknown';
  
  // Get available target parameters for modulation
  const targetParams = getModulatableParams(toNode);
  
  return `
    <div class="prop-row">
      <label>Type</label>
      <span>EDGE</span>
    </div>
    <div class="prop-row">
      <label>From</label>
      <span style="font-size: 11px;">${fromName}</span>
    </div>
    <div class="prop-row">
      <label>To</label>
      <span style="font-size: 11px;">${toName}</span>
    </div>
    <div class="prop-row" style="margin-top: 10px;">
      <label>Timing Mode</label>
      <select id="prop-edge-timing">
        <option value="physical" ${edge.timingMode !== 'fixed' ? 'selected' : ''}>Physical (distance-based)</option>
        <option value="fixed" ${edge.timingMode === 'fixed' ? 'selected' : ''}>Fixed (beat-based)</option>
      </select>
    </div>
    <div class="prop-row" id="edge-duration-row" style="display: ${edge.timingMode === 'fixed' ? 'flex' : 'none'};">
      <label>Duration (beats)</label>
      <input type="number" id="prop-edge-duration" value="${edge.durationBeats || 1}" min="0.25" max="16" step="0.25">
    </div>
    <div class="prop-row" style="margin-top: 10px;">
      <label>CV Target</label>
      <select id="prop-edge-target">
        <option value="" ${!edge.targetParam ? 'selected' : ''}>Audio (none)</option>
        ${targetParams.map(p => `<option value="${p.value}" ${edge.targetParam === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
    </div>
    <div class="prop-row" style="font-size: 10px; color: #888; margin-top: 5px;">
      CV Target routes modulation (from LFO) to a specific parameter instead of audio signal
    </div>
  `;
}

/**
 * Get list of modulatable parameters for a node type
 */
function getModulatableParams(node) {
  if (!node) return [];
  
  const params = [];
  
  // Common parameters
  switch (node.type) {
    case 'source':
      params.push({ value: 'intensity', label: 'Intensity' });
      params.push({ value: 'interval', label: 'Interval' });
      break;
    case 'gain':
      params.push({ value: 'value', label: 'Gain Value' });
      break;
    case 'filter':
      params.push({ value: 'cutoff', label: 'Cutoff Frequency' });
      params.push({ value: 'mod', label: 'Envelope Mod' });
      break;
    case 'gate':
      params.push({ value: 'prob', label: 'Probability' });
      break;
    case 'delay':
      params.push({ value: 'delayTime', label: 'Delay Time' });
      break;
    case 'pitch':
      params.push({ value: 'shift', label: 'Pitch Shift' });
      break;
    case 'speaker':
      params.push({ value: 'volume', label: 'Volume' });
      params.push({ value: 'pan', label: 'Pan' });
      params.push({ value: 'reverb', label: 'Reverb' });
      break;
    case 'polariser':
    case 'noise':
    case 'harmonic':
      params.push({ value: 'mix', label: 'Mix Level' });
      params.push({ value: 'attack', label: 'Attack' });
      params.push({ value: 'decay', label: 'Decay' });
      break;
    case 'modulator':
      params.push({ value: 'rate', label: 'Vibrato Rate' });
      params.push({ value: 'depth', label: 'Vibrato Depth' });
      break;
    case 'quantizer':
      params.push({ value: 'strength', label: 'Quantize Strength' });
      break;
    case 'lfo':
      params.push({ value: 'rate', label: 'LFO Rate' });
      params.push({ value: 'min', label: 'Min Value' });
      params.push({ value: 'max', label: 'Max Value' });
      break;
  }
  
  return params;
}

/**
 * Setup event listeners for edge panel
 */
function setupEdgeListeners(edge) {
  setTimeout(() => {
    const timingSelect = document.getElementById('prop-edge-timing');
    const durationInput = document.getElementById('prop-edge-duration');
    const durationRow = document.getElementById('edge-duration-row');
    const targetSelect = document.getElementById('prop-edge-target');
    
    if (timingSelect) {
      timingSelect.addEventListener('change', () => {
        edge.timingMode = timingSelect.value;
        if (durationRow) {
          durationRow.style.display = timingSelect.value === 'fixed' ? 'flex' : 'none';
        }
        if (timingSelect.value === 'fixed' && !edge.durationBeats) {
          edge.durationBeats = 1;
        }
      });
    }
    
    if (durationInput) {
      durationInput.addEventListener('change', () => {
        edge.durationBeats = parseFloat(durationInput.value);
      });
    }
    
    if (targetSelect) {
      targetSelect.addEventListener('change', () => {
        edge.targetParam = targetSelect.value || null;
      });
    }
  }, 0);
}
