// Quantizer Node Properties
import React from 'react';
import type { ScaleName } from '@core/types';
import { SCALES, NOTE_LABELS } from '@core/constants';
import { PropertyRow, NumberInput, SliderInput, Checkbox, Select } from '../shared';
import type { PropsEditorProps, QuantizerPropsType } from '../types';

export function QuantizerProps({ props, onChange }: PropsEditorProps<QuantizerPropsType>): React.ReactElement {
  const scaleName = props.scale || 'major';
  const root = props.root ?? 0;
  const scaleIntervals = SCALES[scaleName];
  
  // Helper to get note name for a scale degree
  const getNoteName = (index: number) => {
    const interval = scaleIntervals[index] ?? 0;
    const noteIndex = (root + interval) % 12;
    return NOTE_LABELS[noteIndex];
  };

  return (
    <>
      <PropertyRow label="Strength">
        <SliderInput
          value={props.strength}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('strength', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Use Global Key">
        <Checkbox
          checked={props.useGlobalKey}
          onChange={v => onChange('useGlobalKey', v)}
        />
      </PropertyRow>

      {!props.useGlobalKey && (
        <>
          <PropertyRow label="Scale">
            <Select
              value={props.scale || 'major'}
              options={Object.keys(SCALES).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
              onChange={v => onChange('scale', v as ScaleName)}
            />
          </PropertyRow>
          <PropertyRow label="Root">
            <Select
              value={String(props.root ?? 0)}
              options={NOTE_LABELS.map((n, i) => ({ value: String(i), label: n }))}
              onChange={v => onChange('root', Number(v))}
            />
          </PropertyRow>
        </>
      )}

      <PropertyRow label="Mode">
        <Select
          value={props.mode || 'nearest'}
          options={[
            { value: 'nearest', label: 'Nearest Neighbor' },
            { value: 'random', label: 'Weighted Random' }
          ]}
          onChange={v => onChange('mode', v as 'nearest' | 'random')}
        />
      </PropertyRow>

      {props.mode === 'random' && (
        <>
          <PropertyRow label="Default Octave">
            <NumberInput
              value={props.defaultPitch ?? 4}
              min={0}
              max={8}
              step={1}
              onChange={v => onChange('defaultPitch', v)}
            />
          </PropertyRow>

          <div style={{ marginTop: '12px', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9em', color: '#ccc' }}>Note Probabilities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {scaleIntervals.map((_, index) => {
              const weight = props.weights?.[index] ?? 0;
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '30px', textAlign: 'right', fontSize: '0.85em' }}>{getNoteName(index)}</div>
                  <div style={{ flex: 1 }}>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={weight}
                      onChange={(e) => {
                        const newWeights = { ...(props.weights || {}) };
                        newWeights[index] = parseFloat(e.target.value);
                        onChange('weights', newWeights);
                      }}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '0.85em' }}>{Math.round(weight * 100)}%</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
