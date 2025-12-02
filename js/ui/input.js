// AIGA - Input Handling

import * as state from '../core/state.js';
import { 
  NODE_RADIUS, HANDLE_OFFSET_X, HANDLE_RADIUS, GRID_SIZE,
  SNAP_STEP, GRID_ATTRACT_STRENGTH, EDGE_ATTRACT_STRENGTH,
  EDGE_SNAP_INTERVAL, ATTRACT_RADIUS, MIN_ZOOM, MAX_ZOOM
} from '../core/constants.js';
import { dist, distToSegment } from '../core/utils.js';
import { createNode, createTunnelFromTemplate, deleteNode, groupSelectedNodes, duplicateNode } from '../graph/nodes.js';
import { createEdge, deleteEdge } from '../graph/edges.js';
import { spawnPacket } from '../graph/packets.js';
import { updatePropPanel } from './panel.js';
import { showContextMenu, hideContextMenu } from './menu.js';

/**
 * Setup all input event listeners
 */
export function setupInteraction() {
  const canvas = state.canvas;
  
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('contextmenu', handleContextMenu);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  
  // Hide context menu on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
      hideContextMenu();
    }
  });

  // Setup context menu actions
  setupContextMenuActions();
  
  // Keyboard shortcuts
  setupKeyboardShortcuts();
}

/**
 * Get canvas position from mouse event
 */
export function getPos(e) {
  const rect = state.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - state.panOffset.x) / state.zoomLevel;
  const y = (e.clientY - rect.top - state.panOffset.y) / state.zoomLevel;
  return { x, y };
}

/**
 * Get screen position from mouse event
 */
function getScreenPos(e) {
  const rect = state.canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/**
 * Snap value to grid
 */
export function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

/**
 * Apply attractor-based positioning
 */
function applyAttractors(node, rawX, rawY) {
  let x = Math.round(rawX / SNAP_STEP) * SNAP_STEP;
  let y = Math.round(rawY / SNAP_STEP) * SNAP_STEP;
  
  // Grid Attractor
  const nearestGridX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
  const nearestGridY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
  const gridDistX = Math.abs(rawX - nearestGridX);
  const gridDistY = Math.abs(rawY - nearestGridY);
  
  if (gridDistX < ATTRACT_RADIUS) {
    const strength = GRID_ATTRACT_STRENGTH * (1 - gridDistX / ATTRACT_RADIUS);
    x += (nearestGridX - x) * strength;
  }
  if (gridDistY < ATTRACT_RADIUS) {
    const strength = GRID_ATTRACT_STRENGTH * (1 - gridDistY / ATTRACT_RADIUS);
    y += (nearestGridY - y) * strength;
  }
  
  // Edge Length Attractors
  const connectedEdges = state.edges.filter(e => e.from === node.id || e.to === node.id);
  
  connectedEdges.forEach(edge => {
    const otherNodeId = edge.from === node.id ? edge.to : edge.from;
    const otherNode = state.nodes.find(n => n.id === otherNodeId);
    if (!otherNode) return;
    
    const dx = x - otherNode.x;
    const dy = y - otherNode.y;
    const currentLen = Math.sqrt(dx * dx + dy * dy);
    
    if (currentLen < 1) return;
    
    const nearestLen = Math.round(currentLen / EDGE_SNAP_INTERVAL) * EDGE_SNAP_INTERVAL;
    const minLen = EDGE_SNAP_INTERVAL;
    const targetLen = Math.max(minLen, nearestLen);
    
    const halfInterval = EDGE_SNAP_INTERVAL / 2;
    const lenDiff = Math.abs(currentLen - targetLen);
    const normalizedDiff = lenDiff / halfInterval;
    const strength = EDGE_ATTRACT_STRENGTH * Math.pow(1 - normalizedDiff, 2);
    
    const scale = targetLen / currentLen;
    const targetX = otherNode.x + dx * scale;
    const targetY = otherNode.y + dy * scale;
    
    x += (targetX - x) * strength;
    y += (targetY - y) * strength;
  });
  
  return {
    x: Math.round(x / SNAP_STEP) * SNAP_STEP,
    y: Math.round(y / SNAP_STEP) * SNAP_STEP
  };
}

/**
 * Handle mouse down event
 */
function handleMouseDown(e) {
  hideContextMenu();

  const pos = getPos(e);
  const screenPos = getScreenPos(e);
  state.setMousePos(pos);
  
  // Handle Link Handle Click
  if (state.isHoveringHandle && state.hoveredNode) {
    state.setLinkingNode(state.hoveredNode);
    return;
  }

  const hitNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS);
  let hitEdge = null;
  
  if (!hitNode) {
    hitEdge = state.edges.find(edge => {
      const n1 = state.nodes.find(n => n.id === edge.from);
      const n2 = state.nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) return false;
      return distToSegment(pos, n1, n2) < 10;
    });
  }

  if (e.button === 2) return; // Right click handled by contextmenu
  
  if (hitNode) {
    // Click on source node with manual trigger
    if (hitNode.type === 'source' && hitNode.props.autoTrigger === false) {
      spawnPacket(hitNode);
      hitNode.flash = 1.0;
    }
    
    // Shift+Click for multi-selection
    if (e.shiftKey) {
      if (state.selectedNodes.includes(hitNode)) {
        state.setSelectedNodes(state.selectedNodes.filter(n => n !== hitNode));
      } else {
        state.selectedNodes.push(hitNode);
      }
      state.setSelectedNode(hitNode);
    } else {
      state.setSelectedNodes([]);
      state.setSelectedNode(hitNode);
    }
    
    state.setDraggingNode(hitNode);
    state.setSelectedEdge(null);
    state.setDragOffset({ x: pos.x - hitNode.x, y: pos.y - hitNode.y });
    updatePropPanel(hitNode);
  } else if (hitEdge) {
    state.setSelectedEdge(hitEdge);
    state.setSelectedNode(null);
    state.setSelectedNodes([]);
    updatePropPanel(null);
  } else {
    // Empty space clicked
    if (e.shiftKey) {
      // Box selection
      state.setIsBoxSelecting(true);
      state.setBoxSelectStart({ x: pos.x, y: pos.y });
      state.setBoxSelectEnd({ x: pos.x, y: pos.y });
      state.canvas.style.cursor = 'crosshair';
    } else {
      // Deselect and start panning
      state.setSelectedNode(null);
      state.setSelectedNodes([]);
      state.setSelectedEdge(null);
      updatePropPanel(null);
      
      state.setIsPanning(true);
      state.setPanStart({ x: screenPos.x - state.panOffset.x, y: screenPos.y - state.panOffset.y });
      state.canvas.style.cursor = 'grabbing';
    }
  }
}

