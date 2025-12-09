// Phonon v2 - Type Guards and Typed Factories
// Utilities for safe type handling without `as any` or `as never` casts

import type { 
  NodeType, 
  NodeId, 
  EdgeId,
  PacketId,
  SceneId,
  GraphNode,
  GraphEdge,
  Packet,
  Annotation,
  Region,
  PropsForNodeType,
  AudioPayload,
  HeldPacket,
  ScaleIntervals,
} from './types';

// ============================================================================
// TYPE ASSERTIONS
// ============================================================================

/**
 * Assert that a string is a valid NodeId
 */
export function assertNodeId(id: string): asserts id is NodeId {
  if (!id || typeof id !== 'string') {
    throw new TypeError(`Invalid NodeId: ${id}`);
  }
}

/**
 * Assert that a string is a valid EdgeId
 */
export function assertEdgeId(id: string): asserts id is EdgeId {
  if (!id || typeof id !== 'string') {
    throw new TypeError(`Invalid EdgeId: ${id}`);
  }
}

/**
 * Assert that a string is a valid PacketId
 */
export function assertPacketId(id: string): asserts id is PacketId {
  if (!id || typeof id !== 'string') {
    throw new TypeError(`Invalid PacketId: ${id}`);
  }
}

/**
 * Assert that a string is a valid SceneId
 */
export function assertSceneId(id: string): asserts id is SceneId {
  if (!id || typeof id !== 'string') {
    throw new TypeError(`Invalid SceneId: ${id}`);
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a string is a valid NodeType
 */
export function isValidNodeType(type: string): type is NodeType {
  const validTypes: NodeType[] = [
    'source', 'speaker', 'pitch', 'oscillator', 'filter',
    'gate', 'delay', 'gain', 'modulator', 'tunnel',
    'teleporter', 'quantizer', 'lfo', 'splitter',
    'midi_out', 'midi_cc', 'scene_trigger', 'mutator', 'crossover'
  ];
  return validTypes.includes(type as NodeType);
}

// ============================================================================
// TYPED FACTORIES
// ============================================================================

/**
 * Create a typed node without using `as never` cast
 */
export function createTypedNode<T extends NodeType>(
  type: T,
  id: NodeId,
  x: number,
  y: number,
  props: PropsForNodeType<T>
): GraphNode<T> {
  return {
    id,
    type,
    x,
    y,
    props,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [],
  };
}

/**
 * Create a typed edge
 */
export function createTypedEdge(
  id: EdgeId,
  from: NodeId,
  to: NodeId,
  timingMode: 'physical' | 'fixed',
  durationBeats: number | null,
  targetParam: string | null
): GraphEdge {
  return { id, from, to, timingMode, durationBeats, targetParam };
}

/**
 * Create a typed packet
 */
export function createTypedPacket(packet: Packet): Packet {
  return { ...packet };
}

/**
 * Create a typed annotation
 */
export function createTypedAnnotation(annotation: Annotation): Annotation {
  return { ...annotation };
}

/**
 * Create a typed region
 */
export function createTypedRegion(region: Region): Region {
  return { ...region };
}

/**
 * Create a typed held packet
 */
export function createTypedHeldPacket(
  payload: AudioPayload,
  releaseTime: number
): HeldPacket {
  return { payload: { ...payload }, releaseTime };
}

/**
 * Create a typed scale intervals array
 */
export function createTypedScale(scale: readonly number[]): ScaleIntervals {
  return [...scale] as ScaleIntervals;
}

// ============================================================================
// SAFE CASTING UTILITIES
// ============================================================================

/**
 * Safely cast a generic GraphNode to a specific type
 * This is used when you know the type at runtime but TypeScript doesn't
 */
export function castNodeType<T extends NodeType>(
  node: GraphNode,
  expectedType: T
): GraphNode<T> | null {
  if (node.type !== expectedType) {
    return null;
  }
  // Safe cast because we've verified the type
  return node as unknown as GraphNode<T>;
}

/**
 * Clone a node with proper typing
 */
export function cloneNode<T extends NodeType>(
  node: GraphNode<T>,
  newId?: NodeId,
  newX?: number,
  newY?: number
): GraphNode<T> {
  return {
    id: newId ?? node.id,
    type: node.type,
    x: newX ?? node.x,
    y: newY ?? node.y,
    props: JSON.parse(JSON.stringify(node.props)) as PropsForNodeType<T>,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [],
  };
}

/**
 * Update node props with partial update, maintaining type safety
 */
export function updateNodeProps<T extends NodeType>(
  node: GraphNode<T>,
  propsUpdate: Partial<PropsForNodeType<T>>
): GraphNode<T> {
  return {
    ...node,
    props: { ...node.props, ...propsUpdate } as unknown as PropsForNodeType<T>,
  };
}
