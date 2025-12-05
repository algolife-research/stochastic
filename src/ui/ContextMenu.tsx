// Phonon v2 - Context Menu Component

import React, { useEffect, useRef, useState } from 'react';
import { getGraphStore } from '@core/store';
import type { NodeType, NodeId } from '@core/types';
import styles from './ContextMenu.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'canvas' | 'node' | 'edge' | 'addFromEdge';
  targetId?: NodeId | string | undefined;
  worldX?: number | undefined;
  worldY?: number | undefined;
}

// ============================================================================
// NODE TYPE MENU ITEMS
// ============================================================================

const NODE_TYPES: Array<{ type: NodeType; label: string; icon: string }> = [
  { type: 'source', label: 'Source', icon: '◉' },
  { type: 'speaker', label: 'Speaker', icon: '🔊' },
  { type: 'pitch', label: 'Pitch', icon: '♯' },
  { type: 'polariser', label: 'Polariser', icon: '∿' },
  { type: 'filter', label: 'Filter', icon: '▼' },
  { type: 'gate', label: 'Gate', icon: '⚡' },
  { type: 'delay', label: 'Delay', icon: '⏱' },
  { type: 'gain', label: 'Gain', icon: '⬆' },
  { type: 'noise', label: 'Noise', icon: '▒' },
  { type: 'harmonic', label: 'Harmonic', icon: '∞' },
  { type: 'modulator', label: 'Modulator', icon: '⟳' },
  { type: 'teleporter', label: 'Teleporter', icon: '⊚' },
  { type: 'quantizer', label: 'Quantizer', icon: '♫' },
  { type: 'tunnel', label: 'Tunnel', icon: '▭' },
];

// ============================================================================
// CONTEXT MENU COMPONENT
// ============================================================================

