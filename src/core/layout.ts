// Stochastic v2 - Auto Layout Algorithm
// Force-directed and hierarchical layout for graph nodes

import type { GraphNode, GraphEdge, NodeId } from './types';

// ============================================================================
// TYPES
// ============================================================================

export type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular';

export interface LayoutOptions {
  algorithm: LayoutAlgorithm;
  spacing?: number;        // Base spacing between nodes
  iterations?: number;     // For force-directed
  centerX?: number;        // Center of layout
  centerY?: number;
}

interface NodePosition {
  id: NodeId;
  x: number;
  y: number;
  vx: number;  // velocity for force simulation
  vy: number;
}

interface ConnectedComponent {
  nodeIds: Set<string>;
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}

// ============================================================================
// CONNECTED COMPONENTS DETECTION
// ============================================================================

/**
 * Find all connected components in the graph using Union-Find
 */
function findConnectedComponents(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>
): ConnectedComponent[] {
  if (nodes.size === 0) return [];
  
  // Build adjacency list (undirected)
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((_, id) => adjacency.set(id, new Set()));
  
  edges.forEach(edge => {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  });
  
  // BFS to find components
  const visited = new Set<string>();
  const components: ConnectedComponent[] = [];
  
  nodes.forEach((_, startId) => {
    if (visited.has(startId)) return;
    
    // BFS from this node
    const componentNodeIds = new Set<string>();
    const queue = [startId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      componentNodeIds.add(nodeId);
      
      // Add neighbors to queue
      const neighbors = adjacency.get(nodeId);
      if (neighbors) {
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        });
      }
    }
    
    // Build component's nodes and edges
    const componentNodes = new Map<string, GraphNode>();
    const componentEdges = new Map<string, GraphEdge>();
    
    componentNodeIds.forEach(id => {
      const node = nodes.get(id);
      if (node) componentNodes.set(id, node);
    });
    
    edges.forEach((edge, edgeId) => {
      if (componentNodeIds.has(edge.from) && componentNodeIds.has(edge.to)) {
        componentEdges.set(edgeId, edge);
      }
    });
    
    components.push({
      nodeIds: componentNodeIds,
      nodes: componentNodes,
      edges: componentEdges,
    });
  });
  
  return components;
}

/**
 * Calculate bounding box of positions
 */
function getBoundingBox(positions: Map<NodeId, { x: number; y: number }>): {
  minX: number; minY: number; maxX: number; maxY: number; width: number; height: number;
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  positions.forEach(pos => {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  });
  
  // Add node size padding (assume 60px nodes)
  const padding = 40;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Offset all positions by a delta
 */
function offsetPositions(
  positions: Map<NodeId, { x: number; y: number }>,
  dx: number,
  dy: number
): void {
  positions.forEach(pos => {
    pos.x += dx;
    pos.y += dy;
  });
}

// ============================================================================
// FORCE-DIRECTED LAYOUT
// ============================================================================

/**
 * Apply force-directed layout to nodes
 */
function forceDirectedLayout(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
  options: LayoutOptions
): Map<NodeId, { x: number; y: number }> {
  const spacing = options.spacing ?? 180;
  const iterations = options.iterations ?? 100;
  const centerX = options.centerX ?? 600;
  const centerY = options.centerY ?? 400;
  
  // Initialize positions with some randomization around current positions
  const positions: Map<NodeId, NodePosition> = new Map();
  
  nodes.forEach((node, id) => {
    positions.set(id as NodeId, {
      id: id as NodeId,
      x: node.x + (Math.random() - 0.5) * 50,
      y: node.y + (Math.random() - 0.5) * 50,
      vx: 0,
      vy: 0,
    });
  });
  
  // Build adjacency for quick lookup
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((_, id) => adjacency.set(id, new Set()));
  
  edges.forEach(edge => {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  });
  
  // Simulation parameters
  const repulsionStrength = spacing * spacing * 50;
  const attractionStrength = 0.05;
  const damping = 0.9;
  const minDistance = 50;
  
  // Run simulation
  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations; // Cooling
    
    // Calculate forces
    const nodeList = Array.from(positions.values());
    
    // Repulsion between all nodes
    for (let a = 0; a < nodeList.length; a++) {
      for (let b = a + 1; b < nodeList.length; b++) {
        const nodeA = nodeList[a]!;
        const nodeB = nodeList[b]!;
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), minDistance);
        
        const force = (repulsionStrength / (dist * dist)) * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }
    
    // Attraction along edges
    edges.forEach(edge => {
      const nodeA = positions.get(edge.from as NodeId);
      const nodeB = positions.get(edge.to as NodeId);
      
      if (nodeA && nodeB) {
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const force = dist * attractionStrength * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        nodeA.vx += fx;
        nodeA.vy += fy;
        nodeB.vx -= fx;
        nodeB.vy -= fy;
      }
    });
    
    // Center gravity
    nodeList.forEach(node => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx += dx * 0.01 * alpha;
      node.vy += dy * 0.01 * alpha;
    });
    
    // Apply velocities
    nodeList.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= damping;
      node.vy *= damping;
    });
  }
  
  // Return final positions
  const result = new Map<NodeId, { x: number; y: number }>();
  positions.forEach((pos, id) => {
    result.set(id, { x: Math.round(pos.x), y: Math.round(pos.y) });
  });
  
  return result;
}

