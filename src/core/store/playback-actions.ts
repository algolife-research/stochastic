// Playback Actions
// Operations for controlling playback state

import type { GraphStore, ImmerSet } from './types';

export const createPlaybackActions = (
  set: ImmerSet,
  get: () => GraphStore
) => ({
  setIsRunning: (running: boolean): void => {
    set(state => {
      state.isRunning = running;
    });
  },
  
  togglePlayback: (): void => {
    set(state => {
      state.isRunning = !state.isRunning;
    });
  },
  
  pausePlayback: (): void => {
    set(state => {
      state.isRunning = false;
    });
  },
  
  stopPlayback: (): void => {
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
  
  setIsMuted: (muted: boolean): void => {
    set(state => {
      state.isMuted = muted;
    });
    // Sync with audio engine
    import('@audio/engine').then(({ audioEngine }) => {
      audioEngine.setMuted(muted);
    });
  },
  
  setMasterSpeed: (bpm: number): void => {
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
});
