// Phonon v3 - Game Tick System
// Handles source timers, packet movement, scene playback, and game loop

import { getGraphStore } from './store';
import type { Packet, GraphNode, GraphEdge, NodeId, EdgeId, PacketId, MidiNote, Frequency, AudioPayload, SceneId, SceneQuantize, CrossoverProps } from './types';
import { createPacketId } from './types';
import { dist, midiToFreq, clampMidi, LEGACY_SCALE_OFFSET, MAX_PACKETS, getEffectiveBpm, getEffectiveRoot, getEffectiveScale } from './constants';
import { processNodeArrival, getTeleporterExits, consumePendingTunnelSpeakers } from './engine';
import { audioEngine } from '@audio/engine';

// ============================================================================
// TICK STATE
// ============================================================================

let lastTime = 0;
let tickInterval: number | null = null;
let beatAccumulator = 0;     // Fractional beats accumulated

// ============================================================================
// MULTI-CHANNEL SCENE STATE
// ============================================================================

/** State for a scene playing on a channel (not on canvas) */
interface ChannelSceneState {
  sceneId: SceneId;
  channelIndex: number;
  nodes: Map<NodeId, GraphNode>;
  edges: Map<EdgeId, GraphEdge>;
  packets: Map<PacketId, Packet>;
  localBeat: number;
}

/** Active channel scenes (excluding the one on canvas) */
let activeChannelScenes: Map<number, ChannelSceneState> = new Map();

/** Which channel is currently displayed on canvas (-1 for none/jam mode) */
let canvasChannelIndex: number = 0;

// ============================================================================
// ENTANGLEMENT SYNC
// ============================================================================

/**
 * Sync payload across all entangled packets (except those that have arrived)
 * This creates the quantum-like behavior where split packets share effects
 */
function syncEntangledPayloads(
  groupId: string, 
  newPayload: AudioPayload, 
  store: ReturnType<typeof getGraphStore>,
  arrivingPacketIds: Set<PacketId>
): void {
  store.packets.forEach((packet) => {
    if (packet.entanglementGroupId === groupId && !arrivingPacketIds.has(packet.id)) {
      // Only sync to packets that are still traveling (not arriving this tick)
      store.updatePacket(packet.id, { payload: { ...newPayload } });
    }
  });
}

// ============================================================================
// CROSSOVER (SEXUAL REPRODUCTION)
// ============================================================================

// Note: WAVE_TYPES is defined in engine.ts for mutator use

/**
 * Perform genetic crossover between two parent packets
 * Creates an offspring with inherited properties from both parents
 */
function performCrossover(parentA: AudioPayload, parentB: AudioPayload, props: CrossoverProps): AudioPayload {
  const offspring: AudioPayload = { ...parentA }; // Start with parent A as base
  
  // Determine pitch inheritance
  switch (props.pitchFrom) {
    case 'a':
      // Already have A's pitch
      break;
    case 'b':
      offspring.midiNote = parentB.midiNote;
      offspring.freq = parentB.freq;
      break;
    case 'average':
      const avgMidi = Math.round((parentA.midiNote + parentB.midiNote) / 2) as MidiNote;
      offspring.midiNote = avgMidi;
      offspring.freq = midiToFreq(avgMidi);
      break;
    case 'random':
      if (Math.random() < 0.5) {
        offspring.midiNote = parentB.midiNote;
        offspring.freq = parentB.freq;
      }
      break;
  }
  
  // Determine wave inheritance
  switch (props.waveFrom) {
    case 'a':
      // Already have A's wave
      break;
    case 'b':
      offspring.wave = parentB.wave;
      break;
    case 'random':
      if (Math.random() < 0.5) {
        offspring.wave = parentB.wave;
      }
      break;
  }
  
  // Determine gain combination
  switch (props.gainMode) {
    case 'average':
      offspring.gain = (parentA.gain + parentB.gain) / 2;
      break;
    case 'max':
      offspring.gain = Math.max(parentA.gain, parentB.gain);
      break;
    case 'min':
      offspring.gain = Math.min(parentA.gain, parentB.gain);
      break;
    case 'random':
      offspring.gain = Math.random() < 0.5 ? parentA.gain : parentB.gain;
      break;
  }
  
  // Handle inheritance mode for other properties
  switch (props.inheritance) {
    case 'random':
      // Randomly pick each property from either parent
      offspring.timbre = Math.random() < 0.5 ? parentA.timbre : parentB.timbre;
      offspring.cutoff = Math.random() < 0.5 ? parentA.cutoff : parentB.cutoff;
      offspring.holdTime = Math.random() < 0.5 ? parentA.holdTime : parentB.holdTime;
      offspring.releaseTime = Math.random() < 0.5 ? parentA.releaseTime : parentB.releaseTime;
      break;
    case 'dominant_a':
      // Keep A's properties (already the base)
      break;
    case 'dominant_b':
      // Use B's properties
      offspring.timbre = parentB.timbre;
      offspring.cutoff = parentB.cutoff;
      offspring.holdTime = parentB.holdTime;
      offspring.releaseTime = parentB.releaseTime;
      break;
    case 'blend':
      // Average/blend numeric properties
      offspring.timbre = (parentA.timbre + parentB.timbre) / 2;
      offspring.cutoff = ((parentA.cutoff + parentB.cutoff) / 2) as Frequency;
      offspring.holdTime = (parentA.holdTime + parentB.holdTime) / 2;
      offspring.releaseTime = (parentA.releaseTime + parentB.releaseTime) / 2;
      break;
  }
  
  // Merge wave layers from both parents (if they exist)
  const wavesA = parentA.waves ?? [];
  const wavesB = parentB.waves ?? [];
  if (wavesA.length > 0 || wavesB.length > 0) {
    // Take alternating layers from each parent, filtering out undefined
    const mergedWaves = [];
    const maxLen = Math.max(wavesA.length, wavesB.length);
    for (let i = 0; i < maxLen; i++) {
      if (i % 2 === 0 && wavesA[i]) {
        mergedWaves.push(wavesA[i]);
      } else if (wavesB[i]) {
        mergedWaves.push(wavesB[i]);
      } else if (wavesA[i]) {
        mergedWaves.push(wavesA[i]);
      }
    }
    // Filter to ensure no undefined values
    offspring.waves = mergedWaves.filter((w): w is NonNullable<typeof w> => w !== undefined);
  }
  
  return offspring;
}

