// Modulator Node Properties
import React from 'react';
import { PropertyRow, NumberInput, SliderInput } from '../shared';
import type { PropsEditorProps, ModulatorPropsType } from '../types';

export function ModulatorProps({ props, onChange }: PropsEditorProps<ModulatorPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Rate (Hz)">
        <NumberInput
          value={props.rate}
          min={0.1}
          max={20}
          step={0.1}
          onChange={v => onChange('rate', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Depth">
        <NumberInput
          value={props.depth}
          min={0}
          max={100}
          step={1}
          onChange={v => onChange('depth', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Delay (s)">
        <SliderInput
          value={props.delay}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('delay', v)}
        />
      </PropertyRow>
    </>
  );
}
