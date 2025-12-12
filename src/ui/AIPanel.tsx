// AI Panel - Chat Interface for AI Canvas Generation
// React component for interacting with the AI agent

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAIPanel } from '@ai/store';
import { useAuthStore } from '@auth/store';
import { useGraphStore } from '@core/store';
import { summarizeOperations } from '@ai/parser';
import { getContextSuggestions } from '@ai/prompts';
import { buildCanvasContext } from '@ai/context-builder';
import { applyOperations, createSimplePatch } from '@ai/operations';
import { COMPOSITION_TEMPLATES } from '@ai/templates';
import type { ChatMessage, CanvasOperation } from '@ai/types';
import type { CompositionPlan } from '@ai/planner';
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
    sendMessageWithPlanning,
    applyPreview,
    clearPreview,
    clearMessages,
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
  } = useAIPanel();
  
  const { user, isLoading: isAuthLoading, isInitialized: isAuthInitialized } = useAuthStore(state => ({ 
    user: state.user, 
    isLoading: state.isLoading,
    isInitialized: state.isInitialized 
  }));
  
  const [input, setInput] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [usePlanning, setUsePlanning] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track canvas state for memoization
  const nodeCount = useGraphStore(state => state.nodes.size);
  const edgeCount = useGraphStore(state => state.edges.size);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle send
  const handleSend = () => {
    if (!user) return;
    if (!input.trim() || isGenerating) return;
    // Use planning-aware send for potentially complex prompts
    if (usePlanning) {
      sendMessageWithPlanning(input.trim());
    } else {
      sendMessage(input.trim());
    }
    setInput('');
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle template selection
  const handleTemplateSelect = (templateName: string) => {
    const template = COMPOSITION_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      const context = buildCanvasContext();
      const startX = context.nodes.length > 0 
        ? Math.max(...context.nodes.map((n: { x: number }) => n.x)) + 200 
        : 200;
      const operations = template.generateOperations({ startX, startY: 200 });
      applyOperations(operations);
      setShowTemplates(false);
    }
  };
  
  // Get suggestions based on current context (memoized to avoid expensive buildCanvasContext on every render)
  const suggestions = useMemo(() => {
    const context = buildCanvasContext();
    return getContextSuggestions(context);
  }, [nodeCount, edgeCount]);
  
  return (
    <div className={`${styles.panel} ${embedded ? styles.embedded : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>🤖 Iannis</span>
        <div className={styles.headerActions}>
          <button 
            className={styles.iconButton}
            onClick={clearMessages}
            title="Clear Chat"
            disabled={!user}
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className={styles.messages}>
        {!isAuthInitialized && isAuthLoading ? (
          <div className={styles.loading}>
            <span className={styles.loadingDot}>●</span>
            <span className={styles.loadingDot}>●</span>
            <span className={styles.loadingDot}>●</span>
          </div>
        ) : !user ? (
          <div className={styles.welcome}>
            <h3>🔒 Login Required</h3>
            <p>Please log in to use Iannis.</p>
          </div>
        ) : messages.length === 0 ? (
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
      
      {/* Plan Execution Bar */}
      {currentPlan && (
        <PlanBar
          plan={currentPlan}
          progress={planProgress}
          currentPhase={currentPhase}
          isExecuting={isPlanExecuting || isGenerating}
          onExecuteNext={executeNextPhase}
          onExecuteAll={executeAllPhases}
          onCancel={cancelPlan}
          onClear={clearPlan}
        />
      )}
      
      {/* Input Container (for absolute positioning of templates) */}
      <div className={styles.inputContainer}>
        {/* Templates Panel */}
        {showTemplates && (
          <TemplatesPanel
            onSelect={handleTemplateSelect}
            onClose={() => setShowTemplates(false)}
          />
        )}
        
        {/* Input */}
        <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={!user ? "Please log in to use Iannis..." : (isConfigured ? "Describe what you want to create..." : "Configure AI first...")}
          disabled={!user || !isConfigured || isGenerating}
          rows={2}
        />
        <div className={styles.inputActions}>
          <button
            className={`${styles.iconButton} ${usePlanning ? styles.active : ''}`}
            onClick={() => setUsePlanning(!usePlanning)}
            title={usePlanning ? "Planning enabled (for complex compositions)" : "Planning disabled"}
            disabled={!user}
          >
            📋
          </button>
          <button
            className={styles.iconButton}
            onClick={() => setShowTemplates(!showTemplates)}
            title="Templates"
            disabled={!user}
          >
            📦
          </button>
          <button 
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!user || !isConfigured || isGenerating || !input.trim()}
          >
            {isGenerating ? '⏳' : '➤'}
          </button>
        </div>
      </div>
      </div>
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Advanced Settings */}
      <AdvancedSettings 
        maxNodesPerPhase={maxNodesPerPhase}
        onChangeMaxNodes={setMaxNodesPerPhase}
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

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
  const user = useAuthStore(state => state.user);
  
  const handleQuickPatch = (type: 'bass' | 'lead' | 'pad' | 'arp') => {
    if (!user) return;
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
      <button onClick={() => handleQuickPatch('bass')} title="Create bass patch" disabled={!user}>🎸</button>
      <button onClick={() => handleQuickPatch('lead')} title="Create lead patch" disabled={!user}>🎹</button>
      <button onClick={() => handleQuickPatch('pad')} title="Create pad patch" disabled={!user}>🌊</button>
      <button onClick={() => handleQuickPatch('arp')} title="Create arpeggiator" disabled={!user}>🎼</button>
    </div>
  );
}

// ============================================================================
// PLAN EXECUTION BAR
// ============================================================================

interface PlanBarProps {
  plan: CompositionPlan;
  progress: number;
  currentPhase: { id: number; name: string } | null;
  isExecuting: boolean;
  onExecuteNext: () => void;
  onExecuteAll: () => void;
  onCancel: () => void;
  onClear: () => void;
}

function PlanBar({ 
  plan, 
  progress, 
  currentPhase, 
  isExecuting, 
  onExecuteNext, 
  onExecuteAll, 
  onCancel, 
  onClear 
}: PlanBarProps): React.ReactElement {
  const isComplete = progress >= 1;
  
  return (
    <div className={styles.planBar}>
      <div className={styles.planHeader}>
        <span className={styles.planTitle}>
          📋 {plan.description}
        </span>
        <span className={styles.planComplexity}>
          {plan.complexity}
        </span>
      </div>
      
      <div className={styles.planProgress}>
        <div 
          className={styles.planProgressFill} 
          style={{ width: `${progress * 100}%` }}
        />
        <span className={styles.planProgressText}>
          {currentPhase 
            ? `Phase ${currentPhase.id}: ${currentPhase.name}` 
            : isComplete 
              ? 'Complete!' 
              : `${Math.round(progress * 100)}%`
          }
        </span>
      </div>
      
      <div className={styles.planActions}>
        {!isComplete && !isExecuting && (
          <>
            <button 
              onClick={onExecuteNext} 
              className={styles.secondaryButton}
              title="Execute next phase"
            >
              Step
            </button>
            <button 
              onClick={onExecuteAll} 
              className={styles.primaryButton}
              title="Execute all remaining phases"
            >
              Execute All
            </button>
          </>
        )}
        {isExecuting && (
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        )}
        {isComplete && (
          <button onClick={onClear} className={styles.secondaryButton}>
            Clear Plan
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATES PANEL
// ============================================================================

interface TemplatesPanelProps {
  onSelect: (templateName: string) => void;
  onClose: () => void;
}

function TemplatesPanel({ onSelect, onClose }: TemplatesPanelProps): React.ReactElement {
  return (
    <div className={styles.templatesPanel}>
      <div className={styles.templatesPanelHeader}>
        <span>📦 Templates</span>
        <button onClick={onClose} className={styles.iconButton}>✕</button>
      </div>
      <div className={styles.templatesList}>
        {COMPOSITION_TEMPLATES.map(template => (
          <button
            key={template.name}
            className={styles.templateItem}
            onClick={() => onSelect(template.name)}
          >
            <span className={styles.templateName}>{template.name}</span>
            <span className={styles.templateDesc}>{template.description}</span>
            <span className={styles.templateMeta}>
              ~{template.estimatedNodes} nodes • {template.complexity}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ADVANCED SETTINGS
// ============================================================================

interface AdvancedSettingsProps {
  maxNodesPerPhase: number;
  onChangeMaxNodes: (value: number) => void;
}

function AdvancedSettings({ maxNodesPerPhase, onChangeMaxNodes }: AdvancedSettingsProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isOpen) {
    return (
      <button 
        className={styles.advancedToggle}
        onClick={() => setIsOpen(true)}
      >
        Advanced ▾
      </button>
    );
  }
  
  return (
    <div className={styles.advancedSettings}>
      <div className={styles.advancedHeader}>
        <span>Advanced Settings</span>
        <button onClick={() => setIsOpen(false)} className={styles.iconButton}>▴</button>
      </div>
      <label className={styles.advancedLabel}>
        Max nodes per phase: {maxNodesPerPhase}
        <input
          type="range"
          min={10}
          max={50}
          value={maxNodesPerPhase}
          onChange={e => onChangeMaxNodes(parseInt(e.target.value))}
          className={styles.slider}
        />
      </label>
      <p className={styles.advancedHint}>
        Higher values allow larger compositions but may hit API limits.
      </p>
    </div>
  );
}

export default AIPanel;
