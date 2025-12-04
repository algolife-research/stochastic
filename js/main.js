// AIGA - Main Entry Point

import * as state from './core/state.js';
import { MIN_SPEED, MAX_SPEED, MAX_PACKETS } from './core/constants.js';
import { initAudio, resumeAudio } from './audio/engine.js';
import { draw, resizeCanvas } from './ui/canvas.js';
import { setupInteraction } from './ui/input.js';
import { updatePropPanel } from './ui/panel.js';
import { saveGraph, loadGraph, loadData } from './io/serialization.js';
import { spawnPacket, updatePackets } from './graph/packets.js';
import { EXAMPLES } from './examples.js';
import { initExportUI } from './ui/export.js';

/**
 * Initialize the AIGA application
 */
export function initAiga() {
  // Setup canvas
  const canvas = document.getElementById('aigaCanvas');
  state.setCanvas(canvas);
  state.setCtx(canvas.getContext('2d'));
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  setupUI();
  setupInteraction();
  
  // Start main loop
  loop();
}

/**
 * Setup UI controls
 */
function setupUI() {
  // Play/Stop Button
  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', () => {
    if (!state.audioCtx) {
      initAudio();
    }
    
    resumeAudio();
    
    state.setIsRunning(!state.isRunning);
    playBtn.textContent = state.isRunning ? "⏹ Stop" : "▶ Play";
    playBtn.classList.toggle('primary', !state.isRunning);
  });
  
  // Mute Button
  const muteBtn = document.getElementById('muteBtn');
  muteBtn.addEventListener('click', () => {
    state.setIsMuted(!state.isMuted);
    muteBtn.textContent = state.isMuted ? "🔇" : "🔊";
  });
  
  // Clear Button
  document.getElementById('clearBtn').addEventListener('click', () => {
    state.clearGraph();
    updatePropPanel(null);
  });

  // Save / Load
  document.getElementById('saveBtn').addEventListener('click', saveGraph);
  document.getElementById('loadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', loadGraph);
  
  // Speed Control
  const speedInput = document.getElementById('speedInput');
  speedInput.value = state.masterSpeed;
  speedInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      state.setMasterSpeed(Math.max(MIN_SPEED, Math.min(MAX_SPEED, val)));
    }
  });
  speedInput.addEventListener('blur', (e) => {
    e.target.value = state.masterSpeed;
  });
  
  // Example Loader
  document.getElementById('exampleSelect').addEventListener('change', (e) => {
    const key = e.target.value;
    if (key && EXAMPLES[key]) {
      loadData(EXAMPLES[key]);
      e.target.value = "";
    }
  });

  // Settings Modal
  const modal = document.getElementById('settings-modal');
  const btn = document.getElementById('settingsBtn');
  const span = document.getElementsByClassName("close-modal")[0];

  btn.onclick = function() {
    modal.style.display = "block";
  }

  span.onclick = function() {
    modal.style.display = "none";
  }

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }

  // Settings Inputs
  const subInput = document.getElementById('setting-subdivisions');
  subInput.addEventListener('change', (e) => {
    state.globalSettings.subdivisions = parseInt(e.target.value);
  });

  const ppbInput = document.getElementById('setting-ppb');
  ppbInput.addEventListener('change', (e) => {
    state.globalSettings.pixelsPerBeat = parseInt(e.target.value);
  });

  // Initialize Export UI
  initExportUI();
}

/**
 * Main update loop
 */
function update() {
  if (!state.isRunning) return;
  
  const now = performance.now();
  const dt = 16; // ~60fps
  const msPerBeat = (60 / state.masterSpeed) * 1000;
  
  // Source Generation
  state.nodes.forEach(node => {
    if (node.type === 'source' && node.props.autoTrigger !== false) {
      const intervalMs = node.props.interval * msPerBeat;
      if (now - node.lastTrigger > intervalMs) {
        spawnPacket(node);
        node.lastTrigger = now;
        node.flash = 1.0;
      }
    }
    
    // Delay Node Logic
    if (node.type === 'delay' && node.heldPackets && node.heldPackets.length > 0) {
      for (let i = node.heldPackets.length - 1; i >= 0; i--) {
        const hp = node.heldPackets[i];
        if (now >= hp.releaseTime) {
          const outgoing = state.edges.filter(e => e.from === node.id);
          outgoing.forEach(edge => {
            if (state.packets.length >= MAX_PACKETS) return;
            state.packets.push({ 
              id: Math.random().toString(36).substr(2, 9), 
              edgeId: edge.id, 
              t: 0, 
              payload: hp.payload 
            });
          });
          node.heldPackets.splice(i, 1);
          node.flash = 1.0;
        }
      }
    }

    // Flash decay
    if (node.flash > 0) node.flash *= 0.9;
  });
  
  // Update packets
  updatePackets(dt, msPerBeat);
}

/**
 * Main loop
 */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiga);
} else {
  initAiga();
}
