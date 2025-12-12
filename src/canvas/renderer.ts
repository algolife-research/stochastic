// Stochastic v2 - Canvas Renderer
// High-performance HTML5 Canvas rendering at 60fps
// Updated: 2025-12-09 with Bezier curve edges and flowing animation

import { getGraphStore } from '@core/store';
import type { GraphNode, GraphEdge, Packet, TunnelProps } from '@core/types';
import { 
  NODE_RADIUS, GRID_SIZE, NODE_COLORS, NODE_ICONS, 
  midiToNoteName 
} from '@core/constants';
import {
  isValidNumber,
  sanitizeNumber,
  validateViewport,
  validateHexColor,
  safeCanvasOp,
} from './validator';

// ============================================================================
// BEZIER CURVE UTILITIES
// ============================================================================

interface Point {
  x: number;
  y: number;
}

interface BezierControlPoints {
  p0: Point;  // Start point
  p1: Point;  // Control point 1
  p2: Point;  // Control point 2
  p3: Point;  // End point
}

/**
 * Calculate a point on a cubic Bezier curve at parameter t (0-1)
 * Formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
 */
function getBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  // Clamp t to valid range and handle invalid values
  const safeT = isValidNumber(t) ? Math.max(0, Math.min(1, t)) : 0;
  
  const mt = 1 - safeT;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = safeT * safeT;
  const t3 = t2 * safeT;
  
  const x = mt3 * p0.x + 3 * mt2 * safeT * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
  const y = mt3 * p0.y + 3 * mt2 * safeT * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
  
  // Return safe values if calculation produces invalid results
  return {
    x: isValidNumber(x) ? x : p0.x,
    y: isValidNumber(y) ? y : p0.y
  };
}

/**
 * Calculate the tangent (derivative) of a cubic Bezier curve at parameter t
 * Used for arrowhead rotation
 */
function getBezierTangent(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  // Derivative: B'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y)
  };
}

/**
 * Calculate control points for a smooth S-curve between two nodes
 * Returns safe fallback points if input is invalid
 */
