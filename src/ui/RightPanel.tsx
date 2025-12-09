// Phonon - Right Panel Component
// Unified panel with toggle between Editor (Properties), Visualisation, and Scene modes

import React, { useState } from 'react';
import type { GraphNode, Annotation, Region, GraphEdge } from '@core/types';
import { PropertyPanel } from './property-panels';
import { EdgePanel } from './EdgePanel';
import { VizPanelContent } from './VizPanel';
import { ScenePropertiesPanel } from './ScenePropertiesPanel';
import styles from './RightPanel.module.css';

// ============================================================================
// RIGHT PANEL
// ============================================================================

type PanelMode = 'editor' | 'visualisation' | 'scene';

interface RightPanelProps {
  selectedNode?: GraphNode;
  selectedEdge?: GraphEdge;
  selectedAnnotation?: Annotation;
  selectedRegion?: Region;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function RightPanel({ 
  selectedNode, 
  selectedEdge, 
  selectedAnnotation, 
  selectedRegion,
  collapsed,
  onToggleCollapse
}: RightPanelProps): React.ReactElement {
  const [panelMode, setPanelMode] = useState<PanelMode>('editor');
  
  return (
    <div className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
      {/* Collapse toggle button */}
      <button 
        className={styles.collapseToggle}
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand Panel' : 'Collapse Panel'}
      >
        {collapsed ? '◀' : '▶'}
      </button>
      
      {!collapsed && (
        <>
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
          Viz
        </button>
        <button
          className={`${styles.toggleButton} ${panelMode === 'scene' ? styles.active : ''}`}
          onClick={() => setPanelMode('scene')}
        >
          Scene
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
        ) : panelMode === 'visualisation' ? (
          // Visualisation mode - show viz panel content
          <VizPanelContent />
        ) : (
          // Scene mode - show scene properties panel
          <ScenePropertiesPanel />
        )}
      </div>
        </>
      )}
    </div>
  );
}
