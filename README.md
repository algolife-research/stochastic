# AIGA - Audio Interactive Graph Application

A visual node-based audio synthesizer where you create music by building graphs. Packets flow through nodes, transforming and generating sound along the way.

## Features

- **Visual Graph Editor**: Create and connect nodes with intuitive drag-and-drop
- **Real-time Audio**: Web Audio API-based synthesis with live playback
- **Multiple Node Types**:
  - ⚡ **Source**: Generates packets at regular intervals (set note, intensity)
  - 🔊 **Emitter**: Outputs sound with volume, reverb, and pan control
  - 🎵 **Pitch**: Shifts frequency by semitones
  - 📢 **Gain**: Multiplies packet intensity/volume
  - 🕒 **Delay**: Holds packets for specified beats
  - 🔀 **Splitter**: Sends packets to all outputs
  - 🚪 **Gate**: Probabilistic pass-through
  - 🌊 **Filter**: Low-pass filter with envelope modulation
  - 🔮 **Polariser**: Shapes waveform (sine/saw/square/tri) with attack/decay envelope
  - 🎻 **Harmonic**: Adds overtone partials at integer frequency ratios
  - 〰️ **Modulator**: LFO pitch modulation (vibrato) with rate, depth, and delay
  - 🌫️ **Noise**: Adds white/pink/brown noise texture
  - 🎹 **Chord**: Creates major chord (root, 3rd, 5th)
  - 🌀 **Teleporter**: Instant packet routing across the graph (channel-based linking)
  - 🚇 **Tunnel**: Groups multiple nodes for instant processing

- **Realistic Synthesis**: 
  - **Harmonics**: Stack harmonic nodes for authentic instrument timbres
  - **Modulator/Vibrato**: Delayed pitch modulation for expressive playing
  - **Filter Envelopes**: Dynamic brightness changes over note duration
  - **Noise Layers**: Breath, bow scratch, and transient textures
- **Wave Stacking**: Combine multiple polarisers for rich, layered sounds
- **Visual Feedback**: 
  - Particle color reflects pitch (rainbow spectrum from low to high)
  - Wavy trails indicate timbre/polariser processing
- **Box Selection**: Shift+drag to select multiple nodes
- **Grouping**: Ctrl+G to combine nodes into a Tunnel
- **Node Duplication**: Ctrl+D to duplicate selected nodes (preserves edges between them)
- **Save/Load**: Export and import compositions as .aiga files
- **Audio Export**: Render compositions to WAV files (offline rendering)
- **MIDI Export**: Export note data as Standard MIDI Files for DAW import
- **Examples**: Pre-built compositions to explore

## Getting Started

1. Open `index.html` in a modern browser
2. Right-click on the canvas to add nodes
3. Hover over a node and click the "+" handle to create connections
4. Press Play to start the audio engine
5. Experiment with different node combinations!

## Controls

- **Right-click**: Open context menu (add nodes, delete, link)
- **Left-click + drag**: Move nodes
- **Shift + drag**: Box select multiple nodes
- **Ctrl + G**: Group selected nodes into a Tunnel
- **Ctrl + D**: Duplicate selected node
- **Delete/Backspace**: Remove selected node or edge
- **Escape**: Clear selection
- **Mouse wheel**: Zoom in/out
- **Click + drag on empty space**: Pan canvas

## Project Structure

```
aiga/
├── index.html          # Main application
├── styles.css          # Styling
└── js/
    ├── main.js         # Entry point & game loop
    ├── examples.js     # Example compositions
    ├── core/
    │   ├── constants.js  # Configuration values
    │   ├── state.js      # Global state management
    │   └── utils.js      # Utility functions
    ├── graph/
    │   ├── nodes.js      # Node creation & management
    │   ├── edges.js      # Edge connections
    │   └── packets.js    # Packet flow & processing
    ├── audio/
    │   ├── engine.js     # Web Audio setup
    │   ├── synth.js      # Sound generation
    │   └── renderer.js   # Offline audio rendering
    ├── ui/
    │   ├── canvas.js     # Canvas rendering
    │   ├── input.js      # Mouse/keyboard handling
    │   ├── panel.js      # Property panel
    │   ├── menu.js       # Context menu
    │   └── export.js     # Export dialog
    └── io/
        ├── serialization.js  # Save/load .aiga files
        ├── compiler.js       # Graph-to-events compiler
        └── encoder.js        # WAV/MIDI encoding
```

## Browser Support

Requires a modern browser with Web Audio API support:
- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

## License

MIT
