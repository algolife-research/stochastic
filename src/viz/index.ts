// Stochastic Viz - Main Entry Point
// Visual Art Generator for Stochastic

export { vizState, VizStateManager } from './state';
export { VizRenderer } from './renderer';
export { extractVizData, getActiveSpeakers, getActiveSources } from './data-extractor';

// Modes
export { AbstractRenderer, DEFAULT_ABSTRACT_CONFIG } from './modes/abstract';
export { ParticlesRenderer, DEFAULT_PARTICLES_CONFIG } from './modes/particles';
export { SpectralRenderer, DEFAULT_SPECTRAL_CONFIG } from './modes/spectral';

// Palettes
export {
  PALETTES,
  DEFAULT_PALETTE,
  PALETTE_NEON,
  PALETTE_SUNSET,
  PALETTE_OCEAN,
  PALETTE_MONOCHROME,
  PALETTE_RAINBOW,
  PALETTE_PASTEL,
  PALETTE_FOREST,
  PALETTE_COSMIC,
  getColorFromPalette,
  interpolatePaletteColor,
  midiToHue,
  frequencyToHue,
  hslToHex,
} from './palettes';

// Types
export type * from './types';
