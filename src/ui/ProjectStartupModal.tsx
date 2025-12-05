import React, { useState } from 'react';
import { useGraphStore } from '@core/store';
import { fs, isTauri } from '../io/filesystem';
import { SCALES } from '@core/constants';
import type { ScaleName } from '@core/types';
import styles from './ProjectStartupModal.module.css';

export function ProjectStartupModal(): React.ReactElement | null {
  const showProjectStartup = useGraphStore(state => state.showProjectStartup);
  const setShowProjectStartup = useGraphStore(state => state.setShowProjectStartup);
  const setProjectMode = useGraphStore(state => state.setProjectMode);
  const setProjectPath = useGraphStore(state => state.setProjectPath);
  const setProjectName = useGraphStore(state => state.setProjectName);
  const setCompositions = useGraphStore(state => state.setCompositions);
  const setCurrentComposition = useGraphStore(state => state.setCurrentComposition);
  const loadGraph = useGraphStore(state => state.loadGraph);
  const setMusicalContext = useGraphStore(state => state.setMusicalContext);
  const setGlobalSettings = useGraphStore(state => state.setGlobalSettings);
  const setProjectMeta = useGraphStore(state => state.setProjectMeta);
  const markClean = useGraphStore(state => state.markClean);
  const clear = useGraphStore(state => state.clear);

  const [step, setStep] = useState<'select-mode' | 'select-composition'>('select-mode');
  const [files, setFiles] = useState<string[]>([]);
  const [newCompName, setNewCompName] = useState('');

  // Only show in Tauri and when flag is true
  if (!isTauri() || !showProjectStartup) {
    return null;
  }

  const handleOpenProject = async () => {
    const dir = await fs.openProjectDir();
    if (dir) {
      setProjectPath(dir);
      const name = dir.split(/[\\/]/).pop() || 'Project';
      setProjectName(name);
      
      await fs.initProject(dir, name);
      const fileList = await fs.listCompositions(dir);
      setCompositions(fileList);
      setFiles(fileList);
      
      setStep('select-composition');
    }
  };

  const loadComposition = async (filename: string) => {
    const path = useGraphStore.getState().project.path;
    if (!path) return;

    const content = await fs.readComposition(path, filename);
    if (content) {
      try {
        const data = JSON.parse(content);
        const nodesWithRuntime = data.nodes.map((n: any) => ({
          ...n,
          timer: 0,
          lastTrigger: 0,
          flash: 0,
          heldPackets: [],
        }));
        
        loadGraph(nodesWithRuntime, data.edges);
        
        const scaleName = data.musicalContext.scaleName as ScaleName;
        const scale = SCALES[scaleName];
        if (scale) {
          setMusicalContext({
            root: data.musicalContext.root,
            scaleName,
            scale,
          });
        }
        
        setGlobalSettings({
          subdivisions: data.globalSettings.subdivisions,
          pixelsPerBeat: data.globalSettings.pixelsPerBeat,
          gravityConstant: data.globalSettings.gravityConstant,
        });
        
        setProjectMeta({
          ...data.projectMeta,
          modified: Date.now(),
        });
        
        setCurrentComposition(filename);
        markClean();
        setProjectMode(true);
        setShowProjectStartup(false);
      } catch (err) {
        console.error('Failed to parse composition:', err);
      }
    }
  };

  const createNewComposition = async () => {
    const name = newCompName.trim() || 'Untitled';
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    
    // Clear graph
    clear();
    setProjectMeta({
      name: name.replace('.json', ''),
      author: '',
      created: Date.now(),
      modified: Date.now(),
    });
    
    // Save immediately to create file
    const path = useGraphStore.getState().project.path;
    if (path) {
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
      
      await fs.writeComposition(path, filename, JSON.stringify(data, null, 2));
      const newFiles = await fs.listCompositions(path);
      setCompositions(newFiles);
      setCurrentComposition(filename);
      markClean();
    }

    setProjectMode(true);
    setShowProjectStartup(false);
  };

  const handleTemporarySession = () => {
    setProjectMode(false);
    setShowProjectStartup(false);
  };

  if (step === 'select-composition') {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <div className={styles.title}>Select Composition</div>
            <div className={styles.subtitle}>Choose a file to load or create a new one</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {files.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #333', borderRadius: '4px' }}>
                {files.map(file => (
                  <button 
                    key={file}
                    className={styles.optionButton}
                    style={{ padding: '8px 12px', width: '100%', border: 'none', borderBottom: '1px solid #333' }}
                    onClick={() => loadComposition(file)}
                  >
                    📄 {file.replace('.json', '')}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                className={styles.input} // Assuming you add this class or use inline style
                style={{ flex: 1, padding: '8px', background: '#2a2a2a', border: '1px solid #333', color: '#eee', borderRadius: '4px' }}
                placeholder="New Composition Name"
                value={newCompName}
                onChange={e => setNewCompName(e.target.value)}
              />
              <button 
                className={styles.optionButton} 
                style={{ padding: '8px 16px', width: 'auto' }}
                onClick={createNewComposition}
              >
                Create New
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Welcome to Phonon</div>
          <div className={styles.subtitle}>Select how you want to start your session</div>
        </div>

        <div className={styles.options}>
          <button className={styles.optionButton} onClick={handleOpenProject}>
            <span className={styles.icon}>📂</span>
            <div className={styles.info}>
              <span className={styles.label}>Open / Create Project</span>
              <span className={styles.description}>
                Select a folder to manage your compositions. Files will be saved to disk.
              </span>
            </div>
          </button>

          <div className={styles.divider} />

          <button className={styles.optionButton} onClick={handleTemporarySession}>
            <span className={styles.icon}>⚡</span>
            <div className={styles.info}>
              <span className={styles.label}>Temporary Session</span>
              <span className={styles.description}>
                Quick start without a project folder. Save/Load works via file upload/download.
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
