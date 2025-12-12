// AI Agent - Main Orchestrator
// Coordinates AI generation, parsing, validation, and execution

import { useGraphStore } from '@core/store';
import type { 
  AIAgentConfig, 
  GenerationResponse,
  CanvasOperation,
  ChatMessage,
} from './types';
import { buildCanvasContext, getDefaultConstraints } from './context-builder';
import { getSystemPrompt, buildPrompt } from './prompts';
import { parseAIResponse, validateOperations, summarizeOperations } from './parser';
import { applyOperations, previewOperations, type ApplyResult, type PreviewChange } from './operations';
import { 
  needsPlanning, 
  createPlan, 
  getNextPhase, 
  isPlanComplete,
  type CompositionPlan,
  type CompositionPhase 
} from './planner';

// ============================================================================
// AI AGENT CLASS
// ============================================================================

export class AIAgent {
  private config: AIAgentConfig | null = null;
  private conversationHistory: ChatMessage[] = [];
  private abortController: AbortController | null = null;
  private currentPlan: CompositionPlan | null = null;
  private completedPhases: number[] = [];
  private maxNodesPerPhase: number = 30;  // Increased from 20
  
  /**
   * Configure the AI agent
   */
  configure(config: AIAgentConfig): void {
    this.config = config;
  }
  
  /**
   * Check if agent is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.apiKey;
  }
  
  /**
   * Get current configuration
   */
  getConfig(): AIAgentConfig | null {
    return this.config;
  }
  
  /**
   * Clear configuration
   */
  clearConfig(): void {
    this.config = null;
  }
  
  /**
   * Generate canvas operations from a prompt
   */
  async generate(prompt: string): Promise<GenerationResponse> {
    if (!this.config) {
      return {
        content: '',
        operations: [],
        error: 'AI Agent not configured. Please set up API credentials.',
      };
    }
    
    // Build context
    const context = buildCanvasContext();
    const constraints = getDefaultConstraints(this.maxNodesPerPhase);
    
    // Build full prompt
    const fullPrompt = buildPrompt(prompt, context, constraints);
    
    // Add user message to history
    this.addToHistory({
      role: 'user',
      content: prompt,
    });
    
    try {
      // Call AI provider
      const response = await this.callProvider(fullPrompt);
      
      // Parse response
      const parsed = parseAIResponse(response);
      
      // Add assistant response to history
      this.addToHistory({
        role: 'assistant',
        content: parsed.content,
        operations: parsed.operations,
      });
      
      return parsed;
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      return {
        content: '',
        operations: [],
        error,
      };
    }
  }
  
  /**
   * Validate operations before applying
   */
  validate(operations: CanvasOperation[]): { valid: boolean; errors: string[]; warnings: string[] } {
    const store = useGraphStore.getState();
    const existingNodeIds = new Set<string>();
    const existingEdgeIds = new Set<string>();
    
    store.nodes.forEach((_, id) => existingNodeIds.add(id));
    store.edges.forEach((_, id) => existingEdgeIds.add(id));
    
    const result = validateOperations(operations, existingNodeIds, existingEdgeIds);
    
    return {
      valid: result.valid,
      errors: result.errors.map(e => e.message),
      warnings: result.warnings.map(w => w.message),
    };
  }
  
  /**
   * Preview what operations would do
   */
  preview(operations: CanvasOperation[]): PreviewChange[] {
    return previewOperations(operations);
  }
  
  /**
   * Apply operations to canvas
   */
  apply(operations: CanvasOperation[]): ApplyResult {
    return applyOperations(operations);
  }
  
  /**
   * Generate and apply in one step
   */
  async generateAndApply(prompt: string): Promise<{
    response: GenerationResponse;
    result?: ApplyResult;
  }> {
    const response = await this.generate(prompt);
    
    if (response.error || response.operations.length === 0) {
      return { response };
    }
    
    const validation = this.validate(response.operations);
    if (!validation.valid) {
      return {
        response: {
          ...response,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        },
      };
    }
    
    const result = this.apply(response.operations);
    return { response, result };
  }
  
