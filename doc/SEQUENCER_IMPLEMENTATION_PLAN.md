# Sequencer Implementation Plan (Revised)

> **Status:** Revised approach — UI abstraction over existing node patterns  
> **Last Updated:** 2025-01-09

---

## Key Insight: The Pattern Already Exists

Looking at the **Pachelbel's Canon in D** example (`examples.ts`), we see that **melodic sequences are already fully expressible** using existing nodes:

```
Source (interval: 16) → Splitter ─┬─→ Pitch(D) ─────────────────→ Tunnel → Speaker
                                  ├─→ Delay(2) → Pitch(A) ───────→ Tunnel → Speaker
                                  ├─→ Delay(4) → Pitch(B) ───────→ Tunnel → Speaker
                                  ├─→ Delay(6) → Pitch(F#) ──────→ Tunnel → Speaker
                                  └─→ ... (8 notes total)
```

**The model is complete.** What we need is **not a new node type**, but a **UI layer** that:
1. Makes this pattern easier to create
2. Provides a compact visual representation
3. Generates the underlying nodes automatically

---

## Philosophy: UI Abstraction, Not Engine Abstraction

| Aspect | Old Approach | **Revised Approach** |
|--------|--------------|----------------------|
| Model change | New `sequencer` NodeType | **None — use existing nodes** |
| Data storage | New `SequencerProps` type | **Region metadata + generated nodes** |
| Processing | New packet expansion logic | **Existing splitter/delay/pitch** |
| Complexity | Engine changes, new tests | **UI only — zero engine risk** |

### Why This is Better

1. **Zero engine changes** — No risk of breaking audio/timing
2. **Backward compatible** — Old files work, sequences are just node graphs
3. **Transparent** — Users can "ungroup" to see/edit individual nodes
4. **Proven** — Canon in D already demonstrates it works perfectly
5. **Flexible** — Can insert nodes mid-sequence (filters, gates, etc.)

---

## 1. Architecture: Sequence as a "Smart Region"

### 1.1 What is a Sequence?

A **Sequence** is a **Region** with special metadata that:
- Contains a specific pattern of nodes (splitter → delays → pitches)
- Has a simplified UI for editing steps
- Auto-regenerates nodes when steps change

```typescript
// A sequence IS a region with extra metadata
interface SequenceMetadata {
  type: 'sequence';
  pattern: SequencePattern;
  entryNodeId: NodeId;        // The splitter
  exitNodeIds: NodeId[];      // Output of each step's final node
  autoLayout: boolean;        // Keep nodes auto-arranged
}

interface SequencePattern {
  name: string;
  steps: SequenceStep[];
  length: number;             // Pattern length in beats
  pitchMode: 'relative' | 'absolute';
}

interface SequenceStep {
  time: number;               // Beats from start (maps to DelayProps.delayTime)
  pitch: number;              // Semitones offset (maps to PitchProps.shift)
  velocity: number;           // 0-1 (maps to GainProps.value)
  duration?: number;          // Note length in beats (optional)
}
```

### 1.2 How It Maps to Real Nodes

A 3-step sequence generates these **real nodes** inside the region:

```
User sees (collapsed):              Actually exists inside region:
┌─────────────────────┐             ┌────────────────────────────────────────────┐
│  ♪ Arpeggio         │             │  ┌─────────┐                              │
│  ● ● ●              │     ==>     │  │Splitter │─┬─→ [Pitch +0] ─────────→ ●  │
│  0  4  7 semitones  │             │  └─────────┘ ├─→ [Delay 0.5]→[Pitch +4]→ ● │
└─────────────────────┘             │              └─→ [Delay 1.0]→[Pitch +7]→ ● │
                                    └────────────────────────────────────────────┘
```

The **entry point** is the splitter, and **exit points** are the outputs of each pitch node.

### 1.3 Region Metadata Extension

Extend the existing `Region` type to support sequence metadata:

