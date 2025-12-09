// Delay Node Properties
import React from 'react';
import { PropertyRow, NumberInput } from '../shared';
import type { PropsEditorProps, DelayPropsType } from '../types';

export function DelayProps({ props, onChange }: PropsEditorProps<DelayPropsType>): React.ReactElement {
  return (
    <PropertyRow label="Delay Time (beats)">
      <NumberInput
        value={props.delayTime}
        min={0}
        max={16}
        step={0.25}
        onChange={v => onChange('delayTime', v)}
      />
    </PropertyRow>
  );
}
