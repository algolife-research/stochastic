// AI Panel - Chat Interface for AI Canvas Generation
// React component for interacting with the AI agent

import React, { useState, useRef, useEffect } from 'react';
import { useAIPanel } from '@ai/store';
import { summarizeOperations } from '@ai/parser';
import { getContextSuggestions } from '@ai/prompts';
import { buildCanvasContext } from '@ai/context-builder';
import { createSimplePatch, applyOperations } from '@ai/operations';
import type { ChatMessage, AIProvider, CanvasOperation } from '@ai/types';
import { PROVIDER_INFO } from '@ai/types';
import styles from './AIPanel.module.css';

// ============================================================================
// AI PANEL COMPONENT
// ============================================================================

interface AIPanelProps {
  embedded?: boolean;
}

export function AIPanel({ embedded = false }: AIPanelProps): React.ReactElement {
  const {
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
  } = useAIPanel();
  
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(!isConfigured);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle send
  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input.trim());
    setInput('');
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Get suggestions based on current context
  const suggestions = getContextSuggestions(buildCanvasContext());
  
  return (
    <div className={`${styles.panel} ${embedded ? styles.embedded : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>🤖 AI Assistant</span>
        <div className={styles.headerActions}>
          <button 
            className={styles.iconButton}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            className={styles.iconButton}
            onClick={clearMessages}
            title="Clear Chat"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          onClose={() => setShowSettings(false)}
          setProvider={setProvider}
          isConfigured={isConfigured}
        />
      )}
      
      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <WelcomeMessage suggestions={suggestions} onSelect={setInput} />
        ) : (
          messages.map((msg: ChatMessage) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        
        {/* Loading indicator */}
        {isGenerating && (
          <div className={styles.loading}>
            <span className={styles.loadingDot}>●</span>
            <span className={styles.loadingDot}>●</span>
            <span className={styles.loadingDot}>●</span>
          </div>
        )}
        
        {/* Error */}
        {lastError && (
          <div className={styles.error}>
            ⚠️ {lastError}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Preview Actions */}
      {hasPreview && (
        <PreviewBar 
          operations={previewOperations}
          onApply={applyPreview}
          onCancel={clearPreview}
        />
      )}
      
      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConfigured ? "Describe what you want to create..." : "Configure AI first..."}
          disabled={!isConfigured || isGenerating}
          rows={2}
        />
        <button 
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!isConfigured || isGenerating || !input.trim()}
        >
          {isGenerating ? '⏳' : '➤'}
        </button>
      </div>
      
      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SettingsPanelProps {
  onClose: () => void;
  setProvider: (provider: AIProvider, apiKey: string) => void;
  isConfigured: boolean;
}

function SettingsPanel({ onClose, setProvider, isConfigured }: SettingsPanelProps): React.ReactElement {
  const [provider, setProviderState] = useState<AIProvider>('openrouter');
  const [apiKey, setApiKey] = useState('');
  
  const providerInfo = PROVIDER_INFO[provider];
  
  const handleSave = () => {
    // Local providers don't need API key
    if (!providerInfo.requiresKey || apiKey.trim()) {
      setProvider(provider, apiKey.trim());
      onClose();
    }
  };
  
  return (
    <div className={styles.settings}>
      <h4>AI Configuration</h4>
      
      <label className={styles.label}>
        Provider
        <select 
          value={provider} 
          onChange={e => setProviderState(e.target.value as AIProvider)}
          className={styles.select}
        >
          <optgroup label="⭐ Free (API Key Required)">
            <option value="openrouter-free">OpenRouter Free (Devstral)</option>
            <option value="gemini">Google Gemini 2.5 Pro</option>
          </optgroup>
          <optgroup label="☁️ Paid (API Key Required)">
            <option value="openrouter">OpenRouter (Claude, GPT-4, etc.)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT-4)</option>
          </optgroup>
          <optgroup label="💻 Local (No API Key)">
            <option value="ollama">Ollama</option>
            <option value="lmstudio">LM Studio</option>
          </optgroup>
        </select>
      </label>
      
      {providerInfo.requiresKey && (
        <label className={styles.label}>
          API Key
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Enter API key..."
            className={styles.apiKeyInput}
          />
        </label>
      )}
      
      <div className={styles.settingsActions}>
        <button onClick={onClose} className={styles.secondaryButton}>Cancel</button>
        <button 
          onClick={handleSave} 
          className={styles.primaryButton}
          disabled={providerInfo.requiresKey && !apiKey.trim()}
        >
          {isConfigured ? 'Update' : 'Save'}
        </button>
      </div>
      
      <p className={styles.hint}>
        {providerInfo.hint}
      </p>
    </div>
  );
}

interface WelcomeMessageProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

function WelcomeMessage({ suggestions, onSelect }: WelcomeMessageProps): React.ReactElement {
  return (
    <div className={styles.welcome}>
      <h3>👋 Welcome to AI Canvas</h3>
      <p>Describe what you want to create and I'll help build it on the canvas.</p>
      
      <div className={styles.suggestions}>
        <span className={styles.suggestionsLabel}>Try:</span>
        {suggestions.map((s, i) => (
          <button 
            key={i} 
            className={styles.suggestion}
            onClick={() => onSelect(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps): React.ReactElement {
  const isUser = message.role === 'user';
  
  return (
    <div className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}>
      <div className={styles.messageContent}>
        {message.content}
      </div>
      
      {message.operations && message.operations.length > 0 && (
        <div className={styles.operations}>
          📦 {summarizeOperations(message.operations)}
          {message.applied && <span className={styles.applied}>✓ Applied</span>}
        </div>
      )}
    </div>
  );
}

interface PreviewBarProps {
  operations: CanvasOperation[];
  onApply: () => void;
  onCancel: () => void;
}

function PreviewBar({ operations, onApply, onCancel }: PreviewBarProps): React.ReactElement {
  return (
    <div className={styles.preview}>
      <span className={styles.previewText}>
        Preview: {summarizeOperations(operations)}
      </span>
      <div className={styles.previewActions}>
        <button onClick={onCancel} className={styles.cancelButton}>
          ✕ Cancel
        </button>
        <button onClick={onApply} className={styles.applyButton}>
          ✓ Apply
        </button>
      </div>
    </div>
  );
}

function QuickActions(): React.ReactElement {
  const handleQuickPatch = (type: 'bass' | 'lead' | 'pad' | 'arp') => {
    const context = buildCanvasContext();
    const startX = context.nodes.length > 0 
      ? Math.max(...context.nodes.map((n: { x: number }) => n.x)) + 200 
      : 200;
    const startY = context.nodes.length > 0
      ? context.nodes[0]?.y ?? 200
      : 200;
    
    const operations = createSimplePatch(type, startX, startY);
    applyOperations(operations);
  };
  
  return (
    <div className={styles.quickActions}>
      <span className={styles.quickLabel}>Quick:</span>
      <button onClick={() => handleQuickPatch('bass')} title="Create bass patch">🎸</button>
      <button onClick={() => handleQuickPatch('lead')} title="Create lead patch">🎹</button>
      <button onClick={() => handleQuickPatch('pad')} title="Create pad patch">🌊</button>
      <button onClick={() => handleQuickPatch('arp')} title="Create arpeggiator">🎼</button>
    </div>
  );
}

export default AIPanel;