// ============================================================================
// MAIN TICK FUNCTION
// ============================================================================

/**
 * Main game tick - called every frame when running
 */
export function tick(currentTime: number): void {
  try {
    const store = getGraphStore();
    if (!store.isRunning) return;
    
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // Clamp deltaTime to prevent huge jumps
    const dt = Math.min(deltaTime, 0.1);
    
    // Debug: Check state consistency
    if (store.nodes.size === 0) {
      console.warn('Tick: No nodes in store!');
      return;
    }
    
    // Update scene playback (beat tracking and scene transitions)
    updateScenePlayback(dt);
    
    // Update sources (emit packets)
    updateSources(currentTime);
    
    // Update LFOs (emit modulation packets)
    updateLFOs(currentTime);
    
    // Update packets (movement and arrival)
    updatePackets(dt);
    
    // Update node flash (visual decay)
    updateNodeFlash(dt);
    
    // Update delay nodes
    updateDelayNodes(currentTime);
    
    // Update virtual channel scenes (multi-channel audio)
    updateVirtualChannelScenes(currentTime, dt);
  } catch (error) {
    console.error('Tick error:', error);
  }
}

// ============================================================================
// SCENE PLAYBACK
// ============================================================================

/**
 * Update scene playback - tracks beats and handles scene transitions
 */
function updateScenePlayback(dt: number): void {
  const store = getGraphStore();
  const { scenePlayback } = store;
  
  // Get effective BPM from the current scene or global settings
  const effectiveBpm = scenePlayback.effectiveBpm;
  const beatsPerSecond = effectiveBpm / 60;
  const deltaBeats = dt * beatsPerSecond;
  
  // Accumulate beats
  beatAccumulator += deltaBeats;
  
  // Advance scene beat tracking
  store.advanceSceneBeat(deltaBeats);
  
  if (scenePlayback.mode === 'arrangement') {
    updateArrangementMode(deltaBeats);
  } else {
    updateJamMode(deltaBeats);
  }
}

/** Track which scenes are currently active per channel */
interface ActiveSlot {
  slotId: string;
  sceneId: SceneId;
  channelIndex: number;
  startBeat: number;
  endBeat: number;
  localBeat: number;  // Beat within this slot
  loops: number;
}

/**
 * Update arrangement mode - multi-channel scene playback
 * Multiple scenes can play simultaneously on different channels
 */
function updateArrangementMode(deltaBeats: number): void {
  const store = getGraphStore();
  const { scenePlayback, scenes, arrangement, arrangementChannels } = store;
  
  if (arrangement.length === 0) return;
  
  const currentBeat = scenePlayback.arrangementBeat;
  
  // Calculate which slots are active at the current beat (across all channels)
  const activeSlots: ActiveSlot[] = [];
  let maxEndBeat = 0;
  
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) continue;
    
    // Check if channel is muted
    const channel = arrangementChannels[slot.channel];
    if (channel?.muted) continue;
    
    // Check for solo mode - if any channel is soloed, only play soloed channels
    const hasSolo = arrangementChannels.some(c => c.solo);
    if (hasSolo && !channel?.solo) continue;
    
    const loops = slot.instanceLoopCount ?? scene.loopCount;
    const slotDuration = scene.durationBeats * loops;
    const slotStart = slot.startBeat;
    const slotEnd = slotStart + slotDuration;
    
    if (slotEnd > maxEndBeat) maxEndBeat = slotEnd;
    
    // Check if this slot is active at current beat
    if (currentBeat >= slotStart && currentBeat < slotEnd) {
      activeSlots.push({
        slotId: slot.id,
        sceneId: slot.sceneId,
        channelIndex: slot.channel,
        startBeat: slotStart,
        endBeat: slotEnd,
        localBeat: currentBeat - slotStart,
        loops
      });
    }
  }
  
  // Debug: log active slots periodically (uncomment for debugging)
  // if (Math.floor(currentBeat) !== Math.floor(currentBeat - deltaBeats) && Math.floor(currentBeat) % 4 === 0) {
  //   console.log(`[Arrangement] Beat ${currentBeat.toFixed(1)}, active slots: ${activeSlots.length}`, 
  //     activeSlots.map(s => `ch${s.channelIndex}:${s.sceneId}`).join(', '));
  // }
  
  // Check if arrangement is complete
  if (maxEndBeat > 0 && currentBeat >= maxEndBeat) {
    console.log('[Arrangement] Complete, stopping');
    store.togglePlayback();
    store.setScenePlayback({
      arrangementBeat: 0,
      currentSlotIndex: 0,
      activeChannels: []
    });
    activeChannelScenes.clear();
    return;
  }
  
  // Update active channel states
  const newActiveChannels = activeSlots.map(slot => ({
    channelIndex: slot.channelIndex,
    currentSlotId: slot.slotId,
    sceneBeat: slot.localBeat % (scenes.get(slot.sceneId)?.durationBeats ?? 16),
    sceneLoopIteration: Math.floor(slot.localBeat / (scenes.get(slot.sceneId)?.durationBeats ?? 16)),
    isTransitioning: false,
    transitionProgress: 0
  }));
  
  // Only update if channel states have changed
  const prevActiveIds = scenePlayback.activeChannels.map(c => c.currentSlotId).sort().join(',');
  const newActiveIds = newActiveChannels.map(c => c.currentSlotId).sort().join(',');
  
  if (prevActiveIds !== newActiveIds) {
    // console.log(`[Arrangement] Active slots changed: ${newActiveIds}`);
    store.setScenePlayback({ activeChannels: newActiveChannels });
    
    // Set canvas channel FIRST (before updating virtual scenes)
    // The primary slot (first active slot by channel order) goes to canvas
    if (activeSlots.length > 0 && activeSlots[0]) {
      const primarySlot = activeSlots[0];
      canvasChannelIndex = primarySlot.channelIndex;
      store.loadSceneToCanvas(primarySlot.sceneId);
    }
    
    // Update virtual channel scenes (for non-canvas channels)
    updateActiveChannelScenes(activeSlots);
  }
  
  // For backward compatibility, also set currentSceneId if there's at least one active
  if (activeSlots.length > 0 && activeSlots[0]) {
    const primarySlot = activeSlots[0];
    if (scenePlayback.currentSceneId !== primarySlot.sceneId) {
      store.setScenePlayback({
        currentSceneId: primarySlot.sceneId,
        currentSlotIndex: arrangement.findIndex(s => s.id === primarySlot.slotId),
        sceneBeat: primarySlot.localBeat % (scenes.get(primarySlot.sceneId)?.durationBeats ?? 16)
      });
    }
  }
}

