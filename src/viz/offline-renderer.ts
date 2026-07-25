// Stochastic v2 - Offline Viz Frame Renderer
// Renders visualization frames for video export without animation loop

import type { 
  VizConfig,
  VizMusicalData,
  VideoFrameData,
  ColorPalette,
} from '@core/types';
import type { Particle, Blob, WaveSource, FrequencyBin } from './types';
import { DEFAULT_PALETTE, getColorFromPalette } from './palettes';
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
  // Check if we're in editor mode (config is null or not provided means editor mode)
  const isEditorMode = config === null;
  
  // Get config or use default for viz modes
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
  
  // For editor mode, use dark background; otherwise use palette
  ctx.fillStyle = isEditorMode ? '#0a0a0a' : palette.background;
  ctx.fillRect(0, 0, width, height);
  
  // Handle editor mode separately (when config is null)
  if (isEditorMode) {
    renderEditorFrame(ctx, frameData, width, height, state, deltaTime);
    state.elapsedTime += deltaTime;
    return;
  }
  
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
  const palette = cfg.colorPalette ?? DEFAULT_PALETTE;
  const beatPulse = Math.pow(1 - data.beatPhase, 3);
  
  // Fade background for trails (matching live renderer behavior)
  const fadeAlpha = 1 - wavesCfg.trailLength;
  ctx.fillStyle = palette.background;
  ctx.globalAlpha = fadeAlpha * 0.1;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  
  // Initialize wave sources if needed
  while (state.waveSources.length < wavesCfg.waveCount) {
    state.waveSources.push({
      x: width * (0.2 + seededRandom(state.waveSources.length * 100) * 0.6),
      y: height * (0.2 + seededRandom(state.waveSources.length * 200) * 0.6),
      frequency: 0.5 + seededRandom(state.waveSources.length * 300) * 1.5,
      amplitude: 0.5 + seededRandom(state.waveSources.length * 400) * 0.5,
      phase: seededRandom(state.waveSources.length * 500) * Math.PI * 2,
      hue: (state.waveSources.length / wavesCfg.waveCount) * 360,
    });
  }
  
  // Update wave sources based on packets (like live version)
  for (let i = 0; i < Math.max(state.waveSources.length, data.packets.length); i++) {
    if (i < data.packets.length) {
      const packet = data.packets[i]!;
      
      if (i >= state.waveSources.length) {
        // Add new source
        state.waveSources.push({
          x: packet.x,
          y: packet.y,
          frequency: 0.5 + Math.hypot(packet.vx, packet.vy) * 0.01,
          amplitude: packet.intensity,
          phase: 0,
          hue: packet.hue,
        });
      } else {
        // Update existing source - smooth interpolation
        const source = state.waveSources[i]!;
        const lerpFactor = dt * 3 * wavesCfg.reactivity;
        source.x = source.x + (packet.x - source.x) * lerpFactor;
        source.y = source.y + (packet.y - source.y) * lerpFactor;
        source.amplitude = source.amplitude + (packet.intensity - source.amplitude) * (dt * 5);
        source.hue = source.hue + (packet.hue - source.hue) * (dt * 2);
        source.frequency = 0.5 + Math.hypot(packet.vx, packet.vy) * 0.01;
      }
    } else if (i < state.waveSources.length) {
      // Fade out extra sources
      const source = state.waveSources[i]!;
      source.amplitude *= 0.95;
    }
  }
  
  // Update phases and pulse on beat
  for (const source of state.waveSources) {
    source.phase += dt * source.frequency * 3;
    if (beatPulse > 0.8) {
      source.amplitude = Math.min(1, source.amplitude + 0.2 * wavesCfg.intensity);
    }
  }
  
  // Render based on interference setting
  if (wavesCfg.interference) {
    renderWavesInterference(ctx, width, height, state.waveSources, wavesCfg, palette, state.elapsedTime, beatPulse);
  } else {
    renderWavesConcentric(ctx, width, height, state.waveSources, wavesCfg, palette, beatPulse);
  }
  
  // Render source points with glows
  renderWavesSourcePoints(ctx, state.waveSources, wavesCfg, palette, beatPulse);
}

