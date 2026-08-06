// Stochastic Viz - Spectral Mode
// Real-time frequency spectrum visualization

import type { VizMusicalData, SpectralVizConfig, VizConfigBase, VizConfig } from '@core/types';
import type { FrequencyBin } from '../types';
import { VizRenderer } from '../renderer';
import { DEFAULT_PALETTE, getColorFromPalette } from '../palettes';

/** Default spectral configuration */
export const DEFAULT_SPECTRAL_CONFIG: SpectralVizConfig = {
  colorPalette: DEFAULT_PALETTE,
  intensity: 0.8,
  trailLength: 0.3,
  reactivity: 0.8,
  backgroundOpacity: 0.95,
  barCount: 32,
  mirrorMode: true,
  circularLayout: false,
};

/** Spectral visualization renderer */
export class SpectralRenderer extends VizRenderer {
  private config: SpectralVizConfig = DEFAULT_SPECTRAL_CONFIG;
  private bins: FrequencyBin[] = [];
  private smoothedBins: number[] = [];
  
  get name(): string {
    return 'Spectral';
  }
  
  init(config: VizConfig): void {
    if (config.mode === 'spectral') {
      this.config = { ...DEFAULT_SPECTRAL_CONFIG, ...config };
    }
    this.initBins();
  }
  
  dispose(): void {
    this.bins = [];
    this.smoothedBins = [];
  }
  
  protected override getConfig(): VizConfigBase {
    return this.config;
  }
  
  /** Initialize frequency bins */
  private initBins(): void {
    this.bins = [];
    this.smoothedBins = [];
    
    for (let i = 0; i < this.config.barCount; i++) {
      const normalizedPos = i / this.config.barCount;
      this.bins.push({
        frequency: 20 * Math.pow(1000, normalizedPos), // Log scale 20Hz - 20kHz
        magnitude: 0,
        targetMagnitude: 0,
        hue: normalizedPos * 360,
      });
      this.smoothedBins.push(0);
    }
  }
  
  renderFrame(data: VizMusicalData, _config: VizConfigBase): void {
    const cfg = this.config;
    
    // Clear background
    this.clearBackground(cfg.colorPalette);
    
    // Update bins from musical data
    this.updateBins(data, cfg);
    
    // Render based on layout mode
    if (cfg.circularLayout) {
      this.renderCircular(cfg, data);
    } else {
      this.renderLinear(cfg, data);
    }
  }
  
  /** Update frequency bins from packet/note data */
  private updateBins(data: VizMusicalData, cfg: SpectralVizConfig): void {
    const dt = this.deltaTime;
    
    // Reset target magnitudes
    for (const bin of this.bins) {
      bin.targetMagnitude = 0;
    }
    
    // Map packets to bins based on frequency
    for (const packet of data.packets) {
      const freq = packet.frequency as number;
      const binIndex = this.frequencyToBin(freq);
      if (binIndex >= 0 && binIndex < this.bins.length) {
        const bin = this.bins[binIndex]!;
        bin.targetMagnitude = Math.max(bin.targetMagnitude, packet.intensity);
      }
    }
    
    // Add some activity on beat
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    for (let i = 0; i < this.bins.length; i++) {
      const bin = this.bins[i]!;
      // Bass emphasis on beat
      if (i < this.bins.length / 4) {
        bin.targetMagnitude += beatPulse * 0.3 * cfg.intensity;
      }
    }
    
    // Smooth towards target
    const smoothing = cfg.reactivity * 10;
    const decay = 3;
    
    for (let i = 0; i < this.bins.length; i++) {
      const bin = this.bins[i]!;
      
      if (bin.targetMagnitude > bin.magnitude) {
        // Fast attack
        bin.magnitude = this.lerp(bin.magnitude, bin.targetMagnitude, dt * smoothing);
      } else {
        // Slower decay
        bin.magnitude = this.lerp(bin.magnitude, bin.targetMagnitude, dt * decay);
      }
      
      // Additional smoothing
      this.smoothedBins[i] = this.lerp(this.smoothedBins[i]!, bin.magnitude, dt * 15);
    }
  }
  
