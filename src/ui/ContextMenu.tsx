// Stochastic v2 - Context Menu Component

import React, { useEffect, useRef, useState } from 'react';
import { getGraphStore } from '@core/store';
import type { NodeType, NodeId } from '@core/types';
import { 
  TUNNEL_PRESETS, 
  CATEGORY_LABELS, 
  CATEGORY_ICONS,
  type TunnelPresetCategory 
} from '@data/tunnel-presets';
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

interface EdgeInsertInfo {
  edgeId: string;
  fromNodeId: NodeId;
  toNodeId: NodeId;
}

// ============================================================================
// NODE TYPE CATEGORIES
// ============================================================================

interface NodeCategory {
  name: string;
  nodes: Array<{ type: NodeType; label: string; icon: string }>;
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: 'Basic',
    nodes: [
      { type: 'source', label: 'Source', icon: '◉' },
      { type: 'speaker', label: 'Speaker', icon: '🔊' },
      { type: 'pitch', label: 'Pitch', icon: '♯' },
    ]
  },
  {
    name: 'Sound',
    nodes: [
      { type: 'oscillator', label: 'Oscillator', icon: '∿' },
      { type: 'filter', label: 'Filter', icon: '▼' },
    ]
  },
  {
    name: 'Control',
    nodes: [
      { type: 'gate', label: 'Gate', icon: '⚡' },
      { type: 'delay', label: 'Delay', icon: '⏱' },
      { type: 'gain', label: 'Gain', icon: '⬆' },
      { type: 'quantizer', label: 'Quantizer', icon: '♫' },
      { type: 'splitter', label: 'Splitter', icon: '⋈' },
    ]
  },
  {
    name: 'Advanced',
    nodes: [
      { type: 'tunnel', label: 'Tunnel', icon: '▭' },
      { type: 'teleporter', label: 'Teleporter', icon: '⊚' },
      { type: 'modulator', label: 'Modulator', icon: '⟳' },
      { type: 'lfo', label: 'LFO', icon: '∿' },
      { type: 'scene_trigger', label: 'Scene Trigger', icon: '▶' },
    ]
  },
  {
    name: 'Evolution',
    nodes: [
      { type: 'mutator', label: 'Mutator', icon: '🧬' },
      { type: 'crossover', label: 'Crossover', icon: '⚤' },
    ]
  }
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
  const [showPresetSubmenu, setShowPresetSubmenu] = useState(false);
  const [showInsertNodeSubmenu, setShowInsertNodeSubmenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePresetCategory, setActivePresetCategory] = useState<TunnelPresetCategory | null>(null);
  const [edgeInsertInfo, setEdgeInsertInfo] = useState<EdgeInsertInfo | null>(null);
  
  // Listen for context menu events
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      
      const store = getGraphStore();
      const canvas = e.target as HTMLCanvasElement;
      if (!canvas.classList.contains('stochastic-canvas')) return;
      
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
      let foundEdgeInfo: EdgeInsertInfo | null = null;
      if (!foundNode) {
        store.edges.forEach((edge, id) => {
          const fromNode = store.nodes.get(edge.from);
          const toNode = store.nodes.get(edge.to);
          if (fromNode && toNode) {
            const dist = distToSegment(worldX, worldY, fromNode.x, fromNode.y, toNode.x, toNode.y);
            if (dist < 10) {
              foundEdge = id;
              foundEdgeInfo = {
                edgeId: id,
                fromNodeId: edge.from,
                toNodeId: edge.to,
              };
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
        // Only select if not already in selection (preserve multi-selection)
        if (!store.selection.selectedNodeIds.includes(foundNode)) {
          store.selectNode(foundNode);
        }
      } else if (foundEdge) {
        menuType = 'edge';
        targetId = foundEdge;
        store.selectEdge(foundEdge as never);
        setEdgeInsertInfo(foundEdgeInfo);
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
      setShowInsertNodeSubmenu(false);
      setShowPresetSubmenu(false);
      setActivePresetCategory(null);
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
        setShowPresetSubmenu(false);
        setShowInsertNodeSubmenu(false);
        setActiveCategory(null);
        setActivePresetCategory(null);
        setEdgeInsertInfo(null);
      }
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    window.addEventListener('stochastic-show-add-menu', handleAddMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('stochastic-show-add-menu', handleAddMenu);
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
      const canvas = document.querySelector('.stochastic-canvas') as HTMLCanvasElement;
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
    setShowPresetSubmenu(false);
    setActivePresetCategory(null);
  };
  
  const handleAddTunnelPreset = (presetId: string) => {
    const store = getGraphStore();
    const preset = TUNNEL_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    let worldX: number;
    let worldY: number;
    
    // Use saved world coordinates if available
    if (state.worldX !== undefined && state.worldY !== undefined) {
      worldX = state.worldX;
      worldY = state.worldY;
    } else {
      // Convert menu position to world coordinates
      const canvas = document.querySelector('.stochastic-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      
      const { viewport } = store;
      const rect = canvas.getBoundingClientRect();
      const screenX = state.x - rect.left;
      const screenY = state.y - rect.top;
      worldX = (screenX - viewport.panOffset.x) / viewport.zoomLevel;
      worldY = (screenY - viewport.panOffset.y) / viewport.zoomLevel;
    }
    
    // Add tunnel node
    const newNodeId = store.addNode('tunnel', worldX, worldY);
    
    // Apply preset props
    store.updateNodeProps(newNodeId, {
      tunnelName: preset.name,
      subNodes: [...preset.subNodes],
    });
    
    store.selectNode(newNodeId);
    
    // Create edge from pending link node if this is addFromEdge
    if (state.type === 'addFromEdge' && store.pendingLinkNodeId) {
      store.addEdge(store.pendingLinkNodeId, newNodeId);
      store.setPendingLinkNode(null);
      store.setContextMenuPos(null, null);
    }
    
    setState(s => ({ ...s, visible: false }));
    setShowAddSubmenu(false);
    setShowPresetSubmenu(false);
    setActivePresetCategory(null);
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
  
  const handleInsertNodeInEdge = (type: NodeType) => {
    const store = getGraphStore();
    if (!edgeInsertInfo) return;
    
    const { edgeId, fromNodeId, toNodeId } = edgeInsertInfo;
    const edge = store.edges.get(edgeId as never);
    if (!edge) return;
    
    // Get the original edge's properties to preserve timing settings
    const originalEdge = edge;
    
    // Calculate position for new node (use the click position from worldX/worldY)
    let newX: number;
    let newY: number;
    
    if (state.worldX !== undefined && state.worldY !== undefined) {
      // Use the click position
      newX = state.worldX;
      newY = state.worldY;
    } else {
      // Fallback: midpoint between source and target
      const fromNode = store.nodes.get(fromNodeId);
      const toNode = store.nodes.get(toNodeId);
      if (!fromNode || !toNode) return;
      newX = (fromNode.x + toNode.x) / 2;
      newY = (fromNode.y + toNode.y) / 2;
    }
    
    // Create the new node
    const newNodeId = store.addNode(type, newX, newY);
    
    // Delete the original edge
    store.deleteEdge(edgeId as never);
    
    // Create edge from original source to new node (preserving timing settings)
    store.addEdge(fromNodeId, newNodeId, {
      timingMode: originalEdge.timingMode,
      durationBeats: originalEdge.durationBeats,
    });
    
    // Create edge from new node to original target (preserving timing settings)
    store.addEdge(newNodeId, toNodeId, {
      timingMode: originalEdge.timingMode,
      durationBeats: originalEdge.durationBeats,
      targetParam: originalEdge.targetParam,
    });
    
    // Select the new node
    store.selectNode(newNodeId);
    
    setState(s => ({ ...s, visible: false }));
    setShowInsertNodeSubmenu(false);
    setActiveCategory(null);
    setEdgeInsertInfo(null);
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
            onMouseEnter={() => { setShowAddSubmenu(true); setShowPresetSubmenu(false); }}
            onMouseLeave={() => { setShowAddSubmenu(false); setActiveCategory(null); }}
          >
            Add Node ▸
            {showAddSubmenu && (
              <div className={styles.submenu}>
                {NODE_CATEGORIES.map((category) => (
                  <div 
                    key={category.name}
                    className={styles.menuItem}
                    onMouseEnter={() => setActiveCategory(category.name)}
                  >
                    {category.name} ▸
                    {activeCategory === category.name && (
                      <div className={styles.submenu}>
                        {category.nodes.map(({ type, label, icon }) => (
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
                ))}
              </div>
            )}
          </div>
          <div 
            className={styles.menuItem}
            onMouseEnter={() => { setShowPresetSubmenu(true); setShowAddSubmenu(false); }}
            onMouseLeave={() => { setShowPresetSubmenu(false); setActivePresetCategory(null); }}
          >
            <span className={styles.icon}>📦</span> Tunnel Presets ▸
            {showPresetSubmenu && (
              <div className={styles.submenu}>
                {(['melodic', 'bass', 'pad', 'keys', 'percussion', 'fx'] as TunnelPresetCategory[]).map((category) => {
                  const presetsInCategory = TUNNEL_PRESETS.filter(p => p.category === category);
                  return (
                    <div 
                      key={category}
                      className={styles.menuItem}
                      onMouseEnter={() => setActivePresetCategory(category)}
                    >
                      <span className={styles.icon}>{CATEGORY_ICONS[category]}</span> {CATEGORY_LABELS[category]} ▸
                      {activePresetCategory === category && (
                        <div className={styles.submenu}>
                          {presetsInCategory.map((preset) => (
                            <div 
                              key={preset.id}
                              className={styles.menuItem}
                              onClick={() => handleAddTunnelPreset(preset.id)}
                              title={preset.description}
                            >
                              {preset.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
          <div 
            className={styles.menuItem}
            onMouseEnter={() => { setShowInsertNodeSubmenu(true); }}
            onMouseLeave={() => { setShowInsertNodeSubmenu(false); setActiveCategory(null); }}
          >
            ➕ Insert Node ▸
            {showInsertNodeSubmenu && (
              <div className={styles.submenu}>
                {NODE_CATEGORIES.map((category) => (
                  <div 
                    key={category.name}
                    className={styles.menuItem}
                    onMouseEnter={() => setActiveCategory(category.name)}
                  >
                    {category.name} ▸
                    {activeCategory === category.name && (
                      <div className={styles.submenu}>
                        {category.nodes.map(({ type, label, icon }) => (
                          <div 
                            key={type}
                            className={styles.menuItem}
                            onClick={() => handleInsertNodeInEdge(type)}
                          >
                            <span className={styles.icon}>{icon}</span> {label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.divider} />
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
          {NODE_CATEGORIES.map((category) => (
            <div 
              key={category.name}
              className={styles.menuItem}
              onMouseEnter={() => { setActiveCategory(category.name); setActivePresetCategory(null); }}
              onMouseLeave={() => setActiveCategory(null)}
            >
              {category.name} ▸
              {activeCategory === category.name && (
                <div className={styles.submenu}>
                  {category.nodes.map(({ type, label, icon }) => (
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
          ))}
          <div className={styles.divider} />
          <div 
            className={styles.menuItem}
            onMouseEnter={() => { setShowPresetSubmenu(true); setActiveCategory(null); }}
            onMouseLeave={() => { setShowPresetSubmenu(false); setActivePresetCategory(null); }}
          >
            <span className={styles.icon}>📦</span> Tunnel Presets ▸
            {showPresetSubmenu && (
              <div className={styles.submenu}>
                {(['melodic', 'bass', 'pad', 'keys', 'percussion', 'fx'] as TunnelPresetCategory[]).map((category) => {
                  const presetsInCategory = TUNNEL_PRESETS.filter(p => p.category === category);
                  return (
                    <div 
                      key={category}
                      className={styles.menuItem}
                      onMouseEnter={() => setActivePresetCategory(category)}
                    >
                      <span className={styles.icon}>{CATEGORY_ICONS[category]}</span> {CATEGORY_LABELS[category]} ▸
                      {activePresetCategory === category && (
                        <div className={styles.submenu}>
                          {presetsInCategory.map((preset) => (
                            <div 
                              key={preset.id}
                              className={styles.menuItem}
                              onClick={() => handleAddTunnelPreset(preset.id)}
                              title={preset.description}
                            >
                              {preset.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
