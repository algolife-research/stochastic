// Viz Config Defaults
// Default configurations for visualization modes

import type { VizMode, VizConfig } from '../types';
import { DEFAULT_PALETTE } from '../../viz/palettes';

/** Get default viz config for a given mode */
export function getDefaultVizConfig(mode: VizMode): VizConfig | null {
  const baseConfig = {
    colorPalette: DEFAULT_PALETTE,
    intensity: 0.8,
    trailLength: 0.5,
    reactivity: 0.7,
    backgroundOpacity: 0.95,
  };
  
  switch (mode) {
    case 'editor':
      return null;
    case 'particles':
      return { mode: 'particles', ...baseConfig, particleCount: 500, particleSize: 3, gravity: 0.3, emitOnBeat: true };
    case 'abstract':
      return { mode: 'abstract', ...baseConfig, flowSpeed: 0.5, organicness: 0.7, blobCount: 8 };
    case 'spectral':
      return { mode: 'spectral', ...baseConfig, barCount: 64, mirrorMode: true, circularLayout: false };
    case 'geometric':
      return { mode: 'geometric', ...baseConfig, symmetry: 6, lineWeight: 2, fillMode: 'outline' as const };
    case 'waves':
      return { mode: 'waves', ...baseConfig, waveCount: 5, amplitude: 0.5, interference: true };
    case 'kaleidoscope':
      return { mode: 'kaleidoscope', ...baseConfig, segments: 8, rotation: 0.3, zoom: 1 };
    default:
      return null;
  }
}