/** Render interference pattern for waves mode */
function renderWavesInterference(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  sources: WaveSource[],
  cfg: { intensity: number; amplitude: number },
  palette: ColorPalette,
  time: number,
  beatPulse: number
): void {
  const step = 4; // Resolution
  const activeSources = sources.filter(s => s.amplitude > 0.01);
  if (activeSources.length === 0) return;
  
  // Create image data for pixel manipulation
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let totalWave = 0;
      let dominantHue = 0;
      let totalWeight = 0;
      
      for (const source of activeSources) {
        const dx = x - source.x;
        const dy = y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Wave equation (matching live renderer)
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
      const color = getColorFromPalette(palette, (dominantHue / 360 + time * 0.05) % 1);
      const rgb = hexToRgbValues(color);
      
      // Fill step x step block
      for (let dy = 0; dy < step && y + dy < height; dy++) {
        for (let dx = 0; dx < step && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          pixels[idx] = Math.min(255, pixels[idx]! + rgb.r * intensity);
          pixels[idx + 1] = Math.min(255, pixels[idx + 1]! + rgb.g * intensity);
          pixels[idx + 2] = Math.min(255, pixels[idx + 2]! + rgb.b * intensity);
        }
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/** Render concentric waves for waves mode */
function renderWavesConcentric(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  sources: WaveSource[],
  cfg: { intensity: number },
  palette: ColorPalette,
  beatPulse: number
): void {
  const activeSources = sources.filter(s => s.amplitude > 0.01);
  
  for (const source of activeSources) {
    const color = getColorFromPalette(palette, source.hue / 360);
    const maxRadius = Math.max(width, height) * 0.8;
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

/** Render wave source points with glows */
function renderWavesSourcePoints(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  sources: WaveSource[],
  cfg: { intensity: number },
  palette: ColorPalette,
  beatPulse: number
): void {
  for (const source of sources) {
    if (source.amplitude < 0.01) continue;
    
    const color = getColorFromPalette(palette, source.hue / 360);
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

/** Helper to convert hex to RGB values */
function hexToRgbValues(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  } : { r: 255, g: 255, b: 255 };
}

/** Kaleidoscope element for offline rendering */
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

/** Extended offline state for kaleidoscope */
const kaleidoElements: KaleidoElement[] = [];
let kaleidoGlobalRotation = 0;

/** Render kaleidoscope mode frame */
function renderKaleidoscopeFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  width: number,
  height: number,
  cfg: VizConfig,
  state: OfflineRenderState,
  dt: number
): void {
  const kalCfg = { ...DEFAULT_KALEIDOSCOPE_CONFIG, ...cfg };
  const kalPalette = cfg.colorPalette ?? DEFAULT_PALETTE;
  const segments = kalCfg.segments;
  const beatPulse = Math.pow(1 - data.beatPhase, 3);
  
  // Update global rotation (matching live renderer)
  kaleidoGlobalRotation += dt * kalCfg.rotation * (1 + beatPulse * 0.5);
  
  // Fade background for trails
  const fadeAlpha = 1 - kalCfg.trailLength;
  ctx.fillStyle = kalPalette.background;
  ctx.globalAlpha = fadeAlpha * 0.1;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  
  // Update kaleidoscope elements (spawn new ones from packets)
  updateKaleidoElements(data, kalCfg, width, height, dt);
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(kaleidoGlobalRotation);
  
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
    ctx.lineTo(Math.cos(-segmentAngle) * width, Math.sin(-segmentAngle) * width);
    ctx.lineTo(Math.cos(segmentAngle) * width, Math.sin(segmentAngle) * width);
    ctx.closePath();
    ctx.clip();
    
    // Draw elements
    for (const elem of kaleidoElements) {
      drawKaleidoElement(ctx, elem, kalCfg, kalPalette);
    }
    
    // Draw packet trails
    drawKaleidoPacketTrails(ctx, data, kalCfg, kalPalette, width, height);
    
    ctx.restore();
  }
  
  ctx.restore();
  
  // Central decoration
  drawKaleidoCenter(ctx, data, kalCfg, kalPalette, width, height, state.elapsedTime);
}

/** Update kaleidoscope elements based on musical data */
function updateKaleidoElements(
  data: VizMusicalData, 
  cfg: { intensity: number; zoom: number }, 
  width: number, 
  height: number,
  dt: number
): void {
  const beatPulse = Math.pow(1 - data.beatPhase, 4);
  
  // Spawn new elements from packets
  for (const packet of data.packets) {
    // Chance to spawn based on beat
    if (beatPulse > 0.9 && seededRandom(packet.x * packet.y + data.beat) < 0.3 * cfg.intensity) {
      kaleidoElements.push({
        x: packet.x - width / 2,
        y: packet.y - height / 2,
        size: 5 + packet.intensity * 30,
        targetSize: 5 + packet.intensity * 30,
        hue: packet.hue,
        type: ['circle', 'line', 'triangle'][Math.floor(seededRandom(packet.x + packet.y) * 3)] as 'circle' | 'line' | 'triangle',
        rotation: seededRandom(packet.x * packet.y) * Math.PI * 2,
        age: 0,
      });
    }
  }
  
  // Update existing elements
  for (let i = kaleidoElements.length - 1; i >= 0; i--) {
    const elem = kaleidoElements[i]!;
    elem.age += dt;
    
    // Grow and rotate
    elem.size = elem.size + (elem.targetSize * 2 - elem.size) * (dt * 0.5);
    elem.rotation += dt * 0.5;
    
    // Move outward
    const dist = Math.hypot(elem.x, elem.y);
    const angle = Math.atan2(elem.y, elem.x);
    const speed = 30 * cfg.zoom;
    elem.x += Math.cos(angle) * speed * dt;
    elem.y += Math.sin(angle) * speed * dt;
    
    // Remove old or out-of-bounds elements
    const maxDist = Math.max(width, height);
    if (elem.age > 5 || dist > maxDist) {
      kaleidoElements.splice(i, 1);
    }
  }
  
  // Limit element count
  while (kaleidoElements.length > 100) {
    kaleidoElements.shift();
  }
}

/** Draw a single kaleidoscope element */
function drawKaleidoElement(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  elem: KaleidoElement,
  cfg: { intensity: number },
  palette: ColorPalette
): void {
  const alpha = Math.max(0, 1 - elem.age / 5) * cfg.intensity;
  const color = getColorFromPalette(palette, elem.hue / 360);
  
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

/** Draw packet trails for kaleidoscope */
function drawKaleidoPacketTrails(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  cfg: { intensity: number },
  palette: ColorPalette,
  width: number,
  height: number
): void {
  for (const packet of data.packets.slice(0, 10)) {
    const x = packet.x - width / 2;
    const y = packet.y - height / 2;
    const color = getColorFromPalette(palette, packet.hue / 360);
    
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

/** Draw central decoration for kaleidoscope */
function drawKaleidoCenter(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: VizMusicalData,
  cfg: { intensity: number },
  palette: ColorPalette,
  width: number,
  height: number,
  time: number
): void {
  const cx = width / 2;
  const cy = height / 2;
  const beatPulse = Math.pow(1 - data.beatPhase, 4);
  
  const baseRadius = 30 + beatPulse * 20 * cfg.intensity;
  const hue = (time * 30) % 360;
  const color = getColorFromPalette(palette, hue / 360);
  
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

// ============================================================================
// Editor Mode Renderer
// ============================================================================

/** Node colors for editor mode rendering */
const EDITOR_NODE_COLORS: Record<string, string> = {
  source:        '#4caf50',
  speaker:       '#ff5722',
  pitch:         '#2196f3',
  oscillator:    '#9c27b0',
  filter:        '#00bcd4',
  gate:          '#ffeb3b',
  delay:         '#795548',
  gain:          '#607d8b',
  modulator:     '#673ab7',
  tunnel:        '#3f51b5',
  teleporter:    '#00e676',
  quantizer:     '#ff9800',
  lfo:           '#8bc34a',
  splitter:      '#64748b',
  midi_out:      '#03a9f4',
  midi_cc:       '#009688',
  scene_trigger: '#f44336',
};

/** Node icons for editor mode rendering */
const EDITOR_NODE_ICONS: Record<string, string> = {
  source:        '◉',
  speaker:       '🔊',
  pitch:         '♪',
  oscillator:    '∿',
  filter:        '▼',
  gate:          '⊡',
  delay:         '⏱',
  gain:          '◐',
  modulator:     '〰',
  tunnel:        '▣',
  teleporter:    '⚡',
  quantizer:     '⌗',
  lfo:           '∼',
  splitter:      '⋈',
  midi_out:      '♬',
  midi_cc:       '⚙',
  scene_trigger: '▶',
};

const EDITOR_NODE_RADIUS = 25;

/** Render editor mode frame - shows graph topology like the canvas editor */
function renderEditorFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  frameData: VideoFrameData,
  width: number,
  height: number,
  state: OfflineRenderState,
  _dt: number
): void {
  const time = state.elapsedTime;
  
  // Calculate graph bounds to fit in canvas
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of frameData.nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }
  
  // Handle empty graph case
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = width;
    maxY = height;
  }
  
  // Add padding around nodes
  const padding = 100;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  const graphWidth = maxX - minX || 1;
  const graphHeight = maxY - minY || 1;
  
  // Calculate scale and offset to center the graph
  const scaleX = width / graphWidth;
  const scaleY = height / graphHeight;
  const scale = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x to avoid too much zoom
  
  const offsetX = (width - graphWidth * scale) / 2 - minX * scale;
  const offsetY = (height - graphHeight * scale) / 2 - minY * scale;
  
  // Calculate the world-space bounds that correspond to the entire canvas
  const canvasMinX = -offsetX / scale;
  const canvasMinY = -offsetY / scale;
  const canvasMaxX = (width - offsetX) / scale;
  const canvasMaxY = (height - offsetY) / scale;
  
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  
  // Draw grid covering the entire canvas area (not just node bounds)
  drawEditorGrid(ctx, canvasMinX, canvasMinY, canvasMaxX, canvasMaxY);
  
  // Draw edges
  if (frameData.edges) {
    for (const edge of frameData.edges) {
      drawEditorEdge(ctx, edge.fromX, edge.fromY, edge.toX, edge.toY);
    }
  }
  
  // Draw packets with trails
  for (const packet of frameData.packets) {
    drawEditorPacket(ctx, packet, time);
  }
  
  // Draw nodes
  for (const node of frameData.nodes) {
    drawEditorNode(ctx, node);
  }
  
  ctx.restore();
}

/** Draw grid for editor mode */
function drawEditorGrid(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): void {
  const gridSize = 60;
  
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  
  const gridStartX = Math.floor(minX / gridSize) * gridSize;
  const gridStartY = Math.floor(minY / gridSize) * gridSize;
  
  ctx.beginPath();
  for (let x = gridStartX; x <= maxX; x += gridSize) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  for (let y = gridStartY; y <= maxY; y += gridSize) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();
}

/** Draw an edge for editor mode */
function drawEditorEdge(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  // Draw edge line
  ctx.lineWidth = 3;
  const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
  gradient.addColorStop(0, '#333333');
  gradient.addColorStop(1, '#555555');
  ctx.strokeStyle = gradient;
  
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  
  // Draw direction arrow at center
  const arrowT = 0.5;
  const arrowX = fromX + (toX - fromX) * arrowT;
  const arrowY = fromY + (toY - fromY) * arrowT;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLen = 10;
  const arrowAngle = 2.8;
  
  ctx.strokeStyle = '#555555';
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

/** Draw a packet for editor mode */
function drawEditorPacket(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  packet: { x: number; y: number; vx: number; vy: number; hue: number; intensity: number },
  _time: number
): void {
  const hue = packet.hue;
  const baseColor = `hsl(${hue}, 85%, 60%)`;
  const trailColor = `hsla(${hue}, 85%, 60%, 0.5)`;
  
  // Draw simple trail in the direction opposite to velocity
  const trailLength = 40;
  const speed = Math.sqrt(packet.vx * packet.vx + packet.vy * packet.vy) || 1;
  const trailX = packet.x - (packet.vx / speed) * trailLength;
  const trailY = packet.y - (packet.vy / speed) * trailLength;
  
  ctx.strokeStyle = trailColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(packet.x, packet.y);
  ctx.lineTo(trailX, trailY);
  ctx.stroke();
  
  // Draw packet head with glow
  ctx.fillStyle = baseColor;
  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 15;
  
  ctx.beginPath();
  ctx.arc(packet.x, packet.y, 6, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
}

/** Draw a node for editor mode */
function drawEditorNode(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: { x: number; y: number; type: string; flash: number }
): void {
  const color = EDITOR_NODE_COLORS[node.type] ?? '#666666';
  const flashIntensity = node.flash;
  
  // Flash glow
  if (flashIntensity > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 * flashIntensity;
  }
  
  // Dark fill
  ctx.fillStyle = '#1e1e1e';
  ctx.beginPath();
  ctx.arc(node.x, node.y, EDITOR_NODE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  
  // Colored outline
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Icon
  const icon = EDITOR_NODE_ICONS[node.type] ?? '?';
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, node.x, node.y);
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
