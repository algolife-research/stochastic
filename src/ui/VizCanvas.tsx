// Stochastic - Visualization Canvas Component
// Renders visualizations when in viz mode

import React, { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '@core/store';
import { vizState } from '@viz/state';
import styles from './VizCanvas.module.css';

// ============================================================================
// VIZ CANVAS COMPONENT
// ============================================================================

export function VizCanvas(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const vizDisplay = useGraphStore(state => state.vizDisplay);
  const editingSceneId = useGraphStore(state => state.editingSceneId);
  const scenes = useGraphStore(state => state.scenes);
  const isRunning = useGraphStore(state => state.isRunning);
  
  // Get current scene's viz config
  const currentScene = editingSceneId ? scenes.get(editingSceneId) : null;
  const vizMode = currentScene?.vizMode || 'editor';
  const vizConfig = currentScene?.vizConfig || null;
  
  // Handle canvas resize
  const handleResize = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // VizRenderer handles DPR internally, so just update the dimensions
    vizState.handleResize(rect.width, rect.height);
  }, []);
  
  // Initialize viz state manager when entering viz mode
  useEffect(() => {
    if (!vizDisplay.isVizMode || !canvasRef.current) return;
    
    // If scene is in editor mode, don't initialize viz renderer
    if (vizMode === 'editor') return;
    
    // Initialize vizState with canvas
    vizState.init(canvasRef.current);
    
    // Set initial mode based on scene config
    vizState.setMode(vizMode, vizConfig ?? undefined);
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Initial resize
    handleResize();
    
    // Cleanup
    return () => {
      resizeObserver.disconnect();
      vizState.dispose();
    };
  }, [vizDisplay.isVizMode, handleResize, vizMode, vizConfig]);
  
  // Update mode when scene viz mode changes
  useEffect(() => {
    if (!vizDisplay.isVizMode) return;
    
    // If scene is in editor mode, don't update viz renderer
    if (vizMode === 'editor') return;
    
    vizState.setMode(vizMode, vizConfig ?? undefined);
  }, [vizDisplay.isVizMode, vizMode, vizConfig]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && vizDisplay.isVizMode) {
        const toggleVizMode = useGraphStore.getState().toggleVizMode;
        toggleVizMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vizDisplay.isVizMode]);
  
  // Don't render if not in viz mode OR if scene is set to editor mode
  // (editor mode means show the regular editor canvas, not a viz overlay)
  if (!vizDisplay.isVizMode || vizMode === 'editor') {
    return <></>;
  }
  
  return (
    <div ref={containerRef} className={styles['vizContainer']}>
      <canvas ref={canvasRef} className={styles['vizCanvas']} />
      
      {/* Overlay info */}
      <div className={styles['vizOverlay']}>
        <span className={styles['vizMode']}>
          {vizMode}
        </span>
        {!isRunning && (
          <span className={styles['vizPaused']}>
            ⏸ Paused - Press Space to play
          </span>
        )}
      </div>
      
      {/* Exit hint */}
      <div className={styles['exitHint']}>
        Press ESC to exit visualization
      </div>
    </div>
  );
}
