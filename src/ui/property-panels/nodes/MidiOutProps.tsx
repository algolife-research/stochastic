// MIDI Out Node Properties
import React from 'react';
import { PropertyRow, NumberInput, SliderInput } from '../shared';
import type { PropsEditorProps, MidiOutPropsType } from '../types';

export function MidiOutProps({ props, onChange }: PropsEditorProps<MidiOutPropsType>): React.ReactElement {
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
      
      <PropertyRow label="Duration (ms)">
        <NumberInput
          value={props.duration}
          min={1}
          max={5000}
          step={10}
          onChange={v => onChange('duration', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Velocity Scale">
        <SliderInput
          value={props.velocityScale}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('velocityScale', v)}
        />
      </PropertyRow>
    </>
  );
}
