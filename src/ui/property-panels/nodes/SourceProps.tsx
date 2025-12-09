// Source Node Properties
import React from 'react';
import { midiToNoteName } from '@core/constants';
import { PropertyRow, NumberInput, SliderInput, Checkbox, Select } from '../shared';
import type { PropsEditorProps, SourcePropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function SourceProps({ props, onChange }: PropsEditorProps<SourcePropsType>): React.ReactElement {
  const isRandom = props.noteIndex === -1;
  
  const handleNoteTypeChange = (random: boolean) => {
    if (random) {
      onChange('noteIndex', -1);
    } else {
      // Switch to fixed note - use current midiNote
      onChange('noteIndex', -2); // -2 means use midiNote directly
    }
  };
  
  return (
    <>
      <PropertyRow label="Interval (beats)">
        <NumberInput
          value={props.interval}
          min={0.125}
          max={16}
          step={0.125}
          onChange={v => onChange('interval', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Note Mode">
        <Select
          value={isRandom ? 'random' : 'fixed'}
          options={[
            { value: 'random', label: 'Random' },
            { value: 'fixed', label: 'Fixed' },
          ]}
          onChange={v => handleNoteTypeChange(v === 'random')}
        />
      </PropertyRow>
      
      {!isRandom && (
        <PropertyRow label="Note">
          <div className={styles.noteSelector}>
            <span className={styles.noteDisplay}>{midiToNoteName(props.midiNote)}</span>
            <NumberInput
              value={props.midiNote}
              min={0}
              max={127}
              step={1}
              onChange={v => onChange('midiNote', v)}
            />
          </div>
        </PropertyRow>
      )}
      
      <PropertyRow label="Intensity">
        <SliderInput
          value={props.intensity}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('intensity', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Auto Trigger">
        <Checkbox
          checked={props.autoTrigger}
          onChange={v => onChange('autoTrigger', v)}
        />
      </PropertyRow>
    </>
  );
}
