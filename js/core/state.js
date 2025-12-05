// AIGA - Global State Management

import { DEFAULT_SPEED } from './constants.js';

// Canvas & Context
export let canvas = null;
export let ctx = null;

// Audio
export let audioCtx = null;
export let masterGain = null;
export let reverbNode = null;

// App State
export let isRunning = false;
export let isMuted = false;

// Graph Data
export let nodes = [];
export let edges = [];
export let packets = [];

// Annotations & Regions
export let annotations = [];  // {id, x, y, text, fontSize, color}
export let regions = [];      // {id, x, y, width, height, name, description, color}

// Selection State
export let currentTool = 'source';
export let selectedNode = null;
export let selectedNodes = [];
export let selectedEdge = null;
export let selectedAnnotation = null;
export let selectedRegion = null;
export let draggingNode = null;
export let draggingAnnotation = null;
export let draggingRegion = null;
export let resizingRegion = null;      // Region being resized
export let resizeHandle = null;        // 'nw', 'ne', 'sw', 'se' or null
export let regionDragContents = null;  // {nodes: [], annotations: []} - captured at drag start
export let linkingNode = null;
export let pendingLinkNode = null;  // Node waiting for edge connection after node creation
export let hoveredNode = null;
export let hoveredAnnotation = null;
export let hoveredRegion = null;
export let hoveredRegionHandle = null;
export let isHoveringHandle = false;

// Mouse & Input
export let mousePos = { x: 0, y: 0 };
export let dragOffset = { x: 0, y: 0 };

// Box Selection
export let isBoxSelecting = false;
export let boxSelectStart = { x: 0, y: 0 };
export let boxSelectEnd = { x: 0, y: 0 };

// Canvas Panning & Zoom
export let isPanning = false;
export let panOffset = { x: 0, y: 0 };
export let panStart = { x: 0, y: 0 };
export let contextMenuPos = { x: 0, y: 0 };
export let zoomLevel = 1;

// Speed
export let masterSpeed = DEFAULT_SPEED;

// Global Settings
export let globalSettings = {
  subdivisions: 4,
  pixelsPerBeat: 200,
  gravityConstant: 0.5  // For tempo warping effect
};

// Musical Context (Global Key)
export let musicalContext = {
  root: 0,                           // C = 0, C# = 1, ... B = 11
  scale: [0, 2, 4, 5, 7, 9, 11],    // Major scale intervals
  scaleName: 'major'
};

// Setters for musical context
export function setMusicalContext(ctx) {
  musicalContext = { ...musicalContext, ...ctx };
}

export function setGravityConstant(val) {
  globalSettings.gravityConstant = val;
}

// --- State Setters ---

export function setCanvas(c) { canvas = c; }
export function setCtx(c) { ctx = c; }

export function setAudioCtx(c) { audioCtx = c; }
export function setMasterGain(g) { masterGain = g; }
export function setReverbNode(r) { reverbNode = r; }

export function setIsRunning(val) { isRunning = val; }
export function setIsMuted(val) { isMuted = val; }

export function setNodes(n) { nodes = n; }
export function setEdges(e) { edges = e; }
export function setPackets(p) { packets = p; }

export function setAnnotations(a) { annotations = a; }
export function setRegions(r) { regions = r; }

export function setCurrentTool(t) { currentTool = t; }
export function setSelectedNode(n) { selectedNode = n; }
export function setSelectedNodes(n) { selectedNodes = n; }
export function setSelectedEdge(e) { selectedEdge = e; }
export function setSelectedAnnotation(a) { selectedAnnotation = a; }
export function setSelectedRegion(r) { selectedRegion = r; }
export function setDraggingNode(n) { draggingNode = n; }
export function setDraggingAnnotation(a) { draggingAnnotation = a; }
export function setDraggingRegion(r) { draggingRegion = r; }
export function setResizingRegion(r) { resizingRegion = r; }
export function setResizeHandle(h) { resizeHandle = h; }
export function setRegionDragContents(c) { regionDragContents = c; }
export function setLinkingNode(n) { linkingNode = n; }
export function setPendingLinkNode(n) { pendingLinkNode = n; }
export function setHoveredNode(n) { hoveredNode = n; }
export function setHoveredAnnotation(a) { hoveredAnnotation = a; }
export function setHoveredRegion(r) { hoveredRegion = r; }
export function setHoveredRegionHandle(h) { hoveredRegionHandle = h; }
export function setIsHoveringHandle(val) { isHoveringHandle = val; }

export function setMousePos(p) { mousePos = p; }
export function setDragOffset(o) { dragOffset = o; }

export function setIsBoxSelecting(val) { isBoxSelecting = val; }
export function setBoxSelectStart(p) { boxSelectStart = p; }
export function setBoxSelectEnd(p) { boxSelectEnd = p; }

export function setIsPanning(val) { isPanning = val; }
export function setPanOffset(o) { panOffset = o; }
export function setPanStart(p) { panStart = p; }
export function setContextMenuPos(p) { contextMenuPos = p; }
export function setZoomLevel(z) { zoomLevel = z; }

export function setMasterSpeed(s) { masterSpeed = s; }

// --- Utility State Operations ---

export function clearGraph() {
  nodes = [];
  edges = [];
  packets = [];
  annotations = [];
  regions = [];
  selectedNode = null;
  selectedNodes = [];
  selectedEdge = null;
  selectedAnnotation = null;
  selectedRegion = null;
}

export function resetView() {
  panOffset = { x: 0, y: 0 };
  zoomLevel = 1;
}
