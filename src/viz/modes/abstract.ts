// Phonon Viz - Abstract Mode
// Organic flowing shapes that respond to packet movement

import type { VizMusicalData, AbstractVizConfig, VizConfigBase, VizConfig } from '@core/types';
import type { Blob } from '../types';
import { VizRenderer } from '../renderer';
import { DEFAULT_PALETTE, getColorFromPalette } from '../palettes';

/** Default abstract configuration */
export const DEFAULT_ABSTRACT_CONFIG: AbstractVizConfig = {
  colorPalette: DEFAULT_PALETTE,
  intensity: 0.8,
  trailLength: 0.6,
  reactivity: 0.7,
  backgroundOpacity: 0.95,
  flowSpeed: 0.5,
  organicness: 0.7,
  blobCount: 8,
};

/** Abstract visualization renderer */
export class AbstractRenderer extends VizRenderer {
  private config: AbstractVizConfig = DEFAULT_ABSTRACT_CONFIG;
  private blobs: Blob[] = [];
  private time: number = 0;
  
  get name(): string {
    return 'Abstract';
  }
  
  init(config: VizConfig): void {
    if (config.mode === 'abstract') {
      this.config = { ...DEFAULT_ABSTRACT_CONFIG, ...config };
    }
    this.initBlobs();
  }
  
  dispose(): void {
    this.blobs = [];
  }
  
  protected override getConfig(): VizConfigBase {
    return this.config;
  }
  
  /** Initialize blobs */
  private initBlobs(): void {
    this.blobs = [];
    for (let i = 0; i < this.config.blobCount; i++) {
      this.blobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 50 + Math.random() * 100,
        targetRadius: 50 + Math.random() * 100,
        hue: (i / this.config.blobCount) * 360,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      });
    }
  }
  
  renderFrame(data: VizMusicalData, _config: VizConfigBase): void {
    const cfg = this.config;
    this.time += this.deltaTime * cfg.flowSpeed;
    
    // Fade background for trails
    const fadeAlpha = 1 - cfg.trailLength;
    this.fadeBackground(cfg.colorPalette, fadeAlpha * 0.2);
    
    // Update blobs based on musical data
    this.updateBlobs(data, cfg);
    
    // Render metaballs
    this.renderMetaballs(cfg);
    
    // Render packet trails
    this.renderPacketTrails(data, cfg);
    
    // Update stats
    this.stats.blobCount = this.blobs.length;
  }
  
  /** Update blob positions and sizes based on music */
  private updateBlobs(data: VizMusicalData, cfg: AbstractVizConfig): void {
    const dt = this.deltaTime;
    const reactivity = cfg.reactivity;
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    // If we have fewer blobs than packets, add more
    while (this.blobs.length < data.packets.length && this.blobs.length < 20) {
      const packet = data.packets[this.blobs.length];
      if (packet) {
        this.blobs.push({
          x: packet.x,
          y: packet.y,
          radius: 30 + packet.intensity * 70,
          targetRadius: 30 + packet.intensity * 70,
          hue: packet.hue,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5,
        });
      }
    }
    
    for (let i = 0; i < this.blobs.length; i++) {
      const blob = this.blobs[i]!;
      
      // Find nearest packet to follow
      const packet = data.packets[i % data.packets.length];
      
      if (packet) {
        // Smoothly move towards packet
        const dx = packet.x - blob.x;
        const dy = packet.y - blob.y;
        blob.x += dx * dt * 2 * reactivity;
        blob.y += dy * dt * 2 * reactivity;
        
        // Update target radius based on intensity
        blob.targetRadius = 40 + packet.intensity * 100;
        blob.hue = this.lerp(blob.hue, packet.hue, dt * 2);
      } else {
        // Autonomous movement using noise
        const noiseX = this.noise(blob.x * 0.01, blob.y * 0.01, this.time);
        const noiseY = this.noise(blob.x * 0.01 + 100, blob.y * 0.01 + 100, this.time);
        
        blob.x += noiseX * 50 * dt * cfg.organicness;
        blob.y += noiseY * 50 * dt * cfg.organicness;
        
        // Wrap around edges
        if (blob.x < -100) blob.x = this.width + 100;
        if (blob.x > this.width + 100) blob.x = -100;
        if (blob.y < -100) blob.y = this.height + 100;
        if (blob.y > this.height + 100) blob.y = -100;
      }
      
      // Pulse radius on beat
      const pulsedTarget = blob.targetRadius * (1 + beatPulse * 0.3 * cfg.intensity);
      blob.radius = this.lerp(blob.radius, pulsedTarget, dt * 5);
      
      // Rotate hue over time
      blob.hue = (blob.hue + dt * 10) % 360;
    }
  }
  
  /** Render metaballs effect */
  private renderMetaballs(cfg: AbstractVizConfig): void {
    const ctx = this.ctx;
    
    // For each blob, draw a radial gradient
    for (const blob of this.blobs) {
      const gradient = ctx.createRadialGradient(
        blob.x, blob.y, 0,
        blob.x, blob.y, blob.radius * 2
      );
      
      const color = getColorFromPalette(cfg.colorPalette, blob.hue / 360);
      
      gradient.addColorStop(0, color);
      ctx.globalAlpha = cfg.intensity;
      gradient.addColorStop(0.4, color);
      ctx.globalAlpha = cfg.intensity * 0.5;
      gradient.addColorStop(1, 'transparent');
      
      ctx.globalAlpha = cfg.intensity;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.globalAlpha = 1;
      
      this.stats.drawCalls++;
    }
    
    // Draw blob cores
    for (const blob of this.blobs) {
      const coreColor = getColorFromPalette(cfg.colorPalette, blob.hue / 360);
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = coreColor;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = cfg.intensity;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
      this.stats.drawCalls++;
    }
  }
  
  /** Render fading trails following packets */
  private renderPacketTrails(data: VizMusicalData, cfg: AbstractVizConfig): void {
    const ctx = this.ctx;
    
    for (const packet of data.packets) {
      // Get color from palette
      const trailColor = getColorFromPalette(cfg.colorPalette, packet.hue / 360);
      
      // Draw a line in the direction of motion
      const trailLength = 30 * cfg.trailLength;
      const x2 = packet.x - (packet.vx / 100) * trailLength;
      const y2 = packet.y - (packet.vy / 100) * trailLength;
      
      const gradient = ctx.createLinearGradient(packet.x, packet.y, x2, y2);
      gradient.addColorStop(0, trailColor);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.moveTo(packet.x, packet.y);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3 + packet.intensity * 5;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Draw packet core
      ctx.beginPath();
      ctx.arc(packet.x, packet.y, 4 + packet.intensity * 8, 0, Math.PI * 2);
      ctx.fillStyle = trailColor;
      ctx.shadowColor = trailColor;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      this.stats.drawCalls += 2;
    }
  }
}
