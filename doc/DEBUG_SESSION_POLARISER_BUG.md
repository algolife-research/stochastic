# Debugging Session: Polariser Not Affecting Packets After Splitter

**Date:** December 7, 2025  
**Issue:** "When a packet goes through a splitter, it doesn't seem to be affected by polariser in subsequent steps"

---

## Problem Description

User reported that packets passing through a splitter node were not being affected by polariser nodes downstream. The audio was playing (sine waves), but the polariser's wave shape, attack, and decay settings were being ignored.

### Test Composition Structure (Scene II - "Notre Histoire")

```
s2_src_a → s2_split → s2_pol1 → s2_spk1
                   → s2_p2 → s2_pol2 → s2_spk2

s2_bass_ → s2_bass_pol → s2_bass_spk
```

---

## Investigation Steps

### Step 1: Initial Hypothesis - Entanglement Sync

Initially suspected that the entanglement synchronization (`syncEntangledPayloads`) was causing cross-contamination between packets from the splitter.

**Fix attempted:** Modified `syncEntangledPayloads` to accept and exclude arriving packet IDs from sync.

**Result:** Issue persisted even with `entangled=false` on the splitter.

### Step 2: Debug Logging

Added extensive console logging throughout the packet processing chain:

1. **tick.ts** - Packet arrival logging (node ID, type, waves count)
2. **tick.ts** - Packet spawn logging (from node, waves count)
3. **tick.ts** - Speaker playback logging (waves count before audio)
4. **engine.ts** - `processPolariser` logging (props, output waves)
5. **engine.ts** - `processSplitter` logging (passthrough confirmation)
6. **audio/engine.ts** - `playNote` logging (waves received, layers created)

### Step 3: Console Output Analysis

The logs revealed a critical pattern:

```
[Arrival] Packet arrived: { nodeId: "s2_pol1", nodeType: "polariser", hasWaves: false, wavesCount: 0 }
[Spawn] Creating packet: { fromNode: "s2_pol1", ..., wavesCount: 0 }
[Speaker] Playing: { nodeId: "s2_spk1", hasWaves: false, wavesCount: 0 }
```

**Key observation:** The `[Polariser] Node props:` and `[Polariser] Output:` logs were **completely missing**!

This meant `processPolariser` was never being called, even though packets were arriving at polariser nodes.

---

## Root Cause Found

### Location: `src/core/engine.ts`, lines 28-30

```typescript
// Skip modulation edges for audio processing
if (edge.targetParam !== null) {
  return payload;
}
```

### The Bug

The condition `edge.targetParam !== null` was designed to skip processing for CV modulation edges (which have `targetParam: "cutoff"` etc.).

However:
- **Modulation edges:** `targetParam: "cutoff"` (string) → condition is `true` → skip processing ✅
- **Audio edges with explicit null:** `targetParam: null` → condition is `false` → process normally ✅
- **Audio edges loaded from JSON:** `targetParam: undefined` → condition is `true` → **SKIP PROCESSING** ❌

When edges are loaded from JSON files that don't include `targetParam`, the property is `undefined`, not `null`. Since `undefined !== null` evaluates to `true`, ALL audio edges were triggering the early return, causing `processNodeArrival` to skip all node-specific processing (polariser, filter, pitch, etc.) and return the unmodified payload.

---

## The Fix

### Changed from:
```typescript
if (edge.targetParam !== null) {
  return payload;
}
```

### To:
```typescript
if (edge.targetParam) {
  return payload;
}
```

Using a truthy check instead of strict null comparison:
- `"cutoff"` → truthy → skip (correct for modulation)
- `null` → falsy → process (correct for audio)
- `undefined` → falsy → process (correct for audio)

---

## Lessons Learned

1. **JavaScript null vs undefined:** When loading from JSON, missing properties are `undefined`, not `null`. Always use truthy/falsy checks when either is acceptable.

2. **Debug logging is essential:** The missing log lines immediately revealed that `processPolariser` wasn't being called, pointing to an issue before the switch statement.

3. **Edge cases in deserialization:** Properties that aren't in the JSON become `undefined`, which can cause subtle bugs with strict null checks.

4. **Trace the entire chain:** Following the packet from source → splitter → polariser → speaker with logging at each step quickly identified where the processing was being skipped.

---

## Files Modified

- `src/core/engine.ts` - Fixed the `edge.targetParam` check from `!== null` to truthy check

---

## Related Code Paths

```
Source emits packet
  ↓
updatePackets() in tick.ts
  ↓
Packet arrives at node (t >= 1)
  ↓
processNodeArrival(packet, node, edge) in engine.ts
  ↓
if (edge.targetParam) return early  ← BUG WAS HERE
  ↓
switch (node.type) → processPolariser(), etc.
  ↓
Return transformed payload with waves array
  ↓
Spawn new packets with processed payload
  ↓
Speaker receives packet with waves
  ↓
audioEngine.playNote() uses payload.waves for layers
```

---

## Verification

After the fix, the console logs showed:
- `[Polariser] Node props:` with correct wave, attack, decay, mix values
- `[Polariser] Output:` with `wavesCount: 1`
- `[Speaker] Playing:` with `wavesCount: 1`
- Audio played with correct waveform and envelope from polariser settings
