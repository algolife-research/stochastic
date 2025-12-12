// AI Agent - Canvas Operations Executor
// Applies parsed operations to the canvas store

import { useGraphStore } from '@core/store';
import type { NodeId } from '@core/types';
import type { 
  CanvasOperation, 
  AddNodeOperation,
  ModifyNodeOperation,
  DeleteNodeOperation,
  AddEdgeOperation,
  ModifyEdgeOperation,
  DeleteEdgeOperation,
  AutoLayoutOperation,
  CreateSceneOperation,
  ModifySceneOperation,
  SwitchSceneOperation,
  SaveToSceneOperation,
  DeleteSceneOperation,
  AddToArrangementOperation,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

/** Result of applying operations */
export interface ApplyResult {
  success: boolean;
  appliedCount: number;
  failedCount: number;
  errors: OperationError[];
  warnings: string[];  // Non-fatal issues (e.g., edge not found)
  nodeIdMap: Map<string, NodeId>;  // tempId -> real NodeId
}

export interface OperationError {
  operation: CanvasOperation;
  error: string;
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

/**
 * Apply a set of operations to the canvas
 */
export function applyOperations(operations: CanvasOperation[]): ApplyResult {
  const result: ApplyResult = {
    success: true,
    appliedCount: 0,
    failedCount: 0,
    errors: [],
    warnings: [],
    nodeIdMap: new Map(),
  };
  
  const store = useGraphStore.getState();
  
  // Process operations in order
  for (const operation of operations) {
    try {
      switch (operation.type) {
        case 'add_node':
          applyAddNode(operation, result, store);
          break;
        case 'modify_node':
          applyModifyNode(operation, result, store);
          break;
        case 'delete_node':
          applyDeleteNode(operation, result, store);
          break;
        case 'add_edge':
          applyAddEdge(operation, result, store);
          break;
        case 'modify_edge':
          applyModifyEdge(operation, result, store);
          break;
        case 'delete_edge':
          applyDeleteEdge(operation, result, store);
          break;
        case 'auto_layout':
          applyAutoLayout(operation, store);
          break;
        case 'create_scene':
          applyCreateScene(operation, result, store);
          break;
        case 'modify_scene':
          applyModifyScene(operation, result, store);
          break;
        case 'switch_scene':
          applySwitchScene(operation, result, store);
          break;
        case 'save_to_scene':
          applySaveToScene(operation, result, store);
          break;
        case 'delete_scene':
          applyDeleteScene(operation, result, store);
          break;
        case 'add_to_arrangement':
          applyAddToArrangement(operation, result, store);
          break;
      }
      result.appliedCount++;
    } catch (e) {
      result.failedCount++;
      result.errors.push({
        operation,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }
  
  result.success = result.failedCount === 0;
  return result;
}

// ============================================================================
// OPERATION HANDLERS
// ============================================================================

type StoreType = ReturnType<typeof useGraphStore.getState>;

function applyAddNode(
  op: AddNodeOperation, 
  result: ApplyResult,
  store: StoreType
): void {
  const nodeId = store.addNode(op.nodeType, op.x, op.y);
  
  // Store mapping from tempId to real NodeId
  if (op.tempId) {
    result.nodeIdMap.set(op.tempId, nodeId);
  }
  
  // Apply custom props if provided
  if (op.props) {
    store.updateNodeProps(nodeId, op.props as Record<string, unknown>);
  }
}

function applyModifyNode(
  op: ModifyNodeOperation,
  result: ApplyResult,
  store: StoreType
): void {
  // Resolve nodeId (might be tempId)
  const nodeId = resolveNodeId(op.nodeId, result.nodeIdMap);
  if (!nodeId) {
    throw new Error(`Node not found: ${op.nodeId}`);
  }
  
  // Verify node exists
  const node = store.getNode(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // Update props
  store.updateNodeProps(nodeId, op.props as Record<string, unknown>);
}

function applyDeleteNode(
  op: DeleteNodeOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const nodeId = resolveNodeId(op.nodeId, result.nodeIdMap);
  if (!nodeId) {
    throw new Error(`Node not found: ${op.nodeId}`);
  }
  
  store.deleteNode(nodeId);
}

function applyAddEdge(
  op: AddEdgeOperation,
  result: ApplyResult,
  store: StoreType
): void {
  // Resolve from/to (might be tempIds)
  const fromId = resolveNodeId(op.from, result.nodeIdMap);
  const toId = resolveNodeId(op.to, result.nodeIdMap);
  
  if (!fromId) {
    throw new Error(`Source node not found: ${op.from}`);
  }
  if (!toId) {
    throw new Error(`Target node not found: ${op.to}`);
  }
  
  // Add edge with options
  const edgeId = store.addEdge(fromId, toId, {
    timingMode: op.timingMode || 'fixed',
    durationBeats: op.durationBeats ?? null,
    targetParam: op.targetParam ?? null,
    weight: op.weight,
  });
  
  if (!edgeId) {
    throw new Error(`Failed to create edge from ${fromId} to ${toId}`);
  }
}

/**
 * Resolve edge ID from operation (either direct edgeId or lookup by from/to)
 */
function resolveEdgeId(
  op: { edgeId?: import('@core/types').EdgeId; from?: string; to?: string },
  nodeIdMap: Map<string, NodeId>,
  store: StoreType
): import('@core/types').EdgeId | null {
  // If edgeId is provided directly, use it
  if (op.edgeId) {
    if (store.edges.has(op.edgeId)) {
      return op.edgeId;
    }
    // Try partial ID match (same logic as node resolution)
    const normalizedRef = op.edgeId.toLowerCase().trim();
    for (const [edgeId] of store.edges) {
      const normalizedEdgeId = edgeId.toLowerCase();
      if (normalizedEdgeId.startsWith(normalizedRef)) {
        return edgeId;
      }
      if (normalizedRef.length >= 6 && normalizedEdgeId.includes(normalizedRef)) {
        return edgeId;
      }
    }
    return null;
  }
  
  // Otherwise, look up by from/to
  if (op.from && op.to) {
    const fromId = resolveNodeId(op.from, nodeIdMap);
    const toId = resolveNodeId(op.to, nodeIdMap);
    
    if (!fromId || !toId) {
      return null;
    }
    
    // Find edge connecting these nodes
    for (const [edgeId, edge] of store.edges) {
      if (edge.from === fromId && edge.to === toId) {
        return edgeId;
      }
    }
  }
  
  return null;
}

function applyModifyEdge(
  op: ModifyEdgeOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const edgeId = resolveEdgeId(op, result.nodeIdMap, store);
  if (!edgeId) {
    // Skip instead of throwing - log as warning
    const msg = `Skipping modify_edge: edge not found ${op.edgeId || `${op.from} -> ${op.to}`}`;
    result.warnings.push(msg);
    return;
  }
  
  // Build updates object
  const updates: Record<string, unknown> = {};
  if (op.timingMode !== undefined) updates.timingMode = op.timingMode;
  if (op.durationBeats !== undefined) updates.durationBeats = op.durationBeats;
  if (op.targetParam !== undefined) updates.targetParam = op.targetParam;
  if (op.weight !== undefined) updates.weight = op.weight;
  
  store.updateEdge(edgeId, updates);
}

function applyDeleteEdge(
  op: DeleteEdgeOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const edgeId = resolveEdgeId(op, result.nodeIdMap, store);
  if (!edgeId) {
    // Skip instead of throwing - log as warning
    const msg = `Skipping delete_edge: edge not found ${op.edgeId || `${op.from} -> ${op.to}`}`;
    result.warnings.push(msg);
    return;
  }
  
  store.deleteEdge(edgeId);
}

function applyAutoLayout(
  op: AutoLayoutOperation,
  store: StoreType
): void {
  store.autoLayout(op.algorithm || 'hierarchical');
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve a node reference (tempId, real NodeId, or type-based lookup)
 */
function resolveNodeId(ref: string | NodeId, nodeIdMap: Map<string, NodeId>): NodeId | null {
  // Check if it's a tempId we've mapped
  if (nodeIdMap.has(ref as string)) {
    return nodeIdMap.get(ref as string)!;
  }
  
  // Check if it's a real NodeId that exists
  const store = useGraphStore.getState();
  if (store.nodes.has(ref as NodeId)) {
    return ref as NodeId;
  }
  
  // Try to find by partial ID match (AI uses 8-character truncated IDs)
  const normalizedRef = (ref as string).trim().toLowerCase();
  for (const [nodeId] of store.nodes) {
    const normalizedNodeId = nodeId.toLowerCase();
    // Check if full ID starts with the reference (most common case - 8 char truncated ID)
    if (normalizedNodeId.startsWith(normalizedRef)) {
      return nodeId;
    }
    // Check if reference is contained in the full ID
    if (normalizedRef.length >= 6 && normalizedNodeId.includes(normalizedRef)) {
      return nodeId;
    }
    // Handle IDs without dashes
    const nodeIdNoDashes = normalizedNodeId.replace(/-/g, '');
    const refNoDashes = normalizedRef.replace(/-/g, '');
    if (nodeIdNoDashes.startsWith(refNoDashes) && refNoDashes.length >= 6) {
      return nodeId;
    }
  }
  
  // Try to find by type if ref looks like a type name (e.g., "source", "speaker")
  const lowerRef = (ref as string).toLowerCase();
  const typeNames = ['source', 'speaker', 'pitch', 'oscillator', 'filter', 'gate', 
                     'delay', 'gain', 'modulator', 'lfo', 'splitter', 'quantizer',
                     'tunnel', 'teleporter', 'midi_out', 'midi_cc', 'mutator', 'crossover'];
  
  for (const typeName of typeNames) {
    if (lowerRef.includes(typeName)) {
      // Find first node of this type
      for (const [nodeId, node] of store.nodes) {
        if (node.type === typeName) {
          return nodeId;
        }
      }
    }
  }
  
  return null;
}

// ============================================================================
// PREVIEW SUPPORT
// ============================================================================

/**
 * Preview operations without actually applying them
 * Returns a list of changes that would be made
 */
export interface PreviewChange {
  type: 'add' | 'modify' | 'delete';
  target: 'node' | 'edge';
  details: string;
}

export function previewOperations(operations: CanvasOperation[]): PreviewChange[] {
  const changes: PreviewChange[] = [];
  const store = useGraphStore.getState();
  
  for (const op of operations) {
    switch (op.type) {
      case 'add_node':
        changes.push({
          type: 'add',
          target: 'node',
          details: `Add ${op.nodeType} at (${op.x}, ${op.y})`,
        });
        break;
        
      case 'modify_node': {
        const node = store.getNode(op.nodeId as NodeId);
        changes.push({
          type: 'modify',
          target: 'node',
          details: `Modify ${node?.type || 'unknown'} node`,
        });
        break;
      }
        
      case 'delete_node': {
        const node = store.getNode(op.nodeId as NodeId);
        changes.push({
          type: 'delete',
          target: 'node',
          details: `Delete ${node?.type || 'unknown'} node`,
        });
        break;
      }
        
      case 'add_edge':
        changes.push({
          type: 'add',
          target: 'edge',
          details: `Connect ${op.from} → ${op.to}`,
        });
        break;
        
      case 'modify_edge':
        changes.push({
          type: 'modify',
          target: 'edge',
          details: `Modify edge`,
        });
        break;
        
      case 'delete_edge':
        changes.push({
          type: 'delete',
          target: 'edge',
          details: `Delete edge`,
        });
        break;
        
      case 'create_scene':
        changes.push({
          type: 'add',
          target: 'node',
          details: `Create scene "${op.name || 'New Scene'}"${op.copyCurrentCanvas ? ' (with current canvas)' : ''}`,
        });
        break;
        
      case 'modify_scene': {
        const sceneId = resolveSceneId(op.sceneId, store);
        const scene = sceneId ? store.scenes.get(sceneId) : null;
        changes.push({
          type: 'modify',
          target: 'node',
          details: `Modify scene "${scene?.name || op.sceneId || 'unknown'}"`,
        });
        break;
      }
        
      case 'switch_scene': {
        const sceneId = resolveSceneId(op.sceneId || op.sceneName, store);
        const scene = sceneId ? store.scenes.get(sceneId) : null;
        changes.push({
          type: 'modify',
          target: 'node',
          details: `Switch to scene "${scene?.name || op.sceneId || op.sceneName || 'unknown'}"`,
        });
        break;
      }
        
      case 'save_to_scene': {
        const sceneId = op.sceneId ? resolveSceneId(op.sceneId, store) : store.editingSceneId;
        const scene = sceneId ? store.scenes.get(sceneId) : null;
        changes.push({
          type: 'modify',
          target: 'node',
          details: `Save canvas to scene "${scene?.name || 'current'}"`,
        });
        break;
      }
        
      case 'delete_scene': {
        const sceneId = resolveSceneId(op.sceneId, store);
        const scene = sceneId ? store.scenes.get(sceneId) : null;
        changes.push({
          type: 'delete',
          target: 'node',
          details: `Delete scene "${scene?.name || op.sceneId || 'unknown'}"`,
        });
        break;
      }
        
      case 'add_to_arrangement': {
        const sceneId = op.sceneId ? resolveSceneId(op.sceneId, store) : store.editingSceneId;
        const scene = sceneId ? store.scenes.get(sceneId) : null;
        changes.push({
          type: 'add',
          target: 'node',
          details: `Add scene "${scene?.name || 'current'}" to arrangement`,
        });
        break;
      }
    }
  }
  
  return changes;
}

// ============================================================================
// SCENE OPERATION HANDLERS
// ============================================================================

/**
 * Resolve a scene ID or name to a SceneId
 */
function resolveSceneId(ref: string | undefined, store: StoreType): import('@core/types').SceneId | null {
  if (!ref) return null;
  
  // Check if it's a direct SceneId that exists
  const sceneId = ref as import('@core/types').SceneId;
  if (store.scenes.has(sceneId)) {
    return sceneId;
  }
  
  // Try partial ID match
  const normalizedRef = ref.toLowerCase().trim();
  for (const [id] of store.scenes) {
    const normalizedId = id.toLowerCase();
    if (normalizedId.startsWith(normalizedRef)) {
      return id;
    }
    if (normalizedRef.length >= 6 && normalizedId.includes(normalizedRef)) {
      return id;
    }
  }
  
  // Try to find by scene name
  for (const [id, scene] of store.scenes) {
    if (scene.name.toLowerCase() === normalizedRef) {
      return id;
    }
  }
  
  // Try partial name match
  for (const [id, scene] of store.scenes) {
    if (scene.name.toLowerCase().includes(normalizedRef)) {
      return id;
    }
  }
  
  return null;
}

function applyCreateScene(
  op: CreateSceneOperation,
  result: ApplyResult,
  store: StoreType
): void {
  if (op.copyCurrentCanvas) {
    // Save current canvas to the new scene
    const sceneId = store.createScene(op.name);
    store.saveCurrentToScene(sceneId);
  } else {
    store.createScene(op.name);
  }
}

function applyModifyScene(
  op: ModifySceneOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const sceneId = resolveSceneId(op.sceneId, store);
  if (!sceneId) {
    throw new Error(`Scene not found: ${op.sceneId || 'unknown'}`);
  }
  
  const updates: Partial<import('@core/types').Scene> = {};
  if (op.name !== undefined) updates.name = op.name;
  if (op.durationBeats !== undefined) updates.durationBeats = op.durationBeats;
  if (op.loopCount !== undefined) updates.loopCount = op.loopCount;
  if (op.localBpm !== undefined) updates.localBpm = op.localBpm;
  if (op.localRoot !== undefined) updates.localRoot = op.localRoot;
  if (op.localScale !== undefined) updates.localScale = op.localScale;
  if (op.color !== undefined) updates.color = op.color;
  
  store.updateScene(sceneId, updates);
}

function applySwitchScene(
  op: SwitchSceneOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const sceneId = resolveSceneId(op.sceneId || op.sceneName, store);
  if (!sceneId) {
    throw new Error(`Scene not found: ${op.sceneId || op.sceneName || 'unknown'}`);
  }
  
  store.loadSceneToCanvas(sceneId);
}

function applySaveToScene(
  op: SaveToSceneOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const sceneId = op.sceneId 
    ? resolveSceneId(op.sceneId, store)
    : store.editingSceneId;
    
  if (!sceneId) {
    throw new Error(`Scene not found: ${op.sceneId || 'current scene'}`);
  }
  
  store.saveCurrentToScene(sceneId);
}

function applyDeleteScene(
  op: DeleteSceneOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const sceneId = resolveSceneId(op.sceneId, store);
  if (!sceneId) {
    throw new Error(`Scene not found: ${op.sceneId || 'unknown'}`);
  }
  
  store.deleteScene(sceneId);
}

function applyAddToArrangement(
  op: AddToArrangementOperation,
  result: ApplyResult,
  store: StoreType
): void {
  const sceneId = op.sceneId
    ? resolveSceneId(op.sceneId, store)
    : store.editingSceneId;
    
  if (!sceneId) {
    throw new Error(`Scene not found: ${op.sceneId || 'current scene'}`);
  }
  
  store.addToArrangement(sceneId, op.startBeat, op.channel);
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Create a simple patch from description
 * Useful for quick template-based generation
 * Note: Props use plain numbers, they get cast appropriately when applied
 */
export function createSimplePatch(
  type: 'bass' | 'lead' | 'pad' | 'arp',
  startX: number = 200,
  startY: number = 200
): CanvasOperation[] {
  const spacing = 150;
  
  // Helper to create add_node operation with unbranded props
  const addNode = (
    nodeType: string, 
    x: number, 
    y: number, 
    tempId: string, 
    props?: Record<string, unknown>
  ): AddNodeOperation => ({
    type: 'add_node',
    nodeType: nodeType as import('@core/types').NodeType,
    x,
    y,
    tempId,
    props: props as AddNodeOperation['props'],
  });
  
  const addEdge = (from: string, to: string): AddEdgeOperation => ({
    type: 'add_edge',
    from,
    to,
  });
  
  switch (type) {
    case 'bass':
      return [
        addNode('source', startX, startY, 'src', { interval: 1, midiNote: 36 }),
        addNode('oscillator', startX + spacing, startY, 'osc', { wave: 'sawtooth' }),
        addNode('filter', startX + spacing * 2, startY, 'flt', { cutoff: 600 }),
        addNode('speaker', startX + spacing * 3, startY, 'spk'),
        addEdge('src', 'osc'),
        addEdge('osc', 'flt'),
        addEdge('flt', 'spk'),
      ];
      
    case 'lead':
      return [
        addNode('source', startX, startY, 'src', { interval: 0.5, midiNote: 60 }),
        addNode('oscillator', startX + spacing, startY, 'osc', { wave: 'square' }),
        addNode('filter', startX + spacing * 2, startY, 'flt', { cutoff: 2000, attack: 0.01, decay: 0.3, mod: 0.5 }),
        addNode('speaker', startX + spacing * 3, startY, 'spk', { reverb: 0.3 }),
        addEdge('src', 'osc'),
        addEdge('osc', 'flt'),
        addEdge('flt', 'spk'),
      ];
      
    case 'pad':
      return [
        addNode('source', startX, startY, 'src', { interval: 4, midiNote: 48 }),
        addNode('oscillator', startX + spacing, startY - 50, 'osc1', { wave: 'sine', attack: 0.5, decay: 2 }),
        addNode('oscillator', startX + spacing, startY + 50, 'osc2', { wave: 'triangle', ratio: 2, attack: 0.8, decay: 2.5, mix: 0.5 }),
        addNode('filter', startX + spacing * 2, startY, 'flt', { cutoff: 1500 }),
        addNode('modulator', startX + spacing * 3, startY, 'mod', { rate: 4, depth: 5 }),
        addNode('speaker', startX + spacing * 4, startY, 'spk', { reverb: 0.6, holdTime: 1, releaseTime: 2 }),
        addEdge('src', 'osc1'),
        addEdge('src', 'osc2'),
        addEdge('osc1', 'flt'),
        addEdge('osc2', 'flt'),
        addEdge('flt', 'mod'),
        addEdge('mod', 'spk'),
      ];
      
    case 'arp':
      return [
        addNode('source', startX, startY, 'src', { interval: 0.25, midiNote: 48 }),
        addNode('pitch', startX + spacing, startY - 60, 'p1', { mode: 'shift', shift: 0 }),
        addNode('pitch', startX + spacing, startY, 'p2', { mode: 'shift', shift: 4 }),
        addNode('pitch', startX + spacing, startY + 60, 'p3', { mode: 'shift', shift: 7 }),
        addNode('gate', startX + spacing * 0.5, startY - 60, 'g1', { prob: 0.33 }),
        addNode('gate', startX + spacing * 0.5, startY, 'g2', { prob: 0.33 }),
        addNode('gate', startX + spacing * 0.5, startY + 60, 'g3', { prob: 0.33 }),
        addNode('oscillator', startX + spacing * 2, startY, 'osc', { wave: 'sine' }),
        addNode('speaker', startX + spacing * 3, startY, 'spk', { reverb: 0.4 }),
        addEdge('src', 'g1'),
        addEdge('src', 'g2'),
        addEdge('src', 'g3'),
        addEdge('g1', 'p1'),
        addEdge('g2', 'p2'),
        addEdge('g3', 'p3'),
        addEdge('p1', 'osc'),
        addEdge('p2', 'osc'),
        addEdge('p3', 'osc'),
        addEdge('osc', 'spk'),
      ];
  }
}
