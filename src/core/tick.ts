// Phonon v3 - Game Tick System
// Handles source timers, packet movement, scene playback, and game loop

import { getGraphStore } from './store';
import type { Packet, GraphNode, NodeId, PacketId, MidiNote, Frequency, AudioPayload, SceneId, SceneQuantize } from './types';
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

/**
 * Update arrangement mode - sequential scene playback
 */
function updateArrangementMode(deltaBeats: number): void {
  const store = getGraphStore();
  const { scenePlayback, scenes, arrangement } = store;
  
  if (arrangement.length === 0) return;
  
  // Calculate total beats in arrangement
  let totalBeats = 0;
  const slotBounds: { start: number; end: number; sceneId: SceneId; loops: number }[] = [];
  
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) {
      console.warn(`[updateArrangement] Slot has missing scene ${slot.sceneId}`);
      continue;
    }
    
    const loops = slot.instanceLoopCount ?? scene.loopCount;
    const slotDuration = scene.durationBeats * loops;
    
    slotBounds.push({
      start: totalBeats,
      end: totalBeats + slotDuration,
      sceneId: slot.sceneId,
      loops
    });
    
    totalBeats += slotDuration;
  }
  
  if (totalBeats === 0) return;
  
  // Check if we need to advance to next slot
  const currentBeat = scenePlayback.arrangementBeat;
  const currentSlot = slotBounds[scenePlayback.currentSlotIndex];
  
  // Debug: log current state periodically (every ~1 second worth of beats)
  if (Math.floor(currentBeat) !== Math.floor(currentBeat - deltaBeats) && Math.floor(currentBeat) % 4 === 0) {
    console.log(`[updateArrangement] Beat ${currentBeat.toFixed(1)}, slotIndex: ${scenePlayback.currentSlotIndex}, slotBounds: ${slotBounds.length}, currentSlot: ${currentSlot?.start}-${currentSlot?.end}`);
  }
  
  if (currentSlot && currentBeat >= currentSlot.end) {
    // Move to next slot
    const nextIndex = scenePlayback.currentSlotIndex + 1;
    
    console.log(`[Arrangement] Transitioning from slot ${scenePlayback.currentSlotIndex} to ${nextIndex}, beat: ${currentBeat.toFixed(2)}, slotEnd: ${currentSlot.end}`);
    console.log(`[Arrangement] Current nodes on canvas before transition: ${store.nodes.size}`);
    
    if (nextIndex >= arrangement.length) {
      // Arrangement complete - stop playback
      console.log('[Arrangement] Complete, stopping');
      store.togglePlayback(); // Stop
      store.setScenePlayback({
        arrangementBeat: 0,
        currentSlotIndex: 0
      });
      return;
    }
    
    // Advance to next slot
    const nextSlot = slotBounds[nextIndex];
    if (nextSlot) {
      const nextScene = scenes.get(nextSlot.sceneId);
      console.log(`[Arrangement] Loading scene ${nextSlot.sceneId}, has ${nextScene?.nodes.length ?? 0} nodes`);
      
      store.setScenePlayback({
        currentSlotIndex: nextIndex,
        currentSceneId: nextSlot.sceneId,
        sceneBeat: 0,
        sceneLoopIteration: 0
      });
      
      // Load the next scene's graph to the canvas
      store.loadSceneToCanvas(nextSlot.sceneId);
      
      // Debug: check what was loaded
      const loadedNodes = store.nodes.size;
      console.log(`[Arrangement] After loadSceneToCanvas: ${loadedNodes} nodes on canvas`);
      
      // Update effective settings
      const scene = scenes.get(nextSlot.sceneId);
      if (scene) {
        const globalBpm = store.masterSpeed;
        const globalRoot = store.musicalContext.root;
        const globalScale = store.musicalContext.scaleName;
        
        store.setScenePlayback({
          effectiveBpm: getEffectiveBpm(scene, globalBpm),
          effectiveRoot: getEffectiveRoot(scene, globalRoot),
          effectiveScale: getEffectiveScale(scene, globalScale)
        });
      }
    }
  }
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
  
  // Debug: log source nodes
  const sourceNodes = Array.from(store.nodes.values()).filter(n => n.type === 'source');
  if (sourceNodes.length > 0 && Math.random() < 0.01) {
    console.log(`[updateSources] Found ${sourceNodes.length} source nodes: ${sourceNodes.map(n => n.id.slice(0,8)).join(', ')}`);
  }
  
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
          targetEdges = [targetEdges[idx]];
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
          targetEdges = [selectedEdge];
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
