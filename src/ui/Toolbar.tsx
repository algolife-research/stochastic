// Phonon v2 - Toolbar Component (Compact)

import React, { useCallback } from 'react';
import { useGraphStore } from '@core/store';
import { NodeMenu } from './NodeMenu';
import { ExampleMenu } from './ExampleMenu';
import { FileDropdown } from './FileDropdown';
import { isTauri } from '../io/filesystem';
import styles from './Toolbar.module.css';

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  onShowSettings: () => void;
  onShowExport: () => void;
}

export function Toolbar({ onShowSettings, onShowExport }: ToolbarProps): React.ReactElement {
  const project = useGraphStore(state => state.project);
  const selection = useGraphStore(state => state.selection);
  const clipboard = useGraphStore(state => state.clipboard);
  
  const deleteNode = useGraphStore(state => state.deleteNode);
  const deleteEdge = useGraphStore(state => state.deleteEdge);
  const deleteAnnotation = useGraphStore(state => state.deleteAnnotation);
  const deleteRegion = useGraphStore(state => state.deleteRegion);
  const copySelectedNodes = useGraphStore(state => state.copySelectedNodes);
  const pasteNodes = useGraphStore(state => state.pasteNodes);

  // Check if there's anything selected
  const hasSelection = selection.selectedNodeIds.length > 0 || 
    selection.selectedEdgeId !== null || 
    selection.selectedAnnotationId !== null || 
    selection.selectedRegionId !== null;
  
  const hasClipboard = clipboard !== null && clipboard.nodes.length > 0;

  const handleDelete = useCallback(() => {
    // Delete selected nodes
    selection.selectedNodeIds.forEach(id => {
      deleteNode(id);
    });
    // Delete selected edge
    if (selection.selectedEdgeId) {
      deleteEdge(selection.selectedEdgeId);
    }
    // Delete selected annotation
    if (selection.selectedAnnotationId) {
      deleteAnnotation(selection.selectedAnnotationId);
    }
    // Delete selected region
    if (selection.selectedRegionId) {
      deleteRegion(selection.selectedRegionId);
    }
  }, [selection, deleteNode, deleteEdge, deleteAnnotation, deleteRegion]);

  const handleCopy = useCallback(() => {
    if (selection.selectedNodeIds.length > 0) {
      copySelectedNodes();
    }
  }, [selection.selectedNodeIds, copySelectedNodes]);

  const handlePaste = useCallback(() => {
    pasteNodes();
  }, [pasteNodes]);
  
  return (
    <div className={styles['toolbar']}>
      <FileDropdown onShowSettings={onShowSettings} onShowExport={onShowExport} />

      <button className={styles['actionButton']} onClick={onShowSettings} title="Settings">
        <span className={styles['icon']}>⚙️</span>
      </button>

      <div className={styles['separator']} />

      {/* Edit actions: Copy, Paste, Delete */}
      <button 
        className={styles['actionButton']} 
        onClick={handleCopy} 
        title="Copy (Ctrl+C)"
        disabled={selection.selectedNodeIds.length === 0}
        style={{ opacity: selection.selectedNodeIds.length === 0 ? 0.4 : 1 }}
      >
        <span className={styles['icon']}>📋</span>
      </button>

      <button 
        className={styles['actionButton']} 
        onClick={handlePaste} 
        title="Paste (Ctrl+V)"
        disabled={!hasClipboard}
        style={{ opacity: !hasClipboard ? 0.4 : 1 }}
      >
        <span className={styles['icon']}>📄</span>
      </button>

      <button 
        className={styles['actionButton']} 
        onClick={handleDelete} 
        title="Delete (Del)"
        disabled={!hasSelection}
        style={{ opacity: !hasSelection ? 0.4 : 1 }}
      >
        <span className={styles['icon']}>🗑️</span>
      </button>

      <div className={styles['separator']} />

      {/* Node selection menu (collapsible) */}
      <NodeMenu />
      
      <div className={styles['separator']} />
      
      {/* Examples menu (collapsible) */}
      <ExampleMenu />

      {isTauri() && project.isProjectMode && project.path && (
        <>
          <div className={styles['separator']} />
          <span style={{ color: '#888', fontSize: '12px' }}>
            📁 {project.name} / {project.currentComposition?.replace('.phono', '') || 'No file'}
          </span>
        </>
      )}
    </div>
  );
}

