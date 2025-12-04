// AIGA - Context Menu

import * as state from '../core/state.js';

/**
 * Show context menu at position
 */
export function showContextMenu(x, y, type) {
  const menu = document.getElementById('context-menu');
  const linkBtn = document.getElementById('ctx-link');
  const duplicateBtn = document.getElementById('ctx-duplicate');
  const groupBtn = document.getElementById('ctx-group');
  const deleteBtn = document.getElementById('ctx-delete');
  const addSubmenu = document.getElementById('ctx-add-submenu');
  const addAnnotationBtn = document.getElementById('ctx-add-annotation');
  const addRegionBtn = document.getElementById('ctx-add-region');
  const duplicateRegionBtn = document.getElementById('ctx-duplicate-region');
  
  menu.style.display = 'block';
  
  // Position menu, ensuring it stays on screen
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Adjust X if menu would go off right edge
  let finalX = x;
  if (x + menuRect.width > viewportWidth) {
    finalX = Math.max(0, viewportWidth - menuRect.width - 10);
  }
  
  // Adjust Y if menu would go off bottom edge
  let finalY = y;
  if (y + menuRect.height > viewportHeight) {
    finalY = Math.max(0, viewportHeight - menuRect.height - 10);
  }
  
  menu.style.left = finalX + 'px';
  menu.style.top = finalY + 'px';
  
  // Check if there are groupable nodes selected
  const hasGroupableSelection = state.selectedNodes.length > 0 || 
    (state.selectedNode && 
     state.selectedNode.type !== 'source' && 
     state.selectedNode.type !== 'tunnel');
  
  // Hide optional buttons by default
  if (addAnnotationBtn) addAnnotationBtn.style.display = 'none';
  if (addRegionBtn) addRegionBtn.style.display = 'none';
  if (duplicateRegionBtn) duplicateRegionBtn.style.display = 'none';
  
  if (type === 'add-from-edge') {
    // Show only add node options when dropping edge on canvas
    linkBtn.style.display = 'none';
    duplicateBtn.style.display = 'none';
    groupBtn.style.display = 'none';
    deleteBtn.style.display = 'none';
    addSubmenu.style.display = 'block';
  } else if (type === 'canvas') {
    linkBtn.style.display = 'none';
    duplicateBtn.style.display = 'none';
    groupBtn.style.display = hasGroupableSelection ? 'block' : 'none';
    deleteBtn.style.display = 'none';
    addSubmenu.style.display = 'block';
    if (addAnnotationBtn) addAnnotationBtn.style.display = 'block';
    if (addRegionBtn) addRegionBtn.style.display = 'block';
  } else if (type === 'edge') {
    linkBtn.style.display = 'none';
    duplicateBtn.style.display = 'none';
    groupBtn.style.display = 'none';
    deleteBtn.style.display = 'block';
    addSubmenu.style.display = 'none';
  } else if (type === 'annotation') {
    linkBtn.style.display = 'none';
    duplicateBtn.style.display = 'none';
    groupBtn.style.display = 'none';
    deleteBtn.style.display = 'block';
    addSubmenu.style.display = 'none';
  } else if (type === 'region') {
    linkBtn.style.display = 'none';
    duplicateBtn.style.display = 'none';
    groupBtn.style.display = 'none';
    deleteBtn.style.display = 'block';
    addSubmenu.style.display = 'none';
    if (duplicateRegionBtn) duplicateRegionBtn.style.display = 'block';
  } else {
    // node type
    linkBtn.style.display = 'block';
    duplicateBtn.style.display = 'block';
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
  // Clear pending link node when menu is dismissed
  state.setPendingLinkNode(null);
}