```typescript
// In src/core/types.ts

export interface Region {
  readonly id: RegionId;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  description: string;
  color: string;
  
  // NEW: Optional structured metadata
  metadata?: RegionMetadata;
}

export type RegionMetadata = 
  | SequenceMetadata
  | { type: 'group' }           // Simple grouping (existing behavior)
  | { type: 'custom'; data: unknown };  // Future extensibility
```

### 1.4 Visual Comparison

```
TUNNEL:                           SEQUENCE (Region):
┌──────────────────────┐          ┌──────────────────────┐
│ polariser → filter   │          │ Splitter ─┬─→ Pitch  │
│   → harmonic         │          │           ├─→ Delay→Pitch
│                      │          │           └─→ Delay→Pitch
└──────────────────────┘          └──────────────────────┘
   ↓                                 ↓
 1 packet in → 1 packet out        1 packet in → N packets out
 (serial transform)                (parallel expansion via splitter)
```

---

## 2. Node Generation Algorithm

### 2.1 Core Generation Function

When a sequence is created or edited, we generate the underlying nodes:

```typescript
// src/core/sequence-generator.ts

interface GeneratedSequence {
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryNodeId: NodeId;
  exitNodeIds: NodeId[];
  boundingBox: { width: number; height: number };
}

function generateSequenceNodes(
  pattern: SequencePattern,
  origin: { x: number; y: number }
): GeneratedSequence {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const exitNodeIds: NodeId[] = [];
  
  // 1. Create splitter as entry point
  const splitterId = createNodeId();
  const stepCount = pattern.steps.length;
  nodes.push({
    id: splitterId,
    type: 'splitter',
    x: origin.x,
    y: origin.y + (stepCount * 30) / 2,  // Vertically centered
    props: { entangled: false, behavior: 'broadcast' },
    timer: 0, lastTrigger: 0, flash: 0, heldPackets: [],
  });
  
  // 2. Create chain for each step
  const stepSpacing = 60;   // Vertical space between steps
  const nodeSpacing = 100;  // Horizontal space between nodes
  
  pattern.steps.forEach((step, index) => {
    const stepY = origin.y + index * stepSpacing;
    let prevNodeId = splitterId;
    let currentX = origin.x + nodeSpacing;
    
    // Add delay node if time > 0
    if (step.time > 0) {
      const delayId = createNodeId();
      nodes.push({
        id: delayId,
        type: 'delay',
        x: currentX,
        y: stepY,
        props: { delayTime: step.time },
        timer: 0, lastTrigger: 0, flash: 0, heldPackets: [],
      });
      edges.push(createEdge(prevNodeId, delayId));
      prevNodeId = delayId;
      currentX += nodeSpacing;
    }
    
    // Add pitch node
    const pitchId = createNodeId();
    const pitchProps = pattern.pitchMode === 'relative'
      ? { mode: 'shift' as const, shift: step.pitch, fixedMidiNote: 60 }
      : { mode: 'set' as const, shift: 0, fixedMidiNote: step.pitch };
    
    nodes.push({
      id: pitchId,
      type: 'pitch',
      x: currentX,
      y: stepY,
      props: pitchProps,
      timer: 0, lastTrigger: 0, flash: 0, heldPackets: [],
    });
    edges.push(createEdge(prevNodeId, pitchId));
    prevNodeId = pitchId;
    currentX += nodeSpacing;
    
    // Add gain node if velocity != 1.0
    if (step.velocity !== 1.0) {
      const gainId = createNodeId();
      nodes.push({
        id: gainId,
        type: 'gain',
        x: currentX,
        y: stepY,
        props: { value: step.velocity, mass: 1.0 },
        timer: 0, lastTrigger: 0, flash: 0, heldPackets: [],
      });
      edges.push(createEdge(prevNodeId, gainId));
      prevNodeId = gainId;
    }
    
    exitNodeIds.push(prevNodeId);
  });
  
  return {
    nodes,
    edges,
    entryNodeId: splitterId,
    exitNodeIds,
    boundingBox: {
      width: nodeSpacing * 4,
      height: stepSpacing * pattern.steps.length,
    },
  };
}

function createEdge(from: NodeId, to: NodeId): GraphEdge {
  return {
    id: createEdgeId(),
    from, to,
    timingMode: 'instant',
    durationBeats: 0,
    targetParam: null,
  };
}
```

