// Phonon v2 - Tunnel Presets Library
// Pre-configured instrument and effect tunnels for quick composition

import type { SubNode } from '@core/types';

// ============================================================================
// PRESET TYPES
// ============================================================================

export type TunnelPresetCategory = 'melodic' | 'bass' | 'pad' | 'percussion' | 'fx' | 'keys';

export interface TunnelPreset {
  readonly id: string;
  readonly name: string;
  readonly category: TunnelPresetCategory;
  readonly description: string;
  readonly subNodes: readonly SubNode[];
  readonly tags: readonly string[];
}

// ============================================================================
// PRESET DEFINITIONS
// ============================================================================

export const TUNNEL_PRESETS: readonly TunnelPreset[] = [
  // ========================================
  // MELODIC INSTRUMENTS
  // ========================================
  {
    id: 'voice',
    name: 'Voice',
    category: 'melodic',
    description: 'Simple melodic voice - clean sine wave with smooth envelope',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.02, decay: 0.4, mix: 1.0 } },
    ],
    tags: ['simple', 'clean', 'melody'],
  },
  {
    id: 'bright-voice',
    name: 'Bright Voice',
    category: 'melodic',
    description: 'Brighter melodic voice with triangle wave and filter',
    subNodes: [
      { type: 'polariser', props: { wave: 'triangle', attack: 0.01, decay: 0.5, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 3000, mod: 1500, attack: 0.02, decay: 0.3 } },
    ],
    tags: ['bright', 'melody', 'lead'],
  },
  {
    id: 'strings',
    name: 'Strings',
    category: 'melodic',
    description: 'Violin/strings with harmonics and vibrato',
    subNodes: [
      { type: 'polariser', props: { wave: 'sawtooth', attack: 0.15, decay: 1.2, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.12, decay: 1.0, mix: 0.3 } },
      { type: 'harmonic', props: { ratio: 3, wave: 'sine', attack: 0.10, decay: 0.8, mix: 0.15 } },
      { type: 'modulator', props: { rate: 5.5, depth: 25, delay: 0.3 } },
      { type: 'filter', props: { cutoff: 2200, mod: 2000, attack: 0.12, decay: 0.5 } },
    ],
    tags: ['violin', 'orchestral', 'expressive'],
  },
  {
    id: 'flute',
    name: 'Flute',
    category: 'melodic',
    description: 'Breathy flute with subtle harmonics',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.08, decay: 0.8, mix: 1.0 } },
      { type: 'noise', props: { wave: 'white', attack: 0.05, decay: 0.15, mix: 0.08 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.1, decay: 0.6, mix: 0.2 } },
      { type: 'filter', props: { cutoff: 4000, mod: 1000, attack: 0.05, decay: 0.4 } },
    ],
    tags: ['woodwind', 'breathy', 'soft'],
  },
  {
    id: 'lead-synth',
    name: 'Lead Synth',
    category: 'melodic',
    description: 'Classic synth lead with resonant filter',
    subNodes: [
      { type: 'polariser', props: { wave: 'sawtooth', attack: 0.01, decay: 0.6, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 1800, mod: 3000, attack: 0.01, decay: 0.4 } },
    ],
    tags: ['synth', 'lead', 'electronic'],
  },
  {
    id: 'pluck',
    name: 'Pluck',
    category: 'melodic',
    description: 'Plucked string sound with fast decay',
    subNodes: [
      { type: 'polariser', props: { wave: 'triangle', attack: 0.005, decay: 0.25, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.003, decay: 0.15, mix: 0.4 } },
      { type: 'filter', props: { cutoff: 2500, mod: 3000, attack: 0.002, decay: 0.2 } },
    ],
    tags: ['pluck', 'guitar', 'harp'],
  },

  // ========================================
  // BASS INSTRUMENTS
  // ========================================
  {
    id: 'sub-bass',
    name: 'Sub Bass',
    category: 'bass',
    description: 'Deep sub bass with pure sine wave',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -12, fixedMidiNote: 60 } },
      { type: 'polariser', props: { wave: 'sine', attack: 0.01, decay: 0.4, mix: 1.0 } },
    ],
    tags: ['sub', 'deep', 'clean'],
  },
  {
    id: 'synth-bass',
    name: 'Synth Bass',
    category: 'bass',
    description: 'Fat synth bass with layered waveforms',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -12, fixedMidiNote: 60 } },
      { type: 'polariser', props: { wave: 'sawtooth', attack: 0.01, decay: 0.3, mix: 1.0 } },
      { type: 'polariser', props: { wave: 'square', attack: 0.01, decay: 0.25, mix: 0.5 } },
      { type: 'filter', props: { cutoff: 600, mod: 800, attack: 0.01, decay: 0.2 } },
    ],
    tags: ['synth', 'fat', 'electronic'],
  },
  {
    id: 'acid-bass',
    name: 'Acid Bass',
    category: 'bass',
    description: 'TB-303 style acid bass with squelchy filter',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -12, fixedMidiNote: 60 } },
      { type: 'polariser', props: { wave: 'sawtooth', attack: 0.005, decay: 0.2, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 400, mod: 2000, attack: 0.01, decay: 0.15 } },
    ],
    tags: ['acid', '303', 'squelchy'],
  },
  {
    id: 'upright-bass',
    name: 'Upright Bass',
    category: 'bass',
    description: 'Acoustic upright bass tone',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -12, fixedMidiNote: 60 } },
      { type: 'polariser', props: { wave: 'triangle', attack: 0.02, decay: 0.5, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.015, decay: 0.3, mix: 0.25 } },
      { type: 'filter', props: { cutoff: 800, mod: 400, attack: 0.02, decay: 0.4 } },
    ],
    tags: ['acoustic', 'jazz', 'warm'],
  },

  // ========================================
  // PAD SOUNDS
  // ========================================
  {
    id: 'warm-pad',
    name: 'Warm Pad',
    category: 'pad',
    description: 'Warm ambient pad with layered waveforms',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.8, decay: 3.0, mix: 1.0 } },
      { type: 'polariser', props: { wave: 'triangle', attack: 1.2, decay: 2.5, mix: 0.5 } },
      { type: 'filter', props: { cutoff: 1500, mod: 500, attack: 0.5, decay: 2.0 } },
    ],
    tags: ['ambient', 'warm', 'soft'],
  },
  {
    id: 'string-pad',
    name: 'String Pad',
    category: 'pad',
    description: 'Lush string ensemble pad',
    subNodes: [
      { type: 'polariser', props: { wave: 'sawtooth', attack: 0.6, decay: 2.5, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.5, decay: 2.0, mix: 0.3 } },
      { type: 'modulator', props: { rate: 4.5, depth: 15, delay: 0.5 } },
      { type: 'filter', props: { cutoff: 2000, mod: 1000, attack: 0.4, decay: 1.5 } },
    ],
    tags: ['strings', 'lush', 'orchestral'],
  },
  {
    id: 'dark-pad',
    name: 'Dark Pad',
    category: 'pad',
    description: 'Dark atmospheric pad with low filter',
    subNodes: [
      { type: 'polariser', props: { wave: 'sawtooth', attack: 1.0, decay: 4.0, mix: 1.0 } },
      { type: 'polariser', props: { wave: 'square', attack: 1.5, decay: 3.5, mix: 0.3 } },
      { type: 'filter', props: { cutoff: 600, mod: 300, attack: 0.8, decay: 3.0 } },
    ],
    tags: ['dark', 'atmospheric', 'cinematic'],
  },
  {
    id: 'shimmer-pad',
    name: 'Shimmer Pad',
    category: 'pad',
    description: 'Shimmering pad with high harmonics',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.5, decay: 3.0, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 3, wave: 'sine', attack: 0.3, decay: 2.0, mix: 0.2 } },
      { type: 'harmonic', props: { ratio: 5, wave: 'sine', attack: 0.2, decay: 1.5, mix: 0.1 } },
      { type: 'modulator', props: { rate: 3.0, depth: 10, delay: 0.2 } },
    ],
    tags: ['shimmer', 'bright', 'ethereal'],
  },

  // ========================================
  // KEYS / KEYBOARD
  // ========================================
  {
    id: 'electric-piano',
    name: 'Electric Piano',
    category: 'keys',
    description: 'Rhodes-style electric piano',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.01, decay: 0.8, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.005, decay: 0.5, mix: 0.4 } },
      { type: 'harmonic', props: { ratio: 3, wave: 'sine', attack: 0.003, decay: 0.3, mix: 0.15 } },
      { type: 'modulator', props: { rate: 4.0, depth: 8, delay: 0.0 } },
    ],
    tags: ['rhodes', 'electric', 'keys'],
  },
  {
    id: 'organ',
    name: 'Organ',
    category: 'keys',
    description: 'Classic organ with drawbar harmonics',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.01, decay: 1.5, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.01, decay: 1.4, mix: 0.8 } },
      { type: 'harmonic', props: { ratio: 3, wave: 'sine', attack: 0.01, decay: 1.3, mix: 0.6 } },
      { type: 'harmonic', props: { ratio: 4, wave: 'sine', attack: 0.01, decay: 1.2, mix: 0.4 } },
    ],
    tags: ['organ', 'church', 'drawbar'],
  },
  {
    id: 'bell',
    name: 'Bell',
    category: 'keys',
    description: 'Bright bell/glockenspiel tone',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.001, decay: 1.5, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2.4, wave: 'sine', attack: 0.001, decay: 1.0, mix: 0.5 } },
      { type: 'harmonic', props: { ratio: 5.2, wave: 'sine', attack: 0.001, decay: 0.6, mix: 0.25 } },
      { type: 'modulator', props: { rate: 6.0, depth: 5, delay: 0.0 } },
    ],
    tags: ['bell', 'metallic', 'bright'],
  },
  {
    id: 'marimba',
    name: 'Marimba',
    category: 'keys',
    description: 'Wooden marimba tone',
    subNodes: [
      { type: 'polariser', props: { wave: 'sine', attack: 0.002, decay: 0.4, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 4, wave: 'sine', attack: 0.001, decay: 0.2, mix: 0.3 } },
      { type: 'filter', props: { cutoff: 3000, mod: 1500, attack: 0.001, decay: 0.15 } },
    ],
    tags: ['marimba', 'wooden', 'mallet'],
  },

  // ========================================
  // PERCUSSION
  // ========================================
  {
    id: 'kick',
    name: 'Kick Drum',
    category: 'percussion',
    description: 'Electronic kick drum',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -24, fixedMidiNote: 60 } },
      { type: 'polariser', props: { wave: 'sine', attack: 0.001, decay: 0.15, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 200, mod: 400, attack: 0.001, decay: 0.08 } },
    ],
    tags: ['kick', 'drum', 'bass'],
  },
  {
    id: 'snare',
    name: 'Snare',
    category: 'percussion',
    description: 'Electronic snare with noise',
    subNodes: [
      { type: 'noise', props: { wave: 'white', attack: 0.001, decay: 0.12, mix: 0.7 } },
      { type: 'polariser', props: { wave: 'triangle', attack: 0.001, decay: 0.1, mix: 0.5 } },
      { type: 'filter', props: { cutoff: 4000, mod: 2000, attack: 0.001, decay: 0.08 } },
    ],
    tags: ['snare', 'drum', 'noise'],
  },
  {
    id: 'hihat',
    name: 'Hi-Hat',
    category: 'percussion',
    description: 'Metallic hi-hat',
    subNodes: [
      { type: 'noise', props: { wave: 'white', attack: 0.001, decay: 0.06, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 8000, mod: 2000, attack: 0.001, decay: 0.04 } },
    ],
    tags: ['hihat', 'cymbal', 'metallic'],
  },
  {
    id: 'tom',
    name: 'Tom',
    category: 'percussion',
    description: 'Electronic tom drum',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -6, fixedMidiNote: 60 } },
      { type: 'polariser', props: { wave: 'sine', attack: 0.002, decay: 0.25, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 800, mod: 600, attack: 0.002, decay: 0.15 } },
    ],
    tags: ['tom', 'drum', 'pitched'],
  },

  // ========================================
  // FX / SPECIAL
  // ========================================
  {
    id: 'laser',
    name: 'Laser',
    category: 'fx',
    description: 'Sci-fi laser zap sound',
    subNodes: [
      { type: 'polariser', props: { wave: 'sawtooth', attack: 0.001, decay: 0.08, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 6000, mod: 5000, attack: 0.001, decay: 0.06 } },
    ],
    tags: ['laser', 'zap', 'sci-fi'],
  },
  {
    id: 'sweep',
    name: 'Filter Sweep',
    category: 'fx',
    description: 'Rising filter sweep effect',
    subNodes: [
      { type: 'noise', props: { wave: 'white', attack: 0.5, decay: 2.0, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 200, mod: 6000, attack: 0.1, decay: 1.5 } },
    ],
    tags: ['sweep', 'riser', 'transition'],
  },
  {
    id: 'drone',
    name: 'Drone',
    category: 'fx',
    description: 'Sustained drone with movement',
    subNodes: [
      { type: 'polariser', props: { wave: 'sawtooth', attack: 2.0, decay: 8.0, mix: 1.0 } },
      { type: 'polariser', props: { wave: 'square', attack: 2.5, decay: 7.0, mix: 0.3 } },
      { type: 'modulator', props: { rate: 0.5, depth: 20, delay: 1.0 } },
      { type: 'filter', props: { cutoff: 800, mod: 400, attack: 1.0, decay: 4.0 } },
    ],
    tags: ['drone', 'ambient', 'sustained'],
  },
  {
    id: 'brass',
    name: 'Brass',
    category: 'melodic',
    description: 'Brass section sound',
    subNodes: [
      { type: 'polariser', props: { wave: 'square', attack: 0.08, decay: 0.6, mix: 1.0 } },
      { type: 'harmonic', props: { ratio: 2, wave: 'sine', attack: 0.06, decay: 0.4, mix: 0.3 } },
      { type: 'filter', props: { cutoff: 1200, mod: 2000, attack: 0.05, decay: 0.3 } },
      { type: 'modulator', props: { rate: 5.0, depth: 12, delay: 0.2 } },
    ],
    tags: ['brass', 'horn', 'orchestral'],
  },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all presets for a category
 */
