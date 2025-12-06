// Phonon v2 - Game Tick System
// Handles source timers, packet movement, and game loop

import { getGraphStore } from './store';
import type { Packet, GraphNode, NodeId, PacketId, MidiNote, Frequency, AudioPayload } from './types';
import { createPacketId } from './types';
import { dist, midiToFreq, clampMidi, LEGACY_SCALE_OFFSET, MAX_PACKETS } from './constants';
import { processNodeArrival, getTeleporterExits, consumePendingTunnelSpeakers } from './engine';
import { audioEngine } from '@audio/engine';

// ============================================================================
// TICK STATE
// ============================================================================

let lastTime = 0;
let tickInterval: number | null = null;

// ============================================================================
// ENTANGLEMENT SYNC
// ============================================================================

/**
 * Sync payload changes to all packets in the same entanglement group
 * This creates the quantum-like behavior where split packets share effects
 */
function syncEntangledPayloads(
  groupId: string, 
  newPayload: AudioPayload, 
  store: ReturnType<typeof getGraphStore>
): void {
  store.packets.forEach((packet) => {
    if (packet.entanglementGroupId === groupId) {
      // Sync the payload - update in place for performance
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
    
    // Handle splitter entanglement
    let entanglementGroupId = packet.entanglementGroupId;
    if (node.type === 'splitter') {
      const props = node.props as { entangled?: boolean };
      if (props.entangled) {
        // Create new entanglement group for packets split here
        entanglementGroupId = crypto.randomUUID();
      }
    }
    
    // Sync payload to entangled packets (if this packet is entangled)
    if (packet.entanglementGroupId && node.type !== 'speaker' && node.type !== 'splitter') {
      syncEntangledPayloads(packet.entanglementGroupId, processedPayload, store);
    }
    
    // Propagate to outgoing edges
    const outgoingEdges = store.getOutgoingEdges(node.id);
    outgoingEdges.forEach(outEdge => {
      if (store.packets.size + packetsToSpawn.length < MAX_PACKETS) {
        packetsToSpawn.push({
          id: createPacketId(),
          edgeId: outEdge.id,
          t: 0,
          payload: { ...processedPayload },
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
  
  // Reset all node timers
  const store = getGraphStore();
  const now = performance.now();
  
  store.nodes.forEach((node) => {
    if (node.type === 'source') {
      store.updateNode(node.id, { lastTrigger: now } as Partial<GraphNode>);
    }
  });
}
