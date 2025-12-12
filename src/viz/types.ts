// Stochastic Viz - Type Definitions
// Re-exports core viz types and adds viz-specific internal types

export type {
  VizMode,
  VizConfig,
  VizConfigBase,
  AbstractVizConfig,
  GeometricVizConfig,
  ParticlesVizConfig,
  WavesVizConfig,
  SpectralVizConfig,
  KaleidoscopeVizConfig,
  VizTransition,
  VizTransitionType,
  ColorPalette,
  VizPacketData,
  VizNodeData,
  VizNoteData,
  VizMusicalData,
  VizDisplayState,
} from '@core/types';

// ============================================================================
// INTERNAL VIZ TYPES
// ============================================================================

/** Particle for particle systems */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // 0-1, 1 = just born, 0 = dead
  maxLife: number;   // seconds
  size: number;
  hue: number;
  alpha: number;
}

/** Blob for abstract mode */
export interface Blob {
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  hue: number;
  phase: number;
  speed: number;
}

/** Wave source for wave interference mode */
export interface WaveSource {
  x: number;
  y: number;
  frequency: number;
  amplitude: number;
  phase: number;
  hue: number;
}

/** Frequency bin for spectral mode */
export interface FrequencyBin {
  frequency: number;
  magnitude: number;
  targetMagnitude: number;
  hue: number;
}

/** Trail point for motion trails */
export interface TrailPoint {
  x: number;
  y: number;
  age: number;
  hue: number;
  alpha: number;
}

/** Renderer statistics for debugging */
export interface VizStats {
  fps: number;
  particleCount: number;
  blobCount: number;
  drawCalls: number;
  lastFrameTime: number;
}
