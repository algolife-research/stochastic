// Stochastic - Welcome Modal for Web Users
// Shows on first load with options to load cloud project, start temporary, or load from file

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@auth/store';
import { useGraphStore } from '@core/store';
import { isCloudStorageAvailable, listCloudProjects, loadProjectFromCloud } from '../io/cloud-storage';
import type { CloudProjectSummary } from '../io/cloud-storage';
import { deserializeComposition, detectFileVersion, migrateV2ToV3, loadCompositionFromFile } from '../io/file-io';
import type { SerializedGraph, SerializedComposition } from '../io/file-io';
import { isTauri } from '../io/filesystem';
import { SCALES } from '@core/constants';
import type { ScaleName } from '@core/types';
import { AuthModal } from './AuthModal';
import styles from './ProjectStartupModal.module.css';

export function WelcomeModal(): React.ReactElement | null {
  const { isAuthenticated } = useAuth();
  const showWelcome = useGraphStore(state => state.showProjectStartup);
  const setShowWelcome = useGraphStore(state => state.setShowProjectStartup);
  const loadComposition = useGraphStore(state => state.loadComposition);
  const setMusicalContext = useGraphStore(state => state.setMusicalContext);
  const setGlobalSettings = useGraphStore(state => state.setGlobalSettings);
  const setProjectMeta = useGraphStore(state => state.setProjectMeta);
  const markClean = useGraphStore(state => state.markClean);
  const setCloudProjectId = useGraphStore(state => state.setCloudProjectId);
  
  const [step, setStep] = useState<'welcome' | 'cloud-projects' | 'signing-in'>('welcome');
  const [cloudProjects, setCloudProjects] = useState<CloudProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [wasSigningIn, setWasSigningIn] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // When auth modal closes and user is now authenticated, show cloud projects
  useEffect(() => {
    if (wasSigningIn && !showAuthModal && isAuthenticated) {
      setWasSigningIn(false);
      handleShowCloudProjects();
    }
  }, [showAuthModal, isAuthenticated, wasSigningIn]);
  
  // Don't show in Tauri or if already dismissed
  if (isTauri() || !showWelcome) {
    return null;
  }
  
  const fetchCloudProjects = async () => {
    if (!isAuthenticated || !isCloudStorageAvailable()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCloudProjects();
      if (result.success && result.projects) {
        setCloudProjects(result.projects);
      } else {
        setError(result.error || 'Failed to load projects');
      }
    } catch {
      setError('Network error');
    }
    setIsLoading(false);
  };
  
  const handleTemporarySession = () => {
    setShowWelcome(false);
  };
  
  const handleSignInForCloud = () => {
    setWasSigningIn(true);
    setShowAuthModal(true);
  };
  
  const handleShowCloudProjects = async () => {
    setStep('cloud-projects');
    await fetchCloudProjects();
  };
  
  const handleLoadCloudProject = async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    
    const result = await loadProjectFromCloud(projectId);
    if (result.success && result.project) {
      try {
        const projectData = result.project.data;
        const version = detectFileVersion(projectData);
        let data;
        if (version === '2.0') {
          const v3Data = migrateV2ToV3(projectData as unknown as SerializedGraph);
          data = deserializeComposition(v3Data);
        } else {
          data = deserializeComposition(projectData as SerializedComposition);
        }

        loadComposition(data.scenes, data.arrangement, data.channels, data.masterBpm);

        const scaleName = data.musicalContext.scaleName as ScaleName;
        const scale = SCALES[scaleName];
        if (scale) {
          setMusicalContext({
            root: data.musicalContext.root,
            scaleName,
            scale,
          });
        }

        setGlobalSettings(data.globalSettings);
        setProjectMeta(data.projectMeta);
        setCloudProjectId(projectId);
        markClean();
        setShowWelcome(false);
      } catch {
        setError('Failed to parse project data');
      }
    } else {
      setError(result.error || 'Load failed');
    }
    setIsLoading(false);
  };
  
  const handleLoadFromFile = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await loadCompositionFromFile(file);
      
      loadComposition(data.scenes, data.arrangement, data.channels, data.masterBpm);

      const scaleName = data.musicalContext.scaleName as ScaleName;
      const scale = SCALES[scaleName];
      if (scale) {
        setMusicalContext({
          root: data.musicalContext.root,
          scaleName,
          scale,
        });
      }

      setGlobalSettings(data.globalSettings);
      setProjectMeta({
        name: file.name.replace('.sto', '').replace('.json', ''),
        author: data.projectMeta.author || '',
        created: data.projectMeta.created || Date.now(),
        modified: Date.now(),
      });
      markClean();
      setShowWelcome(false);
    } catch (err) {
      setError('Failed to load file. Make sure it\'s a valid .sto file.');
      console.error('Load error:', err);
    }
    
    setIsLoading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Cloud Projects step
  if (step === 'cloud-projects') {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <div className={styles.title}>☁️ Cloud Projects</div>
            <div className={styles.subtitle}>Select a project to continue working on</div>
          </div>
          
          {error && (
            <div style={{ padding: '8px 12px', background: '#ff000030', border: '1px solid #ff0000', borderRadius: '4px', color: '#ff6b6b', fontSize: '13px' }}>
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Loading projects...</div>
          ) : cloudProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
              No cloud projects yet. Start a new project and save it to the cloud!
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cloudProjects.map(proj => (
                <button
                  key={proj.id}
                  onClick={() => handleLoadCloudProject(proj.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#2a2a2a',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#eee',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#333';
                    e.currentTarget.style.borderColor = '#444';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#2a2a2a';
                    e.currentTarget.style.borderColor = '#333';
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{proj.name}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>{formatDate(proj.updatedAt)}</span>
                </button>
              ))}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => setStep('welcome')}
              style={{
                flex: 1,
                padding: '10px',
                background: '#333',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={fetchCloudProjects}
              disabled={isLoading}
              style={{
                padding: '10px 16px',
                background: '#333',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#ccc',
                cursor: isLoading ? 'wait' : 'pointer',
                fontSize: '14px',
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Welcome step
  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <div className={styles.title}>Welcome to Stochastic</div>
            <div className={styles.subtitle}>Choose how you want to start</div>
          </div>
          
          <div className={styles.options}>
            {/* Cloud Projects Option */}
            {isAuthenticated ? (
              <button className={styles.optionButton} onClick={handleShowCloudProjects}>
                <span className={styles.icon}>☁️</span>
                <div className={styles.info}>
                  <span className={styles.label}>Open Cloud Project</span>
                  <span className={styles.description}>
                    Continue working on a project saved to your account
                  </span>
                </div>
              </button>
            ) : (
              <button className={styles.optionButton} onClick={handleSignInForCloud}>
                <span className={styles.icon}>☁️</span>
                <div className={styles.info}>
                  <span className={styles.label}>Sign In for Cloud Projects</span>
                  <span className={styles.description}>
                    Save and sync projects across devices
                  </span>
                </div>
              </button>
            )}
            
            <div className={styles.divider} />
            
            {/* Load from File */}
            <button className={styles.optionButton} onClick={handleLoadFromFile}>
              <span className={styles.icon}>📂</span>
              <div className={styles.info}>
                <span className={styles.label}>Open from File</span>
                <span className={styles.description}>
                  Load a .sto composition file from your computer
                </span>
              </div>
            </button>
            
            <div className={styles.divider} />
            
            {/* Temporary Session */}
            <button className={styles.optionButton} onClick={handleTemporarySession}>
              <span className={styles.icon}>⚡</span>
              <div className={styles.info}>
                <span className={styles.label}>New Project</span>
                <span className={styles.description}>
                  Start fresh. Save to cloud or export to file when ready.
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".sto,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
      
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            // Check auth after modal closes - need to re-render to get updated state
          }} 
        />
      )}
    </>
  );
}
