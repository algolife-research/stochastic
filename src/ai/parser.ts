// AI Agent - Response Parser
// Parses AI responses into structured canvas operations

import type { 
  CanvasOperation, 
  AddNodeOperation, 
  ModifyNodeOperation,
  DeleteNodeOperation,
  AddEdgeOperation,
  ModifyEdgeOperation,
  DeleteEdgeOperation,
  AutoLayoutOperation,
  GenerationResponse,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types';
import type { NodeType } from '@core/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_NODE_TYPES: NodeType[] = [
  'source', 'speaker', 'pitch', 'oscillator', 'filter', 'gate',
  'delay', 'gain', 'modulator', 'tunnel', 'teleporter', 'quantizer',
  'lfo', 'splitter', 'midi_out', 'midi_cc', 'scene_trigger',
  'mutator', 'crossover'
];

// ============================================================================
// JSON EXTRACTION
// ============================================================================

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
export function extractJSON(response: string): string | null {
  // Try to find JSON code block
  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }
  
  // Try to find raw JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  return null;
}

/**
 * Parse JSON safely with error handling
 * Attempts to fix truncated JSON by closing unclosed brackets/braces
 */
export function parseJSON<T>(json: string): { data: T | null; error: string | null } {
  try {
    const data = JSON.parse(json) as T;
    return { data, error: null };
  } catch (e) {
    // Try to fix truncated JSON
    const fixed = attemptFixTruncatedJSON(json);
    if (fixed !== json) {
      try {
        const data = JSON.parse(fixed) as T;
        console.warn('AI response was truncated, recovered partial data');
        return { data, error: null };
      } catch {
        // Fall through to original error
      }
    }
    return { data: null, error: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
}

/**
 * Attempt to fix truncated JSON by closing unclosed brackets and braces
 */
function attemptFixTruncatedJSON(json: string): string {
  // Remove any trailing incomplete string (after last complete value)
  let fixed = json.trim();
  
  // Remove trailing comma if present
  fixed = fixed.replace(/,\s*$/, '');
  
  // Remove incomplete string at end (text that starts with " but doesn't end)
  const lastQuote = fixed.lastIndexOf('"');
  if (lastQuote > 0) {
    const beforeQuote = fixed.substring(0, lastQuote);
    const quoteCount = (beforeQuote.match(/(?<!\\)"/g) || []).length;
    // If odd number of quotes before the last one, the string is incomplete
    if (quoteCount % 2 === 0) {
      // Last quote starts an incomplete string, remove everything from last complete structure
      const lastBracket = Math.max(
        fixed.lastIndexOf('}'),
        fixed.lastIndexOf(']'),
        fixed.lastIndexOf(',')
      );
      if (lastBracket > 0) {
        fixed = fixed.substring(0, lastBracket + 1);
      }
    }
  }
  
  // Remove trailing comma again
  fixed = fixed.replace(/,\s*$/, '');
  
  // Count brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;
  
  for (const char of fixed) {
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }
  
  // Close any unclosed brackets/braces
  fixed += ']'.repeat(Math.max(0, openBrackets));
  fixed += '}'.repeat(Math.max(0, openBraces));
  
  return fixed;
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

interface RawResponse {
  explanation?: string;
  operations?: unknown[];
  suggestions?: string[];
}

/**
 * Parse AI response into structured generation response
 */
export function parseAIResponse(response: string): GenerationResponse {
  // Extract JSON from response
  const jsonStr = extractJSON(response);
  if (!jsonStr) {
    return {
      content: response,
      operations: [],
      error: 'No valid JSON found in response',
    };
  }
  
  // Parse JSON
  const { data, error } = parseJSON<RawResponse>(jsonStr);
  if (error || !data) {
    return {
      content: response,
      operations: [],
      error: error || 'Failed to parse response',
    };
  }
  
  // Extract and validate operations
  const operations = parseOperations(data.operations || []);
  
  return {
    content: data.explanation || response,
    operations,
    suggestions: data.suggestions,
    error: operations.length === 0 && (data.operations?.length || 0) > 0 
      ? 'Operations were invalid and filtered out' 
      : undefined,
  };
}

/**
 * Parse and validate operations array
 */
function parseOperations(rawOps: unknown[]): CanvasOperation[] {
  const operations: CanvasOperation[] = [];
  
  for (const raw of rawOps) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    
    const op = raw as Record<string, unknown>;
    const type = op.type;
    
    switch (type) {
      case 'add_node': {
        const parsed = parseAddNodeOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'modify_node': {
        const parsed = parseModifyNodeOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'delete_node': {
        const parsed = parseDeleteNodeOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'add_edge': {
        const parsed = parseAddEdgeOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'modify_edge': {
        const parsed = parseModifyEdgeOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'delete_edge': {
        const parsed = parseDeleteEdgeOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'auto_layout': {
        const parsed = parseAutoLayoutOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'create_scene': {
        const parsed = parseCreateSceneOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'modify_scene': {
        const parsed = parseModifySceneOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'switch_scene': {
        const parsed = parseSwitchSceneOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'save_to_scene': {
        const parsed = parseSaveToSceneOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'delete_scene': {
        const parsed = parseDeleteSceneOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
      case 'add_to_arrangement': {
        const parsed = parseAddToArrangementOperation(op);
        if (parsed) {
          operations.push(parsed);
        }
        break;
      }
    }
  }
  
  return operations;
}

// ============================================================================
// OPERATION PARSERS
// ============================================================================

function parseAddNodeOperation(op: Record<string, unknown>): AddNodeOperation | null {
  const nodeType = op.nodeType as string;
  if (!VALID_NODE_TYPES.includes(nodeType as NodeType)) {
    return null;
  }
  
  const x = typeof op.x === 'number' ? op.x : 200;
  const y = typeof op.y === 'number' ? op.y : 200;
  
  return {
    type: 'add_node',
    nodeType: nodeType as NodeType,
    x,
    y,
    tempId: typeof op.tempId === 'string' ? op.tempId : undefined,
    props: typeof op.props === 'object' && op.props !== null 
      ? op.props as AddNodeOperation['props']
      : undefined,
  };
}

function parseModifyNodeOperation(op: Record<string, unknown>): ModifyNodeOperation | null {
  const nodeId = op.nodeId as string;
  if (!nodeId) return null;
  
  return {
    type: 'modify_node',
    nodeId,
    props: typeof op.props === 'object' && op.props !== null 
      ? op.props as ModifyNodeOperation['props']
      : {},
  };
}

function parseDeleteNodeOperation(op: Record<string, unknown>): DeleteNodeOperation | null {
  const nodeId = op.nodeId as string;
  if (!nodeId) return null;
  
  return {
    type: 'delete_node',
    nodeId,
  };
}

function parseAddEdgeOperation(op: Record<string, unknown>): AddEdgeOperation | null {
  const from = op.from as string;
  const to = op.to as string;
  if (!from || !to) return null;
  
  return {
    type: 'add_edge',
    from,
    to,
    timingMode: op.timingMode === 'physical' ? 'physical' : 'fixed',
    durationBeats: typeof op.durationBeats === 'number' ? op.durationBeats : undefined,
    targetParam: typeof op.targetParam === 'string' ? op.targetParam : undefined,
    weight: typeof op.weight === 'number' ? op.weight : undefined,
  };
}

function parseModifyEdgeOperation(op: Record<string, unknown>): ModifyEdgeOperation | null {
  const edgeId = op.edgeId as string | undefined;
  const from = op.from as string | undefined;
  const to = op.to as string | undefined;
  
  // Must have either edgeId or both from/to
  if (!edgeId && (!from || !to)) {
    return null;
  }
  
  return {
    type: 'modify_edge',
    edgeId: edgeId as import('@core/types').EdgeId | undefined,
    from,
    to,
    timingMode: op.timingMode as 'physical' | 'fixed' | undefined,
    durationBeats: typeof op.durationBeats === 'number' ? op.durationBeats : undefined,
    targetParam: typeof op.targetParam === 'string' ? op.targetParam : undefined,
    weight: typeof op.weight === 'number' ? op.weight : undefined,
  };
}

function parseDeleteEdgeOperation(op: Record<string, unknown>): DeleteEdgeOperation | null {
  const edgeId = op.edgeId as string | undefined;
  const from = op.from as string | undefined;
  const to = op.to as string | undefined;
  
  // Must have either edgeId or both from/to
  if (!edgeId && (!from || !to)) {
    return null;
  }
  
  return {
    type: 'delete_edge',
    edgeId: edgeId as import('@core/types').EdgeId | undefined,
    from,
    to,
  };
}

function parseAutoLayoutOperation(op: Record<string, unknown>): AutoLayoutOperation {
  const algorithm = op.algorithm as string | undefined;
  const validAlgorithms = ['hierarchical', 'force', 'circular'];
  
  return {
    type: 'auto_layout',
    algorithm: validAlgorithms.includes(algorithm || '') 
      ? algorithm as 'hierarchical' | 'force' | 'circular'
      : 'hierarchical',
  };
}

function parseCreateSceneOperation(op: Record<string, unknown>): import('./types').CreateSceneOperation {
  return {
    type: 'create_scene',
    name: typeof op.name === 'string' ? op.name : undefined,
    copyCurrentCanvas: typeof op.copyCurrentCanvas === 'boolean' ? op.copyCurrentCanvas : false,
  };
}

function parseModifySceneOperation(op: Record<string, unknown>): import('./types').ModifySceneOperation | null {
  const sceneId = typeof op.sceneId === 'string' ? op.sceneId : undefined;
  const name = typeof op.name === 'string' ? op.name : undefined;
  
  if (!sceneId && !name) return null;
  
  return {
    type: 'modify_scene',
    sceneId,
    name: typeof op.name === 'string' ? op.name : undefined,
    durationBeats: typeof op.durationBeats === 'number' ? op.durationBeats : undefined,
    loopCount: typeof op.loopCount === 'number' ? op.loopCount : undefined,
    localBpm: typeof op.localBpm === 'number' ? op.localBpm : 
              op.localBpm === null ? null : undefined,
    localRoot: typeof op.localRoot === 'number' ? op.localRoot : 
               op.localRoot === null ? null : undefined,
    localScale: typeof op.localScale === 'string' ? op.localScale as import('@core/types').ScaleName : 
                op.localScale === null ? null : undefined,
    color: typeof op.color === 'string' ? op.color : undefined,
  };
}

function parseSwitchSceneOperation(op: Record<string, unknown>): import('./types').SwitchSceneOperation | null {
  const sceneId = typeof op.sceneId === 'string' ? op.sceneId : undefined;
  const sceneName = typeof op.sceneName === 'string' ? op.sceneName : undefined;
  
  if (!sceneId && !sceneName) return null;
  
  return {
    type: 'switch_scene',
    sceneId,
    sceneName,
  };
}

function parseSaveToSceneOperation(op: Record<string, unknown>): import('./types').SaveToSceneOperation {
  return {
    type: 'save_to_scene',
    sceneId: typeof op.sceneId === 'string' ? op.sceneId : undefined,
  };
}

function parseDeleteSceneOperation(op: Record<string, unknown>): import('./types').DeleteSceneOperation | null {
  const sceneId = typeof op.sceneId === 'string' ? op.sceneId : undefined;
  
  if (!sceneId) return null;
  
  return {
    type: 'delete_scene',
    sceneId,
  };
}

function parseAddToArrangementOperation(op: Record<string, unknown>): import('./types').AddToArrangementOperation {
  return {
    type: 'add_to_arrangement',
    sceneId: typeof op.sceneId === 'string' ? op.sceneId : undefined,
    startBeat: typeof op.startBeat === 'number' ? op.startBeat : undefined,
    channel: typeof op.channel === 'number' ? op.channel : undefined,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Find a node ID that matches the given ID (supports partial matching)
 */
function findMatchingNodeId(targetId: string, existingNodeIds: Set<string>): string | null {
  // Exact match first
  if (existingNodeIds.has(targetId)) {
    return targetId;
  }
  
  // Normalize target ID (remove any whitespace, lowercase for comparison)
  const normalizedTarget = targetId.trim().toLowerCase();
  
  // Try partial match (AI sometimes truncates UUIDs to 8 chars)
  for (const existingId of existingNodeIds) {
    const normalizedExisting = existingId.toLowerCase();
    
    // Check if existing ID starts with the target (most common case)
    if (normalizedExisting.startsWith(normalizedTarget)) {
      return existingId;
    }
    
    // Check if target contains enough of the existing ID (at least 6 chars)
    if (normalizedTarget.length >= 6 && normalizedExisting.includes(normalizedTarget)) {
      return existingId;
    }
    
    // Check if existing ID starts with target (without dashes)
    const existingNoDashes = normalizedExisting.replace(/-/g, '');
    const targetNoDashes = normalizedTarget.replace(/-/g, '');
    if (existingNoDashes.startsWith(targetNoDashes) && targetNoDashes.length >= 6) {
      return existingId;
    }
  }
  
  return null;
}

/**
 * Validate a set of operations before applying
 */
export function validateOperations(
  operations: CanvasOperation[],
  existingNodeIds: Set<string>,
  existingEdgeIds: Set<string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Track temp IDs for edge resolution
  const tempIds = new Set<string>();
  const newNodeIds = new Set<string>();
  
  // Map of partial IDs to full IDs (for resolution)
  const idResolutionMap = new Map<string, string>();
  
  for (const op of operations) {
    switch (op.type) {
      case 'add_node':
        if (op.tempId) {
          if (tempIds.has(op.tempId)) {
            errors.push({
              operation: op,
              message: `Duplicate tempId: ${op.tempId}`,
              code: 'DUPLICATE_TEMP_ID',
            });
          }
          tempIds.add(op.tempId);
          newNodeIds.add(op.tempId);
        }
        break;
        
      case 'modify_node':
      case 'delete_node': {
        const resolvedId = findMatchingNodeId(op.nodeId as string, existingNodeIds);
        if (!resolvedId && !tempIds.has(op.nodeId as string)) {
          errors.push({
            operation: op,
            message: `Node not found: ${op.nodeId}`,
            code: 'NODE_NOT_FOUND',
          });
        } else if (resolvedId && resolvedId !== op.nodeId) {
          // Store the resolution for later use
          idResolutionMap.set(op.nodeId as string, resolvedId);
        }
        break;
      }
        
      case 'add_edge': {
        const fromResolved = findMatchingNodeId(op.from as string, existingNodeIds);
        const toResolved = findMatchingNodeId(op.to as string, existingNodeIds);
        
        const fromExists = fromResolved !== null || tempIds.has(op.from as string);
        const toExists = toResolved !== null || tempIds.has(op.to as string);
        
        if (fromResolved && fromResolved !== op.from) {
          idResolutionMap.set(op.from as string, fromResolved);
        }
        if (toResolved && toResolved !== op.to) {
          idResolutionMap.set(op.to as string, toResolved);
        }
        
        if (!fromExists) {
          errors.push({
            operation: op,
            message: `Source node not found: ${op.from}`,
            code: 'SOURCE_NODE_NOT_FOUND',
          });
        }
        if (!toExists) {
          errors.push({
            operation: op,
            message: `Target node not found: ${op.to}`,
            code: 'TARGET_NODE_NOT_FOUND',
          });
        }
        if (op.from === op.to) {
          warnings.push({
            operation: op,
            message: 'Self-loop edge detected',
            code: 'SELF_LOOP',
          });
        }
        break;
      }
        
      case 'modify_edge':
      case 'delete_edge': {
        // Validate syntax - actual edge existence will be checked during apply
        if (op.edgeId) {
          // Direct edgeId reference - just check if it's provided
          if (!existingEdgeIds.has(op.edgeId)) {
            // Add as warning, not error - will be checked during apply
            warnings.push({
              operation: op,
              message: `Edge ID may not exist: ${op.edgeId}`,
              code: 'EDGE_NOT_FOUND',
            });
          }
        } else if (op.from && op.to) {
          // from/to lookup - validate nodes exist
          const fromResolved = findMatchingNodeId(op.from as string, existingNodeIds) || 
                               (tempIds.has(op.from as string) ? op.from : null);
          const toResolved = findMatchingNodeId(op.to as string, existingNodeIds) || 
                             (tempIds.has(op.to as string) ? op.to : null);
          
          if (!fromResolved) {
            errors.push({
              operation: op,
              message: `Source node not found: ${op.from}`,
              code: 'SOURCE_NODE_NOT_FOUND',
            });
          }
          if (!toResolved) {
            errors.push({
              operation: op,
              message: `Target node not found: ${op.to}`,
              code: 'TARGET_NODE_NOT_FOUND',
            });
          }
          // Note: Edge existence between nodes will be checked during apply
        } else {
          errors.push({
            operation: op,
            message: 'modify_edge/delete_edge requires either edgeId or from+to',
            code: 'INVALID_OPERATION',
          });
        }
        break;
      }
    }
  }
  
  // Check for source and speaker in add operations
  const addOps = operations.filter((op): op is AddNodeOperation => op.type === 'add_node');
  const hasSource = addOps.some(op => op.nodeType === 'source') || 
    [...existingNodeIds].some(id => id.includes('source'));
  const hasSpeaker = addOps.some(op => op.nodeType === 'speaker') ||
    [...existingNodeIds].some(id => id.includes('speaker'));
  
  if (addOps.length > 0 && !hasSource && addOps[0]) {
    warnings.push({
      operation: addOps[0],
      message: 'No source node - sound won\'t generate',
      code: 'NO_SOURCE',
    });
  }
  if (addOps.length > 0 && !hasSpeaker && addOps[0]) {
    warnings.push({
      operation: addOps[0],
      message: 'No speaker node - sound won\'t be audible',
      code: 'NO_SPEAKER',
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    idResolutionMap: idResolutionMap.size > 0 ? idResolutionMap : undefined,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get a summary of operations for display
 */
export function summarizeOperations(operations: CanvasOperation[]): string {
  const counts = {
    addNode: 0,
    modifyNode: 0,
    deleteNode: 0,
    addEdge: 0,
    modifyEdge: 0,
    deleteEdge: 0,
    createScene: 0,
    modifyScene: 0,
    switchScene: 0,
    deleteScene: 0,
    saveToScene: 0,
    addToArrangement: 0,
  };
  
  for (const op of operations) {
    switch (op.type) {
      case 'add_node': counts.addNode++; break;
      case 'modify_node': counts.modifyNode++; break;
      case 'delete_node': counts.deleteNode++; break;
      case 'add_edge': counts.addEdge++; break;
      case 'modify_edge': counts.modifyEdge++; break;
      case 'delete_edge': counts.deleteEdge++; break;
      case 'create_scene': counts.createScene++; break;
      case 'modify_scene': counts.modifyScene++; break;
      case 'switch_scene': counts.switchScene++; break;
      case 'delete_scene': counts.deleteScene++; break;
      case 'save_to_scene': counts.saveToScene++; break;
      case 'add_to_arrangement': counts.addToArrangement++; break;
    }
  }
  
  const parts: string[] = [];
  if (counts.addNode) parts.push(`+${counts.addNode} nodes`);
  if (counts.modifyNode) parts.push(`~${counts.modifyNode} nodes`);
  if (counts.deleteNode) parts.push(`-${counts.deleteNode} nodes`);
  if (counts.addEdge) parts.push(`+${counts.addEdge} edges`);
  if (counts.modifyEdge) parts.push(`~${counts.modifyEdge} edges`);
  if (counts.deleteEdge) parts.push(`-${counts.deleteEdge} edges`);
  if (counts.createScene) parts.push(`+${counts.createScene} scenes`);
  if (counts.modifyScene) parts.push(`~${counts.modifyScene} scenes`);
  if (counts.switchScene) parts.push(`→${counts.switchScene} scene switches`);
  if (counts.deleteScene) parts.push(`-${counts.deleteScene} scenes`);
  if (counts.saveToScene) parts.push(`💾${counts.saveToScene} scene saves`);
  if (counts.addToArrangement) parts.push(`+${counts.addToArrangement} arrangement slots`);
  
  return parts.join(', ') || 'No changes';
}
