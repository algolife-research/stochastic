// Gate Node Properties
import React from 'react';
import { SCALES, NOTE_LABELS } from '@core/constants';
import { PropertyRow, NumberInput, SliderInput, Checkbox, Select } from '../shared';
import type { PropsEditorProps, GatePropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function GateProps({ props, onChange }: PropsEditorProps<GatePropsType>): React.ReactElement {
  const mode = props.mode ?? 'probability';
  
  return (
    <>
      <PropertyRow label="Mode">
        <Select
          value={mode}
          options={[
            { value: 'probability', label: 'Probability' },
            { value: 'harmonic', label: 'Harmonic (Scale Fit)' },
            { value: 'energy', label: 'Energy (Gain)' },
            { value: 'density', label: 'Density (Rate Limit)' },
            { value: 'all', label: 'All Fitness' },
          ]}
          onChange={v => onChange('mode', v)}
        />
      </PropertyRow>
      
      {mode === 'probability' && (
        <PropertyRow label="Probability">
          <SliderInput
            value={props.probability}
            min={0}
            max={1}
            step={0.01}
            onChange={v => onChange('probability', v)}
          />
        </PropertyRow>
      )}
      
      {(mode === 'harmonic' || mode === 'all') && (
        <>
          <div className={styles.sectionHeader}>Harmonic Fitness</div>
          
          <PropertyRow label="Use Global Key">
            <Checkbox
              checked={props.useGlobalKey ?? true}
              onChange={v => onChange('useGlobalKey', v)}
            />
          </PropertyRow>
          
          {!props.useGlobalKey && (
            <>
              <PropertyRow label="Scale">
                <Select
                  value={props.scale ?? 'major'}
                  options={Object.keys(SCALES).map(s => ({ value: s, label: s }))}
                  onChange={v => onChange('scale', v)}
                />
              </PropertyRow>
              
              <PropertyRow label="Root">
                <Select
                  value={String(props.root ?? 0)}
                  options={NOTE_LABELS.map((label, i) => ({ value: String(i), label }))}
                  onChange={v => onChange('root', parseInt(v))}
                />
              </PropertyRow>
            </>
          )}
          
          <PropertyRow label="Min Consonance">
            <SliderInput
              value={props.harmonicThreshold ?? 0.5}
              min={0}
              max={1}
              step={0.01}
              onChange={v => onChange('harmonicThreshold', v)}
            />
          </PropertyRow>
          <div className={styles.description}>
            Notes outside the scale with consonance below this threshold are killed.
          </div>
        </>
      )}
      
      {(mode === 'energy' || mode === 'all') && (
        <>
          <div className={styles.sectionHeader}>Energy Fitness</div>
          
          <PropertyRow label="Min Gain">
            <SliderInput
              value={props.energyThreshold ?? 0.1}
              min={0}
              max={1}
              step={0.01}
              onChange={v => onChange('energyThreshold', v)}
            />
          </PropertyRow>
          <div className={styles.description}>
            Packets below this gain level die off (survival of the loudest).
          </div>
        </>
      )}
      
      {(mode === 'density' || mode === 'all') && (
        <>
          <div className={styles.sectionHeader}>Density Fitness</div>
          
          <PropertyRow label="Max per Beat">
            <NumberInput
              value={props.densityThreshold ?? 8}
              min={1}
              max={64}
              step={1}
              onChange={v => onChange('densityThreshold', v)}
            />
          </PropertyRow>
          <div className={styles.description}>
            Only this many packets can pass through per beat (overpopulation control).
          </div>
        </>
      )}
    </>
  );
}
