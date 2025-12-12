// Stochastic v3 - Main Application Component

import React, { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '@core/store';
import { startTick, stopTick, resetTick } from '@core/tick';
import { CanvasRenderer } from '@canvas/renderer';
import { CanvasInputHandler } from '@canvas/input';
import { audioEngine } from '@audio/engine';
import { useAuthStore } from '@auth/store';
import { Toolbar } from './Toolbar';
import { TransportBar } from './TransportBar';
import { StatusBar } from './StatusBar';
import { ContextMenu } from './ContextMenu';
import { ProjectStartupModal } from './ProjectStartupModal';
import { SettingsModal } from './SettingsModal';
import { ExportModal } from './ExportModal';
import { ScenePanel } from './ScenePanel';
import { ArrangementTimeline } from './ArrangementTimeline';
import { VizCanvas } from './VizCanvas';
import { RightPanel } from './RightPanel';
import { MobileWarning } from './MobileWarning';
import styles from './App.module.css';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export function App(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const inputHandlerRef = useRef<CanvasInputHandler | null>(null);
  
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  
  // Panel collapse state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  
  const isRunning = useGraphStore(state => state.isRunning);
  const selection = useGraphStore(state => state.selection);
  const nodes = useGraphStore(state => state.nodes);
  const edges = useGraphStore(state => state.edges);
  const annotations = useGraphStore(state => state.annotations);
  const regions = useGraphStore(state => state.regions);
  
  // Get selected node for property panel
  const selectedNodeId = selection.selectedNodeIds[0];
  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : null;
  
  // Get selected edge for edge panel
  const selectedEdgeId = selection.selectedEdgeId;
  const selectedEdge = selectedEdgeId ? edges.get(selectedEdgeId) : null;
  
  // Get selected annotation or region for property panel
  const selectedAnnotationId = selection.selectedAnnotationId;
  const selectedAnnotation = selectedAnnotationId ? annotations.get(selectedAnnotationId) : null;
  
  const selectedRegionId = selection.selectedRegionId;
  const selectedRegion = selectedRegionId ? regions.get(selectedRegionId) : null;
  
  /**
   * Initialize canvas and audio
   */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Initialize renderer
    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;
    
    // Initialize input handler
    const inputHandler = new CanvasInputHandler(canvasRef.current);
    inputHandlerRef.current = inputHandler;
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        renderer.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Initial resize
    const rect = containerRef.current.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
    
    // Start render loop
    renderer.start();
    
    // Start tick system
    startTick();
    
    // Initialize auth
    useAuthStore.getState().initialize();
    
    // Initialize default scene if none exist
    const initDefaultScene = () => {
      const store = useGraphStore.getState();
      if (store.scenes.size === 0) {
        // Create a default scene with a source node
        const sceneId = store.createScene('Scene 1');
        store.loadSceneToCanvas(sceneId);
        
        // Add a default source node at center
        store.addNode('source', 400, 300);
      }
    };
    initDefaultScene();
    
    // Initialize audio (deferred until user interaction)
    const initAudio = async () => {
      await audioEngine.initialize();
      setIsAudioReady(true);
    };
    
    // Listen for first user interaction to start audio
    const handleFirstInteraction = () => {
      initAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    // Cleanup
    return () => {
      renderer.stop();
      stopTick();
      inputHandler.destroy();
      resizeObserver.disconnect();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);
  
  /**
   * Handle playback state changes
   */
  useEffect(() => {
    if (isRunning) {
      resetTick();
    }
  }, [isRunning]);
  
  /**
   * Handle audio state sync
   */
  useEffect(() => {
    if (isAudioReady) {
      audioEngine.resume();
    }
  }, [isRunning, isAudioReady]);
  
  // Get UI scale from global settings
  const uiScale = useGraphStore(state => state.globalSettings.uiScale);
  
  // Calculate the transform scale
  const scaleValue = uiScale / 100;
  
  return (
    <div 
      className={styles['app']}
      style={{
        transform: `scale(${scaleValue})`,
        transformOrigin: 'top left',
        width: `${100 / scaleValue}%`,
        height: `${100 / scaleValue}%`,
      }}
    >
      {/* Mobile Warning */}
      <MobileWarning />
      
      {/* Project Startup Modal (Tauri only) */}
      <ProjectStartupModal />

      {/* Toolbar with File Menu */}
      <Toolbar 
        onShowSettings={() => setShowSettings(true)}
        onShowExport={() => setShowExport(true)}
      />
      
      {/* Main content area */}
      <div className={styles['mainContent']}>
        {/* Scene panel on the left */}
        <ScenePanel 
          collapsed={leftPanelCollapsed}
          onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        />
        
        {/* Canvas container */}
        <div ref={containerRef} className={styles['canvasContainer']}>
          <canvas ref={canvasRef} className={`${styles['canvas']} stochastic-canvas`} />
          
          {/* Visualization canvas overlay (shown in viz mode) */}
          <VizCanvas />
          
          {/* Audio initialization prompt */}
          {!isAudioReady && (
            <div className={styles['audioPrompt']}>
              Click anywhere to enable audio
            </div>
          )}
        </div>
        
        {/* Right panel - unified with Editor/Visualisation toggle */}
        <RightPanel
          selectedNode={selectedNode ?? undefined}
          selectedEdge={selectedEdge ?? undefined}
          selectedAnnotation={selectedAnnotation ?? undefined}
          selectedRegion={selectedRegion ?? undefined}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        />
      </div>
      
      {/* Arrangement timeline (bottom) */}
      <ArrangementTimeline 
        collapsed={bottomPanelCollapsed}
        onToggleCollapse={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
      />
      
      {/* Transport bar */}
      <TransportBar />
      
      {/* Status bar */}
      <StatusBar isAudioReady={isAudioReady} />
      
      {/* Context menu */}
      <ContextMenu />
      
      {/* Settings modal */}
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Export modal */}
      <ExportModal visible={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}

export default App;
