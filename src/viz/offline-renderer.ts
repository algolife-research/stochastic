// Phonon v2 - Offline Viz Frame Renderer
// Renders visualization frames for video export without animation loop

import type { 
  VizConfig,
  VizMusicalData,
  VideoFrameData,
} from '@core/types';
import type { Particle, Blob, WaveSource, FrequencyBin } from './types';
import { DEFAULT_PALETTE, getColorFromPalette, midiToHue } from './palettes';
import { DEFAULT_PARTICLES_CONFIG } from './modes/particles';
import { DEFAULT_ABSTRACT_CONFIG } from './modes/abstract';
import { DEFAULT_SPECTRAL_CONFIG } from './modes/spectral';
import { DEFAULT_GEOMETRIC_CONFIG } from './modes/geometric';
import { DEFAULT_WAVES_CONFIG } from './modes/waves';
import { DEFAULT_KALEIDOSCOPE_CONFIG } from './modes/kaleidoscope';

/** Offline rendering state */
interface OfflineRenderState {
  particles: Particle[];
  blobs: Blob[];
  waveSources: WaveSource[];
  frequencyBins: FrequencyBin[];
  lastBeat: number;
  elapsedTime: number;
}

/**
 * Create initial render state for offline rendering
 */
export function createOfflineRenderState(): OfflineRenderState {
  return {
    particles: [],
    blobs: [],
    waveSources: [],
    frequencyBins: [],
    lastBeat: 0,
    elapsedTime: 0,
  };
}

/**
 * Render a single frame for video export
 */
export function renderOfflineFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  frameData: VideoFrameData,
  width: number,
  height: number,
  config: VizConfig | null,
  state: OfflineRenderState,
  deltaTime: number
): void {
  // Get config or use default
  const cfg = config ?? { mode: 'particles' as const, ...DEFAULT_PARTICLES_CONFIG };
  const palette = cfg.colorPalette ?? DEFAULT_PALETTE;
  
  // Convert VideoFrameData to VizMusicalData
  const musicalData: VizMusicalData = {
    beat: frameData.beat,
    bpm: 120, // Default BPM
    beatPhase: frameData.beatPhase,
    barPhase: frameData.barPhase,
    packets: frameData.packets,
    nodes: frameData.nodes,
    activeNotes: frameData.activeNotes,
    averageFrequency: frameData.averageFrequency,
    averageIntensity: frameData.averageIntensity,
    packetDensity: frameData.packetDensity,
  };
  
  // Clear background
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  
  // Render based on mode
  switch (cfg.mode) {
    case 'particles':
      renderParticlesFrame(ctx, musicalData, width, height, cfg, state, deltaTime);
      break;
    case 'abstract':
      renderAbstractFrame(ctx, musicalData, width, height, cfg, state, deltaTime);
      break;
    case 'spectral':
      renderSpectralFrame(ctx, musicalData, width, height, cfg, state, deltaTime);
      break;
    case 'geometric':
      renderGeometricFrame(ctx, musicalData, width, height, cfg, state, deltaTime);
      break;
    case 'waves':
      renderWavesFrame(ctx, musicalData, width, height, cfg, state, deltaTime);
      break;
    case 'kaleidoscope':
      renderKaleidoscopeFrame(ctx, musicalData, width, height, cfg, state, deltaTime);
      break;
  }
  
  // Update elapsed time
  state.elapsedTime += deltaTime;
}

/** Render particles mode frame */
function renderParticlesFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  width: number,
  height: number,
  cfg: VizConfig,
  state: OfflineRenderState,
  dt: number
): void {
  const particleCfg = { ...DEFAULT_PARTICLES_CONFIG, ...cfg };
  const palette = cfg.colorPalette ?? DEFAULT_PALETTE;
  
  // Fade background for trails
  ctx.fillStyle = palette.background;
  ctx.globalAlpha = 0.1;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  
  // Emit particles from active speakers
  for (const node of data.nodes) {
    if (node.type === 'speaker' && node.flash > 0.5) {
      const hue = data.packets.find(p => {
        const dx = p.x - node.x;
        const dy = p.y - node.y;
        return Math.sqrt(dx * dx + dy * dy) < 50;
      })?.hue ?? Math.random() * 360;
      
      const burstCount = Math.floor(5 + particleCfg.intensity * 15 * node.flash);
      for (let i = 0; i < burstCount && state.particles.length < particleCfg.particleCount; i++) {
        state.particles.push(createParticle(node.x, node.y, hue));
      }
    }
  }
  
  // Emit on beat
  const currentBeat = Math.floor(data.beat);
  if (currentBeat !== state.lastBeat) {
    state.lastBeat = currentBeat;
    if (currentBeat % 4 === 0 && particleCfg.emitOnBeat) {
      const hue = (data.beat * 30) % 360;
      const count = Math.floor(20 * particleCfg.intensity);
      for (let i = 0; i < count && state.particles.length < particleCfg.particleCount; i++) {
        state.particles.push(createParticle(
          width / 2 + (seededRandom(state.elapsedTime + i) - 0.5) * 200,
          height / 2 + (seededRandom(state.elapsedTime + i + 1000) - 0.5) * 200,
          hue
        ));
      }
    }
  }
  
  // Update and render particles
  const gravity = particleCfg.gravity * 200;
  const beatPulse = Math.pow(1 - data.beatPhase, 3);
  
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i]!;
    
    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Apply gravity
    p.vy += gravity * dt;
    
    // Apply drag
    p.vx *= 0.99;
    p.vy *= 0.99;
    
    // Beat reactivity
    if (particleCfg.reactivity > 0) {
      const dx = p.x - width / 2;
      const dy = p.y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / dist) * beatPulse * particleCfg.reactivity * 50;
      p.vy += (dy / dist) * beatPulse * particleCfg.reactivity * 50;
    }
    
    // Update life
    p.life -= dt / p.maxLife;
    p.alpha = p.life;
    
    // Remove dead particles
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    
    // Render particle
    const size = p.size * particleCfg.particleSize * p.life;
    if (size >= 0.5) {
      const color = getColorFromPalette(palette, p.hue / 360);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 2;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }
}

