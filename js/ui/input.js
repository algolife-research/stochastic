// AIGA - Input Handling

import * as state from '../core/state.js';
import { 
  NODE_RADIUS, HANDLE_OFFSET_X, HANDLE_RADIUS, GRID_SIZE,
  SNAP_STEP, GRID_ATTRACT_STRENGTH, EDGE_ATTRACT_STRENGTH,
  EDGE_SNAP_INTERVAL, ATTRACT_RADIUS, MIN_ZOOM, MAX_ZOOM,
  REGION_HANDLE_SIZE, MIN_REGION_SIZE
} from '../core/constants.js';
import { dist, distToSegment, uid } from '../core/utils.js';
import { createNode, createTunnelFromTemplate, deleteNode, groupSelectedNodes, duplicateNode } from '../graph/nodes.js';
import { createEdge, deleteEdge } from '../graph/edges.js';
import { spawnPacket } from '../graph/packets.js';
import { updatePropPanel } from './panel.js';
import { showContextMenu, hideContextMenu } from './menu.js';

// Track if menu was just shown from edge drop (to prevent immediate close)
let menuShownFromEdgeDrop = false;

/**
 * Setup all input event listeners
 */
export function setupInteraction() {
  const canvas = state.canvas;
  
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvas.addEventListener('contextmenu', handleContextMenu);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  
  // Hide context menu on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
      // Skip hiding if menu was just shown from edge drop
      if (menuShownFromEdgeDrop) {
        menuShownFromEdgeDrop = false;
        return;
      }
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
 * Check if point is inside an annotation text area
 */
function hitTestAnnotation(pos) {
  const ctx = state.ctx;
  for (let i = state.annotations.length - 1; i >= 0; i--) {
    const ann = state.annotations[i];
    ctx.font = `${ann.fontSize || 14}px Arial`;
    const lines = ann.text.split('\n');
    const lineHeight = (ann.fontSize || 14) * 1.3;
    const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    const totalHeight = lines.length * lineHeight;
    
    if (pos.x >= ann.x - 4 && pos.x <= ann.x + maxWidth + 4 &&
        pos.y >= ann.y - 4 && pos.y <= ann.y + totalHeight + 4) {
      return ann;
    }
  }
  return null;
}

/**
 * Check if point is inside a region
 */
function hitTestRegion(pos) {
  for (let i = state.regions.length - 1; i >= 0; i--) {
    const region = state.regions[i];
    if (pos.x >= region.x && pos.x <= region.x + region.width &&
        pos.y >= region.y && pos.y <= region.y + region.height) {
      return region;
    }
  }
  return null;
}

/**
 * Check if point is on a region resize handle
 */
function hitTestRegionHandle(pos, region) {
  if (!region) return null;
  
  const hs = REGION_HANDLE_SIZE;
  const handles = {
    nw: { x: region.x, y: region.y },
    ne: { x: region.x + region.width, y: region.y },
    sw: { x: region.x, y: region.y + region.height },
    se: { x: region.x + region.width, y: region.y + region.height }
  };
  
  for (const [name, handle] of Object.entries(handles)) {
    if (Math.abs(pos.x - handle.x) <= hs && Math.abs(pos.y - handle.y) <= hs) {
      return name;
    }
  }
  return null;
}

/**
 * Check if regions would overlap
 */
function wouldRegionsOverlap(newRegion, excludeId = null) {
  for (const region of state.regions) {
    if (region.id === excludeId) continue;
    
    // Check if rectangles overlap
    const noOverlap = 
      newRegion.x + newRegion.width <= region.x ||
      region.x + region.width <= newRegion.x ||
      newRegion.y + newRegion.height <= region.y ||
      region.y + region.height <= newRegion.y;
    
    if (!noOverlap) return true;
  }
  return false;
}

/**
 * Get nodes and edges contained within a region
 */
export function getRegionContents(region) {
  const nodes = state.nodes.filter(n => 
    n.x >= region.x && n.x <= region.x + region.width &&
    n.y >= region.y && n.y <= region.y + region.height
  );
  
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = state.edges.filter(e => 
    nodeIds.has(e.from) && nodeIds.has(e.to)
  );
  
  return { nodes, edges };
}

/**
 * Create a new annotation
 */
export function createAnnotation(x, y, text = 'Text') {
  const annotation = {
    id: uid(),
    x,
    y,
    text,
    fontSize: 14,
    color: '#cccccc'
  };
  state.annotations.push(annotation);
  return annotation;
}

/**
 * Delete an annotation
 */
export function deleteAnnotation(annotation) {
  const idx = state.annotations.indexOf(annotation);
  if (idx !== -1) {
    state.annotations.splice(idx, 1);
  }
  if (state.selectedAnnotation === annotation) {
    state.setSelectedAnnotation(null);
  }
}

/**
 * Create a new region
 */
export function createRegion(x, y, width, height, name = 'Region') {
  const region = {
    id: uid(),
    x,
    y,
    width: Math.max(MIN_REGION_SIZE, width),
    height: Math.max(MIN_REGION_SIZE, height),
    name,
    description: '',
    color: 'rgba(60, 60, 80, 0.3)'
  };
  
  // Check for overlap
  if (wouldRegionsOverlap(region)) {
    return null;
  }
  
  state.regions.push(region);
  return region;
}

/**
 * Delete a region
 */
export function deleteRegion(region) {
  const idx = state.regions.indexOf(region);
  if (idx !== -1) {
    state.regions.splice(idx, 1);
  }
  if (state.selectedRegion === region) {
    state.setSelectedRegion(null);
  }
}

/**
 * Duplicate a region with all its contents
 */
export function duplicateRegion(region) {
  const { nodes, edges } = getRegionContents(region);
  
  // Calculate offset (try to the right first, then below)
  const offsetX = region.width + 40;
  const offsetY = 0;
  
  // Check if new position would overlap
  const newRegionTest = {
    x: region.x + offsetX,
    y: region.y + offsetY,
    width: region.width,
    height: region.height
  };
  
  if (wouldRegionsOverlap(newRegionTest, region.id)) {
    // Try below instead
    newRegionTest.x = region.x;
    newRegionTest.y = region.y + region.height + 40;
    
    if (wouldRegionsOverlap(newRegionTest, region.id)) {
      alert('No space to duplicate region without overlap');
      return null;
    }
  }
  
  const finalOffsetX = newRegionTest.x - region.x;
  const finalOffsetY = newRegionTest.y - region.y;
  
  // Create new region
  const newRegion = createRegion(
    newRegionTest.x,
    newRegionTest.y,
    region.width,
    region.height,
    region.name + ' (copy)'
  );
  
  if (!newRegion) return null;
  
  newRegion.description = region.description;
  newRegion.color = region.color;
  
  // Duplicate nodes with ID mapping
  const nodeIdMap = {};
  nodes.forEach(n => {
    const newNode = createNode(n.type, n.x + finalOffsetX, n.y + finalOffsetY);
    newNode.props = JSON.parse(JSON.stringify(n.props));
    nodeIdMap[n.id] = newNode.id;
  });
  
  // Duplicate edges
  edges.forEach(e => {
    const fromId = nodeIdMap[e.from];
    const toId = nodeIdMap[e.to];
    if (fromId && toId) {
      const fromNode = state.nodes.find(n => n.id === fromId);
      const toNode = state.nodes.find(n => n.id === toId);
      if (fromNode && toNode) {
        createEdge(fromNode, toNode);
      }
    }
  });
  
  return newRegion;
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
  
  // Check for region resize handle first
  if (state.hoveredRegion && state.hoveredRegionHandle) {
    state.setResizingRegion(state.hoveredRegion);
    state.setResizeHandle(state.hoveredRegionHandle);
    state.setSelectedRegion(state.hoveredRegion);
    state.setSelectedNode(null);
    state.setSelectedAnnotation(null);
    updatePropPanel(null, 'region', state.hoveredRegion);
    return;
  }

  const hitNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS);
  const hitAnnotation = hitTestAnnotation(pos);
  const hitRegion = hitTestRegion(pos);
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
    state.setSelectedAnnotation(null);
    state.setSelectedRegion(null);
    state.setDragOffset({ x: pos.x - hitNode.x, y: pos.y - hitNode.y });
    updatePropPanel(hitNode);
  } else if (hitAnnotation) {
    state.setSelectedAnnotation(hitAnnotation);
    state.setDraggingAnnotation(hitAnnotation);
    state.setSelectedNode(null);
    state.setSelectedNodes([]);
    state.setSelectedEdge(null);
    state.setSelectedRegion(null);
    state.setDragOffset({ x: pos.x - hitAnnotation.x, y: pos.y - hitAnnotation.y });
    updatePropPanel(null, 'annotation', hitAnnotation);
  } else if (hitEdge) {
    state.setSelectedEdge(hitEdge);
    state.setSelectedNode(null);
    state.setSelectedNodes([]);
    state.setSelectedAnnotation(null);
    state.setSelectedRegion(null);
    updatePropPanel(null, 'edge', hitEdge);
  } else if (hitRegion && !hitNode && !hitAnnotation) {
    // Only select region if clicking in empty area of the region
    state.setSelectedRegion(hitRegion);
    state.setDraggingRegion(hitRegion);
    state.setSelectedNode(null);
    state.setSelectedNodes([]);
    state.setSelectedEdge(null);
    state.setSelectedAnnotation(null);
    state.setDragOffset({ x: pos.x - hitRegion.x, y: pos.y - hitRegion.y });
    
    // Capture the current contents of the region at drag start
    const { nodes: containedNodes } = getRegionContents(hitRegion);
    const containedAnnotations = state.annotations.filter(ann => 
      ann.x >= hitRegion.x && ann.x <= hitRegion.x + hitRegion.width &&
      ann.y >= hitRegion.y && ann.y <= hitRegion.y + hitRegion.height
    );
    state.setRegionDragContents({ nodes: containedNodes, annotations: containedAnnotations });
    
    updatePropPanel(null, 'region', hitRegion);
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
      state.setSelectedAnnotation(null);
      state.setSelectedRegion(null);
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
  
  // Handle region resizing
  if (state.resizingRegion && state.resizeHandle) {
    const region = state.resizingRegion;
    const handle = state.resizeHandle;
    
    let newX = region.x;
    let newY = region.y;
    let newWidth = region.width;
    let newHeight = region.height;
    
    if (handle.includes('w')) {
      newWidth = region.x + region.width - pos.x;
      newX = pos.x;
    }
    if (handle.includes('e')) {
      newWidth = pos.x - region.x;
    }
    if (handle.includes('n')) {
      newHeight = region.y + region.height - pos.y;
      newY = pos.y;
    }
    if (handle.includes('s')) {
      newHeight = pos.y - region.y;
    }
    
    // Enforce minimum size
    if (newWidth < MIN_REGION_SIZE) {
      if (handle.includes('w')) {
        newX = region.x + region.width - MIN_REGION_SIZE;
      }
      newWidth = MIN_REGION_SIZE;
    }
    if (newHeight < MIN_REGION_SIZE) {
      if (handle.includes('n')) {
        newY = region.y + region.height - MIN_REGION_SIZE;
      }
      newHeight = MIN_REGION_SIZE;
    }
    
    // Check for overlap
    const testRegion = { x: newX, y: newY, width: newWidth, height: newHeight };
    if (!wouldRegionsOverlap(testRegion, region.id)) {
      region.x = newX;
      region.y = newY;
      region.width = newWidth;
      region.height = newHeight;
    }
    return;
  }
  
  // Handle dragging region (move all contents)
  if (state.draggingRegion && state.regionDragContents) {
    const region = state.draggingRegion;
    const newX = pos.x - state.dragOffset.x;
    const newY = pos.y - state.dragOffset.y;
    const deltaX = newX - region.x;
    const deltaY = newY - region.y;
    
    // Check for overlap at new position
    const testRegion = { x: newX, y: newY, width: region.width, height: region.height };
    if (!wouldRegionsOverlap(testRegion, region.id)) {
      // Move only the originally contained nodes (captured at drag start)
      state.regionDragContents.nodes.forEach(node => {
        node.x += deltaX;
        node.y += deltaY;
      });
      
      // Move only the originally contained annotations (captured at drag start)
      state.regionDragContents.annotations.forEach(ann => {
        ann.x += deltaX;
        ann.y += deltaY;
      });
      
      region.x = newX;
      region.y = newY;
    }
    return;
  }
  
  // Handle dragging annotation
  if (state.draggingAnnotation) {
    const ann = state.draggingAnnotation;
    ann.x = snapToGrid(pos.x - state.dragOffset.x);
    ann.y = snapToGrid(pos.y - state.dragOffset.y);
    return;
  }
  
  if (state.draggingNode) {
    const rawX = pos.x - state.dragOffset.x;
    const rawY = pos.y - state.dragOffset.y;
    const snapped = applyAttractors(state.draggingNode, rawX, rawY);
    
    // Calculate offset to apply to all selected nodes
    const deltaX = snapped.x - state.draggingNode.x;
    const deltaY = snapped.y - state.draggingNode.y;
    
    // Move the dragged node
    state.draggingNode.x = snapped.x;
    state.draggingNode.y = snapped.y;
    
    // Move all other selected nodes by the same offset
    state.selectedNodes.forEach(node => {
      if (node !== state.draggingNode) {
        node.x += deltaX;
        node.y += deltaY;
      }
    });
    return;
  }

  if (state.linkingNode) return;

  // Hover Logic - check in order of visual priority
  const hitNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS);
  const nearNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS + 30);
  const hitAnnotation = hitTestAnnotation(pos);
  const hitRegion = hitTestRegion(pos);
  
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
  state.setHoveredAnnotation(hitAnnotation);
  state.setHoveredRegion(hitRegion);
  
  // Check for region resize handles
  let regionHandle = null;
  if (hitRegion) {
    regionHandle = hitTestRegionHandle(pos, hitRegion);
  }
  state.setHoveredRegionHandle(regionHandle);

  // Cursor
  if (regionHandle) {
    if (regionHandle === 'nw' || regionHandle === 'se') {
      state.canvas.style.cursor = 'nwse-resize';
    } else {
      state.canvas.style.cursor = 'nesw-resize';
    }
  } else if (state.isHoveringHandle) {
    state.canvas.style.cursor = 'crosshair';
  } else if (hitNode) {
    state.canvas.style.cursor = 'move';
  } else if (hitAnnotation) {
    state.canvas.style.cursor = 'move';
  } else if (hitRegion) {
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
      state.setLinkingNode(null);
    } else {
      // Dropped on empty canvas - show node selector
      state.setPendingLinkNode(state.linkingNode);
      state.setLinkingNode(null);
      state.setContextMenuPos({ x: snapToGrid(pos.x), y: snapToGrid(pos.y) });
      menuShownFromEdgeDrop = true;
      showContextMenu(e.clientX, e.clientY, 'add-from-edge');
      return; // Don't reset cursor yet
    }
  }
  
  if (state.isBoxSelecting) {
    state.setIsBoxSelecting(false);
    if (state.selectedNodes.length > 0) {
      state.setSelectedNode(state.selectedNodes[state.selectedNodes.length - 1]);
      updatePropPanel(state.selectedNode);
    }
  }
  
  state.setDraggingNode(null);
  state.setDraggingAnnotation(null);
  state.setDraggingRegion(null);
  state.setResizingRegion(null);
  state.setResizeHandle(null);
  state.setRegionDragContents(null);
  state.setIsPanning(false);
  state.canvas.style.cursor = 'grab';
}

