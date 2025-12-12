// AI Agent - Zustand Store Slice
// State management for AI agent

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  AIAgentConfig, 
  AIAgentState, 
  ChatMessage, 
  CanvasOperation,
} from './types';
import { DEFAULT_CONFIGS, EXECUTION_CONFIGS } from './types';
import { aiAgent } from './agent';
import { applyOperations } from './operations';
import { useAuthStore } from '@auth/store';
import type { CompositionPlan, CompositionPhase } from './planner';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Read config from environment (set in .env file)
const ENV_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const ENV_PLANNING_MODEL = import.meta.env.VITE_AI_PLANNING_MODEL as string | undefined;
const ENV_EXECUTION_MODEL = import.meta.env.VITE_AI_EXECUTION_MODEL as string | undefined;

// Check if AI is pre-configured via environment
function getEnvConfig(): { planning: AIAgentConfig; execution: AIAgentConfig } | null {
  if (!ENV_API_KEY) return null;
  
  const planningDefaults = DEFAULT_CONFIGS['openrouter'];
  const executionDefaults = EXECUTION_CONFIGS['openrouter'];
  
  return {
    planning: {
      provider: 'openrouter',
      apiKey: ENV_API_KEY,
      model: ENV_PLANNING_MODEL || planningDefaults.model || 'anthropic/claude-sonnet-4',
      maxTokens: planningDefaults.maxTokens || 4096,
      temperature: planningDefaults.temperature || 0.7,
      baseUrl: planningDefaults.baseUrl,
    },
    execution: {
      provider: 'openrouter',
      apiKey: ENV_API_KEY,
      model: ENV_EXECUTION_MODEL || executionDefaults.model || 'openai/gpt-4o-mini',
      maxTokens: executionDefaults.maxTokens || 1000,
      temperature: executionDefaults.temperature || 0.3,
      baseUrl: executionDefaults.baseUrl,
    },
  };
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AIStoreState extends AIAgentState {
  // Planning state
  currentPlan: CompositionPlan | null;
  completedPhases: number[];
  currentPhase: CompositionPhase | null;
  planProgress: number;
  isPlanExecuting: boolean;
  maxNodesPerPhase: number;
  
  // Actions
  setConfig: (config: AIAgentConfig) => void;
  setApiKey: (apiKey: string) => void;
  setProvider: (provider: string, apiKey: string) => void;
  clearConfig: () => void;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  
  setGenerating: (generating: boolean) => void;
  setStreamingText: (text: string) => void;
  setError: (error: string | null) => void;
  
  setPreviewOperations: (operations: CanvasOperation[]) => void;
  clearPreview: () => void;
  applyPreview: () => void;
  
  // Planning actions
  setMaxNodesPerPhase: (max: number) => void;
  startPlanExecution: (plan: CompositionPlan) => void;
  executeNextPhase: () => Promise<void>;
  executeAllPhases: () => Promise<void>;
  cancelPlan: () => void;
  clearPlan: () => void;
  
  // High-level actions
  sendMessage: (prompt: string) => Promise<void>;
  sendMessageWithPlanning: (prompt: string) => Promise<void>;
  cancelGeneration: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

// Try to initialize from environment
const envTieredConfig = getEnvConfig();

const initialState: AIAgentState & {
  currentPlan: CompositionPlan | null;
  completedPhases: number[];
  currentPhase: CompositionPhase | null;
  planProgress: number;
  isPlanExecuting: boolean;
  maxNodesPerPhase: number;
} = {
  config: envTieredConfig?.planning || null,
  isConfigured: envTieredConfig !== null,
  messages: [],
  isGenerating: false,
  streamingText: '',
  previewOperations: [],
  isPreviewActive: false,
  lastError: null,
  // Planning state
  currentPlan: null,
  completedPhases: [],
  currentPhase: null,
  planProgress: 0,
  isPlanExecuting: false,
  maxNodesPerPhase: 30,
};

// If we have env config, configure the agent immediately
if (envTieredConfig) {
  aiAgent.configureTiered(envTieredConfig.planning, envTieredConfig.execution);
}

// ============================================================================
// STORE CREATION
// ============================================================================

export const useAIStore = create<AIStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Configuration
    setConfig: (config: AIAgentConfig) => {
      aiAgent.configure(config);
      set({
        config,
        isConfigured: true,
        lastError: null,
      });
    },
    
    setApiKey: (apiKey: string) => {
      const planningDefaults = DEFAULT_CONFIGS['openrouter'];
      const executionDefaults = EXECUTION_CONFIGS['openrouter'];
      
      const planningConfig: AIAgentConfig = {
        provider: 'openrouter',
        apiKey,
        model: planningDefaults.model || 'anthropic/claude-sonnet-4',
        maxTokens: planningDefaults.maxTokens || 4096,
        temperature: planningDefaults.temperature || 0.7,
        baseUrl: planningDefaults.baseUrl,
      };
      
      const executionConfig: AIAgentConfig = {
        provider: 'openrouter',
        apiKey,
        model: executionDefaults.model || 'openai/gpt-4o-mini',
        maxTokens: executionDefaults.maxTokens || 1000,
        temperature: executionDefaults.temperature || 0.3,
        baseUrl: executionDefaults.baseUrl,
      };
      
      aiAgent.configureTiered(planningConfig, executionConfig);
      set({
        config: planningConfig,
        isConfigured: true,
        lastError: null,
      });
    },
    
    setProvider: (provider: string, apiKey: string) => {
      const defaults = DEFAULT_CONFIGS[provider as keyof typeof DEFAULT_CONFIGS] || DEFAULT_CONFIGS['openrouter'];
      const config: AIAgentConfig = {
        provider: provider as AIAgentConfig['provider'],
        apiKey,
        model: defaults.model || 'anthropic/claude-sonnet-4',
        maxTokens: defaults.maxTokens || 4096,
        temperature: defaults.temperature || 0.7,
        baseUrl: defaults.baseUrl,
      };
      get().setConfig(config);
    },
    
    clearConfig: () => {
      aiAgent.clearConfig();
      set({
        config: null,
        isConfigured: false,
      });
    },
    
    // Messages
    addMessage: (message) => {
      const newMessage: ChatMessage = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      set(state => ({
        messages: [...state.messages, newMessage],
      }));
    },
    
    updateLastMessage: (updates) => {
      set(state => {
        const messages = [...state.messages];
        const lastIdx = messages.length - 1;
        if (lastIdx >= 0 && messages[lastIdx]) {
          messages[lastIdx] = { ...messages[lastIdx], ...updates } as ChatMessage;
        }
        return { messages };
      });
    },
    
    clearMessages: () => {
      aiAgent.clearHistory();
      set({ messages: [] });
    },
    
    // State
    setGenerating: (generating) => {
      set({ isGenerating: generating });
    },
    
    setStreamingText: (text) => {
      set({ streamingText: text });
    },
    
    setError: (error) => {
      set({ lastError: error });
    },
    
    // Preview
    setPreviewOperations: (operations) => {
      set({
        previewOperations: operations,
        isPreviewActive: operations.length > 0,
      });
    },
    
    clearPreview: () => {
      set({
        previewOperations: [],
        isPreviewActive: false,
      });
    },
    
    applyPreview: () => {
      const { previewOperations } = get();
      if (previewOperations.length > 0) {
        const result = applyOperations(previewOperations);
        if (!result.success) {
          set({ lastError: `Failed to apply ${result.failedCount} operations` });
        }
      }
      get().clearPreview();
    },
    
    // High-level actions
    sendMessage: async (prompt: string) => {
      const { isConfigured, isGenerating } = get();
      
      if (!isConfigured) {
        set({ lastError: 'Please configure AI settings first' });
        return;
      }
      
      if (isGenerating) {
        return;
      }
      
      // Check and consume credits
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        // Check if user has enough credits
        if (!authStore.hasEnoughCredits('ai_generation_basic')) {
          set({ lastError: 'Insufficient credits for AI generation' });
          return;
        }
        
        // Consume credits
        const result = await authStore.useCredits('ai_generation_basic');
        if (!result.success) {
          set({ lastError: result.error || 'Failed to use credits' });
          return;
        }
      }
      
      // Add user message
      get().addMessage({
        role: 'user',
        content: prompt,
      });
      
      // Start generating with streaming
      set({ isGenerating: true, lastError: null, streamingText: '' });
      
      try {
        const response = await aiAgent.generate(prompt);
        
        // Clear streaming text
        set({ streamingText: '' });
        
        // Add assistant message
        get().addMessage({
          role: 'assistant',
          content: response.content || response.error || 'No response',
          operations: response.operations,
        });
        
        if (response.error) {
          set({ lastError: response.error });
        } else if (response.operations.length > 0) {
          // Set preview operations
          get().setPreviewOperations(response.operations);
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        set({ lastError: error, streamingText: '' });
        get().addMessage({
          role: 'assistant',
          content: `Error: ${error}`,
        });
      } finally {
        set({ isGenerating: false });
      }
    },
    
    cancelGeneration: () => {
      aiAgent.cancel();
      set({ isGenerating: false });
    },
    
    // Planning actions
    setMaxNodesPerPhase: (max: number) => {
      const clamped = Math.max(10, Math.min(max, 50));
      aiAgent.setMaxNodesPerPhase(clamped);
      set({ maxNodesPerPhase: clamped });
    },
    
    startPlanExecution: (plan: CompositionPlan) => {
      set({
        currentPlan: plan,
        completedPhases: [],
        currentPhase: null,
        planProgress: 0,
        isPlanExecuting: false,
      });
    },
    
    executeNextPhase: async () => {
      const { currentPlan, isGenerating } = get();
      
      if (!currentPlan || isGenerating) return;
      
      set({ isGenerating: true, isPlanExecuting: true, lastError: null });
      
      try {
        const result = await aiAgent.executeNextPhase();
        
        if (result.error) {
          set({ lastError: result.error });
          return;
        }
        
        if (result.phase) {
          set({ currentPhase: result.phase });
          
          // Add message about phase completion
          get().addMessage({
            role: 'assistant',
            content: `✓ **Phase ${result.phase.id}: ${result.phase.name}**\n${result.phase.description}`,
            operations: result.response?.operations,
          });
          
          // Auto-apply the operations
          if (result.response?.operations && result.response.operations.length > 0) {
            applyOperations(result.response.operations);
          }
        }
        
        // Update progress
        const status = aiAgent.getPlanStatus();
        if (status) {
          set({
            completedPhases: status.completedPhases,
            planProgress: status.progress,
          });
        }
        
        if (result.complete) {
          get().addMessage({
            role: 'assistant',
            content: '🎉 **Plan complete!** All phases have been executed successfully.',
          });
          set({ isPlanExecuting: false, currentPhase: null });
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        set({ lastError: error });
      } finally {
        set({ isGenerating: false });
      }
    },
    
    executeAllPhases: async () => {
      const { currentPlan, isGenerating } = get();
      
      if (!currentPlan || isGenerating) return;
      
      set({ isGenerating: true, isPlanExecuting: true, lastError: null });
      
      try {
        const result = await aiAgent.executeAllPhases((phase, phaseResult) => {
          set({ currentPhase: phase });
          
          // Add message about phase completion
          get().addMessage({
            role: 'assistant',
            content: `✓ **Phase ${phase.id}: ${phase.name}**\n${phase.description}\n_Added ${phaseResult?.appliedCount || 0} nodes_`,
            operations: [],
          });
          
          // Update progress
          const status = aiAgent.getPlanStatus();
          if (status) {
            set({
              completedPhases: status.completedPhases,
              planProgress: status.progress,
            });
          }
        });
        
        if (result.errors.length > 0) {
          set({ lastError: result.errors.join('; ') });
        }
        
        get().addMessage({
          role: 'assistant',
          content: `🎉 **Plan complete!** ${result.completedPhases}/${result.totalPhases} phases executed.`,
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        set({ lastError: error });
      } finally {
        set({ isGenerating: false, isPlanExecuting: false, currentPhase: null });
      }
    },
    
    cancelPlan: () => {
      aiAgent.cancel();
      set({ isGenerating: false, isPlanExecuting: false, currentPhase: null });
    },
    
    clearPlan: () => {
      aiAgent.clearPlan();
      set({
        currentPlan: null,
        completedPhases: [],
        currentPhase: null,
        planProgress: 0,
        isPlanExecuting: false,
      });
    },
    
    sendMessageWithPlanning: async (prompt: string) => {
      const { isConfigured, isGenerating } = get();
      
      if (!isConfigured) {
        set({ lastError: 'Please configure AI settings first' });
        return;
      }
      
      if (isGenerating) {
        return;
      }
      
      // Check and consume credits
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        if (!authStore.hasEnoughCredits('ai_generation_basic')) {
          set({ lastError: 'Insufficient credits for AI generation' });
          return;
        }
        const result = await authStore.useCredits('ai_generation_basic');
        if (!result.success) {
          set({ lastError: result.error || 'Failed to use credits' });
          return;
        }
      }
      
      // Add user message
      get().addMessage({
        role: 'user',
        content: prompt,
      });
      
      set({ isGenerating: true, lastError: null });
      
      try {
        const result = await aiAgent.generateWithPlanning(prompt);
        
        if (result.needsPhases && result.plan) {
          // Complex composition - show plan
          get().startPlanExecution(result.plan);
          
          get().addMessage({
            role: 'assistant',
            content: `📋 **Planning: ${result.plan.description}**\n\n` +
              `Complexity: ${result.plan.complexity}\n` +
              `Estimated nodes: ~${result.plan.totalEstimatedNodes}\n` +
              `Phases: ${result.plan.phases.length}\n\n` +
              result.plan.phases.map(p => `• **${p.name}**: ${p.description}`).join('\n') +
              '\n\n_Click "Execute All" to build or "Step" to execute one phase at a time._',
          });
        } else if (result.response) {
          // Simple generation
          get().addMessage({
            role: 'assistant',
            content: result.response.content || result.response.error || 'No response',
            operations: result.response.operations,
          });
          
          if (result.response.error) {
            set({ lastError: result.response.error });
          } else if (result.response.operations.length > 0) {
            get().setPreviewOperations(result.response.operations);
          }
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        set({ lastError: error });
        get().addMessage({
          role: 'assistant',
          content: `Error: ${error}`,
        });
      } finally {
        set({ isGenerating: false });
      }
    },
  }))
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectIsConfigured = (state: AIStoreState) => state.isConfigured;
export const selectIsGenerating = (state: AIStoreState) => state.isGenerating;
export const selectMessages = (state: AIStoreState) => state.messages;
export const selectStreamingText = (state: AIStoreState) => state.streamingText;
export const selectPreviewOperations = (state: AIStoreState) => state.previewOperations;
export const selectHasPreview = (state: AIStoreState) => state.isPreviewActive;
export const selectLastError = (state: AIStoreState) => state.lastError;
export const selectCurrentPlan = (state: AIStoreState) => state.currentPlan;
export const selectPlanProgress = (state: AIStoreState) => state.planProgress;
export const selectCurrentPhase = (state: AIStoreState) => state.currentPhase;
export const selectIsPlanExecuting = (state: AIStoreState) => state.isPlanExecuting;
export const selectMaxNodesPerPhase = (state: AIStoreState) => state.maxNodesPerPhase;

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for AI panel state
 */
export function useAIPanel() {
  const isConfigured = useAIStore(selectIsConfigured);
  const isGenerating = useAIStore(selectIsGenerating);
  const messages = useAIStore(selectMessages);
  const streamingText = useAIStore(selectStreamingText);
  const hasPreview = useAIStore(selectHasPreview);
  const previewOperations = useAIStore(selectPreviewOperations);
  const lastError = useAIStore(selectLastError);
  
  // Planning state
  const currentPlan = useAIStore(selectCurrentPlan);
  const planProgress = useAIStore(selectPlanProgress);
  const currentPhase = useAIStore(selectCurrentPhase);
  const isPlanExecuting = useAIStore(selectIsPlanExecuting);
  const maxNodesPerPhase = useAIStore(selectMaxNodesPerPhase);
  
  const sendMessage = useAIStore(state => state.sendMessage);
  const sendMessageWithPlanning = useAIStore(state => state.sendMessageWithPlanning);
  const applyPreview = useAIStore(state => state.applyPreview);
  const clearPreview = useAIStore(state => state.clearPreview);
  const clearMessages = useAIStore(state => state.clearMessages);
  const setApiKey = useAIStore(state => state.setApiKey);
  const setProvider = useAIStore(state => state.setProvider);
  const cancelGeneration = useAIStore(state => state.cancelGeneration);
  
  // Planning actions
  const setMaxNodesPerPhase = useAIStore(state => state.setMaxNodesPerPhase);
  const executeNextPhase = useAIStore(state => state.executeNextPhase);
  const executeAllPhases = useAIStore(state => state.executeAllPhases);
  const cancelPlan = useAIStore(state => state.cancelPlan);
  const clearPlan = useAIStore(state => state.clearPlan);
  
  return {
    isConfigured,
    isGenerating,
    messages,
    streamingText,
    hasPreview,
    previewOperations,
    lastError,
    sendMessage,
    sendMessageWithPlanning,
    applyPreview,
    clearPreview,
    clearMessages,
    setApiKey,
    setProvider,
    cancelGeneration,
    // Planning
    currentPlan,
    planProgress,
    currentPhase,
    isPlanExecuting,
    maxNodesPerPhase,
    setMaxNodesPerPhase,
    executeNextPhase,
    executeAllPhases,
    cancelPlan,
    clearPlan,
  };
}
