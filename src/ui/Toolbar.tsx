// Phonon v2 - Toolbar Component (Compact)

import React, { useCallback } from 'react';
import { useGraphStore } from '@core/store';
import { NodeMenu } from './NodeMenu';
import { ExampleMenu } from './ExampleMenu';
import { FileDropdown } from './FileDropdown';
import { fs, isTauri } from '../io/filesystem';
import styles from './Toolbar.module.css';

import { saveCompositionToFile, serializeComposition } from '../io/file-io';

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  onShowSettings: () => void;
  onShowExport: () => void;
}

export function Toolbar({ onShowSettings, onShowExport }: ToolbarProps): React.ReactElement {
  const project = useGraphStore(state => state.project);
  const projectMeta = useGraphStore(state => state.projectMeta);
  const scenes = useGraphStore(state => state.scenes);
  const arrangement = useGraphStore(state => state.arrangement);
  const masterSpeed = useGraphStore(state => state.masterSpeed);
  const musicalContext = useGraphStore(state => state.musicalContext);
  const globalSettings = useGraphStore(state => state.globalSettings);
  const isDirty = useGraphStore(state => state.isDirty);
  const selection = useGraphStore(state => state.selection);
  const clipboard = useGraphStore(state => state.clipboard);
  
  const setCurrentComposition = useGraphStore(state => state.setCurrentComposition);
  const setCompositions = useGraphStore(state => state.setCompositions);
  const markClean = useGraphStore(state => state.markClean);
  const saveCurrentScene = useGraphStore(state => state.saveCurrentScene);
  const deleteNode = useGraphStore(state => state.deleteNode);
  const deleteEdge = useGraphStore(state => state.deleteEdge);
  const deleteAnnotation = useGraphStore(state => state.deleteAnnotation);
  const deleteRegion = useGraphStore(state => state.deleteRegion);
  const copySelectedNodes = useGraphStore(state => state.copySelectedNodes);
  const pasteNodes = useGraphStore(state => state.pasteNodes);
  const toggleVizMode = useGraphStore(state => state.toggleVizMode);
  const vizDisplay = useGraphStore(state => state.vizDisplay);

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

  const handleSave = async () => {
    const filename = projectMeta.name || 'untitled';
    
    // Save current canvas state to the editing scene before serializing
    saveCurrentScene();
    
    if (project.isProjectMode && project.path && isTauri()) {
      const phonoFilename = filename.endsWith('.phono') ? filename : `${filename}.phono`;
      const data = serializeComposition(scenes, arrangement, musicalContext, globalSettings, projectMeta, masterSpeed);
      
      const success = await fs.writeComposition(project.path, phonoFilename, JSON.stringify(data, null, 2));
      if (success) {
        markClean();
        setCurrentComposition(phonoFilename);
        const files = await fs.listCompositions(project.path);
        setCompositions(files);
        console.log('Saved to project:', phonoFilename);
      } else {
        alert('Failed to save to project folder');
      }
    } else {
      try {
        await saveCompositionToFile(filename, scenes, arrangement, musicalContext, globalSettings, projectMeta, masterSpeed);
        markClean();
      } catch (err) {
        console.error('Save failed:', err);
        alert('Failed to save file');
      }
    }
  };
  
  return (
    <div className={styles['toolbar']}>
      <FileDropdown onShowSettings={onShowSettings} onShowExport={onShowExport} />
      
      <button 
        className={styles['actionButton']} 
        onClick={handleSave} 
        title="Save (Ctrl+S)"
        style={{ color: isDirty ? '#ffcc00' : '#aaa' }}
      >
        <span className={styles['icon']}>💾</span>
      </button>

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

      <div className={styles['separator']} />

      {/* Visualization mode toggle */}
      <button 
        className={styles['actionButton']} 
        onClick={toggleVizMode} 
        title={vizDisplay.isVizMode ? "Exit Visualization (Esc)" : "Enter Visualization Mode"}
        style={{ 
          color: vizDisplay.isVizMode ? '#00ff88' : '#aaa',
          background: vizDisplay.isVizMode ? 'rgba(0, 255, 136, 0.1)' : undefined
        }}
      >
        <span className={styles['icon']}>🎨</span>
      </button>

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

