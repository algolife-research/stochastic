// AI Agent - Zustand Store Slice
// State management for AI agent

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  AIAgentConfig, 
  AIAgentState, 
  ChatMessage, 
  CanvasOperation,
  AIProvider,
} from './types';
import { DEFAULT_CONFIGS } from './types';
import { aiAgent } from './agent';
import { applyOperations } from './operations';

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AIStoreState extends AIAgentState {
  // Actions
  setConfig: (config: AIAgentConfig) => void;
  setProvider: (provider: AIProvider, apiKey: string) => void;
  clearConfig: () => void;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  
  setGenerating: (generating: boolean) => void;
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

const initialState: AIAgentState = {
  config: null,
  isConfigured: false,
  messages: [],
  isGenerating: false,
  previewOperations: [],
  isPreviewActive: false,
  lastError: null,
};

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
    
    setProvider: (provider: AIProvider, apiKey: string) => {
      const defaults = DEFAULT_CONFIGS[provider];
      const config: AIAgentConfig = {
        provider,
        apiKey,
        model: defaults.model || 'gpt-4o',
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
      
      // Add user message
      get().addMessage({
        role: 'user',
        content: prompt,
      });
      
      // Start generating
      set({ isGenerating: true, lastError: null });
      
      try {
        const response = await aiAgent.generate(prompt);
        
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
        set({ lastError: error });
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
  const hasPreview = useAIStore(selectHasPreview);
  const previewOperations = useAIStore(selectPreviewOperations);
  const lastError = useAIStore(selectLastError);
  
  const sendMessage = useAIStore(state => state.sendMessage);
  const applyPreview = useAIStore(state => state.applyPreview);
  const clearPreview = useAIStore(state => state.clearPreview);
  const clearMessages = useAIStore(state => state.clearMessages);
  const setProvider = useAIStore(state => state.setProvider);
  const cancelGeneration = useAIStore(state => state.cancelGeneration);
  
  return {
    isConfigured,
    isGenerating,
    messages,
    hasPreview,
    previewOperations,
    lastError,
    sendMessage,
    applyPreview,
    clearPreview,
    clearMessages,
    setProvider,
    cancelGeneration,
  };
}
