// Speaker Node Properties
import React from 'react';
import { PropertyRow, NumberInput, SliderInput } from '../shared';
import type { PropsEditorProps, SpeakerPropsType } from '../types';

export function SpeakerProps({ props, onChange }: PropsEditorProps<SpeakerPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Volume">
        <SliderInput
          value={props.volume}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('volume', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Reverb">
        <SliderInput
          value={props.reverb}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('reverb', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Pan">
        <SliderInput
          value={props.pan}
          min={-1}
          max={1}
          step={0.01}
          onChange={v => onChange('pan', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Hold Time">
        <NumberInput
          value={props.holdTime}
          min={0}
          max={10}
          step={0.01}
          onChange={v => onChange('holdTime', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Release Time">
        <NumberInput
          value={props.releaseTime}
          min={0.01}
          max={5}
          step={0.01}
          onChange={v => onChange('releaseTime', v)}
        />
      </PropertyRow>
    </>
  );
}