/** Render abstract mode frame */
function renderAbstractFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  width: number,
  height: number,
  cfg: VizConfig,
  state: OfflineRenderState,
  dt: number
): void {
  const abstractCfg = { ...DEFAULT_ABSTRACT_CONFIG, ...cfg };
  const palette = cfg.colorPalette ?? DEFAULT_PALETTE;
  
  // Initialize blobs if needed
  if (state.blobs.length < abstractCfg.blobCount) {
    for (let i = state.blobs.length; i < abstractCfg.blobCount; i++) {
      state.blobs.push({
        x: seededRandom(i * 100) * width,
        y: seededRandom(i * 200) * height,
        radius: 50 + seededRandom(i * 300) * 100,
        targetRadius: 50 + seededRandom(i * 400) * 100,
        hue: seededRandom(i * 500) * 360,
        phase: seededRandom(i * 600) * Math.PI * 2,
        speed: 0.5 + seededRandom(i * 700) * 1,
      });
    }
  }
  
  // Fade background
  ctx.fillStyle = palette.background;
  ctx.globalAlpha = 0.05;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  
  // Update and render blobs
  const flowSpeed = abstractCfg.flowSpeed;
  
  for (const blob of state.blobs) {
    // Update blob position with organic movement
    blob.phase += dt * blob.speed * flowSpeed;
    blob.x += Math.sin(blob.phase) * 2 * flowSpeed;
    blob.y += Math.cos(blob.phase * 0.7) * 2 * flowSpeed;
    
    // Wrap around screen
    if (blob.x < -blob.radius) blob.x = width + blob.radius;
    if (blob.x > width + blob.radius) blob.x = -blob.radius;
    if (blob.y < -blob.radius) blob.y = height + blob.radius;
    if (blob.y > height + blob.radius) blob.y = -blob.radius;
    
    // React to music intensity
    blob.targetRadius = 50 + data.averageIntensity * 100 + Math.sin(blob.phase) * 30;
    blob.radius += (blob.targetRadius - blob.radius) * dt * 3;
    
    // Render blob
    const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
    const color = getColorFromPalette(palette, blob.hue / 360);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, hexToRgba(color, 0.5));
    gradient.addColorStop(1, hexToRgba(color, 0));
    
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Update hue based on activity
    blob.hue += data.averageIntensity * dt * 30;
    if (blob.hue > 360) blob.hue -= 360;
  }
}