/**
 * Update the virtual scene states for non-canvas channels
 */
function updateActiveChannelScenes(activeSlots: ActiveSlot[]): void {
  const store = getGraphStore();
  const { scenes } = store;
  
  // Clear old channel scenes that are no longer active
  const activeChannelIndices = new Set(activeSlots.map(s => s.channelIndex));
  for (const [channelIndex] of activeChannelScenes) {
    if (!activeChannelIndices.has(channelIndex)) {
      activeChannelScenes.delete(channelIndex);
    }
  }
  
  // Create/update channel scenes for non-canvas channels
  for (const slot of activeSlots) {
    // Skip the canvas channel - it uses the main store
    if (slot.channelIndex === canvasChannelIndex) continue;
    
    const scene = scenes.get(slot.sceneId);
    if (!scene) continue;
    
    // Check if we need to create/update this channel's state
    const existing = activeChannelScenes.get(slot.channelIndex);
    if (!existing || existing.sceneId !== slot.sceneId) {
      // Create new virtual scene state
      const nodes = new Map<NodeId, GraphNode>();
      const edges = new Map<EdgeId, GraphEdge>();
      
      // Clone scene nodes with fresh state
      for (const nodeData of scene.nodes) {
        const node: GraphNode = {
          ...nodeData,
          id: nodeData.id as NodeId,
          timer: 0,
          lastTrigger: 0,
          flash: 0,
          heldPackets: [],
        };
        nodes.set(node.id, node);
      }
      
      // Clone scene edges
      for (const edgeData of scene.edges) {
        edges.set(edgeData.id as EdgeId, edgeData as GraphEdge);
      }
      
      activeChannelScenes.set(slot.channelIndex, {
        sceneId: slot.sceneId,
        channelIndex: slot.channelIndex,
        nodes,
        edges,
        packets: new Map(),
        localBeat: slot.localBeat,
      });
      
      // console.log(`[MultiChannel] Created virtual scene for channel ${slot.channelIndex}: ${slot.sceneId}`);
    } else {
      // Update local beat
      existing.localBeat = slot.localBeat;
    }
  }
}

/**
 * Process virtual channel scenes - sources and packets for non-canvas channels
 * This enables multi-channel audio where scenes not on canvas still produce sound
 */
function updateVirtualChannelScenes(now: number, dt: number): void {
  const store = getGraphStore();
  const { masterSpeed, arrangementChannels, scenePlayback } = store;
  
  // Only process in arrangement mode
  if (scenePlayback.mode !== 'arrangement') return;
  
  const msPerBeat = (60 / masterSpeed) * 1000;
  
  // Process each active virtual channel scene
  for (const [channelIndex, channelScene] of activeChannelScenes) {
    // Skip if this channel is the one on canvas (already processed by main loop)
    if (channelIndex === canvasChannelIndex) continue;
    
    // Get channel settings for volume
    const channel = arrangementChannels[channelIndex];
    const channelVolume = channel?.volume ?? 1;
    
    // Update sources - trigger auto-sources and spawn packets
    updateVirtualSources(channelScene, now, msPerBeat);
    
    // Update packets - move them and process arrivals
    updateVirtualPackets(channelScene, dt, channelVolume);
  }
}

/**
 * Update sources in a virtual channel scene
 */
function updateVirtualSources(
  channelScene: ChannelSceneState,
  now: number,
  msPerBeat: number
): void {
  const { nodes } = channelScene;
  
  nodes.forEach((node) => {
    if (node.type !== 'source') return;
    
    const props = node.props as {
      interval: number;
      autoTrigger: boolean;
      noteIndex: number;
      midiNote: MidiNote;
      intensity: number;
    };
    
    // Skip manual trigger sources
    if (props.autoTrigger === false) return;
    
    const intervalMs = props.interval * msPerBeat;
    
    if (now - node.lastTrigger >= intervalMs) {
      // Spawn packets for this source
      spawnVirtualPacket(channelScene, node.id, props);
      
      // Update last trigger time
      node.lastTrigger = now;
      node.flash = 1;
    }
  });
}

