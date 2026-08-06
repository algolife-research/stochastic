// Store Types - GraphState and GraphActions interfaces
// Extracted from store.ts for modularity

import type { 
  NodeId, EdgeId, PacketId, SceneId, AnnotationId, RegionId,
  GraphNode, GraphEdge, Packet, AudioPayload,
  NodeType, MusicalContext, GlobalSettings, ProjectMeta,
  ViewportState, SelectionState, Tool,
  ScaleName, Annotation, Region, Scene, ArrangementSlot, ArrangementChannel,
  ScenePlaybackState, PlaybackMode, SceneQuantize,
  VizMode, VizConfig
} from '../types';

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface GraphState {
  // Graph data (mutable for performance, use immer for updates)
  nodes: Map<NodeId, GraphNode>;
  edges: Map<EdgeId, GraphEdge>;
  packets: Map<PacketId, Packet>;
  annotations: Map<AnnotationId, Annotation>;
  regions: Map<RegionId, Region>;
  
  // Playback
  isRunning: boolean;
  isMuted: boolean;
  masterSpeed: number;  // BPM
  masterVolume: number; // 0-1
  
  // Musical context
  musicalContext: MusicalContext;
  globalSettings: GlobalSettings;
  
  // Project
  projectMeta: ProjectMeta;
  project: {
    path: string | null;
    name: string | null;
    compositions: string[];
    currentComposition: string | null;
    isProjectMode: boolean;
  };
  showProjectStartup: boolean;
  
  // Scene System
  scenes: Map<SceneId, Scene>;
  arrangement: ArrangementSlot[];
  arrangementChannels: ArrangementChannel[];
  activeSceneId: SceneId | null;
  editingSceneId: SceneId | null;
  scenePlayback: ScenePlaybackState;
  
  // Visualization
  vizDisplay: {
    isVizMode: boolean;
    previewMode: boolean;
  };
  
  isDirty: boolean;
  
  // Cloud project tracking
  cloudProjectId: string | null;
  
  // Selection
  selection: SelectionState;
  currentTool: Tool;
  
  // Clipboard for copy/paste
  clipboard: {
    nodes: { type: NodeType; relX: number; relY: number; props: Record<string, unknown> }[];
    edges: { fromIndex: number; toIndex: number; timingMode: 'physical' | 'fixed'; durationBeats: number | null; targetParam: string | null }[];
  } | null;
  
  // Viewport
  viewport: ViewportState;
  
  // Mouse (updated frequently, not causing re-renders)
  mouse: { x: number; y: number; worldX: number; worldY: number };
  
  // Context menu position (for edge drop create node)
  contextMenuPos: { x: number; y: number } | null;
  pendingLinkNodeId: NodeId | null;
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

export interface GraphActions {
  // Node operations
  addNode: (type: NodeType, x: number, y: number) => NodeId;
  updateNode: <T extends NodeType>(id: NodeId, updates: Partial<GraphNode<T>>) => void;
  batchMergeNodeProps: (entries: Array<[NodeId, Record<string, unknown>]>) => void;
  setNodeRuntime: (id: NodeId, runtime: { timer?: number; lastTrigger?: number }) => void;
  decayNodeFlashes: (deltaTime: number) => void;
  updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
  deleteNode: (id: NodeId) => void;
  moveNode: (id: NodeId, x: number, y: number) => void;
  flashNode: (id: NodeId) => void;
  holdPacketAtNode: (id: NodeId, payload: AudioPayload, delayBeats: number) => void;
  releaseHeldPackets: (id: NodeId, indices: number[]) => void;
  duplicateNode: (id: NodeId) => NodeId | null;
  duplicateSelectedNodes: () => void;
  copySelectedNodes: () => void;
  pasteNodes: () => void;
  groupSelectedNodes: () => NodeId | null;
  
  // Edge operations
  addEdge: (from: NodeId, to: NodeId, options?: Partial<GraphEdge>) => EdgeId | null;
  updateEdge: (id: EdgeId, updates: Partial<GraphEdge>) => void;
  deleteEdge: (id: EdgeId) => void;
  
  // Annotation operations
  addAnnotation: (x: number, y: number, text: string) => AnnotationId;
  updateAnnotation: (id: AnnotationId, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: AnnotationId) => void;
  
  // Region operations
  addRegion: (x: number, y: number, width: number, height: number, name?: string) => RegionId | null;
  updateRegion: (id: RegionId, updates: Partial<Region>) => void;
  deleteRegion: (id: RegionId) => void;
  duplicateRegion: (id: RegionId) => RegionId | null;
  getRegionContents: (id: RegionId) => { nodes: GraphNode[]; edges: GraphEdge[]; annotations: Annotation[] };
  
  // Packet operations
  addPacket: (packet: Packet) => void;
  spawnPacket: (sourceNodeId: NodeId) => void;
  updatePacket: (id: PacketId, updates: Partial<Packet>) => void;
  batchUpdatePacketPositions: (entries: Array<[PacketId, number]>) => void;
  deletePacket: (id: PacketId) => void;
  clearPackets: () => void;
  
  // Selection
  selectNode: (id: NodeId | null, additive?: boolean) => void;
  selectNodes: (ids: NodeId[]) => void;
  selectEdge: (id: EdgeId | null) => void;
  selectAnnotation: (id: AnnotationId | null) => void;
  selectRegion: (id: RegionId | null) => void;
  clearSelection: () => void;
  setTool: (tool: Tool) => void;
  setHoveredNode: (id: NodeId | null) => void;
  setHoveredAnnotation: (id: AnnotationId | null) => void;
  setHoveredRegion: (id: RegionId | null, handle?: string | null) => void;
  setIsHoveringHandle: (hovering: boolean) => void;
  setDraggingNode: (id: NodeId | null) => void;
  setDraggingAnnotation: (id: AnnotationId | null) => void;
  setDraggingRegion: (id: RegionId | null) => void;
  setResizingRegion: (id: RegionId | null) => void;
  setLinkingFrom: (id: NodeId | null) => void;
  setBoxSelecting: (selecting: boolean, start?: { x: number; y: number }) => void;
  updateBoxSelectEnd: (end: { x: number; y: number }) => void;
  setPendingLinkNode: (id: NodeId | null) => void;
  setContextMenuPos: (x: number | null, y: number | null) => void;
  
  // Playback
  setIsRunning: (running: boolean) => void;
  togglePlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  setIsMuted: (muted: boolean) => void;
  setMasterSpeed: (bpm: number) => void;
  setMasterVolume: (volume: number) => void;
  
  // Viewport
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setIsPanning: (panning: boolean) => void;
  
  // Mouse
  setMouse: (x: number, y: number, worldX: number, worldY: number) => void;
  
  // Musical context
  setMusicalContext: (ctx: Partial<MusicalContext>) => void;
  setGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  
  // Project
  setProjectMeta: (meta: Partial<ProjectMeta>) => void;
  setProjectPath: (path: string | null) => void;
  setProjectName: (name: string | null) => void;
  setCompositions: (files: string[]) => void;
  setCurrentComposition: (filename: string | null) => void;
  setProjectMode: (isProjectMode: boolean) => void;
  setShowProjectStartup: (show: boolean) => void;
  setCloudProjectId: (id: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
  
  // Bulk operations
  clear: () => void;
  clearCanvas: () => void;
  saveCurrentScene: () => void;
  loadGraph: (nodes: GraphNode[], edges: GraphEdge[], annotations?: Annotation[], regions?: Region[]) => void;
  autoLayout: (algorithm?: 'hierarchical' | 'force' | 'circular') => void;
  
  // Scene operations
  createScene: (name?: string) => SceneId;
  duplicateScene: (id: SceneId) => SceneId | null;
  deleteScene: (id: SceneId) => void;
  reorderScenes: (fromId: SceneId, toId: SceneId) => void;
  updateScene: (id: SceneId, updates: Partial<Scene>) => void;
  saveCurrentToScene: (id: SceneId) => void;
  loadSceneToCanvas: (id: SceneId) => void;
  setEditingScene: (id: SceneId | null) => void;
  loadComposition: (scenes: Scene[], arrangement: ArrangementSlot[], channels: ArrangementChannel[], masterBpm: number) => void;
  
  // Arrangement operations
  addToArrangement: (sceneId: SceneId, startBeat?: number, channel?: number) => void;
  removeFromArrangement: (slotId: string) => void;
  updateArrangementSlot: (slotId: string, updates: Partial<ArrangementSlot>) => void;
  reorderArrangement: (slotId: string, newStartBeat: number) => void;
  clearArrangement: () => void;
  
  // Channel operations
  addArrangementChannel: () => void;
  removeArrangementChannel: (channelId: string) => void;
  updateArrangementChannel: (channelId: string, updates: Partial<ArrangementChannel>) => void;
  
  // Scene playback
  setPlaybackMode: (mode: PlaybackMode) => void;
  setScenePlayback: (updates: Partial<ScenePlaybackState>) => void;
  seekArrangement: (beat: number) => void;
  queueScene: (sceneId: SceneId, quantize?: SceneQuantize) => void;
  triggerSceneImmediate: (sceneId: SceneId) => void;
  advanceSceneBeat: (deltaBeats: number) => void;
  
  // Scene getters
  getScene: (id: SceneId) => Scene | undefined;
  getScenesArray: () => Scene[];
  getArrangementSlot: (slotId: string) => ArrangementSlot | undefined;
  getCurrentScene: () => Scene | undefined;
  getEffectiveSettings: () => { bpm: number; root: number; scale: ScaleName };
  
  // Visualization
  setVizMode: (isVizMode: boolean) => void;
  setVizPreview: (previewMode: boolean) => void;
  toggleVizMode: () => void;
  updateSceneVizMode: (sceneId: SceneId, vizMode: VizMode) => void;
  updateSceneVizConfig: (sceneId: SceneId, vizConfig: VizConfig | null) => void;
  
  // Getters (for external access)
  getNode: (id: NodeId) => GraphNode | undefined;
  getEdge: (id: EdgeId) => GraphEdge | undefined;
  getAnnotation: (id: AnnotationId) => Annotation | undefined;
  getRegion: (id: RegionId) => Region | undefined;
  getNodesArray: () => GraphNode[];
  getEdgesArray: () => GraphEdge[];
  getPacketsArray: () => Packet[];
  getAnnotationsArray: () => Annotation[];
  getRegionsArray: () => Region[];
  getOutgoingEdges: (nodeId: NodeId) => GraphEdge[];
  getIncomingEdges: (nodeId: NodeId) => GraphEdge[];
  getConnectedEdges: (nodeId: NodeId) => GraphEdge[];
}

export type GraphStore = GraphState & GraphActions;

// Zustand setter/getter types for action creators
export type SetState = (
  partial: GraphState | Partial<GraphState> | ((state: GraphState) => GraphState | Partial<GraphState>),
  replace?: boolean
) => void;

export type GetState = () => GraphStore;

// Immer-style set function type
export type ImmerSet = (fn: (state: GraphState) => void) => void;
