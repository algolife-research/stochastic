// Store Getters
// Functions to retrieve data from the store without React re-renders

import type { GraphStore } from './types';
import type { 
  NodeId, EdgeId, AnnotationId, RegionId, SceneId,
  GraphNode, GraphEdge, Packet, Annotation, Region, Scene, ArrangementSlot,
  ScaleName
} from '../types';

// Store reference for direct access
let storeRef: { getState: () => GraphStore } | null = null;

/** Set the store reference for direct access */
export function setStoreRef(store: { getState: () => GraphStore }) {
  storeRef = store;
}

/** Get store state directly (bypasses React) */
export function getGraphStore(): GraphStore {
  if (!storeRef) {
    throw new Error('Store not initialized');
  }
  return storeRef.getState();
}

/** Create getter functions for use in the store */
export const createGetters = (get: () => GraphStore) => ({
  getNode: (id: NodeId): GraphNode | undefined => get().nodes.get(id),
  
  getEdge: (id: EdgeId): GraphEdge | undefined => get().edges.get(id),
  
  getAnnotation: (id: AnnotationId): Annotation | undefined => get().annotations.get(id),
  
  getRegion: (id: RegionId): Region | undefined => get().regions.get(id),
  
  getNodesArray: (): GraphNode[] => Array.from(get().nodes.values()),
  
  getEdgesArray: (): GraphEdge[] => Array.from(get().edges.values()),
  
  getPacketsArray: (): Packet[] => Array.from(get().packets.values()),
  
  getAnnotationsArray: (): Annotation[] => Array.from(get().annotations.values()),
  
  getRegionsArray: (): Region[] => Array.from(get().regions.values()),
  
  getOutgoingEdges: (nodeId: NodeId): GraphEdge[] => {
    const edges: GraphEdge[] = [];
    get().edges.forEach(e => {
      if (e.from === nodeId) edges.push(e);
    });
    return edges;
  },
  
  getIncomingEdges: (nodeId: NodeId): GraphEdge[] => {
    const edges: GraphEdge[] = [];
    get().edges.forEach(e => {
      if (e.to === nodeId) edges.push(e);
    });
    return edges;
  },
  
  getConnectedEdges: (nodeId: NodeId): GraphEdge[] => {
    const edges: GraphEdge[] = [];
    get().edges.forEach(e => {
      if (e.from === nodeId || e.to === nodeId) edges.push(e);
    });
    return edges;
  },
  
  // Scene getters
  getScene: (id: SceneId): Scene | undefined => get().scenes.get(id),
  
  getScenesArray: (): Scene[] => Array.from(get().scenes.values()),
  
  getArrangementSlot: (slotId: string): ArrangementSlot | undefined => 
    get().arrangement.find(s => s.id === slotId),
  
  getCurrentScene: (): Scene | undefined => {
    const { scenePlayback, scenes } = get();
    return scenePlayback.currentSceneId 
      ? scenes.get(scenePlayback.currentSceneId) 
      : undefined;
  },
  
  getEffectiveSettings: (): { bpm: number; root: number; scale: ScaleName } => {
    const { scenePlayback, masterSpeed, musicalContext } = get();
    return {
      bpm: scenePlayback.effectiveBpm || masterSpeed,
      root: scenePlayback.effectiveRoot ?? musicalContext.root,
      scale: scenePlayback.effectiveScale || musicalContext.scaleName,
    };
  },
});

// ============================================================================
// SELECTORS (Optimized for React re-renders)
// ============================================================================

export const selectNodes = (state: GraphStore) => state.nodes;
export const selectEdges = (state: GraphStore) => state.edges;
export const selectPackets = (state: GraphStore) => state.packets;
export const selectIsRunning = (state: GraphStore) => state.isRunning;
export const selectSelection = (state: GraphStore) => state.selection;
export const selectViewport = (state: GraphStore) => state.viewport;
export const selectCurrentTool = (state: GraphStore) => state.currentTool;
export const selectMusicalContext = (state: GraphStore) => state.musicalContext;
export const selectGlobalSettings = (state: GraphStore) => state.globalSettings;

// Scene selectors
export const selectScenes = (state: GraphStore) => state.scenes;
export const selectArrangement = (state: GraphStore) => state.arrangement;
export const selectActiveSceneId = (state: GraphStore) => state.activeSceneId;
export const selectEditingSceneId = (state: GraphStore) => state.editingSceneId;
export const selectScenePlayback = (state: GraphStore) => state.scenePlayback;
export const selectPlaybackMode = (state: GraphStore) => state.scenePlayback.mode;

// Visualization selectors
export const selectVizDisplay = (state: GraphStore) => state.vizDisplay;
export const selectIsVizMode = (state: GraphStore) => state.vizDisplay.isVizMode;
