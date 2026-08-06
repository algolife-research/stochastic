

### 2.3 Extend ProjectMeta for Auth Integration

**Problem:** ProjectMeta lacks user association fields.

**Implementation:**

```typescript
// Update in src/core/types.ts
export interface ProjectMeta {
  // Existing fields
  readonly name: string;
  readonly author: string;
  readonly created: number;
  readonly modified: number;
  readonly version: string;
  readonly rootNote: number;
  readonly scale: ScaleName;
  readonly gravity: number;
  readonly midiOutputId: string | null;
  readonly midiClock: boolean;
  
  // New auth-related fields (optional until auth implemented)
  readonly ownerId?: string;              // User UUID
  readonly ownerEmail?: string;           // For display (cached)
  readonly collaboratorIds?: string[];    // Future team support
  readonly visibility?: 'private' | 'unlisted' | 'public';
  readonly licenseRequired?: LicenseTier; // Min tier to open
  readonly lastSyncedAt?: number;         // Cloud sync timestamp
}
```

```typescript
// Update file-io.ts serialization
export interface SerializedMeta {
  // Existing...
  ownerId?: string;
  visibility?: string;
  licenseRequired?: string;
}
```

**Acceptance Criteria:**
- [ ] ProjectMeta types updated
- [ ] Serialization handles new optional fields
- [ ] Backward compatibility maintained (fields optional)

---

## Phase 4: 
---

### 4.3 Add Performance Optimizations

**4.3.1 Optimize Store Selections**

```typescript
// Before (causes re-render on any selection change)
const selection = useGraphStore(state => state.selection);

// After (only re-renders when specific value changes)
const selectedNodeIds = useGraphStore(state => state.selection.selectedNodeIds);
const hoveredNodeId = useGraphStore(state => state.selection.hoveredNodeId);
```

**Files to Update:**
- `src/ui/App.tsx`
- `src/ui/PropertyPanel.tsx`
- `src/ui/ScenePanel.tsx`
- `src/canvas/renderer.ts`

**4.3.2 Add Entanglement Index**

```typescript
// Add to tick state
const entanglementIndex: Map<string, Set<PacketId>> = new Map();

// Update when packets created/destroyed
function registerEntangledPacket(packetId: PacketId, groupId: string) {
  if (!entanglementIndex.has(groupId)) {
    entanglementIndex.set(groupId, new Set());
  }
  entanglementIndex.get(groupId)!.add(packetId);
}

// Use for efficient sync
function syncEntangledPayloads(groupId: string, payload: AudioPayload) {
  const packetIds = entanglementIndex.get(groupId);
  if (!packetIds) return;
  
  for (const id of packetIds) {
    // Direct access instead of iterating all packets
  }
}
```

---
