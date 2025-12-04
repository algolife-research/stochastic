// AIGA - Export UI
// Handles export dialog and orchestrates compilation/rendering/encoding

import * as state from '../core/state.js';
import { compileGraph } from '../io/compiler.js';
import { renderToBuffer } from '../audio/renderer.js';
import { encodeWAV, encodeMIDI, downloadBlob } from '../io/encoder.js';

// Export settings
const EXPORT_DEFAULTS = {
  duration: 30,
  minDuration: 5,
  maxDuration: 600,
  sampleRate: 44100,
  format: 'wav'
};

let exportModal = null;

/**
 * Initialize export UI
 */
export function initExportUI() {
  createExportModal();
  
  // Add export button to toolbar
  const toolbar = document.querySelector('.floating-toolbar');
  if (toolbar) {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      const exportBtn = document.createElement('button');
      exportBtn.id = 'exportBtn';
      exportBtn.className = 'toolbar-btn';
      exportBtn.innerHTML = '🎵 Export';
      exportBtn.title = 'Export as WAV or MIDI';
      exportBtn.addEventListener('click', showExportDialog);
      saveBtn.parentNode.insertBefore(exportBtn, saveBtn);
    }
  }
}

/**
 * Create the export modal dialog
 */
function createExportModal() {
  exportModal = document.createElement('div');
  exportModal.id = 'export-modal';
  exportModal.className = 'modal';
  exportModal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal" id="export-close">&times;</span>
      <h2>🎵 Export Audio</h2>
      
      <div class="setting-row">
        <label for="export-duration">Duration (seconds)</label>
        <input type="number" id="export-duration" value="${EXPORT_DEFAULTS.duration}" 
               min="${EXPORT_DEFAULTS.minDuration}" max="${EXPORT_DEFAULTS.maxDuration}" step="1">
      </div>
      
      <div class="setting-row">
        <label for="export-format">Format</label>
        <select id="export-format">
          <option value="wav">WAV (Uncompressed Audio)</option>
          <option value="midi">MIDI (Note Data)</option>
        </select>
      </div>
      
      <div id="export-info" class="export-info">
        Estimated file size: <span id="export-size">~2.5 MB</span>
      </div>
      
      <div id="export-progress" class="export-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="progress-text" id="progress-text">Compiling graph...</div>
      </div>
      
      <div class="modal-buttons">
        <button id="export-cancel" class="toolbar-btn">Cancel</button>
        <button id="export-start" class="toolbar-btn primary">Export</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(exportModal);
  
  // Event listeners
  document.getElementById('export-close').addEventListener('click', hideExportDialog);
  document.getElementById('export-cancel').addEventListener('click', hideExportDialog);
  document.getElementById('export-start').addEventListener('click', startExport);
  document.getElementById('export-duration').addEventListener('input', updateEstimate);
  document.getElementById('export-format').addEventListener('change', updateEstimate);
  
  // Close on outside click
  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) hideExportDialog();
  });
}

/**
 * Show the export dialog
 */
export function showExportDialog() {
  if (!exportModal) initExportUI();
  
  // Check if there are any sources and speakers
  const hasSources = state.nodes.some(n => n.type === 'source');
  const hasSpeakers = state.nodes.some(n => n.type === 'speaker');
  
  if (!hasSources || !hasSpeakers) {
    alert('Your graph needs at least one Source and one Speaker to export audio.');
    return;
  }
  
  exportModal.style.display = 'flex';
  updateEstimate();
}

/**
 * Hide the export dialog
 */
function hideExportDialog() {
  if (exportModal) {
    exportModal.style.display = 'none';
    resetProgress();
  }
}

/**
 * Update file size estimate
 */
function updateEstimate() {
  const duration = parseInt(document.getElementById('export-duration').value) || EXPORT_DEFAULTS.duration;
  const format = document.getElementById('export-format').value;
  
  let estimate;
  if (format === 'wav') {
    // Stereo 16-bit at 44.1kHz: 44100 * 2 * 2 * duration = ~176KB/sec
    const bytes = EXPORT_DEFAULTS.sampleRate * 2 * 2 * duration;
    estimate = formatFileSize(bytes);
  } else {
    // MIDI is tiny - rough estimate
    const eventsPerSecond = state.nodes.filter(n => n.type === 'source').length * 2;
    const bytes = eventsPerSecond * duration * 10; // ~10 bytes per event
    estimate = formatFileSize(bytes);
  }
  
  document.getElementById('export-size').textContent = estimate;
}

/**
 * Format bytes to human readable size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Start the export process
 */
async function startExport() {
  const duration = parseInt(document.getElementById('export-duration').value) || EXPORT_DEFAULTS.duration;
  const format = document.getElementById('export-format').value;
  
  const progressDiv = document.getElementById('export-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const startBtn = document.getElementById('export-start');
  
  try {
    // Show progress
    progressDiv.style.display = 'block';
    startBtn.disabled = true;
    
    // Step 1: Compile graph
    progressText.textContent = 'Compiling graph...';
    progressFill.style.width = '10%';
    
    await sleep(50); // Allow UI update
    
    const events = compileGraph(
      state.nodes,
      state.edges,
      duration,
      state.masterSpeed,
      state.globalSettings
    );
    
    console.log(`Compiled ${events.length} audio events`);
    
    if (events.length === 0) {
      alert('No audio events generated. Check that packets can flow from Sources to Speakers.');
      resetProgress();
      return;
    }
    
    progressFill.style.width = '30%';
    
    if (format === 'midi') {
      // MIDI export - fast, no rendering needed
      progressText.textContent = 'Encoding MIDI...';
      progressFill.style.width = '80%';
      
      await sleep(50);
      
      const midiBlob = encodeMIDI(events, state.masterSpeed);
      
      progressFill.style.width = '100%';
      progressText.textContent = 'Done!';
      
      await sleep(200);
      
      downloadBlob(midiBlob, `aiga-export-${Date.now()}.mid`);
    } else {
      // WAV export - render audio
      progressText.textContent = 'Rendering audio...';
      
      const buffer = await renderToBuffer(events, duration, EXPORT_DEFAULTS.sampleRate);
      
      progressFill.style.width = '80%';
      progressText.textContent = 'Encoding WAV...';
      
      await sleep(50);
      
      const wavBlob = encodeWAV(buffer);
      
      progressFill.style.width = '100%';
      progressText.textContent = 'Done!';
      
      await sleep(200);
      
      downloadBlob(wavBlob, `aiga-export-${Date.now()}.wav`);
    }
    
    hideExportDialog();
    
  } catch (err) {
    console.error('Export failed:', err);
    alert('Export failed: ' + err.message);
    resetProgress();
  }
}

/**
 * Reset progress UI
 */
function resetProgress() {
  const progressDiv = document.getElementById('export-progress');
  const progressFill = document.getElementById('progress-fill');
  const startBtn = document.getElementById('export-start');
  
  if (progressDiv) progressDiv.style.display = 'none';
  if (progressFill) progressFill.style.width = '0%';
  if (startBtn) startBtn.disabled = false;
}

/**
 * Sleep helper for async UI updates
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
