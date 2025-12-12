// AI Agent - Composition Planner
// Breaks down complex compositions into manageable phases

import type { CanvasContext, GenerationConstraints } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface CompositionPlan {
  phases: CompositionPhase[];
  totalEstimatedNodes: number;
  complexity: 'simple' | 'medium' | 'complex' | 'very-complex';
  description: string;
}

export interface CompositionPhase {
  id: number;
  name: string;
  description: string;
  prompt: string;
  constraints: GenerationConstraints;
  dependencies: number[];  // Phase IDs that must complete first
  estimatedNodes: number;
}

// ============================================================================
// PLANNER
// ============================================================================

/**
 * Analyze a user prompt and determine if it needs multi-phase planning
 */
export function needsPlanning(prompt: string, context: CanvasContext): boolean {
  const complexityIndicators = [
    // Size indicators
    /\b(large|huge|massive|big|complex|elaborate)\b/i,
    /\b(many|multiple|several|numerous)\b.*\b(layers?|voices?|parts?|sections?)\b/i,
    
    // Structure indicators
    /\b(full|complete|entire)\b.*\b(composition|song|track|piece)\b/i,
    /\bsections?\b/i,
    /\barrangement\b/i,
    /\bstructure\b/i,
    
    // Multiple elements
    /\b\d+\s+(voices?|layers?|parts?|channels?|instruments?)\b/i,
    /\band\b.*\band\b.*\band\b/i,  // Multiple "and"s suggest complexity
    
    // Specific patterns
    /polymetric|polyrhythm/i,
    /orchestr/i,
    /ensemble/i,
    /\bfull\s+mix\b/i,
  ];
  
  const matchCount = complexityIndicators.filter(regex => regex.test(prompt)).length;
  
  // If multiple indicators or canvas is already populated
  return matchCount >= 2 || (matchCount >= 1 && context.nodes.length > 10);
}

/**
 * Create a multi-phase plan for a complex composition
 */
export function createPlan(
  prompt: string,
  context: CanvasContext,
  maxNodesPerPhase: number = 25
): CompositionPlan {
  const prompt_lower = prompt.toLowerCase();
  
  // Detect composition type and create appropriate plan
  if (/polymetric|polyrhythm/.test(prompt_lower)) {
    return createPolymetricPlan(prompt, context, maxNodesPerPhase);
  }
  
  if (/layer|voice|part/.test(prompt_lower)) {
    return createLayeredPlan(prompt, context, maxNodesPerPhase);
  }
  
  if (/section|verse|chorus|arrangement/.test(prompt_lower)) {
    return createStructuralPlan(prompt, context, maxNodesPerPhase);
  }
  
  if (/full|complete|entire/.test(prompt_lower)) {
    return createCompletePlan(prompt, context, maxNodesPerPhase);
  }
  
  // Default: split into foundation + elaboration
  return createDefaultPlan(prompt, context, maxNodesPerPhase);
}

/**
 * Default plan: foundation then elaboration
 */
