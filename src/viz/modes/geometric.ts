// Stochastic Viz - Geometric Mode
// Crystalline patterns with rotational symmetry

import type { VizMusicalData, GeometricVizConfig, VizConfigBase, VizConfig } from '@core/types';
import { VizRenderer } from '../renderer';
import { DEFAULT_PALETTE, getColorFromPalette } from '../palettes';

/** Default geometric configuration */
export const DEFAULT_GEOMETRIC_CONFIG: GeometricVizConfig = {
  colorPalette: DEFAULT_PALETTE,
  intensity: 0.8,
  trailLength: 0.4,
  reactivity: 0.7,
  backgroundOpacity: 0.95,
  symmetry: 6,
  lineWeight: 2,
  fillMode: 'outline',
};

interface GeometricShape {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  targetScale: number;
  sides: number;
  hue: number;
  phase: number;
  innerRotation: number;
}

/** Geometric visualization renderer */
export class GeometricRenderer extends VizRenderer {
  private config: GeometricVizConfig = DEFAULT_GEOMETRIC_CONFIG;
  private shapes: GeometricShape[] = [];
  private time: number = 0;
  private globalRotation: number = 0;
  
  get name(): string {
    return 'Geometric';
  }
  
  init(config: VizConfig): void {
    if (config.mode === 'geometric') {
      this.config = { ...DEFAULT_GEOMETRIC_CONFIG, ...config };
    }
    this.initShapes();
  }
  
  dispose(): void {
    this.shapes = [];
  }
  
  protected override getConfig(): VizConfigBase {
    return this.config;
  }
  
  /** Initialize geometric shapes */
  private initShapes(): void {
    this.shapes = [];
    const count = 12;
    
    for (let i = 0; i < count; i++) {
      this.shapes.push({
        x: this.width / 2,
        y: this.height / 2,
        rotation: (i / count) * Math.PI * 2,
        scale: 50 + i * 20,
        targetScale: 50 + i * 20,
        sides: 3 + (i % 4),
        hue: (i / count) * 360,
        phase: i * 0.5,
        innerRotation: 0,
      });
    }
  }
  
  renderFrame(data: VizMusicalData, _config: VizConfigBase): void {
    const cfg = this.config;
    this.time += this.deltaTime;
    
    // Fade background
    const fadeAlpha = 1 - cfg.trailLength;
    this.fadeBackground(cfg.colorPalette, fadeAlpha * 0.15);
    
    // Update global rotation based on beat
    const beatPulse = Math.pow(1 - data.beatPhase, 3);
    this.globalRotation += this.deltaTime * 0.2 * (1 + beatPulse * cfg.reactivity);
    
    // Update shapes based on musical data
    this.updateShapes(data, cfg);
    
    // Render with symmetry
    this.renderWithSymmetry(cfg, data);
  }
  
  /** Update shape properties based on music */
  private updateShapes(data: VizMusicalData, cfg: GeometricVizConfig): void {
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i]!;
      
      // Find matching packet for this shape
      const packet = data.packets[i % Math.max(1, data.packets.length)];
      
      if (packet) {
        // React to packet intensity
        shape.targetScale = 50 + i * 20 + packet.intensity * 100 * cfg.intensity;
        shape.hue = this.lerp(shape.hue, packet.hue, this.deltaTime * 3);
      }
      
      // Pulse on beat
      const pulseFactor = 1 + beatPulse * 0.4 * cfg.intensity;
      shape.scale = this.lerp(shape.scale, shape.targetScale * pulseFactor, this.deltaTime * 8);
      
      // Rotate inner shape
      shape.innerRotation += this.deltaTime * (0.5 + i * 0.1);
    }
  }
  
  /** Render shapes with rotational symmetry */
  private renderWithSymmetry(cfg: GeometricVizConfig, data: VizMusicalData): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const symmetry = cfg.symmetry;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.globalRotation);
    
    // Draw each symmetry segment
    for (let s = 0; s < symmetry; s++) {
      ctx.save();
      ctx.rotate((s / symmetry) * Math.PI * 2);
      
      // Draw shapes
      for (const shape of this.shapes) {
        this.drawShape(shape, cfg, data);
      }
      
      // Draw connecting lines to packets
      this.drawPacketConnections(data, cfg);
      
      ctx.restore();
    }
    
    ctx.restore();
    
    // Central focal point
    this.drawCentralPoint(data, cfg);
  }
  
  /** Draw a single geometric shape */
  private drawShape(shape: GeometricShape, cfg: GeometricVizConfig, _data: VizMusicalData): void {
    const ctx = this.ctx;
    const color = getColorFromPalette(cfg.colorPalette, shape.hue / 360);
    
    ctx.save();
    ctx.rotate(shape.rotation + shape.innerRotation);
    ctx.translate(shape.scale * 0.3, 0);
    
    ctx.beginPath();
    
    const sides = shape.sides;
    const size = shape.scale * 0.2;
    
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    
    ctx.lineWidth = cfg.lineWeight;
    ctx.strokeStyle = color;
    
    if (cfg.fillMode === 'solid') {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (cfg.fillMode === 'gradient') {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    ctx.stroke();
    ctx.restore();
  }
  
  /** Draw lines connecting to packet positions */
  private drawPacketConnections(data: VizMusicalData, cfg: GeometricVizConfig): void {
    const ctx = this.ctx;
    
    for (const packet of data.packets.slice(0, 5)) {
      const color = getColorFromPalette(cfg.colorPalette, packet.hue / 360);
      const dist = Math.hypot(packet.x - this.width / 2, packet.y - this.height / 2);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist * 0.3, 0);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = cfg.lineWeight * 0.5;
      ctx.globalAlpha = packet.intensity * cfg.intensity * 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  
  /** Draw central focal point */
  private drawCentralPoint(data: VizMusicalData, cfg: GeometricVizConfig): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    const radius = 20 + beatPulse * 30 * cfg.intensity;
    const color = getColorFromPalette(cfg.colorPalette, (this.time * 0.1) % 1);
    
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
