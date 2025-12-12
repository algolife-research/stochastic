# AI Planning System - Quick Reference

## How It Works

```
User Prompt → Complexity Check → Plan or Direct Generation
                                      ↓
                            Multi-Phase Plan Created
                                      ↓
                    Phase 1 → Phase 2 → Phase 3 → Complete
                      ↓         ↓         ↓
                   Canvas    Canvas    Canvas
                  (10 nodes) (+15)    (+20) = 45 total
```

## When Planning Activates

**Keywords that trigger planning:**
- Size: "large", "huge", "complex", "elaborate"
- Structure: "full composition", "complete song", "arrangement"
- Multiple: "3 layers", "several voices", "many parts"  
- Patterns: "polymetric", "orchestral", "ensemble"

**Also triggers if:**
- Multiple indicators + canvas has 10+ nodes
- Very specific multi-part requirements

## API Quick Reference

```typescript
import { aiAgent } from '@ai';

// === Basic Usage ===

// Auto-detect and plan if needed
const result = await aiAgent.generateWithPlanning(prompt);

if (result.needsPhases && result.plan) {
  // Multi-phase needed
  console.log(result.plan.phases);
  
  // Execute all phases automatically
  await aiAgent.executeAllPhases((phase, result) => {
    console.log(`Done: ${phase.name}`);
  });
} else {
  // Simple generation completed
  console.log(result.result);
}

// === Manual Phase Control ===

// Execute one phase at a time
const phaseResult = await aiAgent.executeNextPhase();
if (phaseResult.complete) {
  // All phases done
}

// Check status
const status = aiAgent.getPlanStatus();
console.log(`Progress: ${status.progress * 100}%`);

// === Configuration ===

// Increase nodes per phase (10-50)
aiAgent.setMaxNodesPerPhase(40);

// Clear current plan
aiAgent.clearPlan();

// === Templates ===

import { suggestTemplate } from '@ai';

const template = suggestTemplate(userPrompt);
if (template) {
  const ops = template.generateOperations({ 
    startX: 100, 
    startY: 200,
    midiNote: 60 
  });
  aiAgent.apply(ops);
}
```

## Plan Types

| Type | Phases | Best For | Est. Nodes |
|------|--------|----------|------------|
| Default | 2 | Medium complexity | 30-50 |
| Polymetric | 3 | Cross-rhythms | 40-60 |
| Layered | N+1 | Multi-voice | 50-80 |
| Structural | 3 | Song structure | 40-60 |
| Complete | 4 | Full composition | 60-100 |

## Example Prompts

### Triggers Planning:
✓ "Create a large generative composition with 4 melodic layers"
✓ "Build a complete polymetric pattern with percussion and bass"
✓ "Make an elaborate ambient texture with multiple evolving pads"
✓ "Design a full arrangement with intro, verse, and chorus"

### Direct Generation:
✓ "Create a simple bass synth"
✓ "Add an LFO to modulate the filter"
✓ "Make a plucky lead sound"
✓ "Build a basic drum pattern"

## Phase Structure

Each phase includes:
- **Name**: Descriptive title
- **Description**: What it builds
- **Prompt**: Specific instructions for AI
- **Constraints**: Max nodes/edges for this phase
- **Dependencies**: Which phases must complete first
- **Estimated Nodes**: Expected output size

## Progress Tracking

```typescript
// Get current progress
const status = aiAgent.getPlanStatus();

if (status) {
  const { plan, completedPhases, progress } = status;
  
  console.log(`${completedPhases.length}/${plan.phases.length} phases`);
  console.log(`${Math.round(progress * 100)}% complete`);
  
  // Find next phase
  const nextPhase = plan.phases.find(
    p => !completedPhases.includes(p.id)
  );
}
```

## Error Handling

```typescript
const result = await aiAgent.executeAllPhases();

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
  
  // Phases may partially complete
  console.log(`Completed: ${result.completedPhases}/${result.totalPhases}`);
  
  // Can retry from failure point
  await aiAgent.executeNextPhase();
}
```

## Tips

1. **Let it decide**: Use `generateWithPlanning()` - auto-detection works well
2. **Show progress**: Update UI as phases complete
3. **Cancellable**: Stop between phases, work saved
4. **Configurable**: Adjust `maxNodesPerPhase` for your needs
5. **Templates**: Use for instant complex patterns

## Limits

- **Max nodes per phase**: 50 (configurable, 30 default)
- **Max phases**: No hard limit, typically 2-4
- **Total composition**: 100+ nodes possible
- **Execution**: Phases run sequentially, not parallel