### 2.2 Equivalence Proof

A sequence with these steps:
```typescript
steps: [
  { time: 0,   pitch: 0,  velocity: 1.0 },
  { time: 0.5, pitch: 4,  velocity: 0.8 },
  { time: 1.0, pitch: 7,  velocity: 0.9 },
]
```

Generates this graph (which is equivalent to the Canon in D pattern):
```
         ┌→ Pitch(+0) → ────────────────────────────────┐
Splitter ├→ Delay(0.5) → Pitch(+4) → Gain(0.8) →────────┼→ (outputs)
         └→ Delay(1.0) → Pitch(+7) → Gain(0.9) →────────┘
```

### 2.3 Regeneration on Edit

When user edits a step, regenerate nodes inside the region:

```typescript
function updateSequencePattern(
  regionId: RegionId,
  newPattern: SequencePattern
): void {
  const store = getGraphStore();
  const region = store.getRegion(regionId);
  const meta = region?.metadata as SequenceMetadata | undefined;
  
  if (!meta || meta.type !== 'sequence') return;
  
  // 1. Delete old nodes inside region (preserve external connections)
  const externalEdges = getExternalEdges(region, meta);
  const oldNodeIds = getNodesInRegion(region);
  oldNodeIds.forEach(id => store.deleteNode(id));
  
  // 2. Generate new nodes
  const generated = generateSequenceNodes(newPattern, { 
    x: region.x + 20, 
    y: region.y + 40 
  });
  
  // 3. Add new nodes to graph
  generated.nodes.forEach(node => store.addNode(node));
  generated.edges.forEach(edge => store.addEdge(edge));
  
  // 4. Reconnect external edges
  reconnectExternalEdges(externalEdges, meta, generated);
  
  // 5. Update region metadata
  store.updateRegion(regionId, {
    metadata: {
      ...meta,
      pattern: newPattern,
      entryNodeId: generated.entryNodeId,
      exitNodeIds: generated.exitNodeIds,
    }
  });
  
  // 6. Resize region to fit new content
  store.resizeRegionToFit(regionId);
}
```

---

## 3. User Workflow

### 3.1 Creating a Sequence

**Option A: From Context Menu**
```
Right-click canvas → "Create Sequence"
→ Opens sequence editor dialog
→ Define steps (or pick preset)
→ Click "Create"
→ Region with generated nodes appears on canvas
```

**Option B: From Existing Nodes (selection)**
```
Select: Splitter → multiple Delay/Pitch chains
Right-click → "Convert to Sequence"
→ System analyzes structure
→ Wraps in region with sequence metadata
```

**Option C: Quick preset from toolbar**
```
Toolbar → Sequence dropdown → "Arpeggio - Major Triad"
→ Pre-configured sequence placed at cursor
```

### 3.2 Editing a Sequence

When a sequence region is selected, the Property Panel shows:

```
┌─────────────────────────────────────────────────┐
│ SEQUENCE: Arpeggio                              │
├─────────────────────────────────────────────────┤
│ [Step List]  [Grid View]  [Node View]           │
├─────────────────────────────────────────────────┤
│ Steps:                                 [+ Add]  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 1. t=0    p=0   v=1.0  ████████████  [×]   │ │
│ │ 2. t=0.5  p=+4  v=0.8  ██████████    [×]   │ │
│ │ 3. t=1.0  p=+7  v=0.9  ███████████   [×]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Length: [2] beats   Pitch: [Relative ▼]         │
├─────────────────────────────────────────────────┤
│ [Presets ▼]        [Ungroup] [Regenerate]       │
└─────────────────────────────────────────────────┘
```

