// AI Agent - Composition Templates
// Pre-built patterns and templates for common complex structures

import type { CanvasOperation } from './types';

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface CompositionTemplate {
  name: string;
  description: string;
  category: 'generative' | 'melodic' | 'rhythmic' | 'ambient' | 'full';
  complexity: 'simple' | 'medium' | 'complex';
  estimatedNodes: number;
  tags: string[];
  generateOperations: (options?: TemplateOptions) => CanvasOperation[];
}

export interface TemplateOptions {
  startX?: number;
  startY?: number;
  midiNote?: number;
  scale?: string;
  complexity?: 'minimal' | 'standard' | 'elaborate';
}

// ============================================================================
// TEMPLATE LIBRARY
// ============================================================================

export const COMPOSITION_TEMPLATES: CompositionTemplate[] = [
  // Generative Patterns
  {
    name: 'Probabilistic Sequencer',
    description: 'Multi-voice generative pattern using gates and probability',
    category: 'generative',
    complexity: 'complex',
    estimatedNodes: 25,
    tags: ['generative', 'gate', 'probability', 'multi-voice'],
    generateOperations: (opts = {}) => {
      const { startX = 100, startY = 200, midiNote = 60 } = opts;
      const spacing = 150;
      
      return [
        // Main source
        { type: 'add_node', nodeType: 'source', x: startX, y: startY, tempId: 'src1', 
          props: { interval: 1, midiNote, autoTrigger: true } },
        
        // Split into 3 probability paths
        { type: 'add_node', nodeType: 'splitter', x: startX + spacing, y: startY, tempId: 'split1' },
        
        // Path 1: High probability, root note
        { type: 'add_node', nodeType: 'gate', x: startX + spacing * 2, y: startY - 150, tempId: 'gate1',
          props: { probability: 0.7, mode: 'probability' } },
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 3, y: startY - 150, tempId: 'osc1',
          props: { wave: 'sine', ratio: 1 } },
        
        // Path 2: Medium probability, fifth
        { type: 'add_node', nodeType: 'gate', x: startX + spacing * 2, y: startY, tempId: 'gate2',
          props: { probability: 0.5, mode: 'probability' } },
        { type: 'add_node', nodeType: 'pitch', x: startX + spacing * 3, y: startY, tempId: 'pitch1',
          props: { mode: 'shift', shift: 7 } },
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 4, y: startY, tempId: 'osc2',
          props: { wave: 'sawtooth', ratio: 1 } },
        
        // Path 3: Low probability, octave
        { type: 'add_node', nodeType: 'gate', x: startX + spacing * 2, y: startY + 150, tempId: 'gate3',
          props: { probability: 0.3, mode: 'probability' } },
        { type: 'add_node', nodeType: 'pitch', x: startX + spacing * 3, y: startY + 150, tempId: 'pitch2',
          props: { mode: 'shift', shift: 12 } },
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 4, y: startY + 150, tempId: 'osc3',
          props: { wave: 'triangle', ratio: 1 } },
        
        // Merge and output
        { type: 'add_node', nodeType: 'gain', x: startX + spacing * 5, y: startY, tempId: 'gain1',
          props: { gain: 0.7 } },
        { type: 'add_node', nodeType: 'filter', x: startX + spacing * 6, y: startY, tempId: 'flt1',
          props: { cutoff: 2000, attack: 0.01, decay: 0.4, mod: 1500 } },
        { type: 'add_node', nodeType: 'speaker', x: startX + spacing * 7, y: startY, tempId: 'spk1',
          props: { reverb: 0.3 } },
        
        // Connections
        { type: 'add_edge', from: 'src1', to: 'split1' },
        { type: 'add_edge', from: 'split1', to: 'gate1' },
        { type: 'add_edge', from: 'split1', to: 'gate2' },
        { type: 'add_edge', from: 'split1', to: 'gate3' },
        { type: 'add_edge', from: 'gate1', to: 'osc1' },
        { type: 'add_edge', from: 'gate2', to: 'pitch1' },
        { type: 'add_edge', from: 'pitch1', to: 'osc2' },
        { type: 'add_edge', from: 'gate3', to: 'pitch2' },
        { type: 'add_edge', from: 'pitch2', to: 'osc3' },
        { type: 'add_edge', from: 'osc1', to: 'gain1' },
        { type: 'add_edge', from: 'osc2', to: 'gain1' },
        { type: 'add_edge', from: 'osc3', to: 'gain1' },
        { type: 'add_edge', from: 'gain1', to: 'flt1' },
        { type: 'add_edge', from: 'flt1', to: 'spk1' },
      ];
    },
  },
  
  {
    name: 'Evolving Texture Pad',
    description: 'Ambient pad with LFO-modulated filter and multiple detuned oscillators',
    category: 'ambient',
    complexity: 'medium',
    estimatedNodes: 18,
    tags: ['ambient', 'pad', 'lfo', 'modulation', 'detuned'],
    generateOperations: (opts = {}) => {
      const { startX = 100, startY = 300, midiNote = 48 } = opts;
      const spacing = 150;
      
      return [
        // Source with long interval
        { type: 'add_node', nodeType: 'source', x: startX, y: startY, tempId: 'src1',
          props: { interval: 4, midiNote, autoTrigger: true, intensity: 0.4 } },
        
        // Three detuned oscillators
        { type: 'add_node', nodeType: 'splitter', x: startX + spacing, y: startY, tempId: 'split1' },
        
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 2, y: startY - 100, tempId: 'osc1',
          props: { wave: 'sawtooth', ratio: 1, attack: 0.5, decay: 2 } },
        
        { type: 'add_node', nodeType: 'pitch', x: startX + spacing * 2, y: startY, tempId: 'pitch1',
          props: { mode: 'shift', shift: 0.05 } },
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 3, y: startY, tempId: 'osc2',
          props: { wave: 'sawtooth', ratio: 1, attack: 0.5, decay: 2 } },
        
        { type: 'add_node', nodeType: 'pitch', x: startX + spacing * 2, y: startY + 100, tempId: 'pitch2',
          props: { mode: 'shift', shift: -0.05 } },
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 3, y: startY + 100, tempId: 'osc3',
          props: { wave: 'sawtooth', ratio: 1, attack: 0.5, decay: 2 } },
        
        // Mix and filter
        { type: 'add_node', nodeType: 'gain', x: startX + spacing * 4, y: startY, tempId: 'gain1',
          props: { gain: 0.5 } },
        { type: 'add_node', nodeType: 'filter', x: startX + spacing * 5, y: startY, tempId: 'flt1',
          props: { cutoff: 800, attack: 0.5, decay: 3, mod: 1500 } },
        
        // LFO modulation
        { type: 'add_node', nodeType: 'lfo', x: startX + spacing * 5, y: startY - 150, tempId: 'lfo1',
          props: { rate: 0.2, depth: 0.6, wave: 'sine' } },
        
        // Output with reverb
        { type: 'add_node', nodeType: 'speaker', x: startX + spacing * 6, y: startY, tempId: 'spk1',
          props: { reverb: 0.6, holdTime: 2, releaseTime: 3 } },
        
        // Connections
        { type: 'add_edge', from: 'src1', to: 'split1' },
        { type: 'add_edge', from: 'split1', to: 'osc1' },
        { type: 'add_edge', from: 'split1', to: 'pitch1' },
        { type: 'add_edge', from: 'split1', to: 'pitch2' },
        { type: 'add_edge', from: 'pitch1', to: 'osc2' },
        { type: 'add_edge', from: 'pitch2', to: 'osc3' },
        { type: 'add_edge', from: 'osc1', to: 'gain1' },
        { type: 'add_edge', from: 'osc2', to: 'gain1' },
        { type: 'add_edge', from: 'osc3', to: 'gain1' },
        { type: 'add_edge', from: 'gain1', to: 'flt1' },
        { type: 'add_edge', from: 'flt1', to: 'spk1' },
        { type: 'add_edge', from: 'lfo1', to: 'flt1', targetParam: 'cutoff' },
      ];
    },
  },
  
  {
    name: 'Polymetric Rhythm Machine',
    description: 'Two independent rhythmic layers with different time signatures',
    category: 'rhythmic',
    complexity: 'complex',
    estimatedNodes: 22,
    tags: ['polymetric', 'rhythm', 'percussion', 'multi-tempo'],
    generateOperations: (opts = {}) => {
      const { startX = 100, startY = 200 } = opts;
      const spacing = 150;
      
      return [
        // Layer 1: 4/4 pattern
        { type: 'add_node', nodeType: 'source', x: startX, y: startY - 150, tempId: 'src1',
          props: { interval: 1, midiNote: 60, autoTrigger: true } },
        { type: 'add_node', nodeType: 'gate', x: startX + spacing, y: startY - 150, tempId: 'gate1',
          props: { probability: 0.75, mode: 'probability' } },
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 2, y: startY - 150, tempId: 'osc1',
          props: { wave: 'white', ratio: 1, attack: 0.001, decay: 0.05 } },
        { type: 'add_node', nodeType: 'filter', x: startX + spacing * 3, y: startY - 150, tempId: 'flt1',
          props: { cutoff: 8000, attack: 0.001, decay: 0.05 } },
        
        // Layer 2: 3/4 pattern (1.333 interval for 3 over 4)
        { type: 'add_node', nodeType: 'source', x: startX, y: startY + 150, tempId: 'src2',
          props: { interval: 1.333, midiNote: 48, autoTrigger: true } },
        { type: 'add_node', nodeType: 'gate', x: startX + spacing, y: startY + 150, tempId: 'gate2',
          props: { probability: 0.6, mode: 'probability' } },
        { type: 'add_node', nodeType: 'oscillator', x: startX + spacing * 2, y: startY + 150, tempId: 'osc2',
          props: { wave: 'pink', ratio: 1, attack: 0.001, decay: 0.08 } },
        { type: 'add_node', nodeType: 'filter', x: startX + spacing * 3, y: startY + 150, tempId: 'flt2',
          props: { cutoff: 4000, attack: 0.001, decay: 0.08 } },
        
        // Mix and output
        { type: 'add_node', nodeType: 'gain', x: startX + spacing * 4, y: startY, tempId: 'gain1',
          props: { gain: 0.6 } },
        { type: 'add_node', nodeType: 'speaker', x: startX + spacing * 5, y: startY, tempId: 'spk1',
          props: { reverb: 0.2 } },
        
        // Connections - Layer 1
        { type: 'add_edge', from: 'src1', to: 'gate1' },
        { type: 'add_edge', from: 'gate1', to: 'osc1' },
        { type: 'add_edge', from: 'osc1', to: 'flt1' },
        { type: 'add_edge', from: 'flt1', to: 'gain1' },
        
        // Connections - Layer 2
        { type: 'add_edge', from: 'src2', to: 'gate2' },
        { type: 'add_edge', from: 'gate2', to: 'osc2' },
        { type: 'add_edge', from: 'osc2', to: 'flt2' },
        { type: 'add_edge', from: 'flt2', to: 'gain1' },
        
        // Output
        { type: 'add_edge', from: 'gain1', to: 'spk1' },
      ];
    },
  },
];

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

