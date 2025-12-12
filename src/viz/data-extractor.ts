// Stochastic Viz - Data Extractor
// Extracts musical data from the graph engine for visualization

import { getGraphStore } from '@core/store';
import { audioEngine } from '@audio/engine';
import type { 
  VizMusicalData, 
  VizPacketData, 
  VizNodeData, 
  VizNoteData,
  Frequency,
} from '@core/types';
import { midiToHue } from './palettes';

// Type for the store state
type GraphStoreState = ReturnType<typeof getGraphStore>;

/** 
 * Extract all relevant musical data from the current graph state.
 * This is called once per frame by the viz renderer.
 */
export function extractVizData(): VizMusicalData {
  const state = getGraphStore();
  
  const packets = extractPacketData(state);
  const nodes = extractNodeData(state);
  const activeNotes = extractActiveNotes();
  
  // Compute aggregates
  const averageFrequency = computeAverageFrequency(packets, activeNotes);
  const averageIntensity = computeAverageIntensity(packets, activeNotes);
  const packetDensity = computePacketDensity(packets, state.viewport);
  
  // Timing data
  const bpm = state.scenePlayback.effectiveBpm || state.masterSpeed;
  const beat = computeCurrentBeat(state);
  const beatPhase = beat % 1;
  const barPhase = (beat % 4) / 4;
  
  return {
    beat,
    bpm,
    beatPhase,
    barPhase,
    packets,
    nodes,
    activeNotes,
    averageFrequency,
    averageIntensity,
    packetDensity,
  };
}

/** Extract packet data for visualization */
function extractPacketData(state: GraphStoreState): VizPacketData[] {
  const packets: VizPacketData[] = [];
  const nodes = state.nodes;
  const edges = state.edges;
  
  for (const [id, packet] of state.packets) {
    const edge = edges.get(packet.edgeId);
    if (!edge) continue;
    
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (!fromNode || !toNode) continue;
    
    // Interpolate position along edge
    const x = fromNode.x + (toNode.x - fromNode.x) * packet.t;
    const y = fromNode.y + (toNode.y - fromNode.y) * packet.t;
    
    // Compute velocity (direction of travel)
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 100; // Approximate pixels per second
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    
    packets.push({
      id,
      x,
      y,
      vx,
      vy,
      frequency: packet.payload.freq,
      midiNote: packet.payload.midiNote,
      intensity: packet.payload.gain,
      waveType: packet.payload.wave,
      hue: midiToHue(packet.payload.midiNote as number),
    });
  }
  
  return packets;
}

/** Extract node data for visualization */
function extractNodeData(state: GraphStoreState): VizNodeData[] {
  const vizNodes: VizNodeData[] = [];
  const edges = state.edges;
  
  for (const [id, node] of state.nodes) {
    // Count connections
    let connectionCount = 0;
    for (const edge of edges.values()) {
      if (edge.from === id || edge.to === id) {
        connectionCount++;
      }
    }
    
    vizNodes.push({
      id,
      type: node.type,
      x: node.x,
      y: node.y,
      flash: node.flash,
      connectionCount,
    });
  }
  
  return vizNodes;
}

/** Extract active notes from audio engine */
function extractActiveNotes(): VizNoteData[] {
  // Get active voices from audio engine
  const activeVoices = audioEngine.getActiveVoices();
  
  return activeVoices.map(voice => ({
    frequency: voice.freq as Frequency,
    gain: voice.gain,
    pan: voice.pan,
    envelope: voice.envelope,
    waveType: voice.wave as import('@core/types').WaveType,
  }));
}

/** Compute average frequency of active sounds */
function computeAverageFrequency(packets: VizPacketData[], notes: VizNoteData[]): Frequency {
  const allFreqs: number[] = [
    ...packets.map(p => p.frequency as number),
    ...notes.map(n => n.frequency as number),
  ];
  
  if (allFreqs.length === 0) return 440 as Frequency;
  
  const sum = allFreqs.reduce((a, b) => a + b, 0);
  return (sum / allFreqs.length) as Frequency;
}

/** Compute average intensity of active sounds */
function computeAverageIntensity(packets: VizPacketData[], notes: VizNoteData[]): number {
  const allIntensities = [
    ...packets.map(p => p.intensity),
    ...notes.map(n => n.gain),
  ];
  
  if (allIntensities.length === 0) return 0;
  
  const sum = allIntensities.reduce((a, b) => a + b, 0);
  return sum / allIntensities.length;
}

/** Compute packet density (packets per 1000 square pixels) */
function computePacketDensity(
  packets: VizPacketData[], 
  viewport: { panOffset: { x: number; y: number }; zoomLevel: number }
): number {
  if (packets.length === 0) return 0;
  
  // Estimate visible area
  const visibleWidth = 1920 / viewport.zoomLevel;
  const visibleHeight = 1080 / viewport.zoomLevel;
  const area = visibleWidth * visibleHeight;
  
  return (packets.length / area) * 1000;
}

/** Compute current beat based on playback state */
function computeCurrentBeat(state: GraphStoreState): number {
  const playback = state.scenePlayback;
  
  if (playback.mode === 'arrangement') {
    return playback.arrangementBeat;
  } else {
    return playback.sceneBeat;
  }
}

/** Get speaker nodes that are currently playing (flash > 0) */
export function getActiveSpeakers(): VizNodeData[] {
  const state = getGraphStore();
  
  const speakers: VizNodeData[] = [];
  
  for (const [id, node] of state.nodes) {
    if (node.type === 'speaker' && node.flash > 0) {
      let connectionCount = 0;
      for (const edge of state.edges.values()) {
        if (edge.from === id || edge.to === id) {
          connectionCount++;
        }
      }
      
      speakers.push({
        id,
        type: node.type,
        x: node.x,
        y: node.y,
        flash: node.flash,
        connectionCount,
      });
    }
  }
  
  return speakers;
}

/** Get source nodes that are about to trigger */
export function getActiveSources(): VizNodeData[] {
  const state = getGraphStore();
  
  const sources: VizNodeData[] = [];
  
  for (const [id, node] of state.nodes) {
    if (node.type === 'source') {
      let connectionCount = 0;
      for (const edge of state.edges.values()) {
        if (edge.from === id || edge.to === id) {
          connectionCount++;
        }
      }
      
      sources.push({
        id,
        type: node.type,
        x: node.x,
        y: node.y,
        flash: node.flash,
        connectionCount,
      });
    }
  }
  
  return sources;
}