/**
 * Spawn a packet in a virtual channel scene
 */
function spawnVirtualPacket(
  channelScene: ChannelSceneState,
  sourceNodeId: NodeId,
  props: { noteIndex: number; midiNote: MidiNote; intensity: number }
): void {
  const { edges, packets } = channelScene;
  
  if (packets.size >= MAX_PACKETS) return;
  
  // Determine MIDI note
  let midiNote: MidiNote;
  if (props.noteIndex >= 0) {
    midiNote = clampMidi(LEGACY_SCALE_OFFSET + Math.min(36, props.noteIndex)) as MidiNote;
  } else if (props.noteIndex === -1) {
    // Random note
    midiNote = (36 + Math.floor(Math.random() * 49)) as MidiNote;
  } else {
    midiNote = props.midiNote ?? (60 as MidiNote);
  }
  
  const freq = midiToFreq(midiNote);
  const intensity = props.intensity ?? 0.5;
  
  // Get outgoing edges from this source
  const outgoingEdges: GraphEdge[] = [];
  edges.forEach((edge) => {
    if (edge.from === sourceNodeId) {
      outgoingEdges.push(edge);
    }
  });
  
  // Create packets for each outgoing edge
  outgoingEdges.forEach(edge => {
    const packetId = createPacketId();
    const packet: Packet = {
      id: packetId,
      edgeId: edge.id,
      t: 0,
      payload: {
        freq,
        midiNote,
        wave: 'sine',
        timbre: 0,
        cutoff: 20000 as Frequency,
        gain: intensity,
        holdTime: 0,
        releaseTime: 0.1,
      },
    };
    
    packets.set(packetId, packet);
  });
}

/**
 * Update packets in a virtual channel scene
 */
function updateVirtualPackets(
  channelScene: ChannelSceneState,
  dt: number,
  channelVolume: number
): void {
  const store = getGraphStore();
  const { globalSettings, masterSpeed } = store;
  const { nodes, edges, packets } = channelScene;
  
  const packetsToDelete: PacketId[] = [];
  const packetsToSpawn: Packet[] = [];
  
  const secondsPerBeat = 60 / masterSpeed;
  
  packets.forEach((packet) => {
    const edge = edges.get(packet.edgeId);
    if (!edge) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (!fromNode || !toNode) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    // Calculate traverse time based on edge timing mode
    let traverseTime: number;
    if (edge.timingMode === 'fixed' && edge.durationBeats !== null) {
      traverseTime = edge.durationBeats * secondsPerBeat;
    } else {
      // Physical distance mode
      const edgeLength = dist(fromNode.x, fromNode.y, toNode.x, toNode.y);
      const beatsToTraverse = edgeLength / globalSettings.pixelsPerBeat;
      traverseTime = beatsToTraverse * secondsPerBeat;
    }
    
    // Move packet
    const speed = 1 / Math.max(0.001, traverseTime);
    packet.t += dt * speed;
    
    // Check for arrival
    if (packet.t >= 1) {
      // Process arrival - pass the edge for proper node processing
      processVirtualArrival(channelScene, packet, toNode, edge, channelVolume);
      
      // Check if gate blocked the packet (gain set to negative)
      if (packet.payload.gain < 0) {
        packetsToDelete.push(packet.id);
        return;
      }
      
      // Get outgoing edges from destination
      const nextEdges: GraphEdge[] = [];
      edges.forEach((e) => {
        if (e.from === toNode.id) {
          nextEdges.push(e);
        }
      });
      
      if (nextEdges.length === 0) {
        // No outgoing edges, delete packet
        packetsToDelete.push(packet.id);
      } else {
        // Clone packet for additional edges
        for (let i = 1; i < nextEdges.length; i++) {
          const nextEdge = nextEdges[i];
          if (nextEdge) {
            const clone: Packet = {
              id: createPacketId(),
              edgeId: nextEdge.id,
              t: 0,
              payload: { ...packet.payload },
            };
            packetsToSpawn.push(clone);
          }
        }
        
        // Continue on first edge
        const firstEdge = nextEdges[0];
        if (firstEdge) {
          // Create new packet since we can't mutate readonly properties
          const continuedPacket: Packet = {
            id: packet.id,
            edgeId: firstEdge.id,
            t: 0,
            payload: packet.payload,
          };
          packets.set(packet.id, continuedPacket);
        } else {
          packetsToDelete.push(packet.id);
        }
      }
    }
  });
  
  // Delete dead packets
  packetsToDelete.forEach(id => packets.delete(id));
  
  // Add new packets
  packetsToSpawn.forEach(p => packets.set(p.id, p));
}

/**
 * Process packet arrival at a node in a virtual channel scene
 * Uses the same processNodeArrival as the main canvas for consistent behavior
 */
function processVirtualArrival(
  channelScene: ChannelSceneState,
  packet: Packet,
  node: GraphNode,
  edge: GraphEdge,
  channelVolume: number
): void {
  // Use the same processing as the main canvas
  const processedPayload = processNodeArrival(packet, node, edge);
  
  // Update packet payload with processed result
  packet.payload = processedPayload;
  
  // Handle gate - check if packet was blocked (gain set to -1 by processNodeArrival)
  if (node.type === 'gate' && processedPayload.gain < 0) {
    // Gate blocked - mark packet for deletion by setting gain to indicate blocked
    return;
  }
  
  // Handle speaker nodes - this triggers audio!
  if (node.type === 'speaker') {
    const props = node.props as { volume?: number; pan?: number; reverb?: number };
    const volume = (props.volume ?? 1) * channelVolume;
    const pan = props.pan ?? 0;
    const reverb = props.reverb ?? 0.3;
    
    // Apply speaker volume to processed payload
    const finalPayload = {
      ...processedPayload,
      gain: processedPayload.gain * volume,
    };
    
    audioEngine.playNote(finalPayload, { pan, reverb });
    
    // Flash the node visually
    node.flash = 1;
    return;
  }
  
  // Flash node to indicate processing
  node.flash = 1;
}

