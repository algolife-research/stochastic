// Stochastic - Welcome Modal for Web Users
// First-run entry point: guided paths to sound (tutorial, demo) plus
// cloud/file/new-project options. Dismissible with Esc, ×, or "New Project".

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@auth/store';
import { useGraphStore } from '@core/store';
import { isCloudStorageAvailable, listCloudProjects, loadProjectFromCloud } from '../io/cloud-storage';
import type { CloudProjectSummary } from '../io/cloud-storage';
import { deserializeComposition, detectFileVersion, migrateV2ToV3, loadCompositionFromFile } from '../io/file-io';
import type { SerializedGraph, SerializedComposition } from '../io/file-io';
import { isTauri } from '../io/filesystem';
import { loadBundledExample } from '../data/examples';
import { SCALES } from '@core/constants';
import type { ScaleName } from '@core/types';
import { AuthModal } from './AuthModal';
import styles from './WelcomeModal.module.css';

const SKIP_STORAGE_KEY = 'stochastic-skip-welcome';

function readSkipPreference(): boolean {
  try {
    return localStorage.getItem(SKIP_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeSkipPreference(skip: boolean): void {
  try {
    if (skip) {
      localStorage.setItem(SKIP_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(SKIP_STORAGE_KEY);
    }
  } catch {
    // Private browsing: preference simply isn't remembered
  }
}

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

  const [step, setStep] = useState<'welcome' | 'cloud-projects'>('welcome');
  const [cloudProjects, setCloudProjects] = useState<CloudProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [wasSigningIn, setWasSigningIn] = useState(false);
  const [skipOnStartup, setSkipOnStartup] = useState(readSkipPreference);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const dismiss = useCallback(() => {
    setShowWelcome(false);
  }, [setShowWelcome]);

  // Respect the "don't show again" preference
  const skippedRef = useRef(false);
  useEffect(() => {
    if (showWelcome && readSkipPreference() && !skippedRef.current) {
      skippedRef.current = true;
      dismiss();
    }
  }, [showWelcome, dismiss]);

  // Close on Escape (but not while the auth modal is open)
  useEffect(() => {
    if (!showWelcome || showAuthModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, showAuthModal, dismiss]);

  const fetchCloudProjects = useCallback(async () => {
    if (!isCloudStorageAvailable()) return;
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
  }, []);

  const handleShowCloudProjects = useCallback(async () => {
    setStep('cloud-projects');
    await fetchCloudProjects();
  }, [fetchCloudProjects]);

  // When auth modal closes and user is now authenticated, show cloud projects
  useEffect(() => {
    if (wasSigningIn && !showAuthModal && isAuthenticated) {
      setWasSigningIn(false);
      handleShowCloudProjects();
    }
  }, [showAuthModal, isAuthenticated, wasSigningIn, handleShowCloudProjects]);

  // Don't show in Tauri (ProjectStartupModal handles that) or if dismissed
  if (isTauri() || !showWelcome) {
    return null;
  }

  const handleSkipToggle = (skip: boolean) => {
    setSkipOnStartup(skip);
    writeSkipPreference(skip);
  };

  /**
   * Load a bundled example from the welcome screen (works offline). The app
   * seeds a placeholder scene on startup; since the user hasn't touched it
   * yet, replace it with the example's scenes instead of piling them on top.
   */
  const loadExampleFresh = (exampleKey: string) => {
    const store = useGraphStore.getState();
    const placeholderSceneIds = [...store.scenes.keys()];
    loadBundledExample(exampleKey);
    placeholderSceneIds.forEach(id => store.deleteScene(id));
  };

  const handleStartTutorial = () => {
    loadExampleFresh('tutorial');
    dismiss();
  };

  const handlePlayDemo = () => {
    loadExampleFresh('pachelbel_canon');
    const store = useGraphStore.getState();
    if (!store.isRunning) {
      store.togglePlayback();
    }
    dismiss();
  };

  const handleSignInForCloud = () => {
    setWasSigningIn(true);
    setShowAuthModal(true);
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
        dismiss();
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
      dismiss();
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
          <button className={styles.closeButton} onClick={dismiss} title="Close (Esc)">✕</button>
          <div className={styles.header}>
            <div className={styles.title}>☁️ Cloud Projects</div>
            <div className={styles.subtitle}>Select a project to continue working on</div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {isLoading ? (
            <div className={styles.emptyState}>Loading projects...</div>
          ) : cloudProjects.length === 0 ? (
            <div className={styles.emptyState}>
              No cloud projects yet. Start a new project and save it to the cloud!
            </div>
          ) : (
            <div className={styles.projectList}>
              {cloudProjects.map(proj => (
                <button
                  key={proj.id}
                  className={styles.projectButton}
                  onClick={() => handleLoadCloudProject(proj.id)}
                >
                  <span className={styles.projectName}>{proj.name}</span>
                  <span className={styles.projectDate}>{formatDate(proj.updatedAt)}</span>
                </button>
              ))}
            </div>
          )}

          <div className={styles.actionRow}>
            <button className={styles.backButton} onClick={() => setStep('welcome')}>
              ← Back
            </button>
            <button
              className={styles.secondaryButton}
              onClick={fetchCloudProjects}
              disabled={isLoading}
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
          <button className={styles.closeButton} onClick={dismiss} title="Close (Esc)">✕</button>
          <div className={styles.header}>
            <div className={styles.title}>Welcome to Stochastic</div>
            <div className={styles.subtitle}>
              Compose generative music by connecting nodes — distance is rhythm, topology is melody
            </div>
          </div>

          <div className={styles.options}>
            {/* New user paths: straight to sound */}
            <button
              className={`${styles.optionButton} ${styles.optionButtonPrimary}`}
              onClick={handleStartTutorial}
            >
              <span className={styles.icon}>🎓</span>
              <div className={styles.info}>
                <span className={styles.label}>Start the Tutorial</span>
                <span className={styles.description}>
                  Ten guided scenes, from your first sound to advanced graphs
                </span>
              </div>
            </button>

            <button
              className={`${styles.optionButton} ${styles.optionButtonPrimary}`}
              onClick={handlePlayDemo}
            >
              <span className={styles.icon}>▶️</span>
              <div className={styles.info}>
                <span className={styles.label}>Play a Demo</span>
                <span className={styles.description}>
                  Hear Pachelbel&apos;s Canon reimagined as a generative graph
                </span>
              </div>
            </button>

            <div className={styles.divider} />

            {/* Returning user paths */}
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

            <button className={styles.optionButton} onClick={handleLoadFromFile}>
              <span className={styles.icon}>📂</span>
              <div className={styles.info}>
                <span className={styles.label}>Open from File</span>
                <span className={styles.description}>
                  Load a .sto composition file from your computer
                </span>
              </div>
            </button>

            <button className={styles.optionButton} onClick={dismiss}>
              <span className={styles.icon}>⚡</span>
              <div className={styles.info}>
                <span className={styles.label}>New Project</span>
                <span className={styles.description}>
                  Start fresh. Save to cloud or export to file when ready.
                </span>
              </div>
            </button>
          </div>

          <div className={styles.footer}>
            <label className={styles.skipLabel}>
              <input
                type="checkbox"
                checked={skipOnStartup}
                onChange={e => handleSkipToggle(e.target.checked)}
              />
              Don&apos;t show this on startup
            </label>
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
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}
