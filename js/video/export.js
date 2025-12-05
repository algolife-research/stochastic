// AIGA - Video Export Integration
// Exports graph simulation as video, mirroring the main canvas rendering

import * as state from '../core/state.js';
import { compileGraphSimulation, createPreviewRenderer, exportToVideo, exportToVideoWithAudio } from './renderer.js';

// Export settings
const VIDEO_EXPORT_DEFAULTS = {
  duration: 30,
  width: 1920,
  height: 1080,
  fps: 30
};

let videoExportModal = null;
let previewCanvas = null;
let previewRenderer = null;
let simulationData = null;

/**
 * Initialize video export UI
 */
export function initVideoExportUI() {
  createVideoExportModal();
}

/**
 * Create the video export modal dialog
 */
function createVideoExportModal() {
  videoExportModal = document.createElement('div');
  videoExportModal.id = 'video-export-modal';
  videoExportModal.className = 'modal';
  videoExportModal.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <span class="close-modal" id="video-export-close">&times;</span>
      <h2>🎬 Export Video</h2>
      
      <div class="video-export-layout" style="display: flex; gap: 20px;">
        <div class="video-settings" style="flex: 0 0 200px;">
          <div class="setting-row">
            <label for="video-duration">Duration (seconds)</label>
            <input type="number" id="video-duration" value="${VIDEO_EXPORT_DEFAULTS.duration}" 
                   min="5" max="300" step="1">
          </div>
          
          <div class="setting-row">
            <label for="video-resolution">Resolution</label>
            <select id="video-resolution">
              <option value="1920x1080">1080p (1920×1080)</option>
              <option value="1280x720">720p (1280×720)</option>
              <option value="854x480">480p (854×480)</option>
            </select>
          </div>
          
          <div class="setting-row">
            <label for="video-fps">Frame Rate</label>
            <select id="video-fps">
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
              <option value="24">24 fps (cinematic)</option>
            </select>
          </div>
          
          <div class="setting-row" style="margin-top: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="video-include-audio" checked>
              🔊 Include Audio
            </label>
          </div>
          
          <div class="setting-row" style="margin-top: 15px;">
            <button id="video-preview-btn" class="toolbar-btn" style="width: 100%;">
              👁️ Preview
            </button>
          </div>
        </div>
        
        <div class="video-preview" style="flex: 1;">
          <canvas id="video-preview-canvas" width="640" height="360" 
                  style="background: #0a0a0f; border-radius: 8px; width: 100%;"></canvas>
          <div id="video-preview-info" style="text-align: center; margin-top: 10px; color: #888;">
            Click "Preview" to simulate the graph
          </div>
        </div>
      </div>
      
      <div id="video-export-progress" class="export-progress" style="display: none; margin-top: 20px;">
        <div class="progress-bar">
          <div class="progress-fill" id="video-progress-fill"></div>
        </div>
        <div class="progress-text" id="video-progress-text">Compiling graph...</div>
      </div>
      
      <div class="modal-buttons" style="margin-top: 20px;">
        <button id="video-export-cancel" class="toolbar-btn">Cancel</button>
        <button id="video-export-start" class="toolbar-btn primary">🎬 Export Video</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(videoExportModal);
  
  // Event listeners
  document.getElementById('video-export-close').addEventListener('click', hideVideoExportDialog);
  document.getElementById('video-export-cancel').addEventListener('click', hideVideoExportDialog);
  document.getElementById('video-preview-btn').addEventListener('click', startPreview);
  document.getElementById('video-export-start').addEventListener('click', startVideoExport);
  
  // Close on background click
  videoExportModal.addEventListener('click', (e) => {
    if (e.target === videoExportModal) {
      hideVideoExportDialog();
    }
  });
}

/**
 * Show the video export dialog
 */
export function showVideoExportDialog() {
  if (!videoExportModal) {
    createVideoExportModal();
  }
  videoExportModal.style.display = 'flex';
  previewCanvas = document.getElementById('video-preview-canvas');
}

/**
 * Hide the video export dialog
 */
