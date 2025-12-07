// Phonon Viz - Color Palettes
// Built-in color palettes for visualization modes

import type { ColorPalette } from '@core/types';

/** Neon cyberpunk palette */
export const PALETTE_NEON: ColorPalette = {
  name: 'Neon',
  colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff0080', '#00ff80', '#8000ff'],
  background: '#0a0a0f',
};

/** Warm sunset palette */
export const PALETTE_SUNSET: ColorPalette = {
  name: 'Sunset',
  colors: ['#ff6b6b', '#feca57', '#ff9f43', '#ee5a24', '#6ab04c', '#eb4d4b'],
  background: '#1a1a2e',
};

/** Cool ocean palette */
export const PALETTE_OCEAN: ColorPalette = {
  name: 'Ocean',
  colors: ['#0652DD', '#1B9CFC', '#25CCF7', '#55E6C1', '#58B19F', '#0a3d62'],
  background: '#0c0c1a',
};

/** Minimal monochrome */
export const PALETTE_MONOCHROME: ColorPalette = {
  name: 'Monochrome',
  colors: ['#ffffff', '#e0e0e0', '#b0b0b0', '#808080', '#505050', '#303030'],
  background: '#000000',
};

/** Full rainbow spectrum */
export const PALETTE_RAINBOW: ColorPalette = {
  name: 'Rainbow',
  colors: ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff'],
  background: '#0f0f0f',
};

/** Soft pastel tones */
export const PALETTE_PASTEL: ColorPalette = {
  name: 'Pastel',
  colors: ['#ffeaa7', '#dfe6e9', '#fab1a0', '#81ecec', '#a29bfe', '#fd79a8'],
  background: '#2d3436',
};

/** Forest nature palette */
export const PALETTE_FOREST: ColorPalette = {
  name: 'Forest',
  colors: ['#27ae60', '#2ecc71', '#1abc9c', '#16a085', '#f39c12', '#d35400'],
  background: '#0d1f0d',
};

/** Cosmic space palette */
export const PALETTE_COSMIC: ColorPalette = {
  name: 'Cosmic',
  colors: ['#9b59b6', '#8e44ad', '#3498db', '#2980b9', '#1abc9c', '#e74c3c'],
  background: '#0a0a15',
};

/** All available palettes */
export const PALETTES: Record<string, ColorPalette> = {
  neon: PALETTE_NEON,
  sunset: PALETTE_SUNSET,
  ocean: PALETTE_OCEAN,
  monochrome: PALETTE_MONOCHROME,
  rainbow: PALETTE_RAINBOW,
  pastel: PALETTE_PASTEL,
  forest: PALETTE_FOREST,
  cosmic: PALETTE_COSMIC,
};

/** Default palette */
export const DEFAULT_PALETTE = PALETTE_NEON;

/** Get a color from the palette based on a normalized value (0-1) */
export function getColorFromPalette(palette: ColorPalette, value: number): string {
  const clampedValue = Math.max(0, Math.min(1, value));
  const index = Math.floor(clampedValue * (palette.colors.length - 1));
  return palette.colors[index] ?? palette.colors[0] ?? '#ffffff';
}

/** Interpolate between two colors in the palette */
export function interpolatePaletteColor(palette: ColorPalette, value: number): string {
  const clampedValue = Math.max(0, Math.min(1, value));
  const scaledValue = clampedValue * (palette.colors.length - 1);
  const index = Math.floor(scaledValue);
  const t = scaledValue - index;
  
  if (index >= palette.colors.length - 1) {
    return palette.colors[palette.colors.length - 1] ?? '#ffffff';
  }
  
  const color1 = palette.colors[index] ?? '#ffffff';
  const color2 = palette.colors[index + 1] ?? '#ffffff';
  
  return lerpColor(color1, color2, t);
}

/** Linear interpolate between two hex colors */
function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Convert MIDI note to hue (0-360) */
export function midiToHue(midiNote: number): number {
  // Map MIDI range (21-108, A0-C8) to hue (0-360)
  const normalized = (midiNote - 21) / (108 - 21);
  return normalized * 360;
}

/** Convert frequency to hue */
export function frequencyToHue(frequency: number): number {
  // Map audible range (~20Hz - 20kHz) logarithmically to hue
  const minFreq = 20;
  const maxFreq = 4000; // Focus on musical range
  const logMin = Math.log(minFreq);
  const logMax = Math.log(maxFreq);
  const logFreq = Math.log(Math.max(minFreq, Math.min(maxFreq, frequency)));
  const normalized = (logFreq - logMin) / (logMax - logMin);
  return normalized * 360;
}

/** Convert HSL to hex color string */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
