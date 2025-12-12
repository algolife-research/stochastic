// AI Agent - Canvas Context Builder
// Builds context from current canvas state for AI prompts

import { useGraphStore } from '@core/store';
import type { CanvasContext, NodeContext, EdgeContext, GenerationConstraints } from './types';
import type { NodeType } from '@core/types';

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

/**
 * Build canvas context from current store state
 */
export function buildCanvasContext(): CanvasContext {
  const state = useGraphStore.getState();
  
  // Convert nodes to simplified context
  const nodes: NodeContext[] = Array.from(state.nodes.values()).map(node => ({
    id: node.id,
    type: node.type,
    x: Math.round(node.x),
    y: Math.round(node.y),
    props: { ...node.props } as Record<string, unknown>,
  }));
  
  // Convert edges to simplified context
  const edges: EdgeContext[] = Array.from(state.edges.values()).map(edge => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    timingMode: edge.timingMode,
    durationBeats: edge.durationBeats,
    targetParam: edge.targetParam,
  }));
  
  // Get musical context
  const musicalContext = {
    root: state.musicalContext.root,
    scale: state.musicalContext.scaleName,
    bpm: state.masterSpeed,
  };
  
  return { nodes, edges, musicalContext };
}

/**
 * Build context for a selected region only
 */
export function buildRegionContext(
  centerX: number, 
  centerY: number, 
  radius: number
): CanvasContext {
  const fullContext = buildCanvasContext();
  
  // Filter nodes within radius
  const nodesInRegion = fullContext.nodes.filter(node => {
    const dx = node.x - centerX;
    const dy = node.y - centerY;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  });
  
  const nodeIds = new Set(nodesInRegion.map(n => n.id));
  
  // Filter edges connected to nodes in region
  const edgesInRegion = fullContext.edges.filter(
    edge => nodeIds.has(edge.from) && nodeIds.has(edge.to)
  );
  
  return {
    nodes: nodesInRegion,
    edges: edgesInRegion,
    musicalContext: fullContext.musicalContext,
  };
}

/**
 * Serialize context to a compact string for AI prompt
 */
export function serializeContext(context: CanvasContext): string {
  const lines: string[] = [];
  
  // Header
  lines.push('=== CURRENT CANVAS STATE ===');
  lines.push('');
  
  // Musical context
  lines.push(`Musical Context:`);
  lines.push(`  Root: ${context.musicalContext.root} (${getRootNoteName(context.musicalContext.root)})`);
  lines.push(`  Scale: ${context.musicalContext.scale}`);
  lines.push(`  BPM: ${context.musicalContext.bpm}`);
  lines.push('');
  
  // Nodes
  lines.push(`Nodes (${context.nodes.length}):`);
  if (context.nodes.length === 0) {
    lines.push('  (empty canvas)');
  } else {
    for (const node of context.nodes) {
      const propsStr = serializeNodeProps(node.type, node.props);
      lines.push(`  [${node.id.slice(0, 8)}] ${node.type} at (${node.x}, ${node.y})${propsStr ? ` - ${propsStr}` : ''}`);
    }
  }
  lines.push('');
  
  // Edges
  lines.push(`Connections (${context.edges.length}):`);
  if (context.edges.length === 0) {
    lines.push('  (no connections)');
  } else {
    for (const edge of context.edges) {
      const fromNode = context.nodes.find(n => n.id === edge.from);
      const toNode = context.nodes.find(n => n.id === edge.to);
      const fromType = fromNode?.type || 'unknown';
      const toType = toNode?.type || 'unknown';
      lines.push(`  ${fromType}[${edge.from.slice(0, 8)}] → ${toType}[${edge.to.slice(0, 8)}]`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Get note name from root number
 */
function getRootNoteName(root: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return notes[root % 12] || 'C';
}

/**
 * Serialize important node properties to string
 */
function serializeNodeProps(type: NodeType, props: Record<string, unknown>): string {
  switch (type) {
    case 'source':
      return `interval=${props.interval}, note=${props.midiNote}`;
    case 'speaker':
      return `vol=${props.volume}, reverb=${props.reverb}`;
    case 'oscillator':
      return `wave=${props.wave}, ratio=${props.ratio}`;
    case 'filter':
      return `cutoff=${props.cutoff}`;
    case 'pitch':
      return props.mode === 'shift' ? `shift=${props.shift}` : `fixed=${props.fixedMidiNote}`;
    case 'gate':
      return `probability=${props.probability}, mode=${props.mode}`;
    case 'delay':
      return `time=${props.delayTime}`;
    case 'gain':
      return `value=${props.value}`;
    case 'quantizer':
      return `scale=${props.scale}, root=${props.root}`;
    case 'lfo':
      return `rate=${props.rate}, shape=${props.shape}`;
    default:
      return '';
  }
}

// ============================================================================
// CONSTRAINT HELPERS
// ============================================================================

/**
 * Get default generation constraints based on canvas state
 */
export function getDefaultConstraints(maxNodes: number = 30): GenerationConstraints {
  const context = buildCanvasContext();
  
  // Calculate bounding box of existing nodes
  if (context.nodes.length === 0) {
    return {
      maxNodes: maxNodes,
      maxEdges: Math.floor(maxNodes * 1.5),
      preferredArea: { x: 0, y: 0, width: 800, height: 600 },
    };
  }
  
  const xs = context.nodes.map(n => n.x);
  const ys = context.nodes.map(n => n.y);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  // Suggest area to the right or below existing nodes
  return {
    maxNodes: maxNodes,
    maxEdges: Math.floor(maxNodes * 1.5),
    preferredArea: {
      x: maxX + 100,
      y: minY,
      width: 600,
      height: maxY - minY + 200,
    },
  };
}

/**
 * Find a good position for a new node cluster
 */
export function findOpenArea(existingNodes: NodeContext[], _clusterSize: number): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 200, y: 200 };
  }
  
  // Find rightmost node
  const rightmost = existingNodes.reduce((max, node) => 
    node.x > max.x ? node : max);
  
  return {
    x: rightmost.x + 200,
    y: rightmost.y,
  };
}

/**
 * Calculate positions for a chain of nodes
 */
export function calculateChainPositions(
  startX: number, 
  startY: number, 
  count: number, 
  spacing: number = 150
): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * spacing,
    y: startY,
  }));
}

