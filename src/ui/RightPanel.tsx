// Phonon - Right Panel Component
// Unified panel with toggle between Editor (Properties), Visualisation, Scene, and AI modes

import React, { useState, useCallback } from 'react';
import type { GraphNode, Annotation, Region, GraphEdge } from '@core/types';
import { useGraphStore } from '@core/store';
import { PropertyPanel } from './property-panels';
import { EdgePanel } from './EdgePanel';
import { VizPanelContent } from './VizPanel';
import { ScenePropertiesPanel } from './ScenePropertiesPanel';
import { AIPanel } from './AIPanel';
import { ResizeHandle } from './ResizeHandle';
import styles from './RightPanel.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH = 500;

// ============================================================================
// RIGHT PANEL
// ============================================================================

type PanelMode = 'editor' | 'visualisation' | 'scene' | 'ai';

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
  
  const globalSettings = useGraphStore(state => state.globalSettings);
  const setGlobalSettings = useGraphStore(state => state.setGlobalSettings);
  
  const panelWidth = globalSettings.rightPanelWidth;
  
  const handleResize = useCallback((delta: number) => {
    const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, panelWidth + delta));
    setGlobalSettings({ rightPanelWidth: newWidth });
  }, [panelWidth, setGlobalSettings]);
  
  return (
    <div 
      className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}
      style={collapsed ? undefined : { width: panelWidth }}
    >
      {/* Resize handle on left edge */}
      {!collapsed && <ResizeHandle direction="left" onResize={handleResize} />}
      
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
        <button
          className={`${styles.toggleButton} ${panelMode === 'ai' ? styles.active : ''}`}
          onClick={() => setPanelMode('ai')}
        >
          AI
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
        ) : panelMode === 'ai' ? (
          // AI mode - show AI assistant panel
          <AIPanel embedded />
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
