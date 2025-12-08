// Phonon v2 - Collapsible Node Menu Component

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '@core/store';
import type { Tool } from '@core/types';
import { NODE_COLORS, NODE_ICONS } from '@core/constants';
import styles from './NodeMenu.module.css';

// ============================================================================
// NODE CATEGORIES
// ============================================================================

interface NodeCategory {
  name: string;
  nodes: Array<{
    type: Tool;
    label: string;
    icon: string;
    color: string;
    shortcut?: string;
  }>;
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: 'Basic',
    nodes: [
      { type: 'source', label: 'Source', icon: NODE_ICONS.source, color: NODE_COLORS.source, shortcut: '1' },
      { type: 'speaker', label: 'Speaker', icon: NODE_ICONS.speaker, color: NODE_COLORS.speaker, shortcut: '2' },
      { type: 'pitch', label: 'Pitch', icon: NODE_ICONS.pitch, color: NODE_COLORS.pitch, shortcut: '3' },
    ]
  },
  {
    name: 'Sound',
    nodes: [
      { type: 'polariser', label: 'Polariser', icon: NODE_ICONS.polariser, color: NODE_COLORS.polariser },
      { type: 'filter', label: 'Filter', icon: NODE_ICONS.filter, color: NODE_COLORS.filter, shortcut: '4' },
      { type: 'noise', label: 'Noise', icon: NODE_ICONS.noise, color: NODE_COLORS.noise },
      { type: 'harmonic', label: 'Harmonic', icon: NODE_ICONS.harmonic, color: NODE_COLORS.harmonic },
    ]
  },
  {
    name: 'Control',
    nodes: [
      { type: 'gate', label: 'Gate', icon: NODE_ICONS.gate, color: NODE_COLORS.gate, shortcut: '5' },
      { type: 'delay', label: 'Delay', icon: NODE_ICONS.delay, color: NODE_COLORS.delay, shortcut: '6' },
      { type: 'gain', label: 'Gain', icon: NODE_ICONS.gain, color: NODE_COLORS.gain, shortcut: '7' },
      { type: 'quantizer', label: 'Quantizer', icon: NODE_ICONS.quantizer, color: NODE_COLORS.quantizer },
      { type: 'splitter', label: 'Splitter', icon: NODE_ICONS.splitter, color: NODE_COLORS.splitter },
    ]
  },
  {
    name: 'Advanced',
    nodes: [
      { type: 'tunnel', label: 'Tunnel', icon: NODE_ICONS.tunnel, color: NODE_COLORS.tunnel },
      { type: 'teleporter', label: 'Teleporter', icon: NODE_ICONS.teleporter, color: NODE_COLORS.teleporter },
      { type: 'modulator', label: 'Modulator', icon: NODE_ICONS.modulator, color: NODE_COLORS.modulator },
      { type: 'lfo', label: 'LFO', icon: NODE_ICONS.lfo, color: NODE_COLORS.lfo },
      { type: 'scene_trigger', label: 'Scene Trigger', icon: NODE_ICONS.scene_trigger, color: NODE_COLORS.scene_trigger },
    ]
  },
  {
    name: 'Evolution',
    nodes: [
      { type: 'mutator', label: 'Mutator', icon: NODE_ICONS.mutator, color: NODE_COLORS.mutator },
      { type: 'crossover', label: 'Crossover', icon: NODE_ICONS.crossover, color: NODE_COLORS.crossover },
      { type: 'fitness_gate', label: 'Fitness Gate', icon: NODE_ICONS.fitness_gate, color: NODE_COLORS.fitness_gate },
    ]
  }
];

// ============================================================================
// NODE MENU COMPONENT
// ============================================================================