/**
 * Handle mouse move event
 */
function handleMouseMove(e) {
  const pos = getPos(e);
  const screenPos = getScreenPos(e);
  state.setMousePos(pos);
  
  if (state.isPanning) {
    state.setPanOffset({ 
      x: screenPos.x - state.panStart.x, 
      y: screenPos.y - state.panStart.y 
    });
    return;
  }
  
  if (state.isBoxSelecting) {
    state.setBoxSelectEnd({ x: pos.x, y: pos.y });
    // Update selected nodes based on box
    const minX = Math.min(state.boxSelectStart.x, state.boxSelectEnd.x);
    const maxX = Math.max(state.boxSelectStart.x, state.boxSelectEnd.x);
    const minY = Math.min(state.boxSelectStart.y, state.boxSelectEnd.y);
    const maxY = Math.max(state.boxSelectStart.y, state.boxSelectEnd.y);
    
    state.setSelectedNodes(state.nodes.filter(n => 
      n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY
    ));
    return;
  }
  
  if (state.draggingNode) {
    const rawX = pos.x - state.dragOffset.x;
    const rawY = pos.y - state.dragOffset.y;
    const snapped = applyAttractors(state.draggingNode, rawX, rawY);
    state.draggingNode.x = snapped.x;
    state.draggingNode.y = snapped.y;
    return;
  }

  if (state.linkingNode) return;

  // Hover Logic
  const hitNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS);
  const nearNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS + 30);
  
  let newHoveredNode = null;
  let newIsHoveringHandle = false;

  if (nearNode) {
    newHoveredNode = nearNode;
    const dx = pos.x - nearNode.x;
    const dy = pos.y - nearNode.y;
    const handleAngle = Math.atan2(dy, dx);
    const handleDist = HANDLE_OFFSET_X;
    const handlePos = { 
      x: nearNode.x + Math.cos(handleAngle) * handleDist, 
      y: nearNode.y + Math.sin(handleAngle) * handleDist 
    };
    if (dist(pos, handlePos) < HANDLE_RADIUS + 6) {
      newIsHoveringHandle = true;
    }
  }

  state.setHoveredNode(newHoveredNode);
  state.setIsHoveringHandle(newIsHoveringHandle);

  // Cursor
  if (state.isHoveringHandle) {
    state.canvas.style.cursor = 'crosshair';
  } else if (hitNode) {
    state.canvas.style.cursor = 'move';
  } else {
    state.canvas.style.cursor = 'grab';
  }
}