function hideVideoExportDialog() {
  videoExportModal.style.display = 'none';
  if (previewRenderer) {
    previewRenderer.stop();
    previewRenderer = null;
  }
}

/**
 * Compile current graph and start preview
 */
function startPreview() {
  const duration = parseInt(document.getElementById('video-duration').value);
  const fps = parseInt(document.getElementById('video-fps').value);
  
  // Compile the current graph to simulation data
  const settings = {
    pixelsPerBeat: state.globalSettings.pixelsPerBeat || 200,
    fps: fps
  };
  
  simulationData = compileGraphSimulation(
    state.nodes,
    state.edges,
    duration,
    state.masterSpeed,
    settings
  );
  
  document.getElementById('video-preview-info').textContent = 
    `Simulated ${simulationData.frames.length} frames (${duration}s at ${fps}fps)`;
  
  // Stop existing preview
  if (previewRenderer) {
    previewRenderer.stop();
  }
  
  // Start new preview
  previewRenderer = createPreviewRenderer(previewCanvas, simulationData, state.edges, {
    backgroundColor: '#0a0a0f'
  });
  previewRenderer.start();
}

/**
 * Start video export process
 */
async function startVideoExport() {
  const duration = parseInt(document.getElementById('video-duration').value);
  const resolution = document.getElementById('video-resolution').value.split('x');
  const fps = parseInt(document.getElementById('video-fps').value);
  const includeAudio = document.getElementById('video-include-audio').checked;
  
  const width = parseInt(resolution[0]);
  const height = parseInt(resolution[1]);
  
  // Show progress
  const progressDiv = document.getElementById('video-export-progress');
  const progressFill = document.getElementById('video-progress-fill');
  const progressText = document.getElementById('video-progress-text');
  progressDiv.style.display = 'block';
  
  try {
    // Compile simulation
    progressText.textContent = 'Simulating graph...';
    progressFill.style.width = '5%';
    
    const settings = {
      pixelsPerBeat: state.globalSettings.pixelsPerBeat || 200,
      fps: fps
    };
    
    simulationData = compileGraphSimulation(
      state.nodes,
      state.edges,
      duration,
      state.masterSpeed,
      settings
    );
    
    let blob;
    
    if (includeAudio) {
      // Export with audio
      blob = await exportToVideoWithAudio(simulationData, state.edges, state.nodes, state.masterSpeed, {
        width,
        height,
        pixelsPerBeat: state.globalSettings.pixelsPerBeat || 200,
        backgroundColor: '#0a0a0f',
        onProgress: (progress, status) => {
          progressFill.style.width = (progress * 100) + '%';
          progressText.textContent = status || `Rendering: ${Math.round(progress * 100)}%`;
        }
      });
    } else {
      // Export video only
      progressText.textContent = 'Recording video...';
      progressFill.style.width = '15%';
      
      blob = await exportToVideo(simulationData, state.edges, {
        width,
        height,
        backgroundColor: '#0a0a0f',
        onProgress: (progress) => {
          const pct = 15 + progress * 85;
          progressFill.style.width = pct + '%';
          progressText.textContent = `Rendering: ${Math.round(progress * 100)}%`;
        }
      });
    }
    
    progressText.textContent = 'Download ready!';
    progressFill.style.width = '100%';
    
    // Download the video
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aiga-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    // Hide progress after a moment
    setTimeout(() => {
      progressDiv.style.display = 'none';
      progressFill.style.width = '0%';
    }, 2000);
    
  } catch (error) {
    console.error('Video export error:', error);
    progressText.textContent = 'Export failed: ' + error.message;
    progressFill.style.background = '#cf6679';
  }
}

/**
 * Compile current graph to simulation data (for external use)
 */
export function compileCurrentGraph(durationSeconds, fps = 30) {
  const settings = {
    pixelsPerBeat: state.globalSettings.pixelsPerBeat || 200,
    fps: fps
  };
  
  return compileGraphSimulation(
    state.nodes,
    state.edges,
    durationSeconds,
    state.masterSpeed,
    settings
  );
}
