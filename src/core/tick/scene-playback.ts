// Scene Playback Module
// Handles scene transitions, arrangement mode, and jam mode

import { getGraphStore } from '../store';
import type { SceneQuantize, NodeId, EdgeId, GraphNode, GraphEdge } from '../types';
import { getEffectiveBpm, getEffectiveRoot, getEffectiveScale } from '../constants';
import { 
  addToBeatAccumulator, 
  getActiveChannelScenes, 
  setActiveChannelScene, 
  deleteActiveChannelScene, 
  clearActiveChannelScenes,
  getCanvasChannelIndex,
  setCanvasChannelIndex
} from './state';
import type { ActiveSlot } from './types';

// ============================================================================
// SCENE PLAYBACK
// ============================================================================

/**
 * Update scene playback - tracks beats and handles scene transitions
 */
export function updateScenePlayback(dt: number): void {
  const store = getGraphStore();
  const { scenePlayback } = store;
  
  // Get effective BPM from the current scene or global settings
  const effectiveBpm = scenePlayback.effectiveBpm;
  const beatsPerSecond = effectiveBpm / 60;
  const deltaBeats = dt * beatsPerSecond;
  
  // Accumulate beats
  addToBeatAccumulator(deltaBeats);
  
  // Advance scene beat tracking
  store.advanceSceneBeat(deltaBeats);
  
  if (scenePlayback.mode === 'arrangement') {
    updateArrangementMode(deltaBeats);
  } else {
    updateJamMode(deltaBeats);
  }
}

/**
 * Update arrangement mode - multi-channel scene playback
 * Multiple scenes can play simultaneously on different channels
 */
function updateArrangementMode(_deltaBeats: number): void {
  const store = getGraphStore();
  const { scenePlayback, scenes, arrangement, arrangementChannels } = store;
  
  if (arrangement.length === 0) return;
  
  const currentBeat = scenePlayback.arrangementBeat;
  
  // Calculate which slots are active at the current beat (across all channels)
  const activeSlots: ActiveSlot[] = [];
  let maxEndBeat = 0;
  
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) continue;
    
    // Check if channel is muted
    const channel = arrangementChannels[slot.channel];
    if (channel?.muted) continue;
    
    // Check for solo mode - if any channel is soloed, only play soloed channels
    const hasSolo = arrangementChannels.some(c => c.solo);
    if (hasSolo && !channel?.solo) continue;
    
    const loops = slot.instanceLoopCount ?? scene.loopCount;
    const slotDuration = scene.durationBeats * loops;
    const slotStart = slot.startBeat;
    const slotEnd = slotStart + slotDuration;
    
    if (slotEnd > maxEndBeat) maxEndBeat = slotEnd;
    
    // Check if this slot is active at current beat
    if (currentBeat >= slotStart && currentBeat < slotEnd) {
      activeSlots.push({
        slotId: slot.id,
        sceneId: slot.sceneId,
        channelIndex: slot.channel,
        startBeat: slotStart,
        endBeat: slotEnd,
        localBeat: currentBeat - slotStart,
        loops
      });
    }
  }
  
  // Check if arrangement is complete
  if (maxEndBeat > 0 && currentBeat >= maxEndBeat) {
    store.togglePlayback();
    store.setScenePlayback({
      arrangementBeat: 0,
      currentSlotIndex: 0,
      activeChannels: []
    });
    clearActiveChannelScenes();
    return;
  }
  
  // Update active channel states
  const newActiveChannels = activeSlots.map(slot => ({
    channelIndex: slot.channelIndex,
    currentSlotId: slot.slotId,
    sceneBeat: slot.localBeat % (scenes.get(slot.sceneId)?.durationBeats ?? 16),
    sceneLoopIteration: Math.floor(slot.localBeat / (scenes.get(slot.sceneId)?.durationBeats ?? 16)),
    isTransitioning: false,
    transitionProgress: 0
  }));
  
  // Only update if channel states have changed
  const prevActiveIds = scenePlayback.activeChannels.map(c => c.currentSlotId).sort().join(',');
  const newActiveIds = newActiveChannels.map(c => c.currentSlotId).sort().join(',');
  
  if (prevActiveIds !== newActiveIds) {
    store.setScenePlayback({ activeChannels: newActiveChannels });
    
    // Set canvas channel FIRST (before updating virtual scenes)
    // The primary slot (first active slot by channel order) goes to canvas
    if (activeSlots.length > 0 && activeSlots[0]) {
      const primarySlot = activeSlots[0];
      setCanvasChannelIndex(primarySlot.channelIndex);
      store.loadSceneToCanvas(primarySlot.sceneId);

      // Re-resolve the effective musical context for the new canvas scene —
      // scene overrides and per-slot instanceBpm apply on slot transitions,
      // not only at play start
      const scene = store.scenes.get(primarySlot.sceneId);
      if (scene) {
        const slotRecord = store.arrangement.find(s => s.id === primarySlot.slotId);
        store.setScenePlayback({
          effectiveBpm: slotRecord?.instanceBpm ?? getEffectiveBpm(scene, store.masterSpeed),
          effectiveRoot: getEffectiveRoot(scene, store.musicalContext.root),
          effectiveScale: getEffectiveScale(scene, store.musicalContext.scaleName),
        });
      }
    }
    
    // Update virtual channel scenes (for non-canvas channels)
    updateActiveChannelScenes(activeSlots);
  }
  
  // For backward compatibility, also set currentSceneId if there's at least one active
  if (activeSlots.length > 0 && activeSlots[0]) {
    const primarySlot = activeSlots[0];
    if (scenePlayback.currentSceneId !== primarySlot.sceneId) {
      store.setScenePlayback({
        currentSceneId: primarySlot.sceneId,
        currentSlotIndex: arrangement.findIndex(s => s.id === primarySlot.slotId),
        sceneBeat: primarySlot.localBeat % (scenes.get(primarySlot.sceneId)?.durationBeats ?? 16)
      });
    }
  }
}