// ============================================================================
// HIERARCHICAL LAYOUT
// ============================================================================

/**
 * Apply hierarchical layout (left to right, source to speaker)
 */
function hierarchicalLayout(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
  options: LayoutOptions
): Map<NodeId, { x: number; y: number }> {
  const spacing = options.spacing ?? 180;
  const centerX = options.centerX ?? 200;
  const centerY = options.centerY ?? 400;
  
  // Find node depths (distance from sources)
  const depths = new Map<string, number>();
  const incoming = new Map<string, number>();
  
  // Count incoming edges for each node
  nodes.forEach((_, id) => incoming.set(id, 0));
  edges.forEach(edge => {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
  });
  
  // Find root nodes (sources or nodes with no incoming edges)
  const roots: string[] = [];
  nodes.forEach((node, id) => {
    if (node.type === 'source' || incoming.get(id) === 0) {
      roots.push(id);
      depths.set(id, 0);
    }
  });
  
  // BFS to assign depths
  const queue = [...roots];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentDepth = depths.get(nodeId) ?? 0;
    
    edges.forEach(edge => {
      if (edge.from === nodeId) {
        const existingDepth = depths.get(edge.to);
        if (existingDepth === undefined || existingDepth < currentDepth + 1) {
          depths.set(edge.to, currentDepth + 1);
          queue.push(edge.to);
        }
      }
    });
  }
  
  // Handle disconnected nodes
  nodes.forEach((_, id) => {
    if (!depths.has(id)) {
      depths.set(id, 0);
    }
  });
  
  // Group by depth
  const layers = new Map<number, string[]>();
  depths.forEach((depth, id) => {
    if (!layers.has(depth)) {
      layers.set(depth, []);
    }
    layers.get(depth)!.push(id);
  });
  
  // Position nodes
  const result = new Map<NodeId, { x: number; y: number }>();
  
  layers.forEach((nodeIds, depth) => {
    const x = centerX + depth * spacing;
    const layerHeight = nodeIds.length * spacing * 0.8;
    const startY = centerY - layerHeight / 2;
    
    nodeIds.forEach((id, index) => {
      result.set(id as NodeId, {
        x: Math.round(x),
        y: Math.round(startY + index * spacing * 0.8),
      });
    });
  });
  
  return result;
}

// ============================================================================
// CIRCULAR LAYOUT
// ============================================================================

/**
 * Apply circular layout
 */
