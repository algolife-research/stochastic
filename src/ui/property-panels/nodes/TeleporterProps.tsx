// Teleporter Node Properties
import React from 'react';
import { PropertyRow, Checkbox } from '../shared';
import type { PropsEditorProps, TeleporterPropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function TeleporterProps({ props, onChange }: PropsEditorProps<TeleporterPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Channel">
        <input
          type="text"
          className={styles.textInput}
          value={props.channel}
          maxLength={1}
          onChange={e => onChange('channel', e.target.value.toUpperCase())}
        />
      </PropertyRow>
      
      <PropertyRow label="Is Entry">
        <Checkbox
          checked={props.isEntry}
          onChange={v => onChange('isEntry', v)}
        />
      </PropertyRow>
    </>
  );
}
