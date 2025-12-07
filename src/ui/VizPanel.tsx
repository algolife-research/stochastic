// Phonon - Viz Panel Component
// UI for configuring visualization modes per scene

import React, { useCallback } from 'react';
import { useGraphStore, selectEditingSceneId, selectScenes } from '@core/store';
import type { VizMode } from '@core/types';
import { PALETTES } from '@viz/palettes';
import type { ColorPalette } from '@core/types';
import styles from './VizPanel.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const VIZ_MODES: { value: VizMode; label: string; description: string }[] = [
  { value: 'editor', label: 'Editor', description: 'Default graph editor view' },
  { value: 'abstract', label: 'Abstract', description: 'Organic flowing shapes' },
  { value: 'particles', label: 'Particles', description: 'Particle explosions and flows' },
  { value: 'spectral', label: 'Spectral', description: 'Frequency spectrum display' },
  { value: 'geometric', label: 'Geometric', description: 'Crystalline patterns' },
  { value: 'waves', label: 'Waves', description: 'Interference patterns' },
  { value: 'kaleidoscope', label: 'Kaleidoscope', description: 'Symmetric reflections' },
];

const PALETTE_OPTIONS = Object.entries(PALETTES).map(([key, palette]: [string, ColorPalette]) => ({
  value: key,
  label: palette.name,
  colors: palette.colors as readonly string[],
}));

// ============================================================================
// VIZ PANEL
// ============================================================================

export function VizPanel(): React.ReactElement {
  const scenes = useGraphStore(selectScenes);
  const editingSceneId = useGraphStore(selectEditingSceneId);
  const updateSceneVizMode = useGraphStore(state => state.updateSceneVizMode);
  const updateSceneVizConfig = useGraphStore(state => state.updateSceneVizConfig);
  const vizDisplay = useGraphStore(state => state.vizDisplay);
  const setVizMode = useGraphStore(state => state.setVizMode);
  const toggleVizMode = useGraphStore(state => state.toggleVizMode);
  
  const currentScene = editingSceneId ? scenes.get(editingSceneId) : null;
  
  const handleModeChange = useCallback((mode: VizMode) => {
    if (editingSceneId) {
      updateSceneVizMode(editingSceneId, mode);
    }
  }, [editingSceneId, updateSceneVizMode]);
  
  const handlePaletteChange = useCallback((paletteKey: string) => {
    if (!editingSceneId || !currentScene) return;
    
    const palette = PALETTES[paletteKey];
    if (!palette) return;
    
    // Get current config or return (config should exist when mode != editor)
    const currentConfig = currentScene.vizConfig;
    if (!currentConfig) return;
    
    updateSceneVizConfig(editingSceneId, {
      ...currentConfig,
      colorPalette: palette,
    });
  }, [editingSceneId, currentScene, updateSceneVizConfig]);
  
  const handleIntensityChange = useCallback((value: number) => {
    if (!editingSceneId || !currentScene?.vizConfig) return;
    
    updateSceneVizConfig(editingSceneId, {
      ...currentScene.vizConfig,
      intensity: value,
    });
  }, [editingSceneId, currentScene, updateSceneVizConfig]);
  
  const handleReactivityChange = useCallback((value: number) => {
    if (!editingSceneId || !currentScene?.vizConfig) return;
    
    updateSceneVizConfig(editingSceneId, {
      ...currentScene.vizConfig,
      reactivity: value,
    });
  }, [editingSceneId, currentScene, updateSceneVizConfig]);
  
  const handleTrailLengthChange = useCallback((value: number) => {
    if (!editingSceneId || !currentScene?.vizConfig) return;
    
    updateSceneVizConfig(editingSceneId, {
      ...currentScene.vizConfig,
      trailLength: value,
    });
  }, [editingSceneId, currentScene, updateSceneVizConfig]);
  
  if (!currentScene) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>Visualization</h3>
        </div>
        <div className={styles.emptyState}>
          Select a scene to configure visualization.
        </div>
      </div>
    );
  }
  
  const isVizModeActive = currentScene.vizMode !== 'editor';
  
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Visualization</h3>
        <button 
          className={`${styles.toggleButton} ${vizDisplay.isVizMode ? styles.active : ''}`}
          onClick={toggleVizMode}
          title={vizDisplay.isVizMode ? 'Exit Viz Mode' : 'Enter Viz Mode'}
        >
          {vizDisplay.isVizMode ? '👁 On' : '👁 Off'}
        </button>
      </div>
      
      <div className={styles.content}>
        {/* Mode Selection */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Mode</label>
          <div className={styles.modeGrid}>
            {VIZ_MODES.map((mode) => (
              <button
                key={mode.value}
                className={`${styles.modeButton} ${currentScene.vizMode === mode.value ? styles.selected : ''}`}
                onClick={() => handleModeChange(mode.value)}
                title={mode.description}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Config options only shown when not in editor mode */}
        {isVizModeActive && (
          <>
            {/* Palette Selection */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Color Palette</label>
              <div className={styles.paletteGrid}>
                {PALETTE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.paletteButton} ${
                      currentScene.vizConfig?.colorPalette.name === option.label ? styles.selected : ''
                    }`}
                    onClick={() => handlePaletteChange(option.value)}
                    title={option.label}
                  >
                    <div className={styles.palettePreview}>
                      {option.colors.slice(0, 5).map((color: string, i: number) => (
                        <div 
                          key={i} 
                          className={styles.paletteColor} 
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className={styles.paletteName}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sliders */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Parameters</label>
              
              <div className={styles.sliderRow}>
                <label>Intensity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentScene.vizConfig?.intensity ?? 0.8}
                  onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>
                  {((currentScene.vizConfig?.intensity ?? 0.8) * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className={styles.sliderRow}>
                <label>Reactivity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentScene.vizConfig?.reactivity ?? 0.7}
                  onChange={(e) => handleReactivityChange(parseFloat(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>
                  {((currentScene.vizConfig?.reactivity ?? 0.7) * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className={styles.sliderRow}>
                <label>Trail Length</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentScene.vizConfig?.trailLength ?? 0.5}
                  onChange={(e) => handleTrailLengthChange(parseFloat(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>
                  {((currentScene.vizConfig?.trailLength ?? 0.5) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </>
        )}
        
        {/* Preview Button */}
        {isVizModeActive && !vizDisplay.isVizMode && (
          <div className={styles.section}>
            <button
              className={styles.previewButton}
              onClick={() => setVizMode(true)}
            >
              Preview Visualization
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
