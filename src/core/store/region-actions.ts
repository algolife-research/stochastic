// Region Actions
// Operations for creating, updating, and deleting regions

import type { GraphStore, ImmerSet } from './types';
import type { 
  RegionId, NodeId, Region, GraphNode, GraphEdge, Annotation
} from '../types';
import { createRegionId, createNodeId, createEdgeId, createAnnotationId } from '../types';
import { cloneNode } from '../type-guards';
import { MIN_REGION_SIZE } from '../constants';

export const createRegionActions = (
  set: ImmerSet,
  get: () => GraphStore
) => ({
  addRegion: (x: number, y: number, width: number, height: number, name: string = 'Region'): RegionId | null => {
    const state = get();
    
    // Check for overlap
    const newRegion = { x, y, width: Math.max(MIN_REGION_SIZE, width), height: Math.max(MIN_REGION_SIZE, height) };
    let overlaps = false;
    state.regions.forEach(region => {
      const noOverlap = 
        newRegion.x + newRegion.width <= region.x ||
        region.x + region.width <= newRegion.x ||
        newRegion.y + newRegion.height <= region.y ||
        region.y + region.height <= newRegion.y;
      if (!noOverlap) overlaps = true;
    });
    
    if (overlaps) return null;
    
    const id = createRegionId();
    const region: Region = {
      id,
      x: newRegion.x,
      y: newRegion.y,
      width: newRegion.width,
      height: newRegion.height,
      name,
      description: '',
      color: 'rgba(60, 60, 80, 0.3)',
    };
    
    set(s => {
      s.regions.set(id, region);
      s.isDirty = true;
    });
    
    return id;
  },
  
  updateRegion: (id: RegionId, updates: Partial<Region>): void => {
    set(state => {
      const region = state.regions.get(id);
      if (region) {
        Object.assign(region, updates);
        state.isDirty = true;
      }
    });
  },
  
  deleteRegion: (id: RegionId): void => {
    set(state => {
      state.regions.delete(id);
      if (state.selection.selectedRegionId === id) {
        state.selection.selectedRegionId = null;
      }
      state.isDirty = true;
    });
  },
  
  duplicateRegion: (id: RegionId): RegionId | null => {
    const state = get();
    const region = state.regions.get(id);
    if (!region) return null;
    
    const contents = state.getRegionContents(id);
    
    let offsetX = region.width + 40;
    let offsetY = 0;
    
    const testRegion = {
      x: region.x + offsetX,
      y: region.y + offsetY,
      width: region.width,
      height: region.height,
    };
    
    // Check overlap
    let overlaps = false;
    state.regions.forEach(r => {
      if (r.id === id) return;
      const noOverlap = 
        testRegion.x + testRegion.width <= r.x ||
        r.x + r.width <= testRegion.x ||
        testRegion.y + testRegion.height <= r.y ||
        r.y + r.height <= testRegion.y;
      if (!noOverlap) overlaps = true;
    });
    
    if (overlaps) {
      offsetX = 0;
      offsetY = region.height + 40;
      testRegion.x = region.x + offsetX;
      testRegion.y = region.y + offsetY;
      
      overlaps = false;
      state.regions.forEach(r => {
        if (r.id === id) return;
        const noOverlap = 
          testRegion.x + testRegion.width <= r.x ||
          r.x + r.width <= testRegion.x ||
          testRegion.y + testRegion.height <= r.y ||
          r.y + r.height <= testRegion.y;
        if (!noOverlap) overlaps = true;
      });
      
      if (overlaps) return null;
    }
    
    const newId = createRegionId();
    const newRegion: Region = {
      id: newId,
      x: testRegion.x,
      y: testRegion.y,
      width: region.width,
      height: region.height,
      name: region.name + ' (copy)',
      description: region.description,
      color: region.color,
    };
    
    const nodeIdMap = new Map<NodeId, NodeId>();
    
    set(s => {
      s.regions.set(newId, newRegion);
      
      // Duplicate nodes
      contents.nodes.forEach(node => {
        const newNodeId = createNodeId();
        nodeIdMap.set(node.id, newNodeId);
        const newNode = cloneNode(node, newNodeId, node.x + offsetX, node.y + offsetY);
        s.nodes.set(newNodeId, newNode);
      });
      
      // Duplicate edges
      contents.edges.forEach(edge => {
        const newFrom = nodeIdMap.get(edge.from);
        const newTo = nodeIdMap.get(edge.to);
        if (newFrom && newTo) {
          const newEdgeId = createEdgeId();
          const newEdge: GraphEdge = {
            id: newEdgeId,
            from: newFrom,
            to: newTo,
            timingMode: edge.timingMode,
            durationBeats: edge.durationBeats,
            targetParam: edge.targetParam,
          };
          s.edges.set(newEdgeId, newEdge);
        }
      });
      
      // Duplicate annotations
      contents.annotations.forEach(ann => {
        const newAnnId = createAnnotationId();
        const newAnn: Annotation = {
          id: newAnnId,
          x: ann.x + offsetX,
          y: ann.y + offsetY,
          text: ann.text,
          fontSize: ann.fontSize,
          color: ann.color,
        };
        s.annotations.set(newAnnId, newAnn);
      });
      
      s.isDirty = true;
    });
    
    return newId;
  },
  
  getRegionContents: (id: RegionId): { nodes: GraphNode[]; edges: GraphEdge[]; annotations: Annotation[] } => {
    const state = get();
    const region = state.regions.get(id);
    if (!region) return { nodes: [], edges: [], annotations: [] };
    
    const nodes: GraphNode[] = [];
    state.nodes.forEach(node => {
      if (node.x >= region.x && node.x <= region.x + region.width &&
          node.y >= region.y && node.y <= region.y + region.height) {
        nodes.push(node);
      }
    });
    
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: GraphEdge[] = [];
    state.edges.forEach(edge => {
      if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
        edges.push(edge);
      }
    });
    
    const annotations: Annotation[] = [];
    state.annotations.forEach(ann => {
      if (ann.x >= region.x && ann.x <= region.x + region.width &&
          ann.y >= region.y && ann.y <= region.y + region.height) {
        annotations.push(ann);
      }
    });
    
    return { nodes, edges, annotations };
  },
});