function calculateBezierControlPoints(from: Point, to: Point): BezierControlPoints {
  // Validate input points
  if (!isValidNumber(from.x) || !isValidNumber(from.y) || 
      !isValidNumber(to.x) || !isValidNumber(to.y)) {
    // Return degenerate line if points are invalid
    const safeFrom = { x: 0, y: 0 };
    const safeTo = { x: 0, y: 0 };
    return { p0: safeFrom, p1: safeFrom, p2: safeTo, p3: safeTo };
  }
  
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Handle zero distance case
  if (!isValidNumber(distance) || distance === 0) {
    return { p0: from, p1: from, p2: to, p3: to };
  }
  
  // Curvature factor - more curve for longer distances
  const curvature = Math.min(0.4, Math.max(0.2, distance / 400));
  const offset = distance * curvature;
  
  // Determine if primarily horizontal or vertical
  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  
  let p1: Point, p2: Point;
  
  if (isHorizontal) {
    // Horizontal S-curve: control points offset in X
    p1 = { x: from.x + offset, y: from.y };
    p2 = { x: to.x - offset, y: to.y };
  } else {
    // Vertical S-curve: control points offset in Y
    p1 = { x: from.x, y: from.y + offset * Math.sign(dy) };
    p2 = { x: to.x, y: to.y - offset * Math.sign(dy) };
  }
  
  return { p0: from, p1, p2, p3: to };
}

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
  
  // Animation state for flowing edges
  private flowAnimationOffset: number = 0;
  
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
    
    // Validate viewport before rendering
    const viewport = validateViewport(store.viewport);
    
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
    
    ctx.fillStyle = 'rgba(242, 177, 86, 0.8)';
    
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
   * Draw all edges as smooth Bezier curves with flowing animation
   */
  private drawEdges(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection, masterSpeed, scenePlayback } = store;
    const time = performance.now() / 1000;
    
    // Update flow animation based on BPM (with validation)
    const bpm = sanitizeNumber(scenePlayback.effectiveBpm ?? masterSpeed, 120);
    const beatsPerSecond = bpm / 60;
    this.flowAnimationOffset = (time * beatsPerSecond * 20) % 40; // 20 pixels per beat
    
    // Check if playing
    const isPlaying = scenePlayback.currentSceneId !== null || store.packets.size > 0;
    
    store.edges.forEach((edge: GraphEdge) => {
      const fromNode = store.getNode(edge.from);
      const toNode = store.getNode(edge.to);
      
      // Validate nodes before drawing edge
      if (!fromNode || !toNode) return;
      if (!isValidNumber(fromNode.x) || !isValidNumber(fromNode.y)) return;
      if (!isValidNumber(toNode.x) || !isValidNumber(toNode.y)) return;
      
      const isSelected = selection.selectedEdgeId === edge.id;
      const isCV = edge.targetParam != null;
      
      // Calculate Bezier control points
      const bezier = calculateBezierControlPoints(
        { x: fromNode.x, y: fromNode.y },
        { x: toNode.x, y: toNode.y }
      );
      
      // Create gradient along the curve
      const fromColor = NODE_COLORS[fromNode.type] ?? '#666666';
      const toColor = NODE_COLORS[toNode.type] ?? '#666666';
      
      // Draw the main curve
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (isSelected) {
        // Selected edge: bright white with glow
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 4;
      } else if (isCV) {
        // CV edge: dashed with modulation color
        ctx.strokeStyle = '#ffeb3b';
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
      } else {
        // Normal edge: gradient from source to target
        const gradient = ctx.createLinearGradient(
          fromNode.x, fromNode.y, toNode.x, toNode.y
        );
        gradient.addColorStop(0, this.adjustColorOpacity(fromColor, 0.8));
        gradient.addColorStop(1, this.adjustColorOpacity(toColor, 0.6));
        ctx.strokeStyle = gradient;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
      }
      
      // Draw the Bezier curve
      ctx.beginPath();
      ctx.moveTo(bezier.p0.x, bezier.p0.y);
      ctx.bezierCurveTo(
        bezier.p1.x, bezier.p1.y,
        bezier.p2.x, bezier.p2.y,
        bezier.p3.x, bezier.p3.y
      );
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw flowing animation (marching ants) when playing
      if (isPlaying && !isCV) {
        this.drawFlowingAnimation(bezier, fromColor);
      }
      
      // Draw terminal arrowhead at the end
      this.drawTerminalArrowhead(bezier, isSelected, isCV);
      
      // Draw duration pill badge at center
      const durationBeats = (edge.timingMode === 'fixed' && edge.durationBeats != null) 
        ? edge.durationBeats 
        : undefined;
      
      if (durationBeats !== undefined || isCV) {
        this.drawEdgePillBadge(bezier, isSelected, durationBeats, isCV ? edge.targetParam : undefined);
      }
    });
  }
  
  /**
   * Draw flowing animation along the edge (marching ants effect)
   */
  private drawFlowingAnimation(bezier: BezierControlPoints, color: string): void {
    const { ctx } = this;
    
    ctx.save();
    ctx.strokeStyle = this.adjustColorOpacity(color, 0.4);
    ctx.lineWidth = 6;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -this.flowAnimationOffset;
    
    ctx.beginPath();
    ctx.moveTo(bezier.p0.x, bezier.p0.y);
    ctx.bezierCurveTo(
      bezier.p1.x, bezier.p1.y,
      bezier.p2.x, bezier.p2.y,
      bezier.p3.x, bezier.p3.y
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  
  /**
   * Draw a small arrowhead at the terminal end of the edge
   */
  private drawTerminalArrowhead(bezier: BezierControlPoints, isSelected: boolean, isCV: boolean): void {
    const { ctx } = this;
    
    // Get position and tangent at t=0.95 (near the end but not at the node)
    const arrowT = 0.92;
    const pos = getBezierPoint(arrowT, bezier.p0, bezier.p1, bezier.p2, bezier.p3);
    const tangent = getBezierTangent(arrowT, bezier.p0, bezier.p1, bezier.p2, bezier.p3);
    const angle = Math.atan2(tangent.y, tangent.x);
    
    const arrowSize = isCV ? 6 : 8;
    const arrowWidth = isCV ? 4 : 5;
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    
    // Draw chevron arrowhead
    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize * 0.3, -arrowWidth);
    ctx.lineTo(-arrowSize * 0.3, arrowWidth);
    ctx.closePath();
    
    ctx.fillStyle = isSelected ? '#ffffff' : (isCV ? '#ffeb3b' : '#888888');
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Draw a floating pill badge at the center of the edge
   */
  private drawEdgePillBadge(
    bezier: BezierControlPoints, 
    isSelected: boolean, 
    durationBeats?: number,
    cvParam?: string
  ): void {
    const { ctx } = this;
    
    // Get center point of Bezier curve (t=0.5)
    const center = getBezierPoint(0.5, bezier.p0, bezier.p1, bezier.p2, bezier.p3);
    
    // Determine label text
    let label: string;
    if (cvParam) {
      label = cvParam;
    } else if (durationBeats !== undefined) {
      label = this.formatBeatDurationCompact(durationBeats);
    } else {
      return;
    }
    
    // Measure text
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    
    // Pill dimensions
    const paddingX = 6;
    const pillWidth = textWidth + paddingX * 2;
    const pillHeight = 16;
    const pillRadius = pillHeight / 2;
    
    // Draw pill background (capsule shape)
    ctx.beginPath();
    ctx.roundRect(
      center.x - pillWidth / 2,
      center.y - pillHeight / 2,
      pillWidth,
      pillHeight,
      pillRadius
    );
    
    // Fill with dark background to mask the wire
    ctx.fillStyle = isSelected ? '#333333' : '#1a1a1a';
    ctx.fill();
    
    // Border
    ctx.strokeStyle = isSelected ? '#888888' : '#444444';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = isSelected ? '#ffffff' : (cvParam ? '#ffeb3b' : '#cccccc');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, center.x, center.y);
  }
  
  /**
   * Format beat duration in a compact form for the pill badge
   */
  private formatBeatDurationCompact(beats: number): string {
    // Standard musical durations
    if (beats === 4) return '𝅝';       // Whole note
    if (beats === 2) return '𝅗𝅥';       // Half note
    if (beats === 1) return '♩';       // Quarter note
    if (beats === 0.5) return '♪';     // Eighth note
    if (beats === 0.25) return '𝅘𝅥𝅯';   // Sixteenth note
    if (beats === 0.125) return '𝅘𝅥𝅰';  // 32nd note
    
    // Dotted notes
    if (beats === 1.5) return '♩.';    // Dotted quarter
    if (beats === 0.75) return '♪.';   // Dotted eighth
    if (beats === 3) return '𝅗𝅥.';      // Dotted half
    
    // Triplets
    if (Math.abs(beats - 0.333) < 0.01) return '♩₃';
    if (Math.abs(beats - 0.667) < 0.01) return '♪₃';
    
    // Fractional or numeric
    if (beats < 1) {
      const frac = Math.round(1 / beats);
      if (frac === Math.round(frac)) return `1/${frac}`;
    }
    
    return beats % 1 === 0 ? String(beats) : beats.toFixed(1);
  }
  
  /**
   * Adjust color opacity by parsing and modifying
   */
  private adjustColorOpacity(hexColor: string, opacity: number): string {
    // Validate hex color
    const validColor = validateHexColor(hexColor, '#666666');
    
    // Convert hex to rgba with safe parsing
    const r = safeCanvasOp(() => parseInt(validColor.slice(1, 3), 16), 102, 'Failed to parse red channel');
    const g = safeCanvasOp(() => parseInt(validColor.slice(3, 5), 16), 102, 'Failed to parse green channel');
    const b = safeCanvasOp(() => parseInt(validColor.slice(5, 7), 16), 102, 'Failed to parse blue channel');
    const validOpacity = sanitizeNumber(opacity, 1);
    
    return `rgba(${r}, ${g}, ${b}, ${validOpacity})`;
  }

  /**
   * Draw the linking line when creating edges (Bezier preview)
   */
  private drawLinkingLine(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const { selection, mouse } = store;
    
    if (!selection.linkingFromId) return;
    
    const fromNode = store.getNode(selection.linkingFromId);
    if (!fromNode) return;
    
    // Calculate Bezier control points for preview
    const bezier = calculateBezierControlPoints(
      { x: fromNode.x, y: fromNode.y },
      { x: mouse.worldX, y: mouse.worldY }
    );
    
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(bezier.p0.x, bezier.p0.y);
    ctx.bezierCurveTo(
      bezier.p1.x, bezier.p1.y,
      bezier.p2.x, bezier.p2.y,
      bezier.p3.x, bezier.p3.y
    );
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
  
  /**
   * Draw all packets with trails along Bezier curves
   */
  private drawPackets(): void {
    const { ctx } = this;
    const store = getGraphStore();
    const time = performance.now() / 1000;
    const TRAIL_T_LENGTH = 0.15; // Trail length as fraction of curve
    
    store.packets.forEach((packet: Packet) => {
      // Validate packet t value
      if (!isValidNumber(packet.t)) {
        console.warn(`Packet ${packet.id} has invalid t: ${packet.t}`);
        return;
      }
      
      const edge = store.getEdge(packet.edgeId);
      if (!edge) return;
      
      const fromNode = store.getNode(edge.from);
      const toNode = store.getNode(edge.to);
      
      // Validate nodes before drawing packet
      if (!fromNode || !toNode) return;
      if (!isValidNumber(fromNode.x) || !isValidNumber(fromNode.y)) return;
      if (!isValidNumber(toNode.x) || !isValidNumber(toNode.y)) return;
      
      // Calculate Bezier control points (same as edge drawing)
      const bezier = calculateBezierControlPoints(
        { x: fromNode.x, y: fromNode.y },
        { x: toNode.x, y: toNode.y }
      );
      
      // Current packet position on Bezier curve
      const pos = getBezierPoint(packet.t, bezier.p0, bezier.p1, bezier.p2, bezier.p3);
      const px = pos.x;
      const py = pos.y;
      
      // Trail start position (fraction behind on curve)
      const trailT = Math.max(0, packet.t - TRAIL_T_LENGTH);
      
      // Color based on pitch class (chroma) - repeats every octave
      const chroma = packet.payload.midiNote % 12;
      const hue = chroma * 30; // 360 / 12 = 30 degrees per semitone
      const baseColor = `hsl(${hue}, 85%, 60%)`;
      const trailColor = `hsla(${hue}, 85%, 60%, 0.5)`;
      
      // Size based on pitch (high pitch = small size)
      // Map MIDI 0-127 to roughly radius 12-3
      const radius = Math.max(3, 12 - (packet.payload.midiNote / 127) * 9);
      const hasTimbre = packet.payload.timbre > 0.5;
      
      // Draw trail along Bezier curve
      if (hasTimbre) {
        // Wavy trail for high timbre - sample along curve with wave offset
        const segments = 8;
        const waveAmplitude = 4;
        const waveFreq = 12;
        
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        
        for (let i = 1; i <= segments; i++) {
          const segT = trailT + ((packet.t - trailT) * (1 - i / segments));
          const segPos = getBezierPoint(segT, bezier.p0, bezier.p1, bezier.p2, bezier.p3);
          const tangent = getBezierTangent(segT, bezier.p0, bezier.p1, bezier.p2, bezier.p3);
          const tangentLen = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
          
          // Perpendicular for wave
          const perpX = -tangent.y / tangentLen;
          const perpY = tangent.x / tangentLen;
          const wave = Math.sin(time * waveFreq + i * 0.8) * waveAmplitude * (i / segments);
          
          ctx.lineTo(segPos.x + perpX * wave, segPos.y + perpY * wave);
        }
        ctx.stroke();
      } else {
        // Draw trail as smooth curve segment (sample points along Bezier)
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        
        const trailSegments = 6;
        for (let i = 1; i <= trailSegments; i++) {
          const segT = packet.t - (packet.t - trailT) * (i / trailSegments);
          const segPos = getBezierPoint(segT, bezier.p0, bezier.p1, bezier.p2, bezier.p3);
          ctx.lineTo(segPos.x, segPos.y);
        }
        ctx.stroke();
      }
      
      // Draw packet head with glow
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
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
      // Validate node position before drawing
      if (!isValidNumber(node.x) || !isValidNumber(node.y)) {
        console.warn(`Skipping node ${node.id} with invalid position`);
        return;
      }
      
      const isSelected = selection.selectedNodeIds.includes(node.id);
      const isHovered = selection.hoveredNodeId === node.id;
      
      // Flash effect (read-only - decay is handled by tick system) - with validation
      const flashIntensity = sanitizeNumber(node.flash, 0);
      
      // Node color with validation
      const color = validateHexColor(NODE_COLORS[node.type], '#666666');
      
      // Flash glow
      if (flashIntensity > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 * flashIntensity;
      }
      
      // Special rendering for tunnel nodes
      if (node.type === 'tunnel') {
        this.drawTunnelNode(node, isSelected, isHovered, flashIntensity, color);
        ctx.shadowBlur = 0;
        return;
      }
      
      // Dark fill (original design)
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fill();;
      
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
   * Draw a tunnel node with expanded visualization showing sub-nodes
   */
  private drawTunnelNode(
    node: GraphNode, 
    isSelected: boolean, 
    isHovered: boolean, 
    flashIntensity: number,
    color: string
  ): void {
    const { ctx } = this;
    const props = node.props as TunnelProps;
    const subNodes = props.subNodes || [];
    const subNodeCount = subNodes.length;
    
    // Calculate capsule dimensions based on sub-node count
    const minWidth = 60;
    const subNodeSpacing = 18;
    const capsuleWidth = Math.max(minWidth, subNodeCount * subNodeSpacing + 30);
    const capsuleHeight = 50;
    const cornerRadius = capsuleHeight / 2;
    
    // Draw capsule background
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    this.drawRoundedRect(
      node.x - capsuleWidth / 2,
      node.y - capsuleHeight / 2,
      capsuleWidth,
      capsuleHeight,
      cornerRadius
    );
    ctx.fill();
    
    // Draw capsule outline
    ctx.strokeStyle = color;
    ctx.lineWidth = (isSelected || isHovered) ? 3 : 2;
    ctx.stroke();
    
    // Selection indicator
    if (isSelected) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.drawRoundedRect(
        node.x - capsuleWidth / 2 - 4,
        node.y - capsuleHeight / 2 - 4,
        capsuleWidth + 8,
        capsuleHeight + 8,
        cornerRadius + 4
      );
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (isHovered) {
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.drawRoundedRect(
        node.x - capsuleWidth / 2 - 2,
        node.y - capsuleHeight / 2 - 2,
        capsuleWidth + 4,
        capsuleHeight + 4,
        cornerRadius + 2
      );
      ctx.stroke();
    }
    
    // Draw tunnel name above
    const tunnelName = props.tunnelName || 'Tunnel';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(tunnelName, node.x, node.y - capsuleHeight / 2 - 4);
    
    // Draw sub-node chain inside capsule
    if (subNodeCount > 0) {
      const chainStartX = node.x - (subNodeCount - 1) * subNodeSpacing / 2;
      
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'middle';
      
      subNodes.forEach((subNode, i) => {
        const sx = chainStartX + i * subNodeSpacing;
        const sy = node.y;
        
        // Sub-node icon with color
        const subColor = NODE_COLORS[subNode.type] ?? '#666666';
        const subIcon = NODE_ICONS[subNode.type] ?? '?';
        
        // Draw small colored circle behind icon
        ctx.fillStyle = subColor;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Draw icon
        ctx.fillStyle = subColor;
        ctx.textAlign = 'center';
        ctx.fillText(subIcon, sx, sy);
        
        // Draw arrow between nodes (except last)
        if (i < subNodeCount - 1) {
          ctx.fillStyle = '#555555';
          ctx.font = '8px sans-serif';
          ctx.fillText('→', sx + subNodeSpacing / 2, sy);
          ctx.font = '12px sans-serif';
        }
      });
    } else {
      // Empty tunnel - show placeholder
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#555555';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('empty', node.x, node.y);
    }
    
    // Draw sub-node count badge
    if (subNodeCount > 0) {
      const badgeX = node.x + capsuleWidth / 2 - 8;
      const badgeY = node.y - capsuleHeight / 2 + 8;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(subNodeCount), badgeX, badgeY);
    }
  }
  
  /**
   * Draw a rounded rectangle path
   */
  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    const { ctx } = this;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
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
        const props = node.props as { midiNote: number; interval: number; noteIndex: number };
        // noteIndex: -1 = random, -2 = use midiNote
        const label = props.noteIndex === -1 ? '🎲' : midiToNoteName(props.midiNote);
        ctx.fillText(label, node.x, node.y + NODE_RADIUS + 12);
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
        const props = node.props as { probability: number };
        ctx.fillText(`${Math.round(props.probability * 100)}%`, node.x, node.y + NODE_RADIUS + 12);
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
