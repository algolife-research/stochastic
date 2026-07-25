// AI Agent - Type Definitions
// Types for AI-assisted canvas population

import type { 
  NodeId, EdgeId, NodeType,
  SourceProps, SpeakerProps, PitchProps, OscillatorProps,
  FilterProps, GateProps, DelayProps, GainProps,
  ModulatorProps, QuantizerProps, LfoProps, SplitterProps,
  MutatorProps, CrossoverProps, TunnelProps, TeleporterProps,
  MidiOutProps, MidiCcProps, SceneTriggerProps, ScaleName
} from '@core/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Supported AI providers */
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'openrouter-free' | 'ollama' | 'lmstudio';

/** AI Agent configuration */
export interface AIAgentConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;  // For local/custom endpoints
  maxTokens: number;
  temperature: number;
}

/** Two-tier AI configuration for planning + execution */
export interface AITieredConfig {
  planning: AIAgentConfig;   // Smart model for planning
  execution: AIAgentConfig;  // Fast/cheap model for execution
}

/** Default configurations for each provider */
export const DEFAULT_CONFIGS: Record<AIProvider, Partial<AIAgentConfig>> = {
  openai: {
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
  },
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
  },
  gemini: {
    model: 'gemini-2.5-pro-preview-06-05',
    maxTokens: 8192,
    temperature: 0.7,
  },
  openrouter: {
    model: 'anthropic/claude-sonnet-4',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 4096,
    temperature: 0.7,
  },
  'openrouter-free': {
    model: 'qwen/qwen3-coder:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 4096,
    temperature: 0.7,
  },
  ollama: {
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434/api',
    maxTokens: 4096,
    temperature: 0.7,
  },
  lmstudio: {
    model: 'local-model',
    baseUrl: 'http://localhost:1234/v1',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

/** Execution-optimized configs (cheaper, faster models) */
export const EXECUTION_CONFIGS: Record<AIProvider, Partial<AIAgentConfig>> = {
  openai: {
    model: 'gpt-4o-mini',
    maxTokens: 1000,
    temperature: 0.3,  // More precise for execution
  },
  anthropic: {
    model: 'claude-haiku-4-20250514',
    maxTokens: 1000,
    temperature: 0.3,
  },
  gemini: {
    model: 'gemini-2.5-flash-preview-05-20',
    maxTokens: 1000,
    temperature: 0.3,
  },
  openrouter: {
    model: 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 1000,
    temperature: 0.3,
  },
  'openrouter-free': {
    model: 'qwen/qwen3-coder:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 1000,
    temperature: 0.3,
  },
  ollama: {
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434/api',
    maxTokens: 1000,
    temperature: 0.3,
  },
  lmstudio: {
    model: 'local-model',
    baseUrl: 'http://localhost:1234/v1',
    maxTokens: 1000,
    temperature: 0.3,
  },
};

/** Provider info for UI */
export const PROVIDER_INFO: Record<AIProvider, { name: string; hint: string; requiresKey: boolean; isFree: boolean }> = {
  openai: {
    name: 'OpenAI (GPT-4)',
    hint: 'Get API key from platform.openai.com - Paid',
    requiresKey: true,
    isFree: false,
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    hint: 'Get API key from console.anthropic.com - Paid',
    requiresKey: true,
    isFree: false,
  },
  gemini: {
    name: 'Google Gemini',
    hint: 'Get API key from aistudio.google.com - Has free tier',
    requiresKey: true,
    isFree: true,
  },
  openrouter: {
    name: 'OpenRouter (Multi-model)',
    hint: 'Get API key from openrouter.ai - Access Claude, GPT-4, Llama & more',
    requiresKey: true,
    isFree: false,
  },
  'openrouter-free': {
    name: 'OpenRouter ⭐ Free (Devstral)',
    hint: 'Get API key from openrouter.ai - Uses free Devstral model',
    requiresKey: true,
    isFree: true,
  },
  ollama: {
    name: 'Ollama (Local) ⭐ Free',
    hint: 'Download from ollama.com - Runs on your computer, no API key needed',
    requiresKey: false,
    isFree: true,
  },
  lmstudio: {
    name: 'LM Studio (Local) ⭐ Free',
    hint: 'Download from lmstudio.ai - Runs on your computer, no API key needed',
    requiresKey: false,
    isFree: true,
  },
};

// ============================================================================
// CANVAS OPERATIONS
// ============================================================================

/** Node creation operation */
export interface AddNodeOperation {
  type: 'add_node';
  nodeType: NodeType;
  x: number;
  y: number;
  props?: Partial<NodePropsUnion>;
  tempId?: string;  // Temporary ID for referencing in edges
}

/** Node modification operation */
export interface ModifyNodeOperation {
  type: 'modify_node';
  nodeId: NodeId | string;  // Can be tempId
  props: Partial<NodePropsUnion>;
}

/** Node deletion operation */
export interface DeleteNodeOperation {
  type: 'delete_node';
  nodeId: NodeId | string;
}

/** Edge creation operation */
export interface AddEdgeOperation {
  type: 'add_edge';
  from: NodeId | string;  // Can be tempId
  to: NodeId | string;    // Can be tempId
  timingMode?: 'physical' | 'fixed';
  durationBeats?: number;
  targetParam?: string | null;
  weight?: number;
}

/** Edge modification operation */
export interface ModifyEdgeOperation {
  type: 'modify_edge';
  edgeId?: EdgeId;  // Can be provided directly
  from?: string;    // Or lookup by endpoints
  to?: string;
  timingMode?: 'physical' | 'fixed';
  durationBeats?: number;
  targetParam?: string | null;
  weight?: number;
}

/** Edge deletion operation */
export interface DeleteEdgeOperation {
  type: 'delete_edge';
  edgeId?: EdgeId;  // Can be provided directly
  from?: string;    // Or lookup by endpoints
  to?: string;
}

/** Auto-layout operation */
export interface AutoLayoutOperation {
  type: 'auto_layout';
  algorithm?: 'hierarchical' | 'force' | 'circular';
}

/** Create new scene operation */
export interface CreateSceneOperation {
  type: 'create_scene';
  name?: string;
  copyCurrentCanvas?: boolean;  // If true, copy current canvas to new scene
}

/** Modify existing scene operation */
export interface ModifySceneOperation {
  type: 'modify_scene';
  sceneId?: string;  // Scene ID or name
  name?: string;
  durationBeats?: number;
  loopCount?: number;
  localBpm?: number | null;
  localRoot?: number | null;
  localScale?: ScaleName | null;
  color?: string;
}

/** Switch to different scene operation */
export interface SwitchSceneOperation {
  type: 'switch_scene';
  sceneId?: string;  // Scene ID or name
  sceneName?: string;
}

/** Save current canvas to scene operation */
export interface SaveToSceneOperation {
  type: 'save_to_scene';
  sceneId?: string;  // Scene ID or name
}

/** Delete scene operation */
export interface DeleteSceneOperation {
  type: 'delete_scene';
  sceneId?: string;  // Scene ID or name
}

/** Add scene to arrangement operation */
export interface AddToArrangementOperation {
  type: 'add_to_arrangement';
  sceneId?: string;  // Scene ID or name
  startBeat?: number;
  channel?: number;
}

/** Union type for all canvas operations */
export type CanvasOperation = 
  | AddNodeOperation
  | ModifyNodeOperation
  | DeleteNodeOperation
  | AddEdgeOperation
  | ModifyEdgeOperation
  | DeleteEdgeOperation
  | AutoLayoutOperation
  | CreateSceneOperation
  | ModifySceneOperation
  | SwitchSceneOperation
  | SaveToSceneOperation
  | DeleteSceneOperation
  | AddToArrangementOperation;

/** Union type for all node props */
export type NodePropsUnion = 
  | SourceProps
  | SpeakerProps
  | PitchProps
  | OscillatorProps
  | FilterProps
  | GateProps
  | DelayProps
  | GainProps
  | ModulatorProps
  | QuantizerProps
  | LfoProps
  | SplitterProps
  | MutatorProps
  | CrossoverProps
  | TunnelProps
  | TeleporterProps
  | MidiOutProps
  | MidiCcProps
  | SceneTriggerProps;

// ============================================================================
// CONTEXT
// ============================================================================

/** Simplified node representation for AI context */
export interface NodeContext {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

/** Simplified edge representation for AI context */
export interface EdgeContext {
  id: string;
  from: string;
  to: string;
  timingMode: 'physical' | 'fixed';
  durationBeats: number | null;
  targetParam: string | null;
}

/** Current canvas state for AI context */
export interface CanvasContext {
  nodes: NodeContext[];
  edges: EdgeContext[];
  musicalContext: {
    root: number;
    scale: ScaleName;
    bpm: number;
  };
}

/** Generation constraints */
export interface GenerationConstraints {
  maxNodes?: number;
  maxEdges?: number;
  allowedNodeTypes?: NodeType[];
  preferredArea?: { x: number; y: number; width: number; height: number };
}

// ============================================================================
// MESSAGES & RESPONSES
// ============================================================================

/** Chat message in conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  operations?: CanvasOperation[];  // Operations extracted from assistant response
  applied?: boolean;  // Whether operations were applied to canvas
}

/** Generation request to AI */
export interface GenerationRequest {
  prompt: string;
  context: CanvasContext;
  constraints?: GenerationConstraints;
  conversationHistory?: ChatMessage[];
}

/** Generation response from AI */
export interface GenerationResponse {
  content: string;
  operations: CanvasOperation[];
  suggestions?: string[];
  error?: string;
}

// ============================================================================
// AGENT STATE
// ============================================================================

/** AI Agent state for store */
export interface AIAgentState {
  // Configuration
  config: AIAgentConfig | null;
  isConfigured: boolean;
  
  // Conversation
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingText: string;
  
  // Preview
  previewOperations: CanvasOperation[];
  isPreviewActive: boolean;
  
  // Error handling
  lastError: string | null;
}

/** AI Agent actions */
export interface AIAgentActions {
  // Configuration
  setConfig: (config: AIAgentConfig) => void;
  clearConfig: () => void;
  
  // Conversation
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setGenerating: (generating: boolean) => void;
  
  // Preview
  setPreviewOperations: (operations: CanvasOperation[]) => void;
  clearPreview: () => void;
  applyPreview: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  
  // Main actions
  generateFromPrompt: (prompt: string) => Promise<GenerationResponse>;
}

// ============================================================================
// NODE TYPE DOCUMENTATION (for AI prompts)
// ============================================================================

/** Documentation for each node type */
export interface NodeTypeDoc {
  type: NodeType;
  name: string;
  description: string;
  category: 'generator' | 'modifier' | 'output' | 'routing' | 'modulation' | 'evolution';
  inputs: string[];
  outputs: string[];
  props: PropertyDoc[];
}

/** Property documentation */
export interface PropertyDoc {
  name: string;
  type: string;
  description: string;
  default?: unknown;
  range?: { min: number; max: number };
  options?: string[];
}

// ============================================================================
// VALIDATION
// ============================================================================

/** Operation validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  /** Map of partial/truncated IDs to their full resolved IDs */
  idResolutionMap?: Map<string, string>;
}

export interface ValidationError {
  operation: CanvasOperation;
  message: string;
  code: string;
}

export interface ValidationWarning {
  operation: CanvasOperation;
  message: string;
  code: string;
}
