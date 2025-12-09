import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '@core/store';
import { loadCompositionFromFile, detectFileVersion, migrateV2ToV3, deserializeComposition, saveCompositionToFile, serializeComposition } from '../io/file-io';
import type { SerializedGraph, SerializedComposition } from '../io/file-io';
import { fs, isTauri } from '../io/filesystem';
import { SCALES } from '@core/constants';
import type { ScaleName } from '@core/types';
import { NewCompositionDialog, LoadCompositionDialog } from './ProjectDialogs';
import styles from './FileDropdown.module.css';

interface FileDropdownProps {
  onShowSettings: () => void;
  onShowExport: () => void;
}

export function FileDropdown({ onShowSettings, onShowExport }: FileDropdownProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = useGraphStore(state => state.project);
  const scenes = useGraphStore(state => state.scenes);
  const arrangement = useGraphStore(state => state.arrangement);
  const arrangementChannels = useGraphStore(state => state.arrangementChannels);
  const masterSpeed = useGraphStore(state => state.masterSpeed);
  const musicalContext = useGraphStore(state => state.musicalContext);
  const globalSettings = useGraphStore(state => state.globalSettings);
  const projectMeta = useGraphStore(state => state.projectMeta);
  
  const loadComposition = useGraphStore(state => state.loadComposition);
  const setMusicalContext = useGraphStore(state => state.setMusicalContext);
  const setGlobalSettings = useGraphStore(state => state.setGlobalSettings);
  const setProjectMeta = useGraphStore(state => state.setProjectMeta);
  const setCompositions = useGraphStore(state => state.setCompositions);
  const setCurrentComposition = useGraphStore(state => state.setCurrentComposition);
  const saveCurrentScene = useGraphStore(state => state.saveCurrentScene);
  const clear = useGraphStore(state => state.clear);
  const markClean = useGraphStore(state => state.markClean);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInButton = buttonRef.current?.contains(target);
      const clickedInDropdown = dropdownRef.current?.contains(target);
      
      if (!clickedInButton && !clickedInDropdown) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen]);

  const loadCompositionData = (rawData: unknown) => {
    // Detect version and migrate if needed
    const version = detectFileVersion(rawData);
    
    let data;
    if (version === '2.0') {
      const v3Data = migrateV2ToV3(rawData as SerializedGraph);
      data = deserializeComposition(v3Data);
    } else {
      data = deserializeComposition(rawData as SerializedComposition);
    }
    
    // Load using V3 composition loader
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
  };

  const handleExportComposition = async () => {
    const filename = projectMeta.name || 'untitled';
    
    // Save current canvas state to the editing scene before serializing
    saveCurrentScene();
    
    if (project.isProjectMode && project.path && isTauri()) {
      // Save to project folder
      const phonoFilename = filename.endsWith('.phono') ? filename : `${filename}.phono`;
      const data = serializeComposition(scenes, arrangement, arrangementChannels, musicalContext, globalSettings, projectMeta, masterSpeed);
      
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
      // Download as file
      try {
        await saveCompositionToFile(filename, scenes, arrangement, arrangementChannels, musicalContext, globalSettings, projectMeta, masterSpeed);
        markClean();
        console.log('Composition exported:', filename);
      } catch (err) {
        console.error('Export failed:', err);
        alert('Failed to export file');
      }
    }
  };

  const handleNew = () => {
    if (project.isProjectMode && isTauri()) {
      setShowNewDialog(true);
    } else {
      if (confirm('Create new composition? Current work will be lost.')) {
        clear();
        setProjectMeta({
          name: 'Untitled',
          author: '',
          created: Date.now(),
          modified: Date.now(),
        });
        setCurrentComposition(null);
        markClean();
      }
    }
    setIsOpen(false);
  };

  const handleCreateNew = async (name: string) => {
    const filename = name.endsWith('.phono') ? name : `${name}.phono`;
    
    // Clear graph
    clear();
    setProjectMeta({
      name: name.replace('.phono', ''),
      author: '',
      created: Date.now(),
      modified: Date.now(),
    });
    
    // Save immediately to create file
    if (project.path) {
      const state = useGraphStore.getState();
      const data = {
        version: '2.0.0',
        timestamp: Date.now(),
        projectMeta: state.projectMeta,
        globalSettings: state.globalSettings,
        musicalContext: state.musicalContext,
        nodes: [],
        edges: [],
      };
      
      await fs.writeComposition(project.path, filename, JSON.stringify(data, null, 2));
      const newFiles = await fs.listCompositions(project.path);
      setCompositions(newFiles);
      setCurrentComposition(filename);
      markClean();
    }
    setShowNewDialog(false);
  };

  const handleLoad = async () => {
    if (project.isProjectMode && project.path && isTauri()) {
      setShowLoadDialog(true);
    } else {
      fileInputRef.current?.click();
    }
    setIsOpen(false);
  };

  const handleLoadFromList = async (filename: string) => {
    if (!project.path) return;
    
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
    setShowLoadDialog(false);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (confirm('Load file? Current work will be lost.')) {
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
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      <button 
        ref={buttonRef}
        className={`${styles.menuButton} ${isOpen ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        File ▾
      </button>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".phono,.json"
        onChange={handleFileSelected}
      />

      <NewCompositionDialog 
        visible={showNewDialog} 
        onClose={() => setShowNewDialog(false)} 
        onCreate={handleCreateNew}
        existingFiles={project.compositions}
      />

      <LoadCompositionDialog
        visible={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        onLoad={handleLoadFromList}
        files={project.compositions}
        currentFile={project.currentComposition}
      />

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={styles.dropdown}
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          <button className={styles.menuItem} onClick={handleNew}>
            <span>📄</span> New <span className={styles.shortcut}>Ctrl+N</span>
          </button>

          <button className={styles.menuItem} onClick={handleLoad}>
            <span>📂</span> Load... <span className={styles.shortcut}>Ctrl+O</span>
          </button>
          
          <button className={styles.menuItem} onClick={() => { handleExportComposition(); setIsOpen(false); }}>
            <span>💾</span> Export Composition <span className={styles.shortcut}>Ctrl+S</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={() => { onShowExport(); setIsOpen(false); }}>
            <span>📤</span> Export Audio/MIDI
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
