// Stochastic v2 - Canvas Input Handler
// Mouse and keyboard input handling for the canvas

import { getGraphStore } from '@core/store';
import type { NodeId, NodeType, Tool, EdgeId, AnnotationId, RegionId, TunnelProps, GraphNode } from '@core/types';
import { 
  NODE_RADIUS, MIN_ZOOM, MAX_ZOOM, dist, HANDLE_RADIUS,
  SNAP_STEP, GRID_SIZE, GRID_ATTRACT_STRENGTH, EDGE_ATTRACT_STRENGTH,
  EDGE_SNAP_INTERVAL, ATTRACT_RADIUS, REGION_HANDLE_SIZE, MIN_REGION_SIZE,
  getNodeEffectiveRadius
} from '@core/constants';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate a point on a cubic Bezier curve at parameter t (0-1)
 */
function getBezierPoint(t: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
    y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3
  };
}

/**
 * Calculate control points for a Bezier curve between two nodes
 * Must match the renderer's calculateBezierControlPoints function
 */
function calculateBezierControlPoints(fromX: number, fromY: number, toX: number, toY: number): { x1: number; y1: number; x2: number; y2: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    return { x1: fromX, y1: fromY, x2: toX, y2: toY };
  }
  
  // Must match renderer's curvature calculation
  const curvature = Math.min(0.4, Math.max(0.2, distance / 400));
  const offset = distance * curvature;
  
  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  
  if (isHorizontal) {
    return { x1: fromX + offset, y1: fromY, x2: toX - offset, y2: toY };
  } else {
    return { x1: fromX, y1: fromY + offset * Math.sign(dy), x2: toX, y2: toY - offset * Math.sign(dy) };
  }
}

/**
 * Calculate distance from point to cubic Bezier curve
 * Samples the curve and finds minimum distance
 */
function distToBezier(px: number, py: number, fromX: number, fromY: number, toX: number, toY: number): number {
  const cp = calculateBezierControlPoints(fromX, fromY, toX, toY);
  
  let minDist = Infinity;
  const samples = 20; // Number of points to sample along the curve
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = getBezierPoint(t, fromX, fromY, cp.x1, cp.y1, cp.x2, cp.y2, toX, toY);
    const dx = px - pt.x;
    const dy = py - pt.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
    }
  }
  
  return minDist;
}

/**
 * Snap value to grid
 */
function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

// ============================================================================
// INPUT HANDLER CLASS
// ============================================================================

export class CanvasInputHandler {
  private canvas: HTMLCanvasElement;
  private isDragging: boolean = false;
  private isDraggingAnnotation: boolean = false;
  private isDraggingRegion: boolean = false;
  private isResizingRegion: boolean = false;
  private isPanning: boolean = false;
  private isBoxSelecting: boolean = false;
  private panStart: { x: number; y: number } = { x: 0, y: 0 };
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private regionDragContents: { nodeIds: NodeId[]; annotationIds: AnnotationId[] } | null = null;
  
  // Touch support properties
  private activeTouches: Map<number, Touch> = new Map();
  private initialPinchDistance: number = 0;
  private initialZoomLevel: number = 1;
  private lastTapTime: number = 0;
  private lastTapPosition: { x: number; y: number } = { x: 0, y: 0 };
  private longPressTimer: number | null = null;
  private touchStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private readonly DOUBLE_TAP_THRESHOLD = 300; // ms
  private readonly DOUBLE_TAP_DISTANCE = 30; // pixels
  private readonly LONG_PRESS_DURATION = 500; // ms
  private readonly TOUCH_MOVE_THRESHOLD = 10; // pixels to distinguish tap from drag
  
