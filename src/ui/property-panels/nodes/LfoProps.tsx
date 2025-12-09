// LFO Node Properties
import React from 'react';
import { PropertyRow, NumberInput, SliderInput, Select } from '../shared';
import type { PropsEditorProps, LfoPropsType } from '../types';

export function LfoProps({ props, onChange }: PropsEditorProps<LfoPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Rate (Hz)">
        <NumberInput
          value={props.rate}
          min={0.01}
          max={20}
          step={0.01}
          onChange={v => onChange('rate', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Shape">
        <Select
          value={props.shape}
          options={[
            { value: 'sine', label: 'Sine' },
            { value: 'square', label: 'Square' },
            { value: 'sawtooth', label: 'Sawtooth' },
            { value: 'triangle', label: 'Triangle' },
            { value: 'random', label: 'Random (S&H)' },
            { value: 'noise', label: 'Noise' },
          ]}
          onChange={v => onChange('shape', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Min">
        <NumberInput
          value={props.min}
          min={-127}
          max={127}
          step={1}
          onChange={v => onChange('min', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Max">
        <NumberInput
          value={props.max}
          min={-127}
          max={127}
          step={1}
          onChange={v => onChange('max', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Phase">
        <SliderInput
          value={props.phase}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('phase', v)}
        />
      </PropertyRow>
    </>
  );
}
