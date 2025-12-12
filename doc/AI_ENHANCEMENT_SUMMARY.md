# Summary: AI Composition Enhancement

## Problem
The AI was limited to creating compositions of ~20 nodes, restricting the size and complexity of what could be generated in a single request.

## Solution
Implemented a **planning and iterative generation system** that:

1. **Automatically detects** when a request needs multi-phase planning
2. **Breaks down** complex compositions into logical phases (2-4 phases typically)
3. **Executes phases iteratively**, building up the composition step-by-step
4. **Increases node limits** from 20 to 30 per phase (configurable up to 50)

## Key Improvements

### New Files
- **`src/ai/planner.ts`**: Planning system with 5 composition strategies
- **`src/ai/templates.ts`**: Pre-built complex patterns (3 templates included)
- **`doc/AI_PLANNING_SYSTEM.md`**: Complete implementation guide

### Modified Files
- **`src/ai/agent.ts`**: Added planning methods and phase execution
- **`src/ai/store.ts`**: Added planning state and actions to store
- **`src/ai/context-builder.ts`**: Made constraints configurable
- **`src/ai/prompts.ts`**: Enhanced system prompt for multi-phase guidance
- **`src/ai/index.ts`**: Exported new functionality
- **`src/ui/AIPanel.tsx`**: Added planning UI, templates browser, advanced settings
- **`src/ui/AIPanel.module.css`**: Added styles for new components

## New UI Features

### 1. Plan Execution Bar
- Shows when a complex composition plan is created
- Displays progress bar with current phase name
- "Step" button to execute one phase at a time
- "Execute All" to auto-run all phases
- Cancel/Clear options

### 2. Templates Browser
- Click 📦 button to access pre-built patterns
- Templates include: Probabilistic Sequencer, Evolving Texture Pad, Polymetric Rhythm Machine
- One-click to apply template to canvas

### 3. Planning Toggle
- Click 📋 button to enable/disable planning
- When enabled (default), complex prompts auto-trigger multi-phase planning
- When disabled, everything runs in single-pass mode

### 4. Advanced Settings
- Collapsible section at bottom of AI panel
- Slider to adjust max nodes per phase (10-50)
- Helps balance between composition size and API limits

## New Capabilities

### Before
- Max ~20 nodes per generation
- Complex requests often incomplete or cut off
- No decomposition of large tasks

### After
- Can build 80-100+ node compositions
- Automatic task decomposition
- 5 planning strategies for different composition types
- Progress tracking and phase-by-phase execution
- Pre-built templates for common patterns
- Full UI integration with visual feedback

## Usage

### Simple Flow
1. Type complex request like "Create a large polymetric composition with 4 layers"
2. AI automatically detects complexity and creates a plan
3. Plan overview appears in chat
4. Click "Execute All" or "Step" in the plan bar
5. Watch progress as each phase completes

### Using Templates
1. Click 📦 button in input area
2. Browse available templates
3. Click to instantly apply to canvas

### Adjusting Settings
1. Click "Advanced ▾" at bottom of panel
2. Adjust max nodes slider
3. Higher = larger compositions, but may hit API limits

## Technical Details

- **Planning triggers**: Uses regex patterns + canvas analysis
- **Phase constraints**: Each phase gets customized node/edge limits
- **Context aware**: Each phase sees previous phases' nodes in canvas state
- **Prompt engineering**: Phase-specific prompts guide the AI's focus
- **Dependency graph**: Ensures phases execute in proper order
- **Store integration**: Full Zustand state management for planning
