// Phonon - Right Panel Component
// Unified panel with toggle between Editor (Properties) and Visualisation modes

import React, { useState } from 'react';
import type { GraphNode, Annotation, Region, GraphEdge } from '@core/types';
import { PropertyPanel } from './PropertyPanel';
import { EdgePanel } from './EdgePanel';
import { VizPanelContent } from './VizPanel';
import styles from './RightPanel.module.css';

// ============================================================================
// RIGHT PANEL
// ============================================================================

type PanelMode = 'editor' | 'visualisation';

interface RightPanelProps {
  selectedNode?: GraphNode;
  selectedEdge?: GraphEdge;
  selectedAnnotation?: Annotation;
  selectedRegion?: Region;
}

export function RightPanel({ 
  selectedNode, 
  selectedEdge, 
  selectedAnnotation, 
  selectedRegion 
}: RightPanelProps): React.ReactElement {
  const [panelMode, setPanelMode] = useState<PanelMode>('editor');
  
  return (
    <div className={styles.panel}>
      {/* Mode Toggle */}
      <div className={styles.toggleHeader}>
        <button
          className={`${styles.toggleButton} ${panelMode === 'editor' ? styles.active : ''}`}
          onClick={() => setPanelMode('editor')}
        >
          Editor
        </button>
        <button
          className={`${styles.toggleButton} ${panelMode === 'visualisation' ? styles.active : ''}`}
          onClick={() => setPanelMode('visualisation')}
        >
          Visualisation
        </button>
      </div>
      
      {/* Panel Content */}
      <div className={styles.content}>
        {panelMode === 'editor' ? (
          // Editor mode - show property/edge panel
          selectedEdge ? (
            <EdgePanel edge={selectedEdge} embedded />
          ) : selectedNode ? (
            <PropertyPanel node={selectedNode} embedded />
          ) : selectedAnnotation ? (
            <PropertyPanel annotation={selectedAnnotation} embedded />
          ) : selectedRegion ? (
            <PropertyPanel region={selectedRegion} embedded />
          ) : (
            <PropertyPanel embedded />
          )
        ) : (
          // Visualisation mode - show viz panel content
          <VizPanelContent />
        )}
      </div>
    </div>
  );
}
