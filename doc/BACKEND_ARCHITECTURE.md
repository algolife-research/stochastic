# Stochastic Backend Architecture

This document covers the Tauri/Rust backend and file I/O systems of Stochastic.

## Directory Structure

```
src-tauri/
├── src/
│   └── main.rs     # Rust entry point, Tauri commands
├── tauri.conf.json # Tauri configuration
├── Cargo.toml      # Rust dependencies
├── build.rs        # Build script
└── icons/          # Application icons
```

---

## 1. Tauri Integration

Stochastic uses [Tauri](https://tauri.app/) as its desktop runtime, providing native capabilities while keeping the core application in TypeScript/React.

### Why Tauri?

| Feature | Benefit |
|---------|---------|
| **Small bundle size** | ~10MB vs 150MB+ for Electron |
| **Native file dialogs** | OS-native open/save dialogs |
| **Direct filesystem access** | No sandboxing limitations |
| **Cross-platform** | Windows, macOS, Linux from single codebase |
| **Security** | Rust backend, configurable permissions |

### Tauri APIs Used

```typescript
// File dialogs
import { open, save } from '@tauri-apps/api/dialog';

// Filesystem operations
import { readTextFile, writeTextFile, readDir, createDir } from '@tauri-apps/api/fs';

// Path utilities
import { appDataDir, join } from '@tauri-apps/api/path';
```

---

## 2. Rust Backend

Location: `src-tauri/src/main.rs`

The Rust backend is minimal - Stochastic primarily uses Tauri's built-in APIs rather than custom Rust commands.

### Entry Point

```rust
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Potential Extensions

Future Rust commands could include:
- Audio file encoding (WAV/MP3)
- MIDI device enumeration
- System audio routing
- Performance-critical computations

---

## 3. File System Layer

Location: `src/io/filesystem.ts`

The filesystem module provides a unified interface that works in both Tauri (desktop) and browser environments.

### Platform Detection

```typescript
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
```

### API Abstraction

| Function | Tauri | Browser |
|----------|-------|---------|
| `openFile()` | Native dialog + readTextFile | `<input type="file">` |
| `saveFile()` | Native dialog + writeTextFile | Blob download |
| `listDirectory()` | readDir | Not supported |
| `createDirectory()` | createDir | Not supported |

### Project Mode

When running in Tauri, Stochastic supports "Project Mode" where compositions are stored in a dedicated folder:

```
MyProject/
├── project.json        # Project metadata
├── Main.phono          # Composition files
├── Variation A.phono
└── assets/             # Future: audio samples
```

---

## 4. File I/O

Location: `src/io/file-io.ts`

### Save/Load Functions

| Function | Purpose |
|----------|---------|
| `serializeComposition()` | Convert store state to JSON |
| `deserializeComposition()` | Parse JSON and populate store |
| `saveToFile()` | Write composition to disk |
| `loadFromFile()` | Read and parse composition |

### Version Migration

The loader handles legacy file formats:

```typescript
function migrateV2ToV3(data: LegacyFormat): V3Format {
  // Convert flat graph to scene-based structure
  return {
    meta: { version: '3.0.0', ...data.meta },
    global: data.global,
    scenes: [{
      id: 'scene-1',
      name: 'Main',
      nodes: data.graph.nodes,
      edges: data.graph.edges,
      // ... default scene properties
    }],
    arrangement: [{ id: 'slot-1', sceneId: 'scene-1', startBeat: 0 }],
    channels: [{ id: 'channel-0', name: 'Track 1', ... }]
  };
}
```

---

## 5. Export Systems

### Audio Export

Location: `src/io/compiler.ts`

The offline compiler simulates the graph without real-time constraints:

1. Initialize virtual graph state
2. Step through time at high resolution
3. Collect audio events (note on/off, parameters)
4. Encode to WAV using Web Audio OfflineAudioContext

```typescript
async function exportToWav(composition: Composition): Promise<Blob> {
  const events = compileArrangement(composition);
  const audioContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
  // Render events to audio buffer
  const buffer = await audioContext.startRendering();
  return encodeWav(buffer);
}
```

### MIDI Export

Location: `src/io/midi.ts`

Converts audio events to Standard MIDI File format:

```typescript
function exportToMidi(events: AudioEvent[]): Uint8Array {
  const midi = new MidiWriter();
  for (const event of events) {
    midi.addNote(event.channel, event.note, event.velocity, event.time, event.duration);
  }
  return midi.toBytes();
}
```

### Video Export

Location: `src/io/video-compiler.ts`

Generates frame-by-frame visualization for video encoding:

1. Compile visualization frames (positions, colors, effects)
2. Render each frame to canvas
3. Capture as image sequence or use MediaRecorder API

---

## 6. Configuration

### Tauri Config

Location: `src-tauri/tauri.conf.json`

Key settings:

```json
{
  "build": {
    "distDir": "../dist",
    "devPath": "http://localhost:1420"
  },
  "tauri": {
    "allowlist": {
      "fs": {
        "all": true,
        "scope": ["$APP/*", "$DOCUMENT/*"]
      },
      "dialog": { "all": true },
      "path": { "all": true }
    },
    "bundle": {
      "identifier": "com.Stochastic.app",
      "icon": ["icons/icon.png"]
    },
    "windows": [{
      "title": "Stochastic",
      "width": 1400,
      "height": 900,
      "resizable": true
    }]
  }
}
```

### Security Scope

File system access is scoped to:
- `$APP/*` - Application data directory
- `$DOCUMENT/*` - User's documents folder

This prevents the app from accessing arbitrary system files.

---

## 7. Build & Distribution

### Development

```bash
# Start Vite dev server + Tauri
npm run tauri dev
```

### Production Build

```bash
# Build for current platform
npm run tauri build

# Output locations:
# Windows: src-tauri/target/release/bundle/msi/
# macOS: src-tauri/target/release/bundle/dmg/
# Linux: src-tauri/target/release/bundle/appimage/
```

### Cross-Platform Notes

| Platform | Format | Notes |
|----------|--------|-------|
| Windows | MSI, EXE | Requires Windows SDK for MSI |
| macOS | DMG, APP | Requires Xcode CLI tools |
| Linux | AppImage, DEB | Most portable is AppImage |

---

## Future Backend Enhancements

Potential Rust-side features:

1. **Native audio encoding** - Faster WAV/MP3 export using Rust audio libraries
2. **MIDI device access** - Real-time MIDI input/output via `midir` crate
3. **Plugin hosting** - VST/AU plugin support via `vst` crate
4. **Auto-update** - Tauri's built-in updater for seamless updates
5. **Cloud sync** - Backend API integration for composition sharing