function circularLayout(
  nodes: Map<string, GraphNode>,
  _edges: Map<string, GraphEdge>,
  options: LayoutOptions
): Map<NodeId, { x: number; y: number }> {
  const spacing = options.spacing ?? 180;
  const centerX = options.centerX ?? 600;
  const centerY = options.centerY ?? 400;
  
  const nodeList = Array.from(nodes.keys());
  const nodeCount = nodeList.length;
  
  if (nodeCount === 0) {
    return new Map();
  }
  
  // Calculate radius based on spacing and node count
  const circumference = nodeCount * spacing;
  const radius = Math.max(circumference / (2 * Math.PI), spacing);
  
  const result = new Map<NodeId, { x: number; y: number }>();
  
  nodeList.forEach((id, index) => {
    const angle = (index / nodeCount) * 2 * Math.PI - Math.PI / 2;
    result.set(id as NodeId, {
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius),
    });
  });
  
  return result;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Layout a single component using the specified algorithm
 */
function layoutComponent(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
  options: LayoutOptions
): Map<NodeId, { x: number; y: number }> {
  switch (options.algorithm) {
    case 'force':
      return forceDirectedLayout(nodes, edges, options);
    case 'circular':
      return circularLayout(nodes, edges, options);
    case 'hierarchical':
    default:
      return hierarchicalLayout(nodes, edges, options);
  }
}

/**
 * Calculate new positions for all nodes using the specified algorithm
 * Handles disconnected subgraphs separately and arranges them vertically
 */
export function calculateLayout(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
  options: LayoutOptions = { algorithm: 'hierarchical' }
): Map<NodeId, { x: number; y: number }> {
  if (nodes.size === 0) {
    return new Map();
  }
  
  // Find connected components
  const components = findConnectedComponents(nodes, edges);
  
  if (components.length === 0) {
    return new Map();
  }
  
  // If only one component, just layout normally
  if (components.length === 1) {
    return layoutComponent(nodes, edges, options);
  }
  
  // Layout each component separately, then arrange them vertically
  const spacing = options.spacing ?? 180;
  const centerX = options.centerX ?? 200;
  const centerY = options.centerY ?? 100;
  const componentGap = spacing * 1.2; // Gap between components
  
  const result = new Map<NodeId, { x: number; y: number }>();
  const componentLayouts: { positions: Map<NodeId, { x: number; y: number }>; bbox: ReturnType<typeof getBoundingBox> }[] = [];
  
  // Sort components by size (largest first) for better visual arrangement
  components.sort((a, b) => b.nodeIds.size - a.nodeIds.size);
  
  // Layout each component at origin
  for (const component of components) {
    const componentOptions = {
      ...options,
      centerX: 0,
      centerY: 0,
    };
    
    const positions = layoutComponent(component.nodes, component.edges, componentOptions);
    const bbox = getBoundingBox(positions);
    
    // Normalize positions so min is at 0,0
    offsetPositions(positions, -bbox.minX, -bbox.minY);
    
    componentLayouts.push({
      positions,
      bbox: {
        ...bbox,
        minX: 0,
        minY: 0,
        maxX: bbox.width,
        maxY: bbox.height,
      },
    });
  }
  
  // Arrange components vertically (stacked top to bottom)
  let currentY = centerY;
  
  for (const layout of componentLayouts) {
    // Center horizontally
    const xOffset = centerX;
    
    // Copy positions with offset
    layout.positions.forEach((pos, id) => {
      result.set(id, {
        x: Math.round(xOffset + pos.x),
        y: Math.round(currentY + pos.y),
      });
    });
    
    // Move Y down for next component
    currentY += layout.bbox.height + componentGap;
  }
  
  return result;
}

/**
 * Apply layout to store
 */
export function applyLayout(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
  updateNode: (id: NodeId, updates: Partial<GraphNode>) => void,
  options: LayoutOptions = { algorithm: 'hierarchical' }
): void {
  const positions = calculateLayout(nodes, edges, options);
  
  positions.forEach((pos, id) => {
    updateNode(id, { x: pos.x, y: pos.y });
  });
}
