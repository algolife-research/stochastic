// Phonon v2 - Graph Store (Zustand + Immer)
// High-performance mutable graph state with immutable React bindings
// 
// This modular store is split into focused action modules for maintainability.
// Each module handles a specific domain (nodes, edges, scenes, etc.)

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { enableMapSet } from 'immer';

// Types
import type { GraphStore } from './types';
export type { GraphStore, GraphState, GraphActions } from './types';

// Initial state
import { initialState } from './initial-state';

// Action creators
import { createNodeActions } from './node-actions';
import { createEdgeActions } from './edge-actions';
import { createPacketActions } from './packet-actions';
import { createSelectionActions } from './selection-actions';
import { createPlaybackActions } from './playback-actions';
import { createViewportActions } from './viewport-actions';
import { createProjectActions } from './project-actions';
import { createSceneActions } from './scene-actions';
import { createAnnotationActions } from './annotation-actions';
import { createRegionActions } from './region-actions';
import { createBulkActions } from './bulk-actions';
import { createGetters, setStoreRef } from './getters';

// Enable Immer MapSet plugin for Map/Set support
enableMapSet();

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useGraphStore = create<GraphStore>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create the store with all action modules
      const store = {
        ...initialState,
        ...createNodeActions(set, get as () => GraphStore),
        ...createEdgeActions(set, get as () => GraphStore),
        ...createPacketActions(set, get as () => GraphStore),
        ...createSelectionActions(set, get as () => GraphStore),
        ...createPlaybackActions(set, get as () => GraphStore),
        ...createViewportActions(set),
        ...createProjectActions(set, get as () => GraphStore),
        ...createSceneActions(set, get as () => GraphStore),
        ...createAnnotationActions(set, get as () => GraphStore),
        ...createRegionActions(set, get as () => GraphStore),
        ...createBulkActions(set, get as () => GraphStore),
        ...createGetters(get as () => GraphStore),
      };
      
      return store;
    })
  )
);

// Set up store reference for direct access
setStoreRef(useGraphStore);

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export getGraphStore for direct store access (bypasses React)
export { getGraphStore } from './getters';

// Re-export selectors
export {
  selectNodes,
  selectEdges,
  selectPackets,
  selectIsRunning,
  selectSelection,
  selectViewport,
  selectCurrentTool,
  selectMusicalContext,
  selectGlobalSettings,
  selectScenes,
  selectArrangement,
  selectActiveSceneId,
  selectEditingSceneId,
  selectScenePlayback,
  selectPlaybackMode,
  selectVizDisplay,
  selectIsVizMode,
} from './getters';

// Re-export viz config utility
export { getDefaultVizConfig } from './viz-config';
