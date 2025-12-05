// Phonon v2 - Transport Bar Component

import React from 'react';
import { useGraphStore } from '@core/store';
import styles from './TransportBar.module.css';

// ============================================================================
// TRANSPORT BAR
// ============================================================================

export function TransportBar(): React.ReactElement {
  const isRunning = useGraphStore(state => state.isRunning);
  const isMuted = useGraphStore(state => state.isMuted);
  const masterSpeed = useGraphStore(state => state.masterSpeed);
  
  const togglePlayback = useGraphStore(state => state.togglePlayback);
  const setIsMuted = useGraphStore(state => state.setIsMuted);
  const setMasterSpeed = useGraphStore(state => state.setMasterSpeed);
  
  return (
    <div className={styles.transportBar}>
      {/* Play/Stop */}
      <button
        className={`${styles.transportButton} ${styles.playButton} ${isRunning ? styles.active : ''}`}
        onClick={togglePlayback}
        title={isRunning ? 'Stop (Space)' : 'Play (Space)'}
      >
        {isRunning ? '⏹' : '▶'}
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
      
      {/* BPM */}
      <div className={styles.bpmControl}>
        <label className={styles.bpmLabel}>BPM</label>
        <input
          type="number"
          className={styles.bpmInput}
          value={masterSpeed}
          min={20}
          max={300}
          step={1}
          onChange={e => setMasterSpeed(parseInt(e.target.value) || 120)}
        />
        <input
          type="range"
          className={styles.bpmSlider}
          value={masterSpeed}
          min={20}
          max={300}
          onChange={e => setMasterSpeed(parseInt(e.target.value))}
        />
      </div>
      
      {/* Spacer */}
      <div className={styles.spacer} />
      
      {/* Keyboard shortcuts hint */}
      <div className={styles.hints}>
        <span className={styles.hint}>Space: Play/Stop</span>
        <span className={styles.hint}>L: Link</span>
        <span className={styles.hint}>Del: Delete</span>
      </div>
    </div>
  );
}
