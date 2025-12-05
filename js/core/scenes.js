import * as state from './state.js';
import { uid } from './utils.js';

/**
 * Create a new scene from the current state
 * @param {string} name - Name of the scene
 * @returns {Object} The new scene object
 */
export function captureScene(name) {
  const scene = {
    id: uid(),
    name: name || `Scene ${state.scenes.length + 1}`,
    color: '#2d2d2d', // Default background color
    globalOverrides: {
      bpm: state.masterSpeed,
      rootNote: state.musicalContext.root,
      scale: [...state.musicalContext.scale],
      gravityConstant: state.globalSettings.gravityConstant
    },
    nodeOverrides: {}
  };

  // Capture state of all relevant nodes
  state.nodes.forEach(node => {
    // For now, we primarily capture mute/active state of sources
    // But we can extend this to capture any property
    if (node.type === 'source') {
      scene.nodeOverrides[node.id] = {
        active: node.props.autoTrigger !== false,
        prob: node.props.prob !== undefined ? node.props.prob : 1.0
      };
    }
    
    // Capture Gate probabilities
    if (node.type === 'gate') {
      scene.nodeOverrides[node.id] = {
        prob: node.props.prob
      };
    }
  });

  return scene;
}

/**
 * Apply a scene to the current state
 * @param {number} index - Index of the scene in state.scenes
 */
export function applyScene(index) {
  if (index < 0 || index >= state.scenes.length) return;
  
  const scene = state.scenes[index];
  state.setActiveSceneIndex(index);
  
  // Apply Global Overrides
  if (scene.globalOverrides) {
    if (scene.globalOverrides.bpm) state.setMasterSpeed(scene.globalOverrides.bpm);
    
    if (scene.globalOverrides.rootNote !== undefined) {
      state.setMusicalContext({ root: scene.globalOverrides.rootNote });
      state.projectMeta.rootNote = scene.globalOverrides.rootNote;
    }
    
    if (scene.globalOverrides.scale) {
      state.setMusicalContext({ scale: scene.globalOverrides.scale });
      // Note: We cannot easily update projectMeta.scale (string) from intervals (array)
    }
    
    if (scene.globalOverrides.gravityConstant !== undefined) {
      state.globalSettings.gravityConstant = scene.globalOverrides.gravityConstant;
      state.projectMeta.gravity = scene.globalOverrides.gravityConstant;
    }
  }
  
  // Apply Node Overrides
  if (scene.nodeOverrides) {
    Object.entries(scene.nodeOverrides).forEach(([nodeId, props]) => {
      const node = state.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      if (props.active !== undefined) {
        // Map 'active' back to autoTrigger for sources
        if (node.type === 'source') {
          node.props.autoTrigger = props.active;
        }
      }
      
      if (props.prob !== undefined) {
        node.props.prob = props.prob;
      }
    });
  }
  
  // Visual Feedback (Background Color)
  // We'll need to update the canvas background rendering to use this
  // For now, we can just log it
  console.log(`Switched to Scene: ${scene.name}`);
}

/**
 * Add a new scene
 */
export function addScene(name) {
  const scene = captureScene(name);
  const newScenes = [...state.scenes, scene];
  state.setScenes(newScenes);
  state.setIsDirty(true);
  return scene;
}

/**
 * Update an existing scene with current state
 */
export function updateScene(index) {
  if (index < 0 || index >= state.scenes.length) return;
  
  const currentName = state.scenes[index].name;
  const updatedScene = captureScene(currentName);
  updatedScene.id = state.scenes[index].id; // Preserve ID
  
  const newScenes = [...state.scenes];
  newScenes[index] = updatedScene;
  state.setScenes(newScenes);
  state.setIsDirty(true);
}

/**
 * Delete a scene
 */
export function deleteScene(index) {
  const newScenes = [...state.scenes];
  newScenes.splice(index, 1);
  state.setScenes(newScenes);
  
  if (state.activeSceneIndex >= index) {
    state.setActiveSceneIndex(Math.max(-1, state.activeSceneIndex - 1));
  }
  state.setIsDirty(true);
}
