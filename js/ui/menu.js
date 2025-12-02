// AIGA - Context Menu

import * as state from '../core/state.js';

/**
 * Show context menu at position
 */
export function showContextMenu(x, y, type) {
  const menu = document.getElementById('context-menu');
  const linkBtn = document.getElementById('ctx-link');
  const groupBtn = document.getElementById('ctx-group');
  const deleteBtn = document.getElementById('ctx-delete');
  const addSubmenu = document.getElementById('ctx-add-submenu');
  
  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  
  // Check if there are groupable nodes selected
  const hasGroupableSelection = state.selectedNodes.length > 0 || 
    (state.selectedNode && 
     state.selectedNode.type !== 'source' && 
     state.selectedNode.type !== 'emitter' && 
     state.selectedNode.type !== 'tunnel');
  
  if (type === 'canvas') {
    linkBtn.style.display = 'none';
    groupBtn.style.display = hasGroupableSelection ? 'block' : 'none';
    deleteBtn.style.display = 'none';
    addSubmenu.style.display = 'block';
  } else if (type === 'edge') {
    linkBtn.style.display = 'none';
    groupBtn.style.display = 'none';
    deleteBtn.style.display = 'block';
    addSubmenu.style.display = 'none';
  } else {
    linkBtn.style.display = 'block';
    groupBtn.style.display = hasGroupableSelection ? 'block' : 'none';
    deleteBtn.style.display = 'block';
    addSubmenu.style.display = 'none';
  }
}

/**
 * Hide context menu
 */
export function hideContextMenu() {
  document.getElementById('context-menu').style.display = 'none';
}