export function ContextMenu(): React.ReactElement | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: 'canvas',
  });
  const [showAddSubmenu, setShowAddSubmenu] = useState(false);
  
  // Listen for context menu events
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      
      const store = getGraphStore();
      const canvas = e.target as HTMLCanvasElement;
      if (!canvas.classList.contains('phonon-canvas')) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { viewport } = store;
      const worldX = (screenX - viewport.panOffset.x) / viewport.zoomLevel;
      const worldY = (screenY - viewport.panOffset.y) / viewport.zoomLevel;
      
      // Check if clicking on a node
      let foundNode: NodeId | undefined;
      store.nodes.forEach((node, id) => {
        const dx = node.x - worldX;
        const dy = node.y - worldY;
        if (Math.sqrt(dx * dx + dy * dy) <= 25) {
          foundNode = id;
        }
      });
      
      // Check if clicking on an edge
      let foundEdge: string | undefined;
      if (!foundNode) {
        store.edges.forEach((edge, id) => {
          const fromNode = store.nodes.get(edge.from);
          const toNode = store.nodes.get(edge.to);
          if (fromNode && toNode) {
            const dist = distToSegment(worldX, worldY, fromNode.x, fromNode.y, toNode.x, toNode.y);
            if (dist < 10) {
              foundEdge = id;
            }
          }
        });
      }
      
      // Determine menu type
      let menuType: 'canvas' | 'node' | 'edge' = 'canvas';
      let targetId: NodeId | string | undefined;
      
      if (foundNode) {
        menuType = 'node';
        targetId = foundNode;
        store.selectNode(foundNode);
      } else if (foundEdge) {
        menuType = 'edge';
        targetId = foundEdge;
        store.selectEdge(foundEdge as never);
      }
      
      // Position menu
      setState({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        type: menuType,
        targetId,
        worldX,
        worldY,
      });
      setShowAddSubmenu(false);
    };
    
    // Handle edge drop event (when link dropped on empty canvas)
    const handleAddMenu = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number }>;
      const store = getGraphStore();
      
      // Get world position from store context menu pos
      const worldX = store.contextMenuPos?.x ?? 0;
      const worldY = store.contextMenuPos?.y ?? 0;
      
      setState({
        visible: true,
        x: customEvent.detail.x,
        y: customEvent.detail.y,
        type: 'addFromEdge',
        worldX,
        worldY,
      });
      setShowAddSubmenu(true);
    };
    
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Clear pending link when closing menu
        const store = getGraphStore();
        store.setPendingLinkNode(null);
        store.setContextMenuPos(null, null);
        
        setState(s => ({ ...s, visible: false }));
        setShowAddSubmenu(false);
      }
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    window.addEventListener('phonon-show-add-menu', handleAddMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('phonon-show-add-menu', handleAddMenu);
    };
  }, []);
  
  // Actions
  const handleAddNode = (type: NodeType) => {
    const store = getGraphStore();
    
    let worldX: number;
    let worldY: number;
    
    // Use saved world coordinates if available (for addFromEdge)
    if (state.worldX !== undefined && state.worldY !== undefined) {
      worldX = state.worldX;
      worldY = state.worldY;
    } else {
      // Convert menu position to world coordinates
      const canvas = document.querySelector('.phonon-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      
      const { viewport } = store;
      const rect = canvas.getBoundingClientRect();
      const screenX = state.x - rect.left;
      const screenY = state.y - rect.top;
      worldX = (screenX - viewport.panOffset.x) / viewport.zoomLevel;
      worldY = (screenY - viewport.panOffset.y) / viewport.zoomLevel;
    }
    
    const newNodeId = store.addNode(type, worldX, worldY);
    store.selectNode(newNodeId);
    
    // Create edge from pending link node if this is addFromEdge
    if (state.type === 'addFromEdge' && store.pendingLinkNodeId) {
      store.addEdge(store.pendingLinkNodeId, newNodeId);
      store.setPendingLinkNode(null);
      store.setContextMenuPos(null, null);
    }
    
    setState(s => ({ ...s, visible: false }));
    setShowAddSubmenu(false);
  };
  
  const handleLink = () => {
    const store = getGraphStore();
    if (state.targetId) {
      store.setLinkingFrom(state.targetId as NodeId);
    }
    setState(s => ({ ...s, visible: false }));
  };
  
  const handleDuplicate = () => {
    const store = getGraphStore();
    if (state.targetId) {
      const node = store.getNode(state.targetId as NodeId);
      if (node) {
        const newId = store.addNode(node.type, node.x + 50, node.y + 50);
        store.updateNodeProps(newId, { ...node.props });
        store.selectNode(newId);
      }
    }
    setState(s => ({ ...s, visible: false }));
  };
  
  const handleDelete = () => {
    const store = getGraphStore();
    if (state.type === 'node' && state.targetId) {
      store.deleteNode(state.targetId as NodeId);
    } else if (state.type === 'edge' && state.targetId) {
      store.deleteEdge(state.targetId as never);
    }
    setState(s => ({ ...s, visible: false }));
  };
  
  const handleGroupIntoTunnel = () => {
    const store = getGraphStore();
    // If right-clicking on a node that's not already selected, select it first
    if (state.targetId && !store.selection.selectedNodeIds.includes(state.targetId as NodeId)) {
      store.selectNode(state.targetId as NodeId);
    }
    // Group selected nodes
    if (store.selection.selectedNodeIds.length > 0) {
      store.groupSelectedNodes();
    }
    setState(s => ({ ...s, visible: false }));
  };
  
  if (!state.visible) return null;
  
  // Adjust position to stay on screen
  let menuX = state.x;
  let menuY = state.y;
  
  return (
    <div 
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: menuX, top: menuY }}
    >
      {state.type === 'canvas' && (
        <>
          <div 
            className={styles.menuItem}
            onMouseEnter={() => setShowAddSubmenu(true)}
          >
            Add Node ▸
            {showAddSubmenu && (
              <div className={styles.submenu}>
                {NODE_TYPES.map(({ type, label, icon }) => (
                  <div 
                    key={type}
                    className={styles.menuItem}
                    onClick={() => handleAddNode(type)}
                  >
                    <span className={styles.icon}>{icon}</span> {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      
      {state.type === 'node' && (
        <>
          <div className={styles.menuItem} onClick={handleLink}>
            🔗 Link
          </div>
          <div className={styles.menuItem} onClick={handleDuplicate}>
            📋 Duplicate
          </div>
          <div className={styles.menuItem} onClick={handleGroupIntoTunnel}>
            📦 Group into Tunnel (Ctrl+G)
          </div>
          <div className={styles.divider} />
          <div className={styles.menuItem + ' ' + styles.danger} onClick={handleDelete}>
            🗑️ Delete
          </div>
        </>
      )}
      
      {state.type === 'edge' && (
        <>
          <div className={styles.menuItem + ' ' + styles.danger} onClick={handleDelete}>
            🗑️ Delete Edge
          </div>
        </>
      )}
      
      {state.type === 'addFromEdge' && (
        <>
          <div className={styles.menuItem} style={{ fontWeight: 600, color: '#888' }}>
            Add connected node:
          </div>
          <div className={styles.divider} />
          {NODE_TYPES.map(({ type, label, icon }) => (
            <div 
              key={type}
              className={styles.menuItem}
              onClick={() => handleAddNode(type)}
            >
              <span className={styles.icon}>{icon}</span> {label}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// Helper function
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = px - xx;
  const dy = py - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

export default ContextMenu;
