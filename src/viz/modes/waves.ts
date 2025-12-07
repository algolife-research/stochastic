// Phonon Viz - Waves Mode
// Interference patterns and oscillating waves

import type { VizMusicalData, WavesVizConfig, VizConfigBase, VizConfig } from '@core/types';
import { VizRenderer } from '../renderer';
import { DEFAULT_PALETTE, getColorFromPalette } from '../palettes';

/** Default waves configuration */
export const DEFAULT_WAVES_CONFIG: WavesVizConfig = {
  colorPalette: DEFAULT_PALETTE,
  intensity: 0.8,
  trailLength: 0.5,
  reactivity: 0.7,
  backgroundOpacity: 0.95,
  waveCount: 5,
  amplitude: 0.5,
  interference: true,
};

interface WaveSource {
  x: number;
  y: number;
  frequency: number;
  phase: number;
  amplitude: number;
  hue: number;
  active: boolean;
}

/** Waves visualization renderer */
export class WavesRenderer extends VizRenderer {
  private config: WavesVizConfig = DEFAULT_WAVES_CONFIG;
  private sources: WaveSource[] = [];
  private time: number = 0;
  
  get name(): string {
    return 'Waves';
  }
  
  init(config: VizConfig): void {
    if (config.mode === 'waves') {
      this.config = { ...DEFAULT_WAVES_CONFIG, ...config };
    }
    this.initSources();
  }
  
  dispose(): void {
    this.sources = [];
  }
  
  override resize(width: number, height: number): void {
    super.resize(width, height);
  }
  
  protected override getConfig(): VizConfigBase {
    return this.config;
  }
  
