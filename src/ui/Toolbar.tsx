// Phonon v2 - Toolbar Component (Compact)

import React from 'react';
import { useGraphStore } from '@core/store';
import { NodeMenu } from './NodeMenu';
import { ExampleMenu } from './ExampleMenu';
import { FileDropdown } from './FileDropdown';
import { fs, isTauri } from '../io/filesystem';
import styles from './Toolbar.module.css';

import { saveGraphToFile } from '../io/file-io';

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
  const nodes = useGraphStore(state => state.nodes);
  const edges = useGraphStore(state => state.edges);
  const musicalContext = useGraphStore(state => state.musicalContext);
  const globalSettings = useGraphStore(state => state.globalSettings);
  const isDirty = useGraphStore(state => state.isDirty);
  
  const setCurrentComposition = useGraphStore(state => state.setCurrentComposition);
  const setCompositions = useGraphStore(state => state.setCompositions);
  const markClean = useGraphStore(state => state.markClean);

  const handleSave = async () => {
    const filename = projectMeta.name || 'untitled';
    
    if (project.isProjectMode && project.path && isTauri()) {
      const phonoFilename = filename.endsWith('.phono') ? filename : `${filename}.phono`;
      const data = {
        version: '2.0.0',
        timestamp: Date.now(),
        projectMeta,
        globalSettings,
        musicalContext,
        nodes: Array.from(nodes.values()).map(({ timer, lastTrigger, flash, heldPackets, ...rest }) => rest),
        edges: Array.from(edges.values()),
      };
      
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
        await saveGraphToFile(filename, nodes, edges, musicalContext, globalSettings, projectMeta);
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

