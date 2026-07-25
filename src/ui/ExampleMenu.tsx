// Stochastic v2 - Collapsible Example Menu Component

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EXAMPLES, EXAMPLE_CATEGORIES, loadExample } from '../data/examples';
import styles from './ExampleMenu.module.css';

interface ExampleCategoryGroup {
  name: string;
  items: Array<{ key: string; label: string; description: string }>;
}

// Group examples by their declared category, preserving the canonical order
const getCategories = (): ExampleCategoryGroup[] => {
  const byCategory = new Map<string, ExampleCategoryGroup['items']>();

  Object.entries(EXAMPLES).forEach(([key, ex]) => {
    const items = byCategory.get(ex.category) ?? [];
    items.push({ key, label: ex.name, description: ex.description });
    byCategory.set(ex.category, items);
  });

  return EXAMPLE_CATEGORIES
    .filter(name => byCategory.has(name))
    .map(name => ({ name, items: byCategory.get(name)! }));
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
                      title={item.description}
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
