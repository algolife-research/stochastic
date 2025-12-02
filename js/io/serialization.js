// AIGA - Save/Load Functionality

import * as state from '../core/state.js';
import { updatePropPanel } from '../ui/panel.js';

/**
 * Save graph to file
 */
export function saveGraph() {
  const fileName = prompt('Enter file name:', 'composition');
  if (!fileName) return;
  
  const data = {
    version: "1.0",
    bpm: state.masterSpeed,
    nodes: state.nodes.map(n => ({
      id: n.id,
      type: n.type,
      x: n.x,
      y: n.y,
      props: n.props
    })),
    edges: state.edges
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.aiga') ? fileName : fileName + '.aiga';
  a.click();
  URL.revokeObjectURL(url);
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
  // Restore nodes
  state.setNodes(data.nodes.map(n => ({
    ...n,
    timer: 0,
    lastTrigger: 0,
    flash: 0,
    heldPackets: [],
    props: n.props || { interval: 2, noteIndex: -1, prob: 0.5, shift: 2 }
  })));
  
  state.setEdges(data.edges);
  state.setPackets([]);
  
  // Update speed
  if (data.bpm) {
    state.setMasterSpeed(data.bpm);
    const speedInput = document.getElementById('speedInput');
    if (speedInput) speedInput.value = data.bpm;
  }
  
  // Reset UI
  state.setSelectedNode(null);
  state.setSelectedEdge(null);
  state.resetView();
  updatePropPanel(null);
}
