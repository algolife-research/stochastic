// Store Initial State
// Default values for the GraphState

import type { GraphState } from './types';
import { FILE_FORMAT_VERSION } from '../../io/file-io';
import { 
  DEFAULT_SPEED, SCALES,
  INITIAL_SCENE_PLAYBACK_STATE
} from '../constants';

export const initialState: GraphState = {
  nodes: new Map(),
  edges: new Map(),
  packets: new Map(),
  annotations: new Map(),
  regions: new Map(),
  
  isRunning: false,
  isMuted: false,
  masterSpeed: DEFAULT_SPEED,
  masterVolume: 0.9,
  
  musicalContext: {
    root: 0,
    scale: SCALES.major,
    scaleName: 'major',
  },
  
  globalSettings: {
    subdivisions: 4,
    pixelsPerBeat: 200,
    gravityConstant: 0.5,
    defaultEdgeBehaviour: 'fixed',
    uiScale: 100,
    leftPanelWidth: 280,
    rightPanelWidth: 280,
    bottomPanelHeight: 120,
  },
  
  projectMeta: {
    name: 'Untitled Project',
    author: 'Anonymous',
    created: Date.now(),
    modified: Date.now(),
    version: FILE_FORMAT_VERSION,
    rootNote: 0,
    scale: 'major',
    gravity: 0,
    midiOutputId: null,
    midiClock: false,
  },
  
  project: {
    path: null,
    name: null,
    compositions: [],
    currentComposition: null,
    isProjectMode: false,
  },
  showProjectStartup: true,
  
  // Scene System
  scenes: new Map(),
  arrangement: [],
  arrangementChannels: [
    { id: crypto.randomUUID(), name: 'Track 1', color: '#4fc3f7', muted: false, solo: false, volume: 1 },
  ],
  activeSceneId: null,
  editingSceneId: null,
  scenePlayback: { ...INITIAL_SCENE_PLAYBACK_STATE },
  
  // Visualization
  vizDisplay: {
    isVizMode: false,
    previewMode: false,
  },
  
  isDirty: false,
  
  cloudProjectId: null,
  
  selection: {
    selectedNodeIds: [],
    selectedEdgeId: null,
    selectedAnnotationId: null,
    selectedRegionId: null,
    hoveredNodeId: null,
    hoveredAnnotationId: null,
    hoveredRegionId: null,
    hoveredRegionHandle: null,
    isHoveringHandle: false,
    draggingNodeId: null,
    draggingAnnotationId: null,
    draggingRegionId: null,
    resizingRegionId: null,
    linkingFromId: null,
    isBoxSelecting: false,
    boxSelectStart: null,
    boxSelectEnd: null,
  },
  
  currentTool: 'select',
  
  clipboard: null,
  
  viewport: {
    panOffset: { x: 0, y: 0 },
    zoomLevel: 1,
    isPanning: false,
  },
  
  mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
  contextMenuPos: null,
  pendingLinkNodeId: null,
};

/** Reset selection state to default values */
export const defaultSelectionState = (): GraphState['selection'] => ({
  selectedNodeIds: [],
  selectedEdgeId: null,
  selectedAnnotationId: null,
  selectedRegionId: null,
  hoveredNodeId: null,
  hoveredAnnotationId: null,
  hoveredRegionId: null,
  hoveredRegionHandle: null,
  isHoveringHandle: false,
  draggingNodeId: null,
  draggingAnnotationId: null,
  draggingRegionId: null,
  resizingRegionId: null,
  linkingFromId: null,
  isBoxSelecting: false,
  boxSelectStart: null,
  boxSelectEnd: null,
});
