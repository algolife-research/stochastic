// AI Agent - System Prompts
// Prompts and templates for AI canvas generation

import type { CanvasContext, GenerationConstraints, NodeTypeDoc } from './types';
import { serializeContext } from './context-builder';
import type { NodeType } from '@core/types';

// ============================================================================
// NODE TYPE DOCUMENTATION
// ============================================================================

/**
 * Complete documentation of all node types for AI context
 */
export const NODE_DOCS: NodeTypeDoc[] = [
  // Generators
  {
    type: 'source',
    name: 'Source',
    description: 'Generates packets at regular intervals. The origin of all sound in the system.',
    category: 'generator',
    inputs: [],
    outputs: ['audio packets'],
    props: [
      { name: 'interval', type: 'number', description: 'Beats between packet emissions', default: 1, range: { min: 0.125, max: 16 } },
      { name: 'midiNote', type: 'number', description: 'Base MIDI note (0-127)', default: 60, range: { min: 0, max: 127 } },
      { name: 'autoTrigger', type: 'boolean', description: 'Auto-emit packets when playing', default: true },
      { name: 'intensity', type: 'number', description: 'Velocity/loudness (0-1)', default: 0.5, range: { min: 0, max: 1 } },
    ],
  },
  
  // Outputs
  {
    type: 'speaker',
    name: 'Speaker',
    description: 'Audio output node. Converts packets to audible sound.',
    category: 'output',
    inputs: ['audio packets'],
    outputs: [],
    props: [
      { name: 'volume', type: 'number', description: 'Output volume (0-1)', default: 1, range: { min: 0, max: 1 } },
      { name: 'reverb', type: 'number', description: 'Reverb wet/dry mix (0-1)', default: 0, range: { min: 0, max: 1 } },
      { name: 'pan', type: 'number', description: 'Stereo panning (-1 to 1)', default: 0, range: { min: -1, max: 1 } },
      { name: 'holdTime', type: 'number', description: 'Sustain duration in seconds', default: 0 },
      { name: 'releaseTime', type: 'number', description: 'Release/fade out time', default: 0.1 },
    ],
  },
  
  // Modifiers
  {
    type: 'pitch',
    name: 'Pitch',
    description: 'Shifts or sets the pitch of passing packets.',
    category: 'modifier',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'mode', type: 'string', description: 'Mode of operation', options: ['shift', 'set'] },
      { name: 'shift', type: 'number', description: 'Semitones to shift (in shift mode)', default: 0, range: { min: -48, max: 48 } },
      { name: 'fixedMidiNote', type: 'number', description: 'Fixed MIDI note (in set mode)', default: 60, range: { min: 0, max: 127 } },
    ],
  },
  {
    type: 'oscillator',
    name: 'Oscillator',
    description: 'Adds a wave layer to the sound. Can add harmonics or change timbre.',
    category: 'modifier',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'wave', type: 'string', description: 'Waveform type', options: ['sine', 'square', 'sawtooth', 'triangle', 'white', 'pink', 'brown'] },
      { name: 'ratio', type: 'number', description: 'Frequency multiplier (1 = fundamental, 2 = octave up)', default: 1 },
      { name: 'attack', type: 'number', description: 'Attack time in seconds', default: 0.01 },
      { name: 'decay', type: 'number', description: 'Decay time in seconds', default: 0.4 },
      { name: 'mix', type: 'number', description: 'Mix amount (0-1)', default: 1, range: { min: 0, max: 1 } },
    ],
  },
  {
    type: 'filter',
    name: 'Filter',
    description: 'Low-pass filter that shapes the frequency content.',
    category: 'modifier',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'cutoff', type: 'number', description: 'Cutoff frequency in Hz', default: 20000, range: { min: 20, max: 20000 } },
      { name: 'attack', type: 'number', description: 'Filter envelope attack', default: 0 },
      { name: 'decay', type: 'number', description: 'Filter envelope decay', default: 0 },
      { name: 'mod', type: 'number', description: 'Envelope modulation amount', default: 0 },
    ],
  },
  {
    type: 'gain',
    name: 'Gain',
    description: 'Adjusts the amplitude/volume of packets.',
    category: 'modifier',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'value', type: 'number', description: 'Gain multiplier', default: 1, range: { min: 0, max: 2 } },
      { name: 'mass', type: 'number', description: 'Physics mass for gravity mode', default: 1 },
    ],
  },
  {
    type: 'delay',
    name: 'Delay',
    description: 'Holds packets for a duration before passing them on.',
    category: 'modifier',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'delayTime', type: 'number', description: 'Delay in beats', default: 1, range: { min: 0, max: 16 } },
    ],
  },
  {
    type: 'quantizer',
    name: 'Quantizer',
    description: 'Snaps pitch to a musical scale.',
    category: 'modifier',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'scale', type: 'string', description: 'Musical scale', options: ['chromatic', 'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'pentatonic', 'minorPentatonic', 'blues'] },
      { name: 'root', type: 'number', description: 'Root note (0-11)', default: 0, range: { min: 0, max: 11 } },
      { name: 'strength', type: 'number', description: 'Quantization strength (0-1)', default: 1, range: { min: 0, max: 1 } },
      { name: 'useGlobalKey', type: 'boolean', description: 'Use global key settings', default: true },
    ],
  },
  
  // Routing
  {
    type: 'gate',
    name: 'Gate',
    description: 'Probabilistically passes or blocks packets. Great for generative randomness.',
    category: 'routing',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'prob', type: 'number', description: 'Pass probability (0-1)', default: 0.5, range: { min: 0, max: 1 } },
      { name: 'mode', type: 'string', description: 'Gate mode', options: ['probability', 'harmonic', 'energy', 'density', 'all'] },
    ],
  },
  {
    type: 'splitter',
    name: 'Splitter',
    description: 'Splits signal to multiple outputs.',
    category: 'routing',
    inputs: ['audio packets'],
    outputs: ['audio packets (multiple)'],
    props: [
      { name: 'behavior', type: 'string', description: 'Routing behavior', options: ['broadcast', 'random', 'weighted'] },
      { name: 'entangled', type: 'boolean', description: 'Entangle split packets', default: false },
    ],
  },
  {
    type: 'teleporter',
    name: 'Teleporter',
    description: 'Instantly transports packets to matching teleporter.',
    category: 'routing',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'channel', type: 'string', description: 'Channel letter (A-Z)', default: 'A' },
      { name: 'isEntry', type: 'boolean', description: 'Is this an entry or exit point', default: true },
    ],
  },
  
  // Modulation
  {
    type: 'modulator',
    name: 'Modulator',
    description: 'Adds vibrato/pitch modulation to packets.',
    category: 'modulation',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'rate', type: 'number', description: 'Modulation rate in Hz', default: 5, range: { min: 0.1, max: 20 } },
      { name: 'depth', type: 'number', description: 'Modulation depth in cents', default: 10, range: { min: 0, max: 100 } },
      { name: 'delay', type: 'number', description: 'Onset delay in seconds', default: 0.1 },
    ],
  },
  {
    type: 'lfo',
    name: 'LFO',
    description: 'Low-frequency oscillator for modulation. Connect to other nodes for CV control.',
    category: 'modulation',
    inputs: [],
    outputs: ['modulation signal'],
    props: [
      { name: 'rate', type: 'number', description: 'LFO frequency in Hz', default: 1, range: { min: 0.01, max: 20 } },
      { name: 'shape', type: 'string', description: 'LFO waveform', options: ['sine', 'square', 'sawtooth', 'triangle', 'random', 'noise'] },
      { name: 'min', type: 'number', description: 'Minimum output value', default: 0 },
      { name: 'max', type: 'number', description: 'Maximum output value', default: 1 },
      { name: 'phase', type: 'number', description: 'Phase offset (0-1)', default: 0, range: { min: 0, max: 1 } },
    ],
  },
  
  // Evolution
  {
    type: 'mutator',
    name: 'Mutator',
    description: 'Introduces random mutations to packets. Creates generative variation.',
    category: 'evolution',
    inputs: ['audio packets'],
    outputs: ['audio packets'],
    props: [
      { name: 'mode', type: 'string', description: 'Mutation mode', options: ['drift', 'radiation'] },
      { name: 'probability', type: 'number', description: 'Mutation chance per packet', default: 0.5, range: { min: 0, max: 1 } },
      { name: 'pitchDrift', type: 'number', description: 'Max semitone drift', default: 2 },
      { name: 'gainDrift', type: 'number', description: 'Max gain change', default: 0.1 },
    ],
  },
  {
    type: 'crossover',
    name: 'Crossover',
    description: 'Merges two incoming packets into one, combining their properties.',
    category: 'evolution',
    inputs: ['audio packets (2)'],
    outputs: ['audio packets'],
    props: [
      { name: 'inheritance', type: 'string', description: 'Inheritance mode', options: ['random', 'dominant_a', 'dominant_b', 'blend'] },
      { name: 'pitchFrom', type: 'string', description: 'Pitch inheritance', options: ['a', 'b', 'average', 'random'] },
      { name: 'timeout', type: 'number', description: 'Beats to wait for second parent', default: 4 },
    ],
  },
  
  // MIDI
  {
    type: 'midi_out',
    name: 'MIDI Out',
    description: 'Sends MIDI notes to external devices.',
    category: 'output',
    inputs: ['audio packets'],
    outputs: [],
    props: [
      { name: 'channel', type: 'number', description: 'MIDI channel (1-16)', default: 1, range: { min: 1, max: 16 } },
      { name: 'duration', type: 'number', description: 'Note duration in ms', default: 500 },
      { name: 'velocityScale', type: 'number', description: 'Velocity multiplier', default: 1 },
    ],
  },
  {
    type: 'midi_cc',
    name: 'MIDI CC',
    description: 'Sends MIDI CC messages.',
    category: 'output',
    inputs: ['modulation signal'],
    outputs: [],
    props: [
      { name: 'channel', type: 'number', description: 'MIDI channel (1-16)', default: 1, range: { min: 1, max: 16 } },
      { name: 'ccNumber', type: 'number', description: 'CC number (0-127)', default: 1, range: { min: 0, max: 127 } },
    ],
  },
];

