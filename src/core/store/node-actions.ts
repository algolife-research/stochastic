// Node Actions
// Operations for creating, updating, and deleting nodes

import type { GraphStore, ImmerSet } from './types';
import type {
  NodeId, EdgeId, GraphNode, NodeType, AudioPayload, PropsForNodeType
} from '../types';
import { createNodeId, createEdgeId } from '../types';
import { getDefaultProps } from '../constants';
import { createTypedNode, createTypedEdge, createTypedHeldPacket, cloneNode } from '../type-guards';

export const createNodeActions = (
  set: ImmerSet,
  get: () => GraphStore
) => ({
  addNode: (type: NodeType, x: number, y: number): NodeId => {
    const id = createNodeId();
    const props = getDefaultProps(type);
    
    // Special handling for teleporter channel assignment
    let finalProps = props;
    if (type === 'teleporter') {
      const existingChannels = new Set<string>();
      get().nodes.forEach(n => {
        if (n.type === 'teleporter') {
          existingChannels.add((n.props as { channel: string }).channel);
        }
      });
      
      const channelLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let channel = 'A';
      for (let i = 0; i < channelLetters.length; i++) {
        if (!existingChannels.has(channelLetters[i]!)) {
          channel = channelLetters[i]!;
          break;
        }
      }
      finalProps = { ...props, channel, isEntry: true };
    }
    
    const node = createTypedNode(type, id, x, y, finalProps);
    
    set(state => {
      state.nodes.set(id, node);
      state.isDirty = true;
    });
    
    return id;
  },
  
  updateNode: <T extends NodeType>(id: NodeId, updates: Partial<GraphNode<T>>): void => {
    set(state => {
      const node = state.nodes.get(id);
      if (node) {
        Object.assign(node, updates);
        state.isDirty = true;
      }
    });
  },
  
  updateNodeProps: (id: NodeId, props: Record<string, unknown>): void => {
    set(state => {
      const node = state.nodes.get(id);
      if (node) {
        const newNode: GraphNode = {
          ...node,
          props: {
            ...node.props,
            ...props,
          },
        };
        state.nodes.set(id, newNode);
        state.isDirty = true;
      }
    });
  },
  
  // Hot path: LFOs/CV write modulated props every frame. One store update per
  // frame, and deliberately NOT marking the project dirty — modulation is
  // runtime state, not an edit.
  batchMergeNodeProps: (entries: Array<[NodeId, Record<string, unknown>]>): void => {
    if (entries.length === 0) return;
    set(state => {
      for (const [id, props] of entries) {
        const node = state.nodes.get(id);
        if (node) {
          node.props = { ...node.props, ...props };
        }
      }
    });
  },

  // Hot path: per-frame visual flash decay for all nodes in one update.
  decayNodeFlashes: (deltaTime: number): void => {
    set(state => {
      state.nodes.forEach(node => {
        if (node.flash > 0) {
          const newFlash = node.flash * Math.pow(0.1, deltaTime * 5);
          node.flash = newFlash < 0.01 ? 0 : newFlash;
        }
      });
    });
  },

  deleteNode: (id: NodeId): void => {
    set(state => {
      // Delete connected edges
      state.edges.forEach((edge, edgeId) => {
        if (edge.from === id || edge.to === id) {
          // Delete packets on this edge
          state.packets.forEach((packet, packetId) => {
            if (packet.edgeId === edgeId) {
              state.packets.delete(packetId);
            }
          });
          state.edges.delete(edgeId);
        }
      });
      
      // Delete node
      state.nodes.delete(id);
      
      // Clear selection if needed
      state.selection.selectedNodeIds = state.selection.selectedNodeIds.filter(nid => nid !== id);
      if (state.selection.hoveredNodeId === id) state.selection.hoveredNodeId = null;
      if (state.selection.draggingNodeId === id) state.selection.draggingNodeId = null;
      if (state.selection.linkingFromId === id) state.selection.linkingFromId = null;
      
      state.isDirty = true;
    });
  },
  
  moveNode: (id: NodeId, x: number, y: number): void => {
    set(state => {
      const node = state.nodes.get(id);
      if (node) {
        node.x = x;
        node.y = y;
      }
    });
  },
  
  flashNode: (id: NodeId): void => {
    set(state => {
      const node = state.nodes.get(id);
      if (node) {
        node.flash = 1.0;
      }
    });
  },
  
  holdPacketAtNode: (id: NodeId, payload: AudioPayload, delayBeats: number): void => {
    const bpm = get().masterSpeed;
    const delayMs = (delayBeats * 60 / bpm) * 1000;
    const releaseTime = performance.now() + delayMs;
    
    set(state => {
      const node = state.nodes.get(id);
      if (node) {
        node.heldPackets.push(createTypedHeldPacket(payload, releaseTime));
      }
    });
  },
  
  releaseHeldPackets: (id: NodeId, indices: number[]): void => {
    set(state => {
      const node = state.nodes.get(id);
      if (node) {
        const sortedIndices = [...indices].sort((a, b) => b - a);
        sortedIndices.forEach(index => {
          node.heldPackets.splice(index, 1);
        });
      }
    });
  },
  
  duplicateNode: (id: NodeId): NodeId | null => {
    const state = get();
    const node = state.nodes.get(id);
    if (!node) return null;
    
    const newId = createNodeId();
    const newNode = cloneNode(node, newId, node.x + 50, node.y + 50);
    
    set(s => {
      s.nodes.set(newId, newNode);
      s.isDirty = true;
    });
    
    return newId;
  },
  
  duplicateSelectedNodes: (): void => {
    const state = get();
    const selectedIds = state.selection.selectedNodeIds;
    if (selectedIds.length === 0) return;
    
    const nodeIdMap = new Map<NodeId, NodeId>();
    const newNodeIds: NodeId[] = [];
    
    // First pass: duplicate nodes
    selectedIds.forEach(id => {
      const node = state.nodes.get(id);
      if (!node) return;
      
      const newId = createNodeId();
      nodeIdMap.set(id, newId);
      newNodeIds.push(newId);
      
      const newNode = cloneNode(node, newId, node.x + 50, node.y + 50);
      
      set(s => {
        s.nodes.set(newId, newNode);
      });
    });
    
    // Second pass: duplicate edges between selected nodes
    state.edges.forEach(edge => {
      const newFrom = nodeIdMap.get(edge.from);
      const newTo = nodeIdMap.get(edge.to);
      if (newFrom && newTo) {
        const newEdgeId = createEdgeId();
        const newEdge = createTypedEdge(
          newEdgeId,
          newFrom,
          newTo,
          edge.timingMode,
          edge.durationBeats,
          edge.targetParam
        );
        set(s => {
          s.edges.set(newEdgeId, newEdge);
        });
      }
    });
    
    // Select new nodes
    set(s => {
      s.selection.selectedNodeIds = newNodeIds;
      s.isDirty = true;
    });
  },
  
  copySelectedNodes: (): void => {
    const state = get();
    const selectedIds = state.selection.selectedNodeIds;
    if (selectedIds.length === 0) return;
    
    let sumX = 0, sumY = 0, count = 0;
    const selectedNodes: GraphNode[] = [];
    
    selectedIds.forEach(id => {
      const node = state.nodes.get(id);
      if (node) {
        selectedNodes.push(node);
        sumX += node.x;
        sumY += node.y;
        count++;
      }
    });
    
    if (count === 0) return;
    const centerX = sumX / count;
    const centerY = sumY / count;
    
    const nodeIndexMap = new Map<NodeId, number>();
    const clipboardNodes: { type: NodeType; relX: number; relY: number; props: Record<string, unknown> }[] = [];
    
    selectedNodes.forEach((node, index) => {
      nodeIndexMap.set(node.id, index);
      clipboardNodes.push({
        type: node.type,
        relX: node.x - centerX,
        relY: node.y - centerY,
        props: JSON.parse(JSON.stringify(node.props)),
      });
    });
    
    const clipboardEdges: { fromIndex: number; toIndex: number; timingMode: 'physical' | 'fixed'; durationBeats: number | null; targetParam: string | null }[] = [];
    state.edges.forEach(edge => {
      const fromIndex = nodeIndexMap.get(edge.from);
      const toIndex = nodeIndexMap.get(edge.to);
      if (fromIndex !== undefined && toIndex !== undefined) {
        clipboardEdges.push({
          fromIndex,
          toIndex,
          timingMode: edge.timingMode,
          durationBeats: edge.durationBeats,
          targetParam: edge.targetParam,
        });
      }
    });
    
    set(s => {
      s.clipboard = { nodes: clipboardNodes, edges: clipboardEdges };
    });
  },
  
  pasteNodes: (): void => {
    const state = get();
    if (!state.clipboard || state.clipboard.nodes.length === 0) return;
    
    const pasteX = state.mouse.worldX || 100;
    const pasteY = state.mouse.worldY || 100;
    
    const newNodeIds: NodeId[] = [];
    
    state.clipboard.nodes.forEach(clipNode => {
      const newId = createNodeId();
      newNodeIds.push(newId);
      
      // Use JSON for deep copy to maintain type compatibility. Clipboard props
      // are stored untyped; they originated from a node of the same type.
      const newNode = createTypedNode(
        clipNode.type,
        newId,
        pasteX + clipNode.relX,
        pasteY + clipNode.relY,
        JSON.parse(JSON.stringify(clipNode.props)) as PropsForNodeType<typeof clipNode.type>
      );
      
      set(s => {
        s.nodes.set(newId, newNode);
      });
    });
    
    state.clipboard.edges.forEach(clipEdge => {
      const fromId = newNodeIds[clipEdge.fromIndex];
      const toId = newNodeIds[clipEdge.toIndex];
      if (fromId && toId) {
        const newEdgeId = createEdgeId();
        const newEdge = createTypedEdge(
          newEdgeId,
          fromId,
          toId,
          clipEdge.timingMode,
          clipEdge.durationBeats,
          clipEdge.targetParam
        );
        set(s => {
          s.edges.set(newEdgeId, newEdge);
        });
      }
    });
    
    set(s => {
      s.selection.selectedNodeIds = newNodeIds;
      s.isDirty = true;
    });
  },
  
  groupSelectedNodes: (): NodeId | null => {
    const state = get();
    const selectedIds = state.selection.selectedNodeIds;
    if (selectedIds.length === 0) return null;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    const selectedNodes: GraphNode[] = [];
    
    selectedIds.forEach(id => {
      const node = state.nodes.get(id);
      if (node && node.type !== 'source' && node.type !== 'tunnel') {
        selectedNodes.push(node);
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x);
        maxY = Math.max(maxY, node.y);
      }
    });
    
    if (selectedNodes.length === 0) return null;
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const tunnelId = createNodeId();
    const validNodeIds = new Set(selectedNodes.map(n => n.id));
    
    const subNodes = selectedNodes.map(n => ({
      type: n.type as Exclude<NodeType, 'tunnel' | 'source'>,
      props: JSON.parse(JSON.stringify(n.props)),
    }));
    
    set(s => {
      // Rewire edges that cross the group boundary
      const edgesToDelete: EdgeId[] = [];
      const edgesToUpdate: { id: EdgeId; from: NodeId; to: NodeId }[] = [];
      
      s.edges.forEach((edge, edgeId) => {
        const fromInside = validNodeIds.has(edge.from);
        const toInside = validNodeIds.has(edge.to);
        
        if (fromInside && !toInside) {
          edgesToUpdate.push({ id: edgeId, from: tunnelId, to: edge.to });
        } else if (!fromInside && toInside) {
          edgesToUpdate.push({ id: edgeId, from: edge.from, to: tunnelId });
        } else if (fromInside && toInside) {
          edgesToDelete.push(edgeId);
        }
      });
      
      // Apply edge updates
      edgesToUpdate.forEach(({ id, from, to }) => {
        const edge = s.edges.get(id);
        if (edge) {
          s.edges.set(id, { ...edge, from, to });
        }
      });
      
      // Delete internal edges
      edgesToDelete.forEach(id => s.edges.delete(id));
      
      // Remove duplicate edges
      const seenEdges = new Set<string>();
      const duplicates: EdgeId[] = [];
      s.edges.forEach((edge, edgeId) => {
        const key = `${edge.from}-${edge.to}`;
        if (seenEdges.has(key)) {
          duplicates.push(edgeId);
        } else {
          seenEdges.add(key);
        }
      });
      duplicates.forEach(id => s.edges.delete(id));
      
      // Delete grouped nodes
      validNodeIds.forEach(id => {
        s.nodes.delete(id);
      });
      
      // Create tunnel
      const tunnelNode = createTypedNode(
        'tunnel',
        tunnelId,
        centerX,
        centerY,
        {
          tunnelName: 'Custom',
          subNodes,
        }
      );
      
      // Widen type for Map insertion
      s.nodes.set(tunnelId, tunnelNode as GraphNode);
      s.selection.selectedNodeIds = [tunnelId];
      s.isDirty = true;
    });
    
    return tunnelId;
  },
});
