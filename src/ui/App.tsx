// Stochastic v3 - Main Application Component

import React, { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '@core/store';
import { initHistory } from '@core/store/history';
import { initAutosave } from '@core/store/autosave';
import { handleCheckoutReturn } from '../io/checkout';
import { startTick, stopTick, resetTick } from '@core/tick';
import { CanvasRenderer } from '@canvas/renderer';
import { CanvasInputHandler } from '@canvas/input';
import { logSafariDebugInfo, testCanvasRendering } from '@canvas/safari-debug';
import { audioEngine } from '@audio/engine';
import { useAuthStore } from '@auth/store';
import { Toolbar } from './Toolbar';
import { TransportBar } from './TransportBar';
import { StatusBar } from './StatusBar';
import { ContextMenu } from './ContextMenu';
import { AnnotationEditor } from './AnnotationEditor';
import { ProjectStartupModal } from './ProjectStartupModal';
import { WelcomeModal } from './WelcomeModal';
import { FirstRunHint } from './FirstRunHint';
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
  
  // Right panel mode state
  const [rightPanelMode, setRightPanelMode] = useState<'editor' | 'visualisation' | 'scene' | 'ai'>('editor');
  
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
  
  // Auto-switch right panel to editor mode when node/edge is selected
  useEffect(() => {
    if (selectedNodeId || selectedEdgeId) {
      setRightPanelMode('editor');
      setRightPanelCollapsed(false);
    }
  }, [selectedNodeId, selectedEdgeId]);
  
  /**
   * Initialize canvas and audio
   */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Debug: Log Safari-specific info
    logSafariDebugInfo(canvasRef.current);
    
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
    
    // Debug: Test canvas rendering after resize
    setTimeout(() => {
      if (canvasRef.current) {
        testCanvasRendering(canvasRef.current);
      }
    }, 100);
    
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
        // Create a default scene with a minimal audible graph:
        // a source wired to a speaker, 200px apart (= 1 beat of travel),
        // so pressing Space immediately produces sound.
        const sceneId = store.createScene('Scene 1');
        store.loadSceneToCanvas(sceneId);

        const sourceId = store.addNode('source', 400, 300);
        store.updateNodeProps(sourceId, { midiNote: 60, noteIndex: -2 });
        const speakerId = store.addNode('speaker', 600, 300);
        store.updateNodeProps(speakerId, { reverb: 0.3 });
        store.addEdge(sourceId, speakerId);
        store.saveCurrentScene();
        // The starter template is not unsaved user work: keep it clean so
        // autosave doesn't offer to "restore" an untouched seed project
        store.markClean();
      }
    };
    initDefaultScene();

    // Start edit history (undo/redo) after the default scene is seeded
    initHistory();

    // Periodic crash-recovery snapshots
    initAutosave();

    // Returning from a credit purchase? Refetch the balance, clean the URL
    handleCheckoutReturn();

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
      
      {/* Welcome Modal (Web only) */}
      <WelcomeModal />

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
          onSceneSelected={() => {
            setRightPanelMode('scene');
            setRightPanelCollapsed(false);
          }}
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

          {/* First-run gesture hints */}
          <FirstRunHint />
          
          {/* Inline annotation editor overlay */}
          <AnnotationEditor />
        </div>
        
        {/* Right panel - unified with Editor/Visualisation toggle */}
        <RightPanel
          selectedNode={selectedNode ?? undefined}
          selectedEdge={selectedEdge ?? undefined}
          selectedAnnotation={selectedAnnotation ?? undefined}
          selectedRegion={selectedRegion ?? undefined}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          panelMode={rightPanelMode}
          onPanelModeChange={setRightPanelMode}
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
