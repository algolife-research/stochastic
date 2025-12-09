// Selection Actions
// Operations for selecting nodes, edges, annotations, and regions

import type { GraphStore, ImmerSet } from './types';
import type { NodeId, EdgeId, AnnotationId, RegionId, Tool } from '../types';

export const createSelectionActions = (
  set: ImmerSet,
  _get: () => GraphStore
) => ({
  selectNode: (id: NodeId | null, additive: boolean = false): void => {
    set(state => {
      if (id === null) {
        if (!additive) {
          state.selection.selectedNodeIds = [];
        }
      } else {
        if (additive) {
          if (state.selection.selectedNodeIds.includes(id)) {
            state.selection.selectedNodeIds = state.selection.selectedNodeIds.filter(nid => nid !== id);
          } else {
            state.selection.selectedNodeIds = [...state.selection.selectedNodeIds, id];
          }
        } else {
          state.selection.selectedNodeIds = [id];
        }
      }
      state.selection.selectedEdgeId = null;
      state.selection.selectedRegionId = null;
      state.selection.selectedAnnotationId = null;
    });
  },
  
  selectNodes: (ids: NodeId[]): void => {
    set(state => {
      state.selection.selectedNodeIds = ids;
      state.selection.selectedEdgeId = null;
      state.selection.selectedRegionId = null;
      state.selection.selectedAnnotationId = null;
    });
  },
  
  selectEdge: (id: EdgeId | null): void => {
    set(state => {
      state.selection.selectedEdgeId = id;
      state.selection.selectedNodeIds = [];
      state.selection.selectedRegionId = null;
      state.selection.selectedAnnotationId = null;
    });
  },
  
  selectAnnotation: (id: AnnotationId | null): void => {
    set(state => {
      state.selection.selectedAnnotationId = id;
      state.selection.selectedNodeIds = [];
      state.selection.selectedEdgeId = null;
      state.selection.selectedRegionId = null;
    });
  },
  
  selectRegion: (id: RegionId | null): void => {
    set(state => {
      state.selection.selectedRegionId = id;
      state.selection.selectedNodeIds = [];
      state.selection.selectedEdgeId = null;
      state.selection.selectedAnnotationId = null;
    });
  },
  
  clearSelection: (): void => {
    set(state => {
      state.selection.selectedNodeIds = [];
      state.selection.selectedEdgeId = null;
      state.selection.selectedAnnotationId = null;
      state.selection.selectedRegionId = null;
    });
  },
  
  setTool: (tool: Tool): void => {
    set(state => {
      state.currentTool = tool;
    });
  },
  
  setHoveredNode: (id: NodeId | null): void => {
    set(state => {
      state.selection.hoveredNodeId = id;
    });
  },
  
  setHoveredAnnotation: (id: AnnotationId | null): void => {
    set(state => {
      state.selection.hoveredAnnotationId = id;
    });
  },
  
  setHoveredRegion: (id: RegionId | null, handle: string | null = null): void => {
    set(state => {
      state.selection.hoveredRegionId = id;
      state.selection.hoveredRegionHandle = handle;
    });
  },
  
  setIsHoveringHandle: (hovering: boolean): void => {
    set(state => {
      state.selection.isHoveringHandle = hovering;
    });
  },
  
  setDraggingNode: (id: NodeId | null): void => {
    set(state => {
      state.selection.draggingNodeId = id;
    });
  },
  
  setDraggingAnnotation: (id: AnnotationId | null): void => {
    set(state => {
      state.selection.draggingAnnotationId = id;
    });
  },
  
  setDraggingRegion: (id: RegionId | null): void => {
    set(state => {
      state.selection.draggingRegionId = id;
    });
  },
  
  setResizingRegion: (id: RegionId | null): void => {
    set(state => {
      state.selection.resizingRegionId = id;
    });
  },
  
  setLinkingFrom: (id: NodeId | null): void => {
    set(state => {
      state.selection.linkingFromId = id;
    });
  },
  
  setBoxSelecting: (selecting: boolean, start?: { x: number; y: number }): void => {
    set(state => {
      state.selection.isBoxSelecting = selecting;
      if (selecting && start) {
        state.selection.boxSelectStart = start;
        state.selection.boxSelectEnd = start;
      } else {
        state.selection.boxSelectStart = null;
        state.selection.boxSelectEnd = null;
      }
    });
  },
  
  updateBoxSelectEnd: (end: { x: number; y: number }): void => {
    set(state => {
      state.selection.boxSelectEnd = end;
    });
  },
  
  setPendingLinkNode: (id: NodeId | null): void => {
    set(state => {
      state.pendingLinkNodeId = id;
    });
  },
  
  setContextMenuPos: (x: number | null, y: number | null): void => {
    set(state => {
      state.contextMenuPos = x !== null && y !== null ? { x, y } : null;
    });
  },
});
