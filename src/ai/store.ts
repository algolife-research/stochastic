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
import { DEFAULT_CONFIGS } from './types';
import { aiAgent } from './agent';
import { applyOperations } from './operations';
import { useAuthStore } from '@auth/store';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Read config from environment (set in .env file)
const ENV_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const ENV_MODEL = import.meta.env.VITE_AI_MODEL as string | undefined;

// Check if AI is pre-configured via environment
function getEnvConfig(): AIAgentConfig | null {
  if (!ENV_API_KEY) return null;
  
  const defaults = DEFAULT_CONFIGS['openrouter'];
  return {
    provider: 'openrouter',
    apiKey: ENV_API_KEY,
    model: ENV_MODEL || defaults.model || 'anthropic/claude-sonnet-4',
    maxTokens: defaults.maxTokens || 4096,
    temperature: defaults.temperature || 0.7,
    baseUrl: defaults.baseUrl,
  };
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AIStoreState extends AIAgentState {
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
  
  // High-level actions
  sendMessage: (prompt: string) => Promise<void>;
  cancelGeneration: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

// Try to initialize from environment
const envConfig = getEnvConfig();

const initialState: AIAgentState = {
  config: envConfig,
  isConfigured: !!envConfig,
  messages: [],
  isGenerating: false,
  streamingText: '',
  previewOperations: [],
  isPreviewActive: false,
  lastError: null,
};

// If we have env config, configure the agent immediately
if (envConfig) {
  aiAgent.configure(envConfig);
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
      const defaults = DEFAULT_CONFIGS['openrouter'];
      const config: AIAgentConfig = {
        provider: 'openrouter',
        apiKey,
        model: ENV_MODEL || defaults.model || 'anthropic/claude-sonnet-4',
        maxTokens: defaults.maxTokens || 4096,
        temperature: defaults.temperature || 0.7,
        baseUrl: defaults.baseUrl,
      };
      get().setConfig(config);
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
  
  const sendMessage = useAIStore(state => state.sendMessage);
  const applyPreview = useAIStore(state => state.applyPreview);
  const clearPreview = useAIStore(state => state.clearPreview);
  const clearMessages = useAIStore(state => state.clearMessages);
  const setApiKey = useAIStore(state => state.setApiKey);
  const setProvider = useAIStore(state => state.setProvider);
  const cancelGeneration = useAIStore(state => state.cancelGeneration);
  
  return {
    isConfigured,
    isGenerating,
    messages,
    streamingText,
    hasPreview,
    previewOperations,
    lastError,
    sendMessage,
    applyPreview,
    clearPreview,
    clearMessages,
    setApiKey,
    setProvider,
    cancelGeneration,
  };
}
