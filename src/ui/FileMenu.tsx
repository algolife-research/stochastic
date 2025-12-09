// Phonon v2 - File Menu Component (Save/Load/New)

import React, { useRef, useEffect } from 'react';
import { useGraphStore } from '@core/store';
import { saveCompositionToFile, loadCompositionFromFile, serializeComposition } from '../io/file-io';
import { fs, isTauri } from '../io/filesystem';
import { SCALES } from '@core/constants';
import type { ScaleName, SceneId } from '@core/types';
import styles from './FileMenu.module.css';

interface FileMenuProps {
  onShowSettings: () => void;
  onShowExport: () => void;
}

export function FileMenu({ onShowSettings, onShowExport }: FileMenuProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scenes = useGraphStore(state => state.scenes);
  const arrangement = useGraphStore(state => state.arrangement);
  const arrangementChannels = useGraphStore(state => state.arrangementChannels);
  const masterSpeed = useGraphStore(state => state.masterSpeed);
  const musicalContext = useGraphStore(state => state.musicalContext);
  const globalSettings = useGraphStore(state => state.globalSettings);
  const projectMeta = useGraphStore(state => state.projectMeta);
  const project = useGraphStore(state => state.project);
  const loadGraph = useGraphStore(state => state.loadGraph);
  const loadComposition = useGraphStore(state => state.loadComposition);
  const setMusicalContext = useGraphStore(state => state.setMusicalContext);
  const setGlobalSettings = useGraphStore(state => state.setGlobalSettings);
  const setProjectMeta = useGraphStore(state => state.setProjectMeta);
  const setProjectPath = useGraphStore(state => state.setProjectPath);
  const setProjectName = useGraphStore(state => state.setProjectName);
  const setCompositions = useGraphStore(state => state.setCompositions);
  const setCurrentComposition = useGraphStore(state => state.setCurrentComposition);
  const setMasterSpeed = useGraphStore(state => state.setMasterSpeed);
  const saveCurrentScene = useGraphStore(state => state.saveCurrentScene);
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
        loadCompositionData(data);
        setCurrentComposition(filename);
        setProjectMeta({ name: filename.replace('.phono', '') });
      } catch (err) {
        console.error('Failed to parse composition:', err);
      }
    }
  };

  const loadCompositionData = (data: any) => {
    // Detect version: v3 has scenes array, v2/legacy has nodes directly
    const isV3 = data.meta?.version?.startsWith('3') || data.scenes;
    
    if (isV3) {
      // V3 format with scenes
      const scaleName = data.global.scaleName as ScaleName;
      const scale = SCALES[scaleName];
      if (scale) {
        setMusicalContext({
          root: data.global.rootNote,
          scaleName,
          scale,
        });
      }
      
      setGlobalSettings({
        gravityConstant: data.global.gravity,
        defaultEdgeBehaviour: data.global.defaultEdgeBehaviour,
      });
      
      setProjectMeta({
        name: data.meta.name,
        author: data.meta.author,
        created: data.meta.created,
        modified: Date.now(),
      });
      
      setMasterSpeed(data.global.masterBpm || 120);
      
      // Deserialize scenes
      const scenes = data.scenes.map((s: any) => ({
        id: s.id as SceneId,
        name: s.name,
        color: s.color,
        durationBeats: s.durationBeats,
        loopCount: s.loopCount,
        localBpm: s.localBpm,
        localRoot: s.localRoot,
        localScale: s.localScale as ScaleName | null,
        enterTransition: s.enterTransition,
        exitTransition: s.exitTransition,
        jamTrigger: s.jamTrigger,
        nodes: s.nodes.map((n: any) => ({
          ...n,
          timer: 0,
          lastTrigger: 0,
          flash: 0,
          heldPackets: [],
        })),
        edges: s.edges,
        annotations: s.annotations || [],
        regions: s.regions || [],
      }));
      
      // Deserialize channels with default if not present
      const channels = data.channels?.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        color: ch.color,
        muted: ch.muted,
        solo: ch.solo,
        volume: ch.volume,
      })) ?? [{
        id: 'channel-0',
        name: 'Track 1',
        color: '#4CAF50',
        muted: false,
        solo: false,
        volume: 1,
      }];
      
      loadComposition(scenes, data.arrangement || [], channels, data.global.masterBpm || 120);
    } else {
      // Legacy V2 format - single graph
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
        subdivisions: data.globalSettings?.subdivisions,
        pixelsPerBeat: data.globalSettings?.pixelsPerBeat,
        gravityConstant: data.globalSettings?.gravityConstant,
      });
      
      // Load project meta
      setProjectMeta({
        ...data.projectMeta,
        modified: Date.now(),
      });
    }
    
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
    
    // Save current canvas state to the editing scene before serializing
    saveCurrentScene();
    
    if (project.path && isTauri()) {
      // Save to project folder using V3 format
      const phonoFilename = filename.endsWith('.phono') ? filename : `${filename}.phono`;
      const data = serializeComposition(scenes, arrangement, arrangementChannels, musicalContext, globalSettings, projectMeta, masterSpeed);
      
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
        await saveCompositionToFile(
          filename,
          scenes,
          arrangement,
          arrangementChannels,
          musicalContext,
          globalSettings,
          projectMeta,
          masterSpeed
        );
        markClean();
        console.log('Composition saved:', filename);
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
      const data = await loadCompositionFromFile(file);
      // loadCompositionFromFile handles v2->v3 migration internally
      loadComposition(data.scenes, data.arrangement, data.channels, data.masterBpm);
      
      // Set musical context
      const scaleName = data.musicalContext.scaleName as ScaleName;
      const scale = SCALES[scaleName];
      if (scale) {
        setMusicalContext({
          root: data.musicalContext.root,
          scaleName,
          scale,
        });
      }
      
      // Set global settings
      setGlobalSettings({
        gravityConstant: data.globalSettings.gravityConstant,
        defaultEdgeBehaviour: data.globalSettings.defaultEdgeBehaviour,
      });
      
      // Set project meta
      setProjectMeta({
        ...data.projectMeta,
        modified: Date.now(),
      });
      
      markClean();
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
      
      <button onClick={handleSave} title="Download composition file (Ctrl+S)">
        💾 Export Composition
      </button>
      
      <button onClick={onShowExport} title="Export Audio/MIDI">
        📤 Export
      </button>
      
      <button onClick={onShowSettings} title="Universal Constants">
        ⚙️ Constants
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