**Actions:**
- **Edit step** → Updates metadata → Regenerates nodes inside region
- **Ungroup** → Removes metadata, leaves nodes as regular region
- **Node View** → Shows actual nodes (for debugging/learning)

### 3.3 Connecting Sequences

```
Source ─→ [● Entry] ── [Sequence Region] ── [● Exits] ─→ Tunnel ─→ Speaker
```

The sequence region has:
- **One input handle** (routes to internal splitter)
- **Multiple output handles** (one per step, from final nodes)
- Or **one merged output** (all steps converge)

---

## 4. UI Components

### 4.1 Sequence Editor (Property Panel)

```typescript
// src/ui/SequenceEditor.tsx

interface SequenceEditorProps {
  region: Region;
  pattern: SequencePattern;
  onChange: (pattern: SequencePattern) => void;
}

function SequenceEditor({ region, pattern, onChange }: SequenceEditorProps) {
  const [view, setView] = useState<'steps' | 'grid' | 'nodes'>('steps');
  
  return (
    <div className={styles.sequenceEditor}>
      <input 
        value={pattern.name}
        onChange={(e) => onChange({ ...pattern, name: e.target.value })}
      />
      
      <div className={styles.viewTabs}>
        <button onClick={() => setView('steps')}>Steps</button>
        <button onClick={() => setView('grid')}>Grid</button>
        <button onClick={() => setView('nodes')}>Nodes</button>
      </div>
      
      {view === 'steps' && <StepListView pattern={pattern} onChange={onChange} />}
      {view === 'grid' && <GridView pattern={pattern} onChange={onChange} />}
      {view === 'nodes' && <NodePreview regionId={region.id} />}
      
      <div className={styles.actions}>
        <PresetSelector onSelect={(preset) => onChange(preset.pattern)} />
        <button onClick={() => ungroupSequence(region.id)}>Ungroup</button>
      </div>
    </div>
  );
}
```

### 4.2 Step List View

Similar to Tunnel's subnode list:

```typescript
function StepListView({ pattern, onChange }: ViewProps) {
  const addStep = () => {
    const lastStep = pattern.steps[pattern.steps.length - 1];
    const newStep: SequenceStep = {
      time: (lastStep?.time ?? 0) + 0.5,
      pitch: 0,
      velocity: 1.0,
    };
    onChange({ ...pattern, steps: [...pattern.steps, newStep] });
  };
  
  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    const newSteps = [...pattern.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onChange({ ...pattern, steps: newSteps });
  };
  
  const removeStep = (index: number) => {
    onChange({ ...pattern, steps: pattern.steps.filter((_, i) => i !== index) });
  };
  
  return (
    <div className={styles.stepList}>
      {pattern.steps.map((step, i) => (
        <div key={i} className={styles.step}>
          <label>Time:</label>
          <input 
            type="number" 
            value={step.time} 
            step={0.25}
            onChange={(e) => updateStep(i, { time: parseFloat(e.target.value) })}
          />
          
          <label>Pitch:</label>
          <input 
            type="number" 
            value={step.pitch}
            onChange={(e) => updateStep(i, { pitch: parseInt(e.target.value) })}
          />
          <span className={styles.hint}>
            {step.pitch > 0 ? `+${step.pitch}` : step.pitch} semitones
          </span>
          
          <label>Velocity:</label>
          <input 
            type="range" 
            min={0} max={1} step={0.1}
            value={step.velocity}
            onChange={(e) => updateStep(i, { velocity: parseFloat(e.target.value) })}
          />
          
          <button onClick={() => removeStep(i)}>×</button>
        </div>
      ))}
      <button onClick={addStep}>+ Add Step</button>
    </div>
  );
}
```

### 4.3 Grid View (Mini Piano Roll)

For visual editing:

