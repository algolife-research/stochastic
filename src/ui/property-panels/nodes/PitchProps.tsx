// Pitch Node Properties
import React from 'react';
import { midiToNoteName } from '@core/constants';
import { PropertyRow, NumberInput, Select } from '../shared';
import type { PropsEditorProps, PitchPropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function PitchProps({ props, onChange }: PropsEditorProps<PitchPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Mode">
        <Select
          value={props.mode}
          options={[
            { value: 'shift', label: 'Shift' },
            { value: 'set', label: 'Set' },
          ]}
          onChange={v => onChange('mode', v)}
        />
      </PropertyRow>
      
      {props.mode === 'shift' ? (
        <PropertyRow label="Shift (semitones)">
          <NumberInput
            value={props.shift}
            min={-48}
            max={48}
            step={1}
            onChange={v => onChange('shift', v)}
          />
        </PropertyRow>
      ) : (
        <PropertyRow label="Fixed Note">
          <div className={styles.noteSelector}>
            <span className={styles.noteDisplay}>{midiToNoteName(props.fixedMidiNote)}</span>
            <NumberInput
              value={props.fixedMidiNote}
              min={0}
              max={127}
              step={1}
              onChange={v => onChange('fixedMidiNote', v)}
            />
          </div>
        </PropertyRow>
      )}
    </>
  );
}
