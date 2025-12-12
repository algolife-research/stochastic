// Stochastic v2 - Canvas Data Validator
// Validates graph data before rendering to prevent canvas errors

import type { GraphNode, GraphEdge, Packet, ViewportState } from '@core/types';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Check if a number is valid (not NaN, not Infinity)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Sanitize a number, returning a fallback if invalid
 */
export function sanitizeNumber(value: unknown, fallback: number): number {
  if (isValidNumber(value)) {
    return value;
  }
  console.warn(`Invalid number detected: ${value}, using fallback: ${fallback}`);
  return fallback;
}

/**
 * Clamp a number between min and max, with validation
 */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = sanitizeNumber(value, fallback);
  return Math.max(min, Math.min(max, num));
}

// ============================================================================
// NODE VALIDATION
// ============================================================================

export interface ValidatedNode extends GraphNode {
  __validated: true;
}

/**
 * Validate node position and properties for canvas rendering
 */
export function validateNode(node: GraphNode): ValidatedNode | null {
  if (!node || !node.id) {
    console.warn('Invalid node: missing id');
    return null;
  }

  // Validate position coordinates
  if (!isValidNumber(node.x) || !isValidNumber(node.y)) {
    console.warn(`Node ${node.id} has invalid position: (${node.x}, ${node.y})`);
    return null;
  }

  // Validate flash value (should be 0-1)
  const flash = clampNumber(node.flash, 0, 1, 0);

  // Validate timer
  const timer = sanitizeNumber(node.timer, 0);

  return {
    ...node,
    x: node.x,
    y: node.y,
    flash,
    timer,
    __validated: true,
  } as ValidatedNode;
}

/**
 * Check if a node is valid for rendering (quick check)
 */
export function isNodeValid(node: GraphNode | undefined | null): node is GraphNode {
  if (!node) return false;
  return isValidNumber(node.x) && isValidNumber(node.y);
}

// ============================================================================
// EDGE VALIDATION
// ============================================================================

/**
 * Validate edge for canvas rendering
 */
export function validateEdge(
  edge: GraphEdge, 
  nodes: Map<string, GraphNode>
): { edge: GraphEdge; fromNode: GraphNode; toNode: GraphNode } | null {
  if (!edge || !edge.id) {
    return null;
  }

  const fromNode = nodes.get(edge.from);
  const toNode = nodes.get(edge.to);

  if (!fromNode || !toNode) {
    return null;
  }

  if (!isNodeValid(fromNode) || !isNodeValid(toNode)) {
    console.warn(`Edge ${edge.id} has invalid endpoint nodes`);
    return null;
  }

  // Validate durationBeats if present
  if (edge.durationBeats !== null && !isValidNumber(edge.durationBeats)) {
    console.warn(`Edge ${edge.id} has invalid durationBeats: ${edge.durationBeats}`);
  }

  return { edge, fromNode, toNode };
}

// ============================================================================
// PACKET VALIDATION
// ============================================================================

/**
 * Validate packet for canvas rendering
 */
export function validatePacket(
  packet: Packet,
  edges: Map<string, GraphEdge>,
  nodes: Map<string, GraphNode>
): { packet: Packet; edge: GraphEdge; fromNode: GraphNode; toNode: GraphNode } | null {
  if (!packet || !packet.id) {
    return null;
  }

  // Validate t parameter (progress along edge)
  if (!isValidNumber(packet.t)) {
    console.warn(`Packet ${packet.id} has invalid t: ${packet.t}`);
    return null;
  }

  // Clamp t to valid range
  if (packet.t < 0 || packet.t > 1) {
    console.warn(`Packet ${packet.id} has out-of-range t: ${packet.t}`);
  }

  const edge = edges.get(packet.edgeId);
  if (!edge) {
    return null;
  }

  const fromNode = nodes.get(edge.from);
  const toNode = nodes.get(edge.to);

  if (!fromNode || !toNode) {
    return null;
  }

  if (!isNodeValid(fromNode) || !isNodeValid(toNode)) {
    return null;
  }

  return { packet, edge, fromNode, toNode };
}

// ============================================================================
// VIEWPORT VALIDATION
// ============================================================================

/**
 * Validate viewport state
 */
export function validateViewport(viewport: ViewportState): ViewportState {
  return {
    panOffset: {
      x: sanitizeNumber(viewport.panOffset?.x, 0),
      y: sanitizeNumber(viewport.panOffset?.y, 0),
    },
    zoomLevel: clampNumber(viewport.zoomLevel, 0.1, 10, 1),
    isPanning: Boolean(viewport.isPanning),
  };
}

// ============================================================================
// BEZIER CURVE VALIDATION
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

/**
 * Validate a point for Bezier calculations
 */
export function validatePoint(point: Point | null | undefined): Point | null {
  if (!point) return null;
  if (!isValidNumber(point.x) || !isValidNumber(point.y)) {
    return null;
  }
  return point;
}

/**
 * Validate Bezier control points
 */
export function validateBezierPoints(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): boolean {
  return (
    validatePoint(p0) !== null &&
    validatePoint(p1) !== null &&
    validatePoint(p2) !== null &&
    validatePoint(p3) !== null
  );
}

// ============================================================================
// COLOR VALIDATION
// ============================================================================

/**
 * Validate and sanitize hex color
 */
export function validateHexColor(color: string | undefined | null, fallback: string): string {
  if (!color || typeof color !== 'string') {
    return fallback;
  }
  
  // Check for valid hex color format
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }
  
  console.warn(`Invalid hex color: ${color}, using fallback: ${fallback}`);
  return fallback;
}

// ============================================================================
// CANVAS CONTEXT VALIDATION
// ============================================================================

/**
 * Check if canvas context is valid and ready for drawing
 */
export function isContextValid(ctx: CanvasRenderingContext2D | null | undefined): ctx is CanvasRenderingContext2D {
  return ctx !== null && ctx !== undefined;
}

/**
 * Safe canvas operation wrapper - catches and logs errors
 */
export function safeCanvasOp<T>(
  operation: () => T,
  fallback: T,
  errorMessage: string
): T {
  try {
    return operation();
  } catch (error) {
    console.warn(errorMessage, error);
    return fallback;
  }
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate all nodes for rendering
 */
export function validateNodes(nodes: Map<string, GraphNode>): Map<string, GraphNode> {
  const validNodes = new Map<string, GraphNode>();
  
  nodes.forEach((node, id) => {
    if (isNodeValid(node)) {
      validNodes.set(id, node);
    }
  });
  
  return validNodes;
}

/**
 * Filter out invalid packets
 */
export function filterValidPackets(
  packets: Map<string, Packet>,
  edges: Map<string, GraphEdge>,
  nodes: Map<string, GraphNode>
): Packet[] {
  const validPackets: Packet[] = [];
  
  packets.forEach(packet => {
    const validated = validatePacket(packet, edges, nodes);
    if (validated) {
      validPackets.push(packet);
    }
  });
  
  return validPackets;
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

/**
 * Safe division to prevent NaN/Infinity
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (!isValidNumber(numerator) || !isValidNumber(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return isValidNumber(result) ? result : fallback;
}

/**
 * Safe square root
 */
export function safeSqrt(value: number, fallback: number = 0): number {
  if (!isValidNumber(value) || value < 0) {
    return fallback;
  }
  return Math.sqrt(value);
}

/**
 * Calculate safe distance between two points
 */
export function safeDistance(p1: Point, p2: Point): number {
  if (!validatePoint(p1) || !validatePoint(p2)) {
    return 0;
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return safeSqrt(dx * dx + dy * dy, 0);
}
