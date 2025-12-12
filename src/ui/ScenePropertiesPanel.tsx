// Stochastic v3 - Scene Properties Panel Component
// Extracted from ScenePanel to be used in RightPanel

import React, { useCallback } from 'react';
import { useGraphStore, selectScenes, selectEditingSceneId } from '@core/store';
import type { Scene, ScaleName } from '@core/types';
import { NOTE_LABELS, SCALES } from '@core/constants';
import { ColorPicker, SCENE_COLORS } from './ColorPicker';
import styles from './ScenePropertiesPanel.module.css';

// ============================================================================
// SCENE PROPERTIES PANEL
// ============================================================================

export function ScenePropertiesPanel(): React.ReactElement {
  const scenes = useGraphStore(selectScenes);
  const editingSceneId = useGraphStore(selectEditingSceneId);
  const masterSpeed = useGraphStore(state => state.masterSpeed);
  const musicalContext = useGraphStore(state => state.musicalContext);
  
  const selectedScene = editingSceneId ? scenes.get(editingSceneId) : null;
  
  if (!selectedScene) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          No scene selected. Select a scene from the left panel to edit its properties.
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.sceneName}>{selectedScene.name}</span>
      </div>
      
      <div className={styles.content}>
        <ScenePropertiesForm 
          scene={selectedScene} 
          masterBpm={masterSpeed}
          masterRoot={musicalContext.root}
          masterScale={musicalContext.scaleName}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SCENE PROPERTIES FORM
// ============================================================================

interface ScenePropertiesFormProps {
  scene: Scene;
  masterBpm: number;
  masterRoot: number;
  masterScale: ScaleName;
}