function createDefaultPlan(
  prompt: string,
  context: CanvasContext,
  maxNodesPerPhase: number
): CompositionPlan {
  const phases: CompositionPhase[] = [
    {
      id: 1,
      name: 'Foundation',
      description: 'Create the core sound sources and basic signal chain',
      prompt: `${prompt}\n\nPHASE 1: Focus on creating just the foundational elements - sources, core oscillators, and basic routing. Keep it simple and focused.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.6),
        maxEdges: Math.floor(maxNodesPerPhase * 0.9),
      },
      dependencies: [],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.5),
    },
    {
      id: 2,
      name: 'Elaboration',
      description: 'Add modulation, effects, and complexity',
      prompt: `${prompt}\n\nPHASE 2: Now add modulation (LFOs, modulators), effects (filters, delays), and routing complexity to elaborate on the foundation. Make it more interesting and dynamic.`,
      constraints: {
        maxNodes: maxNodesPerPhase,
        maxEdges: Math.floor(maxNodesPerPhase * 1.5),
      },
      dependencies: [1],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.7),
    },
  ];
  
  return {
    phases,
    totalEstimatedNodes: phases.reduce((sum, p) => sum + p.estimatedNodes, 0),
    complexity: 'medium',
    description: 'Two-phase approach: foundation then elaboration',
  };
}

/**
 * Polymetric plan: separate time signatures
 */
function createPolymetricPlan(
  prompt: string,
  context: CanvasContext,
  maxNodesPerPhase: number
): CompositionPlan {
  const phases: CompositionPhase[] = [
    {
      id: 1,
      name: 'First Time Signature',
      description: 'Create the first rhythmic layer with its time signature',
      prompt: `${prompt}\n\nPHASE 1: Create only the FIRST time signature/rhythmic pattern. Include sources with appropriate intervals and basic sound design.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.7),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: [],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.6),
    },
    {
      id: 2,
      name: 'Second Time Signature',
      description: 'Create the second rhythmic layer',
      prompt: `${prompt}\n\nPHASE 2: Create the SECOND time signature/rhythmic pattern. Make it polymetric - use different intervals that create interesting cross-rhythms with phase 1.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.7),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: [1],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.6),
    },
    {
      id: 3,
      name: 'Integration',
      description: 'Connect layers and add global effects',
      prompt: `${prompt}\n\nPHASE 3: Integrate the two polymetric layers. Add any global effects, mixing, or modulation that affects both patterns. Create interesting interactions.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.5),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: [1, 2],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.4),
    },
  ];
  
  return {
    phases,
    totalEstimatedNodes: phases.reduce((sum, p) => sum + p.estimatedNodes, 0),
    complexity: 'complex',
    description: 'Three-phase polymetric: two independent time signatures + integration',
  };
}

/**
 * Layered plan: separate voices/layers
 */
function createLayeredPlan(
  prompt: string,
  context: CanvasContext,
  maxNodesPerPhase: number
): CompositionPlan {
  // Extract number of layers if mentioned
  const layerMatch = prompt.match(/(\d+)\s+(layer|voice|part)/i);
  const numLayers = layerMatch ? Math.min(parseInt(layerMatch[1] || '3'), 4) : 3;
  
  const phases: CompositionPhase[] = [];
  
  // Create a phase for each layer
  for (let i = 0; i < numLayers; i++) {
    phases.push({
      id: i + 1,
      name: `Layer ${i + 1}`,
      description: `Create layer/voice ${i + 1}`,
      prompt: `${prompt}\n\nPHASE ${i + 1}: Create ONLY layer/voice ${i + 1} of ${numLayers}. Focus on this single layer's complete sound design and routing.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.7),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: i > 0 ? [i] : [],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.6),
    });
  }
  
  // Final integration phase
  phases.push({
    id: numLayers + 1,
    name: 'Mix & Effects',
    description: 'Mix layers and add global effects',
    prompt: `${prompt}\n\nFINAL PHASE: Mix all ${numLayers} layers together. Add master effects, balance levels, and create interesting interactions between layers.`,
    constraints: {
      maxNodes: Math.floor(maxNodesPerPhase * 0.5),
      maxEdges: Math.floor(maxNodesPerPhase),
    },
    dependencies: Array.from({ length: numLayers }, (_, i) => i + 1),
    estimatedNodes: Math.floor(maxNodesPerPhase * 0.4),
  });
  
  return {
    phases,
    totalEstimatedNodes: phases.reduce((sum, p) => sum + p.estimatedNodes, 0),
    complexity: numLayers <= 2 ? 'medium' : numLayers <= 3 ? 'complex' : 'very-complex',
    description: `${numLayers}-layer composition with mixing phase`,
  };
}

/**
 * Structural plan: intro/verse/chorus/etc
 */
function createStructuralPlan(
  prompt: string,
  context: CanvasContext,
  maxNodesPerPhase: number
): CompositionPlan {
  const phases: CompositionPhase[] = [
    {
      id: 1,
      name: 'Main Pattern',
      description: 'Create the core musical pattern/motif',
      prompt: `${prompt}\n\nPHASE 1: Create the MAIN pattern or motif - this is the core musical idea. Build a complete chain with source, sound design, and output.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.7),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: [],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.6),
    },
    {
      id: 2,
      name: 'Variation Pattern',
      description: 'Create a variation or contrasting section',
      prompt: `${prompt}\n\nPHASE 2: Create a VARIATION or contrasting section. This could be a verse/chorus, call/response, or alternate pattern. Make it related but distinct from phase 1.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.7),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: [1],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.6),
    },
    {
      id: 3,
      name: 'Scene Control',
      description: 'Add scene triggers for arrangement',
      prompt: `${prompt}\n\nPHASE 3: Add scene trigger nodes to control which sections play. Connect them to enable switching between the patterns from phases 1 and 2.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.3),
        maxEdges: Math.floor(maxNodesPerPhase * 0.5),
      },
      dependencies: [1, 2],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.2),
    },
  ];
  
  return {
    phases,
    totalEstimatedNodes: phases.reduce((sum, p) => sum + p.estimatedNodes, 0),
    complexity: 'complex',
    description: 'Structural arrangement with scene control',
  };
}

