// Phonon v2 - File Menu Component (Save/Load/New)

import React, { useRef, useEffect } from 'react';
import { useGraphStore } from '@core/store';
import { saveGraphToFile, loadGraphFromFile } from '../io/file-io';
import { fs, isTauri } from '../io/filesystem';
import { SCALES } from '@core/constants';
import type { ScaleName } from '@core/types';
import styles from './FileMenu.module.css';

interface FileMenuProps {
  onShowSettings: () => void;
  onShowExport: () => void;
}

export function FileMenu({ onShowSettings, onShowExport }: FileMenuProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const nodes = useGraphStore(state => state.nodes);
  const edges = useGraphStore(state => state.edges);
  const musicalContext = useGraphStore(state => state.musicalContext);
  const globalSettings = useGraphStore(state => state.globalSettings);
  const projectMeta = useGraphStore(state => state.projectMeta);
  const project = useGraphStore(state => state.project);
  const loadGraph = useGraphStore(state => state.loadGraph);
  const setMusicalContext = useGraphStore(state => state.setMusicalContext);
  const setGlobalSettings = useGraphStore(state => state.setGlobalSettings);
  const setProjectMeta = useGraphStore(state => state.setProjectMeta);
  const setProjectPath = useGraphStore(state => state.setProjectPath);
  const setProjectName = useGraphStore(state => state.setProjectName);
  const setCompositions = useGraphStore(state => state.setCompositions);
  const setCurrentComposition = useGraphStore(state => state.setCurrentComposition);
  const clear = useGraphStore(state => state.clear);
  const markClean = useGraphStore(state => state.markClean);
  
  // Refresh compositions list when project path changes
  useEffect(() => {
    if (project.path) {
      fs.listCompositions(project.path).then(files => {
        setCompositions(files);
      });
    }
  }, [project.path]);

  const handleOpenProject = async () => {
    const dir = await fs.openProjectDir();
    if (dir) {
      setProjectPath(dir);
      // Try to read project.json
      // For now just use dir name as project name
      const name = dir.split(/[\\/]/).pop() || 'Project';
      setProjectName(name);
      
      // Init project file if needed
      await fs.initProject(dir, name);
      
      // List compositions
      const files = await fs.listCompositions(dir);
      setCompositions(files);
    }
  };

  const handleCompositionChange = async (filename: string) => {
    if (!project.path) return;
    
    // Save current if dirty? (Maybe later)
    
    const content = await fs.readComposition(project.path, filename);
    if (content) {
      try {
        const data = JSON.parse(content);
        loadGraphData(data);
        setCurrentComposition(filename);
        setProjectMeta({ name: filename.replace('.phono', '') });
      } catch (err) {
        console.error('Failed to parse composition:', err);
      }
    }
  };

  const loadGraphData = (data: any) => {
    // Load nodes and edges
    const nodesWithRuntime = data.nodes.map((n: any) => ({
      ...n,
      timer: 0,
      lastTrigger: 0,
      flash: 0,
      heldPackets: [],
    }));
    
    loadGraph(nodesWithRuntime, data.edges);
    
    // Load musical context
    const scaleName = data.musicalContext.scaleName as ScaleName;
    const scale = SCALES[scaleName];
    if (scale) {
      setMusicalContext({
        root: data.musicalContext.root,
        scaleName,
        scale,
      });
    }
    
    // Load global settings
    setGlobalSettings({
      subdivisions: data.globalSettings.subdivisions,
      pixelsPerBeat: data.globalSettings.pixelsPerBeat,
      gravityConstant: data.globalSettings.gravityConstant,
    });
    
    // Load project meta
    setProjectMeta({
      ...data.projectMeta,
      modified: Date.now(),
    });
    
    markClean();
  };

  const handleNew = () => {
    const confirmed = confirm('Create new composition? Current work will be lost.');
    if (!confirmed) return;
    
    clear();
    setProjectMeta({
      name: 'Untitled',
      author: '',
      created: Date.now(),
      modified: Date.now(),
    });
    setCurrentComposition(null);
    markClean();
  };
  
  const handleSave = async () => {
    const filename = projectMeta.name || 'untitled';
    
    if (project.path && isTauri()) {
      // Save to project folder
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
        // Refresh list
        const files = await fs.listCompositions(project.path);
        setCompositions(files);
        console.log('Composition saved to project:', phonoFilename);
      } else {
        alert('Failed to save to project folder');
      }
    } else {
      // Fallback to download
      try {
        await saveGraphToFile(
          filename,
          nodes,
          edges,
          musicalContext,
          globalSettings,
          projectMeta
        );
        markClean();
        console.log('Graph saved:', filename);
      } catch (err) {
        console.error('Save failed:', err);
        alert('Failed to save file');
      }
    }
  };
  
  const handleLoad = () => {
    const confirmed = confirm('Load file? Current work will be lost.');
    if (!confirmed) return;
    
    fileInputRef.current?.click();
  };
  
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await loadGraphFromFile(file);
      loadGraphData(data);
    } catch (err) {
      console.error('Load failed:', err);
      alert('Failed to load file');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className={styles.fileMenu}>
      {isTauri() && (
        <>
          <button onClick={handleOpenProject} title="Open Project Folder">
            📂 {project.name || 'Open Project'}
          </button>
          
          {project.path && (
            <select 
              value={project.currentComposition || ''} 
              onChange={(e) => handleCompositionChange(e.target.value)}
              className={styles.compositionSelect}
              style={{ maxWidth: '150px', marginLeft: '8px', marginRight: '8px' }}
            >
              <option value="" disabled>Select Composition...</option>
              {project.compositions.map(file => (
                <option key={file} value={file}>{file.replace('.phono', '')}</option>
              ))}
            </select>
          )}
          
          <div className={styles.separator} />
        </>
      )}

      <button onClick={handleNew} title="New Composition (Ctrl+N)">
        📄 New
      </button>
      
      <button onClick={handleLoad} title="Load File (Ctrl+O)">
        📂 Load File
      </button>
      
      <button onClick={handleSave} title="Save Composition (Ctrl+S)">
        💾 Save
      </button>
      
      <button onClick={onShowExport} title="Export Audio/MIDI">
        📤 Export
      </button>
      
      <button onClick={onShowSettings} title="Global Settings">
        ⚙️ Settings
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".phono,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  );
}
