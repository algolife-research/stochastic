// LFO Module
// Handles LFO node updates and modulation

import { getGraphStore } from '../store';
import type { GraphNode } from '../types';

// ============================================================================
// LFO MODULATION
// ============================================================================

/**
 * Update LFO nodes - continuously modulate target node properties
 * LFOs directly update the target node's property value, affecting any packets
 * that pass through that node regardless of their source path.
 */
export function updateLFOs(now: number): void {
  const store = getGraphStore();
  
  store.nodes.forEach((node) => {
    if (node.type !== 'lfo') return;
    
    const props = node.props as {
      rate: number;
      shape: 'sine' | 'triangle' | 'square' | 'sawtooth';
      min: number;
      max: number;
      phase: number;
    };
    
    // Calculate current LFO value
    const rate = props.rate ?? 1;
    const shape = props.shape ?? 'sine';
    const min = props.min ?? 0;
    const max = props.max ?? 1;
    const phase = props.phase ?? 0;
    
    const t = (now / 1000) * rate + phase;
    
    let value: number;
    switch (shape) {
      case 'sine':
        value = (Math.sin(t * Math.PI * 2) + 1) / 2;
        break;
      case 'triangle':
        value = 1 - Math.abs((t % 1) * 2 - 1);
        break;
      case 'square':
        value = (t % 1) < 0.5 ? 1 : 0;
        break;
      case 'sawtooth':
        value = t % 1;
        break;
      default:
        value = 0.5;
    }
    
    // Map to min/max range
    const modulationValue = min + value * (max - min);
    
    // Get outgoing modulation edges and apply value directly to target nodes
    const outgoingEdges = store.getOutgoingEdges(node.id);
    
    outgoingEdges.forEach(edge => {
      if (edge.targetParam === null) return; // Skip audio edges
      
      const targetNode = store.nodes.get(edge.to);
      if (!targetNode) return;
      
      // Directly update the target node's property
      const currentProps = { ...targetNode.props } as Record<string, unknown>;
      currentProps[edge.targetParam] = modulationValue;
      store.updateNode(edge.to, { props: currentProps } as unknown as Partial<GraphNode>);
    });
    
    // Subtle visual feedback for LFO activity (every ~100ms)
    if (now - node.lastTrigger > 100) {
      store.updateNode(node.id, { 
        lastTrigger: now,
        flash: 0.2 
      } as Partial<GraphNode>);
    }
  });
}
