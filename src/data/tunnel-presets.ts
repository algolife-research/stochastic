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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.02, decay: 0.4, mix: 1.0 } },
    ],
    tags: ['simple', 'clean', 'melody'],
  },
  {
    id: 'bright-voice',
    name: 'Bright Voice',
    category: 'melodic',
    description: 'Brighter melodic voice with triangle wave and filter',
    subNodes: [
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.01, decay: 0.5, mix: 1.0 } },
      { type: 'filter', props: { cutoff: 3000, mod: 1500, attack: 0.02, decay: 0.3 } },
    ],
    tags: ['bright', 'melody', 'lead'],
  },
  {
    id: 'strings',
    name: 'Strings',
    category: 'melodic',
    description: 'Violin/strings ensemble with rich bow texture and natural vibrato',
    subNodes: [
      // Main body - slightly detuned layers for ensemble feel
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.25, decay: 1.8, mix: 1.0 } },
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.28, decay: 1.6, mix: 0.35 } }, // Detuned layer
      // Harmonics for body
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.22, decay: 1.4, mix: 0.25 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.18, decay: 1.2, mix: 0.12 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.15, decay: 1.0, mix: 0.06 } },
      // Bow noise - subtle friction sound
      { type: 'oscillator', props: { wave: 'pink', attack: 0.3, decay: 1.0, mix: 0.04 } },
      // Natural vibrato - delayed, moderate depth
      { type: 'modulator', props: { rate: 5.2, depth: 18, delay: 0.5 } },
      // Body resonance filter
      { type: 'filter', props: { cutoff: 2800, mod: 1200, attack: 0.2, decay: 1.0 } },
    ],
    tags: ['violin', 'orchestral', 'expressive', 'ensemble'],
  },
  {
    id: 'flute',
    name: 'Flute',
    category: 'melodic',
    description: 'Breathy orchestral flute with airy attack and pure tone',
    subNodes: [
      // Main body - pure, clear tone
      { type: 'oscillator', props: { wave: 'sine', attack: 0.1, decay: 1.0, mix: 1.0 } },
      // Slight triangle for edge
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.12, decay: 0.9, mix: 0.1 } },
      // Weak harmonics - flute is nearly sinusoidal
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.1, decay: 0.8, mix: 0.18 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.08, decay: 0.6, mix: 0.06 } },
      // Breath noise - essential for flute realism
      { type: 'oscillator', props: { wave: 'pink', attack: 0.06, decay: 0.35, mix: 0.1 } },
      // Subtle, quick vibrato
      { type: 'modulator', props: { rate: 5.5, depth: 15, delay: 0.35 } },
      // Bright, open filter
      { type: 'filter', props: { cutoff: 4500, mod: 800, attack: 0.08, decay: 0.6 } },
    ],
    tags: ['woodwind', 'breathy', 'soft', 'orchestral', 'flute'],
  },
  {
    id: 'lead-synth',
    name: 'Lead Synth',
    category: 'melodic',
    description: 'Classic synth lead with resonant filter',
    subNodes: [
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.01, decay: 0.6, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.005, decay: 0.25, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.003, decay: 0.15, mix: 0.4 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.01, decay: 0.4, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.01, decay: 0.3, mix: 1.0 } },
      { type: 'oscillator', props: { wave: 'square', attack: 0.01, decay: 0.25, mix: 0.5 } },
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
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.005, decay: 0.2, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.02, decay: 0.5, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.015, decay: 0.3, mix: 0.25 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.8, decay: 3.0, mix: 1.0 } },
      { type: 'oscillator', props: { wave: 'triangle', attack: 1.2, decay: 2.5, mix: 0.5 } },
      { type: 'filter', props: { cutoff: 1500, mod: 500, attack: 0.5, decay: 2.0 } },
    ],
    tags: ['ambient', 'warm', 'soft'],
  },
  {
    id: 'string-pad',
    name: 'String Pad',
    category: 'pad',
    description: 'Lush string ensemble pad with multiple detuned voices and natural movement',
    subNodes: [
      // Multiple detuned layers for ensemble width
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.8, decay: 3.5, mix: 1.0 } },
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.9, decay: 3.2, mix: 0.4 } },
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 1.0, decay: 3.0, mix: 0.25 } },
      // Harmonics
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.7, decay: 2.8, mix: 0.25 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.6, decay: 2.4, mix: 0.12 } },
      // Collective bow texture
      { type: 'oscillator', props: { wave: 'pink', attack: 0.8, decay: 2.0, mix: 0.025 } },
      // Ensemble vibrato - slower, less synchronized
      { type: 'modulator', props: { rate: 4.0, depth: 12, delay: 0.8 } },
      // Warm ensemble filter
      { type: 'filter', props: { cutoff: 2400, mod: 800, attack: 0.6, decay: 2.0 } },
    ],
    tags: ['strings', 'lush', 'orchestral', 'ensemble', 'pad'],
  },
  {
    id: 'dark-pad',
    name: 'Dark Pad',
    category: 'pad',
    description: 'Dark atmospheric pad with low filter',
    subNodes: [
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 1.0, decay: 4.0, mix: 1.0 } },
      { type: 'oscillator', props: { wave: 'square', attack: 1.5, decay: 3.5, mix: 0.3 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.5, decay: 3.0, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.3, decay: 2.0, mix: 0.2 } },
      { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.2, decay: 1.5, mix: 0.1 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.01, decay: 0.8, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.005, decay: 0.5, mix: 0.4 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.003, decay: 0.3, mix: 0.15 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.01, decay: 1.5, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.01, decay: 1.4, mix: 0.8 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.01, decay: 1.3, mix: 0.6 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.01, decay: 1.2, mix: 0.4 } },
    ],
    tags: ['organ', 'church', 'drawbar'],
  },
  {
    id: 'bell',
    name: 'Bell',
    category: 'keys',
    description: 'Bright bell/glockenspiel tone',
    subNodes: [
      { type: 'oscillator', props: { wave: 'sine', attack: 0.001, decay: 1.5, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2.4, wave: 'sine', attack: 0.001, decay: 1.0, mix: 0.5 } },
      { type: 'oscillator', props: { ratio: 5.2, wave: 'sine', attack: 0.001, decay: 0.6, mix: 0.25 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.002, decay: 0.4, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.001, decay: 0.2, mix: 0.3 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.001, decay: 0.15, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'white', attack: 0.001, decay: 0.12, mix: 0.7 } },
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.001, decay: 0.1, mix: 0.5 } },
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
      { type: 'oscillator', props: { wave: 'white', attack: 0.001, decay: 0.06, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'sine', attack: 0.002, decay: 0.25, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.001, decay: 0.08, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'white', attack: 0.5, decay: 2.0, mix: 1.0 } },
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
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 2.0, decay: 8.0, mix: 1.0 } },
      { type: 'oscillator', props: { wave: 'square', attack: 2.5, decay: 7.0, mix: 0.3 } },
      { type: 'modulator', props: { rate: 0.5, depth: 20, delay: 1.0 } },
      { type: 'filter', props: { cutoff: 800, mod: 400, attack: 1.0, decay: 4.0 } },
    ],
    tags: ['drone', 'ambient', 'sustained'],
  },
  {
    id: 'brass',
    name: 'Brass',
    category: 'melodic',
    description: 'Brass section with warm resonance and natural breath attack',
    subNodes: [
      // Main brass body - sawtooth is more realistic than square for brass
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.12, decay: 0.9, mix: 1.0 } },
      // Strong even harmonics for brass character
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.1, decay: 0.7, mix: 0.45 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.08, decay: 0.6, mix: 0.25 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.06, decay: 0.5, mix: 0.15 } },
      // Breath/air noise in attack
      { type: 'oscillator', props: { wave: 'pink', attack: 0.02, decay: 0.12, mix: 0.06 } },
      // Lip vibrato - slower, subtle
      { type: 'modulator', props: { rate: 4.5, depth: 12, delay: 0.35 } },
      // Muted formant-like filter - opens up over time
      { type: 'filter', props: { cutoff: 900, mod: 1800, attack: 0.08, decay: 0.5 } },
    ],
    tags: ['brass', 'horn', 'orchestral', 'section'],
  },
  
  // ========================================
  // ORCHESTRAL (NEW)
  // ========================================
  {
    id: 'cello',
    name: 'Cello',
    category: 'melodic',
    description: 'Deep cello with rich bow texture, body resonance and expressive vibrato',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -12, fixedMidiNote: 60 } },
      // Main body with slow bow attack
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.22, decay: 2.0, mix: 1.0 } },
      // Slight detuning for richness
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.25, decay: 1.8, mix: 0.25 } },
      // Rich harmonic series - cello has strong lower harmonics
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.2, decay: 1.6, mix: 0.4 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.18, decay: 1.4, mix: 0.25 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.15, decay: 1.2, mix: 0.12 } },
      // Bow rosin noise - adds realism
      { type: 'oscillator', props: { wave: 'pink', attack: 0.25, decay: 1.2, mix: 0.035 } },
      // Slower, deeper vibrato than violin - delayed onset
      { type: 'modulator', props: { rate: 4.8, depth: 22, delay: 0.6 } },
      // Warm body resonance
      { type: 'filter', props: { cutoff: 1600, mod: 1000, attack: 0.18, decay: 1.2 } },
    ],
    tags: ['cello', 'orchestral', 'deep', 'strings', 'bowed'],
  },
  {
    id: 'viola',
    name: 'Viola',
    category: 'melodic',
    description: 'Warm viola with characteristic darker tone and rich mid-range',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -5, fixedMidiNote: 60 } },
      // Main body - slower attack than violin
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.2, decay: 1.7, mix: 1.0 } },
      // Ensemble detuning
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.23, decay: 1.5, mix: 0.28 } },
      // Harmonics - viola has darker character
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.18, decay: 1.4, mix: 0.35 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.15, decay: 1.2, mix: 0.18 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.12, decay: 1.0, mix: 0.08 } },
      // Bow texture
      { type: 'oscillator', props: { wave: 'pink', attack: 0.22, decay: 1.0, mix: 0.03 } },
      // Vibrato - between violin and cello characteristics
      { type: 'modulator', props: { rate: 5.0, depth: 20, delay: 0.55 } },
      // Darker than violin, brighter than cello
      { type: 'filter', props: { cutoff: 2200, mod: 1100, attack: 0.16, decay: 0.9 } },
    ],
    tags: ['viola', 'orchestral', 'warm', 'strings', 'bowed'],
  },
  {
    id: 'contrabass',
    name: 'Contrabass',
    category: 'bass',
    description: 'Deep orchestral double bass with woody resonance and heavy bow',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -24, fixedMidiNote: 60 } },
      // Main body - very slow attack for large instrument
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.28, decay: 2.2, mix: 1.0 } },
      // Section feel
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.32, decay: 2.0, mix: 0.22 } },
      // Strong fundamental and low harmonics
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.25, decay: 1.8, mix: 0.45 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.22, decay: 1.5, mix: 0.2 } },
      // Heavy bow texture
      { type: 'oscillator', props: { wave: 'pink', attack: 0.3, decay: 1.4, mix: 0.04 } },
      // Slow, subtle vibrato
      { type: 'modulator', props: { rate: 4.2, depth: 15, delay: 0.7 } },
      // Woody low-pass
      { type: 'filter', props: { cutoff: 800, mod: 500, attack: 0.2, decay: 1.4 } },
    ],
    tags: ['bass', 'orchestral', 'deep', 'strings', 'bowed'],
  },
  {
    id: 'french-horn',
    name: 'French Horn',
    category: 'melodic',
    description: 'Majestic French horn with mellow warmth and hand-stopped resonance',
    subNodes: [
      // Main body - horn has mellow, rounded tone
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.15, decay: 1.4, mix: 1.0 } },
      // Slight ensemble spread
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.18, decay: 1.2, mix: 0.2 } },
      // Strong even harmonics - characteristic of horn
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.14, decay: 1.1, mix: 0.5 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.12, decay: 0.9, mix: 0.28 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.1, decay: 0.7, mix: 0.15 } },
      { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.08, decay: 0.5, mix: 0.08 } },
      // Breath air in attack
      { type: 'oscillator', props: { wave: 'pink', attack: 0.04, decay: 0.18, mix: 0.05 } },
      // Subtle lip vibrato
      { type: 'modulator', props: { rate: 4.2, depth: 10, delay: 0.45 } },
      // Muted, warm filter - hand-in-bell effect
      { type: 'filter', props: { cutoff: 800, mod: 1200, attack: 0.12, decay: 0.8 } },
    ],
    tags: ['horn', 'brass', 'orchestral', 'majestic', 'mellow'],
  },
  {
    id: 'trumpet',
    name: 'Trumpet',
    category: 'melodic',
    description: 'Bright orchestral trumpet with brilliant attack and brassy resonance',
    subNodes: [
      // Main body - sawtooth is more realistic than square
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.06, decay: 0.8, mix: 1.0 } },
      // Brightness layer
      { type: 'oscillator', props: { wave: 'square', attack: 0.04, decay: 0.6, mix: 0.15 } },
      // Strong harmonic series - trumpet is harmonically rich
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.05, decay: 0.65, mix: 0.4 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.04, decay: 0.55, mix: 0.28 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.03, decay: 0.45, mix: 0.18 } },
      { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.025, decay: 0.35, mix: 0.1 } },
      // Breath/buzz in attack
      { type: 'oscillator', props: { wave: 'pink', attack: 0.01, decay: 0.08, mix: 0.07 } },
      // Quick, subtle vibrato
      { type: 'modulator', props: { rate: 5.5, depth: 8, delay: 0.25 } },
      // Bright, opening filter
      { type: 'filter', props: { cutoff: 1800, mod: 3000, attack: 0.04, decay: 0.4 } },
    ],
    tags: ['trumpet', 'brass', 'orchestral', 'bright', 'brilliant'],
  },
  {
    id: 'oboe',
    name: 'Oboe',
    category: 'melodic',
    description: 'Expressive oboe with characteristic nasal reed tone and poignant vibrato',
    subNodes: [
      // Main body - oboe has thin, focused sound
      { type: 'oscillator', props: { wave: 'sawtooth', attack: 0.08, decay: 0.9, mix: 1.0 } },
      // Complete harmonic series - oboe is very harmonically rich
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.07, decay: 0.8, mix: 0.55 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.06, decay: 0.7, mix: 0.4 } },
      { type: 'oscillator', props: { ratio: 4, wave: 'sine', attack: 0.05, decay: 0.6, mix: 0.28 } },
      { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.04, decay: 0.5, mix: 0.18 } },
      { type: 'oscillator', props: { ratio: 6, wave: 'sine', attack: 0.03, decay: 0.4, mix: 0.1 } },
      // Reed/breath air
      { type: 'oscillator', props: { wave: 'pink', attack: 0.05, decay: 0.25, mix: 0.04 } },
      // Expressive vibrato - oboe has prominent vibrato
      { type: 'modulator', props: { rate: 5.5, depth: 25, delay: 0.3 } },
      // Nasal formant - characteristic "ee" quality
      { type: 'filter', props: { cutoff: 2200, mod: 1000, attack: 0.06, decay: 0.5 } },
    ],
    tags: ['oboe', 'woodwind', 'orchestral', 'reedy', 'expressive'],
  },
  {
    id: 'clarinet',
    name: 'Clarinet',
    category: 'melodic',
    description: 'Smooth clarinet with characteristic hollow tone and odd-harmonic series',
    subNodes: [
      // Main body - clarinet has hollow, cylindrical tone
      { type: 'oscillator', props: { wave: 'square', attack: 0.06, decay: 0.85, mix: 1.0 } },
      // Clarinet emphasizes ODD harmonics (3rd, 5th, 7th) due to cylindrical bore
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.05, decay: 0.7, mix: 0.5 } },
      { type: 'oscillator', props: { ratio: 5, wave: 'sine', attack: 0.04, decay: 0.6, mix: 0.3 } },
      { type: 'oscillator', props: { ratio: 7, wave: 'sine', attack: 0.03, decay: 0.5, mix: 0.15 } },
      // Very weak even harmonics
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.05, decay: 0.65, mix: 0.08 } },
      // Breath/key noise
      { type: 'oscillator', props: { wave: 'pink', attack: 0.04, decay: 0.15, mix: 0.03 } },
      // Subtle, controlled vibrato
      { type: 'modulator', props: { rate: 5.0, depth: 12, delay: 0.4 } },
      // Warm, dark filter - chalumeau register character
      { type: 'filter', props: { cutoff: 1800, mod: 800, attack: 0.05, decay: 0.5 } },
    ],
    tags: ['clarinet', 'woodwind', 'orchestral', 'smooth', 'hollow'],
  },
  {
    id: 'timpani',
    name: 'Timpani',
    category: 'percussion',
    description: 'Orchestral timpani with resonant boom',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: -24, fixedMidiNote: 60 } },
      { type: 'oscillator', props: { wave: 'sine', attack: 0.005, decay: 1.5, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 1.5, wave: 'sine', attack: 0.003, decay: 0.8, mix: 0.3 } },
      { type: 'filter', props: { cutoff: 300, mod: 200, attack: 0.005, decay: 0.8 } },
    ],
    tags: ['timpani', 'percussion', 'orchestral', 'drums'],
  },
  {
    id: 'harp',
    name: 'Harp',
    category: 'melodic',
    description: 'Ethereal harp with shimmering decay',
    subNodes: [
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.002, decay: 2.0, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.001, decay: 1.5, mix: 0.3 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.001, decay: 1.0, mix: 0.15 } },
      { type: 'filter', props: { cutoff: 4000, mod: 2000, attack: 0.001, decay: 1.0 } },
    ],
    tags: ['harp', 'orchestral', 'ethereal', 'pluck'],
  },
  {
    id: 'choir',
    name: 'Choir',
    category: 'pad',
    description: 'Ethereal choir voices with natural breath and ensemble warmth',
    subNodes: [
      // Multiple voice layers for choir spread
      { type: 'oscillator', props: { wave: 'sine', attack: 0.5, decay: 3.0, mix: 1.0 } },
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.6, decay: 2.8, mix: 0.35 } },
      { type: 'oscillator', props: { wave: 'sine', attack: 0.55, decay: 2.6, mix: 0.2 } },
      // Voice harmonics - formant-like
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.45, decay: 2.4, mix: 0.3 } },
      { type: 'oscillator', props: { ratio: 3, wave: 'sine', attack: 0.4, decay: 2.0, mix: 0.15 } },
      // Breath in attack
      { type: 'oscillator', props: { wave: 'pink', attack: 0.3, decay: 0.6, mix: 0.04 } },
      // Natural vibrato - varies across ensemble
      { type: 'modulator', props: { rate: 5.2, depth: 18, delay: 0.6 } },
      // Vowel-like formant filter
      { type: 'filter', props: { cutoff: 2200, mod: 600, attack: 0.4, decay: 2.0 } },
    ],
    tags: ['choir', 'voices', 'orchestral', 'ethereal', 'vocal'],
  },
  {
    id: 'pizzicato',
    name: 'Pizzicato',
    category: 'melodic',
    description: 'Plucked string pizzicato',
    subNodes: [
      { type: 'oscillator', props: { wave: 'triangle', attack: 0.002, decay: 0.15, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2, wave: 'sine', attack: 0.001, decay: 0.1, mix: 0.3 } },
      { type: 'filter', props: { cutoff: 3500, mod: 2000, attack: 0.001, decay: 0.1 } },
    ],
    tags: ['pizzicato', 'strings', 'orchestral', 'pluck'],
  },
  {
    id: 'glockenspiel',
    name: 'Glockenspiel',
    category: 'keys',
    description: 'Bright orchestral glockenspiel',
    subNodes: [
      { type: 'pitch', props: { mode: 'shift', shift: 12, fixedMidiNote: 60 } },
      { type: 'oscillator', props: { wave: 'sine', attack: 0.001, decay: 2.0, mix: 1.0 } },
      { type: 'oscillator', props: { ratio: 2.3, wave: 'sine', attack: 0.001, decay: 1.5, mix: 0.4 } },
      { type: 'oscillator', props: { ratio: 5.4, wave: 'sine', attack: 0.001, decay: 0.8, mix: 0.2 } },
    ],
    tags: ['glockenspiel', 'bells', 'orchestral', 'bright'],
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
