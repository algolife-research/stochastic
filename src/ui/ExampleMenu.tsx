// Stochastic - Example Menu
// Lists the example library (fetched on demand, cached) grouped by category,
// plus full .sto compositions. Falls back to the bundled set when offline.

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '@core/store';
import {
  getLibraryIndex,
  getBundledIndexEntries,
  loadExample,
  loadLibraryComposition,
  EXAMPLE_CATEGORIES,
} from '../data/example-library';
import type { LibraryIndex, CompositionIndexEntry } from '../data/example-library';
import styles from './ExampleMenu.module.css';

const COMPOSITIONS_CATEGORY = 'Full Pieces';

interface MenuItem {
  key: string;
  label: string;
  description: string;
  composition?: CompositionIndexEntry;
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

function buildCategories(index: LibraryIndex | null): MenuCategory[] {
  const byCategory = new Map<string, MenuItem[]>();

  const entries = index?.examples ?? getBundledIndexEntries();
  for (const entry of entries) {
    const items = byCategory.get(entry.category) ?? [];
    items.push({ key: entry.key, label: entry.name, description: entry.description });
    byCategory.set(entry.category, items);
  }

  const categories: MenuCategory[] = EXAMPLE_CATEGORIES
    .filter(name => byCategory.has(name))
    .map(name => ({ name, items: byCategory.get(name)! }));

  // Full compositions lead the menu — they are complete pieces (opened as
  // projects), not add-on example scenes
  if (index && index.compositions.length > 0) {
    categories.unshift({
      name: COMPOSITIONS_CATEGORY,
      items: index.compositions.map(comp => ({
        key: `composition:${comp.key}`,
        label: comp.name,
        description: `${comp.description}. Opens as a project, replacing the current one.`,
        composition: comp,
      })),
    });
  }

  return categories;
}

export function ExampleMenu(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [index, setIndex] = useState<LibraryIndex | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = buildCategories(index);

  // Fetch the library manifest when the menu first opens
  useEffect(() => {
    if (!isOpen || index) return;
    let cancelled = false;
    getLibraryIndex().then(result => {
      if (cancelled) return;
      if (result) {
        setIndex(result);
        setIndexFailed(false);
      } else {
        setIndexFailed(true);
      }
    });
    return () => { cancelled = true; };
  }, [isOpen, index]);

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
        left: rect.left,
      });
    }
  }, [isOpen]);

  const handleItemClick = async (item: MenuItem) => {
    if (loadingKey) return;

    if (item.composition) {
      const store = useGraphStore.getState();
      if (store.isDirty && !window.confirm(
        `Open "${item.label}"? This replaces your current project — unsaved changes will be lost.`
      )) {
        return;
      }
    }

    setLoadingKey(item.key);
    setErrorKey(null);
    try {
      if (item.composition) {
        await loadLibraryComposition(item.composition);
      } else {
        await loadExample(item.key);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to load example:', error);
      setErrorKey(item.key);
    } finally {
      setLoadingKey(null);
    }
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
            left: dropdownPosition.left,
          }}
        >
          {indexFailed && (
            <div className={styles['notice']}>
              Library unreachable — showing built-in examples only
            </div>
          )}

          {/* Categories */}
          {categories.map(category => (
            <div key={category.name} className={styles['category']}>
              <button
                className={`${styles['categoryHeader']} ${activeCategory === category.name ? styles['expanded'] : ''}`}
                onClick={() => setActiveCategory(activeCategory === category.name ? null : category.name)}
              >
                <span>
                  {category.name === COMPOSITIONS_CATEGORY ? '🎼 ' : ''}{category.name}
                  <span className={styles['categoryCount']}> {category.items.length}</span>
                </span>
                <span className={styles['categoryChevron']}>{activeCategory === category.name ? '−' : '+'}</span>
              </button>

              {activeCategory === category.name && (
                <div className={styles['categoryNodes']}>
                  {category.items.map(item => (
                    <button
                      key={item.key}
                      className={styles['nodeButton']}
                      onClick={() => handleItemClick(item)}
                      disabled={loadingKey !== null}
                      title={item.description}
                    >
                      <span className={styles['nodeIcon']}>
                        {loadingKey === item.key ? '⏳' : errorKey === item.key ? '⚠️' : item.composition ? '🎼' : '📄'}
                      </span>
                      <span className={styles['nodeLabel']}>
                        {errorKey === item.key ? `${item.label} — failed, tap to retry` : item.label}
                      </span>
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
