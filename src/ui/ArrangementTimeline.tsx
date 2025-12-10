import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useGraphStore, selectScenes, selectArrangement, selectScenePlayback, selectIsRunning } from '@core/store';
import styles from './ArrangementTimeline.module.css';
import type { ArrangementSlot, ArrangementChannel, Scene, SceneId } from '@core/types';

/**
 * ArrangementTimeline - Multi-track visual timeline for composition mode
 * Shows scenes as blocks on multiple tracks (like video editing software)
 */

const PIXELS_PER_BEAT = 8;
const TRACK_HEIGHT = 52;

interface ArrangementTimelineProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface SlotBlockProps {
  slot: ArrangementSlot;
  scene: Scene | undefined;
  isPlaying: boolean;
  progress: number;
  pixelsPerBeat: number;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

function SlotBlock({ 
  slot, 
  scene, 
  isPlaying, 
  progress,
  pixelsPerBeat,
  onRemove,
  onDragStart
}: SlotBlockProps) {
  const effectiveDuration = scene?.durationBeats ?? 16;
  const effectiveLoops = slot.instanceLoopCount ?? scene?.loopCount ?? 1;
  const totalBeats = effectiveDuration * effectiveLoops;
  const width = totalBeats * pixelsPerBeat;
  const left = slot.startBeat * pixelsPerBeat;
  
  return (
    <div 
      className={`${styles.slot} ${isPlaying ? styles.playing : ''}`}
      style={{ 
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: scene?.color ?? '#666',
      }}
      draggable
      onDragStart={onDragStart}
    >
      {isPlaying && (
        <div 
          className={styles.progress}
          style={{ width: `${progress * 100}%` }}
        />
      )}
      
      <div className={styles.slotContent}>
        <span className={styles.slotName}>{scene?.name ?? 'Unknown'}</span>
        <span className={styles.slotMeta}>
          {totalBeats}b {effectiveLoops > 1 && `×${effectiveLoops}`}
        </span>
      </div>
      
      <button 
        className={styles.slotRemove}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

interface TrackRowProps {
  channel: ArrangementChannel;
  channelIndex: number;
  slots: ArrangementSlot[];
  scenes: Map<SceneId, Scene>;
  isPlaying: boolean;
  scenePlayback: ReturnType<typeof selectScenePlayback>;
  pixelsPerBeat: number;
  totalBeats: number;
  canDelete: boolean;
  onDropSlot: (sceneId: SceneId, beat: number, channel: number) => void;
  onRemoveSlot: (slotId: string) => void;
  onMoveSlot: (slotId: string, newBeat: number, newChannel: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onDelete: () => void;
}

function TrackRow({
  channel,
  channelIndex,
  slots,
  scenes,
  isPlaying,
  scenePlayback,
  pixelsPerBeat,
  totalBeats,
  canDelete,
  onDropSlot,
  onRemoveSlot,
  onMoveSlot,
  onToggleMute,
  onToggleSolo,
  onDelete
}: TrackRowProps) {
  const [dragOverBeat, setDragOverBeat] = useState<number | null>(null);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const beat = Math.max(0, Math.round(x / pixelsPerBeat));
    setDragOverBeat(beat);
  }, [pixelsPerBeat]);
  
  const handleDragLeave = useCallback(() => {
    setDragOverBeat(null);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBeat(null);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const beat = Math.max(0, Math.round(x / pixelsPerBeat));
    
    // Check if this is a slot being moved or a new scene being added
    const slotId = e.dataTransfer.getData('slotId');
    if (slotId) {
      // Moving existing slot
      onMoveSlot(slotId, beat, channelIndex);
    } else {
      // Adding new scene
      const sceneId = e.dataTransfer.getData('text/plain');
      if (sceneId) {
        onDropSlot(sceneId as SceneId, beat, channelIndex);
      }
    }
  }, [pixelsPerBeat, channelIndex, onDropSlot, onMoveSlot]);
  
  const getSlotProgress = useCallback((slot: ArrangementSlot): number => {
    if (!isPlaying || scenePlayback.mode !== 'arrangement') return 0;
    
    const scene = scenes.get(slot.sceneId);
    if (!scene) return 0;
    
    const loops = slot.instanceLoopCount ?? scene.loopCount;
    const duration = scene.durationBeats * loops;
    const slotEnd = slot.startBeat + duration;
    
    const currentBeat = scenePlayback.arrangementBeat;
    if (currentBeat < slot.startBeat || currentBeat >= slotEnd) return 0;
    
    return (currentBeat - slot.startBeat) / duration;
  }, [isPlaying, scenePlayback, scenes]);
  
  const isSlotPlaying = useCallback((slot: ArrangementSlot): boolean => {
    if (!isPlaying || scenePlayback.mode !== 'arrangement') return false;
    
    const scene = scenes.get(slot.sceneId);
    if (!scene) return false;
    
    const loops = slot.instanceLoopCount ?? scene.loopCount;
    const duration = scene.durationBeats * loops;
    const currentBeat = scenePlayback.arrangementBeat;
    
    return currentBeat >= slot.startBeat && currentBeat < slot.startBeat + duration;
  }, [isPlaying, scenePlayback, scenes]);
  
  const handleSlotDragStart = useCallback((slot: ArrangementSlot) => (e: React.DragEvent) => {
    e.dataTransfer.setData('slotId', slot.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  
  return (
    <div className={styles.trackRow}>
      {/* Track header with controls */}
      <div 
        className={styles.trackHeader}
        style={{ borderLeftColor: channel.color }}
      >
        <span className={styles.trackName}>{channel.name}</span>
        <div className={styles.trackControls}>
          <button 
            className={`${styles.trackButton} ${channel.muted ? styles.active : ''}`}
            onClick={onToggleMute}
            title="Mute"
          >
            M
          </button>
          <button 
            className={`${styles.trackButton} ${channel.solo ? styles.active : ''}`}
            onClick={onToggleSolo}
            title="Solo"
          >
            S
          </button>
          {canDelete && (
            <button 
              className={`${styles.trackButton} ${styles.deleteButton}`}
              onClick={onDelete}
              title="Delete track"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Track lane */}
      <div 
        className={styles.trackLane}
        style={{ width: `${totalBeats * pixelsPerBeat}px` }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop indicator */}
        {dragOverBeat !== null && (
          <div 
            className={styles.dropIndicator}
            style={{ left: `${dragOverBeat * pixelsPerBeat}px` }}
          />
        )}
        
        {/* Slots on this track */}
        {slots.map((slot) => (
          <SlotBlock
            key={slot.id}
            slot={slot}
            scene={scenes.get(slot.sceneId)}
            isPlaying={isSlotPlaying(slot)}
            progress={getSlotProgress(slot)}
            pixelsPerBeat={pixelsPerBeat}
            onRemove={() => onRemoveSlot(slot.id)}
            onDragStart={handleSlotDragStart(slot)}
          />
        ))}
      </div>
    </div>
  );
}

export function ArrangementTimeline({ collapsed, onToggleCollapse }: ArrangementTimelineProps) {
  const scenes = useGraphStore(selectScenes);
  const arrangement = useGraphStore(selectArrangement);
  const arrangementChannels = useGraphStore(state => state.arrangementChannels);
  const globalBpm = useGraphStore(state => state.masterSpeed);
  const scenePlayback = useGraphStore(selectScenePlayback);
  const isPlaying = useGraphStore(selectIsRunning);
  const editingSceneId = useGraphStore(state => state.editingSceneId);
  const canvasNodeCount = useGraphStore(state => state.nodes.size);
  
  const removeFromArrangement = useGraphStore(state => state.removeFromArrangement);
  const updateArrangementSlot = useGraphStore(state => state.updateArrangementSlot);
  const clearArrangement = useGraphStore(state => state.clearArrangement);
  const addToArrangement = useGraphStore(state => state.addToArrangement);
  const seekArrangement = useGraphStore(state => state.seekArrangement);
  const addArrangementChannel = useGraphStore(state => state.addArrangementChannel);
  const removeArrangementChannel = useGraphStore(state => state.removeArrangementChannel);
  const updateArrangementChannel = useGraphStore(state => state.updateArrangementChannel);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [pickerChannel, _setPickerChannel] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Calculate total beats across all channels
  const { totalBeats, totalDuration } = useMemo(() => {
    let maxBeat = 0;
    
    for (const slot of arrangement) {
      const scene = scenes.get(slot.sceneId);
      if (!scene) continue;
      
      const loops = slot.instanceLoopCount ?? scene.loopCount;
      const slotEnd = slot.startBeat + scene.durationBeats * loops;
      if (slotEnd > maxBeat) maxBeat = slotEnd;
    }
    
    // Ensure minimum length
    maxBeat = Math.max(maxBeat, 64);
    
    const totalSec = maxBeat / (globalBpm / 60);
    return { totalBeats: maxBeat, totalDuration: totalSec };
  }, [arrangement, scenes, globalBpm]);
  
  // Group slots by channel
  const slotsByChannel = useMemo(() => {
    const grouped: Map<number, ArrangementSlot[]> = new Map();
    for (const slot of arrangement) {
      const existing = grouped.get(slot.channel) ?? [];
      existing.push(slot);
      grouped.set(slot.channel, existing);
    }
    return grouped;
  }, [arrangement]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Available scenes to add
  const availableScenes = useMemo(() => {
    return Array.from(scenes.values()).filter(s => {
      if (s.nodes.length > 0 || s.edges.length > 0) return true;
      if (s.id === editingSceneId && canvasNodeCount > 0) return true;
      return false;
    });
  }, [scenes, editingSceneId, canvasNodeCount]);
  
  // Scrubbing
  const handleScrub = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current || totalBeats === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    // Account for track header width (100px) and scroll position
    const x = e.clientX - rect.left - 100 + scrollLeft;
    const beat = Math.max(0, x / PIXELS_PER_BEAT);
    seekArrangement(beat);
  }, [totalBeats, seekArrangement]);
  
  useEffect(() => {
    if (!isScrubbing) return;
    
    const handleMouseMove = (e: MouseEvent) => handleScrub(e);
    const handleMouseUp = () => setIsScrubbing(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, handleScrub]);
  
  // Close picker when clicking outside
  useEffect(() => {
    if (!showScenePicker) return;
    
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowScenePicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showScenePicker]);
  
  const handleDropSlot = useCallback((sceneId: SceneId, beat: number, channel: number) => {
    addToArrangement(sceneId, beat, channel);
  }, [addToArrangement]);
  
  const handleMoveSlot = useCallback((slotId: string, newBeat: number, newChannel: number) => {
    updateArrangementSlot(slotId, { startBeat: newBeat, channel: newChannel });
  }, [updateArrangementSlot]);
  
  const handleToggleMute = useCallback((channelId: string, currentMuted: boolean) => {
    updateArrangementChannel(channelId, { muted: !currentMuted });
  }, [updateArrangementChannel]);
  
  const handleToggleSolo = useCallback((channelId: string, currentSolo: boolean) => {
    updateArrangementChannel(channelId, { solo: !currentSolo });
  }, [updateArrangementChannel]);
  
  // Empty state
  if (arrangement.length === 0 && arrangementChannels.length === 1) {
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
        
        <div className={styles.emptyTimeline}>
          <p>No scenes in composition</p>
          <p className={styles.hint}>
            Drag scenes from the Scene Panel onto tracks below
          </p>
          
          {availableScenes.length > 0 && (
            <div className={styles.quickAdd}>
              <span>Quick add to Track 1:</span>
              {availableScenes.slice(0, 4).map(scene => (
                <button
                  key={scene.id}
                  className={styles.quickAddButton}
                  style={{ borderColor: scene.color }}
                  onClick={() => addToArrangement(scene.id, 0, 0)}
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
    <div className={`${styles.timeline} ${collapsed ? styles.collapsed : ''}`}>
      {/* Collapse toggle button */}
      <button 
        className={styles.collapseToggle}
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand Arrangement' : 'Collapse Arrangement'}
      >
        {collapsed ? '▲' : '▼'}
      </button>
      
      {!collapsed && (
        <>
      <div className={styles.header}>
        <h4>Composition</h4>
        <div className={styles.headerInfo}>
          <span>{arrangement.length} slot{arrangement.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{arrangementChannels.length} track{arrangementChannels.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.addTrackButton}
            onClick={addArrangementChannel}
            title="Add track"
          >
            + Track
          </button>
          <button 
            className={styles.clearButton}
            onClick={clearArrangement}
            title="Clear composition"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div 
        ref={timelineRef}
        className={styles.multiTrackContainer}
        onMouseDown={(e) => {
          // Don't start scrubbing if clicking on track header, a slot, or the scrollbar area
          if ((e.target as HTMLElement).closest(`.${styles.trackHeader}`)) return;
          if ((e.target as HTMLElement).closest(`.${styles.slot}`)) return;
          // Check if click is on scrollbar (rough check: click near edges of container)
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const scrollbarWidth = 16; // Approximate scrollbar width
          if (e.clientX > rect.right - scrollbarWidth || e.clientY > rect.bottom - scrollbarWidth) return;
          setIsScrubbing(true);
          handleScrub(e);
        }}
      >
        {/* Beat ruler */}
        <div className={styles.rulerRow}>
          <div className={styles.rulerHeader}></div>
          <div 
            className={styles.ruler}
            style={{ width: `${totalBeats * PIXELS_PER_BEAT}px` }}
          >
            {Array.from({ length: Math.ceil(totalBeats / 4) + 1 }, (_, i) => (
              <div 
                key={i} 
                className={`${styles.rulerMark} ${i % 4 === 0 ? styles.rulerMarkMajor : ''}`}
                style={{ left: `${i * 4 * PIXELS_PER_BEAT}px` }}
              >
                {i % 4 === 0 && <span className={styles.rulerLabel}>{i * 4}</span>}
              </div>
            ))}
          </div>
        </div>
        
        {/* Tracks */}
        {arrangementChannels.map((channel, index) => (
          <TrackRow
            key={channel.id}
            channel={channel}
            channelIndex={index}
            slots={slotsByChannel.get(index) ?? []}
            scenes={scenes}
            isPlaying={isPlaying}
            scenePlayback={scenePlayback}
            pixelsPerBeat={PIXELS_PER_BEAT}
            totalBeats={totalBeats}
            canDelete={arrangementChannels.length > 1}
            onDropSlot={handleDropSlot}
            onRemoveSlot={removeFromArrangement}
            onMoveSlot={handleMoveSlot}
            onToggleMute={() => handleToggleMute(channel.id, channel.muted)}
            onToggleSolo={() => handleToggleSolo(channel.id, channel.solo)}
            onDelete={() => removeArrangementChannel(channel.id)}
          />
        ))}
        
        {/* Playhead */}
        {scenePlayback.mode === 'arrangement' && totalBeats > 0 && (
          <div 
            className={styles.playhead}
            style={{ 
              left: `${100 + scenePlayback.arrangementBeat * PIXELS_PER_BEAT}px`,
              height: `${20 + arrangementChannels.length * TRACK_HEIGHT}px`
            }}
          />
        )}
      </div>
      
      {/* Scene picker */}
      {showScenePicker && (
        <div ref={pickerRef} className={styles.scenePicker}>
          {availableScenes.length === 0 ? (
            <div className={styles.scenePickerEmpty}>No scenes with content</div>
          ) : (
            availableScenes.map(scene => (
              <div
                key={scene.id}
                className={styles.scenePickerItem}
                onClick={() => {
                  addToArrangement(scene.id, 0, pickerChannel);
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
        </>
      )}
    </div>
  );
}

export default ArrangementTimeline;
