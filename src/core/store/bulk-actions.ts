// Bulk Actions
// Operations for clearing, loading graphs, and saving scenes

import type { GraphStore, ImmerSet } from './types';
import type { GraphNode, GraphEdge, Annotation, Region } from '../types';
import { INITIAL_SCENE_PLAYBACK_STATE } from '../constants';
import { defaultSelectionState } from './initial-state';

export const createBulkActions = (
  set: ImmerSet,
  get: () => GraphStore
) => ({
  clear: (): void => {
    set(state => {
      state.nodes.clear();
      state.edges.clear();
      state.packets.clear();
      state.annotations.clear();
      state.regions.clear();
      // Reset scenes
      state.scenes.clear();
      state.arrangement = [];
      state.activeSceneId = null;
      state.editingSceneId = null;
      state.scenePlayback = { ...INITIAL_SCENE_PLAYBACK_STATE };
      // Reset selection
      state.selection = defaultSelectionState();
      state.isDirty = true;
    });
    
    // Create a default scene after clearing
    const sceneId = get().createScene('Scene 1');
    get().loadSceneToCanvas(sceneId);
  },
  
  clearCanvas: (): void => {
    set(state => {
      state.nodes.clear();
      state.edges.clear();
      state.packets.clear();
      state.annotations.clear();
      state.regions.clear();
      state.selection = defaultSelectionState();
      state.isDirty = true;
    });
  },
  
  saveCurrentScene: (): void => {
    const { editingSceneId } = get();
    if (editingSceneId) {
      get().saveCurrentToScene(editingSceneId);
    }
  },
  
  loadGraph: (nodes: GraphNode[], edges: GraphEdge[], annotations: Annotation[] = [], regions: Region[] = []): void => {
    set(state => {
      state.nodes.clear();
      state.edges.clear();
      state.packets.clear();
      state.annotations.clear();
      state.regions.clear();
      
      nodes.forEach(node => {
        state.nodes.set(node.id, { ...node } as never);
      });
      
      edges.forEach(edge => {
        state.edges.set(edge.id, { ...edge } as never);
      });
      
      annotations.forEach(ann => {
        state.annotations.set(ann.id, { ...ann } as never);
      });
      
      regions.forEach(region => {
        state.regions.set(region.id, { ...region } as never);
      });
      
      state.selection = defaultSelectionState();
      state.isDirty = false;
    });
  },
});