/**
 * Get documentation for a specific node type
 */
export function getNodeDoc(type: NodeType): NodeTypeDoc | undefined {
  return NODE_DOCS.find(doc => doc.type === type);
}

/**
 * Generate node type reference for prompts
 */
export function generateNodeTypeReference(): string {
  const lines: string[] = ['## Available Node Types\n'];
  
  const categories = ['generator', 'modifier', 'routing', 'modulation', 'output', 'evolution'] as const;
  
  for (const category of categories) {
    const categoryNodes = NODE_DOCS.filter(doc => doc.category === category);
    if (categoryNodes.length === 0) continue;
    
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)} Nodes\n`);
    
    for (const doc of categoryNodes) {
      lines.push(`**${doc.type}** - ${doc.description}`);
      lines.push(`  Properties: ${doc.props.map(p => p.name).join(', ')}`);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

/**
 * Main system prompt for canvas generation
 */
export function getSystemPrompt(): string {
  return `You are an AI assistant specialized in creating generative audio patches for Phonon, a graph-based sound design tool.

## About Phonon

Phonon uses a visual node-based system where:
- **Packets** travel along edges between nodes, carrying audio information
- **Sources** generate packets at regular intervals
- **Speakers** convert packets to audible sound
- Other nodes modify, route, or modulate packets

