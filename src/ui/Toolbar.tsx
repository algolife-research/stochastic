// Stochastic v2 - Toolbar Component (Compact)

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '@core/store';
import { useAuth } from '@auth/store';
import { isCloudStorageAvailable, saveProjectToCloud } from '../io/cloud-storage';
import { serializeComposition } from '../io/file-io';
import { NodeMenu } from './NodeMenu';
import { ExampleMenu } from './ExampleMenu';
import { FileDropdown } from './FileDropdown';
import { UserMenu, AuthModal } from './AuthModal';
import { DocsModal } from './DocsModal';
import { isTauri } from '../io/filesystem';
import type { LayoutAlgorithm } from '@core/layout';
import styles from './Toolbar.module.css';

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  onShowSettings: () => void;
  onShowExport: () => void;
}

export function Toolbar({ onShowSettings, onShowExport }: ToolbarProps): React.ReactElement {
  const { isAuthenticated } = useAuth();
  const project = useGraphStore(state => state.project);
  const selection = useGraphStore(state => state.selection);
  const clipboard = useGraphStore(state => state.clipboard);
  const nodes = useGraphStore(state => state.nodes);
  const projectMeta = useGraphStore(state => state.projectMeta);
  const isDirty = useGraphStore(state => state.isDirty);
  const markClean = useGraphStore(state => state.markClean);
  const cloudProjectId = useGraphStore(state => state.cloudProjectId);
  const setCloudProjectId = useGraphStore(state => state.setCloudProjectId);
  const saveCurrentScene = useGraphStore(state => state.saveCurrentScene);
  const setProjectMeta = useGraphStore(state => state.setProjectMeta);
  
  const deleteNode = useGraphStore(state => state.deleteNode);
  const deleteEdge = useGraphStore(state => state.deleteEdge);
  const deleteAnnotation = useGraphStore(state => state.deleteAnnotation);
  const deleteRegion = useGraphStore(state => state.deleteRegion);
  const copySelectedNodes = useGraphStore(state => state.copySelectedNodes);
  const pasteNodes = useGraphStore(state => state.pasteNodes);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Check if there's anything selected
  const hasSelection = selection.selectedNodeIds.length > 0 || 
    selection.selectedEdgeId !== null || 
    selection.selectedAnnotationId !== null || 
    selection.selectedRegionId !== null;
  
  const hasClipboard = clipboard !== null && clipboard.nodes.length > 0;
  const hasNodes = nodes.size > 0;

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

  const handleAutoLayout = useCallback((algorithm: LayoutAlgorithm) => {
    useGraphStore.getState().autoLayout(algorithm);
    setShowLayoutMenu(false);
  }, []);

  const handleSaveToCloud = useCallback(async () => {
    if (!isAuthenticated || !isCloudStorageAvailable()) return;
    
    setSavingToCloud(true);
    try {
      // Save current canvas state to editing scene first
      saveCurrentScene();
      
      // Get FRESH state from store after saving (avoid stale closure)
      const store = useGraphStore.getState();
      const compositionData = serializeComposition(
        store.scenes,
        store.arrangement,
        store.arrangementChannels,
        store.musicalContext,
        store.globalSettings,
        store.projectMeta,
        store.masterSpeed
      );
      
      const result = await saveProjectToCloud(compositionData, {
        id: store.cloudProjectId || undefined,
        name: store.projectMeta.name || 'Untitled',
      });
      
      if (result.success) {
        if (result.projectId) {
          setCloudProjectId(result.projectId);
        }
        markClean();
        // Notify other components to refresh cloud projects list
        window.dispatchEvent(new CustomEvent('stochastic-cloud-projects-changed'));
      }
    } catch (error) {
      console.error('Failed to save to cloud:', error);
    } finally {
      setSavingToCloud(false);
    }
  }, [isAuthenticated, setCloudProjectId, markClean, saveCurrentScene]);

  // Handle inline rename
  const handleStartRename = useCallback(() => {
    setTempName(projectMeta.name || 'Untitled');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }, [projectMeta.name]);

  const handleSaveRename = useCallback(async () => {
    const newName = tempName.trim() || 'Untitled';
    if (newName !== projectMeta.name) {
      setProjectMeta({ ...projectMeta, name: newName, modified: Date.now() });
      // If it's a cloud project, trigger save
      if (cloudProjectId && isAuthenticated && isCloudStorageAvailable()) {
        // Delay to let state update
        setTimeout(() => {
          handleSaveToCloud();
        }, 50);
      }
    }
    setEditingName(false);
  }, [tempName, projectMeta, cloudProjectId, isAuthenticated, setProjectMeta, handleSaveToCloud]);

  const handleCancelRename = useCallback(() => {
    setEditingName(false);
    setTempName('');
  }, []);

  // Close layout menu when clicking outside and track button position
  const layoutRef = useRef<HTMLDivElement>(null);
  const layoutButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (!showLayoutMenu) return;
    
    // Calculate position from button
    if (layoutButtonRef.current) {
      const rect = layoutButtonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLayoutMenu]);
  
  return (
    <div className={styles['toolbar']}>
      <FileDropdown onShowExport={onShowExport} />
      
      {/* Project name with dirty indicator, cloud status, and inline editing */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        padding: '0 12px',
        color: '#aaa',
        fontSize: '13px',
        fontWeight: 500
      }}>
        {editingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveRename();
              if (e.key === 'Escape') handleCancelRename();
            }}
            style={{
              background: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              padding: '2px 6px',
              width: '150px',
              outline: 'none',
            }}
            autoFocus
          />
        ) : (
          <span 
            onClick={handleStartRename}
            style={{ 
              color: '#ddd', 
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '3px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Click to rename"
          >
            {projectMeta.name || 'Untitled'}
          </span>
        )}
        {cloudProjectId ? (
          <span style={{ fontSize: '12px', opacity: 0.7 }} title="Saved to cloud">☁️</span>
        ) : (
          <span style={{ fontSize: '10px', color: '#888', fontStyle: 'italic' }} title="Local project (not saved to cloud)">local</span>
        )}
        {isDirty && <span style={{ color: '#f59e0b', fontSize: '16px' }} title="Unsaved changes">●</span>}
        {isAuthenticated && isCloudStorageAvailable() && (
          <button
            onClick={handleSaveToCloud}
            disabled={savingToCloud}
            style={{
              background: 'none',
              border: 'none',
              cursor: savingToCloud ? 'wait' : 'pointer',
              padding: '2px 4px',
              fontSize: '14px',
              opacity: savingToCloud ? 0.5 : 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = savingToCloud ? '0.5' : '0.7'}
            title={savingToCloud ? 'Saving to cloud...' : 'Save to cloud'}
          >
            💾
          </button>
        )}
      </div>
      
      <div className={styles['separator']} />

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

      {/* Auto-layout button with dropdown */}
      <div className={styles['layoutContainer']}>
        <button 
          ref={layoutButtonRef}
          className={styles['actionButton']} 
          onClick={() => setShowLayoutMenu(!showLayoutMenu)} 
          title="Auto Layout"
          disabled={!hasNodes}
          style={{ opacity: !hasNodes ? 0.4 : 1 }}
        >
          <span className={styles['icon']}>📐</span>
        </button>
        {showLayoutMenu && hasNodes && createPortal(
          <div 
            ref={layoutRef}
            className={styles['layoutMenu']}
            style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left }}
          >
            <button onClick={() => handleAutoLayout('hierarchical')}>
              Hierarchical (L→R)
            </button>
            <button onClick={() => handleAutoLayout('force')}>
              Force Directed
            </button>
            <button onClick={() => handleAutoLayout('circular')}>
              Circular
            </button>
          </div>,
          document.body
        )}
      </div>

      <div className={styles['separator']} />

      {/* Node selection menu (collapsible) */}
      <NodeMenu />
      
      <div className={styles['separator']} />
      
      {/* Examples menu (collapsible) */}
      <ExampleMenu />

      <div className={styles['separator']} />

      {/* Help/Docs button */}
      <button 
        className={styles['actionButton']} 
        onClick={() => setShowDocsModal(true)} 
        title="Documentation"
      >
        <span className={styles['icon']}>📚</span>
      </button>

      {isTauri() && project.isProjectMode && project.path && (
        <>
          <div className={styles['separator']} />
          <span style={{ color: '#888', fontSize: '12px' }}>
            📁 {project.name} / {project.currentComposition?.replace('.sto', '') || 'No file'}
          </span>
        </>
      )}
      
      {/* Spacer to push user menu to the right */}
      <div style={{ flex: 1 }} />
      
      {/* User menu */}
      <UserMenu onSignInClick={() => setShowAuthModal(true)} />
      
      {/* Auth modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      {/* Docs modal */}
      <DocsModal isOpen={showDocsModal} onClose={() => setShowDocsModal(false)} />
    </div>
  );
}

