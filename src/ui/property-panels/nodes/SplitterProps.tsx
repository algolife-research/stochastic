// Splitter Node Properties
import React from 'react';
import { PropertyRow, Checkbox, Select } from '../shared';
import type { PropsEditorProps, SplitterPropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function SplitterProps({ props, onChange }: PropsEditorProps<SplitterPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Behavior">
        <Select
          value={props.behavior ?? 'broadcast'}
          options={[
            { value: 'broadcast', label: 'Broadcast (All)' },
            { value: 'random', label: 'Random (Uniform)' },
            { value: 'weighted', label: 'Weighted (Markov)' },
          ]}
          onChange={v => onChange('behavior', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Entangled">
        <Checkbox
          checked={props.entangled ?? false}
          onChange={v => onChange('entangled', v)}
        />
      </PropertyRow>
      <div className={styles.description}>
        When enabled, packets split here share effects — if one passes through a pitch modifier, all entangled packets are affected.
      </div>
    </>
  );
}
