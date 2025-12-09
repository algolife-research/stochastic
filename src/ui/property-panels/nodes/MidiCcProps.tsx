// MIDI CC Node Properties
import React from 'react';
import { PropertyRow, NumberInput } from '../shared';
import type { PropsEditorProps, MidiCcPropsType } from '../types';

export function MidiCcProps({ props, onChange }: PropsEditorProps<MidiCcPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Channel">
        <NumberInput
          value={props.channel}
          min={1}
          max={16}
          step={1}
          onChange={v => onChange('channel', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="CC Number">
        <NumberInput
          value={props.ccNumber}
          min={0}
          max={127}
          step={1}
          onChange={v => onChange('ccNumber', v)}
        />
      </PropertyRow>
    </>
  );
}
