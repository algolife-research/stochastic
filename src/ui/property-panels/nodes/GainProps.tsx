// Gain Node Properties
import React from 'react';
import { PropertyRow, SliderInput } from '../shared';
import type { PropsEditorProps, GainPropsType } from '../types';

export function GainProps({ props, onChange }: PropsEditorProps<GainPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Gain">
        <SliderInput
          value={props.value}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('value', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Mass (Gravity)">
        <SliderInput
          value={props.mass ?? 1.0}
          min={0.1}
          max={5}
          step={0.1}
          onChange={v => onChange('mass', v)}
        />
      </PropertyRow>
    </>
  );
}
