// Modern Color Picker Component with Opacity Support

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './ColorPicker.module.css';

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Parse a color string to RGB(A) values
 */
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // Default to black
  let r = 0, g = 0, b = 0, a = 1;

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt((hex[0] ?? '0') + (hex[0] ?? '0'), 16);
      g = parseInt((hex[1] ?? '0') + (hex[1] ?? '0'), 16);
      b = parseInt((hex[2] ?? '0') + (hex[2] ?? '0'), 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      a = parseInt(hex.slice(6, 8), 16) / 255;
    }
  }
  // Handle rgba()
  else if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      r = parseInt(match[1] ?? '0', 10);
      g = parseInt(match[2] ?? '0', 10);
      b = parseInt(match[3] ?? '0', 10);
      a = match[4] ? parseFloat(match[4]) : 1;
    }
  }
  // Handle rgb()
  else if (color.startsWith('rgb')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      r = parseInt(match[1] ?? '0', 10);
      g = parseInt(match[2] ?? '0', 10);
      b = parseInt(match[3] ?? '0', 10);
    }
  }

  return { r, g, b, a };
}

/**
 * Convert RGB(A) to hex string
 */
function rgbaToHex(r: number, g: number, b: number, a?: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a !== undefined && a < 1) {
    return hex + toHex(a * 255);
  }
  return hex;
}

/**
 * Convert RGB(A) to rgba() string
 */
function rgbaToString(r: number, g: number, b: number, a: number): string {
  if (a < 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(2)})`;
  }
  return rgbaToHex(r, g, b);
}

/**
 * Get the base hex color without alpha
 */
function getBaseHex(color: string): string {
  const { r, g, b } = parseColor(color);
  return rgbaToHex(r, g, b);
}

// ============================================================================
// PRESET COLORS
// ============================================================================

const PRESET_COLORS = [
  // Row 1 - Vibrant
  '#FF6B6B', '#FF8E53', '#FECA57', '#48DBFB', '#1DD1A1', '#5F27CD', '#FF6FF0', '#F368E0',
  // Row 2 - Soft
  '#FFA8A8', '#FFB97D', '#FFE066', '#74E8FF', '#6EE7B7', '#A78BFA', '#FF9FF3', '#F8A5C2',
  // Row 3 - Dark
  '#C92A2A', '#E8590C', '#F59F00', '#1098AD', '#087F5B', '#7C3AED', '#BE4BDB', '#A61E4D',
  // Row 4 - Neutrals
  '#212529', '#495057', '#868E96', '#ADB5BD', '#DEE2E6', '#F1F3F5', '#FFFFFF', '#000000',
];

const SCENE_COLORS = [
  '#FF6B6B', '#FF8E53', '#FECA57', '#48DBFB', '#1DD1A1', '#5F27CD', '#FF6FF0', '#54A0FF',
  '#00D2D3', '#10AC84', '#EE5A24', '#0ABDE3', '#9B59B6', '#E74C3C', '#2ECC71', '#3498DB',
];

// ============================================================================
// COLOR PICKER COMPONENT
// ============================================================================

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  showCustom?: boolean;
  showOpacity?: boolean;
  size?: 'small' | 'medium';
}

export function ColorPicker({ 
  value, 
  onChange, 
  presets = PRESET_COLORS,
  showCustom = true,
  showOpacity = false,
  size = 'medium'
}: ColorPickerProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse the current color
  const parsed = useMemo(() => parseColor(value), [value]);
  const [opacity, setOpacity] = useState(parsed.a);
  const baseHex = useMemo(() => getBaseHex(value), [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update opacity when value changes externally
  useEffect(() => {
    const { a } = parseColor(value);
    setOpacity(a);
  }, [value]);

  const handlePresetClick = useCallback((color: string) => {
    if (showOpacity && opacity < 1) {
      const { r, g, b } = parseColor(color);
      onChange(rgbaToString(r, g, b, opacity));
    } else {
      onChange(color);
    }
    setIsOpen(false);
  }, [onChange, opacity, showOpacity]);

  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (showOpacity && opacity < 1) {
      const { r, g, b } = parseColor(color);
      onChange(rgbaToString(r, g, b, opacity));
    } else {
      onChange(color);
    }
  }, [onChange, opacity, showOpacity]);

  const handleHexInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let hex = e.target.value.trim();
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    // Support 6 or 8 character hex
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      if (showOpacity && opacity < 1) {
        const { r, g, b } = parseColor(hex);
        onChange(rgbaToString(r, g, b, opacity));
      } else {
        onChange(hex);
      }
    } else if (/^#[0-9A-Fa-f]{8}$/.test(hex)) {
      onChange(hex);
      // Update opacity from the alpha in hex
      const { a } = parseColor(hex);
      setOpacity(a);
    }
  }, [onChange, opacity, showOpacity]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    const { r, g, b } = parseColor(value);
    onChange(rgbaToString(r, g, b, newOpacity));
  }, [onChange, value]);

  const sizeClass = size === 'small' ? styles.small : '';

  // Display color for the trigger (show checkerboard pattern for transparent colors)
  const displayColor = value;
  const opacityPercent = Math.round(opacity * 100);

  return (
    <div className={`${styles.container} ${sizeClass}`} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${showOpacity ? styles.withOpacity : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={`${value} (${opacityPercent}%)`}
      >
        <span className={styles.checkerboard} />
        <span className={styles.triggerInner} style={{ backgroundColor: displayColor }} />
      </button>

      {isOpen && (
        <div className={styles.popover} ref={popoverRef}>
          <div className={styles.presets}>
            {presets.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.preset} ${getBaseHex(value) === color ? styles.selected : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handlePresetClick(color)}
                title={color}
              />
            ))}
          </div>

          {showCustom && (
            <div className={styles.custom}>
              <div className={styles.customPreview}>
                <input
                  type="color"
                  className={styles.nativeInput}
                  value={baseHex}
                  onChange={handleCustomChange}
                />
                <span className={styles.checkerboard} />
                <span 
                  className={styles.previewSwatch} 
                  style={{ backgroundColor: displayColor }}
                />
              </div>
              <input
                type="text"
                className={styles.hexInput}
                value={baseHex.toUpperCase()}
                onChange={handleHexInput}
                placeholder="#000000"
                maxLength={9}
              />
            </div>
          )}

          {showOpacity && (
            <div className={styles.opacitySection}>
              <label className={styles.opacityLabel}>Opacity</label>
              <div className={styles.opacityControls}>
                <div className={styles.opacitySliderContainer}>
                  <span 
                    className={styles.opacityGradient} 
                    style={{ 
                      background: `linear-gradient(to right, transparent, ${baseHex})` 
                    }}
                  />
                  <input
                    type="range"
                    className={styles.opacitySlider}
                    min={0}
                    max={1}
                    step={0.01}
                    value={opacity}
                    onChange={handleOpacityChange}
                  />
                </div>
                <span className={styles.opacityValue}>{opacityPercent}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PRESET_COLORS, SCENE_COLORS, parseColor, rgbaToHex, rgbaToString };