function ScenePropertiesForm({ scene, masterBpm, masterRoot, masterScale }: ScenePropertiesFormProps): React.ReactElement {
  const updateScene = useGraphStore(state => state.updateScene);
  
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateScene(scene.id, { name: e.target.value });
  }, [scene.id, updateScene]);
  
  const handleColorChange = useCallback((color: string) => {
    updateScene(scene.id, { color });
  }, [scene.id, updateScene]);
  
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      updateScene(scene.id, { durationBeats: value });
    }
  }, [scene.id, updateScene]);
  
  const handleLoopCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      updateScene(scene.id, { loopCount: value });
    }
  }, [scene.id, updateScene]);
  
  const handleBpmOverrideToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateScene(scene.id, { localBpm: e.target.checked ? masterBpm : null });
  }, [scene.id, masterBpm, updateScene]);
  
  const handleBpmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      updateScene(scene.id, { localBpm: value });
    }
  }, [scene.id, updateScene]);
  
  const handleRootOverrideToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateScene(scene.id, { localRoot: e.target.checked ? masterRoot : null });
  }, [scene.id, masterRoot, updateScene]);
  
  const handleRootChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateScene(scene.id, { localRoot: parseInt(e.target.value, 10) });
  }, [scene.id, updateScene]);
  
  const handleScaleOverrideToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateScene(scene.id, { localScale: e.target.checked ? masterScale : null });
  }, [scene.id, masterScale, updateScene]);
  
  const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateScene(scene.id, { localScale: e.target.value as ScaleName });
  }, [scene.id, updateScene]);
  
  const handleEnterTransitionType = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateScene(scene.id, { 
      enterTransition: { ...scene.enterTransition, type: e.target.value as 'cut' | 'crossfade' | 'fade' }
    });
  }, [scene.id, scene.enterTransition, updateScene]);
  
  const handleEnterTransitionDuration = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateScene(scene.id, { 
        enterTransition: { ...scene.enterTransition, durationBeats: value }
      });
    }
  }, [scene.id, scene.enterTransition, updateScene]);
  
  const handleJamQuantize = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateScene(scene.id, { 
      jamTrigger: { ...scene.jamTrigger, quantize: e.target.value as 'immediate' | 'beat' | 'bar' | 'phrase' }
    });
  }, [scene.id, scene.jamTrigger, updateScene]);
  
  return (
    <div className={styles.form}>
      {/* Basic Info */}
      <div className={styles.group}>
        <label className={styles.label}>Name</label>
        <input
          type="text"
          className={styles.input}
          value={scene.name}
          onChange={handleNameChange}
        />
      </div>
      
      <div className={styles.row}>
        <div className={styles.group}>
          <label className={styles.label}>Color</label>
          <ColorPicker
            value={scene.color}
            onChange={handleColorChange}
            presets={SCENE_COLORS}
            size="small"
          />
        </div>
        
        <div className={styles.group}>
          <label className={styles.label}>Duration</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              className={styles.inputSmall}
              value={scene.durationBeats}
              onChange={handleDurationChange}
              min={1}
            />
            <span className={styles.unit}>beats</span>
          </div>
        </div>
        
        <div className={styles.group}>
          <label className={styles.label}>Loop</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              className={styles.inputSmall}
              value={scene.loopCount}
              onChange={handleLoopCountChange}
              min={1}
            />
            <span className={styles.unit}>×</span>
          </div>
        </div>
      </div>
      
      {/* Overrides Section */}
      <div className={styles.sectionHeader}>Overrides</div>
      
      <div className={styles.overrideRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={scene.localBpm !== null}
            onChange={handleBpmOverrideToggle}
          />
          BPM
        </label>
        {scene.localBpm !== null ? (
          <input
            type="number"
            className={styles.inputSmall}
            value={scene.localBpm}
            onChange={handleBpmChange}
            min={20}
            max={300}
          />
        ) : (
          <span className={styles.inheritValue}>inherit ({masterBpm})</span>
        )}
      </div>
      
      <div className={styles.overrideRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={scene.localRoot !== null}
            onChange={handleRootOverrideToggle}
          />
          Key
        </label>
        {scene.localRoot !== null ? (
          <select
            className={styles.select}
            value={scene.localRoot}
            onChange={handleRootChange}
          >
            {NOTE_LABELS.map((note, i) => (
              <option key={i} value={i}>{note}</option>
            ))}
          </select>
        ) : (
          <span className={styles.inheritValue}>inherit ({NOTE_LABELS[masterRoot]})</span>
        )}
      </div>
      
      <div className={styles.overrideRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={scene.localScale !== null}
            onChange={handleScaleOverrideToggle}
          />
          Scale
        </label>
        {scene.localScale !== null ? (
          <select
            className={styles.select}
            value={scene.localScale}
            onChange={handleScaleChange}
          >
            {Object.keys(SCALES).map(scale => (
              <option key={scale} value={scale}>{scale}</option>
            ))}
          </select>
        ) : (
          <span className={styles.inheritValue}>inherit ({masterScale})</span>
        )}
      </div>
      
      {/* Transitions */}
      <div className={styles.sectionHeader}>Transitions</div>
      
      <div className={styles.row}>
        <div className={styles.group}>
          <label className={styles.label}>Enter</label>
          <select
            className={styles.select}
            value={scene.enterTransition.type}
            onChange={handleEnterTransitionType}
          >
            <option value="cut">Cut</option>
            <option value="crossfade">Crossfade</option>
            <option value="fade">Fade</option>
          </select>
        </div>
        
        {scene.enterTransition.type !== 'cut' && (
          <div className={styles.group}>
            <label className={styles.label}>Duration</label>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                className={styles.inputSmall}
                value={scene.enterTransition.durationBeats}
                onChange={handleEnterTransitionDuration}
                min={0}
                step={0.5}
              />
              <span className={styles.unit}>b</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Jam Mode */}
      <div className={styles.sectionHeader}>Jam Mode</div>
      
      <div className={styles.group}>
        <label className={styles.label}>Trigger Quantize</label>
        <select
          className={styles.select}
          value={scene.jamTrigger.quantize}
          onChange={handleJamQuantize}
        >
          <option value="immediate">Immediate</option>
          <option value="beat">Next Beat</option>
          <option value="bar">Next Bar</option>
          <option value="phrase">Next Phrase</option>
        </select>
      </div>
    </div>
  );
}

export default ScenePropertiesPanel;