/**
 * Calculate positions for nodes in a grid layout
 */
export function calculateGridPositions(
  startX: number,
  startY: number,
  count: number,
  columns: number = 4,
  spacingX: number = 150,
  spacingY: number = 120
): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => ({
    x: startX + (i % columns) * spacingX,
    y: startY + Math.floor(i / columns) * spacingY,
  }));
}

// ============================================================================
// ANALYSIS HELPERS
// ============================================================================

/**
 * Analyze current canvas for suggestions
 */
export function analyzeCanvas(context: CanvasContext): CanvasAnalysis {
  const analysis: CanvasAnalysis = {
    hasSource: false,
    hasSpeaker: false,
    hasFilter: false,
    hasModulation: false,
    nodeTypes: new Set(),
    signalPaths: [],
    issues: [],
    suggestions: [],
  };
  
  // Analyze nodes
  for (const node of context.nodes) {
    analysis.nodeTypes.add(node.type);
    if (node.type === 'source') analysis.hasSource = true;
    if (node.type === 'speaker') analysis.hasSpeaker = true;
    if (node.type === 'filter') analysis.hasFilter = true;
    if (node.type === 'modulator' || node.type === 'lfo') analysis.hasModulation = true;
  }
  
  // Check for issues
  if (context.nodes.length > 0) {
    if (!analysis.hasSource) {
      analysis.issues.push('No source node - nothing will generate sound');
      analysis.suggestions.push('Add a source node to generate packets');
    }
    if (!analysis.hasSpeaker) {
      analysis.issues.push('No speaker node - sound won\'t be audible');
      analysis.suggestions.push('Add a speaker node to hear the output');
    }
    
    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    for (const edge of context.edges) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }
    const orphanedNodes = context.nodes.filter(n => !connectedNodes.has(n.id));
    if (orphanedNodes.length > 0) {
      analysis.issues.push(`${orphanedNodes.length} unconnected node(s)`);
    }
  }
  
  // Suggest improvements
  if (analysis.hasSource && analysis.hasSpeaker && !analysis.hasFilter) {
    analysis.suggestions.push('Add a filter for tonal shaping');
  }
  if (!analysis.hasModulation && context.nodes.length > 2) {
    analysis.suggestions.push('Add an LFO or modulator for movement');
  }
  
  return analysis;
}

export interface CanvasAnalysis {
  hasSource: boolean;
  hasSpeaker: boolean;
  hasFilter: boolean;
  hasModulation: boolean;
  nodeTypes: Set<NodeType>;
  signalPaths: string[][];
  issues: string[];
  suggestions: string[];
}