/**
 * Update jam mode - infinite looping with scene queuing
 */
function updateJamMode(deltaBeats: number): void {
  const store = getGraphStore();
  const { scenePlayback, scenes } = store;
  
  if (!scenePlayback.currentSceneId) return;
  
  const currentScene = scenes.get(scenePlayback.currentSceneId);
  if (!currentScene) return;
  
  const sceneDuration = currentScene.durationBeats;
  const currentBeat = scenePlayback.sceneBeat;
  
  // Check if we should trigger the queued scene
  if (scenePlayback.queuedSceneId) {
    const shouldTrigger = checkQueueTrigger(
      currentBeat,
      deltaBeats,
      sceneDuration,
      scenePlayback.queueTrigger,
      currentScene.jamTrigger.phraseLength
    );
    
    if (shouldTrigger) {
      // Transition to queued scene
      const nextSceneId = scenePlayback.queuedSceneId;
      const nextScene = scenes.get(nextSceneId);
      
      if (nextScene) {
        // Load the next scene
        store.loadSceneToCanvas(nextSceneId);
        
        // Update playback state
        const globalBpm = store.masterSpeed;
        const globalRoot = store.musicalContext.root;
        const globalScale = store.musicalContext.scaleName;
        
        store.setScenePlayback({
          currentSceneId: nextSceneId,
          sceneBeat: 0,
          sceneLoopIteration: 0,
          queuedSceneId: null,
          effectiveBpm: getEffectiveBpm(nextScene, globalBpm),
          effectiveRoot: getEffectiveRoot(nextScene, globalRoot),
          effectiveScale: getEffectiveScale(nextScene, globalScale)
        });
      }
      return;
    }
  }
  
  // Check for scene loop
  if (currentBeat >= sceneDuration) {
    const newLoop = scenePlayback.sceneLoopIteration + 1;
    
    // In jam mode, scenes loop infinitely
    store.setScenePlayback({
      sceneBeat: currentBeat - sceneDuration,
      sceneLoopIteration: newLoop
    });
  }
}

/**
 * Check if a queued scene should be triggered based on quantize settings
 */
function checkQueueTrigger(
  currentBeat: number,
  deltaBeat: number,
  sceneDuration: number,
  quantize: SceneQuantize,
  phraseLength: number
): boolean {
  const prevBeat = currentBeat - deltaBeat;
  
  switch (quantize) {
    case 'immediate':
      return true;
      
    case 'beat':
      // Trigger on any beat boundary
      return Math.floor(currentBeat) > Math.floor(prevBeat);
      
    case 'bar':
      // Trigger on bar boundary (4 beats)
      return Math.floor(currentBeat / 4) > Math.floor(prevBeat / 4);
      
    case 'phrase':
      // Trigger on phrase boundary (custom phrase length, default to scene duration)
      const pLen = phraseLength > 0 ? phraseLength : sceneDuration;
      return Math.floor(currentBeat / pLen) > Math.floor(prevBeat / pLen);
      
    default:
      return false;
  }
}

// ============================================================================
// SOURCE EMISSION
// ============================================================================

/**
 * Update source nodes and emit packets based on their intervals
 */
function updateSources(now: number): void {
  const store = getGraphStore();
  const { masterSpeed } = store;
  const msPerBeat = (60 / masterSpeed) * 1000;
  
  store.nodes.forEach((node) => {
    if (node.type !== 'source') return;
    
    const props = node.props as {
      interval: number;
      autoTrigger: boolean;
      noteIndex: number;
      midiNote: MidiNote;
      intensity: number;
    };
    
    // Skip manual trigger sources
    if (props.autoTrigger === false) return;
    
    const intervalMs = props.interval * msPerBeat;
    
    if (now - node.lastTrigger >= intervalMs) {
      // Spawn packets
      spawnPacketFromSource(node.id, props);
      
      // Update last trigger time
      store.updateNode(node.id, { lastTrigger: now } as Partial<GraphNode>);
    }
  });
}

/**
 * Spawn a packet from a source node
 */
function spawnPacketFromSource(
  sourceNodeId: NodeId, 
  props: { noteIndex: number; midiNote: MidiNote; intensity: number }
): void {
  const store = getGraphStore();
  if (store.packets.size >= MAX_PACKETS) return;
  
  // Determine MIDI note
  let midiNote: MidiNote;
  if (props.noteIndex >= 0) {
    midiNote = clampMidi(LEGACY_SCALE_OFFSET + Math.min(36, props.noteIndex)) as MidiNote;
  } else if (props.noteIndex === -1) {
    // Random note
    midiNote = (36 + Math.floor(Math.random() * 49)) as MidiNote;
  } else {
    midiNote = props.midiNote ?? (60 as MidiNote);
  }
  
  const freq = midiToFreq(midiNote);
  const intensity = props.intensity ?? 0.5;
  
  // Get outgoing edges
  const outgoingEdges = store.getOutgoingEdges(sourceNodeId);
  
  // Create packets for each outgoing edge
  outgoingEdges.forEach(edge => {
    const packetId = createPacketId();
    const packet: Packet = {
      id: packetId,
      edgeId: edge.id,
      t: 0,
      payload: {
        freq,
        midiNote,
        wave: 'sine',
        timbre: 0,
        cutoff: 20000 as Frequency,
        gain: intensity,
        holdTime: 0,
        releaseTime: 0.1,
      },
    };
    
    // Add packet to store
    store.addPacket(packet);
  });
  
  // Flash node
  store.flashNode(sourceNodeId);
}

