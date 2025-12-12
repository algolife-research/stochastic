// Stochastic v2 - Toolbar Component (Compact)

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '@core/store';
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
  const project = useGraphStore(state => state.project);
  const selection = useGraphStore(state => state.selection);
  const clipboard = useGraphStore(state => state.clipboard);
  const nodes = useGraphStore(state => state.nodes);
  
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
      <FileDropdown onShowSettings={onShowSettings} onShowExport={onShowExport} />

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