export function getPresetsByCategory(category: TunnelPresetCategory): TunnelPreset[] {
  return TUNNEL_PRESETS.filter(p => p.category === category);
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): TunnelPreset | undefined {
  return TUNNEL_PRESETS.find(p => p.id === id);
}

/**
 * Search presets by tag or name
 */
export function searchPresets(query: string): TunnelPreset[] {
  const q = query.toLowerCase();
  return TUNNEL_PRESETS.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.tags.some(t => t.includes(q))
  );
}

/**
 * Get all categories with preset counts
 */
export function getCategories(): Array<{ category: TunnelPresetCategory; count: number }> {
  const counts = new Map<TunnelPresetCategory, number>();
  
  for (const preset of TUNNEL_PRESETS) {
    counts.set(preset.category, (counts.get(preset.category) || 0) + 1);
  }
  
  return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<TunnelPresetCategory, string> = {
  melodic: 'Melodic',
  bass: 'Bass',
  pad: 'Pads',
  keys: 'Keys',
  percussion: 'Percussion',
  fx: 'FX / Special',
};

/**
 * Category icons
 */
export const CATEGORY_ICONS: Record<TunnelPresetCategory, string> = {
  melodic: '♪',
  bass: '🎸',
  pad: '☁',
  keys: '🎹',
  percussion: '🥁',
  fx: '✨',
};