```typescript
function GridView({ pattern, onChange }: ViewProps) {
  const gridWidth = Math.ceil(pattern.length * 4);  // 4 columns per beat
  const pitchRange = { min: -12, max: 12 };
  
  const toggleStep = (time: number, pitch: number) => {
    const existing = pattern.steps.find(
      s => Math.abs(s.time - time) < 0.125 && s.pitch === pitch
    );
    
    if (existing) {
      // Remove step
      onChange({
        ...pattern,
        steps: pattern.steps.filter(s => s !== existing),
      });
    } else {
      // Add step
      onChange({
        ...pattern,
        steps: [...pattern.steps, { time, pitch, velocity: 0.8 }],
      });
    }
  };
  
  return (
    <div className={styles.grid}>
      {/* Y-axis: relative pitch labels */}
      <div className={styles.pitchLabels}>
        {Array.from({ length: pitchRange.max - pitchRange.min + 1 }, (_, i) => {
          const pitch = pitchRange.max - i;
          return <div key={pitch}>{pitch > 0 ? `+${pitch}` : pitch}</div>;
        })}
      </div>
      
      {/* Grid cells with click handlers */}
      <div className={styles.gridCells}>
        {/* ... grid rendering ... */}
      </div>
    </div>
  );
}
```

---

## 5. Canvas Rendering

### 5.1 Collapsed Sequence View

When zoomed out or collapsed, show compact representation:

```typescript
// In renderer.ts

function drawSequenceRegion(ctx: CanvasRenderingContext2D, region: Region) {
  const meta = region.metadata as SequenceMetadata;
  
  // Draw region background
  ctx.fillStyle = region.color + '40';
  ctx.fillRect(region.x, region.y, region.width, region.height);
  
  // Draw border
  ctx.strokeStyle = region.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(region.x, region.y, region.width, region.height);
  
  // Draw sequence name with music icon
  ctx.fillStyle = '#fff';
  ctx.font = '14px Inter';
  ctx.fillText(`♪ ${meta.pattern.name}`, region.x + 10, region.y + 20);
  
  // Draw mini step indicators
  const stepWidth = (region.width - 40) / meta.pattern.steps.length;
  meta.pattern.steps.forEach((step, i) => {
    const x = region.x + 20 + i * stepWidth;
    const pitchNorm = (step.pitch + 12) / 24;  // Normalize -12..+12 to 0..1
    const y = region.y + region.height - 20 - pitchNorm * (region.height - 40);
    
    ctx.fillStyle = region.color;
    ctx.beginPath();
    ctx.arc(x, y, 4 * step.velocity, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw entry/exit handles
  drawSequenceHandles(ctx, region, meta);
}

function drawSequenceHandles(ctx: CanvasRenderingContext2D, region: Region, meta: SequenceMetadata) {
  // Entry handle (left side, middle)
  const entryY = region.y + region.height / 2;
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(region.x, entryY, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Exit handles (right side, spread vertically)
  const exitSpacing = region.height / (meta.exitNodeIds.length + 1);
  meta.exitNodeIds.forEach((_, i) => {
    const exitY = region.y + exitSpacing * (i + 1);
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(region.x + region.width, exitY, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}
```

---

## 6. Presets Library

Presets are just pattern templates — they generate nodes, not new node types:

