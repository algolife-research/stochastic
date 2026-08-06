// Tutorial Script: Your First Sound
// This script defines the actions and narration for a beginner tutorial

import type { TutorialVideoScript } from '../types';

export const firstSoundTutorial: TutorialVideoScript = {
  id: 'first-sound',
  title: 'Your First Sound in Stochastic',
  description: 'Learn to create a simple generative sound in under 60 seconds',
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  segments: [
    // Intro
    {
      narration: "Welcome to Stochastic! Let's create your first generative sound in under a minute.",
      actions: [
        { type: 'wait', ms: 500 },
      ],
      pauseAfter: 500,
    },
    
    // Create Source
    {
      narration: "Right-click on the canvas to open the node menu.",
      actions: [
        { type: 'moveMouse', x: 400, y: 350 },
        { type: 'wait', ms: 300 },
        { type: 'rightClick', x: 400, y: 350 },
        { type: 'wait', ms: 800 },
      ],
    },
    {
      narration: "Click on Source. This node generates musical events at regular intervals.",
      actions: [
        { type: 'selectContextMenu', item: 'Source' },
        { type: 'wait', ms: 600 },
      ],
    },
    
    // Create Speaker
    {
      narration: "Now let's add a Speaker to hear the output. Right-click again to the right.",
      actions: [
        { type: 'moveMouse', x: 700, y: 350 },
        { type: 'wait', ms: 300 },
        { type: 'rightClick', x: 700, y: 350 },
        { type: 'wait', ms: 800 },
      ],
    },
    {
      narration: "Select Speaker from the menu.",
      actions: [
        { type: 'selectContextMenu', item: 'Speaker' },
        { type: 'wait', ms: 600 },
      ],
    },
    
    // Connect nodes
    {
      narration: "Now connect the Source to the Speaker by clicking and dragging between them.",
      actions: [
        { type: 'moveMouse', x: 425, y: 350 },
        { type: 'wait', ms: 200 },
        { type: 'drag', from: { x: 425, y: 350 }, to: { x: 675, y: 350 } },
        { type: 'wait', ms: 500 },
      ],
    },
    
    // Play
    {
      narration: "Press the spacebar to start playback.",
      actions: [
        { type: 'pressKey', key: 'Space' },
        { type: 'wait', ms: 3000 },
      ],
    },
    
    // Conclusion
    {
      narration: "Congratulations! You've created your first generative sound. The Source emits a note every 2 beats, and the Speaker plays it.",
      actions: [
        { type: 'wait', ms: 1000 },
        { type: 'pressKey', key: 'Space' }, // Stop playback
      ],
      pauseAfter: 1000,
    },
    
    // Next steps
    {
      narration: "Try adding more nodes between the Source and Speaker to shape your sound. Happy composing!",
      actions: [
        { type: 'wait', ms: 500 },
      ],
    },
  ],
};

export default firstSoundTutorial;
