// Scene Actions
// Operations for scene management, arrangement, and playback

import { castDraft } from 'immer';
import type { GraphStore, ImmerSet } from './types';
import type { 
  SceneId, Scene,
  ArrangementSlot, ArrangementChannel, PlaybackMode, SceneQuantize, VizMode, VizConfig
} from '../types';
import { createSceneId, createNodeId, createAnnotationId, createRegionId } from '../types';
import { 
  createDefaultScene, INITIAL_SCENE_PLAYBACK_STATE,
  getEffectiveBpm, getEffectiveRoot, getEffectiveScale
} from '../constants';
import { defaultSelectionState } from './initial-state';
import { getDefaultVizConfig } from '../store/viz-config';

export const createSceneActions = (
  set: ImmerSet,
  get: () => GraphStore
) => ({
  // ========================================
  // SCENE CRUD
  // ========================================
  
  createScene: (name?: string): SceneId => {
    const id = createSceneId();
    const sceneCount = get().scenes.size;
    const sceneName = name ?? `Scene ${sceneCount + 1}`;
    const scene = createDefaultScene(id, sceneName, sceneCount);
    
    set(state => {
      state.scenes.set(id, castDraft(scene));
      state.isDirty = true;
    });
    
    return id;
  },
  
  duplicateScene: (id: SceneId): SceneId | null => {
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
      state.scenes.set(newId, castDraft(newScene));
      state.isDirty = true;
    });
    
    return newId;
  },
  
  deleteScene: (id: SceneId): void => {
    set(state => {
      state.scenes.delete(id);
      state.arrangement = state.arrangement.filter(slot => slot.sceneId !== id);
      if (state.editingSceneId === id) {
        state.editingSceneId = null;
      }
      if (state.activeSceneId === id) {
        state.activeSceneId = null;
      }
      state.isDirty = true;
    });
  },
  
  reorderScenes: (fromId: SceneId, toId: SceneId): void => {
    set(state => {
      // Get scenes as plain array (need to extract from Immer draft)
      const scenesArray: [SceneId, Scene][] = [];
      state.scenes.forEach((scene, id) => {
        scenesArray.push([id, JSON.parse(JSON.stringify(scene))]);
      });
      
      const fromIndex = scenesArray.findIndex(([id]) => id === fromId);
      const toIndex = scenesArray.findIndex(([id]) => id === toId);
      
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
      
      // Remove the dragged scene
      const [removed] = scenesArray.splice(fromIndex, 1);
      if (!removed) return;
      
      // Insert at toIndex - works for both drag up and drag down
      scenesArray.splice(toIndex, 0, removed);
      
      // Clear and rebuild the Map to preserve new order (Immer-compatible)
      state.scenes.clear();
      for (const [id, scene] of scenesArray) {
        state.scenes.set(id, castDraft(scene));
      }
      state.isDirty = true;
    });
  },
  
  updateScene: (id: SceneId, updates: Partial<Scene>): void => {
    set(state => {
      const scene = state.scenes.get(id);
      if (scene) {
        Object.assign(scene, updates);
        state.isDirty = true;
      }
    });
  },
  
  saveCurrentToScene: (id: SceneId): void => {
    const { nodes, edges, annotations, regions } = get();
    
    set(state => {
      const scene = state.scenes.get(id);
      if (scene) {
        scene.nodes = castDraft(Array.from(nodes.values()).map(n => ({
          ...n,
          timer: 0,
          lastTrigger: 0,
          flash: 0,
          heldPackets: [],
        })));
        scene.edges = castDraft(Array.from(edges.values()));
        scene.annotations = castDraft(Array.from(annotations.values()));
        scene.regions = castDraft(Array.from(regions.values()));
        state.isDirty = true;
      }
    });
  },
  
  loadSceneToCanvas: (id: SceneId): void => {
    if (get().editingSceneId === id) return;
    if (!get().scenes.has(id)) return;
    
    set(state => {
      // Save current scene first (auto-save)
      const currentEditingId = state.editingSceneId;
      if (currentEditingId) {
        const currentScene = state.scenes.get(currentEditingId);
        if (currentScene) {
          currentScene.nodes = castDraft(Array.from(state.nodes.values()).map(n => ({
            ...n,
            timer: 0,
            lastTrigger: 0,
            flash: 0,
            heldPackets: [],
          })));
          currentScene.edges = castDraft(Array.from(state.edges.values()));
          currentScene.annotations = castDraft(Array.from(state.annotations.values()));
          currentScene.regions = castDraft(Array.from(state.regions.values()));
        }
      }
      
      const scene = state.scenes.get(id);
      if (!scene) return;
      
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
        state.nodes.set(node.id, castDraft(newNode));
      }
      for (const edge of scene.edges) {
        state.edges.set(edge.id, castDraft({ ...edge }));
      }
      for (const annotation of scene.annotations) {
        state.annotations.set(annotation.id, castDraft({ ...annotation }));
      }
      for (const region of scene.regions) {
        state.regions.set(region.id, castDraft({ ...region }));
      }
      
      state.editingSceneId = id;
      state.selection.selectedNodeIds = [];
      state.selection.selectedEdgeId = null;
    });
  },
  
  setEditingScene: (id: SceneId | null): void => {
    set(state => {
      state.editingSceneId = id;
    });
  },
  
  loadComposition: (
    scenes: Scene[], 
    arrangement: ArrangementSlot[], 
    channels: ArrangementChannel[], 
    masterBpm: number
  ): void => {
    set(state => {
      // Clear existing state
      state.nodes.clear();
      state.edges.clear();
      state.packets.clear();
      state.annotations.clear();
      state.regions.clear();
      state.scenes.clear();
      state.arrangement = [];
      state.arrangementChannels = [];
      state.activeSceneId = null;
      state.editingSceneId = null;
      state.scenePlayback = { ...INITIAL_SCENE_PLAYBACK_STATE };
      state.selection = defaultSelectionState();
      
      // Load scenes
      for (const scene of scenes) {
        state.scenes.set(scene.id, JSON.parse(JSON.stringify(scene)));
      }
      
      // Load arrangement
      state.arrangement = arrangement.map(slot => ({ ...slot }));
      
      // Load channels
      state.arrangementChannels = channels.map(ch => ({ ...ch }));
      
      // Set master BPM
      state.masterSpeed = masterBpm;
    });
    
    // Load first scene to canvas
    const firstScene = scenes[0];
    if (firstScene) {
      const firstSceneId = firstScene.id;
      set(state => {
        const scene = state.scenes.get(firstSceneId);
        if (!scene) return;
        
        for (const node of scene.nodes) {
          state.nodes.set(node.id, castDraft({ ...node, timer: 0, lastTrigger: 0, flash: 0, heldPackets: [] }));
        }
        for (const edge of scene.edges) {
          state.edges.set(edge.id, castDraft({ ...edge }));
        }
        for (const annotation of scene.annotations) {
          state.annotations.set(annotation.id, castDraft({ ...annotation }));
        }
        for (const region of scene.regions) {
          state.regions.set(region.id, castDraft({ ...region }));
        }
        
        state.editingSceneId = firstSceneId;
      });
    }
  },
  
  // ========================================
  // ARRANGEMENT OPERATIONS
  // ========================================
  
  addToArrangement: (sceneId: SceneId, startBeat?: number, channel: number = 0): void => {
    const scene = get().scenes.get(sceneId);
    if (!scene) return;
    
    // If adding the currently editing scene, save it first
    const editingId = get().editingSceneId;
    if (editingId === sceneId) {
      const { nodes, edges, annotations, regions } = get();
      set(state => {
        const sceneToSave = state.scenes.get(sceneId);
        if (sceneToSave) {
          sceneToSave.nodes = castDraft(Array.from(nodes.values()).map(n => ({
            ...n, timer: 0, lastTrigger: 0, flash: 0, heldPackets: [],
          })));
          sceneToSave.edges = castDraft(Array.from(edges.values()));
          sceneToSave.annotations = castDraft(Array.from(annotations.values()));
          sceneToSave.regions = castDraft(Array.from(regions.values()));
        }
      });
    }
    
    const arrangement = get().arrangement;
    const channelSlots = arrangement.filter(s => s.channel === channel);
    const lastSlot = channelSlots[channelSlots.length - 1];
    const lastScene = lastSlot ? get().scenes.get(lastSlot.sceneId) : null;
    
    const calculatedStart = startBeat ?? (
      lastSlot && lastScene 
        ? lastSlot.startBeat + (lastScene.durationBeats * lastScene.loopCount)
        : 0
    );
    
    const slot: ArrangementSlot = {
      id: crypto.randomUUID(),
      sceneId,
      startBeat: calculatedStart,
      channel,
    };
    
    set(state => {
      state.arrangement.push(slot);
      state.isDirty = true;
    });
  },
  
  removeFromArrangement: (slotId: string): void => {
    set(state => {
      state.arrangement = state.arrangement.filter(s => s.id !== slotId);
      state.isDirty = true;
    });
  },
  
  updateArrangementSlot: (slotId: string, updates: Partial<ArrangementSlot>): void => {
    set(state => {
      const slot = state.arrangement.find(s => s.id === slotId);
      if (slot) {
        Object.assign(slot, updates);
        state.isDirty = true;
      }
    });
  },
  
  reorderArrangement: (slotId: string, newStartBeat: number): void => {
    set(state => {
      const slot = state.arrangement.find(s => s.id === slotId);
      if (slot) {
        slot.startBeat = Math.max(0, newStartBeat);
        state.arrangement.sort((a, b) => a.startBeat - b.startBeat);
        state.isDirty = true;
      }
    });
  },
  
  clearArrangement: (): void => {
    set(state => {
      state.arrangement = [];
      state.isDirty = true;
    });
  },
  
  // ========================================
  // CHANNEL OPERATIONS
  // ========================================
  
  addArrangementChannel: (): void => {
    set(state => {
      const channelCount = state.arrangementChannels.length;
      const colors = ['#4fc3f7', '#ab47bc', '#66bb6a', '#ffa726', '#ef5350', '#26c6da'];
      state.arrangementChannels.push({
        id: crypto.randomUUID(),
        name: `Track ${channelCount + 1}`,
        color: colors[channelCount % colors.length]!,
        muted: false,
        solo: false,
        volume: 1,
      });
      state.isDirty = true;
    });
  },
  
  removeArrangementChannel: (channelId: string): void => {
    set(state => {
      const channelIndex = state.arrangementChannels.findIndex(c => c.id === channelId);
      if (channelIndex === -1 || state.arrangementChannels.length <= 1) return;
      
      state.arrangement = state.arrangement.filter(s => s.channel !== channelIndex);
      
      state.arrangement.forEach(slot => {
        if (slot.channel > channelIndex) {
          slot.channel--;
        }
      });
      
      state.arrangementChannels.splice(channelIndex, 1);
      state.isDirty = true;
    });
  },
  
  updateArrangementChannel: (channelId: string, updates: Partial<ArrangementChannel>): void => {
    set(state => {
      const channel = state.arrangementChannels.find(c => c.id === channelId);
      if (channel) {
        Object.assign(channel, updates);
        state.isDirty = true;
      }
    });
  },
  
  // ========================================
  // SCENE PLAYBACK
  // ========================================
  
  setPlaybackMode: (mode: PlaybackMode): void => {
    set(state => {
      state.scenePlayback.mode = mode;
      if (mode === 'jam' && state.scenePlayback.currentSceneId === null && state.editingSceneId) {
        state.scenePlayback.currentSceneId = state.editingSceneId;
      }
    });
  },
  
  setScenePlayback: (updates: Partial<typeof INITIAL_SCENE_PLAYBACK_STATE>): void => {
    set(state => {
      Object.assign(state.scenePlayback, updates);
    });
  },

  seekArrangement: (targetBeat: number): void => {
    const state = get();
    const { arrangement, scenes } = state;
    
    if (arrangement.length === 0) return;

    let currentBeat = 0;
    let foundSlotIndex = -1;
    let beatInSlot = 0;

    for (let i = 0; i < arrangement.length; i++) {
      const slot = arrangement[i];
      if (!slot) continue;
      const scene = scenes.get(slot.sceneId);
      if (!scene) continue;

      const loops = slot.instanceLoopCount ?? scene.loopCount;
      const duration = scene.durationBeats * loops;
      
      if (targetBeat >= currentBeat && targetBeat < currentBeat + duration) {
        foundSlotIndex = i;
        beatInSlot = targetBeat - currentBeat;
        break;
      }
      
      currentBeat += duration;
    }

    if (foundSlotIndex === -1) {
      if (targetBeat >= currentBeat) {
         foundSlotIndex = arrangement.length - 1;
         set(s => {
           s.scenePlayback.arrangementBeat = currentBeat;
           s.scenePlayback.currentSlotIndex = arrangement.length;
           s.isRunning = false;
         });
         return;
      } else {
         foundSlotIndex = 0;
         beatInSlot = 0;
      }
    }

    const slot = arrangement[foundSlotIndex];
    if (!slot) return;
    
    const scene = scenes.get(slot.sceneId);
    
    if (slot && scene) {
      const sceneDuration = scene.durationBeats;
      const loopIteration = Math.floor(beatInSlot / sceneDuration);
      const sceneBeat = beatInSlot % sceneDuration;

      set(s => {
        s.scenePlayback.arrangementBeat = targetBeat;
        s.scenePlayback.currentSlotIndex = foundSlotIndex;
        s.scenePlayback.currentSceneId = slot.sceneId;
        s.scenePlayback.sceneBeat = sceneBeat;
        s.scenePlayback.sceneLoopIteration = loopIteration;
        
        if (s.activeSceneId !== slot.sceneId) {
           s.nodes.clear();
           s.edges.clear();
           s.annotations.clear();
           s.regions.clear();
           s.packets.clear();
           
           for (const node of scene.nodes) {
             s.nodes.set(node.id, castDraft({ ...node, timer: 0, lastTrigger: 0, flash: 0, heldPackets: [] }));
           }
           for (const edge of scene.edges) {
             s.edges.set(edge.id, castDraft({ ...edge }));
           }
           for (const annotation of scene.annotations) {
             s.annotations.set(annotation.id, castDraft({ ...annotation }));
           }
           for (const region of scene.regions) {
             s.regions.set(region.id, castDraft({ ...region }));
           }
           
           s.editingSceneId = slot.sceneId;
           s.selection.selectedNodeIds = [];
           s.selection.selectedEdgeId = null;
        }
      });
    }
  },
  
  queueScene: (sceneId: SceneId, quantize?: SceneQuantize): void => {
    set(state => {
      state.scenePlayback.queuedSceneId = sceneId;
      if (quantize) {
        state.scenePlayback.queueTrigger = quantize;
      }
    });
  },
  
  triggerSceneImmediate: (sceneId: SceneId): void => {
    const scene = get().scenes.get(sceneId);
    if (!scene) return;
    
    set(state => {
      state.scenePlayback.previousSceneId = state.scenePlayback.currentSceneId;
      state.scenePlayback.currentSceneId = sceneId;
      state.scenePlayback.sceneBeat = 0;
      state.scenePlayback.sceneLoopIteration = 0;
      state.scenePlayback.queuedSceneId = null;
      state.activeSceneId = sceneId;
      
      const masterBpm = state.masterSpeed;
      const masterRoot = state.musicalContext.root;
      const masterScale = state.musicalContext.scaleName;
      
      state.scenePlayback.effectiveBpm = getEffectiveBpm(scene, masterBpm);
      state.scenePlayback.effectiveRoot = getEffectiveRoot(scene, masterRoot);
      state.scenePlayback.effectiveScale = getEffectiveScale(scene, masterScale);
    });
    
    get().loadSceneToCanvas(sceneId);
  },
  
  advanceSceneBeat: (deltaBeats: number): void => {
    const { scenePlayback, scenes } = get();
    const currentScene = scenePlayback.currentSceneId 
      ? scenes.get(scenePlayback.currentSceneId) 
      : null;
    
    set(state => {
      state.scenePlayback.sceneBeat += deltaBeats;
      
      if (state.scenePlayback.mode === 'arrangement') {
        state.scenePlayback.arrangementBeat += deltaBeats;
      }
      
      if (state.scenePlayback.mode === 'arrangement' && currentScene) {
        const sceneDuration = currentScene.durationBeats;
        const expectedLoop = Math.floor(state.scenePlayback.sceneBeat / sceneDuration);
        
        if (expectedLoop > state.scenePlayback.sceneLoopIteration) {
          const maxLoops = currentScene.loopCount;
          if (state.scenePlayback.sceneLoopIteration + 1 < maxLoops) {
            state.scenePlayback.sceneLoopIteration++;
          }
        }
      }
    });
  },
  
  // ========================================
  // VISUALIZATION
  // ========================================
  
  setVizMode: (isVizMode: boolean): void => {
    set(state => {
      state.vizDisplay.isVizMode = isVizMode;
      if (!isVizMode) {
        state.vizDisplay.previewMode = false;
      }
    });
  },
  
  setVizPreview: (previewMode: boolean): void => {
    set(state => {
      state.vizDisplay.previewMode = previewMode;
    });
  },
  
  toggleVizMode: (): void => {
    set(state => {
      state.vizDisplay.isVizMode = !state.vizDisplay.isVizMode;
      if (!state.vizDisplay.isVizMode) {
        state.vizDisplay.previewMode = false;
      }
    });
  },
  
  updateSceneVizMode: (sceneId: SceneId, vizMode: VizMode): void => {
    set(state => {
      const scene = state.scenes.get(sceneId);
      if (scene) {
        scene.vizMode = vizMode;
        if (vizMode === 'editor') {
          scene.vizConfig = null;
        } else if (!scene.vizConfig || scene.vizConfig.mode !== vizMode) {
          const defaultConfig = getDefaultVizConfig(vizMode);
          scene.vizConfig = defaultConfig ? JSON.parse(JSON.stringify(defaultConfig)) : null;
        }
        state.isDirty = true;
      }
    });
  },
  
  updateSceneVizConfig: (sceneId: SceneId, vizConfig: VizConfig | null): void => {
    set(state => {
      const scene = state.scenes.get(sceneId);
      if (scene) {
        scene.vizConfig = vizConfig ? JSON.parse(JSON.stringify(vizConfig)) : null;
        state.isDirty = true;
      }
    });
  },
});
