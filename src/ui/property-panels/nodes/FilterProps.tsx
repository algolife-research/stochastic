// Filter Node Properties
import React from 'react';
import { PropertyRow, NumberInput } from '../shared';
import type { PropsEditorProps, FilterPropsType } from '../types';

export function FilterProps({ props, onChange }: PropsEditorProps<FilterPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Cutoff (Hz)">
        <NumberInput
          value={props.cutoff}
          min={20}
          max={20000}
          step={100}
          onChange={v => onChange('cutoff', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Attack">
        <NumberInput
          value={props.attack}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('attack', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Decay">
        <NumberInput
          value={props.decay}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('decay', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Modulation">
        <NumberInput
          value={props.mod}
          min={-10000}
          max={10000}
          step={100}
          onChange={v => onChange('mod', v)}
        />
      </PropertyRow>
    </>
  );
}
