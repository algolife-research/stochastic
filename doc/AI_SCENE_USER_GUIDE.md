# AI Scene Management - User Guide

## Overview

The AI assistant can now create and manage **scenes** - allowing you to build complex musical compositions with multiple sections like intro, verse, chorus, bridge, etc.

## What are Scenes?

A **scene** is a self-contained musical unit with:
- Its own node graph (instruments, effects, etc.)
- Duration in beats
- Optional BPM, key, and scale overrides
- Visual settings

Think of scenes as the building blocks of your composition - each one represents a distinct section or part of your piece.

## Basic Scene Commands

### Creating Scenes

**Simple creation:**
> "Create a scene called 'Intro'"

**Create with current content:**
> "Create a new scene called 'Verse' and copy what I have on the canvas"

**Create multiple scenes:**
> "Create three scenes: Intro, Verse, and Chorus"

### Switching Between Scenes

> "Switch to the Verse scene"
> "Load the Chorus scene"
> "Go to Intro"

### Modifying Scenes

**Change duration:**
> "Make the chorus 32 beats long"

**Change properties:**
> "Set the Intro to 16 beats, 100 BPM"

**Rename:**
> "Rename Scene 1 to 'Drop'"

## Building Complex Compositions

### Multi-Part Song

> "Create a song structure with an intro (8 beats), verse (16 beats), and chorus (16 beats)"

The AI will:
1. Create three scenes
2. Build different musical content in each
3. Set appropriate durations
4. Optionally add them to the arrangement

### Variations

> "Create two variations of the current verse - one sparse and one dense"

The AI will:
1. Create two new scenes
2. Copy the current verse to both
3. Modify one to be minimal
4. Modify the other to be fuller

### Progressive Composition

> "Start with a simple intro, then build it up in the verse"

The AI will:
1. Create an Intro scene with minimal elements
2. Create a Verse scene
3. Copy the intro and add more layers
4. Set up the arrangement

## Scene Workflow Tips

### 1. Build Section by Section

Instead of:
> "Create a complete techno track"

Try:
> "Create a minimal intro with just a kick and hi-hat"

Then:
> "Create a verse scene and add a bassline and pad"

Then:
> "Create a chorus scene with everything from the verse plus a lead"

### 2. Iterate on Sections

> "Switch to the verse"
> "Add more variation to this"
> "Make it more aggressive"

### 3. Manage Your Arrangement

> "Add the Intro to the arrangement at beat 0"
> "Add the Verse after the intro"
> "Make the Chorus play twice"

## Advanced Patterns

### Parallel Development

> "Create a breakdown scene with just the bass and one pad"
> "Create a buildup scene that adds elements gradually"

### Musical Variations

> "Create Scene A with a major scale, Scene B with a minor scale"

### Different Time Signatures

> "Create a 4/4 intro and a 7/8 middle section"
> (Set different durations: 16 beats vs 14 beats)

## Working with the Arrangement

### Adding Scenes to Timeline

> "Add these scenes to the arrangement: Intro at 0, Verse at 16, Chorus at 32"

### Checking Your Arrangement

> "What scenes are in my arrangement?"

## Example Workflows

### Simple Song Structure

```
User: "I want to create a simple electronic track"
AI: Creates base scene

User: "Now create an intro (8 beats), verse (16 beats), and chorus (16 beats)"
AI: Creates three scenes with different content

User: "Switch to the verse and add a bassline"
AI: Switches to verse, adds bass nodes

User: "Switch to chorus and make it fuller"
AI: Switches to chorus, adds more layers

User: "Add all these to the arrangement in order"
AI: Adds Intro → Verse → Chorus to timeline
```

### Evolving Ambient Piece

```
User: "Create 4 scenes that evolve from simple to complex"
AI: Creates Scene 1-4 with progressive complexity

User: "Make scene 1 minimal and sparse"
AI: Builds minimal scene

User: "Switch to scene 2 and add subtle movement"
AI: Adds modulation to scene 2

User: "Scene 3 should introduce new layers"
AI: Adds new instrument layers

User: "Scene 4 is the climax - make it dense"
AI: Creates complex layered scene
```

## Tips & Best Practices

1. **Start Simple**: Build one scene at a time rather than requesting everything at once
2. **Name Clearly**: Use descriptive scene names like "Intro", "Breakdown", "Drop"
3. **Save Often**: The AI auto-saves when switching scenes
4. **Iterate**: Build a section, listen, then ask the AI to refine it
5. **Use Variations**: Create multiple versions of a section to try different ideas

## Scene Properties You Can Control

- **name**: Scene identifier
- **durationBeats**: Length in beats
- **loopCount**: How many times to repeat
- **localBpm**: Override global BPM (optional)
- **localRoot**: Override root note (optional)
- **localScale**: Override scale (optional)
- **color**: Visual color for UI

Example:
> "Set the Chorus to 32 beats, 140 BPM, E minor"

## Troubleshooting

**"I can't find my scene"**
- Ask: "What scenes do I have?"
- Scene names are case-insensitive

**"The AI isn't switching scenes"**
- Make sure the scene exists first
- Try using the exact scene name

**"My changes disappeared"**
- The AI auto-saves when switching scenes
- You may need to manually save: "Save the current canvas to this scene"

**"I want to start over on a scene"**
> "Clear all nodes from the current scene"
> or
> "Delete the Intro scene and create a new one"

## Advanced: Programmatic Arrangements

For power users, you can request complex arrangements:

> "Create a 128-beat arrangement: Intro (16), Verse 1 (16), Chorus (16), Verse 2 (16), Chorus (16), Bridge (16), Final Chorus (32)"

The AI will:
1. Create all scenes
2. Build appropriate content
3. Set durations
4. Add to arrangement timeline
5. Set up transitions