## Your Task

When the user asks you to create or modify sounds, you should:
1. Analyze their request to understand the musical/sonic intent
2. Design an appropriate node graph
3. Output structured JSON operations to create the graph

## Response Format

Always respond with a JSON block containing your operations, wrapped in \`\`\`json markers.
Include an "explanation" field describing what you're creating.

Example response:
\`\`\`json
{
  "explanation": "Creating a simple bass synthesizer with a low sawtooth oscillator and filter.",
  "operations": [
    { "type": "add_node", "nodeType": "source", "x": 100, "y": 200, "tempId": "src1", "props": { "interval": 1, "midiNote": 36 } },
    { "type": "add_node", "nodeType": "oscillator", "x": 250, "y": 200, "tempId": "osc1", "props": { "wave": "sawtooth" } },
    { "type": "add_node", "nodeType": "filter", "x": 400, "y": 200, "tempId": "flt1", "props": { "cutoff": 800 } },
    { "type": "add_node", "nodeType": "speaker", "x": 550, "y": 200, "tempId": "spk1" },
    { "type": "add_edge", "from": "src1", "to": "osc1" },
    { "type": "add_edge", "from": "osc1", "to": "flt1" },
    { "type": "add_edge", "from": "flt1", "to": "spk1" }
  ],
  "suggestions": ["Add an LFO to modulate the filter cutoff", "Try adding a second detuned oscillator"]
}
\`\`\`

## Operation Types

- \`add_node\`: Create a new node with type, position, optional tempId for referencing, and props
- \`modify_node\`: Update properties of an existing node (use the actual nodeId from canvas state)
- \`delete_node\`: Remove a node
- \`add_edge\`: Connect two nodes (use actual nodeId for existing nodes, or tempId for newly created nodes)
- \`modify_edge\`: Update edge properties
- \`delete_edge\`: Remove an edge

**IMPORTANT**: When adding edges to EXISTING nodes on the canvas, use their actual node ID from the canvas state (shown in the context). When connecting to NEW nodes you're creating, use the tempId you assigned.

${generateNodeTypeReference()}

## Best Practices

1. **Always include a source and speaker** for audible output
2. **Position nodes left-to-right** for signal flow clarity (source on left, speaker on right)
3. **Use horizontal spacing of ~150px** between connected nodes
4. **Consider the musical context** (scale, root, BPM) in your design
5. **Add modulation** (LFOs, modulators) for more interesting/evolving sounds
6. **Use tempId** for new nodes so edges can reference them before they have real IDs
7. **Use actual nodeId** from the canvas state when referencing existing nodes

## Common Patterns

- **Basic Synth**: source → oscillator → filter → speaker
- **Generative**: source → gate (probability) → splitter → multiple speakers
- **Evolving Pad**: source → oscillator → filter (with LFO on cutoff) → modulator → speaker
- **Polymetric**: multiple sources with different intervals feeding into a mixer-like structure`;
}

