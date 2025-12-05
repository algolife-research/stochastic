// AIGA - Save/Load Functionality

import * as state from '../core/state.js';
import { updatePropPanel } from '../ui/panel.js';
import { SCALES } from '../core/constants.js';
import { midiService } from '../io/midi.js';

/**
 * Save project to file
 */
export function saveGraph() {
  const fileName = prompt('Enter file name:', state.projectMeta.name || 'composition');
  if (!fileName) return;
  
  // Update meta
  const meta = {
    ...state.projectMeta,
    name: fileName,
    modified: Date.now()
  };
  state.setProjectMeta(meta);

  const project = {
    meta: meta,
    global: {
      bpm: state.masterSpeed,
      masterVolume: state.masterGain ? state.masterGain.gain.value : 0.5,
      musicalContext: state.musicalContext,
      gravityConstant: state.globalSettings.gravityConstant,
      subdivisions: state.globalSettings.subdivisions,
      pixelsPerBeat: state.globalSettings.pixelsPerBeat
    },
    scenes: state.scenes,
    activeSceneIndex: state.activeSceneIndex,
    graph: {
      nodes: state.nodes.map(n => ({
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        props: n.props
      })),
      edges: state.edges.map(e => ({
        id: e.id,
        from: e.from,
        to: e.to,
        timingMode: e.timingMode,
        durationBeats: e.durationBeats,
        targetParam: e.targetParam,
        props: e.props
      })),
      annotations: state.annotations.map(a => ({
        id: a.id,
        x: a.x,
        y: a.y,
        text: a.text,
        fontSize: a.fontSize,
        color: a.color
      })),
      regions: state.regions.map(r => ({
        id: r.id,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        name: r.name,
        description: r.description,
        color: r.color
      }))
    },
    midiConfig: {
      selectedOutputId: midiService.selectedOutputId
    }
  };
  
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.aiga') ? fileName : fileName + '.aiga';
  a.click();
  URL.revokeObjectURL(url);
  
  state.setIsDirty(false);
}

/**
 * Load graph from file input event
 */
export function loadGraph(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      loadData(data);
    } catch (err) {
      console.error("Failed to load file", err);
      alert("Invalid file format");
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/**
 * Load graph data object
 */
export function loadData(data) {
  // Stop audio engine and clear packets
  state.setPackets([]);
  
  // Detect if legacy format (flat structure) or new Project format
  const isProjectFormat = !!data.meta && !!data.graph;
  
  if (isProjectFormat) {
    // Load Project Format
    state.setProjectMeta(data.meta);
    
    // Global Settings
    if (data.global) {
      state.setMasterSpeed(data.global.bpm || 120);
      if (data.global.musicalContext) state.setMusicalContext(data.global.musicalContext);
      if (data.global.gravityConstant !== undefined) state.globalSettings.gravityConstant = data.global.gravityConstant;
      if (data.global.subdivisions) state.globalSettings.subdivisions = data.global.subdivisions;
      if (data.global.pixelsPerBeat) state.globalSettings.pixelsPerBeat = data.global.pixelsPerBeat;
    }
    
    // Scenes
    state.setScenes(data.scenes || []);
    state.setActiveSceneIndex(data.activeSceneIndex !== undefined ? data.activeSceneIndex : -1);
    
    // Graph
    const g = data.graph;
    loadGraphNodes(g.nodes);
    loadGraphEdges(g.edges);
    state.setAnnotations(g.annotations || []);
    state.setRegions(g.regions || []);
    
    // MIDI
    if (data.meta.midiOutputId) {
      midiService.setOutput(data.meta.midiOutputId);
    }
    
  } else {
    // Load Legacy Format
    state.setMasterSpeed(data.bpm || 120);
    if (data.musicalContext) state.setMusicalContext(data.musicalContext);
    if (data.gravityConstant !== undefined) state.globalSettings.gravityConstant = data.gravityConstant;
    
    loadGraphNodes(data.nodes);
    loadGraphEdges(data.edges);
    state.setAnnotations(data.annotations || []);
    state.setRegions(data.regions || []);
    
    // Reset Project Meta
    state.setProjectMeta({
      name: "Imported Legacy",
      author: "Unknown",
      created: Date.now(),
      modified: Date.now(),
      version: "1.0.0"
    });
    state.setScenes([]);
    state.setActiveSceneIndex(-1);
  }
  
  // Update UI elements
  const speedInput = document.getElementById('speedInput');
  if (speedInput) speedInput.value = state.masterSpeed;
  
  const rootSelect = document.getElementById('setting-root');
  if (rootSelect) rootSelect.value = state.musicalContext.root;
  
  const scaleSelect = document.getElementById('setting-scale');
  if (scaleSelect) {
    // Find matching scale name
    for (const [name, intervals] of Object.entries(SCALES)) {
      if (JSON.stringify(intervals) === JSON.stringify(state.musicalContext.scale)) {
        scaleSelect.value = name;
        break;
      }
    }
  }
  
  updatePropPanel(null);
  state.setIsDirty(false);
}

function loadGraphNodes(nodesData) {
  state.setNodes(nodesData.map(n => ({
    ...n,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [],
    props: n.props || { interval: 2, noteIndex: -1, prob: 0.5, shift: 2 }
  })));
}

function loadGraphEdges(edgesData) {
  state.setEdges(edgesData.map(e => ({
    id: e.id,
    from: e.from,
    to: e.to,
    timingMode: e.timingMode || e.props?.timingMode || 'physical',
    durationBeats: e.durationBeats ?? e.props?.durationBeats ?? null,
    targetParam: e.targetParam || e.props?.targetParam || null,
    t: 0,
    props: e.props || {}
  })));
}