/**
 * Handle double-click event - edit annotations or create new ones
 */
function handleDoubleClick(e) {
  const pos = getPos(e);
  
  // Check if double-clicked on an annotation - edit it
  const hitAnnotation = hitTestAnnotation(pos);
  if (hitAnnotation) {
    const newText = prompt('Edit text:', hitAnnotation.text);
    if (newText !== null) {
      hitAnnotation.text = newText;
      state.setSelectedAnnotation(hitAnnotation);
      updatePropPanel(null, 'annotation', hitAnnotation);
    }
    return;
  }
  
  // Check if double-clicked on a node - don't create annotation
  const hitNode = state.nodes.find(n => dist(n, pos) < NODE_RADIUS);
  if (hitNode) return;
  
  // Check if double-clicked on a region - edit name
  const hitRegion = hitTestRegion(pos);
  if (hitRegion) {
    const newName = prompt('Edit region name:', hitRegion.name);
    if (newName !== null) {
      hitRegion.name = newName;
      state.setSelectedRegion(hitRegion);
      updatePropPanel(null, 'region', hitRegion);
    }
    return;
  }
  
  // Double-click on empty canvas - create new annotation
  const text = prompt('Enter annotation text:');
  if (text) {
    const ann = createAnnotation(snapToGrid(pos.x), snapToGrid(pos.y), text);
    state.setSelectedAnnotation(ann);
    updatePropPanel(null, 'annotation', ann);
  }
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
  const hitAnnotation = hitTestAnnotation(pos);
  const hitRegion = hitTestRegion(pos);
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
    state.setSelectedAnnotation(null);
    state.setSelectedRegion(null);
    showContextMenu(e.clientX, e.clientY, 'node');
  } else if (hitAnnotation) {
    state.setSelectedAnnotation(hitAnnotation);
    state.setSelectedNode(null);
    state.setSelectedEdge(null);
    state.setSelectedRegion(null);
    showContextMenu(e.clientX, e.clientY, 'annotation');
  } else if (hitEdge) {
    state.setSelectedEdge(hitEdge);
    state.setSelectedNode(null);
    state.setSelectedAnnotation(null);
    state.setSelectedRegion(null);
    showContextMenu(e.clientX, e.clientY, 'edge');
  } else if (hitRegion) {
    state.setSelectedRegion(hitRegion);
    state.setSelectedNode(null);
    state.setSelectedEdge(null);
    state.setSelectedAnnotation(null);
    showContextMenu(e.clientX, e.clientY, 'region');
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
    if (state.selectedAnnotation) deleteAnnotation(state.selectedAnnotation);
    if (state.selectedRegion) deleteRegion(state.selectedRegion);
    hideContextMenu();
  });
  
  document.getElementById('ctx-group').addEventListener('click', () => {
    groupSelectedNodes();
    hideContextMenu();
  });
  
  // Add Annotation
  const addAnnotationBtn = document.getElementById('ctx-add-annotation');
  if (addAnnotationBtn) {
    addAnnotationBtn.addEventListener('click', () => {
      const text = prompt('Enter annotation text:');
      if (text) {
        const ann = createAnnotation(state.contextMenuPos.x, state.contextMenuPos.y, text);
        state.setSelectedAnnotation(ann);
        updatePropPanel(null, 'annotation', ann);
      }
      hideContextMenu();
    });
  }
  
  // Add Region
  const addRegionBtn = document.getElementById('ctx-add-region');
  if (addRegionBtn) {
    addRegionBtn.addEventListener('click', () => {
      const region = createRegion(state.contextMenuPos.x, state.contextMenuPos.y, 200, 150, 'Region');
      if (region) {
        state.setSelectedRegion(region);
        updatePropPanel(null, 'region', region);
      } else {
        alert('Cannot create region here - would overlap with existing region');
      }
      hideContextMenu();
    });
  }
  
  // Duplicate Region
  const duplicateRegionBtn = document.getElementById('ctx-duplicate-region');
  if (duplicateRegionBtn) {
    duplicateRegionBtn.addEventListener('click', () => {
      if (state.selectedRegion) {
        const newRegion = duplicateRegion(state.selectedRegion);
        if (newRegion) {
          state.setSelectedRegion(newRegion);
          updatePropPanel(null, 'region', newRegion);
        }
      }
      hideContextMenu();
    });
  }
  
  // Add Node items
  document.querySelectorAll('.ctx-add-node').forEach(item => {
    item.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;
      const newNode = createNode(type, state.contextMenuPos.x, state.contextMenuPos.y);
      
      // If there's a pending link, create the edge
      if (state.pendingLinkNode) {
        createEdge(state.pendingLinkNode, newNode);
        state.setPendingLinkNode(null);
      }
      
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
        // If there's a pending link, create the edge
        if (state.pendingLinkNode) {
          createEdge(state.pendingLinkNode, newNode);
          state.setPendingLinkNode(null);
        }
        
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
    // Don't handle shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedNodes.length > 0) {
        state.selectedNodes.forEach(n => deleteNode(n));
        state.setSelectedNodes([]);
      } else if (state.selectedNode) {
        deleteNode(state.selectedNode);
      }
      if (state.selectedEdge) deleteEdge(state.selectedEdge);
      if (state.selectedAnnotation) {
        deleteAnnotation(state.selectedAnnotation);
        updatePropPanel(null);
      }
      if (state.selectedRegion) {
        deleteRegion(state.selectedRegion);
        updatePropPanel(null);
      }
    }
    
    // Ctrl+G to group
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      groupSelectedNodes();
    }

    // Ctrl+D to duplicate
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (state.selectedRegion) {
        duplicateRegion(state.selectedRegion);
      } else if (state.selectedNodes.length > 0 || state.selectedNode) {
        duplicateNode(state.selectedNode);
      }
    }
    
    // Escape to clear selection
    if (e.key === 'Escape') {
      state.setSelectedNodes([]);
      state.setSelectedNode(null);
      state.setSelectedAnnotation(null);
      state.setSelectedRegion(null);
      updatePropPanel(null);
    }
  });
}
