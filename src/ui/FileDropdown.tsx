import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '@core/store';
import { loadCompositionFromFile, detectFileVersion, migrateV2ToV3, deserializeComposition, saveCompositionToFile, serializeComposition } from '../io/file-io';
import type { SerializedGraph, SerializedComposition } from '../io/file-io';
import { fs, isTauri } from '../io/filesystem';
import { isCloudStorageAvailable, saveProjectToCloud, loadProjectFromCloud, listCloudProjects, deleteCloudProject } from '../io/cloud-storage';
import type { CloudProjectSummary } from '../io/cloud-storage';
import { useAuth } from '@auth/store';
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
  const [showCloudDialog, setShowCloudDialog] = useState(false);
  const [cloudProjects, setCloudProjects] = useState<CloudProjectSummary[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [currentCloudProjectId, setCurrentCloudProjectId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isAuthenticated } = useAuth();

  const project = useGraphStore(state => state.project);
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
    
    // Get FRESH state from store after saving (avoid stale closure)
    const store = useGraphStore.getState();
    const freshScenes = store.scenes;
    const freshArrangement = store.arrangement;
    const freshChannels = store.arrangementChannels;
    const freshMusicalContext = store.musicalContext;
    const freshGlobalSettings = store.globalSettings;
    const freshProjectMeta = store.projectMeta;
    const freshMasterSpeed = store.masterSpeed;
    
    if (project.isProjectMode && project.path && isTauri()) {
      // Save to project folder
      const stoFilename = filename.endsWith('.sto') ? filename : `${filename}.sto`;
      const data = serializeComposition(freshScenes, freshArrangement, freshChannels, freshMusicalContext, freshGlobalSettings, freshProjectMeta, freshMasterSpeed);
      
      const success = await fs.writeComposition(project.path, stoFilename, JSON.stringify(data, null, 2));
      if (success) {
        markClean();
        setCurrentComposition(stoFilename);
        const files = await fs.listCompositions(project.path);
        setCompositions(files);
        console.log('Saved to project:', stoFilename);
      } else {
        alert('Failed to save to project folder');
      }
    } else {
      // Download as file
      try {
        await saveCompositionToFile(filename, freshScenes, freshArrangement, freshChannels, freshMusicalContext, freshGlobalSettings, freshProjectMeta, freshMasterSpeed);
        markClean();
        console.log('Composition exported:', filename);
      } catch (err) {
        console.error('Export failed:', err);
        alert('Failed to export file');
      }
    }
  };

  // =========================================================================
  // CLOUD SAVE/LOAD
  // =========================================================================

  const handleSaveToCloud = async () => {
    setIsOpen(false);
    
    if (!isCloudStorageAvailable()) {
      alert('Please sign in to save to cloud');
      return;
    }
    
    // Save current canvas state
    saveCurrentScene();
    
    // Get FRESH state from store after saving (avoid stale closure)
    const store = useGraphStore.getState();
    const freshScenes = store.scenes;
    const freshArrangement = store.arrangement;
    const freshChannels = store.arrangementChannels;
    const freshMusicalContext = store.musicalContext;
    const freshGlobalSettings = store.globalSettings;
    const freshProjectMeta = store.projectMeta;
    const freshMasterSpeed = store.masterSpeed;
    
    const data = serializeComposition(
      freshScenes, 
      freshArrangement, 
      freshChannels, 
      freshMusicalContext, 
      freshGlobalSettings, 
      freshProjectMeta, 
      freshMasterSpeed
    );
    
    const result = await saveProjectToCloud(data, {
      id: currentCloudProjectId ?? undefined,
      name: projectMeta.name,
    });
    
    if (result.success) {
      setCurrentCloudProjectId(result.projectId ?? null);
      markClean();
      alert('Project saved to cloud!');
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  };

  const handleOpenCloudDialog = async () => {
    setIsOpen(false);
    
    if (!isCloudStorageAvailable()) {
      alert('Please sign in to access cloud projects');
      return;
    }
    
    setCloudLoading(true);
    setShowCloudDialog(true);
    
    const result = await listCloudProjects();
    if (result.success && result.projects) {
      setCloudProjects(result.projects);
    } else {
      console.error('Failed to load cloud projects:', result.error);
    }
    setCloudLoading(false);
  };

  const handleLoadFromCloud = async (projectId: string) => {
    const result = await loadProjectFromCloud(projectId);
    
    if (result.success && result.project) {
      loadCompositionData(result.project.data);
      setCurrentCloudProjectId(result.project.id);
      setProjectMeta({ name: result.project.name });
      setShowCloudDialog(false);
    } else {
      alert(`Failed to load: ${result.error}`);
    }
  };

  const handleDeleteFromCloud = async (projectId: string) => {
    if (!confirm('Delete this project from the cloud? This cannot be undone.')) {
      return;
    }
    
    const result = await deleteCloudProject(projectId);
    if (result.success) {
      setCloudProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentCloudProjectId === projectId) {
        setCurrentCloudProjectId(null);
      }
    } else {
      alert(`Failed to delete: ${result.error}`);
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
    const filename = name.endsWith('.sto') ? name : `${name}.sto`;
    
    // Clear graph
    clear();
    setProjectMeta({
      name: name.replace('.sto', ''),
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
        setProjectMeta({ name: filename.replace('.sto', '') });
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
        accept=".sto,.json"
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
            <span>💾</span> Save Local <span className={styles.shortcut}>Ctrl+S</span>
          </button>
          
          <div className={styles.separator} />
          
          {/* Cloud Storage Options */}
          {!isAuthenticated && (
            <div className={styles.cloudHint}>
              <span>🔑</span> Sign in for cloud features
            </div>
          )}
          
          <button 
            className={`${styles.menuItem} ${!isAuthenticated ? styles.disabled : ''}`} 
            onClick={isAuthenticated ? handleSaveToCloud : undefined}
            title={isAuthenticated ? 'Save to cloud' : 'Sign in to save to cloud'}
          >
            <span>☁️</span> Save to Cloud {currentCloudProjectId && '✓'}
          </button>
          
          <button 
            className={`${styles.menuItem} ${!isAuthenticated ? styles.disabled : ''}`} 
            onClick={isAuthenticated ? handleOpenCloudDialog : undefined}
            title={isAuthenticated ? 'Load from cloud' : 'Sign in to access cloud projects'}
          >
            <span>☁️</span> Load from Cloud...
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={() => { onShowExport(); setIsOpen(false); }}>
            <span>📤</span> Export Audio/MIDI
          </button>
        </div>,
        document.body
      )}
      
      {/* Cloud Projects Dialog */}
      {showCloudDialog && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowCloudDialog(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>☁️ Cloud Projects</h3>
              <button className={styles.closeButton} onClick={() => setShowCloudDialog(false)}>×</button>
            </div>
            <div className={styles.modalContent}>
              {cloudLoading ? (
                <div className={styles.loading}>Loading projects...</div>
              ) : cloudProjects.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No cloud projects yet</p>
                  <p className={styles.hint}>Save your first project to the cloud!</p>
                </div>
              ) : (
                <div className={styles.projectList}>
                  {cloudProjects.map(project => (
                    <div 
                      key={project.id} 
                      className={`${styles.projectItem} ${project.id === currentCloudProjectId ? styles.active : ''}`}
                    >
                      <div className={styles.projectInfo} onClick={() => handleLoadFromCloud(project.id)}>
                        <span className={styles.projectName}>{project.name}</span>
                        <span className={styles.projectDate}>
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button 
                        className={styles.deleteButton}
                        onClick={() => handleDeleteFromCloud(project.id)}
                        title="Delete project"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