export function NodeMenu(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentTool = useGraphStore(state => state.currentTool);
  const setTool = useGraphStore(state => state.setTool);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInMenu = menuRef.current?.contains(target);
      const clickedInDropdown = dropdownRef.current?.contains(target);
      
      if (!clickedInMenu && !clickedInDropdown) {
        setIsOpen(false);
        setActiveCategory(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen]);
  
  // Get current tool info
  const getCurrentToolInfo = () => {
    if (currentTool === 'select') {
      return { icon: '↖', label: 'Select', color: '#666' };
    }
    if (currentTool === 'annotation') {
      return { icon: '✏️', label: 'Annotation', color: '#666' };
    }
    if (currentTool === 'region') {
      return { icon: '📦', label: 'Region', color: '#666' };
    }
    for (const cat of NODE_CATEGORIES) {
      const node = cat.nodes.find(n => n.type === currentTool);
      if (node) return { icon: node.icon, label: node.label, color: node.color };
    }
    return { icon: '?', label: currentTool, color: '#666' };
  };
  
  const toolInfo = getCurrentToolInfo();
  
  const handleNodeClick = (type: Tool) => {
    setTool(type);
    setIsOpen(false);
    setActiveCategory(null);
  };
  
  return (
    <div className={styles['nodeMenu']} ref={menuRef}>
      {/* Main toggle button shows current tool */}
      <button
        ref={buttonRef}
        className={styles['mainButton']}
        style={{ '--tool-color': toolInfo.color } as React.CSSProperties}
        onClick={() => setIsOpen(!isOpen)}
        title="Add Node (click to expand)"
      >
        <span className={styles['icon']}>{toolInfo.icon}</span>
        <span className={styles['label']}>{toolInfo.label}</span>
        <span className={styles['chevron']}>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {/* Dropdown menu - rendered in portal to escape overflow clipping */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={styles['dropdown']}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left
          }}
        >
          {/* Select tool */}
          <button
            className={`${styles['nodeButton']} ${currentTool === 'select' ? styles['active'] : ''}`}
            onClick={() => handleNodeClick('select')}
            title="Select (0)"
          >
            <span className={styles['nodeIcon']}>↖</span>
            <span className={styles['nodeLabel']}>Select</span>
            <span className={styles['shortcut']}>0</span>
          </button>

          {/* Annotation tool */}
          <button
            className={`${styles['nodeButton']} ${currentTool === 'annotation' ? styles['active'] : ''}`}
            onClick={() => handleNodeClick('annotation')}
            title="Annotation (A)"
          >
            <span className={styles['nodeIcon']}>✏️</span>
            <span className={styles['nodeLabel']}>Annotation</span>
            <span className={styles['shortcut']}>A</span>
          </button>

          {/* Region tool */}
          <button
            className={`${styles['nodeButton']} ${currentTool === 'region' ? styles['active'] : ''}`}
            onClick={() => handleNodeClick('region')}
            title="Region (R)"
          >
            <span className={styles['nodeIcon']}>📦</span>
            <span className={styles['nodeLabel']}>Region</span>
            <span className={styles['shortcut']}>R</span>
          </button>
          
          <div className={styles['divider']} />
          
          {/* Node categories */}
          {NODE_CATEGORIES.map(category => (
            <div key={category.name} className={styles['category']}>
              <button
                className={`${styles['categoryHeader']} ${activeCategory === category.name ? styles['expanded'] : ''}`}
                onClick={() => setActiveCategory(activeCategory === category.name ? null : category.name)}
              >
                <span>{category.name}</span>
                <span className={styles['categoryChevron']}>{activeCategory === category.name ? '−' : '+'}</span>
              </button>
              
              {activeCategory === category.name && (
                <div className={styles['categoryNodes']}>
                  {category.nodes.map(node => (
                    <button
                      key={node.type}
                      className={`${styles['nodeButton']} ${currentTool === node.type ? styles['active'] : ''}`}
                      style={{ '--node-color': node.color } as React.CSSProperties}
                      onClick={() => handleNodeClick(node.type)}
                      title={`${node.label}${node.shortcut ? ` (${node.shortcut})` : ''}`}
                    >
                      <span className={styles['nodeIcon']}>{node.icon}</span>
                      <span className={styles['nodeLabel']}>{node.label}</span>
                      {node.shortcut && <span className={styles['shortcut']}>{node.shortcut}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