  /** Convert frequency to bin index */
  private frequencyToBin(freq: number): number {
    const minFreq = 20;
    const maxFreq = 20000;
    const logMin = Math.log(minFreq);
    const logMax = Math.log(maxFreq);
    const logFreq = Math.log(Math.max(minFreq, Math.min(maxFreq, freq)));
    const normalized = (logFreq - logMin) / (logMax - logMin);
    return Math.floor(normalized * this.bins.length);
  }
  
  /** Render linear spectrum bars */
  private renderLinear(cfg: SpectralVizConfig, _data: VizMusicalData): void {
    const ctx = this.ctx;
    const barCount = this.bins.length;
    const gap = 2;
    const barWidth = (this.width - gap * (barCount - 1)) / barCount;
    const maxHeight = this.height * 0.4;
    
    const baseY = cfg.mirrorMode ? this.height / 2 : this.height;
    
    for (let i = 0; i < barCount; i++) {
      const bin = this.bins[i]!;
      const smoothed = this.smoothedBins[i]!;
      const x = i * (barWidth + gap);
      const height = smoothed * maxHeight * cfg.intensity;
      
      if (height < 1) continue;
      
      // Get color from palette
      const baseColor = getColorFromPalette(cfg.colorPalette, bin.hue / 360);
      const brightColor = getColorFromPalette(cfg.colorPalette, (bin.hue / 360 + 0.1) % 1);
      
      // Create gradient
      const gradient = ctx.createLinearGradient(x, baseY, x, baseY - height);
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, brightColor);
      
      // Draw bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x, baseY - height, barWidth, height);
      
      // Mirror mode - draw below too
      if (cfg.mirrorMode) {
        const gradientMirror = ctx.createLinearGradient(x, baseY, x, baseY + height);
        gradientMirror.addColorStop(0, baseColor);
        gradientMirror.addColorStop(1, brightColor);
        
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = gradientMirror;
        ctx.fillRect(x, baseY, barWidth, height);
        ctx.globalAlpha = 1;
      }
      
      // Glow on top
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = brightColor;
      ctx.fillRect(x, baseY - height - 2, barWidth, 4);
      ctx.shadowBlur = 0;
      
      this.stats.drawCalls += 2;
    }
    
    // Draw center line
    ctx.strokeStyle = this.hslColor(0, 0, 50, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(this.width, baseY);
    ctx.stroke();
  }
  
  /** Render circular spectrum */
  private renderCircular(cfg: SpectralVizConfig, data: VizMusicalData): void {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const innerRadius = Math.min(this.width, this.height) * 0.15;
    const maxBarLength = Math.min(this.width, this.height) * 0.3;
    
    const barCount = this.bins.length;
    const angleStep = (Math.PI * 2) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const bin = this.bins[i]!;
      const smoothed = this.smoothedBins[i]!;
      const angle = i * angleStep - Math.PI / 2;
      
      const barLength = smoothed * maxBarLength * cfg.intensity;
      if (barLength < 1) continue;
      
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * (innerRadius + barLength);
      const y2 = centerY + Math.sin(angle) * (innerRadius + barLength);
      
      // Get color from palette
      const barColor = getColorFromPalette(cfg.colorPalette, bin.hue / 360);
      
      // Draw bar as line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = barColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Mirror on inside if enabled
      if (cfg.mirrorMode) {
        const x2Inner = centerX + Math.cos(angle) * (innerRadius - barLength * 0.5);
        const y2Inner = centerY + Math.sin(angle) * (innerRadius - barLength * 0.5);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2Inner, y2Inner);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = barColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      
      this.stats.drawCalls++;
    }
    
    // Draw center circle
    const centerColor = getColorFromPalette(cfg.colorPalette, (data.beat * 0.1) % 1);
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = centerColor;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Pulsing center
    const beatPulse = Math.pow(1 - data.beatPhase, 4);
    const pulseRadius = innerRadius * 0.8 * (0.5 + beatPulse * 0.5);
    
    const pulseColor = getColorFromPalette(cfg.colorPalette, (data.averageFrequency / 1000) % 1);
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = pulseColor;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