/**
 * Complete composition plan: comprehensive multi-phase approach
 */
function createCompletePlan(
  prompt: string,
  context: CanvasContext,
  maxNodesPerPhase: number
): CompositionPlan {
  const phases: CompositionPhase[] = [
    {
      id: 1,
      name: 'Rhythm Section',
      description: 'Create the rhythmic foundation',
      prompt: `${prompt}\n\nPHASE 1: Create the RHYTHM SECTION - the backbone of the composition. Focus on percussive elements, bass, and timing.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.8),
        maxEdges: Math.floor(maxNodesPerPhase * 1.2),
      },
      dependencies: [],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.7),
    },
    {
      id: 2,
      name: 'Melodic Elements',
      description: 'Add melodic and harmonic content',
      prompt: `${prompt}\n\nPHASE 2: Add MELODIC and HARMONIC elements - leads, chords, arpeggios. Build on top of the rhythm section.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.8),
        maxEdges: Math.floor(maxNodesPerPhase * 1.2),
      },
      dependencies: [1],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.7),
    },
    {
      id: 3,
      name: 'Texture & Atmosphere',
      description: 'Add pads, ambience, and texture',
      prompt: `${prompt}\n\nPHASE 3: Add TEXTURAL elements - pads, atmosphere, background elements. Create depth and space in the mix.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.6),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: [1, 2],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.5),
    },
    {
      id: 4,
      name: 'Effects & Polish',
      description: 'Add effects, modulation, and final touches',
      prompt: `${prompt}\n\nPHASE 4: Add EFFECTS and MODULATION - delays, reverbs, LFOs, filters. Polish the overall sound and add movement.`,
      constraints: {
        maxNodes: Math.floor(maxNodesPerPhase * 0.6),
        maxEdges: Math.floor(maxNodesPerPhase),
      },
      dependencies: [1, 2, 3],
      estimatedNodes: Math.floor(maxNodesPerPhase * 0.5),
    },
  ];
  
  return {
    phases,
    totalEstimatedNodes: phases.reduce((sum, p) => sum + p.estimatedNodes, 0),
    complexity: 'very-complex',
    description: 'Complete composition: rhythm → melody → texture → effects',
  };
}

/**
 * Get next phase to execute
 */
export function getNextPhase(plan: CompositionPlan, completedPhases: number[]): CompositionPhase | null {
  for (const phase of plan.phases) {
    // Check if already completed
    if (completedPhases.includes(phase.id)) {
      continue;
    }
    
    // Check if dependencies are met
    const dependenciesMet = phase.dependencies.every(depId => 
      completedPhases.includes(depId)
    );
    
    if (dependenciesMet) {
      return phase;
    }
  }
  
  return null;
}

/**
 * Check if plan is complete
 */
export function isPlanComplete(plan: CompositionPlan, completedPhases: number[]): boolean {
  return plan.phases.every(phase => completedPhases.includes(phase.id));
}
