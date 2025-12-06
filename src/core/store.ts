// Phonon v2 - Graph Store (Zustand + Immer)
// High-performance mutable graph state with immutable React bindings

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import type { 
  NodeId, EdgeId, PacketId, SceneId, AnnotationId, RegionId,
  GraphNode, GraphEdge, Packet, AudioPayload,
  NodeType, MusicalContext, GlobalSettings, ProjectMeta,
  ViewportState, SelectionState, Tool, MidiNote, Frequency,
  ScaleName, Annotation, Region, Scene, ArrangementSlot, 
  ScenePlaybackState, PlaybackMode, SceneQuantize
} from './types';
import { 
  createNodeId, createEdgeId, createPacketId,
  createAnnotationId, createRegionId, createSceneId
} from './types';
import { 
  getDefaultProps, DEFAULT_SPEED, MAX_PACKETS, SCALES,
  midiToFreq, LEGACY_SCALE_OFFSET, MIN_REGION_SIZE,
  createDefaultScene, INITIAL_SCENE_PLAYBACK_STATE,
  getEffectiveBpm, getEffectiveRoot, getEffectiveScale
} from './constants';

// Enable Immer MapSet plugin for Map/Set support
enableMapSet();

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface GraphState {
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
  activeSceneId: SceneId | null;
  editingSceneId: SceneId | null;  // Which scene is being edited on canvas
  scenePlayback: ScenePlaybackState;
  
  isDirty: boolean;
  
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

interface GraphActions {
  // Node operations
  addNode: (type: NodeType, x: number, y: number) => NodeId;
  updateNode: <T extends NodeType>(id: NodeId, updates: Partial<GraphNode<T>>) => void;
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
  markDirty: () => void;
  markClean: () => void;
  
  // Bulk operations
  clear: () => void;
  clearCanvas: () => void;  // Clear only nodes/edges/packets, keep scenes
  saveCurrentScene: () => void;  // Save current canvas to editing scene
  loadGraph: (nodes: GraphNode[], edges: GraphEdge[], annotations?: Annotation[], regions?: Region[]) => void;
  
  // Scene operations
  createScene: (name?: string) => SceneId;
  duplicateScene: (id: SceneId) => SceneId | null;
  deleteScene: (id: SceneId) => void;
  updateScene: (id: SceneId, updates: Partial<Scene>) => void;
  saveCurrentToScene: (id: SceneId) => void;
  loadSceneToCanvas: (id: SceneId) => void;
  setEditingScene: (id: SceneId | null) => void;
  
  // Arrangement operations
  addToArrangement: (sceneId: SceneId, startBeat?: number) => void;
  removeFromArrangement: (slotId: string) => void;
  updateArrangementSlot: (slotId: string, updates: Partial<ArrangementSlot>) => void;
  reorderArrangement: (slotId: string, newStartBeat: number) => void;
  clearArrangement: () => void;
  
  // Scene playback
  setPlaybackMode: (mode: PlaybackMode) => void;
  setScenePlayback: (updates: Partial<ScenePlaybackState>) => void;
  queueScene: (sceneId: SceneId, quantize?: SceneQuantize) => void;
  triggerSceneImmediate: (sceneId: SceneId) => void;
  advanceSceneBeat: (deltaBeats: number) => void;
  
  // Scene getters
  getScene: (id: SceneId) => Scene | undefined;
  getScenesArray: () => Scene[];
  getArrangementSlot: (slotId: string) => ArrangementSlot | undefined;
  getCurrentScene: () => Scene | undefined;
  getEffectiveSettings: () => { bpm: number; root: number; scale: ScaleName };
  
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

type GraphStore = GraphState & GraphActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: GraphState = {
  nodes: new Map(),
  edges: new Map(),
  packets: new Map(),
  annotations: new Map(),
  regions: new Map(),
  
  isRunning: false,
  isMuted: false,
  masterSpeed: DEFAULT_SPEED,
  
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
  },
  
  projectMeta: {
    name: 'Untitled Project',
    author: 'Anonymous',
    created: Date.now(),
    modified: Date.now(),
    version: '2.0.0',
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
  activeSceneId: null,
  editingSceneId: null,
  scenePlayback: { ...INITIAL_SCENE_PLAYBACK_STATE },
  
  isDirty: false,
  
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

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useGraphStore = create<GraphStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,
      
      // ========================================
      // NODE OPERATIONS
      // ========================================
      
      addNode: (type, x, y) => {
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
        
        const node: GraphNode = {
          id,
          type,
          x,
          y,
          props: finalProps as GraphNode['props'],
          timer: 0,
          lastTrigger: 0,
          flash: 0,
          heldPackets: [],
        };
        
        set(state => {
          state.nodes.set(id, node as never);
          state.isDirty = true;
        });
        
        return id;
      },
      
      updateNode: (id, updates) => {
        set(state => {
          const node = state.nodes.get(id);
          if (node) {
            Object.assign(node, updates);
            state.isDirty = true;
          }
        });
      },
      
      updateNodeProps: (id, props) => {
        set(state => {
          const node = state.nodes.get(id);
          if (node) {
            // Create new node with updated props (immutable update)
            const newNode: GraphNode = {
              ...node,
              props: {
                ...node.props,
                ...props,
              } as any,
            };
            state.nodes.set(id, newNode as never);
            state.isDirty = true;
          }
        });
      },
      
      deleteNode: (id) => {
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
      
      moveNode: (id, x, y) => {
        set(state => {
          const node = state.nodes.get(id);
          if (node) {
            node.x = x;
            node.y = y;
          }
        });
      },
      
      flashNode: (id) => {
        set(state => {
          const node = state.nodes.get(id);
          if (node) {
            node.flash = 1.0;
          }
        });
      },
      
      holdPacketAtNode: (id, payload, delayBeats) => {
        const bpm = get().masterSpeed;
        const delayMs = (delayBeats * 60 / bpm) * 1000;
        const releaseTime = performance.now() + delayMs;
        
        set(state => {
          const node = state.nodes.get(id);
          if (node) {
            node.heldPackets.push({ payload: { ...payload } as never, releaseTime });
          }
        });
      },
      
      releaseHeldPackets: (id, indices) => {
        set(state => {
          const node = state.nodes.get(id);
          if (node) {
            // Remove in reverse order to maintain indices
            const sortedIndices = [...indices].sort((a, b) => b - a);
            sortedIndices.forEach(index => {
              node.heldPackets.splice(index, 1);
            });
          }
        });
      },
      
      // ========================================
      // EDGE OPERATIONS
      // ========================================
      
      addEdge: (from, to, options = {}) => {
        const state = get();
        
        // Prevent duplicate edges
        let exists = false;
        state.edges.forEach(e => {
          if (e.from === from && e.to === to && e.targetParam === (options.targetParam ?? null)) {
            exists = true;
          }
        });
        if (exists) return null;
        
        // Prevent self-loops
        if (from === to) return null;
        
        // Use global default edge behaviour
        const defaultMode = state.globalSettings.defaultEdgeBehaviour;
        const defaultDuration = defaultMode === 'fixed' ? 1 : null;
        
        const id = createEdgeId();
        const edge: GraphEdge = {
          id,
          from,
          to,
          timingMode: options.timingMode ?? defaultMode,
          durationBeats: options.durationBeats ?? defaultDuration,
          targetParam: options.targetParam ?? null,
        };
        
        set(state => {
          state.edges.set(id, edge);
          state.isDirty = true;
        });
        
        return id;
      },
      
      updateEdge: (id, updates) => {
        set(state => {
          const edge = state.edges.get(id);
          if (edge) {
            // Reconstruct immutable edge with updates
            const newEdge: GraphEdge = {
              ...edge,
              ...updates,
              id: edge.id, // Preserve ID
            };
            state.edges.set(id, newEdge);
            state.isDirty = true;
          }
        });
      },
      
      deleteEdge: (id) => {
        set(state => {
          // Delete packets on this edge
          state.packets.forEach((packet, packetId) => {
            if (packet.edgeId === id) {
              state.packets.delete(packetId);
            }
          });
          
          state.edges.delete(id);
          
          if (state.selection.selectedEdgeId === id) {
            state.selection.selectedEdgeId = null;
          }
          
          state.isDirty = true;
        });
      },
      
      // ========================================
      // PACKET OPERATIONS
      // ========================================
      
      spawnPacket: (sourceNodeId) => {
        const state = get();
        if (state.packets.size >= MAX_PACKETS) return;
        
        const sourceNode = state.nodes.get(sourceNodeId);
        if (!sourceNode || sourceNode.type !== 'source') return;
        
        const props = sourceNode.props as { 
          noteIndex: number; 
          midiNote: MidiNote; 
          intensity: number 
        };
        
        // Determine MIDI note
        let midiNote: MidiNote;
        if (props.noteIndex >= 0) {
          midiNote = (LEGACY_SCALE_OFFSET + Math.min(36, props.noteIndex)) as MidiNote;
        } else if (props.noteIndex === -1) {
          midiNote = (36 + Math.floor(Math.random() * 49)) as MidiNote;
        } else {
          midiNote = props.midiNote ?? (60 as MidiNote);
        }
        
        const freq = midiToFreq(midiNote);
        const intensity = props.intensity ?? 0.5;
        
        // Spawn packet for each outgoing edge
        const outgoingEdges = state.getOutgoingEdges(sourceNodeId);
        
        set(stateToUpdate => {
          outgoingEdges.forEach(edge => {
            const packetId = createPacketId();
            const packet: Packet = {
              id: packetId,
              edgeId: edge.id,
              t: 0,
              payload: {
                freq,
                midiNote,
                wave: 'sine',
                timbre: 0,
                cutoff: 20000 as Frequency,
                gain: intensity,
                holdTime: 0,
                releaseTime: 0.1,
              },
            };
            stateToUpdate.packets.set(packetId, packet as never);
          });
          
          // Flash source node
          const node = stateToUpdate.nodes.get(sourceNodeId);
          if (node) {
            node.flash = 1.0;
          }
        });
      },
      
      addPacket: (packet) => {
        set(state => {
          state.packets.set(packet.id, packet as never);
        });
      },
      
      updatePacket: (id, updates) => {
        set(state => {
          const packet = state.packets.get(id);
          if (packet) {
            Object.assign(packet, updates);
          }
        });
      },
      
      deletePacket: (id) => {
        set(state => {
          state.packets.delete(id);
        });
      },
      
      clearPackets: () => {
        set(state => {
          state.packets.clear();
        });
      },
      
      // ========================================
      // SELECTION
      // ========================================
      
      selectNode: (id, additive = false) => {
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
      
      selectNodes: (ids) => {
        set(state => {
          state.selection.selectedNodeIds = ids;
          state.selection.selectedEdgeId = null;
          state.selection.selectedRegionId = null;
          state.selection.selectedAnnotationId = null;
        });
      },
      
      selectEdge: (id) => {
        set(state => {
          state.selection.selectedEdgeId = id;
          state.selection.selectedNodeIds = [];
          state.selection.selectedRegionId = null;
          state.selection.selectedAnnotationId = null;
        });
      },
      
      clearSelection: () => {
        set(state => {
          state.selection.selectedNodeIds = [];
          state.selection.selectedEdgeId = null;
          state.selection.selectedAnnotationId = null;
          state.selection.selectedRegionId = null;
        });
      },
      
      setTool: (tool) => {
        set(state => {
          state.currentTool = tool;
        });
      },
      
      setHoveredNode: (id) => {
        set(state => {
          state.selection.hoveredNodeId = id;
        });
      },
      
      setDraggingNode: (id) => {
        set(state => {
          state.selection.draggingNodeId = id;
        });
      },
      
      setLinkingFrom: (id) => {
        set(state => {
          state.selection.linkingFromId = id;
        });
      },
      
      // ========================================
      // PLAYBACK
      // ========================================
      
      setIsRunning: (running) => {
        set(state => {
          state.isRunning = running;
        });
      },
      
      togglePlayback: () => {
        set(state => {
          state.isRunning = !state.isRunning;
        });
      },
      
      pausePlayback: () => {
        set(state => {
          state.isRunning = false;
        });
      },
      
      stopPlayback: () => {
        set(state => {
          state.isRunning = false;
          // Reset scene playback state
          state.scenePlayback.sceneBeat = 0;
          state.scenePlayback.arrangementBeat = 0;
          state.scenePlayback.sceneLoopIteration = 0;
          state.scenePlayback.currentSlotIndex = 0;
          state.scenePlayback.queuedSceneId = null;
          // Clear all packets
          state.packets.clear();
          // Reset node timers and held packets
          for (const node of state.nodes.values()) {
            node.timer = 0;
            node.lastTrigger = 0;
            node.flash = 0;
            node.heldPackets = [];
          }
        });
      },
      
      setIsMuted: (muted) => {
        set(state => {
          state.isMuted = muted;
        });
        // Sync with audio engine
        import('@audio/engine').then(({ audioEngine }) => {
          audioEngine.setMuted(muted);
        });
      },
      
      setMasterSpeed: (bpm) => {
        set(state => {
          state.masterSpeed = bpm;
          // Update effectiveBpm if no scene is active (or scene uses global BPM)
          if (state.scenePlayback.currentSceneId === null) {
            state.scenePlayback.effectiveBpm = bpm;
          } else {
            // Check if active scene uses global BPM (localBpm is null)
            const scene = state.scenes.get(state.scenePlayback.currentSceneId);
            if (scene && scene.localBpm === null) {
              state.scenePlayback.effectiveBpm = bpm;
            }
          }
        });
      },
      
      // ========================================
      // VIEWPORT
      // ========================================
      
      setPan: (x, y) => {
        set(state => {
          state.viewport.panOffset.x = x;
          state.viewport.panOffset.y = y;
        });
      },
      
      setZoom: (zoom) => {
        set(state => {
          state.viewport.zoomLevel = zoom;
        });
      },
      
      setIsPanning: (panning) => {
        set(state => {
          state.viewport.isPanning = panning;
        });
      },
      
      // ========================================
      // MOUSE
      // ========================================
      
      setMouse: (x, y, worldX, worldY) => {
        set(state => {
          state.mouse.x = x;
          state.mouse.y = y;
          state.mouse.worldX = worldX;
          state.mouse.worldY = worldY;
        });
      },
      
      // ========================================
      // MUSICAL CONTEXT
      // ========================================
      
      setMusicalContext: (ctx) => {
        set(state => {
          if (ctx.scaleName !== undefined) {
            const scale = SCALES[ctx.scaleName as ScaleName];
            if (scale) {
              state.musicalContext.scale = [...scale] as never;
              state.musicalContext.scaleName = ctx.scaleName as ScaleName;
            }
          }
          if (ctx.root !== undefined) {
            state.musicalContext.root = ctx.root;
          }
        });
      },
      
      setGlobalSettings: (settings) => {
        set(state => {
          Object.assign(state.globalSettings, settings);
        });
      },
      
      // ========================================
      // PROJECT
      // ========================================
      
      setProjectMeta: (meta) => {
        set(state => {
          Object.assign(state.projectMeta, meta);
          state.isDirty = true;
        });
      },

      setProjectPath: (path) => {
        set(state => {
          state.project.path = path;
        });
      },

      setProjectName: (name) => {
        set(state => {
          state.project.name = name;
        });
      },

      setCompositions: (files) => {
        set(state => {
          state.project.compositions = files;
        });
      },

      setCurrentComposition: (filename) => {
        set(state => {
          state.project.currentComposition = filename;
        });
      },

      setProjectMode: (isProjectMode) => {
        set(state => {
          state.project.isProjectMode = isProjectMode;
        });
      },

      setShowProjectStartup: (show) => {
        set(state => {
          state.showProjectStartup = show;
        });
      },
      
      markDirty: () => {
        set(state => {
          state.isDirty = true;
        });
      },
      
      markClean: () => {
        set(state => {
          state.isDirty = false;
        });
      },
      
      // ========================================
      // BULK OPERATIONS
      // ========================================
      
      clear: () => {
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
          state.selection = {
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
          };
          state.isDirty = true;
        });
        
        // Create a default scene after clearing
        const sceneId = get().createScene('Scene 1');
        get().loadSceneToCanvas(sceneId);
      },
      
      clearCanvas: () => {
        // Clear only the canvas content (nodes/edges/packets), preserving scenes
        set(state => {
          state.nodes.clear();
          state.edges.clear();
          state.packets.clear();
          state.annotations.clear();
          state.regions.clear();
          // Reset selection but keep scenes intact
          state.selection = {
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
          };
          state.isDirty = true;
        });
      },
      
      saveCurrentScene: () => {
        // Save current canvas content to the editing scene
        const { editingSceneId } = get();
        if (editingSceneId) {
          get().saveCurrentToScene(editingSceneId);
        }
      },
      
      loadGraph: (nodes, edges, annotations = [], regions = []) => {
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
          
          state.selection = {
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
          };
          
          state.isDirty = false;
        });
      },
      
      // ========================================
      // NODE DUPLICATION & GROUPING
      // ========================================
      
      duplicateNode: (id) => {
        const state = get();
        const node = state.nodes.get(id);
        if (!node) return null;
        
        const newId = createNodeId();
        const newNode: GraphNode = {
          id: newId,
          type: node.type,
          x: node.x + 50,
          y: node.y + 50,
          props: JSON.parse(JSON.stringify(node.props)),
          timer: 0,
          lastTrigger: 0,
          flash: 0,
          heldPackets: [],
        };
        
        set(s => {
          s.nodes.set(newId, newNode as never);
          s.isDirty = true;
        });
        
        return newId;
      },
      
      duplicateSelectedNodes: () => {
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
          
          const newNode: GraphNode = {
            id: newId,
            type: node.type,
            x: node.x + 50,
            y: node.y + 50,
            props: JSON.parse(JSON.stringify(node.props)),
            timer: 0,
            lastTrigger: 0,
            flash: 0,
            heldPackets: [],
          };
          
          set(s => {
            s.nodes.set(newId, newNode as never);
          });
        });
        
        // Second pass: duplicate edges between selected nodes
        state.edges.forEach(edge => {
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
            set(s => {
              s.edges.set(newEdgeId, newEdge as never);
            });
          }
        });
        
        // Select new nodes
        set(s => {
          s.selection.selectedNodeIds = newNodeIds;
          s.isDirty = true;
        });
      },
      
      copySelectedNodes: () => {
        const state = get();
        const selectedIds = state.selection.selectedNodeIds;
        if (selectedIds.length === 0) return;
        
        // Calculate center of selection for relative positioning
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
        
        // Build index map for edges
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
        
        // Copy edges between selected nodes
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
      
      pasteNodes: () => {
        const state = get();
        if (!state.clipboard || state.clipboard.nodes.length === 0) return;
        
        // Paste at mouse position (or offset from original if no mouse position)
        const pasteX = state.mouse.worldX || 100;
        const pasteY = state.mouse.worldY || 100;
        
        const newNodeIds: NodeId[] = [];
        
        // Create nodes
        state.clipboard.nodes.forEach(clipNode => {
          const newId = createNodeId();
          newNodeIds.push(newId);
          
          const newNode: GraphNode = {
            id: newId,
            type: clipNode.type,
            x: pasteX + clipNode.relX,
            y: pasteY + clipNode.relY,
            props: JSON.parse(JSON.stringify(clipNode.props)),
            timer: 0,
            lastTrigger: 0,
            flash: 0,
            heldPackets: [],
          };
          
          set(s => {
            s.nodes.set(newId, newNode as never);
          });
        });
        
        // Create edges
        state.clipboard.edges.forEach(clipEdge => {
          const fromId = newNodeIds[clipEdge.fromIndex];
          const toId = newNodeIds[clipEdge.toIndex];
          if (fromId && toId) {
            const newEdgeId = createEdgeId();
            const newEdge: GraphEdge = {
              id: newEdgeId,
              from: fromId,
              to: toId,
              timingMode: clipEdge.timingMode,
              durationBeats: clipEdge.durationBeats,
              targetParam: clipEdge.targetParam,
            };
            set(s => {
              s.edges.set(newEdgeId, newEdge as never);
            });
          }
        });
        
        // Select new nodes
        set(s => {
          s.selection.selectedNodeIds = newNodeIds;
          s.isDirty = true;
        });
      },
      
      groupSelectedNodes: () => {
        const state = get();
        const selectedIds = state.selection.selectedNodeIds;
        if (selectedIds.length === 0) return null;
        
        // Get bounding box of selected nodes
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        const selectedNodes: GraphNode[] = [];
        
        selectedIds.forEach(id => {
          const node = state.nodes.get(id);
          if (node && node.type !== 'source' && node.type !== 'tunnel') {
            // Filter out sources and tunnels - they can't be grouped
            selectedNodes.push(node);
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
          }
        });
        
        if (selectedNodes.length === 0) return null;
        
        // Create tunnel at center
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
          s.edges.forEach((edge, edgeId) => {
            const fromInside = validNodeIds.has(edge.from);
            const toInside = validNodeIds.has(edge.to);
            
            if (fromInside && !toInside) {
              // Edge going out - rewire from tunnel
              edge.from = tunnelId;
            } else if (!fromInside && toInside) {
              // Edge coming in - rewire to tunnel
              edge.to = tunnelId;
            } else if (fromInside && toInside) {
              // Internal edge - delete it
              s.edges.delete(edgeId);
            }
          });
          
          // Remove duplicate edges (same from-to pair)
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
          const tunnelNode: GraphNode<'tunnel'> = {
            id: tunnelId,
            type: 'tunnel',
            x: centerX,
            y: centerY,
            props: {
              tunnelName: 'Custom',
              subNodes,
            },
            timer: 0,
            lastTrigger: 0,
            flash: 0,
            heldPackets: [],
          };
          
          s.nodes.set(tunnelId, tunnelNode as never);
          s.selection.selectedNodeIds = [tunnelId];
          s.isDirty = true;
        });
        
        return tunnelId;
      },
      
      // ========================================
      // ANNOTATION OPERATIONS
      // ========================================
      
      addAnnotation: (x, y, text) => {
        const id = createAnnotationId();
        const annotation: Annotation = {
          id,
          x,
          y,
          text,
          fontSize: 14,
          color: '#cccccc',
        };
        
        set(state => {
          state.annotations.set(id, annotation as never);
          state.isDirty = true;
        });
        
        return id;
      },
      
      updateAnnotation: (id, updates) => {
        set(state => {
          const ann = state.annotations.get(id);
          if (ann) {
            Object.assign(ann, updates);
            state.isDirty = true;
          }
        });
      },
      
      deleteAnnotation: (id) => {
        set(state => {
          state.annotations.delete(id);
          if (state.selection.selectedAnnotationId === id) {
            state.selection.selectedAnnotationId = null;
          }
          state.isDirty = true;
        });
      },
      
      // ========================================
      // REGION OPERATIONS
      // ========================================
      
      addRegion: (x, y, width, height, name = 'Region') => {
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
          s.regions.set(id, region as never);
          s.isDirty = true;
        });
        
        return id;
      },
      
      updateRegion: (id, updates) => {
        set(state => {
          const region = state.regions.get(id);
          if (region) {
            Object.assign(region, updates);
            state.isDirty = true;
          }
        });
      },
      
      deleteRegion: (id) => {
        set(state => {
          state.regions.delete(id);
          if (state.selection.selectedRegionId === id) {
            state.selection.selectedRegionId = null;
          }
          state.isDirty = true;
        });
      },
      
      duplicateRegion: (id) => {
        const state = get();
        const region = state.regions.get(id);
        if (!region) return null;
        
        // Get region contents
        const contents = state.getRegionContents(id);
        
        // Try to place to the right
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
          // Try below
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
        
        // Create new region
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
        
        // Duplicate contents
        const nodeIdMap = new Map<NodeId, NodeId>();
        
        set(s => {
          s.regions.set(newId, newRegion as never);
          
          // Duplicate nodes
          contents.nodes.forEach(node => {
            const newNodeId = createNodeId();
            nodeIdMap.set(node.id, newNodeId);
            const newNode: GraphNode = {
              id: newNodeId,
              type: node.type,
              x: node.x + offsetX,
              y: node.y + offsetY,
              props: JSON.parse(JSON.stringify(node.props)),
              timer: 0,
              lastTrigger: 0,
              flash: 0,
              heldPackets: [],
            };
            s.nodes.set(newNodeId, newNode as never);
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
              s.edges.set(newEdgeId, newEdge as never);
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
            s.annotations.set(newAnnId, newAnn as never);
          });
          
          s.isDirty = true;
        });
        
        return newId;
      },
      
      getRegionContents: (id) => {
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
      
      // ========================================
      // SELECTION - ANNOTATIONS & REGIONS
      // ========================================
      
      selectAnnotation: (id) => {
        set(state => {
          state.selection.selectedAnnotationId = id;
          state.selection.selectedNodeIds = [];
          state.selection.selectedEdgeId = null;
          state.selection.selectedRegionId = null;
        });
      },
      
      selectRegion: (id) => {
        set(state => {
          state.selection.selectedRegionId = id;
          state.selection.selectedNodeIds = [];
          state.selection.selectedEdgeId = null;
          state.selection.selectedAnnotationId = null;
        });
      },
      
      setHoveredAnnotation: (id) => {
        set(state => {
          state.selection.hoveredAnnotationId = id;
        });
      },
      
      setHoveredRegion: (id, handle = null) => {
        set(state => {
          state.selection.hoveredRegionId = id;
          state.selection.hoveredRegionHandle = handle;
        });
      },
      
      setIsHoveringHandle: (hovering) => {
        set(state => {
          state.selection.isHoveringHandle = hovering;
        });
      },
      
      setDraggingAnnotation: (id) => {
        set(state => {
          state.selection.draggingAnnotationId = id;
        });
      },
      
      setDraggingRegion: (id) => {
        set(state => {
          state.selection.draggingRegionId = id;
        });
      },
      
      setResizingRegion: (id) => {
        set(state => {
          state.selection.resizingRegionId = id;
        });
      },
      
      setBoxSelecting: (selecting, start) => {
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
      
      updateBoxSelectEnd: (end) => {
        set(state => {
          state.selection.boxSelectEnd = end;
        });
      },
      
      setPendingLinkNode: (id) => {
        set(state => {
          state.pendingLinkNodeId = id;
        });
      },
      
      setContextMenuPos: (x, y) => {
        set(state => {
          state.contextMenuPos = x !== null && y !== null ? { x, y } : null;
        });
      },
      
      // ========================================
      // SCENE OPERATIONS
      // ========================================
      
      createScene: (name) => {
        const id = createSceneId();
        const sceneCount = get().scenes.size;
        const sceneName = name ?? `Scene ${sceneCount + 1}`;
        const scene = createDefaultScene(id, sceneName, sceneCount);
        
        set(state => {
          state.scenes.set(id, scene as any);
          state.isDirty = true;
        });
        
        return id;
      },
      
      duplicateScene: (id) => {
        const original = get().scenes.get(id);
        if (!original) return null;
        
        const newId = createSceneId();
        const newScene: Scene = {
          ...original,
          id: newId,
          name: `${original.name} (copy)`,
          nodes: original.nodes.map(n => ({ ...n, id: createNodeId() })),
          edges: [], // Edges need remapping - simplified for now
          annotations: original.annotations.map(a => ({ ...a, id: createAnnotationId() })),
          regions: original.regions.map(r => ({ ...r, id: createRegionId() })),
        };
        
        set(state => {
          state.scenes.set(newId, newScene as any);
          state.isDirty = true;
        });
        
        return newId;
      },
      
      deleteScene: (id) => {
        set(state => {
          state.scenes.delete(id);
          // Remove from arrangement
          state.arrangement = state.arrangement.filter(slot => slot.sceneId !== id);
          // Clear editing if this was the editing scene
          if (state.editingSceneId === id) {
            state.editingSceneId = null;
          }
          if (state.activeSceneId === id) {
            state.activeSceneId = null;
          }
          state.isDirty = true;
        });
      },
      
      updateScene: (id, updates) => {
        set(state => {
          const scene = state.scenes.get(id);
          if (scene) {
            Object.assign(scene, updates);
            state.isDirty = true;
          }
        });
      },
      
      saveCurrentToScene: (id) => {
        const { nodes, edges, annotations, regions } = get();
        
        set(state => {
          const scene = state.scenes.get(id);
          if (scene) {
            (scene as any).nodes = Array.from(nodes.values()).map(n => ({
              ...n,
              timer: 0,
              lastTrigger: 0,
              flash: 0,
              heldPackets: [],
            }));
            (scene as any).edges = Array.from(edges.values());
            (scene as any).annotations = Array.from(annotations.values());
            (scene as any).regions = Array.from(regions.values());
            state.isDirty = true;
          }
        });
      },
      
      loadSceneToCanvas: (id) => {
        // Don't reload if already editing this scene
        if (get().editingSceneId === id) {
          console.log(`[loadSceneToCanvas] Skipped - already editing scene ${id}`);
          return;
        }
        
        // Check scene exists
        if (!get().scenes.has(id)) {
          console.log(`[loadSceneToCanvas] Scene ${id} not found`);
          return;
        }
        
        console.log(`[loadSceneToCanvas] Loading scene ${id}, current editingSceneId: ${get().editingSceneId}`);
        
        set(state => {
          // Save current scene first (auto-save)
          const currentEditingId = state.editingSceneId;
          if (currentEditingId) {
            const currentScene = state.scenes.get(currentEditingId);
            if (currentScene) {
              (currentScene as any).nodes = Array.from(state.nodes.values()).map(n => ({
                ...n,
                timer: 0,
                lastTrigger: 0,
                flash: 0,
                heldPackets: [],
              }));
              (currentScene as any).edges = Array.from(state.edges.values());
              (currentScene as any).annotations = Array.from(state.annotations.values());
              (currentScene as any).regions = Array.from(state.regions.values());
            }
          }
          
          // Now get the scene to load (after auto-save, in case it was just saved)
          const scene = state.scenes.get(id);
          if (!scene) return;
          
          console.log(`[loadSceneToCanvas] Scene ${id} has ${scene.nodes.length} nodes, ${scene.edges.length} edges`);
          
          // Clear current canvas
          state.nodes.clear();
          state.edges.clear();
          state.annotations.clear();
          state.regions.clear();
          state.packets.clear();
          
          // Load scene content
          for (const node of scene.nodes) {
            const newNode = {
              ...node,
              timer: 0,
              lastTrigger: 0,
              flash: 0,
              heldPackets: [],
            };
            state.nodes.set(node.id, newNode as any);
          }
          for (const edge of scene.edges) {
            state.edges.set(edge.id, { ...edge } as any);
          }
          for (const annotation of scene.annotations) {
            state.annotations.set(annotation.id, { ...annotation } as any);
          }
          for (const region of scene.regions) {
            state.regions.set(region.id, { ...region } as any);
          }
          
          state.editingSceneId = id;
          state.selection.selectedNodeIds = [];
          state.selection.selectedEdgeId = null;
        });
      },
      
      setEditingScene: (id) => {
        set(state => {
          state.editingSceneId = id;
        });
      },
      
      // ========================================
      // ARRANGEMENT OPERATIONS
      // ========================================
      
      addToArrangement: (sceneId, startBeat) => {
        const scene = get().scenes.get(sceneId);
        if (!scene) return;
        
        // If adding the currently editing scene, save it first
        const editingId = get().editingSceneId;
        if (editingId === sceneId) {
          // Save current canvas to the scene
          const { nodes, edges, annotations, regions } = get();
          set(state => {
            const sceneToSave = state.scenes.get(sceneId);
            if (sceneToSave) {
              (sceneToSave as any).nodes = Array.from(nodes.values()).map(n => ({
                ...n,
                timer: 0,
                lastTrigger: 0,
                flash: 0,
                heldPackets: [],
              }));
              (sceneToSave as any).edges = Array.from(edges.values());
              (sceneToSave as any).annotations = Array.from(annotations.values());
              (sceneToSave as any).regions = Array.from(regions.values());
            }
          });
        }
        
        const arrangement = get().arrangement;
        const lastSlot = arrangement[arrangement.length - 1];
        const lastScene = lastSlot ? get().scenes.get(lastSlot.sceneId) : null;
        
        // Calculate start beat: either provided, or after the last slot
        const calculatedStart = startBeat ?? (
          lastSlot && lastScene 
            ? lastSlot.startBeat + (lastScene.durationBeats * lastScene.loopCount)
            : 0
        );
        
        const slot: ArrangementSlot = {
          id: crypto.randomUUID(),
          sceneId,
          startBeat: calculatedStart,
        };
        
        set(state => {
          state.arrangement.push(slot);
          state.isDirty = true;
        });
      },
      
      removeFromArrangement: (slotId) => {
        set(state => {
          state.arrangement = state.arrangement.filter(s => s.id !== slotId);
          state.isDirty = true;
        });
      },
      
      updateArrangementSlot: (slotId, updates) => {
        set(state => {
          const slot = state.arrangement.find(s => s.id === slotId);
          if (slot) {
            Object.assign(slot, updates);
            state.isDirty = true;
          }
        });
      },
      
      reorderArrangement: (slotId, newStartBeat) => {
        set(state => {
          const slot = state.arrangement.find(s => s.id === slotId);
          if (slot) {
            slot.startBeat = Math.max(0, newStartBeat);
            // Sort by start beat
            state.arrangement.sort((a, b) => a.startBeat - b.startBeat);
            state.isDirty = true;
          }
        });
      },
      
      clearArrangement: () => {
        set(state => {
          state.arrangement = [];
          state.isDirty = true;
        });
      },
      
      // ========================================
      // SCENE PLAYBACK
      // ========================================
      
      setPlaybackMode: (mode) => {
        set(state => {
          state.scenePlayback.mode = mode;
        });
      },
      
      setScenePlayback: (updates) => {
        set(state => {
          Object.assign(state.scenePlayback, updates);
        });
      },
      
      queueScene: (sceneId, quantize) => {
        set(state => {
          state.scenePlayback.queuedSceneId = sceneId;
          if (quantize) {
            state.scenePlayback.queueTrigger = quantize;
          }
        });
      },
      
      triggerSceneImmediate: (sceneId) => {
        const scene = get().scenes.get(sceneId);
        if (!scene) return;
        
        set(state => {
          state.scenePlayback.previousSceneId = state.scenePlayback.currentSceneId;
          state.scenePlayback.currentSceneId = sceneId;
          state.scenePlayback.sceneBeat = 0;
          state.scenePlayback.sceneLoopIteration = 0;
          state.scenePlayback.queuedSceneId = null;
          state.activeSceneId = sceneId;
          
          // Update effective settings
          const masterBpm = state.masterSpeed;
          const masterRoot = state.musicalContext.root;
          const masterScale = state.musicalContext.scaleName;
          
          state.scenePlayback.effectiveBpm = getEffectiveBpm(scene, masterBpm);
          state.scenePlayback.effectiveRoot = getEffectiveRoot(scene, masterRoot);
          state.scenePlayback.effectiveScale = getEffectiveScale(scene, masterScale);
        });
        
        // Load scene to canvas for playback
        get().loadSceneToCanvas(sceneId);
      },
      
      advanceSceneBeat: (deltaBeats) => {
        const { scenePlayback, scenes } = get();
        const currentScene = scenePlayback.currentSceneId 
          ? scenes.get(scenePlayback.currentSceneId) 
          : null;
        
        set(state => {
          state.scenePlayback.sceneBeat += deltaBeats;
          
          if (state.scenePlayback.mode === 'arrangement') {
            state.scenePlayback.arrangementBeat += deltaBeats;
          }
          
          // Check for queued scene trigger (Jam mode)
          if (state.scenePlayback.queuedSceneId && state.scenePlayback.mode === 'jam') {
            const quantize = state.scenePlayback.queueTrigger;
            const beat = state.scenePlayback.sceneBeat;
            const scene = currentScene;
            const phraseLength = scene?.jamTrigger.phraseLength ?? 4;
            
            let shouldTrigger = false;
            if (quantize === 'immediate') {
              shouldTrigger = true;
            } else if (quantize === 'beat') {
              shouldTrigger = Math.floor(beat) !== Math.floor(beat - deltaBeats);
            } else if (quantize === 'bar') {
              shouldTrigger = Math.floor(beat / 4) !== Math.floor((beat - deltaBeats) / 4);
            } else if (quantize === 'phrase') {
              shouldTrigger = Math.floor(beat / phraseLength) !== Math.floor((beat - deltaBeats) / phraseLength);
            }
            
            if (shouldTrigger) {
              // Will trigger on next tick via triggerSceneImmediate
            }
          }
          
          // Check for scene loop/advance in Arrangement mode
          // NOTE: Slot advancement is handled by updateArrangementMode in tick.ts
          // Here we only handle scene looping within a slot
          if (state.scenePlayback.mode === 'arrangement' && currentScene) {
            const sceneDuration = currentScene.durationBeats;
            const expectedLoop = Math.floor(state.scenePlayback.sceneBeat / sceneDuration);
            
            if (expectedLoop > state.scenePlayback.sceneLoopIteration) {
              // Loop within scene (if scene has multiple loops)
              const maxLoops = currentScene.loopCount;
              if (state.scenePlayback.sceneLoopIteration + 1 < maxLoops) {
                state.scenePlayback.sceneLoopIteration++;
              }
              // Note: actual slot transition is handled in updateArrangementMode
            }
          }
        });
      },
      
      // ========================================
      // SCENE GETTERS
      // ========================================
      
      getScene: (id) => get().scenes.get(id),
      
      getScenesArray: () => Array.from(get().scenes.values()),
      
      getArrangementSlot: (slotId) => get().arrangement.find(s => s.id === slotId),
      
      getCurrentScene: () => {
        const { scenePlayback, scenes } = get();
        return scenePlayback.currentSceneId 
          ? scenes.get(scenePlayback.currentSceneId) 
          : undefined;
      },
      
      getEffectiveSettings: () => {
        const { scenePlayback, masterSpeed, musicalContext } = get();
        return {
          bpm: scenePlayback.effectiveBpm || masterSpeed,
          root: scenePlayback.effectiveRoot ?? musicalContext.root,
          scale: scenePlayback.effectiveScale || musicalContext.scaleName,
        };
      },
      
      // ========================================
      // GETTERS
      // ========================================
      
      getNode: (id) => get().nodes.get(id),
      getEdge: (id) => get().edges.get(id),
      getAnnotation: (id) => get().annotations.get(id),
      getRegion: (id) => get().regions.get(id),
      
      getNodesArray: () => Array.from(get().nodes.values()),
      getEdgesArray: () => Array.from(get().edges.values()),
      getPacketsArray: () => Array.from(get().packets.values()),
      getAnnotationsArray: () => Array.from(get().annotations.values()),
      getRegionsArray: () => Array.from(get().regions.values()),
      
      getOutgoingEdges: (nodeId) => {
        const edges: GraphEdge[] = [];
        get().edges.forEach(e => {
          if (e.from === nodeId) edges.push(e);
        });
        return edges;
      },
      
      getIncomingEdges: (nodeId) => {
        const edges: GraphEdge[] = [];
        get().edges.forEach(e => {
          if (e.to === nodeId) edges.push(e);
        });
        return edges;
      },
      
      getConnectedEdges: (nodeId) => {
        const edges: GraphEdge[] = [];
        get().edges.forEach(e => {
          if (e.from === nodeId || e.to === nodeId) edges.push(e);
        });
        return edges;
      },
    }))
  )
);

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

// ============================================================================
// DIRECT STORE ACCESS (For canvas/audio, bypasses React)
// ============================================================================

export function getGraphStore() {
  return useGraphStore.getState();
}
