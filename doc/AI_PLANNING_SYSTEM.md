# AI Composition Enhancement - Implementation Guide

## Overview

The AI system has been upgraded with **planning and iterative generation** capabilities to handle larger, more complex compositions. Previously limited to ~20 nodes per generation, the system can now create compositions with 80+ nodes through multi-phase approaches.

## New Features

### 1. **Automatic Planning System** (`src/ai/planner.ts`)

The planner analyzes user prompts and determines if a multi-phase approach is needed:

- **Complexity Detection**: Automatically identifies requests for large/complex compositions
- **Smart Decomposition**: Breaks down complex requests into logical phases
- **Dependency Management**: Ensures phases execute in the correct order

#### Planning Strategies

1. **Default Plan**: Foundation → Elaboration (2 phases)
2. **Polymetric Plan**: Time Sig 1 → Time Sig 2 → Integration (3 phases)
3. **Layered Plan**: Layer 1 → Layer 2 → ... → Mix & Effects (N+1 phases)
4. **Structural Plan**: Main Pattern → Variation → Scene Control (3 phases)
5. **Complete Plan**: Rhythm → Melody → Texture → Effects (4 phases)

### 2. **Iterative Generation** (in `src/ai/agent.ts`)

New methods in `AIAgent`:

```typescript
// Check if planning is needed and create plan
await aiAgent.generateWithPlanning(prompt)

// Execute one phase at a time
await aiAgent.executeNextPhase()

// Auto-execute all phases
await aiAgent.executeAllPhases(onPhaseComplete)

// Check progress
aiAgent.getPlanStatus()

// Configure
aiAgent.setMaxNodesPerPhase(30)  // Default: 30 (was 20)
```

### 3. **Composition Templates** (`src/ai/templates.ts`)

Pre-built patterns for common complex structures:

- **Probabilistic Sequencer**: Multi-voice generative with gates (~25 nodes)
- **Evolving Texture Pad**: Ambient with LFO modulation (~18 nodes)
- **Polymetric Rhythm Machine**: Cross-rhythms (~22 nodes)

```typescript
import { suggestTemplate, getTemplate } from '@ai';

const template = suggestTemplate(userPrompt);
if (template) {
  const operations = template.generateOperations({ startX: 100, startY: 200 });
  aiAgent.apply(operations);
}
```

### 4. **Increased Constraints**

- **maxNodesPerPhase**: 30 (up from 20)
- **Configurable**: Call `setMaxNodesPerPhase(50)` for even larger phases
- **Dynamic**: Constraints adjust per phase based on complexity

### 5. **Enhanced Prompts**

Updated system prompt to:
- Guide AI on multi-phase composition
- Teach focus on specific phase goals
- Explain working with existing nodes from previous phases
- Emphasize respecting node count constraints

## Usage Examples

### Simple Request (No Planning)

```typescript
const result = await aiAgent.generateAndApply("Create a simple bass synth");
// Works as before - single generation
```

### Complex Request (Automatic Planning)

```typescript
const { plan, needsPhases } = await aiAgent.generateWithPlanning(
  "Create a large polymetric composition with 3 independent rhythmic layers"
);

if (needsPhases && plan) {
  console.log(`Plan: ${plan.description}`);
  console.log(`Phases: ${plan.phases.length}`);
  console.log(`Estimated nodes: ${plan.totalEstimatedNodes}`);
  
  // Execute phase by phase
  while (true) {
    const result = await aiAgent.executeNextPhase();
    if (result.complete) break;
    
    console.log(`Completed: ${result.phase?.name}`);
    // UI can show progress here
  }
}
```

### Automatic Execution

```typescript
const { plan } = await aiAgent.generateWithPlanning(complexPrompt);

if (plan) {
  const result = await aiAgent.executeAllPhases((phase, result) => {
    console.log(`✓ ${phase.name}: Added ${result?.appliedCount} nodes`);
  });
  
  console.log(`Complete: ${result.completedPhases}/${result.totalPhases} phases`);
}
```

## UI Integration Suggestions

### Add Planning Controls to AIPanel

```typescript
// In AIPanel.tsx
const handleGenerate = async () => {
  const result = await aiAgent.generateWithPlanning(prompt);
  
  if (result.needsPhases && result.plan) {
    // Show plan UI
    setCurrentPlan(result.plan);
    setShowPlanDialog(true);
  } else {
    // Handle simple generation
  }
};

// Show progress during multi-phase
const executePhases = async () => {
  while (true) {
    const result = await aiAgent.executeNextPhase();
    if (result.complete) break;
    
    setProgress(aiAgent.getPlanStatus()?.progress || 0);
  }
};
```

### Plan Visualization

```typescript
// Show plan overview
const PlanOverview = ({ plan }: { plan: CompositionPlan }) => (
  <div>
    <h3>{plan.description}</h3>
    <p>Complexity: {plan.complexity}</p>
    <p>Estimated nodes: {plan.totalEstimatedNodes}</p>
    
    {plan.phases.map(phase => (
      <div key={phase.id}>
        <h4>{phase.name}</h4>
        <p>{phase.description}</p>
        <p>~{phase.estimatedNodes} nodes</p>
      </div>
    ))}
  </div>
);
```

## Complexity Keywords

The planner detects these keywords to trigger multi-phase planning:

**Size**: large, huge, massive, big, complex, elaborate
**Structure**: full composition, complete song, arrangement, sections
**Multiple Elements**: 3 layers, several voices, many parts
**Patterns**: polymetric, polyrhythm, orchestral, ensemble

## Benefits

1. **Larger Compositions**: Build 80-100+ node patches that were previously impossible
2. **Better Quality**: Each phase focuses on one aspect, leading to better coherence
3. **Incremental Progress**: Users see progress as each phase completes
4. **Resource Management**: Avoids token limit issues by splitting work
5. **Flexibility**: Can modify/retry individual phases without redoing everything

## Configuration

```typescript
// Adjust max nodes per phase
aiAgent.setMaxNodesPerPhase(40);  // Range: 10-50

// Get current status
const status = aiAgent.getPlanStatus();
if (status) {
  console.log(`Progress: ${status.progress * 100}%`);
  console.log(`Completed: ${status.completedPhases.length} phases`);
}

// Clear plan if needed
aiAgent.clearPlan();
```

## Best Practices

1. **Let the AI decide**: Use `generateWithPlanning()` - it auto-detects complexity
2. **Show progress**: Update UI during multi-phase execution
3. **Allow cancellation**: Phases can be cancelled between executions
4. **Save checkpoints**: Each phase adds to the canvas - work is never lost
5. **Iterate on phases**: If one phase isn't perfect, clear and regenerate just that part

## Technical Details

- **Planning triggers**: Uses regex patterns + canvas analysis
- **Phase constraints**: Each phase gets customized node/edge limits
- **Context aware**: Each phase sees previous phases' nodes in canvas state
- **Prompt engineering**: Phase-specific prompts guide the AI's focus
- **Dependency graph**: Ensures phases execute in proper order

## Future Enhancements

Potential additions:
- Manual phase editing before execution
- Retry individual phases with different parameters
- Visual phase progress indicators
- Phase templates library expansion
- Collaborative planning (user + AI iterate on plan)