/**
 * Build a complete prompt with context
 */
export function buildPrompt(
  userMessage: string,
  context: CanvasContext,
  constraints?: GenerationConstraints
): string {
  const parts: string[] = [];
  
  // Add canvas context
  parts.push(serializeContext(context));
  parts.push('');
  
  // Add constraints if provided
  if (constraints) {
    parts.push('=== CONSTRAINTS ===');
    if (constraints.maxNodes) parts.push(`Max nodes: ${constraints.maxNodes}`);
    if (constraints.maxEdges) parts.push(`Max edges: ${constraints.maxEdges}`);
    if (constraints.allowedNodeTypes) {
      parts.push(`Allowed node types: ${constraints.allowedNodeTypes.join(', ')}`);
    }
    if (constraints.preferredArea) {
      const { x, y, width, height } = constraints.preferredArea;
      parts.push(`Place new nodes in area: x=${x}-${x + width}, y=${y}-${y + height}`);
    }
    parts.push('');
  }
  
  // Add user message
  parts.push('=== USER REQUEST ===');
  parts.push(userMessage);
  
  return parts.join('\n');
}

// ============================================================================
// EXAMPLE PROMPTS
// ============================================================================

/**
 * Suggested prompts for users
 */
export const SUGGESTED_PROMPTS = [
  // Basic
  'Create a simple bass synth',
  'Make a plucky lead sound',
  'Build a pad with reverb',
  
  // Generative
  'Create a generative melody using gates',
  'Build a probabilistic drum pattern',
  'Make an evolving ambient texture',
  
  // Complex
  'Design a polymetric rhythm with two time signatures',
  'Create a self-modulating feedback patch',
  'Build an arpeggiator using multiple pitch nodes',
  
  // Modifications
  'Add movement to this sound',
  'Make it more aggressive',
  'Add some randomness',
  'Fatten up this bass',
];

/**
 * Get context-appropriate suggestions
 */
export function getContextSuggestions(context: CanvasContext): string[] {
  if (context.nodes.length === 0) {
    return [
      'Create a simple synth',
      'Build a generative sequence',
      'Design an ambient pad',
    ];
  }
  
  const hasSource = context.nodes.some(n => n.type === 'source');
  const hasSpeaker = context.nodes.some(n => n.type === 'speaker');
  const hasFilter = context.nodes.some(n => n.type === 'filter');
  const hasLfo = context.nodes.some(n => n.type === 'lfo');
  
  const suggestions: string[] = [];
  
  if (!hasSource) suggestions.push('Add a source to generate sound');
  if (!hasSpeaker) suggestions.push('Add a speaker to hear the output');
  if (hasSource && hasSpeaker && !hasFilter) suggestions.push('Add a filter for tone shaping');
  if (!hasLfo && context.nodes.length > 2) suggestions.push('Add an LFO for modulation');
  
  suggestions.push(
    'Add more variation',
    'Create a parallel voice',
    'Make it more complex',
  );
  
  return suggestions.slice(0, 4);
}