```typescript
// src/data/sequence-presets.ts

export interface SequencePreset {
  readonly id: string;
  readonly name: string;
  readonly category: 'arpeggio' | 'bass' | 'melody' | 'rhythm';
  readonly description: string;
  readonly pattern: SequencePattern;
  readonly tags: readonly string[];
}

export const SEQUENCE_PRESETS: readonly SequencePreset[] = [
  // === ARPEGGIOS ===
  {
    id: 'arp-triad-up',
    name: 'Triad Up',
    category: 'arpeggio',
    description: 'Major triad ascending (root, 3rd, 5th)',
    pattern: {
      name: 'Triad Up',
      steps: [
        { time: 0,   pitch: 0,  velocity: 1.0 },
        { time: 0.5, pitch: 4,  velocity: 0.8 },
        { time: 1.0, pitch: 7,  velocity: 0.9 },
      ],
      length: 1.5,
      pitchMode: 'relative',
    },
    tags: ['arpeggio', 'major', 'simple'],
  },
  {
    id: 'arp-7th',
    name: 'Maj7 Arpeggio',
    category: 'arpeggio',
    description: 'Major 7th chord tones',
    pattern: {
      name: 'Maj7',
      steps: [
        { time: 0,    pitch: 0,  velocity: 1.0 },
        { time: 0.5,  pitch: 4,  velocity: 0.8 },
        { time: 1.0,  pitch: 7,  velocity: 0.85 },
        { time: 1.5,  pitch: 11, velocity: 0.75 },
      ],
      length: 2,
      pitchMode: 'relative',
    },
    tags: ['arpeggio', 'jazz', '7th'],
  },
  
  // === BASS ===
  {
    id: 'bass-pump',
    name: 'Octave Pump',
    category: 'bass',
    description: 'Classic dance bass pattern',
    pattern: {
      name: 'Octave Pump',
      steps: [
        { time: 0,   pitch: 0,  velocity: 1.0 },
        { time: 0.5, pitch: 12, velocity: 0.5 },
        { time: 1.0, pitch: 0,  velocity: 0.9 },
        { time: 1.5, pitch: 12, velocity: 0.4 },
      ],
      length: 2,
      pitchMode: 'relative',
    },
    tags: ['bass', 'dance', 'pump'],
  },
  {
    id: 'canon-bass',
    name: 'Canon Bass (D-A-B-F#-G-D-G-A)',
    category: 'bass',
    description: 'Pachelbel Canon bass line',
    pattern: {
      name: 'Canon Bass',
      steps: [
        { time: 0,  pitch: 0,  velocity: 1.0 },   // D (root)
        { time: 2,  pitch: -5, velocity: 0.9 },   // A
        { time: 4,  pitch: -3, velocity: 0.9 },   // B
        { time: 6,  pitch: -8, velocity: 0.85 },  // F#
        { time: 8,  pitch: -7, velocity: 0.9 },   // G
        { time: 10, pitch: 0,  velocity: 0.9 },   // D
        { time: 12, pitch: -7, velocity: 0.85 },  // G
        { time: 14, pitch: -5, velocity: 0.9 },   // A
      ],
      length: 16,
      pitchMode: 'relative',
    },
    tags: ['bass', 'canon', 'classical'],
  },
  
  // === MELODY ===
  {
    id: 'melody-scale-up',
    name: 'Scale Up',
    category: 'melody',
    description: 'Ascending scale fragment (Do-Re-Mi-Fa-Sol)',
    pattern: {
      name: 'Scale Up',
      steps: [
        { time: 0,   pitch: 0, velocity: 0.9 },
        { time: 0.5, pitch: 2, velocity: 0.8 },
        { time: 1.0, pitch: 4, velocity: 0.85 },
        { time: 1.5, pitch: 5, velocity: 0.8 },
        { time: 2.0, pitch: 7, velocity: 1.0 },
      ],
      length: 2.5,
      pitchMode: 'relative',
    },
    tags: ['melody', 'scale', 'ascending'],
  },
  
  // === RHYTHM ===
  {
    id: 'rhythm-4floor',
    name: '4 on Floor',
    category: 'rhythm',
    description: 'Quarter notes on each beat',
    pattern: {
      name: '4 on Floor',
      steps: [
        { time: 0, pitch: 0, velocity: 1.0 },
        { time: 1, pitch: 0, velocity: 0.95 },
        { time: 2, pitch: 0, velocity: 1.0 },
        { time: 3, pitch: 0, velocity: 0.95 },
      ],
      length: 4,
      pitchMode: 'relative',
    },
    tags: ['rhythm', 'kick', 'dance'],
  },
  {
    id: 'rhythm-syncopated',
    name: 'Syncopated',
    category: 'rhythm',
    description: 'Off-beat accents',
    pattern: {
      name: 'Syncopated',
      steps: [
        { time: 0,    pitch: 0, velocity: 1.0 },
        { time: 0.75, pitch: 0, velocity: 0.6 },
        { time: 1.5,  pitch: 0, velocity: 0.8 },
      ],
      length: 2,
      pitchMode: 'relative',
    },
    tags: ['rhythm', 'syncopation', 'funk'],
  },
];
```

