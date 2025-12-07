// Phonon Viz - Base Renderer
// Abstract base class for all visualization modes

import type { VizMusicalData, VizConfig, VizConfigBase, ColorPalette } from '@core/types';
import type { VizStats } from './types';
import { extractVizData } from './data-extractor';
import { DEFAULT_PALETTE } from './palettes';

/** Base class for visualization renderers */
export abstract class VizRenderer {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected width: number = 0;
  protected height: number = 0;
  protected isRunning: boolean = false;
  protected animationFrameId: number | null = null;
  protected lastTime: number = 0;
  protected deltaTime: number = 0;
  protected elapsedTime: number = 0;
  
  // Stats for debugging
  protected stats: VizStats = {
    fps: 0,
    particleCount: 0,
    blobCount: 0,
    drawCalls: 0,
    lastFrameTime: 0,
  };
  
  protected fpsHistory: number[] = [];
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }
  
  /** Get the name of this visualization mode */
  abstract get name(): string;
  
  /** Initialize the renderer with configuration */
  abstract init(config: VizConfig): void;
  
  /** Render a single frame with the given musical data */
  abstract renderFrame(data: VizMusicalData, config: VizConfigBase): void;
  
  /** Clean up any resources */
  abstract dispose(): void;
  
  /** Start the render loop */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.elapsedTime = 0;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }
  
  /** Stop the render loop */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isRunning = false;
  }
  
  /** Handle canvas resize */
  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }
  
  /** Get current stats */
  getStats(): VizStats {
    return { ...this.stats };
  }
  
  /** Main render loop */
  private loop = (timestamp: number): void => {
    const frameStart = performance.now();
    
    try {
      this.deltaTime = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      this.elapsedTime += this.deltaTime;
      
      // Extract musical data
      const data = extractVizData();
      
      // Get current config (subclass should provide this)
      const config = this.getConfig();
      
      // Clear background
      this.clearBackground(config.colorPalette);
      
      // Reset draw call counter
      this.stats.drawCalls = 0;
      
      // Render the frame
      this.renderFrame(data, config);
      
      // Update FPS
      this.updateFps(timestamp);
      
      // Record frame time
      this.stats.lastFrameTime = performance.now() - frameStart;
      
    } catch (error) {
      console.error('Viz render error:', error);
    }
    
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  };
  
  /** Get current configuration (override in subclass) */
  protected getConfig(): VizConfigBase {
    return {
      colorPalette: DEFAULT_PALETTE,
      intensity: 0.8,
      trailLength: 0.5,
      reactivity: 0.7,
      backgroundOpacity: 0.95,
    };
  }
  
  /** Clear the canvas with background color */
  protected clearBackground(palette: ColorPalette): void {
    this.ctx.fillStyle = palette.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  /** Fade the canvas for trail effects */
  protected fadeBackground(palette: ColorPalette, alpha: number): void {
    this.ctx.fillStyle = palette.background;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalAlpha = 1;
  }
  
  /** Update FPS calculation */
  private updateFps(timestamp: number): void {
    this.fpsHistory.push(timestamp);
    
    // Keep only last second of frames
    const oneSecondAgo = timestamp - 1000;
    while (this.fpsHistory.length > 0 && this.fpsHistory[0]! < oneSecondAgo) {
      this.fpsHistory.shift();
    }
    
    this.stats.fps = this.fpsHistory.length;
  }
  
  // =========================================================================
  // UTILITY DRAWING METHODS
  // =========================================================================
  
  /** Draw a circle with optional glow */
  protected drawCircle(
    x: number, 
    y: number, 
    radius: number, 
    color: string, 
    glow: boolean = false
  ): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    if (glow) {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = radius * 2;
    }
    
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    if (glow) {
      this.ctx.shadowBlur = 0;
    }
    
    this.stats.drawCalls++;
  }
  
  /** Draw a line */
  protected drawLine(
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number, 
    color: string, 
    width: number = 1
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.stroke();
    this.stats.drawCalls++;
  }
  
  /** Draw a polygon */
  protected drawPolygon(
    points: { x: number; y: number }[], 
    color: string, 
    fill: boolean = true
  ): void {
    if (points.length < 3) return;
    
    this.ctx.beginPath();
    this.ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    this.ctx.closePath();
    
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
    
    this.stats.drawCalls++;
  }
  
  /** Apply viewport transform for world-space rendering */
  protected applyViewportTransform(
    panOffset: { x: number; y: number }, 
    zoomLevel: number
  ): void {
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(zoomLevel, zoomLevel);
    this.ctx.translate(-panOffset.x, -panOffset.y);
  }
  
  /** Restore viewport transform */
  protected restoreViewportTransform(): void {
    this.ctx.restore();
  }
  
  /** Convert HSL to CSS color string */
  protected hslColor(h: number, s: number, l: number, a: number = 1): string {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  }
  
  /** Lerp between two values */
  protected lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  /** Smooth step interpolation */
  protected smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }
  
  /** Clamp a value between min and max */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  /** Map a value from one range to another */
  protected map(
    value: number, 
    inMin: number, 
    inMax: number, 
    outMin: number, 
    outMax: number
  ): number {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  }
  
  /** Generate perlin-like noise for organic movement */
  protected noise(x: number, y: number, t: number): number {
    // Simple pseudo-noise using sin waves
    return (
      Math.sin(x * 0.1 + t) * 0.5 +
      Math.sin(y * 0.1 + t * 0.7) * 0.5 +
      Math.sin((x + y) * 0.05 + t * 0.3) * 0.5
    ) / 1.5;
  }
}