/**
 * Find templates matching criteria
 */
export function findTemplates(filters: {
  category?: CompositionTemplate['category'];
  complexity?: CompositionTemplate['complexity'];
  tags?: string[];
  maxNodes?: number;
}): CompositionTemplate[] {
  return COMPOSITION_TEMPLATES.filter(template => {
    if (filters.category && template.category !== filters.category) return false;
    if (filters.complexity && template.complexity !== filters.complexity) return false;
    if (filters.maxNodes && template.estimatedNodes > filters.maxNodes) return false;
    if (filters.tags && !filters.tags.some(tag => template.tags.includes(tag))) return false;
    return true;
  });
}

/**
 * Get template by name
 */
export function getTemplate(name: string): CompositionTemplate | undefined {
  return COMPOSITION_TEMPLATES.find(t => t.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get suggested template based on user prompt
 */
export function suggestTemplate(prompt: string): CompositionTemplate | null {
  const prompt_lower = prompt.toLowerCase();
  
  // Match keywords to templates
  if (/probabilistic|generative|gate/.test(prompt_lower)) {
    return getTemplate('Probabilistic Sequencer') || null;
  }
  
  if (/pad|ambient|texture|evolv/.test(prompt_lower)) {
    return getTemplate('Evolving Texture Pad') || null;
  }
  
  if (/polymetric|polyrhythm|cross.?rhythm/.test(prompt_lower)) {
    return getTemplate('Polymetric Rhythm Machine') || null;
  }
  
  return null;
}