// ============================================================================
// LFO MODULATION
// ============================================================================

/**
 * Update LFO nodes - continuously modulate target node properties
 * LFOs directly update the target node's property value, affecting any packets
 * that pass through that node regardless of their source path.
 */
function updateLFOs(now: number): void {
  const store = getGraphStore();
  
  store.nodes.forEach((node) => {
    if (node.type !== 'lfo') return;
    
    const props = node.props as {
      rate: number;
      shape: 'sine' | 'triangle' | 'square' | 'sawtooth';
      min: number;
      max: number;
      phase: number;
    };
    
    // Calculate current LFO value
    const rate = props.rate ?? 1;
    const shape = props.shape ?? 'sine';
    const min = props.min ?? 0;
    const max = props.max ?? 1;
    const phase = props.phase ?? 0;
    
    const t = (now / 1000) * rate + phase;
    
    let value: number;
    switch (shape) {
      case 'sine':
        value = (Math.sin(t * Math.PI * 2) + 1) / 2;
        break;
      case 'triangle':
        value = 1 - Math.abs((t % 1) * 2 - 1);
        break;
      case 'square':
        value = (t % 1) < 0.5 ? 1 : 0;
        break;
      case 'sawtooth':
        value = t % 1;
        break;
      default:
        value = 0.5;
    }
    
    // Map to min/max range
    const modulationValue = min + value * (max - min);
    
    // Get outgoing modulation edges and apply value directly to target nodes
    const outgoingEdges = store.getOutgoingEdges(node.id);
    
    outgoingEdges.forEach(edge => {
      if (edge.targetParam === null) return; // Skip audio edges
      
      const targetNode = store.nodes.get(edge.to);
      if (!targetNode) return;
      
      // Directly update the target node's property
      const currentProps = { ...targetNode.props } as Record<string, unknown>;
      currentProps[edge.targetParam] = modulationValue;
      store.updateNode(edge.to, { props: currentProps } as unknown as Partial<GraphNode>);
    });
    
    // Subtle visual feedback for LFO activity (every ~100ms)
    if (now - node.lastTrigger > 100) {
      store.updateNode(node.id, { 
        lastTrigger: now,
        flash: 0.2 
      } as Partial<GraphNode>);
    }
  });
}

// ============================================================================
// PACKET MOVEMENT
// ============================================================================

/**
 * Update all packets - movement and arrival processing
 */
