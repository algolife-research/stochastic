// Mutator Node Properties
import React from 'react';
import { PropertyRow, NumberInput, SliderInput, Checkbox, Select } from '../shared';
import type { PropsEditorProps, MutatorPropsType, MutatableProperty } from '../types';
import styles from '../../PropertyPanel.module.css';

const MUTATABLE_PROPERTIES: Array<{ value: MutatableProperty; label: string }> = [
  { value: 'pitch', label: 'Pitch' },
  { value: 'gain', label: 'Gain' },
  { value: 'cutoff', label: 'Filter Cutoff' },
  { value: 'wave', label: 'Wave Type' },
  { value: 'timbre', label: 'Timbre' },
];

export function MutatorProps({ props, onChange }: PropsEditorProps<MutatorPropsType>): React.ReactElement {
  const targets = props.targets ?? ['pitch'];
  
  const toggleTarget = (target: MutatableProperty) => {
    const newTargets = targets.includes(target)
      ? targets.filter(t => t !== target)
      : [...targets, target];
    onChange('targets', newTargets);
  };
  
  return (
    <>
      <PropertyRow label="Mode">
        <Select
          value={props.mode ?? 'drift'}
          options={[
            { value: 'drift', label: 'Drift (Small Changes)' },
            { value: 'radiation', label: 'Radiation (Large Changes)' },
          ]}
          onChange={v => onChange('mode', v)}
        />
      </PropertyRow>
      <div className={styles.description}>
        {props.mode === 'drift' 
          ? 'Drift applies small, incremental mutations that evolve gradually.'
          : 'Radiation applies large, structural changes — rare but dramatic.'}
      </div>
      
      <PropertyRow label="Probability">
        <SliderInput
          value={props.probability ?? 0.5}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('probability', v)}
        />
      </PropertyRow>
      
      <div className={styles.sectionHeader}>Mutation Targets</div>
      {MUTATABLE_PROPERTIES.map(({ value, label }) => (
        <PropertyRow key={value} label={label}>
          <Checkbox
            checked={targets.includes(value)}
            onChange={() => toggleTarget(value)}
          />
        </PropertyRow>
      ))}
      
      {props.mode === 'drift' && (
        <>
          <div className={styles.sectionHeader}>Drift Amounts</div>
          {targets.includes('pitch') && (
            <PropertyRow label="Pitch Drift (±)">
              <NumberInput
                value={props.pitchDrift ?? 2}
                min={0}
                max={12}
                step={1}
                onChange={v => onChange('pitchDrift', v)}
              />
            </PropertyRow>
          )}
          {targets.includes('gain') && (
            <PropertyRow label="Gain Drift (±)">
              <SliderInput
                value={props.gainDrift ?? 0.1}
                min={0}
                max={0.5}
                step={0.01}
                onChange={v => onChange('gainDrift', v)}
              />
            </PropertyRow>
          )}
          {targets.includes('cutoff') && (
            <PropertyRow label="Cutoff Drift (±%)">
              <SliderInput
                value={props.cutoffDrift ?? 0.2}
                min={0}
                max={1}
                step={0.01}
                onChange={v => onChange('cutoffDrift', v)}
              />
            </PropertyRow>
          )}
        </>
      )}
      
      {props.mode === 'radiation' && (
        <>
          <div className={styles.sectionHeader}>Radiation Settings</div>
          {targets.includes('pitch') && (
            <PropertyRow label="Pitch Jump (±)">
              <NumberInput
                value={props.pitchRadiation ?? 12}
                min={1}
                max={48}
                step={1}
                onChange={v => onChange('pitchRadiation', v)}
              />
            </PropertyRow>
          )}
          {targets.includes('wave') && (
            <PropertyRow label="Change Wave">
              <Checkbox
                checked={props.waveChange ?? false}
                onChange={v => onChange('waveChange', v)}
              />
            </PropertyRow>
          )}
        </>
      )}
    </>
  );
}
