// Stochastic v2 - Collapsible Example Menu Component

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EXAMPLES, loadExample } from '../data/examples';
import styles from './ExampleMenu.module.css';

interface ExampleCategory {
  name: string;
  items: Array<{ key: string; label: string }>;
}

// Helper to categorize examples
const getCategories = (): ExampleCategory[] => {
  const categories: Record<string, Array<{ key: string; label: string }>> = {
    'Tutorials': [],
    'Demos': [],
    'Synthesis': [],
    'Generative': [],
    'Effects & Routing': [],
    'Composition': [],
    'Physics & Timing': [],
    'Other': []
  };

  Object.entries(EXAMPLES).forEach(([key, ex]) => {
    const item = { key, label: ex.name };
    
    if (key.startsWith('tut_')) {
      categories['Tutorials']!.push(item);
    } else if (key.startsWith('demo_')) {
      categories['Demos']!.push(item);
    } else if (['layered_pad', 'synth_bass', 'harmonic_series', 'wobble_bass', 'tunnel_processing', 'noise_percussion', 'vibrato_strings', 'ahd_envelopes'].includes(key)) {
      categories['Synthesis']!.push(item);
    } else if (['quantizer_demo', 'blues_scale', 'generative_sequencer', 'euclidean_rhythms', 'pentatonic_jam', 'ambient_krell'].includes(key)) {
      categories['Generative']!.push(item);
    } else if (['lfo_modulation', 'cv_routing_demo', 'teleporter_echo', 'delay_network'].includes(key)) {
      categories['Effects & Routing']!.push(item);
    } else if (['orchestra', 'tunnel_melody', 'ambient_drone', 'gamelan'].includes(key)) {
      categories['Composition']!.push(item);
    } else if (['virtual_edges', 'gravity_tempo'].includes(key)) {
      categories['Physics & Timing']!.push(item);
    } else {
      categories['Other']!.push(item);
    }
  });

  return Object.entries(categories)
    .filter(([_, items]) => items.length > 0)
    .map(([name, items]) => ({ name, items }));
};

export function ExampleMenu(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const categories = getCategories();
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInMenu = menuRef.current?.contains(target);
      const clickedInDropdown = dropdownRef.current?.contains(target);
      
      if (!clickedInMenu && !clickedInDropdown) {
        setIsOpen(false);
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
  
  const handleExampleClick = (key: string) => {
    loadExample(key);
    setIsOpen(false);
  };
  
  return (
    <div className={styles['nodeMenu']} ref={menuRef}>
      {/* Main toggle button */}
      <button
        ref={buttonRef}
        className={styles['mainButton']}
        onClick={() => setIsOpen(!isOpen)}
        title="Load Example"
      >
        <span className={styles['icon']}>📁</span>
        <span className={styles['label']}>Examples</span>
        <span className={styles['chevron']}>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {/* Dropdown menu */}
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
          {/* Categories */}
          {categories.map(category => (
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
                  {category.items.map(item => (
                    <button
                      key={item.key}
                      className={styles['nodeButton']}
                      onClick={() => handleExampleClick(item.key)}
                      title={item.label}
                    >
                      <span className={styles['nodeIcon']}>📄</span>
                      <span className={styles['nodeLabel']}>{item.label}</span>
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