/**
 * Handle mouse up event
 */
function handleMouseUp(e) {
  const pos = getPos(e);
  
  if (state.linkingNode) {
    const hitNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS);
    if (hitNode && hitNode !== state.linkingNode) {
      createEdge(state.linkingNode, hitNode);
    }
    state.setLinkingNode(null);
  }
  
  if (state.isBoxSelecting) {
    state.setIsBoxSelecting(false);
    if (state.selectedNodes.length > 0) {
      state.setSelectedNode(state.selectedNodes[state.selectedNodes.length - 1]);
      updatePropPanel(state.selectedNode);
    }
  }
  
  state.setDraggingNode(null);
  state.setIsPanning(false);
  state.canvas.style.cursor = 'grab';
}

/**
 * Handle mouse wheel for zooming
 */
function handleWheel(e) {
  e.preventDefault();
  
  const rect = state.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoomLevel * zoomFactor));
  
  if (newZoom !== state.zoomLevel) {
    const zoomChange = newZoom / state.zoomLevel;
    state.setPanOffset({
      x: mouseX - (mouseX - state.panOffset.x) * zoomChange,
      y: mouseY - (mouseY - state.panOffset.y) * zoomChange
    });
    state.setZoomLevel(newZoom);
  }
}

/**
 * Handle context menu event
 */
function handleContextMenu(e) {
  e.preventDefault();
  const pos = getPos(e);
  state.setContextMenuPos({ x: snapToGrid(pos.x), y: snapToGrid(pos.y) });
  
  const hitNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS);
  let hitEdge = null;
  if (!hitNode) {
    hitEdge = state.edges.find(edge => {
      const n1 = state.nodes.find(n => n.id === edge.from);
      const n2 = state.nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) return false;
      return distToSegment(pos, n1, n2) < 10;
    });
  }

  if (hitNode) {
    state.setSelectedNode(hitNode);
    state.setSelectedEdge(null);
    showContextMenu(e.clientX, e.clientY, 'node');
  } else if (hitEdge) {
    state.setSelectedEdge(hitEdge);
    state.setSelectedNode(null);
    showContextMenu(e.clientX, e.clientY, 'edge');
  } else {
    showContextMenu(e.clientX, e.clientY, 'canvas');
  }
}

/**
 * Setup context menu action handlers
 */
function setupContextMenuActions() {
  document.getElementById('ctx-link').addEventListener('click', () => {
    if (state.selectedNode) {
      state.setLinkingNode(state.selectedNode);
      hideContextMenu();
    }
  });

  document.getElementById('ctx-duplicate').addEventListener('click', () => {
    if (state.selectedNode) {
      duplicateNode(state.selectedNode);
      hideContextMenu();
    }
  });
  
  document.getElementById('ctx-delete').addEventListener('click', () => {
    if (state.selectedNode) deleteNode(state.selectedNode);
    if (state.selectedEdge) deleteEdge(state.selectedEdge);
    hideContextMenu();
  });
  
  document.getElementById('ctx-group').addEventListener('click', () => {
    groupSelectedNodes();
    hideContextMenu();
  });
  
  // Add Node items
  document.querySelectorAll('.ctx-add-node').forEach(item => {
    item.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;
      const newNode = createNode(type, state.contextMenuPos.x, state.contextMenuPos.y);
      state.setSelectedNode(newNode);
      updatePropPanel(newNode);
      hideContextMenu();
    });
  });
  
  // Add Tunnel Template items
  document.querySelectorAll('.ctx-add-tunnel').forEach(item => {
    item.addEventListener('click', (e) => {
      const template = e.currentTarget.dataset.template;
      const newNode = createTunnelFromTemplate(template, state.contextMenuPos.x, state.contextMenuPos.y);
      if (newNode) {
        state.setSelectedNode(newNode);
        updatePropPanel(newNode);
      }
      hideContextMenu();
    });
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedNodes.length > 0) {
        state.selectedNodes.forEach(n => deleteNode(n));
        state.setSelectedNodes([]);
      } else if (state.selectedNode) {
        deleteNode(state.selectedNode);
      }
      if (state.selectedEdge) deleteEdge(state.selectedEdge);
    }
    
    // Ctrl+G to group
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      groupSelectedNodes();
    }

    // Ctrl+D to duplicate
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (state.selectedNode) {
        duplicateNode(state.selectedNode);
      }
    }
    
    // Escape to clear selection
    if (e.key === 'Escape') {
      state.setSelectedNodes([]);
      state.setSelectedNode(null);
      updatePropPanel(null);
    }
  });
}
