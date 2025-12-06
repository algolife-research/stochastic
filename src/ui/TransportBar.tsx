// Phonon v3 - Transport Bar Component

import React from 'react';
import { useGraphStore, selectScenePlayback, selectPlaybackMode } from '@core/store';
import styles from './TransportBar.module.css';

// ============================================================================
// TRANSPORT BAR
// ============================================================================

export function TransportBar(): React.ReactElement {
  const isRunning = useGraphStore(state => state.isRunning);
  const isMuted = useGraphStore(state => state.isMuted);
  const masterSpeed = useGraphStore(state => state.masterSpeed);
  const scenePlayback = useGraphStore(selectScenePlayback);
  const playbackMode = useGraphStore(selectPlaybackMode);
  
  const togglePlayback = useGraphStore(state => state.togglePlayback);
  const stopPlayback = useGraphStore(state => state.stopPlayback);
  const setIsMuted = useGraphStore(state => state.setIsMuted);
  const setMasterSpeed = useGraphStore(state => state.setMasterSpeed);
  const setPlaybackMode = useGraphStore(state => state.setPlaybackMode);
  
  // Format beat count for display
  const formatBeat = (beat: number): string => {
    const bar = Math.floor(beat / 4) + 1;
    const beatInBar = Math.floor(beat % 4) + 1;
    return `${bar}.${beatInBar}`;
  };
  
  // Get current position display
  const getPositionDisplay = (): string => {
    if (playbackMode === 'arrangement') {
      return formatBeat(scenePlayback.arrangementBeat);
    } else {
      return formatBeat(scenePlayback.sceneBeat);
    }
  };
  
  return (
    <div className={styles.transportBar}>
      {/* Play/Pause */}
      <button
        className={`${styles.transportButton} ${styles.playButton} ${isRunning ? styles.active : ''}`}
        onClick={togglePlayback}
        title={isRunning ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isRunning ? '⏸' : '▶'}
      </button>
      
      {/* Stop */}
      <button
        className={`${styles.transportButton} ${styles.stopButton}`}
        onClick={stopPlayback}
        title="Stop and Reset"
      >
        ⏹
      </button>
      
      {/* Mute */}
      <button
        className={`${styles.transportButton} ${isMuted ? styles.muted : ''}`}
        onClick={() => setIsMuted(!isMuted)}
        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      
      {/* Separator */}
      <div className={styles.separator} />
      
      {/* Playback Mode Toggle */}
      <div className={styles.modeControl}>
        <button
          className={`${styles.modeButton} ${playbackMode === 'arrangement' ? styles.activeMode : ''}`}
          onClick={() => setPlaybackMode('arrangement')}
          title="Arrangement Mode - Play through timeline"
        >
          📋 Arrange
        </button>
        <button
          className={`${styles.modeButton} ${playbackMode === 'jam' ? styles.activeMode : ''}`}
          onClick={() => setPlaybackMode('jam')}
          title="Jam Mode - Infinite looping with scene queuing"
        >
          🎵 Jam
        </button>
      </div>
      
      {/* Separator */}
      <div className={styles.separator} />
      
      {/* Position display */}
      <div className={styles.positionDisplay}>
        <span className={styles.positionLabel}>
          {playbackMode === 'arrangement' ? 'Arr' : 'Scene'}
        </span>
        <span className={styles.positionValue}>{getPositionDisplay()}</span>
        {playbackMode === 'jam' && scenePlayback.sceneLoopIteration > 0 && (
          <span className={styles.loopIndicator}>
            ×{scenePlayback.sceneLoopIteration + 1}
          </span>
        )}
      </div>
      
      {/* Separator */}
      <div className={styles.separator} />
      
      {/* BPM */}
      <div className={styles.bpmControl}>
        <label className={styles.bpmLabel}>BPM</label>
        <input
          type="number"
          className={styles.bpmInput}
          value={scenePlayback.currentSceneId !== null ? scenePlayback.effectiveBpm : masterSpeed}
          min={20}
          max={300}
          step={1}
          onChange={e => setMasterSpeed(parseInt(e.target.value) || 120)}
          disabled={scenePlayback.currentSceneId !== null && playbackMode === 'jam'}
          title={scenePlayback.currentSceneId !== null ? 'BPM controlled by scene' : 'Set global BPM'}
        />
        <input
          type="range"
          className={styles.bpmSlider}
          value={scenePlayback.currentSceneId !== null ? scenePlayback.effectiveBpm : masterSpeed}
          min={20}
          max={300}
          onChange={e => setMasterSpeed(parseInt(e.target.value))}
          disabled={scenePlayback.currentSceneId !== null && playbackMode === 'jam'}
        />
      </div>
      
      {/* Spacer */}
      <div className={styles.spacer} />
      
      {/* Queued scene indicator (Jam mode only) */}
      {playbackMode === 'jam' && scenePlayback.queuedSceneId && (
        <div className={styles.queuedIndicator}>
          <span className={styles.queuedLabel}>Queued:</span>
          <span className={styles.queuedTrigger}>@{scenePlayback.queueTrigger}</span>
        </div>
      )}
      
      {/* Keyboard shortcuts hint */}
      <div className={styles.hints}>
        <span className={styles.hint}>Space: Play/Stop</span>
        <span className={styles.hint}>Ctrl+C/V: Copy/Paste</span>
        <span className={styles.hint}>Del: Delete</span>
      </div>
    </div>
  );
}
