// Shared Input Components for Property Panel
import React from 'react';
import styles from '../../PropertyPanel.module.css';

// ============================================================================
// REUSABLE INPUT COMPONENTS
// ============================================================================

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

export function PropertyRow({ label, children }: PropertyRowProps): React.ReactElement {
  return (
    <div className={styles.row}>
      <label className={styles.label}>{label}</label>
      <div className={styles.input}>{children}</div>
    </div>
  );
}

interface NumberInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function NumberInput({ value, min, max, step = 1, onChange }: NumberInputProps): React.ReactElement {
  return (
    <input
      type="number"
      className={styles.numberInput}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value))}
    />
  );
}

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export function SliderInput({ value, min, max, step, onChange }: SliderInputProps): React.ReactElement {
  const safeValue = value ?? min ?? 0;
  return (
    <div className={styles.sliderContainer}>
      <input
        type="range"
        className={styles.slider}
        value={safeValue}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span className={styles.sliderValue}>{safeValue.toFixed(2)}</span>
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function Checkbox({ checked, onChange }: CheckboxProps): React.ReactElement {
  return (
    <input
      type="checkbox"
      className={styles.checkbox}
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
  );
}

interface SelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function Select({ value, options, onChange, disabled }: SelectProps): React.ReactElement {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