function updatePackets(deltaTime: number): void {
  const store = getGraphStore();
  const { globalSettings, masterSpeed } = store;
  
  const packetsToDelete: PacketId[] = [];
  const packetsToSpawn: Packet[] = [];
  const arrivals: Array<{ packet: Packet; node: GraphNode; edge: unknown }> = [];
  
  store.packets.forEach((packet) => {
    const edge = store.getEdge(packet.edgeId);
    if (!edge) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    const fromNode = store.getNode(edge.from);
    const toNode = store.getNode(edge.to);
    if (!fromNode || !toNode) {
      packetsToDelete.push(packet.id);
      return;
    }
    
    // Calculate speed based on edge timing mode
    const secondsPerBeat = 60 / masterSpeed;
    let traverseTime: number;
    
    if (edge.timingMode === 'fixed' && edge.durationBeats !== null) {
      // Use fixed duration in beats
      traverseTime = edge.durationBeats * secondsPerBeat;
    } else {
      // Use physical distance
      const edgeLength = dist(fromNode.x, fromNode.y, toNode.x, toNode.y);
      const beatsToTraverse = edgeLength / globalSettings.pixelsPerBeat;
      traverseTime = beatsToTraverse * secondsPerBeat;
    }
    
    // If traverseTime is 0 or very small, arrive immediately
    const speed = traverseTime > 0.0001 ? deltaTime / traverseTime : 1;
    
    // Update position
    const newT = packet.t + speed;
    store.updatePacket(packet.id, { t: newT });
    
    // Check if arrived
    if (newT >= 1) {
      arrivals.push({ packet, node: toNode, edge });
    }
  });
  
  // Create set of arriving packet IDs for entanglement sync
  const arrivingPacketIds = new Set(arrivals.map(a => a.packet.id));
  
  // Process arrivals
  arrivals.forEach(({ packet, node, edge }) => {
    packetsToDelete.push(packet.id);
    
    // Flash node
    store.flashNode(node.id);
    
    // Handle modulation edges (CV routing)
    const typedEdge = edge as { targetParam?: string | null };
    if (typedEdge.targetParam) {
      // This is a modulation connection - apply value to node property
      const value = packet.payload.modulationValue !== undefined 
        ? packet.payload.modulationValue 
        : packet.payload.gain;
      
      // Update the target node's property
      const currentProps = { ...node.props } as Record<string, unknown>;
      currentProps[typedEdge.targetParam] = value;
      store.updateNode(node.id, { props: currentProps } as unknown as Partial<GraphNode>);
      
      // Different visual feedback for modulation
      store.updateNode(node.id, { flash: 0.5 } as Partial<GraphNode>);
      return; // Don't forward modulation packets
    }
    
    // Process node type
    const processedPayload = processNodeArrival(packet, node, edge as never);
    
    // Handle special node types
    if (node.type === 'gate') {
      const props = node.props as { prob: number };
      if (Math.random() > props.prob) {
        // Gate blocked - don't propagate
        return;
      }
    }
    
    if (node.type === 'speaker') {
      // Trigger audio playback with speaker settings
      const speakerProps = node.props as { volume?: number; reverb?: number; pan?: number };
      // Apply speaker volume to payload gain
      const finalPayload = {
        ...processedPayload,
        gain: processedPayload.gain * (speakerProps.volume ?? 1),
      };
      
      audioEngine.playNote(finalPayload, {
        reverb: speakerProps.reverb ?? 0.3,
        pan: speakerProps.pan ?? 0,
      });
    }
    
    if (node.type === 'teleporter') {
      const props = node.props as { channel: string; isEntry: boolean };
      if (props.isEntry) {
        // Find exit teleporters
        const exits = getTeleporterExits(props.channel);
        exits.forEach(exitId => {
          const exitNode = store.getNode(exitId);
          if (exitNode) {
            const exitEdges = store.getOutgoingEdges(exitId);
            exitEdges.forEach(outEdge => {
              if (store.packets.size < MAX_PACKETS) {
                packetsToSpawn.push({
                  id: createPacketId(),
                  edgeId: outEdge.id,
                  t: 0,
                  payload: { ...processedPayload },
                  entanglementGroupId: packet.entanglementGroupId,  // Preserve entanglement
                });
              }
            });
          }
        });
        return; // Don't propagate normally
      }
    }
    
    if (node.type === 'delay') {
      // Hold packet for delay time
      const props = node.props as { delayTime: number };
      store.holdPacketAtNode(node.id, packet.payload, props.delayTime);
      return; // Don't propagate immediately
    }
    
    // Handle crossover node (sexual reproduction - wait for two parents)
    if (node.type === 'crossover') {
      const props = node.props as CrossoverProps;
      const now = performance.now();
      
      // Check if there's already a waiting packet
      const heldPackets = node.heldPackets ?? [];
      
      if (heldPackets.length === 0) {
        // First parent - hold and wait for second
        store.holdPacketAtNode(node.id, packet.payload, props.timeout);
        return; // Wait for second parent
      } else {
        // Second parent arrived - perform crossover
        const firstHeld = heldPackets[0];
        if (!firstHeld) {
          // Safety check - shouldn't happen
          return;
        }
        
        const parentA = firstHeld.payload;
        const parentB = packet.payload;
        
        // Check if first parent has timed out
        const hasTimedOut = now >= firstHeld.releaseTime;
        
        if (hasTimedOut) {
          // Timeout - just pass through the new packet
          store.releaseHeldPackets(node.id, [0]);
        } else {
          // Crossover! Create offspring
          const offspring = performCrossover(parentA, parentB, props);
          
          // Clear held packets
          store.releaseHeldPackets(node.id, [0]);
          
          // Spawn offspring on outgoing edges
          const outgoingEdges = store.getOutgoingEdges(node.id);
          outgoingEdges.forEach(outEdge => {
            if (store.packets.size + packetsToSpawn.length < MAX_PACKETS) {
              packetsToSpawn.push({
                id: createPacketId(),
                edgeId: outEdge.id,
                t: 0,
                payload: offspring,
              });
            }
          });
          
          return; // Don't propagate the parents
        }
      }
    }
    
    // Handle splitter entanglement and routing
    let entanglementGroupId = packet.entanglementGroupId;
    let targetEdges = store.getOutgoingEdges(node.id);

    if (node.type === 'splitter') {
      const props = node.props as { entangled?: boolean; behavior?: 'broadcast' | 'random' | 'weighted' };
      
      if (props.entangled) {
        // Create new entanglement group for packets split here
        entanglementGroupId = crypto.randomUUID();
      }

      // Handle routing behavior
      if (props.behavior === 'random') {
        // Pick one random edge
        if (targetEdges.length > 0) {
          const idx = Math.floor(Math.random() * targetEdges.length);
          const selected = targetEdges[idx];
          if (selected) {
            targetEdges = [selected];
          }
        }
      } else if (props.behavior === 'weighted') {
        // Pick one edge based on weights
        if (targetEdges.length > 0) {
          let totalWeight = 0;
          for (const edge of targetEdges) {
            totalWeight += (edge.weight ?? 1);
          }
          
          let r = Math.random() * totalWeight;
          let selectedEdge = targetEdges[0];
          
          for (const edge of targetEdges) {
            r -= (edge.weight ?? 1);
            if (r <= 0) {
              selectedEdge = edge;
              break;
            }
          }
          
          if (selectedEdge) {
            targetEdges = [selectedEdge];
          }
        }
      }
      // 'broadcast' is default (all edges)
    }
    
    // Sync payload to entangled packets (if this packet is entangled)
    if (packet.entanglementGroupId && node.type !== 'speaker' && node.type !== 'splitter') {
      syncEntangledPayloads(packet.entanglementGroupId, processedPayload, store, arrivingPacketIds);
    }
    
    // Propagate to outgoing edges
    targetEdges.forEach(outEdge => {
      if (store.packets.size + packetsToSpawn.length < MAX_PACKETS) {
        const newPayload = { ...processedPayload };
        packetsToSpawn.push({
          id: createPacketId(),
          edgeId: outEdge.id,
          t: 0,
          payload: newPayload,
          entanglementGroupId,  // Propagate entanglement
        });
      }
    });
  });
  
  // Delete processed packets
  packetsToDelete.forEach(id => store.deletePacket(id));
  
  // Spawn new packets
  packetsToSpawn.forEach(packet => store.addPacket(packet));
  
  // Process any speakers that were triggered inside tunnels
  const tunnelSpeakers = consumePendingTunnelSpeakers();
  tunnelSpeakers.forEach(({ payload, speakerProps }) => {
    const volume = (speakerProps.volume as number) ?? 1;
    const reverb = (speakerProps.reverb as number) ?? 0.3;
    const pan = (speakerProps.pan as number) ?? 0;
    
    const finalPayload = {
      ...payload,
      gain: payload.gain * volume,
    };
    
    audioEngine.playNote(finalPayload, { reverb, pan });
  });
}

