// Stochastic v2 - Status Bar Component

import React from 'react';
import { useGraphStore } from '@core/store';
import styles from './StatusBar.module.css';

// ============================================================================
// STATUS BAR
// ============================================================================

interface StatusBarProps {
  isAudioReady: boolean;
}

export function StatusBar({ isAudioReady }: StatusBarProps): React.ReactElement {
  const nodes = useGraphStore(state => state.nodes);
  const edges = useGraphStore(state => state.edges);
  const packets = useGraphStore(state => state.packets);
  const viewport = useGraphStore(state => state.viewport);
  const isDirty = useGraphStore(state => state.isDirty);
  const projectMeta = useGraphStore(state => state.projectMeta);
  
  return (
    <div className={styles.statusBar}>
      {/* Project name */}
      <div className={styles.section}>
        <span className={styles.projectName}>
          {projectMeta.name}
          {isDirty && <span className={styles.dirty}>●</span>}
        </span>
      </div>
      
      {/* Separator */}
      <div className={styles.separator} />
      
      {/* Graph stats */}
      <div className={styles.section}>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Nodes:</span>
          <span className={styles.statValue}>{nodes.size}</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Edges:</span>
          <span className={styles.statValue}>{edges.size}</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Packets:</span>
          <span className={styles.statValue}>{packets.size}</span>
        </span>
      </div>
      
      {/* Separator */}
      <div className={styles.separator} />
      
      {/* Viewport info */}
      <div className={styles.section}>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Zoom:</span>
          <span className={styles.statValue}>{Math.round(viewport.zoomLevel * 100)}%</span>
        </span>
      </div>
      
      {/* Spacer */}
      <div className={styles.spacer} />
      
      {/* Audio status */}
      <div className={styles.section}>
        <span className={`${styles.status} ${isAudioReady ? styles.ready : styles.notReady}`}>
          {isAudioReady ? '🔊 Audio Ready' : '🔇 Audio Suspended'}
        </span>
      </div>
      
      {/* Version */}
      <div className={styles.section}>
        <span className={styles.version}>Stochastic v0.5.0</span>
      </div>
    </div>
  );
}
