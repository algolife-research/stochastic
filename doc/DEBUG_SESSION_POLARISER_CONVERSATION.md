# Debug Conversation: Polariser Not Affecting Packets After Splitter

**Date:** December 7, 2025

---

## Initial Report

**User:** "when a packet goes through a splitter, it doesn't seem to be affected by polariser in subsequent steps"

---

## Investigation Phase 1: Entanglement Hypothesis

**Assistant:** Deep investigation into packet processing flow in tick.ts and engine.ts. Initially thought issue was with entanglement sync causing cross-contamination between packets.

**Fix attempted:** Modified `syncEntangledPayloads` to exclude arriving packets from sync.

**User:** Confirmed issue persists even with `entangled=false`, provided new composition "Notre Histoire"

---

## Investigation Phase 2: Adding Debug Logging

**Assistant:** Added extensive debug logging to trace packet flow through splitter → polariser → speaker:

Added to `tick.ts`:
```typescript
console.log('[Arrival] Packet arrived:', {
  nodeId: node.id,
  nodeType: node.type,
  hasWaves: !!packet.payload.waves,
  wavesCount: packet.payload.waves?.length ?? 0
});
```

```typescript
console.log('[Spawn] Creating packet:', {
  fromNode: node.id,
  toEdge: outEdge.id,
  hasWaves: !!processedPayload.waves,
  wavesCount: processedPayload.waves?.length ?? 0
});
```

```typescript
console.log('[Speaker] Playing:', {
  nodeId: node.id,
  hasWaves: !!finalPayload.waves,
  wavesCount: finalPayload.waves?.length ?? 0,
  waves: finalPayload.waves,
  wave: finalPayload.wave,
  freq: finalPayload.freq
});
```

Added to `engine.ts`:
```typescript
// In processPolariser
console.log('[Polariser] Node props:', { 
  nodeId: node.id, 
  wave: props.wave, 
  attack: props.attack, 
  decay: props.decay,
  mix: props.mix,
  rawProps: node.props 
});

console.log('[Polariser] Output:', { 
  nodeId: node.id,
  wavesCount: result.waves.length,
  waves: result.waves
});
```

```typescript
// In processSplitter
console.log('[Splitter] Pass-through:', {
  nodeId: node.id,
  hasWaves: !!payload.waves,
  wavesCount: payload.waves?.length ?? 0
});
```

Added to `audio/engine.ts`:
```typescript
console.log('[AudioEngine] playNote received:', {
  hasWaves: !!payload.waves,
  wavesLength: payload.waves?.length,
  layersCreated: layers?.length,
  layers,
  wave: payload.wave
});
```

---

## Investigation Phase 3: Console Output Analysis

**User provided console output:**

```
[loadSceneToCanvas] Scene scene-2-danse has 10 nodes, 8 edges
[updateSources] Found 2 source nodes: s2_src_a, s2_bass_
[Arrival] Packet arrived: { nodeId: "s2_bass_pol", nodeType: "polariser", hasWaves: false, wavesCount: 0 }
[Spawn] Creating packet: { fromNode: "s2_bass_pol", toEdge: "s2_e8", hasWaves: false, wavesCount: 0 }
[Arrival] Packet arrived: { nodeId: "s2_bass_spk", nodeType: "speaker", hasWaves: false, wavesCount: 0 }
[Speaker] Playing: { nodeId: "s2_bass_spk", hasWaves: false, wavesCount: 0, waves: undefined, wave: "sine" }
[AudioEngine] playNote received: { hasWaves: false, wavesLength: undefined, layersCreated: undefined }
[Arrival] Packet arrived: { nodeId: "s2_split", nodeType: "splitter", hasWaves: false, wavesCount: 0 }
[Spawn] Creating packet: { fromNode: "s2_split", toEdge: "s2_e2", hasWaves: false, wavesCount: 0 }
[Spawn] Creating packet: { fromNode: "s2_split", toEdge: "s2_e4", hasWaves: false, wavesCount: 0 }
[Arrival] Packet arrived: { nodeId: "s2_pol1", nodeType: "polariser", hasWaves: false, wavesCount: 0 }
[Spawn] Creating packet: { fromNode: "s2_pol1", toEdge: "s2_e3", hasWaves: false, wavesCount: 0 }
[Arrival] Packet arrived: { nodeId: "s2_spk1", nodeType: "speaker", hasWaves: false, wavesCount: 0 }
[Speaker] Playing: { nodeId: "s2_spk1", hasWaves: false, wavesCount: 0, waves: undefined, wave: "sine" }
```

**Assistant's key observation:**

> This is very revealing! I notice the `[Polariser] Node props:` and `[Polariser] Output:` logs are **completely missing** from the console output. The polariser nodes are being arrived at (`[Arrival] Packet arrived: nodeId: "s2_pol1", nodeType: "polariser"`), but `processPolariser` is never being called!

---

## Root Cause Discovery

**Assistant:** Examined `processNodeArrival` function in engine.ts:

```typescript
export function processNodeArrival(
  packet: Packet, 
  node: GraphNode, 
  edge: GraphEdge
): AudioPayload {
  const payload = { ...packet.payload };
  
  // Skip modulation edges for audio processing
  if (edge.targetParam !== null) {  // ← THE BUG
    return payload;
  }
  
  switch (node.type) {
    case 'polariser':
      return processPolariser(payload, node);
    // ...
  }
}
```

**The Bug Explained:**

The condition `edge.targetParam !== null` was designed to skip processing for CV modulation edges.

However:
- **Modulation edges:** `targetParam: "cutoff"` → `!== null` is `true` → skip ✅
- **Audio edges (explicit null):** `targetParam: null` → `!== null` is `false` → process ✅  
- **Audio edges (from JSON):** `targetParam: undefined` → `!== null` is `true` → **SKIP** ❌

When edges are loaded from JSON without a `targetParam` property, it's `undefined`, not `null`. Since `undefined !== null` is `true`, ALL audio edges were skipping processing!

---

## The Fix

**Assistant applied fix:**

```typescript
// Changed from:
if (edge.targetParam !== null) {
  return payload;
}

// To:
if (edge.targetParam) {
  return payload;
}
```

Using a truthy check:
- `"cutoff"` → truthy → skip (correct for modulation)
- `null` → falsy → process (correct for audio)
- `undefined` → falsy → process (correct for audio)

---

## Resolution

**User:** "perfect. you can remove debug prints."

**Assistant:** Removed all debug logging from:
- `src/core/tick.ts`
- `src/core/engine.ts`
- `src/audio/engine.ts`

**User:** "save this debugging session conversation to a file as it was very informative"

**Assistant:** Created `doc/DEBUG_SESSION_POLARISER_BUG.md` with structured summary.

**User:** "save the conversation itself as well"

**Assistant:** Created this file with the full conversation flow.

---

## Key Lessons

1. **JavaScript null vs undefined:** Missing JSON properties are `undefined`, not `null`. Use truthy/falsy checks when either is acceptable.

2. **Strategic debug logging:** Placing logs at key checkpoints immediately revealed that `processPolariser` wasn't being called.

3. **Read the logs carefully:** The ABSENCE of expected logs (`[Polariser]`) was the key clue, not the presence of error logs.

4. **Trace the full path:** Following packets through the entire chain (source → splitter → polariser → speaker) with logging at each step pinpointed exactly where processing was skipped.

---

## Files Changed

- `src/core/engine.ts` - Fixed `edge.targetParam !== null` to `edge.targetParam` (truthy check)