/**
 * Update the virtual scene states for non-canvas channels
 */
function updateActiveChannelScenes(activeSlots: ActiveSlot[]): void {
  const store = getGraphStore();
  const { scenes } = store;
  const activeChannelScenes = getActiveChannelScenes();
  const canvasChannelIndex = getCanvasChannelIndex();
  
  // Clear old channel scenes that are no longer active
  const activeChannelIndices = new Set(activeSlots.map(s => s.channelIndex));
  for (const [channelIndex] of activeChannelScenes) {
    if (!activeChannelIndices.has(channelIndex)) {
      deleteActiveChannelScene(channelIndex);
    }
  }
  
  // Create/update channel scenes for non-canvas channels
  for (const slot of activeSlots) {
    // Skip the canvas channel - it uses the main store
    if (slot.channelIndex === canvasChannelIndex) continue;
    
    const scene = scenes.get(slot.sceneId);
    if (!scene) continue;
    
    // Check if we need to create/update this channel's state
    const existing = activeChannelScenes.get(slot.channelIndex);
    if (!existing || existing.sceneId !== slot.sceneId) {
      // Create new virtual scene state
      const nodes = new Map<NodeId, GraphNode>();
      const edges = new Map<EdgeId, GraphEdge>();
      
      // Clone scene nodes with fresh state
      for (const nodeData of scene.nodes) {
        const node: GraphNode = {
          ...nodeData,
          id: nodeData.id as NodeId,
          timer: 0,
          lastTrigger: 0,
          flash: 0,
          heldPackets: [],
        };
        nodes.set(node.id, node);
      }
      
      // Clone scene edges
      for (const edgeData of scene.edges) {
        edges.set(edgeData.id as EdgeId, edgeData as GraphEdge);
      }
      
      setActiveChannelScene(slot.channelIndex, {
        sceneId: slot.sceneId,
        channelIndex: slot.channelIndex,
        nodes,
        edges,
        packets: new Map(),
        localBeat: slot.localBeat,
      });
    } else {
      // Update local beat
      existing.localBeat = slot.localBeat;
    }
  }
}

/**
 * Update jam mode - infinite looping with scene queuing
 */
function updateJamMode(deltaBeats: number): void {
  const store = getGraphStore();
  const { scenePlayback, scenes } = store;
  
  if (!scenePlayback.currentSceneId) return;
  
  const currentScene = scenes.get(scenePlayback.currentSceneId);
  if (!currentScene) return;
  
  const sceneDuration = currentScene.durationBeats;
  const currentBeat = scenePlayback.sceneBeat;
  
  // Check if we should trigger the queued scene
  if (scenePlayback.queuedSceneId) {
    const shouldTrigger = checkQueueTrigger(
      currentBeat,
      deltaBeats,
      sceneDuration,
      scenePlayback.queueTrigger,
      currentScene.jamTrigger.phraseLength
    );
    
    if (shouldTrigger) {
      // Transition to queued scene
      const nextSceneId = scenePlayback.queuedSceneId;
      const nextScene = scenes.get(nextSceneId);
      
      if (nextScene) {
        // Load the next scene
        store.loadSceneToCanvas(nextSceneId);
        
        // Update playback state
        const globalBpm = store.masterSpeed;
        const globalRoot = store.musicalContext.root;
        const globalScale = store.musicalContext.scaleName;
        
        store.setScenePlayback({
          currentSceneId: nextSceneId,
          sceneBeat: 0,
          sceneLoopIteration: 0,
          queuedSceneId: null,
          effectiveBpm: getEffectiveBpm(nextScene, globalBpm),
          effectiveRoot: getEffectiveRoot(nextScene, globalRoot),
          effectiveScale: getEffectiveScale(nextScene, globalScale)
        });
      }
      return;
    }
  }
  
  // Check for scene loop
  if (currentBeat >= sceneDuration) {
    const newLoop = scenePlayback.sceneLoopIteration + 1;
    
    // In jam mode, scenes loop infinitely
    store.setScenePlayback({
      sceneBeat: currentBeat - sceneDuration,
      sceneLoopIteration: newLoop
    });
  }
}

/**
 * Check if a queued scene should be triggered based on quantize settings
 */
function checkQueueTrigger(
  currentBeat: number,
  deltaBeat: number,
  sceneDuration: number,
  quantize: SceneQuantize,
  phraseLength: number
): boolean {
  const prevBeat = currentBeat - deltaBeat;
  
  switch (quantize) {
    case 'immediate':
      return true;
      
    case 'beat':
      // Trigger on any beat boundary
      return Math.floor(currentBeat) > Math.floor(prevBeat);
      
    case 'bar':
      // Trigger on bar boundary (4 beats)
      return Math.floor(currentBeat / 4) > Math.floor(prevBeat / 4);
      
    case 'phrase': {
      // Trigger on phrase boundary (custom phrase length, default to scene duration)
      const pLen = phraseLength > 0 ? phraseLength : sceneDuration;
      return Math.floor(currentBeat / pLen) > Math.floor(prevBeat / pLen);
    }
      
    default:
      return false;
  }
}
