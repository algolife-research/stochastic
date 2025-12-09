// Crossover Node Properties
import React from 'react';
import { PropertyRow, NumberInput, Select } from '../shared';
import type { PropsEditorProps, CrossoverPropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function CrossoverProps({ props, onChange }: PropsEditorProps<CrossoverPropsType>): React.ReactElement {
  return (
    <>
      <div className={styles.description}>
        Waits for two packets to arrive, then combines them into a single offspring.
      </div>
      
      <PropertyRow label="Inheritance">
        <Select
          value={props.inheritance ?? 'random'}
          options={[
            { value: 'random', label: 'Random (Per-Property)' },
            { value: 'dominant_a', label: 'Dominant A (First Parent)' },
            { value: 'dominant_b', label: 'Dominant B (Second Parent)' },
            { value: 'blend', label: 'Blend (Average)' },
          ]}
          onChange={v => onChange('inheritance', v)}
        />
      </PropertyRow>
      
      <div className={styles.sectionHeader}>Property Inheritance</div>
      
      <PropertyRow label="Pitch From">
        <Select
          value={props.pitchFrom ?? 'random'}
          options={[
            { value: 'a', label: 'Parent A' },
            { value: 'b', label: 'Parent B' },
            { value: 'average', label: 'Average' },
            { value: 'random', label: 'Random' },
          ]}
          onChange={v => onChange('pitchFrom', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Wave From">
        <Select
          value={props.waveFrom ?? 'random'}
          options={[
            { value: 'a', label: 'Parent A' },
            { value: 'b', label: 'Parent B' },
            { value: 'random', label: 'Random' },
          ]}
          onChange={v => onChange('waveFrom', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Gain Mode">
        <Select
          value={props.gainMode ?? 'average'}
          options={[
            { value: 'average', label: 'Average' },
            { value: 'max', label: 'Maximum' },
            { value: 'min', label: 'Minimum' },
            { value: 'random', label: 'Random' },
          ]}
          onChange={v => onChange('gainMode', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Timeout (beats)">
        <NumberInput
          value={props.timeout ?? 4}
          min={0.5}
          max={32}
          step={0.5}
          onChange={v => onChange('timeout', v)}
        />
      </PropertyRow>
      <div className={styles.description}>
        If no second parent arrives within this time, the first packet passes through unchanged.
      </div>
    </>
  );
}
