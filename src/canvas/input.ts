// Phonon v2 - Canvas Input Handler
// Mouse and keyboard input handling for the canvas

import { getGraphStore } from '@core/store';
import type { NodeId, NodeType, Tool, EdgeId, AnnotationId, RegionId, TunnelProps } from '@core/types';
import { 
  NODE_RADIUS, MIN_ZOOM, MAX_ZOOM, dist, HANDLE_OFFSET_X, HANDLE_RADIUS,
  SNAP_STEP, GRID_SIZE, GRID_ATTRACT_STRENGTH, EDGE_ATTRACT_STRENGTH,
  EDGE_SNAP_INTERVAL, ATTRACT_RADIUS, REGION_HANDLE_SIZE, MIN_REGION_SIZE
} from '@core/constants';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate distance from point to line segment
 */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let t = lenSq !== 0 ? dot / lenSq : -1;
  
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  
  const xx = x1 + t * C;
  const yy = y1 + t * D;
  
  const dx = px - xx;
  const dy = py - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
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
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
  
  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const store = getGraphStore();
    const { viewport } = store;
    
    return {
      x: (screenX - viewport.panOffset.x) / viewport.zoomLevel,
      y: (screenY - viewport.panOffset.y) / viewport.zoomLevel,
    };
  }
  
  /**
   * Find node at world position
   */
  findNodeAt(worldX: number, worldY: number): NodeId | null {
    const store = getGraphStore();
    let foundNodeId: NodeId | null = null;
    
    // Iterate in reverse to find topmost node first
    const nodes = Array.from(store.nodes.values()).reverse();
    for (const node of nodes) {
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
    const store = getGraphStore();
    let foundEdgeId: EdgeId | null = null;
    
    store.edges.forEach((edge, id) => {
      const fromNode = store.nodes.get(edge.from);
      const toNode = store.nodes.get(edge.to);
      if (fromNode && toNode) {
        const d = distToSegment(worldX, worldY, fromNode.x, fromNode.y, toNode.x, toNode.y);
        if (d < 10) {
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
    let nearestNode: { id: NodeId; x: number; y: number } | null = null;
    let nearestDist = Infinity;
    
    store.nodes.forEach((node, id) => {
      const d = dist(worldX, worldY, node.x, node.y);
      if (d < NODE_RADIUS + 30 && d < nearestDist) {
        nearestNode = { id, x: node.x, y: node.y };
        nearestDist = d;
      }
    });
    
    if (!nearestNode) return null;
    
    // TypeScript needs help here due to forEach callback narrowing
    const foundNode = nearestNode as { id: NodeId; x: number; y: number };
    
    // Calculate handle position (follows mouse angle around node)
    const dx = worldX - foundNode.x;
    const dy = worldY - foundNode.y;
    const angle = Math.atan2(dy, dx);
    const handleX = foundNode.x + Math.cos(angle) * HANDLE_OFFSET_X;
    const handleY = foundNode.y + Math.sin(angle) * HANDLE_OFFSET_X;
    
    // Check if mouse is near handle
    const handleDist = dist(worldX, worldY, handleX, handleY);
    if (handleDist < HANDLE_RADIUS + 6) {
      return { nodeId: foundNode.id, handleX, handleY };
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
    const world = this.screenToWorld(
      e.clientX - this.canvas.getBoundingClientRect().left,
      e.clientY - this.canvas.getBoundingClientRect().top
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
        const event = new CustomEvent('phonon-show-add-menu', {
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
        const newText = prompt('Edit text:', ann.text);
        if (newText !== null) {
          store.updateAnnotation(annotationId, { text: newText });
          store.selectAnnotation(annotationId);
        }
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
        const newName = prompt('Edit region name:', region.name);
        if (newName !== null) {
          store.updateRegion(regionId, { name: newName });
          store.selectRegion(regionId);
        }
      }
      return;
    }
    
    // Double-click on empty canvas - create new annotation
    const text = prompt('Enter annotation text:');
    if (text) {
      const annId = store.addAnnotation(snapToGrid(world.x), snapToGrid(world.y), text);
      store.selectAnnotation(annId);
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
  private handleKeyUp = (e: KeyboardEvent): void => {
    // Nothing special for now
  };
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
