// Phonon v2 - Canvas Renderer
// High-performance HTML5 Canvas rendering at 60fps
// Updated: 2025-12-05 with stars and brighter grid

import { getGraphStore } from '@core/store';
import type { GraphNode, GraphEdge, Packet } from '@core/types';
import { 
  NODE_RADIUS, GRID_SIZE, NODE_COLORS, NODE_ICONS, 
  dist, midiToNoteName 
} from '@core/constants';

// ============================================================================
// RENDERER CLASS
// ============================================================================

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  
  // Performance optimization: cached gradients
  private edgeGradientCache: Map<string, CanvasGradient> = new Map();
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    
    // Enable image smoothing for crisp edges
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }
  
  /**
   * Start the render loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }
  
  /**
   * Stop the render loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isRunning = false;
  }
  
  /**
   * Handle canvas resize
   */
  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
    
    // Clear gradient cache on resize
    this.edgeGradientCache.clear();
  }
  
  /**
   * Main render loop
   */
  private renderLoop = (timestamp: number): void => {
    try {
      const deltaTime = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      
      this.render(deltaTime);
      
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
      }
    } catch (error) {
      console.error('Render error:', error);
      // Keep running despite errors
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
      }
    }
  };
  
  /**
   * Render a single frame
   */
  render(_deltaTime: number): void {
    const store = getGraphStore();
    const { ctx, canvas } = this;
    const { viewport } = store;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply viewport transform
    ctx.save();
    ctx.translate(viewport.panOffset.x, viewport.panOffset.y);
    ctx.scale(viewport.zoomLevel, viewport.zoomLevel);
    
    // Draw layers (back to front)
    this.drawStars();
    this.drawGrid();
    this.drawRegions();
    this.drawTeleporterLinks();
    this.drawEdges();
    this.drawLinkingLine();
    this.drawPackets();
    this.drawNodes();
    this.drawEdgeHandle();
    this.drawAnnotations();
    this.drawBoxSelection();
    
    ctx.restore();
    
    // Note: Packet updates are handled by tick.ts, not here
  }
  
  /**
   * Draw background grid
   */
  private drawGrid(): void {
    const { ctx, canvas } = this;
    const store = getGraphStore();
    const { viewport } = store;
    
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    const startX = -viewport.panOffset.x / viewport.zoomLevel;
    const startY = -viewport.panOffset.y / viewport.zoomLevel;
    const endX = startX + canvas.width / viewport.zoomLevel;
    const endY = startY + canvas.height / viewport.zoomLevel;
    
    // Align to grid
    const gridStartX = Math.floor(startX / GRID_SIZE) * GRID_SIZE;
    const gridStartY = Math.floor(startY / GRID_SIZE) * GRID_SIZE;
    
    ctx.beginPath();
    for (let x = gridStartX; x <= endX; x += GRID_SIZE) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = gridStartY; y <= endY; y += GRID_SIZE) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }
  
  /**
   * Draw animated background stars
   */
  private drawStars(): void {
    const { ctx, canvas } = this;
    const store = getGraphStore();
    const { viewport } = store;
    
    const time = performance.now() / 1000;
    const numStars = 50;
    
    // Calculate viewport bounds in world coordinates
    const viewWidth = canvas.width / viewport.zoomLevel;
    const viewHeight = canvas.height / viewport.zoomLevel;
    const viewLeft = -viewport.panOffset.x / viewport.zoomLevel;
    const viewTop = -viewport.panOffset.y / viewport.zoomLevel;
    
    ctx.fillStyle = 'rgba(100, 150, 255, 0.8)';
    
    for (let i = 0; i < numStars; i++) {
      // Deterministic position based on index
      const seed = i * 12345;
      const baseX = ((seed * 9301 + 49297) % 10000) / 10000;
      const baseY = ((seed * 6151 + 22849) % 10000) / 10000;
      const speed = 20 + (i % 5) * 10; // Speed in pixels per second
      
      // Wrap horizontally with parallax scrolling
      const wrapWidth = viewWidth * 2;
      const offsetX = (time * speed) % wrapWidth;
      const x = viewLeft + (baseX * wrapWidth) + offsetX;
      const wrappedX = ((x - viewLeft) % wrapWidth) + viewLeft;
      
      const y = viewTop + (baseY * viewHeight);
      
      // Only draw if in view
      if (wrappedX >= viewLeft && wrappedX <= viewLeft + viewWidth &&
          y >= viewTop && y <= viewTop + viewHeight) {
        
        // Twinkle effect
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i * 0.5));
        const size = 1.5 + Math.sin(time * 3 + i) * 0.5;
        
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(wrappedX, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  /**
   * Draw teleporter channel connections
   */
  private drawTeleporterLinks(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection } = store;
    
    // Group teleporters by channel
    const channels = new Map<string, GraphNode[]>();
    store.nodes.forEach((node: GraphNode) => {
      if (node.type === 'teleporter') {
        const channel = (node.props as { channel: string }).channel;
        const existing = channels.get(channel) ?? [];
        existing.push(node);
        channels.set(channel, existing);
      }
    });
    
    // Draw links for each channel
    channels.forEach((teleporters, channel) => {
      if (teleporters.length < 2) return;
      
      const isActive = teleporters.some(tp => 
        selection.selectedNodeIds.includes(tp.id)
      );
      
      ctx.strokeStyle = isActive ? '#00e676' : 'rgba(0, 230, 118, 0.3)';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.setLineDash([8, 8]);
      
      // Star pattern from first teleporter
      const hub = teleporters[0]!;
      for (let i = 1; i < teleporters.length; i++) {
        const tp = teleporters[i]!;
        ctx.beginPath();
        ctx.moveTo(hub.x, hub.y);
        ctx.lineTo(tp.x, tp.y);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    });
  }
  
  /**
   * Draw all edges
   */
  private drawEdges(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection, globalSettings } = store;
    
    store.edges.forEach((edge: GraphEdge) => {
      const fromNode = store.getNode(edge.from);
      const toNode = store.getNode(edge.to);
      if (!fromNode || !toNode) return;
      
      const isSelected = selection.selectedEdgeId === edge.id;
      
      // Draw edge line
      ctx.lineWidth = isSelected ? 4 : 3;
      
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
      } else {
        // Create or get cached gradient
        const gradientKey = `${edge.id}`;
        let gradient = this.edgeGradientCache.get(gradientKey);
        
        if (!gradient) {
          gradient = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
          gradient.addColorStop(0, '#333333');
          gradient.addColorStop(1, '#555555');
          this.edgeGradientCache.set(gradientKey, gradient);
        }
        
        ctx.strokeStyle = gradient;
        ctx.shadowBlur = 0;
      }
      
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw timing ticks
      this.drawEdgeTicks(fromNode, toNode, edge, globalSettings.pixelsPerBeat, globalSettings.subdivisions);
      
      // Draw direction arrow
      this.drawEdgeArrow(fromNode, toNode, isSelected);
    });
  }
  
  /**
   * Draw timing ticks on an edge
   */
  private drawEdgeTicks(
    fromNode: GraphNode, 
    toNode: GraphNode, 
    edge: GraphEdge,
    pixelsPerBeat: number,
    subdivisions: number
  ): void {
    const { ctx } = this;
    
    const edgeLength = dist(fromNode.x, fromNode.y, toNode.x, toNode.y);
    const steps = Math.max(1, Math.round(edgeLength / pixelsPerBeat));
    const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
    const totalTicks = steps * subdivisions;
    
    for (let i = 1; i < totalTicks; i++) {
      const t = i / totalTicks;
      const tx = fromNode.x + (toNode.x - fromNode.x) * t;
      const ty = fromNode.y + (toNode.y - fromNode.y) * t;
      
      if (i % subdivisions === 0) {
        // Major tick (beat)
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Minor tick (subdivision)
        const perpX = Math.cos(angle + Math.PI / 2);
        const perpY = Math.sin(angle + Math.PI / 2);
        const barLen = 8;
        
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx - perpX * barLen / 2, ty - perpY * barLen / 2);
        ctx.lineTo(tx + perpX * barLen / 2, ty + perpY * barLen / 2);
        ctx.stroke();
      }
    }
  }
  
  /**
   * Draw arrow chevron at edge center
   */
  private drawEdgeArrow(fromNode: GraphNode, toNode: GraphNode, isSelected: boolean): void {
    const { ctx } = this;
    
    const arrowT = 0.5;
    const arrowX = fromNode.x + (toNode.x - fromNode.x) * arrowT;
    const arrowY = fromNode.y + (toNode.y - fromNode.y) * arrowT;
    const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
    const arrowLen = 10;
    const arrowAngle = 2.8;
    
    ctx.strokeStyle = isSelected ? '#999999' : '#555555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      arrowX + Math.cos(angle + arrowAngle) * arrowLen,
      arrowY + Math.sin(angle + arrowAngle) * arrowLen
    );
    ctx.lineTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX + Math.cos(angle - arrowAngle) * arrowLen,
      arrowY + Math.sin(angle - arrowAngle) * arrowLen
    );
    ctx.stroke();
  }
  
  /**
   * Draw the linking line when creating edges
   */
  private drawLinkingLine(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection, mouse } = store;
    
    if (!selection.linkingFromId) return;
    
    const fromNode = store.getNode(selection.linkingFromId);
    if (!fromNode) return;
    
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(mouse.worldX, mouse.worldY);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
  
  /**
   * Draw all packets with trails
   */
  private drawPackets(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const time = performance.now() / 1000;
    const TRAIL_PIXEL_LENGTH = 40; // Constant trail length in pixels
    
    store.packets.forEach((packet: Packet) => {
      const edge = store.getEdge(packet.edgeId);
      if (!edge) return;
      
      const fromNode = store.getNode(edge.from);
      const toNode = store.getNode(edge.to);
      if (!fromNode || !toNode) return;
      
      // Calculate edge vector
      const edgeDx = toNode.x - fromNode.x;
      const edgeDy = toNode.y - fromNode.y;
      const edgeDist = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
      
      // Current packet position
      const px = fromNode.x + edgeDx * packet.t;
      const py = fromNode.y + edgeDy * packet.t;
      
      // Trail position (constant pixel length behind)
      const trailT = Math.max(0, packet.t - (TRAIL_PIXEL_LENGTH / (edgeDist || 1)));
      const trailX = fromNode.x + edgeDx * trailT;
      const trailY = fromNode.y + edgeDy * trailT;
      
      // Color based on MIDI note (rainbow spectrum)
      const hue = ((packet.payload.midiNote - 36) / 48) * 300;
      const baseColor = `hsl(${hue}, 85%, 60%)`;
      const trailColor = `hsla(${hue}, 85%, 60%, 0.5)`;
      
      // Check if packet has high timbre (polariser effect)
      const hasTimbre = packet.payload.timbre > 0.5;
      
      // Draw trail
      if (hasTimbre && edgeDist > 0) {
        // Wavy trail for high timbre
        const segments = 8;
        const waveAmplitude = 4;
        const waveFreq = 12;
        
        // Perpendicular vector for wave
        const perpX = -edgeDy / edgeDist;
        const perpY = edgeDx / edgeDist;
        
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        
        for (let i = 1; i <= segments; i++) {
          const segT = trailT + ((packet.t - trailT) * (1 - i / segments));
          const baseX = fromNode.x + edgeDx * segT;
          const baseY = fromNode.y + edgeDy * segT;
          const wave = Math.sin(time * waveFreq + i * 0.8) * waveAmplitude * (i / segments);
          ctx.lineTo(baseX + perpX * wave, baseY + perpY * wave);
        }
        ctx.stroke();
      } else {
        // Straight trail
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(trailX, trailY);
        ctx.stroke();
      }
      
      // Draw packet head with glow
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    });
    
    // Ensure shadow is reset even if loop was empty
    ctx.shadowBlur = 0;
  }
  
  /**
   * Draw all nodes
   */
  private drawNodes(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection } = store;
    
    store.nodes.forEach((node: GraphNode) => {
      const isSelected = selection.selectedNodeIds.includes(node.id);
      const isHovered = selection.hoveredNodeId === node.id;
      
      // Flash effect (read-only - decay is handled by tick system)
      const flashIntensity = node.flash;
      
      // Node color
      const color = NODE_COLORS[node.type] ?? '#666666';
      
      // Flash glow
      if (flashIntensity > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 * flashIntensity;
      }
      
      // Dark fill (original design)
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Colored outline
      ctx.strokeStyle = color;
      ctx.lineWidth = (isSelected || isHovered) ? 4 : 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Selection indicator (white dashed ring)
      if (isSelected) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (isHovered) {
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Icon
      const icon = NODE_ICONS[node.type] ?? '?';
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, node.x, node.y);
      
      // Draw node-specific info
      this.drawNodeInfo(node);
    });
  }
  
  /**
   * Draw node-specific information (labels, values)
   */
  private drawNodeInfo(node: GraphNode): void {
    const { ctx } = this;
    
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'center';
    
    switch (node.type) {
      case 'source': {
        const props = node.props as { midiNote: number; interval: number };
        const noteName = midiToNoteName(props.midiNote);
        ctx.fillText(noteName, node.x, node.y + NODE_RADIUS + 12);
        break;
      }
      case 'teleporter': {
        const props = node.props as { channel: string };
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#00e676';
        ctx.fillText(props.channel, node.x, node.y + NODE_RADIUS + 14);
        break;
      }
      case 'pitch': {
        const props = node.props as { mode: string; shift: number };
        if (props.mode === 'shift') {
          const sign = props.shift >= 0 ? '+' : '';
          ctx.fillText(`${sign}${props.shift}`, node.x, node.y + NODE_RADIUS + 12);
        }
        break;
      }
      case 'gate': {
        const props = node.props as { prob: number };
        ctx.fillText(`${Math.round(props.prob * 100)}%`, node.x, node.y + NODE_RADIUS + 12);
        break;
      }
      case 'gain': {
        const props = node.props as { value: number };
        ctx.fillText(`×${props.value.toFixed(1)}`, node.x, node.y + NODE_RADIUS + 12);
        break;
      }
    }
  }
  
  /**
   * Draw box selection rectangle
   */
  private drawBoxSelection(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection } = store;
    
    if (!selection.isBoxSelecting || !selection.boxSelectStart || !selection.boxSelectEnd) {
      return;
    }
    
    const x = Math.min(selection.boxSelectStart.x, selection.boxSelectEnd.x);
    const y = Math.min(selection.boxSelectStart.y, selection.boxSelectEnd.y);
    const width = Math.abs(selection.boxSelectEnd.x - selection.boxSelectStart.x);
    const height = Math.abs(selection.boxSelectEnd.y - selection.boxSelectStart.y);
    
    // Semi-transparent fill
    ctx.fillStyle = 'rgba(0, 122, 255, 0.15)';
    ctx.fillRect(x, y, width, height);
    
    // Dashed border
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  }
  
  /**
   * Draw edge handle (+ icon) when hovering near a node
   */
  private drawEdgeHandle(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection } = store;
    
    // Only show handle when hovering a node and not linking
    if (!selection.isHoveringHandle || selection.linkingFromId) {
      return;
    }
    
    // Find hovered node
    const hoveredNodeId = selection.hoveredNodeId;
    if (!hoveredNodeId) return;
    
    const node = store.getNode(hoveredNodeId);
    if (!node) return;
    
    // Calculate handle position (to the right of node)
    const HANDLE_OFFSET_X = 35;
    const HANDLE_RADIUS = 8;
    const handleX = node.x + HANDLE_OFFSET_X;
    const handleY = node.y;
    
    // Draw handle circle
    ctx.beginPath();
    ctx.arc(handleX, handleY, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#00e676';
    ctx.fill();
    
    // Draw + icon
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const iconSize = 5;
    ctx.beginPath();
    ctx.moveTo(handleX - iconSize, handleY);
    ctx.lineTo(handleX + iconSize, handleY);
    ctx.moveTo(handleX, handleY - iconSize);
    ctx.lineTo(handleX, handleY + iconSize);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  
  /**
   * Draw annotations (text labels)
   */
  private drawAnnotations(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection } = store;
    
    store.annotations.forEach(ann => {
      const isSelected = selection.selectedAnnotationId === ann.id;
      const isHovered = selection.hoveredAnnotationId === ann.id;
      
      // Set font
      ctx.font = `${ann.fontSize}px Inter, sans-serif`;
      ctx.textBaseline = 'top';
      
      // Measure text for background
      const metrics = ctx.measureText(ann.text);
      const padding = 4;
      const bgX = ann.x - padding;
      const bgY = ann.y - padding;
      const bgWidth = metrics.width + padding * 2;
      const bgHeight = ann.fontSize + padding * 2;
      
      // Draw selection/hover background
      if (isSelected || isHovered) {
        ctx.fillStyle = isSelected ? 'rgba(0, 122, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        
        if (isSelected) {
          ctx.strokeStyle = '#007aff';
          ctx.lineWidth = 1;
          ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
        }
      }
      
      // Draw text
      ctx.fillStyle = ann.color || '#ffffff';
      ctx.fillText(ann.text, ann.x, ann.y);
    });
  }
  
  /**
   * Draw regions (grouping areas)
   */
  private drawRegions(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection } = store;
    
    store.regions.forEach(region => {
      const isSelected = selection.selectedRegionId === region.id;
      const isHovered = selection.hoveredRegionId === region.id;
      
      // Draw fill
      ctx.fillStyle = region.color || 'rgba(100, 100, 100, 0.15)';
      ctx.fillRect(region.x, region.y, region.width, region.height);
      
      // Draw border
      ctx.strokeStyle = isSelected ? '#007aff' : (isHovered ? '#666' : '#444');
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      
      // Draw name if present
      if (region.name) {
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#888';
        ctx.textBaseline = 'top';
        ctx.fillText(region.name, region.x + 4, region.y + 4);
      }
      
      // Draw resize handles when selected
      if (isSelected) {
        const handleSize = 8;
        const handles = [
          { x: region.x, y: region.y }, // top-left
          { x: region.x + region.width, y: region.y }, // top-right
          { x: region.x, y: region.y + region.height }, // bottom-left
          { x: region.x + region.width, y: region.y + region.height }, // bottom-right
        ];
        
        ctx.fillStyle = '#007aff';
        handles.forEach(h => {
          ctx.fillRect(
            h.x - handleSize / 2,
            h.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      }
    });
  }
  
  /**
   * Invalidate gradient cache for an edge
   */
  invalidateEdgeGradient(edgeId: string): void {
    this.edgeGradientCache.delete(edgeId);
  }
  
  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.edgeGradientCache.clear();
  }
}