  /** Initialize wave sources */
  private initSources(): void {
    this.sources = [];
    const count = this.config.waveCount;
    
    for (let i = 0; i < count; i++) {
      this.sources.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        frequency: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.5 + Math.random() * 0.5,
        hue: (i / count) * 360,
        active: true,
      });
    }
  }
  
  renderFrame(data: VizMusicalData, _config: VizConfigBase): void {
    const cfg = this.config;
    this.time += this.deltaTime;
    
    // Fade background
    const fadeAlpha = 1 - cfg.trailLength;
    this.fadeBackground(cfg.colorPalette, fadeAlpha * 0.1);
    
    // Update sources based on musical data
    this.updateSources(data, cfg);
    
    // Render waves
    if (cfg.interference) {
      this.renderInterference(cfg, data);
    } else {
      this.renderConcentric(cfg, data);
    }
    
    // Render source points
    this.renderSourcePoints(cfg, data);
  }
  
  /** Update wave sources based on music */
  private updateSources(data: VizMusicalData, cfg: WavesVizConfig): void {
    const beatPulse = Math.pow(1 - data.beatPhase, 3);
    
    // Update existing sources or add new ones for packets
    for (let i = 0; i < Math.max(this.sources.length, data.packets.length); i++) {
      if (i < data.packets.length) {
        const packet = data.packets[i]!;
        
        if (i >= this.sources.length) {
          // Add new source
          this.sources.push({
            x: packet.x,
            y: packet.y,
            frequency: 1 + Math.hypot(packet.vx, packet.vy) * 0.01,
            phase: 0,
            amplitude: packet.intensity,
            hue: packet.hue,
            active: true,
          });
        } else {
          // Update existing source
          const source = this.sources[i]!;
          source.x = this.lerp(source.x, packet.x, this.deltaTime * 3 * cfg.reactivity);
          source.y = this.lerp(source.y, packet.y, this.deltaTime * 3 * cfg.reactivity);
          source.amplitude = this.lerp(source.amplitude, packet.intensity, this.deltaTime * 5);
          source.hue = this.lerp(source.hue, packet.hue, this.deltaTime * 2);
          source.frequency = 0.5 + Math.hypot(packet.vx, packet.vy) * 0.01;
          source.active = true;
        }
      } else if (i < this.sources.length) {
        // Fade out extra sources
        const source = this.sources[i]!;
        source.amplitude *= 0.95;
        if (source.amplitude < 0.01) {
          source.active = false;
        }
      }
    }
    
    // Update phases
    for (const source of this.sources) {
      source.phase += this.deltaTime * source.frequency * 3;
      // Pulse on beat
      if (beatPulse > 0.8) {
        source.amplitude = Math.min(1, source.amplitude + 0.2 * cfg.intensity);
      }
    }
  }
  
  /** Render interference pattern */
  private renderInterference(cfg: WavesVizConfig, data: VizMusicalData): void {
    const ctx = this.ctx;
    const step = 4; // Resolution
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    const activeSources = this.sources.filter(s => s.active && s.amplitude > 0.01);
    if (activeSources.length === 0) return;
    
    // Create image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const pixels = imageData.data;
    
    for (let y = 0; y < this.height; y += step) {
      for (let x = 0; x < this.width; x += step) {
        let totalWave = 0;
        let dominantHue = 0;
        let totalWeight = 0;
        
        for (const source of activeSources) {
          const dx = x - source.x;
          const dy = y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Wave equation
          const wave = Math.sin(dist * 0.05 * source.frequency - source.phase) * source.amplitude;
          totalWave += wave;
          
          // Weighted hue contribution
          const weight = source.amplitude / (1 + dist * 0.01);
          dominantHue += source.hue * weight;
          totalWeight += weight;
        }
        
        if (totalWeight > 0) {
          dominantHue /= totalWeight;
        }
        
        // Normalize wave value
        totalWave = (totalWave / activeSources.length + 1) / 2;
        totalWave = Math.pow(totalWave, 0.7);
        
        // Apply intensity and beat pulse
        const intensity = totalWave * cfg.intensity * cfg.amplitude * (1 + beatPulse * 0.3);
        
        // Get color from palette
        const color = getColorFromPalette(cfg.colorPalette, (dominantHue / 360 + this.time * 0.05) % 1);
        const rgb = this.hexToRgb(color);
        
        // Fill step x step block
        for (let dy = 0; dy < step && y + dy < this.height; dy++) {
          for (let dx = 0; dx < step && x + dx < this.width; dx++) {
            const idx = ((y + dy) * this.width + (x + dx)) * 4;
            pixels[idx] = Math.min(255, pixels[idx]! + rgb.r * intensity);
            pixels[idx + 1] = Math.min(255, pixels[idx + 1]! + rgb.g * intensity);
            pixels[idx + 2] = Math.min(255, pixels[idx + 2]! + rgb.b * intensity);
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
  
  /** Render concentric waves */
  private renderConcentric(cfg: WavesVizConfig, data: VizMusicalData): void {
    const ctx = this.ctx;
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    const activeSources = this.sources.filter(s => s.active && s.amplitude > 0.01);
    
    for (const source of activeSources) {
      const color = getColorFromPalette(cfg.colorPalette, source.hue / 360);
      const maxRadius = Math.max(this.width, this.height) * 0.8;
      const waveCount = 8;
      
      for (let i = 0; i < waveCount; i++) {
        const phase = (source.phase + i * 0.5) % (Math.PI * 2);
        const radius = (phase / (Math.PI * 2)) * maxRadius;
        const alpha = (1 - radius / maxRadius) * source.amplitude * cfg.intensity;
        
        if (alpha > 0.01) {
          ctx.beginPath();
          ctx.arc(source.x, source.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 + beatPulse * 2;
          ctx.globalAlpha = alpha;
          ctx.stroke();
        }
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  /** Render source points */
  private renderSourcePoints(cfg: WavesVizConfig, data: VizMusicalData): void {
    const ctx = this.ctx;
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    
    for (const source of this.sources) {
      if (!source.active || source.amplitude < 0.01) continue;
      
      const color = getColorFromPalette(cfg.colorPalette, source.hue / 360);
      const radius = 5 + source.amplitude * 15 * (1 + beatPulse * 0.5);
      
      // Glow
      const gradient = ctx.createRadialGradient(
        source.x, source.y, 0,
        source.x, source.y, radius * 2
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(source.x, source.y, radius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(source.x, source.y, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /** Convert hex color to RGB */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1]!, 16),
      g: parseInt(result[2]!, 16),
      b: parseInt(result[3]!, 16),
    } : { r: 255, g: 255, b: 255 };
  }
}
