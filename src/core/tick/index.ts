// Phonon v3 - Game Tick System
// Handles source timers, packet movement, scene playback, and game loop

import { getGraphStore } from '../store';
import type { GraphNode } from '../types';
import { getEffectiveBpm, getEffectiveRoot, getEffectiveScale } from '../constants';

// Import modular components
import { 
  getLastTime, setLastTime, 
  getTickInterval, setTickInterval, 
  setBeatAccumulator,
  clearActiveChannelScenes
} from './state';
import { updateScenePlayback } from './scene-playback';
import { updateSources } from './sources';
import { updateLFOs } from './lfo';
import { updatePackets, updateNodeFlash, updateDelayNodes, cleanupEdgeSpawnRecords } from './packets';
import { updateVirtualChannelScenes } from './virtual-channels';

// Re-export types for external use
export type { ChannelSceneState, ActiveSlot } from './types';

// ============================================================================
// MAIN TICK FUNCTION
// ============================================================================

/**
 * Main game tick - called every frame when running
 */
export function tick(currentTime: number): void {
  try {
    const store = getGraphStore();
    if (!store.isRunning) return;
    
    const lastTime = getLastTime();
    const deltaTime = (currentTime - lastTime) / 1000;
    setLastTime(currentTime);
    
    // Clamp deltaTime to prevent huge jumps
    const dt = Math.min(deltaTime, 0.1);
    
    // Debug: Check state consistency
    if (store.nodes.size === 0) {
      console.warn('Tick: No nodes in store!');
      return;
    }
    
    // Update scene playback (beat tracking and scene transitions)
    updateScenePlayback(dt);
    
    // Update sources (emit packets)
    updateSources(currentTime);
    
    // Update LFOs (emit modulation packets)
    updateLFOs(currentTime);
    
    // Update packets (movement and arrival)
    updatePackets(dt);
    
    // Update node flash (visual decay)
    updateNodeFlash(dt);
    
    // Update delay nodes
    updateDelayNodes(currentTime);
    
    // Update virtual channel scenes (multi-channel audio)
    updateVirtualChannelScenes(currentTime, dt);
    
    // Periodically cleanup stale edge spawn records (every ~5s worth of frames)
    if (Math.random() < 0.003) {
      cleanupEdgeSpawnRecords();
    }
  } catch (error) {
    console.error('Tick error:', error);
  }
}

// ============================================================================
// TICK LIFECYCLE
// ============================================================================

/**
 * Start the tick system
 */
export function startTick(): void {
  setLastTime(performance.now());
  setBeatAccumulator(0);
  
  const runTick = () => {
    tick(performance.now());
    setTickInterval(requestAnimationFrame(runTick));
  };
  
  setTickInterval(requestAnimationFrame(runTick));
}

/**
 * Stop the tick system
 */
export function stopTick(): void {
  const tickInterval = getTickInterval();
  if (tickInterval !== null) {
    cancelAnimationFrame(tickInterval);
    setTickInterval(null);
  }
}

/**
 * Reset tick timing (call when starting playback)
 * @param resetPosition - If true, reset arrangement position to 0. Default false to allow resume.
 */
export function resetTick(resetPosition: boolean = false): void {
  setLastTime(performance.now());
  setBeatAccumulator(0);
  
  // Reset all node timers
  const store = getGraphStore();
  const now = performance.now();
  
  store.nodes.forEach((node) => {
    if (node.type === 'source') {
      store.updateNode(node.id, { lastTrigger: now } as Partial<GraphNode>);
    }
  });
  
  // Reset scene playback state only if explicitly requested
  const { scenePlayback, arrangement, scenes } = store;
  
  if (scenePlayback.mode === 'arrangement' && arrangement.length > 0) {
    // In arrangement mode, only reset position if explicitly requested
    if (resetPosition) {
      const firstSlot = arrangement[0];
      const scene = firstSlot ? scenes.get(firstSlot.sceneId) : undefined;
      
      store.setScenePlayback({
        arrangementBeat: 0,
        currentSlotIndex: 0,
        currentSceneId: firstSlot?.sceneId ?? null,
        sceneBeat: 0,
        sceneLoopIteration: 0,
        isTransitioning: false,
        transitionProgress: 0,
        effectiveBpm: scene ? getEffectiveBpm(scene, store.masterSpeed) : store.masterSpeed,
        effectiveRoot: scene ? getEffectiveRoot(scene, store.musicalContext.root) : store.musicalContext.root,
        effectiveScale: scene ? getEffectiveScale(scene, store.musicalContext.scaleName) : store.musicalContext.scaleName
      });
      
      // Load the first scene to canvas if in arrangement mode
      if (firstSlot) {
        store.loadSceneToCanvas(firstSlot.sceneId);
      }
      
      // Clear any existing virtual channel scenes
      clearActiveChannelScenes();
    } else {
      // Just update effective musical parameters for current position
      const currentBeat = scenePlayback.arrangementBeat;
      // Find the current slot based on beat position
      let currentSlot = null;
      for (const slot of arrangement) {
        const scene = scenes.get(slot.sceneId);
        if (!scene) continue;
        const loops = slot.instanceLoopCount ?? scene.loopCount;
        const slotEnd = slot.startBeat + scene.durationBeats * loops;
        if (currentBeat >= slot.startBeat && currentBeat < slotEnd) {
          currentSlot = slot;
          break;
        }
      }
      
      if (currentSlot) {
        const scene = scenes.get(currentSlot.sceneId);
        if (scene) {
          store.setScenePlayback({
            effectiveBpm: getEffectiveBpm(scene, store.masterSpeed),
            effectiveRoot: getEffectiveRoot(scene, store.musicalContext.root),
            effectiveScale: getEffectiveScale(scene, store.musicalContext.scaleName)
          });
        }
      }
    }
  } else if (scenePlayback.mode === 'jam') {
    // In jam mode, use the editing scene if currentSceneId is not set
    const jamSceneId = scenePlayback.currentSceneId ?? store.editingSceneId;
    const currentScene = jamSceneId ? scenes.get(jamSceneId) : undefined;
    
    store.setScenePlayback({
      currentSceneId: jamSceneId,  // Ensure currentSceneId is set!
      sceneBeat: 0,
      sceneLoopIteration: 0,
      isTransitioning: false,
      transitionProgress: 0,
      effectiveBpm: currentScene ? getEffectiveBpm(currentScene, store.masterSpeed) : store.masterSpeed,
      effectiveRoot: currentScene ? getEffectiveRoot(currentScene, store.musicalContext.root) : store.musicalContext.root,
      effectiveScale: currentScene ? getEffectiveScale(currentScene, store.musicalContext.scaleName) : store.musicalContext.scaleName
    });
  }
}