  // Callbacks for audio/external systems
  onNodeClick?: (nodeId: NodeId, node: unknown) => void;
  onPacketArrival?: (nodeId: NodeId, payload: unknown) => void;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }
  
  /**
   * Clean up event listeners
   */
  destroy(): void {
    // Mouse events
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    
    // Touch events
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
    
    // Keyboard events
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    // Clear any pending timers
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
  
  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
    
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const store = getGraphStore();
    const { viewport } = store;
    
    // Validate inputs to prevent NaN propagation
    const safeScreenX = Number.isFinite(screenX) ? screenX : 0;
    const safeScreenY = Number.isFinite(screenY) ? screenY : 0;
    const safePanX = Number.isFinite(viewport.panOffset.x) ? viewport.panOffset.x : 0;
    const safePanY = Number.isFinite(viewport.panOffset.y) ? viewport.panOffset.y : 0;
    const safeZoom = Number.isFinite(viewport.zoomLevel) && viewport.zoomLevel > 0 ? viewport.zoomLevel : 1;
    
    return {
      x: (safeScreenX - safePanX) / safeZoom,
      y: (safeScreenY - safePanY) / safeZoom,
    };
  }
  
  /**
   * Find node at world position
   */
  findNodeAt(worldX: number, worldY: number): NodeId | null {
    // Validate world coordinates
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
      return null;
    }
    
    const store = getGraphStore();
    let foundNodeId: NodeId | null = null;
    
    // Iterate in reverse to find topmost node first
    const nodes = Array.from(store.nodes.values()).reverse();
    for (const node of nodes) {
      // Skip nodes with invalid positions
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        continue;
      }
      
      // Special hit detection for tunnel nodes (capsule shape)
      if (node.type === 'tunnel') {
        const props = node.props as TunnelProps;
        const subNodeCount = props.subNodes?.length ?? 0;
        const subNodeSpacing = 18;
        const capsuleWidth = Math.max(60, subNodeCount * subNodeSpacing + 30);
        const capsuleHeight = 50;
        
        // Check if point is within capsule bounds
        const halfWidth = capsuleWidth / 2;
        const halfHeight = capsuleHeight / 2;
        const cornerRadius = halfHeight;
        
        // Simple bounding box check first
        if (Math.abs(worldX - node.x) <= halfWidth && Math.abs(worldY - node.y) <= halfHeight) {
          // More precise check: corners should be rounded
          const dx = Math.abs(worldX - node.x);
          const dy = Math.abs(worldY - node.y);
          
          // In the main rectangular area (excluding corners)
          if (dx <= halfWidth - cornerRadius || dy <= halfHeight) {
            foundNodeId = node.id;
            break;
          }
          
          // Check circular corners
          const cornerCenterX = halfWidth - cornerRadius;
          if (dx > cornerCenterX) {
            const cornerDist = Math.sqrt(Math.pow(dx - cornerCenterX, 2) + Math.pow(dy, 2));
            if (cornerDist <= cornerRadius) {
              foundNodeId = node.id;
              break;
            }
          }
        }
      } else {
        // Standard circular hit detection for other nodes
        const d = dist(worldX, worldY, node.x, node.y);
        if (d <= NODE_RADIUS) {
          foundNodeId = node.id;
          break;
        }
      }
    }
    
    return foundNodeId;
  }
  
  /**
   * Find edge at world position
   */
  findEdgeAt(worldX: number, worldY: number): EdgeId | null {
    // Validate world coordinates
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
      return null;
    }
    
    const store = getGraphStore();
    let foundEdgeId: EdgeId | null = null;
    
    store.edges.forEach((edge, id) => {
      const fromNode = store.nodes.get(edge.from);
      const toNode = store.nodes.get(edge.to);
      if (fromNode && toNode) {
        // Validate node positions
        if (!Number.isFinite(fromNode.x) || !Number.isFinite(fromNode.y) ||
            !Number.isFinite(toNode.x) || !Number.isFinite(toNode.y)) {
          return;
        }
        // Use Bezier distance calculation to match rendered curve
        const d = distToBezier(worldX, worldY, fromNode.x, fromNode.y, toNode.x, toNode.y);
        if (Number.isFinite(d) && d < 15) {
          foundEdgeId = id;
        }
      }
    });
    
    return foundEdgeId;
  }
  
  /**
   * Find annotation at world position
   */
  findAnnotationAt(worldX: number, worldY: number): AnnotationId | null {
    const store = getGraphStore();
    let foundId: AnnotationId | null = null;
    
    store.annotations.forEach((ann, id) => {
      // Approximate hit box based on text size
      const fontSize = ann.fontSize || 14;
      const lineHeight = fontSize * 1.3;
      const lines = ann.text.split('\n');
      const approxWidth = Math.max(...lines.map(l => l.length * fontSize * 0.6));
      const approxHeight = lines.length * lineHeight;
      
      if (worldX >= ann.x - 4 && worldX <= ann.x + approxWidth + 4 &&
          worldY >= ann.y - 4 && worldY <= ann.y + approxHeight + 4) {
        foundId = id;
      }
    });
    
    return foundId;
  }
  
  /**
   * Find region at world position
   */
  findRegionAt(worldX: number, worldY: number): RegionId | null {
    const store = getGraphStore();
    let foundId: RegionId | null = null;
    
    store.regions.forEach((region, id) => {
      if (worldX >= region.x && worldX <= region.x + region.width &&
          worldY >= region.y && worldY <= region.y + region.height) {
        foundId = id;
      }
    });
    
    return foundId;
  }
  
  /**
   * Find region resize handle at position
   */
  findRegionHandle(worldX: number, worldY: number, regionId: RegionId): string | null {
    const store = getGraphStore();
    const region = store.regions.get(regionId);
    if (!region) return null;
    
    const handles = {
      nw: { x: region.x, y: region.y },
      ne: { x: region.x + region.width, y: region.y },
      sw: { x: region.x, y: region.y + region.height },
      se: { x: region.x + region.width, y: region.y + region.height },
    };
    
    for (const [name, pos] of Object.entries(handles)) {
      if (Math.abs(worldX - pos.x) <= REGION_HANDLE_SIZE && 
          Math.abs(worldY - pos.y) <= REGION_HANDLE_SIZE) {
        return name;
      }
    }
    
    return null;
  }
  
  /**
   * Check if near node's link handle
   */
  findLinkHandle(worldX: number, worldY: number): { nodeId: NodeId; handleX: number; handleY: number } | null {
    const store = getGraphStore();
    
    // Find nearest node within handle range
    let nearestNode: { id: NodeId; node: GraphNode } | null = null;
    let nearestDist = Infinity;
    
    store.nodes.forEach((node, id) => {
      const effectiveRadius = getNodeEffectiveRadius(node);
      const d = dist(worldX, worldY, node.x, node.y);
      if (d < effectiveRadius + 30 && d < nearestDist) {
        nearestNode = { id, node };
        nearestDist = d;
      }
    });
    
    if (!nearestNode) return null;
    
    // TypeScript needs help here due to forEach callback narrowing
    const foundNode = nearestNode as { id: NodeId; node: GraphNode };
    
    // Calculate handle position (follows mouse angle around node)
    // Use node's effective radius to position handle at edge of node
    const nodeRadius = getNodeEffectiveRadius(foundNode.node);
    const handleOffset = nodeRadius + 10; // 10px past the node edge
    const dx = worldX - foundNode.node.x;
    const dy = worldY - foundNode.node.y;
    const angle = Math.atan2(dy, dx);
    const handleX = foundNode.node.x + Math.cos(angle) * handleOffset;
    const handleY = foundNode.node.y + Math.sin(angle) * handleOffset;
    
    // Check if mouse is near handle
    const handleDist = dist(worldX, worldY, handleX, handleY);
    if (handleDist < HANDLE_RADIUS + 6) {
      return { nodeId: foundNode.id, handleX, handleY };
    }
    
    return null;
  }

  /**
   * Find link handle for touch (checks selected nodes with fixed handle position)
   */
  findLinkHandleTouch(worldX: number, worldY: number): NodeId | null {
    const store = getGraphStore();
    const TOUCH_HANDLE_RADIUS = 12; // Larger for touch
    
    // Check if touching link handle of any selected node
    for (const nodeId of store.selection.selectedNodeIds) {
      const node = store.getNode(nodeId);
      if (!node) continue;
      
      // Handle is always to the right on touch devices
      const nodeRadius = getNodeEffectiveRadius(node);
      const handleX = node.x + nodeRadius + 10;
      const handleY = node.y;
      
      const handleDist = dist(worldX, worldY, handleX, handleY);
      if (handleDist < TOUCH_HANDLE_RADIUS + 10) {
        return nodeId;
      }
    }
    
    return null;
  }
  
  /**
   * Apply attractor-based positioning for smooth snapping
   */
  private applyAttractors(nodeId: NodeId, rawX: number, rawY: number): { x: number; y: number } {
    const store = getGraphStore();
    
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
    const connectedEdges = store.getConnectedEdges(nodeId);
    
    connectedEdges.forEach(edge => {
      const otherNodeId = edge.from === nodeId ? edge.to : edge.from;
      const otherNode = store.nodes.get(otherNodeId);
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
      y: Math.round(y / SNAP_STEP) * SNAP_STEP,
    };
  }
  
  /**
   * Handle mouse down
   */
  private handleMouseDown = (e: MouseEvent): void => {
    const store = getGraphStore();
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.screenToWorld(screenX, screenY);
    
    store.setMouse(screenX, screenY, world.x, world.y);
    
    // Region tool overrides ALL interactions (including handles)
    if (store.currentTool === 'region') {
      this.isBoxSelecting = true;
      store.setBoxSelecting(true, { x: world.x, y: world.y });
      this.canvas.style.cursor = 'crosshair';
      return;
    }

    // Check for link handle click first
    if (store.selection.isHoveringHandle && store.selection.hoveredNodeId) {
      store.setLinkingFrom(store.selection.hoveredNodeId);
      return;
    }
    
    // Check for region resize handle
    if (store.selection.hoveredRegionId && store.selection.hoveredRegionHandle) {
      this.isResizingRegion = true;
      store.setResizingRegion(store.selection.hoveredRegionId);
      store.selectRegion(store.selection.hoveredRegionId);
      return;
    }
    
    // Middle mouse button: start panning
    if (e.button === 1) {
      this.isPanning = true;
      this.panStart = { x: screenX, y: screenY };
      store.setIsPanning(true);
      return;
    }
    
    // Right click: context menu (handled elsewhere)
    if (e.button === 2) {
      return;
    }
    
    // Find what's under the cursor (in priority order)
    const nodeId = this.findNodeAt(world.x, world.y);
    const annotationId = this.findAnnotationAt(world.x, world.y);
    const regionId = this.findRegionAt(world.x, world.y);
    const edgeId = !nodeId ? this.findEdgeAt(world.x, world.y) : null;
    const tool = store.currentTool;
    
    if (nodeId) {
      const node = store.getNode(nodeId);
      
      // Check if we're in linking mode
      if (store.selection.linkingFromId) {
        // Complete link
        store.addEdge(store.selection.linkingFromId, nodeId);
        store.setLinkingFrom(null);
        return;
      }
      
      // Click on source node with manual trigger
      if (node && node.type === 'source' && (node.props as { autoTrigger: boolean }).autoTrigger === false) {
        store.spawnPacket(nodeId);
        store.flashNode(nodeId);
      }
      
      // Click on node
      if (e.shiftKey) {
        // Toggle in multi-selection
        store.selectNode(nodeId, true);
      } else if (e.ctrlKey || e.metaKey) {
        // Additive selection
        store.selectNode(nodeId, true);
      } else {
        // Start drag
        if (!store.selection.selectedNodeIds.includes(nodeId)) {
          store.selectNode(nodeId);
        }
        
        this.isDragging = true;
        store.setDraggingNode(nodeId);
        
        if (node) {
          this.dragOffset = {
            x: world.x - node.x,
            y: world.y - node.y,
          };
        }
      }
      
      // Callback for external systems
      if (this.onNodeClick && node) {
        this.onNodeClick(nodeId, node);
      }
    } else if (annotationId) {
      // Click on annotation
      const ann = store.getAnnotation(annotationId);
      if (ann) {
        store.selectAnnotation(annotationId);
        this.isDraggingAnnotation = true;
        store.setDraggingAnnotation(annotationId);
        this.dragOffset = { x: world.x - ann.x, y: world.y - ann.y };
      }
    } else if (edgeId) {
      // Click on edge
      store.selectEdge(edgeId);
    } else if (regionId && !nodeId && !annotationId) {
      // Click on region (only if not clicking on node/annotation inside it)
      const region = store.getRegion(regionId);
      if (region) {
        store.selectRegion(regionId);
        this.isDraggingRegion = true;
        store.setDraggingRegion(regionId);
        this.dragOffset = { x: world.x - region.x, y: world.y - region.y };
        
        // Capture region contents at drag start
        const contents = store.getRegionContents(regionId);
        this.regionDragContents = {
          nodeIds: contents.nodes.map(n => n.id),
          annotationIds: contents.annotations.map(a => a.id),
        };
      }
    } else {
      // Click on empty space
      if (store.selection.linkingFromId) {
        // Cancel linking
        store.setLinkingFrom(null);
      } else if (tool === 'annotation') {
        // Create annotation
        const newId = store.addAnnotation(snapToGrid(world.x), snapToGrid(world.y), 'Note');
        store.selectAnnotation(newId);
        store.setTool('select');
      } else if (isNodeTool(tool)) {
        // Create new node
        const newNodeId = store.addNode(tool as NodeType, snapToGrid(world.x), snapToGrid(world.y));
        store.selectNode(newNodeId);
        store.setTool('select');
      } else {
        // Clear selection and start box selection (simple drag)
        store.clearSelection();
        this.isBoxSelecting = true;
        store.setBoxSelecting(true, { x: world.x, y: world.y });
        this.canvas.style.cursor = 'crosshair';
      }
    }
  };
  
  /**
   * Handle mouse move
   */
  private handleMouseMove = (e: MouseEvent): void => {
    const store = getGraphStore();
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.screenToWorld(screenX, screenY);
    
    store.setMouse(screenX, screenY, world.x, world.y);
    
    // Panning
    if (this.isPanning) {
      const dx = screenX - this.panStart.x;
      const dy = screenY - this.panStart.y;
      const { viewport } = store;
      store.setPan(viewport.panOffset.x + dx, viewport.panOffset.y + dy);
      this.panStart = { x: screenX, y: screenY };
      return;
    }
    
    // Box selection
    if (this.isBoxSelecting) {
      store.updateBoxSelectEnd({ x: world.x, y: world.y });
      
      // Update selected nodes based on box
      const start = store.selection.boxSelectStart;
      const end = store.selection.boxSelectEnd;
      if (start && end) {
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        const selectedIds: NodeId[] = [];
        store.nodes.forEach((node, id) => {
          if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
            selectedIds.push(id);
          }
        });
        store.selectNodes(selectedIds);
      }
      return;
    }
    
    // Region resizing
    if (this.isResizingRegion && store.selection.resizingRegionId) {
      const region = store.getRegion(store.selection.resizingRegionId);
      const handle = store.selection.hoveredRegionHandle;
      if (!region || !handle) return;
      
      let newX = region.x;
      let newY = region.y;
      let newWidth = region.width;
      let newHeight = region.height;
      
      if (handle.includes('w')) {
        newWidth = region.x + region.width - world.x;
        newX = world.x;
      }
      if (handle.includes('e')) {
        newWidth = world.x - region.x;
      }
      if (handle.includes('n')) {
        newHeight = region.y + region.height - world.y;
        newY = world.y;
      }
      if (handle.includes('s')) {
        newHeight = world.y - region.y;
      }
      
      // Enforce minimum size
      if (newWidth < MIN_REGION_SIZE) {
        if (handle.includes('w')) newX = region.x + region.width - MIN_REGION_SIZE;
        newWidth = MIN_REGION_SIZE;
      }
      if (newHeight < MIN_REGION_SIZE) {
        if (handle.includes('n')) newY = region.y + region.height - MIN_REGION_SIZE;
        newHeight = MIN_REGION_SIZE;
      }
      
      store.updateRegion(store.selection.resizingRegionId, {
        x: newX, y: newY, width: newWidth, height: newHeight
      });
      return;
    }
    
    // Region dragging
    if (this.isDraggingRegion && store.selection.draggingRegionId && this.regionDragContents) {
      const region = store.getRegion(store.selection.draggingRegionId);
      if (!region) return;
      
      const newX = world.x - this.dragOffset.x;
      const newY = world.y - this.dragOffset.y;
      const deltaX = newX - region.x;
      const deltaY = newY - region.y;
      
      // Move region
      store.updateRegion(store.selection.draggingRegionId, { x: newX, y: newY });
      
      // Move contained nodes
      this.regionDragContents.nodeIds.forEach(nodeId => {
        const node = store.getNode(nodeId);
        if (node) {
          store.moveNode(nodeId, node.x + deltaX, node.y + deltaY);
        }
      });
      
      // Move contained annotations
      this.regionDragContents.annotationIds.forEach(annId => {
        const ann = store.getAnnotation(annId);
        if (ann) {
          store.updateAnnotation(annId, { x: ann.x + deltaX, y: ann.y + deltaY });
        }
      });
      return;
    }
    
    // Annotation dragging
    if (this.isDraggingAnnotation && store.selection.draggingAnnotationId) {
      const newX = snapToGrid(world.x - this.dragOffset.x);
      const newY = snapToGrid(world.y - this.dragOffset.y);
      store.updateAnnotation(store.selection.draggingAnnotationId, { x: newX, y: newY });
      return;
    }
    
    // Dragging node(s)
    if (this.isDragging && store.selection.draggingNodeId) {
      const rawX = world.x - this.dragOffset.x;
      const rawY = world.y - this.dragOffset.y;
      const snapped = this.applyAttractors(store.selection.draggingNodeId, rawX, rawY);
      
      // Move all selected nodes if dragging one of them
      const selectedIds = store.selection.selectedNodeIds;
      if (selectedIds.includes(store.selection.draggingNodeId)) {
        const draggedNode = store.getNode(store.selection.draggingNodeId);
        if (draggedNode) {
          const deltaX = snapped.x - draggedNode.x;
          const deltaY = snapped.y - draggedNode.y;
          
          selectedIds.forEach(id => {
            const node = store.getNode(id);
            if (node) {
              store.moveNode(id, node.x + deltaX, node.y + deltaY);
            }
          });
        }
      } else {
        store.moveNode(store.selection.draggingNodeId, snapped.x, snapped.y);
      }
      return;
    }
    
    // Skip linking line updates - just track hover
    if (store.selection.linkingFromId) return;
    
    // Hover detection
    const nodeId = this.findNodeAt(world.x, world.y);
    const annotationId = this.findAnnotationAt(world.x, world.y);
    const regionId = this.findRegionAt(world.x, world.y);
    
    // Link handle detection
    const linkHandle = this.findLinkHandle(world.x, world.y);
    
    store.setHoveredNode(linkHandle?.nodeId ?? nodeId);
    store.setIsHoveringHandle(!!linkHandle);
    store.setHoveredAnnotation(annotationId);
    
    // Region and handle detection
    let regionHandle: string | null = null;
    if (regionId) {
      regionHandle = this.findRegionHandle(world.x, world.y, regionId);
    }
    store.setHoveredRegion(regionId, regionHandle);
    
    // Update cursor
    if (regionHandle) {
      this.canvas.style.cursor = regionHandle === 'nw' || regionHandle === 'se' ? 'nwse-resize' : 'nesw-resize';
    } else if (linkHandle) {
      this.canvas.style.cursor = 'crosshair';
    } else if (nodeId) {
      this.canvas.style.cursor = 'move';
    } else if (annotationId) {
      this.canvas.style.cursor = 'move';
    } else if (regionId) {
      this.canvas.style.cursor = 'move';
    } else {
      this.canvas.style.cursor = 'grab';
    }
  };
  
  /**
   * Handle mouse up
   */
  private handleMouseUp = (e: MouseEvent): void => {
    const store = getGraphStore();
    const rect = this.canvas.getBoundingClientRect();
    const world = this.screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    
    // Complete linking
    if (store.selection.linkingFromId) {
      const nodeId = this.findNodeAt(world.x, world.y);
      if (nodeId && nodeId !== store.selection.linkingFromId) {
        // Link to existing node
        store.addEdge(store.selection.linkingFromId, nodeId);
        store.setLinkingFrom(null);
      } else if (!nodeId) {
        // Dropped on empty canvas - save position for context menu
        store.setPendingLinkNode(store.selection.linkingFromId);
        store.setLinkingFrom(null);
        store.setContextMenuPos(snapToGrid(world.x), snapToGrid(world.y));
        // Trigger context menu display (will be handled by ContextMenu component)
        const event = new CustomEvent('stochastic-show-add-menu', {
          detail: { x: e.clientX, y: e.clientY }
        });
        window.dispatchEvent(event);
      }
    }
    
    // End box selection or region creation
    if (this.isBoxSelecting) {
      const tool = store.currentTool;
      
      if (tool === 'region') {
        // Create region from box selection
        const start = store.selection.boxSelectStart;
        const end = store.selection.boxSelectEnd;
        if (start && end) {
          const minX = Math.min(start.x, end.x);
          const maxX = Math.max(start.x, end.x);
          const minY = Math.min(start.y, end.y);
          const maxY = Math.max(start.y, end.y);
          const width = maxX - minX;
          const height = maxY - minY;
          
          if (width >= MIN_REGION_SIZE && height >= MIN_REGION_SIZE) {
            const newRegionId = store.addRegion(minX, minY, width, height, 'Region');
            if (newRegionId) {
              store.selectRegion(newRegionId);
            }
          }
        }
        // Switch back to select tool
        store.setTool('select');
      }
      
      this.isBoxSelecting = false;
      store.setBoxSelecting(false);
      // Keep selected nodes
    }
    
    // Reset states
    if (this.isPanning) {
      this.isPanning = false;
      store.setIsPanning(false);
    }
    
    if (this.isDragging) {
      this.isDragging = false;
      store.setDraggingNode(null);
      store.markDirty();
    }
    
    if (this.isDraggingAnnotation) {
      this.isDraggingAnnotation = false;
      store.setDraggingAnnotation(null);
      store.markDirty();
    }
    
    if (this.isDraggingRegion) {
      this.isDraggingRegion = false;
      store.setDraggingRegion(null);
      this.regionDragContents = null;
      store.markDirty();
    }
    
    if (this.isResizingRegion) {
      this.isResizingRegion = false;
      store.setResizingRegion(null);
      store.markDirty();
    }
    
    this.canvas.style.cursor = 'grab';
  };
  
  /**
   * Handle double-click
   */
  private handleDoubleClick = (e: MouseEvent): void => {
    const store = getGraphStore();
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.screenToWorld(screenX, screenY);
    
    // Check if double-clicked on annotation - edit it
    const annotationId = this.findAnnotationAt(world.x, world.y);
    if (annotationId) {
      const ann = store.getAnnotation(annotationId);
      if (ann) {
        // Dispatch event for UI to show inline editor
        const rect = this.canvas.getBoundingClientRect();
        const screenX = (ann.x * store.viewport.zoomLevel) + store.viewport.panOffset.x + rect.left;
        const screenY = (ann.y * store.viewport.zoomLevel) + store.viewport.panOffset.y + rect.top;
        const ev = new CustomEvent('stochastic-edit-annotation', { detail: { id: annotationId, screenX, screenY } });
        window.dispatchEvent(ev);
      }
      return;
    }
    
    // Check if double-clicked on node - don't create annotation
    const nodeId = this.findNodeAt(world.x, world.y);
    if (nodeId) return;
    
    // Check if double-clicked on region - edit name
    const regionId = this.findRegionAt(world.x, world.y);
    if (regionId) {
      const region = store.getRegion(regionId);
      if (region) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = (region.x * store.viewport.zoomLevel) + store.viewport.panOffset.x + rect.left;
        const screenY = (region.y * store.viewport.zoomLevel) + store.viewport.panOffset.y + rect.top;
        const ev = new CustomEvent('stochastic-edit-region', { detail: { id: regionId, screenX, screenY } });
        window.dispatchEvent(ev);
      }
      return;
    }
    
    // Double-click on empty canvas - create new annotation and open editor
    const annId = store.addAnnotation(snapToGrid(world.x), snapToGrid(world.y), 'Annotation');
    if (annId) {
      store.selectAnnotation(annId);
      const rect = this.canvas.getBoundingClientRect();
      const screenX = (world.x * store.viewport.zoomLevel) + store.viewport.panOffset.x + rect.left;
      const screenY = (world.y * store.viewport.zoomLevel) + store.viewport.panOffset.y + rect.top;
      const ev = new CustomEvent('stochastic-edit-annotation', { detail: { id: annId, screenX, screenY } });
      window.dispatchEvent(ev);
    }
  };
  
  /**
   * Handle mouse wheel (zoom)
   */
  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    
    const store = getGraphStore();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const { viewport } = store;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoomLevel * zoomFactor));
    
    // Zoom towards mouse position
    const worldX = (mouseX - viewport.panOffset.x) / viewport.zoomLevel;
    const worldY = (mouseY - viewport.panOffset.y) / viewport.zoomLevel;
    
    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;
    
    store.setZoom(newZoom);
    store.setPan(newPanX, newPanY);
  };
  
  /**
   * Handle context menu
   */
  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    // TODO: Show context menu
  };
  
  /**
   * Handle key down
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    const store = getGraphStore();
    
    // Ignore if typing in input
    if ((e.target as HTMLElement).tagName === 'INPUT' || 
        (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return;
    }
    
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        store.togglePlayback();
        break;
        
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        // Delete selected nodes
        store.selection.selectedNodeIds.forEach(id => {
          store.deleteNode(id);
        });
        // Delete selected edge
        if (store.selection.selectedEdgeId) {
          store.deleteEdge(store.selection.selectedEdgeId);
        }
        // Delete selected annotation
        if (store.selection.selectedAnnotationId) {
          store.deleteAnnotation(store.selection.selectedAnnotationId);
        }
        // Delete selected region
        if (store.selection.selectedRegionId) {
          store.deleteRegion(store.selection.selectedRegionId);
        }
        break;
        
      case 'Escape':
        store.setLinkingFrom(null);
        store.clearSelection();
        break;
        
      case 'KeyA':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // Select all nodes
          const allIds = Array.from(store.nodes.keys());
          store.selectNodes(allIds);
        } else {
          // Switch to annotation tool
          store.setTool('annotation');
        }
        break;
      
      case 'KeyR':
        // Switch to region tool
        store.setTool('region');
        break;
      
      case 'KeyG':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // Group selected nodes into tunnel
          if (store.selection.selectedNodeIds.length > 0) {
            store.groupSelectedNodes();
          }
        }
        break;
      
      case 'KeyD':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // Duplicate selected nodes
          if (store.selection.selectedNodeIds.length > 0) {
            store.duplicateSelectedNodes();
          }
        }
        break;
      
      case 'KeyC':
        if (e.ctrlKey || e.metaKey) {
          // Allow native text copy if text is selected
          const textSelection = window.getSelection();
          if (textSelection && textSelection.toString().length > 0) {
            return; // Let browser handle text copy
          }
          e.preventDefault();
          // Copy selected nodes to clipboard
          if (store.selection.selectedNodeIds.length > 0) {
            store.copySelectedNodes();
          }
        }
        break;
      
      case 'KeyV':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // Paste nodes from clipboard
          store.pasteNodes();
        }
        break;
        
      case 'KeyM':
        store.setIsMuted(!store.isMuted);
        break;
        
      // Tool shortcuts
      case 'Digit1':
        store.setTool('source');
        break;
      case 'Digit2':
        store.setTool('speaker');
        break;
      case 'Digit3':
        store.setTool('pitch');
        break;
      case 'Digit4':
        store.setTool('filter');
        break;
      case 'Digit5':
        store.setTool('gate');
        break;
      case 'Digit6':
        store.setTool('delay');
        break;
      case 'Digit7':
        store.setTool('gain');
        break;
      case 'Digit0':
        store.setTool('select');
        break;
    }
  };
  
  /**
   * Handle key up
   */
  private handleKeyUp = (_e: KeyboardEvent): void => {
    // Nothing special for now
  };

  // ============================================================================
  // TOUCH EVENT HANDLERS
  // ============================================================================

  /**
   * Get distance between two touches (for pinch gesture)
   */
  private getTouchDistance(touch1: Touch | undefined, touch2: Touch | undefined): number {
    if (!touch1 || !touch2) return 0;
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get center point between two touches
   */
  private getTouchCenter(touch1: Touch | undefined, touch2: Touch | undefined): { x: number; y: number } {
    if (!touch1 || !touch2) return { x: 0, y: 0 };
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault(); // Prevent mouse events and scrolling
    
    const store = getGraphStore();
    const touches = Array.from(e.touches);

    // Update active touches map
    for (const touch of touches) {
      this.activeTouches.set(touch.identifier, touch);
    }

    // Two-finger gesture (pinch-to-zoom or two-finger pan)
    if (touches.length === 2 && touches[0] && touches[1]) {
      // Clear any long-press timer
      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // Initialize pinch-to-zoom
      this.initialPinchDistance = this.getTouchDistance(touches[0], touches[1]);
      this.initialZoomLevel = store.viewport.zoomLevel;

      // Initialize two-finger pan
      const center = this.getTouchCenter(touches[0], touches[1]);
      this.isPanning = true;
      this.panStart = center;
      
      return;
    }

    // Single-finger gesture
    if (touches.length === 1 && touches[0]) {
      const touch = touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;
      const world = this.screenToWorld(screenX, screenY);

      // Store touch start position for tap detection
      this.touchStartPosition = { x: screenX, y: screenY };

      // Check for double-tap
      const now = Date.now();
      const timeSinceLastTap = now - this.lastTapTime;
      const distanceFromLastTap = Math.sqrt(
        Math.pow(screenX - this.lastTapPosition.x, 2) +
        Math.pow(screenY - this.lastTapPosition.y, 2)
      );

      if (
        timeSinceLastTap < this.DOUBLE_TAP_THRESHOLD &&
        distanceFromLastTap < this.DOUBLE_TAP_DISTANCE
      ) {
        // Double-tap detected
        this.handleDoubleTap(screenX, screenY, world.x, world.y);
        this.lastTapTime = 0; // Reset to prevent triple-tap
        return;
      }

      this.lastTapTime = now;
      this.lastTapPosition = { x: screenX, y: screenY };

      // Start long-press timer for context menu
      this.longPressTimer = window.setTimeout(() => {
        this.handleLongPress(screenX, screenY, world.x, world.y);
        this.longPressTimer = null;
      }, this.LONG_PRESS_DURATION);

      // Initiate potential drag (same logic as mouse down)
      this.handleSingleTouchStart(screenX, screenY, world.x, world.y);
    }
  };

  /**
   * Handle single-finger touch start (equivalent to mouse down)
   */
  private handleSingleTouchStart(screenX: number, screenY: number, worldX: number, worldY: number): void {
    const store = getGraphStore();
    const tool = store.currentTool;

    store.setMouse(screenX, screenY, worldX, worldY);

    // Region tool overrides ALL interactions (same as mouse)
    if (tool === 'region') {
      this.isBoxSelecting = true;
      store.setBoxSelecting(true, { x: worldX, y: worldY });
      return;
    }

    // Check for link handle touch on selected nodes (touch-specific)
    const linkHandleNodeId = this.findLinkHandleTouch(worldX, worldY);
    if (linkHandleNodeId) {
      store.setLinkingFrom(linkHandleNodeId);
      return;
    }

    // Check for region resize handle
    if (store.selection.hoveredRegionId && store.selection.hoveredRegionHandle) {
      this.isResizingRegion = true;
      store.setResizingRegion(store.selection.hoveredRegionId);
      store.selectRegion(store.selection.hoveredRegionId);
      return;
    }

    // Find what's under the touch (in priority order)
    const nodeId = this.findNodeAt(worldX, worldY);
    const annotationId = this.findAnnotationAt(worldX, worldY);
    const regionId = this.findRegionAt(worldX, worldY);
    const edgeId = !nodeId ? this.findEdgeAt(worldX, worldY) : null;

    if (nodeId) {
      const node = store.getNode(nodeId);
      
      // Check if we're in linking mode
      if (store.selection.linkingFromId) {
        // Complete link
        store.addEdge(store.selection.linkingFromId, nodeId);
        store.setLinkingFrom(null);
        return;
      }
      
      // Touch on source node with manual trigger
      if (node && node.type === 'source' && (node.props as { autoTrigger: boolean }).autoTrigger === false) {
        store.spawnPacket(nodeId);
        store.flashNode(nodeId);
      }
      
      // Start drag
      if (!store.selection.selectedNodeIds.includes(nodeId)) {
        store.selectNode(nodeId);
      }
      
      this.isDragging = true;
      store.setDraggingNode(nodeId);
      
      if (node) {
        this.dragOffset = {
          x: worldX - node.x,
          y: worldY - node.y,
        };
      }
      
      // Callback for external systems
      if (this.onNodeClick && node) {
        this.onNodeClick(nodeId, node);
      }
    } else if (annotationId) {
      // Touch on annotation
      const ann = store.getAnnotation(annotationId);
      if (ann) {
        store.selectAnnotation(annotationId);
        this.isDraggingAnnotation = true;
        store.setDraggingAnnotation(annotationId);
        this.dragOffset = { x: worldX - ann.x, y: worldY - ann.y };
      }
    } else if (edgeId) {
      // Touch on edge
      store.selectEdge(edgeId);
    } else if (regionId && !nodeId && !annotationId) {
      // Touch on region (only if not touching node/annotation inside it)
      const region = store.getRegion(regionId);
      if (region) {
        store.selectRegion(regionId);
        this.isDraggingRegion = true;
        store.setDraggingRegion(regionId);
        this.dragOffset = { x: worldX - region.x, y: worldY - region.y };
        
        // Capture region contents at drag start
        const contents = store.getRegionContents(regionId);
        this.regionDragContents = {
          nodeIds: contents.nodes.map(n => n.id),
          annotationIds: contents.annotations.map(a => a.id),
        };
      }
    } else {
      // Touch on empty space
      if (store.selection.linkingFromId) {
        // Cancel linking
        store.setLinkingFrom(null);
      } else if (tool === 'annotation') {
        // Create annotation
        const newId = store.addAnnotation(snapToGrid(worldX), snapToGrid(worldY), 'Note');
        store.selectAnnotation(newId);
        store.setTool('select');
      } else if (isNodeTool(tool)) {
        // Create new node
        const newNodeId = store.addNode(tool as NodeType, snapToGrid(worldX), snapToGrid(worldY));
        store.selectNode(newNodeId);
        store.setTool('select');
      } else {
        // Clear selection and start box selection
        store.clearSelection();
        this.isBoxSelecting = true;
        store.setBoxSelecting(true, { x: worldX, y: worldY });
      }
    }
  }

  /**
   * Handle touch move event
   */
  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault(); // Prevent scrolling
    
    const store = getGraphStore();
    const touches = Array.from(e.touches);

    // Update active touches map
    this.activeTouches.clear();
    for (const touch of touches) {
      this.activeTouches.set(touch.identifier, touch);
    }

    // Two-finger gesture (pinch-to-zoom with simultaneous pan)
    if (touches.length === 2) {
      // Cancel long-press if active
      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // Calculate pinch-to-zoom
      const currentDistance = this.getTouchDistance(touches[0], touches[1]);
      const scale = this.initialPinchDistance > 0 ? currentDistance / this.initialPinchDistance : 1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.initialZoomLevel * scale));

      // Get pinch center point for zoom-to-point
      const center = this.getTouchCenter(touches[0], touches[1]);
      const rect = this.canvas.getBoundingClientRect();
      const screenX = center.x - rect.left;
      const screenY = center.y - rect.top;

      // Calculate pan offset adjustment to zoom toward center
      const worldBeforeZoom = this.screenToWorld(screenX, screenY);
      store.setZoom(newZoom);
      const worldAfterZoom = this.screenToWorld(screenX, screenY);

      const panDeltaX = (worldAfterZoom.x - worldBeforeZoom.x) * newZoom;
      const panDeltaY = (worldAfterZoom.y - worldBeforeZoom.y) * newZoom;

      const { viewport } = store;
      store.setPan(
        viewport.panOffset.x + panDeltaX,
        viewport.panOffset.y + panDeltaY
      );

      // Two-finger pan
      if (this.isPanning) {
        const deltaX = center.x - this.panStart.x;
        const deltaY = center.y - this.panStart.y;

        store.setPan(
          store.viewport.panOffset.x + deltaX,
          store.viewport.panOffset.y + deltaY
        );

        this.panStart = center;
      }

      return;
    }

    // Single-finger gesture
    if (touches.length === 1 && touches[0]) {
      const touch = touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;
      const world = this.screenToWorld(screenX, screenY);

      // Check if moved enough to cancel tap/long-press
      const moveDistance = Math.sqrt(
        Math.pow(screenX - this.touchStartPosition.x, 2) +
        Math.pow(screenY - this.touchStartPosition.y, 2)
      );

      if (moveDistance > this.TOUCH_MOVE_THRESHOLD) {
        // Cancel long-press timer
        if (this.longPressTimer !== null) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }

        // Handle drag (delegate to existing mouse move logic)
        this.handleTouchDrag(screenX, screenY, world.x, world.y);
      }
    }
  };

  /**
   * Handle single-finger drag (equivalent to mouse move while dragging)
   */
  private handleTouchDrag(screenX: number, screenY: number, worldX: number, worldY: number): void {
    const store = getGraphStore();

    store.setMouse(screenX, screenY, worldX, worldY);

    // Box selection (matches mouse logic)
    if (this.isBoxSelecting) {
      store.updateBoxSelectEnd({ x: worldX, y: worldY });
      
      // Update selected nodes based on box
      const start = store.selection.boxSelectStart;
      const end = store.selection.boxSelectEnd;
      if (start && end) {
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        const selectedIds: NodeId[] = [];
        store.nodes.forEach((node, id) => {
          if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
            selectedIds.push(id);
          }
        });
        store.selectNodes(selectedIds);
      }
      return;
    }

    // Region resizing (matches mouse logic)
    if (this.isResizingRegion && store.selection.resizingRegionId) {
      const region = store.getRegion(store.selection.resizingRegionId);
      const handle = store.selection.hoveredRegionHandle;
      if (!region || !handle) return;
      
      let newX = region.x;
      let newY = region.y;
      let newWidth = region.width;
      let newHeight = region.height;
      
      if (handle.includes('w')) {
        newWidth = region.x + region.width - worldX;
        newX = worldX;
      }
      if (handle.includes('e')) {
        newWidth = worldX - region.x;
      }
      if (handle.includes('n')) {
        newHeight = region.y + region.height - worldY;
        newY = worldY;
      }
      if (handle.includes('s')) {
        newHeight = worldY - region.y;
      }
      
      // Enforce minimum size
      if (newWidth < MIN_REGION_SIZE) {
        if (handle.includes('w')) newX = region.x + region.width - MIN_REGION_SIZE;
        newWidth = MIN_REGION_SIZE;
      }
      if (newHeight < MIN_REGION_SIZE) {
        if (handle.includes('n')) newY = region.y + region.height - MIN_REGION_SIZE;
        newHeight = MIN_REGION_SIZE;
      }
      
      store.updateRegion(store.selection.resizingRegionId, {
        x: newX, y: newY, width: newWidth, height: newHeight
      });
      return;
    }

    // Region dragging (matches mouse logic)
    if (this.isDraggingRegion && store.selection.draggingRegionId && this.regionDragContents) {
      const region = store.getRegion(store.selection.draggingRegionId);
      if (!region) return;
      
      const newX = worldX - this.dragOffset.x;
      const newY = worldY - this.dragOffset.y;
      const deltaX = newX - region.x;
      const deltaY = newY - region.y;
      
      // Move region
      store.updateRegion(store.selection.draggingRegionId, { x: newX, y: newY });
      
      // Move contained nodes
      this.regionDragContents.nodeIds.forEach(nodeId => {
        const node = store.getNode(nodeId);
        if (node) {
          store.moveNode(nodeId, node.x + deltaX, node.y + deltaY);
        }
      });
      
      // Move contained annotations
      this.regionDragContents.annotationIds.forEach(annId => {
        const ann = store.getAnnotation(annId);
        if (ann) {
          store.updateAnnotation(annId, { x: ann.x + deltaX, y: ann.y + deltaY });
        }
      });
      return;
    }

    // Annotation dragging (matches mouse logic)
    if (this.isDraggingAnnotation && store.selection.draggingAnnotationId) {
      const newX = snapToGrid(worldX - this.dragOffset.x);
      const newY = snapToGrid(worldY - this.dragOffset.y);
      store.updateAnnotation(store.selection.draggingAnnotationId, { x: newX, y: newY });
      return;
    }

    // Node dragging (matches mouse logic with attractor snapping)
    if (this.isDragging && store.selection.draggingNodeId) {
      const rawX = worldX - this.dragOffset.x;
      const rawY = worldY - this.dragOffset.y;
      const snapped = this.applyAttractors(store.selection.draggingNodeId, rawX, rawY);
      
      // Move all selected nodes if dragging one of them
      const selectedIds = store.selection.selectedNodeIds;
      if (selectedIds.includes(store.selection.draggingNodeId)) {
        const draggedNode = store.getNode(store.selection.draggingNodeId);
        if (draggedNode) {
          const deltaX = snapped.x - draggedNode.x;
          const deltaY = snapped.y - draggedNode.y;
          
          selectedIds.forEach(id => {
            const node = store.getNode(id);
            if (node) {
              store.moveNode(id, node.x + deltaX, node.y + deltaY);
            }
          });
        }
      } else {
        store.moveNode(store.selection.draggingNodeId, snapped.x, snapped.y);
      }
      return;
    }
  }

  /**
   * Handle touch end event
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    
    const store = getGraphStore();
    const touches = Array.from(e.touches);

    // Remove ended touches from active touches map
    for (const touch of e.changedTouches) {
      this.activeTouches.delete(touch.identifier);
    }

    // Clear long-press timer
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // If no touches remain, treat as complete touch end
    if (touches.length === 0) {
      // Check if it was a tap (no significant movement)
      if (e.changedTouches.length > 0 && e.changedTouches[0]) {
        const touch = e.changedTouches[0];
        const rect = this.canvas.getBoundingClientRect();
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;

        const moveDistance = Math.sqrt(
          Math.pow(screenX - this.touchStartPosition.x, 2) +
          Math.pow(screenY - this.touchStartPosition.y, 2)
        );

        // If it was a tap (minimal movement), handle tap logic
        if (moveDistance < this.TOUCH_MOVE_THRESHOLD) {
          const world = this.screenToWorld(screenX, screenY);
          this.handleTap(screenX, screenY, world.x, world.y);
        }
      }

      // Complete linking (matches mouse up logic)
      if (store.selection.linkingFromId && e.changedTouches[0]) {
        const touch = e.changedTouches[0];
        const rect = this.canvas.getBoundingClientRect();
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;
        const world = this.screenToWorld(screenX, screenY);

        const nodeId = this.findNodeAt(world.x, world.y);
        if (nodeId && nodeId !== store.selection.linkingFromId) {
          // Link to existing node
          store.addEdge(store.selection.linkingFromId, nodeId);
          store.setLinkingFrom(null);
        } else if (!nodeId) {
          // Dropped on empty canvas - show context menu
          store.setPendingLinkNode(store.selection.linkingFromId);
          store.setLinkingFrom(null);
          store.setContextMenuPos(snapToGrid(world.x), snapToGrid(world.y));
          
          // Trigger context menu display
          const event = new CustomEvent('stochastic-show-add-menu', {
            detail: { x: screenX, y: screenY }
          });
          window.dispatchEvent(event);
        }
      }

      // End box selection or region creation (matches mouse up logic)
      if (this.isBoxSelecting) {
        const tool = store.currentTool;
        
        if (tool === 'region') {
          // Create region from box selection
          const start = store.selection.boxSelectStart;
          const end = store.selection.boxSelectEnd;
          if (start && end) {
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);
            const width = maxX - minX;
            const height = maxY - minY;
            
            if (width >= MIN_REGION_SIZE && height >= MIN_REGION_SIZE) {
              const newRegionId = store.addRegion(minX, minY, width, height, 'Region');
              if (newRegionId) {
                store.selectRegion(newRegionId);
              }
            }
          }
          // Switch back to select tool
          store.setTool('select');
        }
        
        this.isBoxSelecting = false;
        store.setBoxSelecting(false);
      }

      // Reset all drag states (matches mouse up logic)
      this.isDragging = false;
      this.isDraggingAnnotation = false;
      this.isDraggingRegion = false;
      this.isResizingRegion = false;
      this.isPanning = false;
      store.setIsPanning(false);
      store.setDraggingNode(null);
      store.setDraggingAnnotation(null);
      store.setDraggingRegion(null);
      store.setResizingRegion(null);
      this.regionDragContents = null;
    } else if (touches.length === 1) {
      // Went from 2+ fingers to 1 finger - reset single-finger gesture
      this.isPanning = false;
      store.setIsPanning(false);
      
      // Restart single-finger tracking
      if (touches[0]) {
        const touch = touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;
        this.touchStartPosition = { x: screenX, y: screenY };
      }
    }
  };

  /**
   * Handle touch cancel event (system interrupted touch)
   */
  private handleTouchCancel = (e: TouchEvent): void => {
    e.preventDefault();
    
    const store = getGraphStore();
    
    // Clear all touch state
    this.activeTouches.clear();
    this.isDragging = false;
    this.isDraggingAnnotation = false;
    this.isDraggingRegion = false;
    this.isResizingRegion = false;
    this.isPanning = false;
    this.isBoxSelecting = false;
    this.regionDragContents = null;

    // Reset store states
    store.setIsPanning(false);
    store.setDraggingNode(null);
    store.setDraggingAnnotation(null);
    store.setDraggingRegion(null);
    store.setResizingRegion(null);
    store.setBoxSelecting(false);
    store.setLinkingFrom(null);

    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  /**
   * Handle single tap (equivalent to click)
   */
  private handleTap(screenX: number, screenY: number, worldX: number, worldY: number): void {
    const store = getGraphStore();
    const tool = store.currentTool;

    // Handle tool-specific tap actions
    if (isNodeTool(tool)) {
      // Create node at tap position
      store.addNode(tool as NodeType, snapToGrid(worldX), snapToGrid(worldY));
      return;
    }

    if (tool === 'annotation') {
      // Tap on annotation tool creates new annotation
      const annotation = this.findAnnotationAt(worldX, worldY);
      if (!annotation) {
        const annotationId = store.addAnnotation(snapToGrid(worldX), snapToGrid(worldY), 'Note');
        store.selectAnnotation(annotationId);
        store.setTool('select');
      }
      return;
    }

    if (tool === 'region') {
      // Tap on region tool creates new region
      const region = this.findRegionAt(worldX, worldY);
      if (!region) {
        store.addRegion(worldX - 100, worldY - 100, 200, 200, 'Region');
      }
      return;
    }
  }

  /**
   * Handle double-tap (equivalent to double-click)
   */
  private handleDoubleTap(screenX: number, screenY: number, worldX: number, worldY: number): void {
    const store = getGraphStore();

    // Check for annotation double-tap (enter edit mode)
    const annotationId = this.findAnnotationAt(worldX, worldY);
    if (annotationId) {
      store.selectAnnotation(annotationId);
      return;
    }

    // Check for node double-tap (could open properties, etc.)
    const nodeId = this.findNodeAt(worldX, worldY);
    if (nodeId !== null) {
      // Could open node properties panel or other action
      // For now, just select it
      store.selectNode(nodeId);
      return;
    }
  }

  /**
   * Handle long-press (equivalent to right-click context menu)
   */
  private handleLongPress(screenX: number, screenY: number, worldX: number, worldY: number): void {
    // Show context menu at long-press location
    // This would require implementing a touch-friendly context menu
    // For now, we'll just log it
    console.log('Long press detected at', { screenX, screenY, worldX, worldY });

    // Could trigger context menu for:
    // - Nodes (delete, duplicate, copy, etc.)
    // - Edges (delete)
    // - Empty space (paste, etc.)
  }
}

/**
 * Check if a tool is a node creation tool
 */
function isNodeTool(tool: Tool): boolean {
  const nodeTool: Tool[] = [
    'source', 'speaker', 'pitch', 'oscillator', 'filter', 
    'gate', 'delay', 'gain', 
    'modulator', 'tunnel', 'teleporter', 'quantizer', 
    'lfo', 'splitter', 'midi_out', 'midi_cc', 'scene_trigger',
    'mutator', 'crossover'
  ];
  return nodeTool.includes(tool);
}
