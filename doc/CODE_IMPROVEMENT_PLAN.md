


## Phase 2: Type Safety & Auth Readiness (P1)

### 2.2 Create Feature Gate Infrastructure

**Problem:** No infrastructure exists for auth-gated features.

**New File:** `src/core/feature-gate.ts`

```typescript
// src/core/feature-gate.ts

export type Feature = 
  | 'ai_generation'
  | 'ai_generation_advanced'
  | 'export_4k'
  | 'export_8k'
  | 'unlimited_scenes'
  | 'multi_channel'
  | 'api_access';

export type LicenseTier = 'free' | 'pro' | 'enterprise';

export interface FeatureRequirement {
  minTier: LicenseTier;
  creditCost: number;
  description: string;
}

export interface FeatureCheckResult {
  allowed: boolean;
  reason?: 'not_authenticated' | 'insufficient_tier' | 'insufficient_credits';
  requiredTier?: LicenseTier;
  creditCost?: number;
}

export const FEATURE_REQUIREMENTS: Record<Feature, FeatureRequirement> = {
  'ai_generation': { 
    minTier: 'free', 
    creditCost: 5,
    description: 'Basic AI scene generation'
  },
  'ai_generation_advanced': { 
    minTier: 'pro', 
    creditCost: 15,
    description: 'Advanced AI generation with complex prompts'
  },
  'export_4k': { 
    minTier: 'pro', 
    creditCost: 2,
    description: '4K video export (per minute)'
  },
  'export_8k': { 
    minTier: 'enterprise', 
    creditCost: 5,
    description: '8K video export (per minute)'
  },
  'unlimited_scenes': { 
    minTier: 'pro', 
    creditCost: 0,
    description: 'Unlimited scenes per composition'
  },
  'multi_channel': { 
    minTier: 'pro', 
    creditCost: 0,
    description: 'Multi-channel arrangement'
  },
  'api_access': { 
    minTier: 'enterprise', 
    creditCost: 0,
    description: 'Programmatic API access'
  },
};

// Tier hierarchy for comparison
const TIER_LEVELS: Record<LicenseTier, number> = {
  'free': 0,
  'pro': 1,
  'enterprise': 2,
};

/**
 * Check if a feature can be used.
 * Currently returns allowed: true for all features (pre-auth).
 * Will integrate with auth store when implemented.
 */
export async function canUseFeature(feature: Feature): Promise<FeatureCheckResult> {
  const requirement = FEATURE_REQUIREMENTS[feature];
  
  // TODO: Replace with actual auth check when auth system is implemented
  // const authStore = getAuthStore();
  // if (!authStore.isAuthenticated) {
  //   return { allowed: false, reason: 'not_authenticated' };
  // }
  // const userTier = authStore.license?.tier ?? 'free';
  // if (TIER_LEVELS[userTier] < TIER_LEVELS[requirement.minTier]) {
  //   return { allowed: false, reason: 'insufficient_tier', requiredTier: requirement.minTier };
  // }
  // if (requirement.creditCost > 0 && authStore.credits.balance < requirement.creditCost) {
  //   return { allowed: false, reason: 'insufficient_credits', creditCost: requirement.creditCost };
  // }
  
  // Pre-auth: allow all features
  return { allowed: true };
}

/**
 * Consume credits for a feature (no-op until auth implemented)
 */
export async function consumeFeature(feature: Feature): Promise<{
  success: boolean;
  remainingCredits: number;
}> {
  // TODO: Implement credit deduction when auth system is ready
  return { success: true, remainingCredits: Infinity };
}

/**
 * Get human-readable feature requirement description
 */
export function getFeatureRequirementText(feature: Feature): string {
  const req = FEATURE_REQUIREMENTS[feature];
  if (req.minTier === 'free' && req.creditCost === 0) {
    return 'Available to all users';
  }
  if (req.creditCost > 0) {
    return `Requires ${req.minTier} tier (${req.creditCost} credits)`;
  }
  return `Requires ${req.minTier} tier`;
}
```

**Integration Points:**

```typescript
// Example usage in ExportModal.tsx
import { canUseFeature, getFeatureRequirementText } from '@core/feature-gate';

const handle4KExport = async () => {
  const check = await canUseFeature('export_4k');
  if (!check.allowed) {
    showUpgradeModal(check.reason, check.requiredTier);
    return;
  }
  // Proceed with export
};
```

**Acceptance Criteria:**
- [ ] Feature gate module created
- [ ] All feature requirements defined per USER_AUTH_SYSTEM.md
- [ ] Export modal checks feature permissions
- [ ] Upgrade prompts show when features unavailable (future)

---

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


## Testing Strategy

### Unit Tests (Add as part of refactoring)

```
tests/
├── core/
│   ├── store/
│   │   ├── node-actions.test.ts
│   │   ├── edge-actions.test.ts
│   │   └── scene-actions.test.ts
│   ├── type-guards.test.ts
│   ├── feature-gate.test.ts
│   └── utils.test.ts
└── io/
    └── file-io.test.ts
```

### Integration Tests

- [ ] File save/load round-trip
- [ ] Scene creation and switching
- [ ] Multi-channel arrangement playback
- [ ] Export with various settings

### Manual Testing Checklist

- [ ] Create new composition
- [ ] Add nodes of each type
- [ ] Create and switch scenes
- [ ] Export video at different resolutions
- [ ] Load v2 format files
- [ ] Load v3 format files

---

## Appendix: File Change Summary

| File | Changes | Priority |
|------|---------|----------|
| `src/ui/ExportModal.tsx` | Fix BPM | P0 |
| `src/io/video-compiler.ts` | Fix BPM | P0 |
| `src/viz/data-extractor.ts` | Audio hook | P0 |
| `src/audio/engine.ts` | Add getActiveVoices | P0 |
| `src/core/types.ts` | Add ErrorState, extend ProjectMeta | P1 |
| `src/core/type-guards.ts` | NEW FILE | P1 |
| `src/core/feature-gate.ts` | NEW FILE | P1 |
| `src/core/store.ts` | Split into modules | P2 |
| `src/core/tick.ts` | Split into modules | P2 |
| `src/ui/PropertyPanel.tsx` | Split into modules | P2 |
| `src/core/utils.ts` | NEW FILE | P2 |
| All files | JSDoc, naming | P3 |

---

*Document maintained by: Development Team*  
*Last Updated: 2025-12-09*