// ============================================================================
// NODE UPDATES
// ============================================================================

/**
 * Update node flash decay
 */
function updateNodeFlash(deltaTime: number): void {
  const store = getGraphStore();
  
  store.nodes.forEach((node) => {
    if (node.flash > 0) {
      const newFlash = node.flash * Math.pow(0.1, deltaTime * 5);
      if (newFlash < 0.01) {
        store.updateNode(node.id, { flash: 0 } as Partial<GraphNode>);
      } else {
        store.updateNode(node.id, { flash: newFlash } as Partial<GraphNode>);
      }
    }
  });
}

/**
 * Update delay nodes - release held packets
 */
function updateDelayNodes(now: number): void {
  const store = getGraphStore();
  
  store.nodes.forEach((node) => {
    if (node.type !== 'delay') return;
    
    const heldPackets = node.heldPackets ?? [];
    const toRelease: number[] = [];
    
    heldPackets.forEach((hp, index) => {
      if (now >= hp.releaseTime) {
        toRelease.push(index);
        
        // Spawn packets on outgoing edges
        const outgoingEdges = store.getOutgoingEdges(node.id);
        outgoingEdges.forEach(edge => {
          if (store.packets.size < MAX_PACKETS) {
            store.addPacket({
              id: createPacketId(),
              edgeId: edge.id,
              t: 0,
              payload: hp.payload,
            });
          }
        });
        
        // Flash node
        store.flashNode(node.id);
      }
    });
    
    // Remove released packets (in reverse order to maintain indices)
    if (toRelease.length > 0) {
      store.releaseHeldPackets(node.id, toRelease);
    }
  });
}

// ============================================================================
// TICK LIFECYCLE
// ============================================================================

/**
 * Start the tick system
 */
export function startTick(): void {
  lastTime = performance.now();
  beatAccumulator = 0;
  
  const runTick = () => {
    tick(performance.now());
    tickInterval = requestAnimationFrame(runTick);
  };
  
  tickInterval = requestAnimationFrame(runTick);
}

/**
 * Stop the tick system
 */
export function stopTick(): void {
  if (tickInterval !== null) {
    cancelAnimationFrame(tickInterval);
    tickInterval = null;
  }
}

/**
 * Reset tick timing (call when starting playback)
 */
export function resetTick(): void {
  lastTime = performance.now();
  beatAccumulator = 0;
  
  // Reset all node timers
  const store = getGraphStore();
  const now = performance.now();
  
  store.nodes.forEach((node) => {
    if (node.type === 'source') {
      store.updateNode(node.id, { lastTrigger: now } as Partial<GraphNode>);
    }
  });
  
  // Reset scene playback state
  const { scenePlayback, arrangement, scenes } = store;
  
  if (scenePlayback.mode === 'arrangement' && arrangement.length > 0) {
    // In arrangement mode, start from the first slot
    const firstSlot = arrangement[0];
    const scene = firstSlot ? scenes.get(firstSlot.sceneId) : undefined;
    
    console.log(`[resetTick] Arrangement mode: ${arrangement.length} slots`);
    arrangement.forEach((slot, i) => {
      const s = scenes.get(slot.sceneId);
      console.log(`  Slot ${i}: scene ${slot.sceneId}, ${s?.nodes.length ?? 0} nodes, ${s?.durationBeats ?? 0} beats`);
    });
    console.log(`[resetTick] Starting with slot 0, scene ${firstSlot?.sceneId}`);
    
    store.setScenePlayback({
      arrangementBeat: 0,
      currentSlotIndex: 0,
      currentSceneId: firstSlot?.sceneId ?? null,
      sceneBeat: 0,
      sceneLoopIteration: 0,
      isTransitioning: false,
      transitionProgress: 0,
      effectiveBpm: scene ? getEffectiveBpm(scene, store.masterSpeed) : store.masterSpeed,
      effectiveRoot: scene ? getEffectiveRoot(scene, store.musicalContext.root) : store.musicalContext.root,
      effectiveScale: scene ? getEffectiveScale(scene, store.musicalContext.scaleName) : store.musicalContext.scaleName
    });
    
    // Load the first scene to canvas if in arrangement mode
    if (firstSlot) {
      store.loadSceneToCanvas(firstSlot.sceneId);
    }
  } else if (scenePlayback.mode === 'jam') {
    // In jam mode, reset to the current scene's beginning
    const currentScene = scenePlayback.currentSceneId ? scenes.get(scenePlayback.currentSceneId) : undefined;
    
    store.setScenePlayback({
      sceneBeat: 0,
      sceneLoopIteration: 0,
      isTransitioning: false,
      transitionProgress: 0,
      effectiveBpm: currentScene ? getEffectiveBpm(currentScene, store.masterSpeed) : store.masterSpeed,
      effectiveRoot: currentScene ? getEffectiveRoot(currentScene, store.musicalContext.root) : store.musicalContext.root,
      effectiveScale: currentScene ? getEffectiveScale(currentScene, store.musicalContext.scaleName) : store.musicalContext.scaleName
    });
  }
}
