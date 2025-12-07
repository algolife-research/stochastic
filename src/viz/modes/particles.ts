// Phonon Viz - Particles Mode
// Particle explosions and flows from active nodes

import type { VizMusicalData, ParticlesVizConfig, VizConfigBase, VizConfig } from '@core/types';
import type { Particle } from '../types';
import { VizRenderer } from '../renderer';
import { DEFAULT_PALETTE, getColorFromPalette } from '../palettes';
import { getActiveSpeakers } from '../data-extractor';

/** Default particles configuration */
export const DEFAULT_PARTICLES_CONFIG: ParticlesVizConfig = {
  colorPalette: DEFAULT_PALETTE,
  intensity: 0.8,
  trailLength: 0.5,
  reactivity: 0.7,
  backgroundOpacity: 0.95,
  particleCount: 500,
  particleSize: 3,
  gravity: 0.3,
  emitOnBeat: true,
};

/** Particles visualization renderer */
export class ParticlesRenderer extends VizRenderer {
  private config: ParticlesVizConfig = DEFAULT_PARTICLES_CONFIG;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private lastBeat: number = 0;
  
  get name(): string {
    return 'Particles';
  }
  
  init(config: VizConfig): void {
    if (config.mode === 'particles') {
      this.config = { ...DEFAULT_PARTICLES_CONFIG, ...config };
    }
    this.particles = [];
    this.particlePool = [];
    
    // Pre-allocate particle pool
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particlePool.push(this.createParticle(0, 0, 0));
    }
  }
  
  dispose(): void {
    this.particles = [];
    this.particlePool = [];
  }
  
  protected override getConfig(): VizConfigBase {
    return this.config;
  }
  
  renderFrame(data: VizMusicalData, _config: VizConfigBase): void {
    const cfg = this.config;
    
    // Fade background for trails
    const fadeAlpha = 1 - cfg.trailLength;
    this.fadeBackground(cfg.colorPalette, fadeAlpha * 0.3);
    
    // Emit particles from active speakers
    this.emitFromSpeakers(data, cfg);
    
    // Emit on beat if enabled
    if (cfg.emitOnBeat) {
      this.emitOnBeat(data, cfg);
    }
    
    // Update and render particles
    this.updateParticles(data, cfg);
    this.renderParticles(cfg);
    
    // Update stats
    this.stats.particleCount = this.particles.length;
  }
  
  /** Emit particles from speaker nodes that are flashing */
  private emitFromSpeakers(data: VizMusicalData, cfg: ParticlesVizConfig): void {
    const speakers = getActiveSpeakers();
    
    for (const speaker of speakers) {
      if (speaker.flash > 0.5) {
        // Find matching packet for color info
        const nearbyPacket = data.packets.find(p => {
          const dx = p.x - speaker.x;
          const dy = p.y - speaker.y;
          return Math.sqrt(dx * dx + dy * dy) < 50;
        });
        
        const hue = nearbyPacket?.hue ?? Math.random() * 360;
        
        // Emit burst of particles
        const burstCount = Math.floor(5 + cfg.intensity * 15 * speaker.flash);
        for (let i = 0; i < burstCount; i++) {
          this.emitParticle(speaker.x, speaker.y, hue, cfg);
        }
      }
    }
  }
  
  /** Emit particles on beat transitions */
  private emitOnBeat(data: VizMusicalData, cfg: ParticlesVizConfig): void {
    const currentBeat = Math.floor(data.beat);
    
    if (currentBeat !== this.lastBeat) {
      this.lastBeat = currentBeat;
      
      // Emit from center on strong beats
      if (currentBeat % 4 === 0) {
        const hue = (data.beat * 30) % 360;
        const count = Math.floor(20 * cfg.intensity);
        for (let i = 0; i < count; i++) {
          this.emitParticle(
            this.width / 2 + (Math.random() - 0.5) * 200,
            this.height / 2 + (Math.random() - 0.5) * 200,
            hue,
            cfg
          );
        }
      }
    }
  }
  
  /** Emit a single particle */
  private emitParticle(x: number, y: number, hue: number, cfg: ParticlesVizConfig): void {
    let particle: Particle;
    
    // Get from pool or create new
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop()!;
      this.resetParticle(particle, x, y, hue);
    } else if (this.particles.length < cfg.particleCount) {
      particle = this.createParticle(x, y, hue);
    } else {
      // Reuse oldest particle
      particle = this.particles.shift()!;
      this.resetParticle(particle, x, y, hue);
    }
    
    this.particles.push(particle);
  }
  
  /** Create a new particle */
  private createParticle(x: number, y: number, hue: number): Particle {
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
  
  /** Reset an existing particle for reuse */
  private resetParticle(particle: Particle, x: number, y: number, hue: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    
    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.life = 1;
    particle.maxLife = 1 + Math.random() * 2;
    particle.size = 2 + Math.random() * 4;
    particle.hue = hue;
    particle.alpha = 1;
  }
  
  /** Update all particles */
  private updateParticles(data: VizMusicalData, cfg: ParticlesVizConfig): void {
    const dt = this.deltaTime;
    const gravity = cfg.gravity * 200;
    const reactivity = cfg.reactivity;
    
    // Beat pulse effect
    const beatPulse = Math.pow(1 - data.beatPhase, 3);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Apply gravity
      p.vy += gravity * dt;
      
      // Apply drag
      p.vx *= 0.99;
      p.vy *= 0.99;
      
      // Beat reactivity - pulse outward
      if (reactivity > 0) {
        const dx = p.x - this.width / 2;
        const dy = p.y - this.height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx += (dx / dist) * beatPulse * reactivity * 50;
        p.vy += (dy / dist) * beatPulse * reactivity * 50;
      }
      
      // Update life
      p.life -= dt / p.maxLife;
      p.alpha = p.life;
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        this.particlePool.push(p);
      }
    }
  }
  
  /** Render all particles */
  private renderParticles(cfg: ParticlesVizConfig): void {
    const ctx = this.ctx;
    
    for (const p of this.particles) {
      const size = p.size * cfg.particleSize * p.life;
      if (size < 0.5) continue;
      
      // Get color from palette based on hue
      const paletteColor = getColorFromPalette(cfg.colorPalette, p.hue / 360);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      
      // Glow effect
      ctx.shadowColor = paletteColor;
      ctx.shadowBlur = size * 2;
      
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = paletteColor;
      ctx.fill();
      ctx.globalAlpha = 1;
      
      ctx.shadowBlur = 0;
      
      this.stats.drawCalls++;
    }
  }
}