/** Render spectral mode frame */
function renderSpectralFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  width: number,
  height: number,
  cfg: VizConfig,
  state: OfflineRenderState,
  dt: number
): void {
  const spectralCfg = { ...DEFAULT_SPECTRAL_CONFIG, ...cfg };
  const palette = cfg.colorPalette ?? DEFAULT_PALETTE;
  const barCount = spectralCfg.barCount;
  
  // Initialize frequency bins if needed
  if (state.frequencyBins.length !== barCount) {
    state.frequencyBins = [];
    for (let i = 0; i < barCount; i++) {
      state.frequencyBins.push({
        frequency: 100 + (i / barCount) * 4000,
        magnitude: 0,
        targetMagnitude: 0,
        hue: (i / barCount) * 360,
      });
    }
  }
  
  // Update bins based on active notes
  for (let i = 0; i < barCount; i++) {
    const bin = state.frequencyBins[i]!;
    const binFreqMin = 100 + (i / barCount) * 4000;
    const binFreqMax = 100 + ((i + 1) / barCount) * 4000;
    
    // Sum up activity in this frequency range
    let activity = 0;
    for (const note of data.activeNotes) {
      const freq = note.frequency as number;
      if (freq >= binFreqMin && freq < binFreqMax) {
        activity += note.gain * note.envelope;
      }
    }
    for (const packet of data.packets) {
      const freq = packet.frequency as number;
      if (freq >= binFreqMin && freq < binFreqMax) {
        activity += packet.intensity * 0.5;
      }
    }
    
    bin.targetMagnitude = Math.min(1, activity);
    bin.magnitude += (bin.targetMagnitude - bin.magnitude) * dt * 10;
    bin.magnitude *= 0.95; // Decay
  }
  
  // Render bars
  if (spectralCfg.circularLayout) {
    // Circular layout
    const centerX = width / 2;
    const centerY = height / 2;
    const innerRadius = Math.min(width, height) * 0.2;
    const outerRadius = Math.min(width, height) * 0.4;
    
    for (let i = 0; i < barCount; i++) {
      const bin = state.frequencyBins[i]!;
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const barHeight = bin.magnitude * (outerRadius - innerRadius);
      
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight);
      const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight);
      
      const color = getColorFromPalette(palette, i / barCount);
      ctx.strokeStyle = color;
      ctx.lineWidth = (Math.PI * 2 * innerRadius / barCount) * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else {
    // Linear layout
    const barWidth = width / barCount * 0.8;
    const gap = width / barCount * 0.1;
    const maxHeight = height * 0.8;
    
    for (let i = 0; i < barCount; i++) {
      const bin = state.frequencyBins[i]!;
      const barHeight = bin.magnitude * maxHeight;
      const x = i * (barWidth + gap) + gap;
      const y = height - barHeight;
      
      const color = getColorFromPalette(palette, i / barCount);
      
      // Gradient bar
      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, hexToRgba(color, 0.8));
      gradient.addColorStop(1, color);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Mirror if enabled
      if (spectralCfg.mirrorMode) {
        ctx.fillRect(width - x - barWidth, y, barWidth, barHeight);
      }
    }
  }
}

