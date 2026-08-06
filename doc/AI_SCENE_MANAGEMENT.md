# AI Scene Management Implementation

## Summary

Extended the AI assistant capabilities to create, modify, and manage scenes for building complex multi-part compositions in Stochastic.

## Changes Made

### 1. New Scene Operation Types ([types.ts](src/ai/types.ts))

Added 6 new operation types for scene management:

- **`CreateSceneOperation`**: Create a new scene (optionally copying current canvas)
- **`ModifySceneOperation`**: Update scene properties (name, duration, BPM, etc.)
- **`SwitchSceneOperation`**: Switch to a different scene for editing
- **`SaveToSceneOperation`**: Save current canvas to a scene
- **`DeleteSceneOperation`**: Delete a scene
- **`AddToArrangementOperation`**: Add scene to arrangement timeline

### 2. Parser Extensions ([parser.ts](src/ai/parser.ts))

- Added parser functions for all 6 scene operation types
- Updated `summarizeOperations()` to include scene operation counts
- Scene operations support both ID-based and name-based scene references

### 3. Operations Executor ([operations.ts](src/ai/operations.ts))

- Implemented `resolveSceneId()` helper for flexible scene lookup (by ID or name)
- Added executor functions for all scene operations:
  - `applyCreateScene()`: Creates new scenes with optional canvas copy
  - `applyModifyScene()`: Updates scene properties
  - `applySwitchScene()`: Switches active editing scene
  - `applySaveToScene()`: Saves current work to scene
  - `applyDeleteScene()`: Removes scenes
  - `applyAddToArrangement()`: Adds scenes to arrangement
- Updated preview operations to describe scene changes

### 4. AI Prompts & Documentation ([prompts.ts](src/ai/prompts.ts))

Enhanced system prompt with:
- Complete documentation of scene operation syntax
- Multi-scene composition workflow guide
- Best practices for building complex pieces with scenes
- Example operations for scene management

### 5. Context Builder ([context-builder.ts](src/ai/context-builder.ts))

- Added scene information to serialized context
- Shows current scene being edited
- Lists all available scenes with metadata

## Usage Examples

### Creating a Multi-Scene Composition

The AI can now handle requests like:

**User**: "Create a song with an intro, verse, and chorus"

**AI Response** (example):
```json
{
  "explanation": "Creating three scenes for your song structure",
  "operations": [
    { "type": "create_scene", "name": "Intro" },
    { "type": "create_scene", "name": "Verse" },
    { "type": "create_scene", "name": "Chorus" },
    { "type": "switch_scene", "sceneName": "Intro" },
    { "type": "add_node", "nodeType": "source", "x": 100, "y": 200, "tempId": "src1" },
    // ... more nodes for intro ...
    { "type": "save_to_scene" },
    { "type": "switch_scene", "sceneName": "Verse" },
    // ... verse nodes ...
    { "type": "add_to_arrangement", "sceneName": "Intro", "startBeat": 0 },
    { "type": "add_to_arrangement", "sceneName": "Verse", "startBeat": 16 }
  ]
}
```

### Modifying Existing Scenes

**User**: "Make the chorus twice as long"

**AI Response**:
```json
{
  "explanation": "Doubling the duration of the chorus scene",
  "operations": [
    { "type": "modify_scene", "sceneName": "Chorus", "durationBeats": 32 }
  ]
}
```

### Building Different Sections

**User**: "Switch to the verse and add a bass line"

**AI Response**:
```json
{
  "operations": [
    { "type": "switch_scene", "sceneName": "Verse" },
    { "type": "add_node", "nodeType": "source", "x": 100, "y": 300, "tempId": "bass_src" },
    // ... bass nodes ...
  ]
}
```

## Benefits

1. **Complex Compositions**: AI can now create multi-part pieces with distinct sections
2. **Non-Destructive Editing**: Switch between scenes without losing work
3. **Arrangement Building**: AI can construct entire arrangements programmatically
4. **Flexible References**: Scene operations work with IDs, names, or partial matches
5. **Context Awareness**: AI sees which scene is being edited and all available scenes

## Technical Notes

- Scene resolution supports partial ID matching (same as nodes)
- Operations default to current scene when no scene is specified
- Scene names are case-insensitive for matching
- All scene operations integrate with existing undo/dirty state system
- Preview operations show human-readable scene change descriptions

## Testing

All changes compile without TypeScript errors. The AI can now:
- ✅ Create multiple scenes
- ✅ Switch between scenes
- ✅ Modify scene properties
- ✅ Save canvas content to scenes
- ✅ Delete scenes
- ✅ Add scenes to arrangement timeline
- ✅ Reference scenes by ID or name
