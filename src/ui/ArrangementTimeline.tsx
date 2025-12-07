import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useGraphStore, selectScenes, selectArrangement, selectScenePlayback, selectIsRunning } from '@core/store';
import styles from './ArrangementTimeline.module.css';
import type { ArrangementSlot, Scene, SceneId } from '@core/types';

/**
 * ArrangementTimeline - Visual timeline for composition mode
 * Shows scenes as blocks on a timeline, supports drag-and-drop reordering
 */

interface SlotBlockProps {
  slot: ArrangementSlot;
  scene: Scene | undefined;
  index: number;
  isPlaying: boolean;
  progress: number; // 0-1 progress through this slot
  onRemove: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}

function SlotBlock({ 
  slot, 
  scene, 
  index, 
  isPlaying, 
  progress,
  onRemove, 
  onMoveLeft, 
  onMoveRight,
  canMoveLeft,
  canMoveRight
}: SlotBlockProps) {
  // Use slot overrides or scene defaults
  const effectiveDuration = scene?.durationBeats ?? 16;
  const effectiveLoops = slot.instanceLoopCount ?? scene?.loopCount ?? 1;
  const totalBeats = effectiveDuration * effectiveLoops;
  
  return (
    <div 
      className={`${styles.slot} ${isPlaying ? styles.playing : ''}`}
      style={{ 
        borderLeftColor: scene?.color ?? '#666',
        flex: totalBeats // Width proportional to duration
      }}
    >
      {/* Progress overlay */}
      {isPlaying && (
        <div 
          className={styles.progress}
          style={{ width: `${progress * 100}%` }}
        />
      )}
      
      <div className={styles.slotContent}>
        <div className={styles.slotHeader}>
          <span className={styles.slotIndex}>{index + 1}</span>
          <span className={styles.slotName}>{scene?.name ?? 'Unknown'}</span>
        </div>
        
        <div className={styles.slotMeta}>
          <span>{totalBeats} beats</span>
          {effectiveLoops > 1 && <span>×{effectiveLoops}</span>}
        </div>
      </div>
      
      <div className={styles.slotActions}>
        <button 
          className={styles.slotAction}
          onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
          disabled={!canMoveLeft}
          title="Move left"
        >
          ◀
        </button>
        <button 
          className={styles.slotAction}
          onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
          disabled={!canMoveRight}
          title="Move right"
        >
          ▶
        </button>
        <button 
          className={styles.slotAction}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove from composition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function ArrangementTimeline() {
  const scenes = useGraphStore(selectScenes);
  const arrangement = useGraphStore(selectArrangement);
  const globalBpm = useGraphStore(state => state.masterSpeed);
  const scenePlayback = useGraphStore(selectScenePlayback);
  const isPlaying = useGraphStore(selectIsRunning);
  const editingSceneId = useGraphStore(state => state.editingSceneId);
  const canvasNodeCount = useGraphStore(state => state.nodes.size);
  
  const removeFromArrangement = useGraphStore(state => state.removeFromArrangement);
  const reorderArrangement = useGraphStore(state => state.reorderArrangement);
  const clearArrangement = useGraphStore(state => state.clearArrangement);
  const addToArrangement = useGraphStore(state => state.addToArrangement);
  const seekArrangement = useGraphStore(state => state.seekArrangement);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const addSlotRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  // Close scene picker when clicking outside
  useEffect(() => {
    if (!showScenePicker) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is outside both the button and the dropdown
      const isOutsideButton = addSlotRef.current && !addSlotRef.current.contains(target);
      const isOutsidePicker = pickerRef.current && !pickerRef.current.contains(target);
      
      if (isOutsideButton && isOutsidePicker) {
        setShowScenePicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showScenePicker]);
  
  // Calculate total duration and playhead position
  const { totalBeats, totalDuration, slotPositions, minSlotDuration } = useMemo(() => {
    let cumulative = 0;
    const positions: { startBeat: number; endBeat: number }[] = [];
    let minDuration = Infinity;
    
    for (const slot of arrangement) {
      const scene = scenes.get(slot.sceneId);
      const duration = scene?.durationBeats ?? 16;
      const loops = slot.instanceLoopCount ?? scene?.loopCount ?? 1;
      const totalSlotBeats = duration * loops;
      
      if (totalSlotBeats < minDuration) minDuration = totalSlotBeats;
      
      positions.push({
        startBeat: cumulative,
        endBeat: cumulative + totalSlotBeats
      });
      cumulative += totalSlotBeats;
    }
    
    // totalDuration in seconds
    const totalSec = cumulative / (globalBpm / 60);
    
    return { 
      totalBeats: cumulative, 
      totalDuration: totalSec,
      slotPositions: positions,
      minSlotDuration: minDuration === Infinity ? 16 : minDuration
    };
  }, [arrangement, scenes, globalBpm]);

  // Calculate required width to ensure linearity
  // We want the smallest slot to be at least 80px
  const pixelsPerBeat = 80 / Math.max(1, minSlotDuration);
  const requiredWidth = totalBeats * pixelsPerBeat;
  
  // Calculate progress for current playing slot
  const getCurrentSlotProgress = useCallback((index: number): number => {
    if (!isPlaying || scenePlayback.mode !== 'arrangement') return 0;
    if (scenePlayback.currentSlotIndex !== index) return 0;
    
    const pos = slotPositions[index];
    if (!pos) return 0;
    
    const slotBeats = pos.endBeat - pos.startBeat;
    const beatsIntoSlot = scenePlayback.arrangementBeat - pos.startBeat;
    return Math.min(1, Math.max(0, beatsIntoSlot / slotBeats));
  }, [isPlaying, scenePlayback, slotPositions]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get available scenes to add - all scenes (even if editing has unsaved content)
  const availableScenes = useMemo(() => {
    return Array.from(scenes.values()).filter(s => {
      // Scene has saved content
      if (s.nodes.length > 0 || s.edges.length > 0) return true;
      // Scene is currently being edited and canvas has content
      if (s.id === editingSceneId && canvasNodeCount > 0) return true;
      return false;
    });
  }, [scenes, editingSceneId, canvasNodeCount]);
  
  // Handle drag and drop from scene list
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const sceneId = e.dataTransfer.getData('text/plain');
    if (sceneId && scenes.has(sceneId as SceneId)) {
      addToArrangement(sceneId as SceneId);
    }
  }, [scenes, addToArrangement]);
  
  // Reorder helper - swaps two adjacent slots by manipulating the array order
  const swapSlots = useCallback((indexA: number, indexB: number) => {
    if (indexA < 0 || indexB < 0) return;
    if (indexA >= arrangement.length || indexB >= arrangement.length) return;
    
    const slotA = arrangement[indexA];
    const slotB = arrangement[indexB];
    if (!slotA || !slotB) return;
    
    // Create new arrangement with swapped positions
    const newArrangement = [...arrangement];
    newArrangement[indexA] = slotB;
    newArrangement[indexB] = slotA;
    
    // Update all slots via reorderArrangement - use their index as startBeat
    // This ensures proper ordering
    newArrangement.forEach((slot, idx) => {
      reorderArrangement(slot.id, idx);
    });
  }, [arrangement, reorderArrangement]);

  // Scrubbing logic
  const handleScrub = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current || totalBeats === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const progress = Math.max(0, Math.min(1, x / width));
    const beat = progress * totalBeats;
    seekArrangement(beat);
  }, [totalBeats, seekArrangement]);

  useEffect(() => {
    if (isScrubbing) {
      const handleWindowMouseMove = (e: MouseEvent) => handleScrub(e);
      const handleWindowMouseUp = () => setIsScrubbing(false);
      
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
      };
    }
  }, [isScrubbing, handleScrub]);
  
  if (arrangement.length === 0) {
    return (
      <div className={styles.timeline}>
        <div className={styles.header}>
          <h4>Composition</h4>
          <div className={styles.headerInfo}>
            <span>0 scenes</span>
            <span>·</span>
            <span>0:00</span>
          </div>
        </div>
        
        <div 
          className={styles.emptyTimeline}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p>No scenes in composition</p>
          <p className={styles.hint}>
            Add scenes from the Scene Panel or drag them here
          </p>
          
          {availableScenes.length > 0 && (
            <div className={styles.quickAdd}>
              <span>Quick add:</span>
              {availableScenes.slice(0, 4).map(scene => (
                <button
                  key={scene.id}
                  className={styles.quickAddButton}
                  style={{ borderColor: scene.color }}
                  onClick={() => addToArrangement(scene.id)}
                >
                  {scene.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.timeline}>
      <div className={styles.header}>
        <h4>Composition</h4>
        <div className={styles.headerInfo}>
          <span>{arrangement.length} scene{arrangement.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{totalBeats} beats</span>
          <span>·</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.clearButton}
            onClick={clearArrangement}
            title="Clear composition"
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Track Container - Scrollable area */}
      <div className={styles.trackContainer}>
        {/* Track Content - Sized by content */}
        <div 
          ref={timelineRef}
          className={styles.trackContent}
          style={{ minWidth: `max(100%, ${requiredWidth}px)` }}
          onMouseDown={(e) => {
            setIsScrubbing(true);
            handleScrub(e);
          }}
        >
          {/* Beat ruler */}
          <div className={styles.ruler}>
            {Array.from({ length: Math.ceil(totalBeats / 16) + 1 }, (_, i) => (
              <div 
                key={i} 
                className={styles.rulerMark}
                style={{ left: `${(i * 16 / totalBeats) * 100}%` }}
              >
                <span className={styles.rulerLabel}>{i * 16}</span>
              </div>
            ))}
          </div>
          
          {/* Slots */}
          <div 
            className={styles.slots}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {arrangement.map((slot, index) => {
              const scene = scenes.get(slot.sceneId);
              const isPlayingSlot = isPlaying && 
                scenePlayback.mode === 'arrangement' && 
                scenePlayback.currentSlotIndex === index;
                
              return (
                <SlotBlock
                  key={slot.id}
                  slot={slot}
                  scene={scene}
                  index={index}
                  isPlaying={isPlayingSlot}
                  progress={getCurrentSlotProgress(index)}
                  onRemove={() => removeFromArrangement(slot.id)}
                  onMoveLeft={() => swapSlots(index, index - 1)}
                  onMoveRight={() => swapSlots(index, index + 1)}
                  canMoveLeft={index > 0}
                  canMoveRight={index < arrangement.length - 1}
                />
              );
            })}
            
            {/* Add slot button */}
            <div 
              ref={addSlotRef}
              className={styles.addSlot}
              onClick={(e) => {
                e.stopPropagation(); // Prevent scrubbing
                if (!showScenePicker && addSlotRef.current) {
                  const rect = addSlotRef.current.getBoundingClientRect();
                  setPickerPos({
                    top: rect.top - 8, // Position above the button
                    left: rect.left + rect.width / 2
                  });
                }
                setShowScenePicker(!showScenePicker);
              }}
            >
              <span>+</span>
            </div>
          </div>
          
          {/* Playback progress indicator */}
          {/* Show playhead even if not playing, if we have a position */}
          {scenePlayback.mode === 'arrangement' && totalBeats > 0 && (
            <div 
              className={styles.playhead}
              style={{ 
                left: `${(scenePlayback.arrangementBeat / totalBeats) * 100}%`,
                pointerEvents: 'none' // Let clicks pass through to timeline
              }}
            />
          )}
        </div>
      </div>
      
      {/* Scene picker dropdown - rendered outside of overflow container */}
      {showScenePicker && (
        <div 
          ref={pickerRef}
          className={styles.scenePicker}
          style={{
            top: `${Math.max(8, pickerPos.top - 150)}px`,
            left: `${pickerPos.left}px`,
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {availableScenes.length === 0 ? (
            <div className={styles.scenePickerEmpty}>
              No scenes with content
            </div>
          ) : (
            availableScenes.map(scene => (
              <div
                key={scene.id}
                className={styles.scenePickerItem}
                onClick={() => {
                  addToArrangement(scene.id);
                  setShowScenePicker(false);
                }}
              >
                <span 
                  className={styles.scenePickerColor}
                  style={{ backgroundColor: scene.color }}
                />
                {scene.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ArrangementTimeline;
