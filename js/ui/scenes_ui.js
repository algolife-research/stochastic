import * as state from '../core/state.js';
import { addScene, applyScene, deleteScene, updateScene } from '../core/scenes.js';

export function initScenesUI() {
  const modal = document.getElementById('scenes-modal');
  const btn = document.getElementById('scenesBtn');
  const closeBtn = document.getElementById('close-scenes-modal');
  const captureBtn = document.getElementById('capture-scene-btn');
  const nameInput = document.getElementById('new-scene-name');
  const list = document.getElementById('scene-list');

  // Open Modal
  btn.onclick = function() {
    modal.style.display = "block";
    renderSceneList();
  }

  // Close Modal
  closeBtn.onclick = function() {
    modal.style.display = "none";
  }

  // Capture Scene
  captureBtn.onclick = function() {
    const name = nameInput.value.trim() || `Scene ${state.scenes.length + 1}`;
    addScene(name);
    nameInput.value = '';
    renderSceneList();
  }

  // Render List
  function renderSceneList() {
    list.innerHTML = '';
    
    if (state.scenes.length === 0) {
      list.innerHTML = '<div style="padding: 20px; color: #888; text-align: center;">No scenes captured yet.</div>';
      return;
    }

    state.scenes.forEach((scene, index) => {
      const item = document.createElement('div');
      item.className = 'scene-item';
      item.style.cssText = `
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        padding: 10px; 
        background: #2d2d2d; 
        margin-bottom: 5px; 
        border-radius: 4px;
        border: 1px solid ${index === state.activeSceneIndex ? '#bb86fc' : '#444'};
      `;

      const info = document.createElement('div');
      info.style.cssText = 'display: flex; align-items: center; gap: 10px; cursor: pointer; flex-grow: 1;';
      info.innerHTML = `
        <span style="color: #888;">${index + 1}.</span>
        <span style="font-weight: bold; color: ${index === state.activeSceneIndex ? '#bb86fc' : '#fff'};">${scene.name}</span>
      `;
      info.onclick = () => {
        applyScene(index);
        renderSceneList();
      };

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '5px';

      const updateBtn = document.createElement('button');
      updateBtn.textContent = '🔄';
      updateBtn.title = 'Update with current state';
      updateBtn.className = 'toolbar-btn';
      updateBtn.style.padding = '2px 6px';
      updateBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Update "${scene.name}" with current settings?`)) {
          updateScene(index);
        }
      };

      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete Scene';
      delBtn.className = 'toolbar-btn';
      delBtn.style.padding = '2px 6px';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${scene.name}"?`)) {
          deleteScene(index);
          renderSceneList();
        }
      };

      actions.appendChild(updateBtn);
      actions.appendChild(delBtn);
      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }
}
