// Phonon Viz - Kaleidoscope Mode
// Symmetric reflections and rotations

import type { VizMusicalData, KaleidoscopeVizConfig, VizConfigBase, VizConfig } from '@core/types';
import { VizRenderer } from '../renderer';
import { DEFAULT_PALETTE, getColorFromPalette } from '../palettes';

/** Default kaleidoscope configuration */
export const DEFAULT_KALEIDOSCOPE_CONFIG: KaleidoscopeVizConfig = {
  colorPalette: DEFAULT_PALETTE,
  intensity: 0.8,
  trailLength: 0.6,
  reactivity: 0.7,
  backgroundOpacity: 0.95,
  segments: 8,
  rotation: 0.3,
  zoom: 1,
};

interface KaleidoElement {
  x: number;
  y: number;
  size: number;
  targetSize: number;
  hue: number;
  type: 'circle' | 'line' | 'triangle';
  rotation: number;
  age: number;
}

/** Kaleidoscope visualization renderer */
export class KaleidoscopeRenderer extends VizRenderer {
  private config: KaleidoscopeVizConfig = DEFAULT_KALEIDOSCOPE_CONFIG;
  private elements: KaleidoElement[] = [];
  private time: number = 0;
  private globalRotation: number = 0;
  
  get name(): string {
    return 'Kaleidoscope';
  }
  
  init(config: VizConfig): void {
    if (config.mode === 'kaleidoscope') {
      this.config = { ...DEFAULT_KALEIDOSCOPE_CONFIG, ...config };
    }
    this.elements = [];
  }
  
  dispose(): void {
    this.elements = [];
  }
  
  override resize(width: number, height: number): void {
    super.resize(width, height);
  }
  
  protected override getConfig(): VizConfigBase {
    return this.config;
  }
  
  renderFrame(data: VizMusicalData, _config: VizConfigBase): void {
    const cfg = this.config;
    this.time += this.deltaTime;
    
    // Update global rotation
    const beatPulse = Math.pow(1 - data.beatPhase, 3);
    this.globalRotation += this.deltaTime * cfg.rotation * (1 + beatPulse * 0.5);
    
    // Fade background
    const fadeAlpha = 1 - cfg.trailLength;
    this.fadeBackground(cfg.colorPalette, fadeAlpha * 0.1);
    
    // Update elements based on musical data
    this.updateElements(data, cfg);
    
    // Render with kaleidoscope symmetry
    this.renderKaleidoscope(cfg, data);
  }
  
  /** Update kaleidoscope elements based on music */
  private updateElements(data: VizMusicalData, cfg: KaleidoscopeVizConfig): void {
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    // Spawn new elements from packets
    for (const packet of data.packets) {
      // Chance to spawn based on beat
      if (beatPulse > 0.9 && Math.random() < 0.3 * cfg.intensity) {
        this.elements.push({
          x: packet.x - this.width / 2,
          y: packet.y - this.height / 2,
          size: 5 + packet.intensity * 30,
          targetSize: 5 + packet.intensity * 30,
          hue: packet.hue,
          type: ['circle', 'line', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'line' | 'triangle',
          rotation: Math.random() * Math.PI * 2,
          age: 0,
        });
      }
    }
    
    // Update existing elements
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const elem = this.elements[i]!;
      elem.age += this.deltaTime;
      
      // Grow and fade
      elem.size = this.lerp(elem.size, elem.targetSize * 2, this.deltaTime * 0.5);
      elem.rotation += this.deltaTime * 0.5;
      
      // Move outward
      const dist = Math.hypot(elem.x, elem.y);
      const angle = Math.atan2(elem.y, elem.x);
      const speed = 30 * cfg.zoom;
      elem.x += Math.cos(angle) * speed * this.deltaTime;
      elem.y += Math.sin(angle) * speed * this.deltaTime;
      
      // Remove old or out-of-bounds elements
      const maxDist = Math.max(this.width, this.height);
      if (elem.age > 5 || dist > maxDist) {
        this.elements.splice(i, 1);
      }
    }
    
    // Limit element count
    while (this.elements.length > 100) {
      this.elements.shift();
    }
  }
  
  /** Render with kaleidoscope symmetry */
  private renderKaleidoscope(cfg: KaleidoscopeVizConfig, data: VizMusicalData): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const segments = cfg.segments;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.globalRotation);
    
    // Draw each segment
    for (let s = 0; s < segments; s++) {
      ctx.save();
      ctx.rotate((s / segments) * Math.PI * 2);
      
      // Mirror alternate segments
      if (s % 2 === 1) {
        ctx.scale(-1, 1);
      }
      
      // Clip to segment
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const segmentAngle = Math.PI / segments;
      ctx.lineTo(Math.cos(-segmentAngle) * this.width, Math.sin(-segmentAngle) * this.width);
      ctx.lineTo(Math.cos(segmentAngle) * this.width, Math.sin(segmentAngle) * this.width);
      ctx.closePath();
      ctx.clip();
      
      // Draw elements
      for (const elem of this.elements) {
        this.drawElement(elem, cfg);
      }
      
      // Draw packet trails
      this.drawPacketTrails(data, cfg);
      
      ctx.restore();
    }
    
    ctx.restore();
    
    // Central decoration
    this.drawCenter(cfg, data);
  }
  
  /** Draw a single element */
  private drawElement(elem: KaleidoElement, cfg: KaleidoscopeVizConfig): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, 1 - elem.age / 5) * cfg.intensity;
    const color = getColorFromPalette(cfg.colorPalette, elem.hue / 360);
    
    ctx.save();
    ctx.translate(elem.x, elem.y);
    ctx.rotate(elem.rotation);
    ctx.globalAlpha = alpha;
    
    switch (elem.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, elem.size, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
        
      case 'line':
        ctx.beginPath();
        ctx.moveTo(-elem.size, 0);
        ctx.lineTo(elem.size, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
        
      case 'triangle':
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * elem.size;
          const y = Math.sin(angle) * elem.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  }
  
  /** Draw trails from packets */
  private drawPacketTrails(data: VizMusicalData, cfg: KaleidoscopeVizConfig): void {
    const ctx = this.ctx;
    
    for (const packet of data.packets.slice(0, 10)) {
      const x = packet.x - this.width / 2;
      const y = packet.y - this.height / 2;
      const color = getColorFromPalette(cfg.colorPalette, packet.hue / 360);
      
      // Draw trail from center to packet
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + packet.intensity * 3;
      ctx.globalAlpha = packet.intensity * cfg.intensity * 0.5;
      ctx.stroke();
      
      // Draw point at packet
      ctx.beginPath();
      ctx.arc(x, y, 3 + packet.intensity * 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = packet.intensity * cfg.intensity;
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }
  
  /** Draw central decoration */
  private drawCenter(cfg: KaleidoscopeVizConfig, data: VizMusicalData): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    const baseRadius = 30 + beatPulse * 20 * cfg.intensity;
    const hue = (this.time * 30) % 360;
    const color = getColorFromPalette(cfg.colorPalette, hue / 360);
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    
    // Inner glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.8);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }
}
