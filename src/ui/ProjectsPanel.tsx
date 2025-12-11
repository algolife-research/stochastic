// Phonon - Projects Panel Component
// Cloud and local project management

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@auth/store';
import { TIER_PROJECT_LIMITS } from '@auth/types';
import { useGraphStore } from '@core/store';
import { isCloudStorageAvailable, saveProjectToCloud, loadProjectFromCloud, listCloudProjects, deleteCloudProject } from '../io/cloud-storage';
import type { CloudProjectSummary } from '../io/cloud-storage';
import { deserializeComposition, detectFileVersion, migrateV2ToV3, serializeComposition, saveCompositionToFile } from '../io/file-io';
import type { SerializedGraph, SerializedComposition } from '../io/file-io';
import { SCALES } from '@core/constants';
import type { ScaleName } from '@core/types';
import styles from './ProjectsPanel.module.css';

export function ProjectsPanel(): React.ReactElement {
  const { isAuthenticated, license } = useAuth();
  const [cloudProjects, setCloudProjects] = useState<CloudProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameTempName, setRenameTempName] = useState('');

  // Store access
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
  const markClean = useGraphStore(state => state.markClean);

  // Fetch cloud projects on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && isCloudStorageAvailable()) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCloudProjects();
      if (result.success && result.projects) {
        setCloudProjects(result.projects);
      } else {
        setError(result.error || 'Failed to load projects');
      }
    } catch (e) {
      setError('Network error');
    }
    setIsLoading(false);
  }, []);

  const handleSaveToCloud = useCallback(async () => {
    if (!isCloudStorageAvailable()) return;

    // Check project limit for free users (only when creating new project)
    if (!currentProjectId) {
      const userTier = license?.tier || 'free';
      const projectLimit = TIER_PROJECT_LIMITS[userTier];
      if (projectLimit !== null && cloudProjects.length >= projectLimit) {
        setError(`Free tier is limited to ${projectLimit} projects. Upgrade to Pro or VIP for unlimited projects.`);
        return;
      }
    }

    setSavingState('saving');
    const compositionData = serializeComposition(
      scenes,
      arrangement,
      arrangementChannels,
      musicalContext,
      globalSettings,
      projectMeta,
      masterSpeed
    );

    const result = await saveProjectToCloud(compositionData, {
      id: currentProjectId || undefined,
      name: projectMeta.name || 'Untitled',
    });

    if (result.success && result.projectId) {
      setCurrentProjectId(result.projectId);
      markClean();
      setSavingState('success');
      fetchProjects(); // Refresh list
      setTimeout(() => setSavingState('idle'), 2000);
    } else {
      setSavingState('error');
      setError(result.error || 'Save failed');
      setTimeout(() => setSavingState('idle'), 3000);
    }
  }, [scenes, arrangement, arrangementChannels, masterSpeed, musicalContext, globalSettings, projectMeta, currentProjectId, markClean, fetchProjects, license, cloudProjects.length]);

  const handleLoadProject = useCallback(async (projectId: string) => {
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
        setCurrentProjectId(projectId);
        markClean();
      } catch (e) {
        setError('Failed to parse project data');
      }
    } else {
      setError(result.error || 'Load failed');
    }
    setIsLoading(false);
  }, [loadComposition, setMusicalContext, setGlobalSettings, setProjectMeta, markClean]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    const result = await deleteCloudProject(projectId);
    if (result.success) {
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
      fetchProjects();
    } else {
      setError(result.error || 'Delete failed');
    }
  }, [currentProjectId, fetchProjects]);

  const handleLocalSave = useCallback(async () => {
    await saveCompositionToFile(
      projectMeta.name || 'composition',
      scenes,
      arrangement,
      arrangementChannels,
      musicalContext,
      globalSettings,
      projectMeta,
      masterSpeed
    );
  }, [scenes, arrangement, arrangementChannels, masterSpeed, musicalContext, globalSettings, projectMeta]);

  const handleLocalLoad = useCallback(async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.phono,.json';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const rawData = JSON.parse(text);
        const version = detectFileVersion(rawData);
        
        let data;
        if (version === '2.0') {
          const v3Data = migrateV2ToV3(rawData as SerializedGraph);
          data = deserializeComposition(v3Data);
        } else {
          data = deserializeComposition(rawData as SerializedComposition);
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
        setProjectMeta({ ...data.projectMeta, name: file.name.replace(/\.(phono|json)$/, '') });
        setCurrentProjectId(null);
        markClean();
      } catch {
        setError('Failed to load file');
      }
    };
    fileInput.click();
  }, [loadComposition, setMusicalContext, setGlobalSettings, setProjectMeta, markClean]);

  // Start editing the current project name
  const handleStartRename = useCallback(() => {
    setEditingName(true);
    setTempName(projectMeta.name || 'Untitled');
  }, [projectMeta.name]);

  // Save the current project name
  const handleSaveRename = useCallback(async () => {
    if (tempName.trim()) {
      setProjectMeta({ ...projectMeta, name: tempName.trim() });
      // If it's a cloud project, save the update
      if (currentProjectId) {
        await handleSaveToCloud();
      }
    }
    setEditingName(false);
  }, [tempName, projectMeta, currentProjectId, setProjectMeta, handleSaveToCloud]);

  // Cancel editing
  const handleCancelRename = useCallback(() => {
    setEditingName(false);
    setTempName('');
  }, []);

  // Start renaming a cloud project in the list
  const handleStartCloudRename = useCallback((proj: CloudProjectSummary) => {
    setRenamingProjectId(proj.id);
    setRenameTempName(proj.name);
  }, []);

  // Save cloud project rename
  const handleSaveCloudRename = useCallback(async (projectId: string) => {
    if (renameTempName.trim()) {
      // Load the project, update name, and save back
      const result = await loadProjectFromCloud(projectId);
      if (result.success && result.project) {
        const updatedData = { ...result.project.data };
        if (updatedData.meta) {
          updatedData.meta.name = renameTempName.trim();
        }
        await saveProjectToCloud(updatedData, {
          id: projectId,
          name: renameTempName.trim(),
        });
        fetchProjects();
      }
    }
    setRenamingProjectId(null);
    setRenameTempName('');
  }, [renameTempName, fetchProjects]);

  // Format date with time for better distinction
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isThisYear) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             ` ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.projectsPanel}>
      {/* Current Project Info */}
      <div className={styles.currentProject}>
        {editingName ? (
          <div className={styles.renameRow}>
            <input
              type="text"
              value={tempName}
              onChange={e => setTempName(e.target.value)}
              className={styles.renameInput}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename();
                if (e.key === 'Escape') handleCancelRename();
              }}
            />
            <button className={styles.renameAction} onClick={handleSaveRename} title="Save">✓</button>
            <button className={styles.renameAction} onClick={handleCancelRename} title="Cancel">✕</button>
          </div>
        ) : (
          <div className={styles.projectName}>
            <span className={styles.projectIcon}>📁</span>
            <span className={styles.projectNameText}>{projectMeta.name || 'Untitled'}</span>
            {currentProjectId && <span className={styles.cloudBadge}>☁️</span>}
            <button className={styles.renameButton} onClick={handleStartRename} title="Rename project">
              ✏️
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button className={styles.actionButton} onClick={handleLocalLoad}>
          <span>📂</span> Open Local
        </button>
        <button className={styles.actionButton} onClick={handleLocalSave}>
          <span>💾</span> Save Local
        </button>
      </div>

      {/* Cloud Section */}
      <div className={styles.cloudSection}>
        <div className={styles.sectionHeader}>
          <span>☁️ Cloud Projects</span>
          {isAuthenticated && (
            <button className={styles.refreshButton} onClick={fetchProjects} disabled={isLoading}>
              🔄
            </button>
          )}
        </div>

        {!isAuthenticated ? (
          <div className={styles.authPrompt}>
            <p>Sign in to save and sync projects across devices</p>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <>
            {/* Save to Cloud Button */}
            <button 
              className={`${styles.saveCloudButton} ${savingState === 'success' ? styles.success : ''} ${savingState === 'error' ? styles.error : ''}`}
              onClick={handleSaveToCloud}
              disabled={savingState === 'saving'}
            >
              {savingState === 'saving' ? '⏳ Saving...' : 
               savingState === 'success' ? '✓ Saved!' :
               savingState === 'error' ? '✗ Error' :
               currentProjectId ? '☁️ Update Cloud' : '☁️ Save to Cloud'}
            </button>

            {/* Project Usage Indicator */}
            {(() => {
              const userTier = license?.tier || 'free';
              const projectLimit = TIER_PROJECT_LIMITS[userTier];
              return (
                <div className={styles.usageIndicator}>
                  <span className={styles.tierBadge} data-tier={userTier}>
                    {userTier.toUpperCase()}
                  </span>
                  <span className={styles.usageText}>
                    {projectLimit !== null 
                      ? `${cloudProjects.length}/${projectLimit} projects`
                      : `${cloudProjects.length} projects (unlimited)`
                    }
                  </span>
                </div>
              );
            })()}

            {/* Error Display */}
            {error && (
              <div className={styles.errorMessage}>{error}</div>
            )}

            {/* Project List */}
            <div className={styles.projectList}>
              {cloudProjects.length === 0 ? (
                <div className={styles.emptyState}>
                  No cloud projects yet
                </div>
              ) : (
                cloudProjects.map(proj => (
                  <div 
                    key={proj.id} 
                    className={`${styles.projectItem} ${proj.id === currentProjectId ? styles.active : ''}`}
                  >
                    {renamingProjectId === proj.id ? (
                      <div className={styles.projectItemRename}>
                        <input
                          type="text"
                          value={renameTempName}
                          onChange={e => setRenameTempName(e.target.value)}
                          className={styles.renameInput}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveCloudRename(proj.id);
                            if (e.key === 'Escape') {
                              setRenamingProjectId(null);
                              setRenameTempName('');
                            }
                          }}
                        />
                        <button className={styles.renameAction} onClick={() => handleSaveCloudRename(proj.id)} title="Save">✓</button>
                        <button className={styles.renameAction} onClick={() => { setRenamingProjectId(null); setRenameTempName(''); }} title="Cancel">✕</button>
                      </div>
                    ) : (
                      <>
                        <div 
                          className={styles.projectInfo}
                          onClick={() => handleLoadProject(proj.id)}
                        >
                          <span className={styles.projectItemName}>{proj.name}</span>
                          <span className={styles.projectDate}>
                            {formatDateTime(proj.updatedAt)}
                          </span>
                          <span className={styles.projectId}>
                            #{proj.id.slice(0, 6)}
                          </span>
                        </div>
                        <div className={styles.projectActions}>
                          <button 
                            className={styles.actionIconButton}
                            onClick={() => handleStartCloudRename(proj)}
                            title="Rename project"
                          >
                            ✏️
                          </button>
                          <button 
                            className={styles.deleteButton}
                            onClick={() => handleDeleteProject(proj.id)}
                            title="Delete project"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
