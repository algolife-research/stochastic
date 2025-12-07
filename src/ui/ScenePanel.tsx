// Phonon v3 - Scene Panel Component

import React, { useCallback, useState } from 'react';
import { useGraphStore, selectScenes, selectEditingSceneId, selectScenePlayback, selectActiveSceneId } from '@core/store';
import type { Scene, SceneId, ScaleName } from '@core/types';
import { NOTE_LABELS, SCALES } from '@core/constants';
import { ColorPicker, SCENE_COLORS } from './ColorPicker';
import styles from './ScenePanel.module.css';

// ============================================================================
// SCENE PANEL
// ============================================================================

export function ScenePanel(): React.ReactElement {
  const scenes = useGraphStore(selectScenes);
  const editingSceneId = useGraphStore(selectEditingSceneId);
  const activeSceneId = useGraphStore(selectActiveSceneId);
  const scenePlayback = useGraphStore(selectScenePlayback);
  const masterSpeed = useGraphStore(state => state.masterSpeed);
  const musicalContext = useGraphStore(state => state.musicalContext);
  
  const createScene = useGraphStore(state => state.createScene);
  const deleteScene = useGraphStore(state => state.deleteScene);
  const duplicateScene = useGraphStore(state => state.duplicateScene);
  const loadSceneToCanvas = useGraphStore(state => state.loadSceneToCanvas);
  const triggerSceneImmediate = useGraphStore(state => state.triggerSceneImmediate);
  const queueScene = useGraphStore(state => state.queueScene);
  const isRunning = useGraphStore(state => state.isRunning);
  
  const scenesArray = Array.from(scenes.values());
  const [selectedSceneId, setSelectedSceneId] = useState<SceneId | null>(null);
  
  // Auto-select the editing scene if no scene is selected
  const effectiveSelectedId = selectedSceneId ?? editingSceneId;
  const selectedScene = effectiveSelectedId ? scenes.get(effectiveSelectedId) : null;
  
  const handleCreateScene = useCallback(() => {
    const newId = createScene();
    setSelectedSceneId(newId);
    // Automatically load the new scene to canvas for editing
    loadSceneToCanvas(newId);
  }, [createScene, loadSceneToCanvas]);
  
  const handleSceneClick = useCallback((sceneId: SceneId) => {
    setSelectedSceneId(sceneId);
    if (!isRunning) {
      loadSceneToCanvas(sceneId);
    }
  }, [loadSceneToCanvas, isRunning]);
  
  const handleSceneDoubleClick = useCallback((sceneId: SceneId) => {
    if (isRunning) {
      triggerSceneImmediate(sceneId);
    } else {
      loadSceneToCanvas(sceneId);
    }
  }, [triggerSceneImmediate, loadSceneToCanvas, isRunning]);
  
  const handleQueueScene = useCallback((sceneId: SceneId) => {
    queueScene(sceneId, 'bar');
  }, [queueScene]);
  
  const handleDuplicateScene = useCallback(() => {
    if (effectiveSelectedId) {
      const newId = duplicateScene(effectiveSelectedId);
      if (newId) setSelectedSceneId(newId);
    }
  }, [effectiveSelectedId, duplicateScene]);
  
  const handleDeleteScene = useCallback(() => {
    if (effectiveSelectedId && scenes.size > 1) {
      deleteScene(effectiveSelectedId);
      setSelectedSceneId(null);
    }
  }, [effectiveSelectedId, deleteScene, scenes.size]);
  
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Scenes</h3>
        <div className={styles.headerActions}>
          <button 
            className={styles.iconButton} 
            onClick={handleCreateScene}
            title="New Scene"
          >
            +
          </button>
        </div>
      </div>
      
      <div className={styles.sceneList}>
        {scenesArray.length === 0 ? (
          <div className={styles.emptyState}>
            No scenes yet. Click + to create one.
          </div>
        ) : (
          scenesArray.map((scene) => (
            <SceneListItem
              key={scene.id}
              scene={scene}
              isEditing={scene.id === editingSceneId}
              isActive={scene.id === activeSceneId}
              isSelected={scene.id === effectiveSelectedId}
              isQueued={scene.id === scenePlayback.queuedSceneId}
              isRunning={isRunning}
              onClick={() => handleSceneClick(scene.id)}
              onDoubleClick={() => handleSceneDoubleClick(scene.id)}
              onQueue={() => handleQueueScene(scene.id)}
            />
          ))
        )}
      </div>
      
      {selectedScene && (
        <div className={styles.properties}>
          <div className={styles.propertiesHeader}>
            <span>Scene Properties</span>
            <div className={styles.propertyActions}>
              <button 
                className={styles.smallButton}
                onClick={handleDuplicateScene}
                title="Duplicate"
              >
                📋
              </button>
              <button 
                className={styles.smallButton}
                onClick={handleDeleteScene}
                disabled={scenes.size <= 1}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
          <SceneProperties 
            scene={selectedScene} 
            masterBpm={masterSpeed}
            masterRoot={musicalContext.root}
            masterScale={musicalContext.scaleName}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCENE LIST ITEM
// ============================================================================

interface SceneListItemProps {
  scene: Scene;
  isEditing: boolean;
  isActive: boolean;
  isSelected: boolean;
  isQueued: boolean;
  isRunning: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onQueue: () => void;
}

function SceneListItem({
  scene,
  isEditing,
  isActive,
  isSelected,
  isQueued,
  isRunning,
  onClick,
  onDoubleClick,
  onQueue,
}: SceneListItemProps): React.ReactElement {
  const hasOverrides = scene.localBpm !== null || scene.localRoot !== null || scene.localScale !== null;
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', scene.id);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  return (
    <div
      className={`${styles.sceneItem} ${isSelected ? styles.selected : ''} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable
      onDragStart={handleDragStart}
      style={{ borderLeftColor: scene.color, cursor: 'grab' }}
    >
      <div className={styles.sceneInfo}>
        <div className={styles.sceneName}>
          {isActive && <span className={styles.playingIndicator}>▶</span>}
          {isEditing && <span className={styles.editingIndicator}>●</span>}
          {scene.name}
          {isQueued && <span className={styles.queuedBadge}>queued</span>}
        </div>
        <div className={styles.sceneMeta}>
          <span className={styles.duration}>{scene.durationBeats}b</span>
          {scene.loopCount > 1 && <span className={styles.loop}>×{scene.loopCount}</span>}
          {hasOverrides && <span className={styles.overrides}>⚙</span>}
        </div>
      </div>
      {isRunning && !isActive && (
        <button 
          className={styles.queueButton}
          onClick={(e) => { e.stopPropagation(); onQueue(); }}
          title="Queue scene"
        >
          ⏭
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SCENE PROPERTIES
// ============================================================================

interface ScenePropertiesProps {
  scene: Scene;
  masterBpm: number;
  masterRoot: number;
  masterScale: ScaleName;
}

function SceneProperties({ scene, masterBpm, masterRoot, masterScale }: ScenePropertiesProps): React.ReactElement {
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
    <div className={styles.propertiesContent}>
      {/* Basic Info */}
      <div className={styles.propertyGroup}>
        <label className={styles.propertyLabel}>Name</label>
        <input
          type="text"
          className={styles.propertyInput}
          value={scene.name}
          onChange={handleNameChange}
        />
      </div>
      
      <div className={styles.propertyRow}>
        <div className={styles.propertyGroup}>
          <label className={styles.propertyLabel}>Color</label>
          <ColorPicker
            value={scene.color}
            onChange={handleColorChange}
            presets={SCENE_COLORS}
            size="small"
          />
        </div>
        
        <div className={styles.propertyGroup}>
          <label className={styles.propertyLabel}>Duration</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              className={styles.propertyInputSmall}
              value={scene.durationBeats}
              onChange={handleDurationChange}
              min={1}
            />
            <span className={styles.unit}>beats</span>
          </div>
        </div>
        
        <div className={styles.propertyGroup}>
          <label className={styles.propertyLabel}>Loop</label>
          <div className={styles.inputWithUnit}>
            <input
              type="number"
              className={styles.propertyInputSmall}
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
            className={styles.propertyInputSmall}
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
            className={styles.propertySelect}
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
            className={styles.propertySelect}
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
      
      <div className={styles.propertyRow}>
        <div className={styles.propertyGroup}>
          <label className={styles.propertyLabel}>Enter</label>
          <select
            className={styles.propertySelect}
            value={scene.enterTransition.type}
            onChange={handleEnterTransitionType}
          >
            <option value="cut">Cut</option>
            <option value="crossfade">Crossfade</option>
            <option value="fade">Fade</option>
          </select>
        </div>
        
        {scene.enterTransition.type !== 'cut' && (
          <div className={styles.propertyGroup}>
            <label className={styles.propertyLabel}>Duration</label>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                className={styles.propertyInputSmall}
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
      
      <div className={styles.propertyGroup}>
        <label className={styles.propertyLabel}>Trigger Quantize</label>
        <select
          className={styles.propertySelect}
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

export default ScenePanel;
