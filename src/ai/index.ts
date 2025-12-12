// AI Agent Module - Public API Exports
// Main entry point for the AI canvas generation system

// Types
export type {
  AIProvider,
  AIAgentConfig,
  CanvasOperation,
  AddNodeOperation,
  ModifyNodeOperation,
  DeleteNodeOperation,
  AddEdgeOperation,
  ModifyEdgeOperation,
  DeleteEdgeOperation,
  CanvasContext,
  NodeContext,
  EdgeContext,
  GenerationConstraints,
  ChatMessage,
  GenerationRequest,
  GenerationResponse,
  AIAgentState,
  NodeTypeDoc,
  PropertyDoc,
  ValidationResult,
} from './types';

// Agent
export { AIAgent, aiAgent, generatePatch, isAIReady } from './agent';

// Store
export { useAIStore, useAIPanel } from './store';

// Context
export { 
  buildCanvasContext, 
  buildRegionContext,
  serializeContext,
  invalidateContextCache,
  getDefaultConstraints,
  findOpenArea,
  calculateChainPositions,
  calculateGridPositions,
  analyzeCanvas,
  type CanvasAnalysis,
} from './context-builder';

// Prompts
export { 
  NODE_DOCS,
  getNodeDoc,
  generateNodeTypeReference,
  getSystemPrompt,
  buildPrompt,
  SUGGESTED_PROMPTS,
  getContextSuggestions,
} from './prompts';

// Parser
export { 
  extractJSON,
  parseJSON,
  parseAIResponse,
  validateOperations,
  summarizeOperations,
} from './parser';

// Operations
export {
  applyOperations,
  previewOperations,
  createSimplePatch,
  type ApplyResult,
  type OperationError,
  type PreviewChange,
} from './operations';

// Planning (NEW)
export type { CompositionPlan, CompositionPhase } from './planner';
export {
  needsPlanning,
  createPlan,
  getNextPhase,
  isPlanComplete,
} from './planner';

// Templates (NEW)
export type { CompositionTemplate, TemplateOptions } from './templates';
export {
  COMPOSITION_TEMPLATES,
  findTemplates,
  getTemplate,
  suggestTemplate,
} from './templates';