  /**
   * Generate with automatic planning for complex compositions
   * Returns a plan if complexity is detected, otherwise generates immediately
   */
  async generateWithPlanning(prompt: string): Promise<{
    plan?: CompositionPlan;
    response?: GenerationResponse;
    result?: ApplyResult;
    needsPhases: boolean;
  }> {
    const context = buildCanvasContext();
    
    // Check if this needs multi-phase planning
    if (needsPlanning(prompt, context)) {
      const plan = createPlan(prompt, context, this.maxNodesPerPhase);
      this.currentPlan = plan;
      this.completedPhases = [];
      
      return {
        plan,
        needsPhases: true,
      };
    }
    
    // Simple generation
    const { response, result } = await this.generateAndApply(prompt);
    return { response, result, needsPhases: false };
  }
  
  /**
   * Execute the next phase of the current plan
   */
  async executeNextPhase(): Promise<{
    phase?: CompositionPhase;
    response?: GenerationResponse;
    result?: ApplyResult;
    complete: boolean;
    error?: string;
  }> {
    if (!this.currentPlan) {
      return {
        complete: false,
        error: 'No plan in progress',
      };
    }
    
    // Check if plan is complete
    if (isPlanComplete(this.currentPlan, this.completedPhases)) {
      return { complete: true };
    }
    
    // Get next phase
    const phase = getNextPhase(this.currentPlan, this.completedPhases);
    if (!phase) {
      return {
        complete: false,
        error: 'No executable phase found (dependencies not met)',
      };
    }
    
    // Execute phase with its specific prompt and constraints
    const context = buildCanvasContext();
    const fullPrompt = buildPrompt(phase.prompt, context, phase.constraints);
    
    this.addToHistory({
      role: 'user',
      content: phase.prompt,
    });
    
    try {
      const aiResponse = await this.callProvider(fullPrompt);
      const parsed = parseAIResponse(aiResponse);
      
      this.addToHistory({
        role: 'assistant',
        content: parsed.content,
        operations: parsed.operations,
      });
      
      // Validate and apply
      if (parsed.operations.length > 0) {
        const validation = this.validate(parsed.operations);
        if (!validation.valid) {
          return {
            phase,
            response: {
              ...parsed,
              error: `Validation failed: ${validation.errors.join(', ')}`,
            },
            complete: false,
          };
        }
        
        const result = this.apply(parsed.operations);
        
        // Mark phase as complete
        this.completedPhases.push(phase.id);
        
        return {
          phase,
          response: parsed,
          result,
          complete: isPlanComplete(this.currentPlan, this.completedPhases),
        };
      }
      
      return {
        phase,
        response: parsed,
        complete: false,
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      return {
        phase,
        response: {
          content: '',
          operations: [],
          error,
        },
        complete: false,
      };
    }
  }
  
  /**
   * Execute all phases of the current plan automatically
   */
  async executeAllPhases(
    onPhaseComplete?: (phase: CompositionPhase, result?: ApplyResult) => void
  ): Promise<{
    completedPhases: number;
    totalPhases: number;
    errors: string[];
  }> {
    if (!this.currentPlan) {
      return {
        completedPhases: 0,
        totalPhases: 0,
        errors: ['No plan in progress'],
      };
    }
    
    const errors: string[] = [];
    const totalPhases = this.currentPlan.phases.length;
    let attempts = 0;
    const maxAttempts = totalPhases * 2; // Prevent infinite loops
    
    while (!isPlanComplete(this.currentPlan, this.completedPhases) && attempts < maxAttempts) {
      attempts++;
      
      const phaseResult = await this.executeNextPhase();
      
      if (phaseResult.error) {
        errors.push(phaseResult.error);
        break;
      }
      
      if (phaseResult.phase && onPhaseComplete) {
        onPhaseComplete(phaseResult.phase, phaseResult.result);
      }
      
      if (phaseResult.response?.error) {
        errors.push(`Phase ${phaseResult.phase?.name}: ${phaseResult.response.error}`);
      }
    }
    
    return {
      completedPhases: this.completedPhases.length,
      totalPhases,
      errors,
    };
  }
  
  /**
   * Get current plan status
   */
  getPlanStatus(): {
    plan: CompositionPlan | null;
    completedPhases: number[];
    progress: number;
  } | null {
    if (!this.currentPlan) return null;
    
    return {
      plan: this.currentPlan,
      completedPhases: [...this.completedPhases],
      progress: this.completedPhases.length / this.currentPlan.phases.length,
    };
  }
  
  /**
   * Clear current plan
   */
  clearPlan(): void {
    this.currentPlan = null;
    this.completedPhases = [];
  }
  
  /**
   * Set maximum nodes per phase for planning
   */
  setMaxNodesPerPhase(max: number): void {
    this.maxNodesPerPhase = Math.max(10, Math.min(max, 50));
  }
  
  /**
   * Cancel ongoing generation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
  
  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }
  
  /**
   * Get a summary of operations
   */
  summarize(operations: CanvasOperation[]): string {
    return summarizeOperations(operations);
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private addToHistory(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    this.conversationHistory.push({
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    
    // Keep last 20 messages for context
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }
  
  private async callProvider(prompt: string): Promise<string> {
    if (!this.config) throw new Error('Not configured');
    
    this.abortController = new AbortController();
    
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(prompt);
      case 'anthropic':
        return this.callAnthropic(prompt);
      case 'gemini':
        return this.callGemini(prompt);
      case 'openrouter':
      case 'openrouter-free':
        return this.callOpenRouter(prompt);
      case 'ollama':
        return this.callOllama(prompt);
      case 'lmstudio':
        return this.callLMStudio(prompt);
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }
  
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.config) throw new Error('Not configured');
    
    const messages = [
      { role: 'system', content: getSystemPrompt() },
      ...this.conversationHistory.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: prompt },
    ];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      signal: this.abortController?.signal,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
  
  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.config) throw new Error('Not configured');
    
    const messages = this.conversationHistory.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    messages.push({ role: 'user', content: prompt });
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: getSystemPrompt(),
        messages,
      }),
      signal: this.abortController?.signal,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }
    
    const data = await response.json();
    return data.content[0]?.text || '';
  }
  
  private async callGemini(prompt: string): Promise<string> {
    if (!this.config) throw new Error('Not configured');
    
    const systemInstruction = getSystemPrompt();
    
    // Build conversation contents for Gemini format
    const contents = this.conversationHistory.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            maxOutputTokens: this.config.maxTokens,
            temperature: this.config.temperature,
          },
        }),
        signal: this.abortController?.signal,
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  
  private async callOpenRouter(prompt: string): Promise<string> {
    if (!this.config) throw new Error('Not configured');
    
    const messages = [
      { role: 'system', content: getSystemPrompt() },
      ...this.conversationHistory.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: prompt },
    ];
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AIGA Canvas Generator',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      signal: this.abortController?.signal,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
  
  private async callOllama(prompt: string): Promise<string> {
    if (!this.config) throw new Error('Not configured');
    
    const baseUrl = this.config.baseUrl || 'http://localhost:11434/api';
    
    const messages = [
      { role: 'system', content: getSystemPrompt() },
      ...this.conversationHistory.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: prompt },
    ];
    
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: false,
      }),
      signal: this.abortController?.signal,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }
    
    const data = await response.json();
    return data.message?.content || '';
  }
  
  private async callLMStudio(prompt: string): Promise<string> {
    if (!this.config) throw new Error('Not configured');
    
    const baseUrl = this.config.baseUrl || 'http://localhost:1234/v1';
    
    // LM Studio uses OpenAI-compatible API
    const messages = [
      { role: 'system', content: getSystemPrompt() },
      ...this.conversationHistory.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: prompt },
    ];
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      signal: this.abortController?.signal,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LM Studio API error: ${error}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Global AI agent instance */
export const aiAgent = new AIAgent();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick generate and apply
 */
export async function generatePatch(prompt: string): Promise<ApplyResult | null> {
  const { result } = await aiAgent.generateAndApply(prompt);
  return result || null;
}

/**
 * Check if AI is ready
 */
export function isAIReady(): boolean {
  return aiAgent.isConfigured();
}
