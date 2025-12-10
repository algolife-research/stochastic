// Phonon v3 - Scene Panel Component

import React, { useCallback, useState } from 'react';
import { useGraphStore, selectScenes, selectEditingSceneId, selectScenePlayback, selectActiveSceneId, selectPlaybackMode } from '@core/store';
import type { Scene, SceneId } from '@core/types';
import styles from './ScenePanel.module.css';

// ============================================================================
// SCENE PANEL
// ============================================================================

interface ScenePanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ScenePanel({ collapsed, onToggleCollapse }: ScenePanelProps): React.ReactElement {
  const scenes = useGraphStore(selectScenes);
  const editingSceneId = useGraphStore(selectEditingSceneId);
  const activeSceneId = useGraphStore(selectActiveSceneId);
  const scenePlayback = useGraphStore(selectScenePlayback);
  const playbackMode = useGraphStore(selectPlaybackMode);
  
  const createScene = useGraphStore(state => state.createScene);
  const loadSceneToCanvas = useGraphStore(state => state.loadSceneToCanvas);
  const triggerSceneImmediate = useGraphStore(state => state.triggerSceneImmediate);
  const queueScene = useGraphStore(state => state.queueScene);
  const setPlaybackMode = useGraphStore(state => state.setPlaybackMode);
  const deleteScene = useGraphStore(state => state.deleteScene);
  const reorderScenes = useGraphStore(state => state.reorderScenes);
  const isRunning = useGraphStore(state => state.isRunning);
  
  const scenesArray = Array.from(scenes.values());
  const [selectedSceneId, setSelectedSceneId] = useState<SceneId | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<SceneId | null>(null);
  
  // Auto-select the editing scene if no scene is selected
  const effectiveSelectedId = selectedSceneId ?? editingSceneId;
  
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
  
  const handleDeleteScene = useCallback((sceneId: SceneId) => {
    if (scenes.size > 1) {
      deleteScene(sceneId);
      // Select next available scene
      const remaining = Array.from(scenes.keys()).filter(id => id !== sceneId);
      if (remaining.length > 0 && remaining[0]) {
        setSelectedSceneId(remaining[0]);
        loadSceneToCanvas(remaining[0]);
      }
    }
  }, [scenes, deleteScene, loadSceneToCanvas]);
  
  const handleDragOver = useCallback((e: React.DragEvent, targetSceneId: SceneId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSceneId(targetSceneId);
  }, []);
  
  const handleDragLeave = useCallback(() => {
    setDragOverSceneId(null);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent, targetSceneId: SceneId) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = e.dataTransfer.getData('application/x-scene-id') as SceneId;
    if (fromId && fromId !== targetSceneId) {
      reorderScenes(fromId, targetSceneId);
    }
    setDragOverSceneId(null);
  }, [reorderScenes]);
  
  return (
    <div className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
      <button 
        className={styles.collapseToggle}
        onClick={onToggleCollapse}
        title={collapsed ? "Expand Scenes Panel" : "Collapse Scenes Panel"}
      >
        {collapsed ? '▶' : '◀'}
      </button>
      
      {!collapsed && (
        <>
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
          
          {/* Playback Mode Toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${playbackMode === 'jam' ? styles.activeMode : ''}`}
              onClick={() => setPlaybackMode('jam')}
              title="Jam Mode - Infinite looping with scene queuing"
            >
              🎵 Jam
            </button>
            <button
              className={`${styles.modeButton} ${playbackMode === 'arrangement' ? styles.activeMode : ''}`}
              onClick={() => setPlaybackMode('arrangement')}
              title="Composition Mode - Play through timeline"
            >
              📋 Compose
            </button>
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
                  isDragOver={scene.id === dragOverSceneId}
                  canDelete={scenes.size > 1}
                  onClick={() => handleSceneClick(scene.id)}
                  onDoubleClick={() => handleSceneDoubleClick(scene.id)}
                  onQueue={() => handleQueueScene(scene.id)}
                  onDelete={() => handleDeleteScene(scene.id)}
                  onDragOver={(e) => handleDragOver(e, scene.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, scene.id)}
                />
              ))
            )}
          </div>
        </>
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
  isDragOver: boolean;
  canDelete: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onQueue: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function SceneListItem({
  scene,
  isEditing,
  isActive,
  isSelected,
  isQueued,
  isRunning,
  isDragOver,
  canDelete,
  onClick,
  onDoubleClick,
  onQueue,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
}: SceneListItemProps): React.ReactElement {
  const hasOverrides = scene.localBpm !== null || scene.localRoot !== null || scene.localScale !== null;
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-scene-id', scene.id);
    e.dataTransfer.setData('text/plain', scene.id); // For arrangement timeline
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canDelete) {
      onDelete();
    }
  };
  
  return (
    <div
      className={`${styles.sceneItem} ${isSelected ? styles.selected : ''} ${isActive ? styles.active : ''} ${isDragOver ? styles.dragOver : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
      <div className={styles.sceneActions}>
        {isRunning && !isActive && (
          <button 
            className={styles.queueButton}
            onClick={(e) => { e.stopPropagation(); onQueue(); }}
            title="Queue scene"
          >
            ⏭
          </button>
        )}
        <button 
          className={`${styles.deleteButton} ${!canDelete ? styles.disabled : ''}`}
          onClick={handleDeleteClick}
          disabled={!canDelete}
          title={canDelete ? "Delete scene" : "Cannot delete last scene"}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default ScenePanel;