---

## 7. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Add `metadata?: RegionMetadata` field to `Region` type
- [ ] Create `src/core/sequence-generator.ts` with `generateSequenceNodes()`
- [ ] Add "Create Sequence" to context menu
- [ ] Basic `SequenceEditor` component (step list only)
- [ ] Region rendering detects sequence metadata

### Phase 2: Editing & Regeneration
- [ ] Edit steps → regenerate nodes workflow
- [ ] Preserve external edge connections on regeneration
- [ ] Grid view for visual editing
- [ ] Preset selector dropdown
- [ ] Ungroup action (removes metadata, keeps nodes)

### Phase 3: Polish
- [ ] Entry/exit handle rendering and interaction
- [ ] "Convert to Sequence" from selected nodes (analysis)
- [ ] Copy/paste sequences
- [ ] Sequence templates in example gallery

### Phase 4: Advanced (Future)
- [ ] Per-step duration override
- [ ] Velocity curves (crescendo/decrescendo)
- [ ] Step probability (like gate node)
- [ ] Nested sequences (sequence of sequences)

---

## 8. Benefits Summary

| Benefit | Explanation |
|---------|-------------|
| **Zero engine risk** | No changes to `tick.ts`, `engine.ts`, or audio worklet |
| **Transparent** | Users see real nodes, can ungroup to learn/customize |
| **Backward compatible** | Existing files unchanged; sequences save as node graphs |
| **Reusable** | Presets are templates that generate standard nodes |
| **Extensible** | Add filters/gates mid-sequence by editing nodes |
| **Debuggable** | If something sounds wrong, expand and inspect |

---

## 9. Design Rationale

### Q: Why relative pitch instead of absolute MIDI notes?

**Consistent with PitchProps.shift** — the default and most common pitch operation:
- Same pattern works at any root note
- Transposable by changing Source's midiNote
- Matches how musicians think ("up a third", not "E4")

### Q: Why not include sound properties (wave, filter, etc.)?

**Separation of concerns:**
- Sequence = *when* and *what pitch*
- Tunnel = *how it sounds*

Chain them: `Source → Sequence → Tunnel → Speaker`

### Q: How is this different from manually creating nodes?

**Identical behavior, simplified UX:**
- User edits steps in a list → system generates splitter/delay/pitch
- User doesn't need to understand the graph pattern
- But can always ungroup to see/edit the real nodes

### Q: What if user edits nodes inside a sequence region?

Two options:
1. **Lock nodes** — prevent direct editing, require using step editor
2. **Detect divergence** — if user edits, mark sequence as "modified" and disable auto-regeneration

Recommendation: Start with option 1 for MVP, option 2 for advanced users.

---

## 10. Open Questions

1. **Single vs multiple exits?** Should sequences have one merged output or N outputs?
   - **Recommendation:** Default to multiple (one per step), with option to add a merger node

2. **Swing/groove?** Per-step timing offset for humanization?
   - Could add optional `timeOffset` to SequenceStep

3. **Save format?** Store pattern metadata or just nodes?
   - Store both: pattern in region metadata (for re-editing), nodes in graph (for playback)
   - If metadata absent, region is "ungrouped" (regular region)

4. **External connections?** How to handle edges to/from sequence internals?
   - Entry handle → connects to splitter
   - Exit handles → connect from each step's final node
   - Internal edges managed automatically by regeneration

---

*Document Version: 2.0 (UI Abstraction Approach)*  
*Last Updated: 2025-01-09*
