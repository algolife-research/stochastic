// Phonon v2 - Tunnel Preset Selector Component
// Allows users to select and apply pre-configured tunnel presets

import React, { useState, useRef, useEffect } from 'react';
import { 
  TUNNEL_PRESETS, 
  CATEGORY_LABELS, 
  CATEGORY_ICONS,
  type TunnelPreset,
  type TunnelPresetCategory 
} from '@data/tunnel-presets';
import styles from './TunnelPresetSelector.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface TunnelPresetSelectorProps {
  onSelect: (preset: TunnelPreset) => void;
  currentName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TunnelPresetSelector({ onSelect, currentName }: TunnelPresetSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TunnelPresetCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Focus search input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Get categories with presets
  const categories: TunnelPresetCategory[] = ['melodic', 'bass', 'pad', 'keys', 'percussion', 'fx'];
  
  // Filter presets based on search and category
  const filteredPresets = TUNNEL_PRESETS.filter(preset => {
    const matchesCategory = !activeCategory || preset.category === activeCategory;
    const matchesSearch = !searchQuery || 
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });
  
  const handleSelect = (preset: TunnelPreset) => {
    onSelect(preset);
    setIsOpen(false);
    setSearchQuery('');
    setActiveCategory(null);
  };
  
  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Load preset instrument"
      >
        <span className={styles.presetIcon}>📦</span>
        <span className={styles.presetLabel}>Presets</span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className={styles.dropdown}>
          {/* Search */}
          <div className={styles.searchContainer}>
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search presets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Category tabs */}
          <div className={styles.categoryTabs}>
            <button
              className={`${styles.categoryTab} ${!activeCategory ? styles.active : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`${styles.categoryTab} ${activeCategory === cat ? styles.active : ''}`}
                onClick={() => setActiveCategory(cat)}
                title={CATEGORY_LABELS[cat]}
              >
                {CATEGORY_ICONS[cat]}
              </button>
            ))}
          </div>
          
          {/* Preset list */}
          <div className={styles.presetList}>
            {filteredPresets.length === 0 ? (
              <div className={styles.noResults}>No presets found</div>
            ) : (
              filteredPresets.map(preset => (
                <button
                  key={preset.id}
                  className={`${styles.presetItem} ${currentName === preset.name ? styles.currentPreset : ''}`}
                  onClick={() => handleSelect(preset)}
                >
                  <div className={styles.presetHeader}>
                    <span className={styles.presetCategoryIcon}>
                      {CATEGORY_ICONS[preset.category]}
                    </span>
                    <span className={styles.presetName}>{preset.name}</span>
                    <span className={styles.presetNodeCount}>
                      {preset.subNodes.length}
                    </span>
                  </div>
                  <div className={styles.presetDescription}>
                    {preset.description}
                  </div>
                  <div className={styles.presetTags}>
                    {preset.tags.slice(0, 3).map(tag => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TunnelPresetSelector;