/** Render geometric mode frame */
function renderGeometricFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  width: number,
  height: number,
  cfg: VizConfig,
  state: OfflineRenderState,
  _dt: number
): void {
  const geomCfg = { ...DEFAULT_GEOMETRIC_CONFIG, ...cfg };
  const palette = cfg.colorPalette ?? DEFAULT_PALETTE;
  
  const centerX = width / 2;
  const centerY = height / 2;
  const symmetry = geomCfg.symmetry;
  const rotation = state.elapsedTime * 0.5 * data.beatPhase;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  
  // Draw geometric patterns based on nodes and packets
  for (let s = 0; s < symmetry; s++) {
    ctx.save();
    ctx.rotate((s / symmetry) * Math.PI * 2);
    
    // Draw lines from center to packet positions
    for (const packet of data.packets) {
      const dx = packet.x - centerX;
      const dy = packet.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      const color = getColorFromPalette(palette, packet.hue / 360);
      ctx.strokeStyle = color;
      ctx.lineWidth = geomCfg.lineWeight * packet.intensity;
      ctx.globalAlpha = 0.7;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * dist * 0.5,
        Math.sin(angle) * dist * 0.5
      );
      ctx.stroke();
    }
    
    // Draw node positions as vertices
    for (const node of data.nodes) {
      if (node.flash > 0.1) {
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const color = getColorFromPalette(palette, (angle + Math.PI) / (Math.PI * 2));
        ctx.fillStyle = color;
        ctx.globalAlpha = node.flash;
        
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * dist * 0.5,
          Math.sin(angle) * dist * 0.5,
          5 + node.flash * 10,
          0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
  
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Render waves mode frame */
function renderWavesFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  width: number,
  height: number,
  cfg: VizConfig,
  state: OfflineRenderState,
  dt: number
): void {
  const wavesCfg = { ...DEFAULT_WAVES_CONFIG, ...cfg };
  // palette not used directly in this mode (HSL calculated from hue)
  const _ = cfg.colorPalette ?? DEFAULT_PALETTE; void _;
  const waveTime = state.elapsedTime;
  
  // Create wave sources from active notes
  while (state.waveSources.length < wavesCfg.waveCount) {
    state.waveSources.push({
      x: width * (0.2 + seededRandom(state.waveSources.length * 100) * 0.6),
      y: height * (0.2 + seededRandom(state.waveSources.length * 200) * 0.6),
      frequency: 0.02 + seededRandom(state.waveSources.length * 300) * 0.03,
      amplitude: 0,
      phase: seededRandom(state.waveSources.length * 400) * Math.PI * 2,
      hue: seededRandom(state.waveSources.length * 500) * 360,
    });
  }
  
  // Update wave sources based on active notes
  for (let i = 0; i < state.waveSources.length; i++) {
    const source = state.waveSources[i]!;
    const note = data.activeNotes[i % Math.max(1, data.activeNotes.length)];
    
    if (note) {
      source.amplitude = note.gain * note.envelope * wavesCfg.amplitude;
      source.hue = midiToHue(Math.log2((note.frequency as number) / 440) * 12 + 69);
    } else {
      source.amplitude *= 0.95;
    }
    
    source.phase += dt * source.frequency * 10;
  }
  
  // Render interference pattern
  const imageData = ctx.createImageData(width, height);
  const pixelData = imageData.data;
  
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      let value = 0;
      let hueSum = 0;
      let hueCount = 0;
      
      for (const source of state.waveSources) {
        if (source.amplitude < 0.01) continue;
        
        const dx = x - source.x;
        const dy = y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * source.frequency - waveTime * 3 + source.phase);
        value += wave * source.amplitude;
        hueSum += source.hue * source.amplitude;
        hueCount += source.amplitude;
      }
      
      const hue = hueCount > 0 ? hueSum / hueCount : 180;
      const intensity = Math.abs(value);
      const color = hslToRgb(hue / 360, 0.8, 0.3 + intensity * 0.4);
      
      const idx = (y * width + x) * 4;
      pixelData[idx] = color.r;
      pixelData[idx + 1] = color.g;
      pixelData[idx + 2] = color.b;
      pixelData[idx + 3] = 255;
      
      // Fill 2x2 block for performance
      if (x + 1 < width) {
        pixelData[idx + 4] = color.r;
        pixelData[idx + 5] = color.g;
        pixelData[idx + 6] = color.b;
        pixelData[idx + 7] = 255;
      }
      if (y + 1 < height) {
        const idx2 = ((y + 1) * width + x) * 4;
        pixelData[idx2] = color.r;
        pixelData[idx2 + 1] = color.g;
        pixelData[idx2 + 2] = color.b;
        pixelData[idx2 + 3] = 255;
        if (x + 1 < width) {
          pixelData[idx2 + 4] = color.r;
          pixelData[idx2 + 5] = color.g;
          pixelData[idx2 + 6] = color.b;
          pixelData[idx2 + 7] = 255;
        }
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/** Render kaleidoscope mode frame */
function renderKaleidoscopeFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  width: number,
  height: number,
  cfg: VizConfig,
  state: OfflineRenderState,
  _dt: number
): void {
  const kalCfg = { ...DEFAULT_KALEIDOSCOPE_CONFIG, ...cfg };
  const kalPalette = cfg.colorPalette ?? DEFAULT_PALETTE;
  const segments = kalCfg.segments;
  const rotation = state.elapsedTime * kalCfg.rotation * 0.5;
  const zoom = 1 + kalCfg.zoom * data.averageIntensity * 0.5;
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.scale(zoom, zoom);
  
  // Draw kaleidoscope segments
  for (let s = 0; s < segments; s++) {
    ctx.save();
    ctx.rotate((s / segments) * Math.PI * 2);
    
    // Mirror every other segment
    if (s % 2 === 1) {
      ctx.scale(-1, 1);
    }
    
    // Draw packets as triangular patterns
    for (const packet of data.packets) {
      const dx = packet.x - centerX;
      const dy = packet.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) * 0.5;
      const angle = Math.atan2(dy, dx);
      
      const color = getColorFromPalette(kalPalette, packet.hue / 360);
      ctx.fillStyle = color;
      ctx.globalAlpha = packet.intensity * 0.7;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist / segments
      );
      ctx.lineTo(
        Math.cos(angle + 0.2) * dist,
        Math.sin(angle + 0.2) * dist / segments
      );
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw active notes as glowing circles
    for (const note of data.activeNotes) {
      const hue = midiToHue(Math.log2((note.frequency as number) / 440) * 12 + 69);
      const color = getColorFromPalette(kalPalette, hue / 360);
      const size = 20 + note.gain * note.envelope * 50;
      
      ctx.fillStyle = color;
      ctx.globalAlpha = note.envelope * 0.5;
      ctx.beginPath();
      ctx.arc(
        100 + note.pan * 50,
        0,
        size,
        0, Math.PI / segments
      );
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ============================================================================
// Helper functions
// ============================================================================

function createParticle(x: number, y: number, hue: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 50 + Math.random() * 150;
  
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1,
    maxLife: 1 + Math.random() * 2,
    size: 2 + Math.random() * 4,
    hue,
    alpha: 1,
  };
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(255, 255, 255, ${alpha})`;
  
  const r = parseInt(result[1]!, 16);
  const g = parseInt(result[2]!, 16);
  const b = parseInt(result[3]!, 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}
