// Scene Trigger Node Properties
import React from 'react';
import { useGraphStore } from '@core/store';
import { PropertyRow, Select } from '../shared';
import type { PropsEditorProps, SceneTriggerPropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function SceneTriggerProps({ props, onChange }: PropsEditorProps<SceneTriggerPropsType>): React.ReactElement {
  const scenes = useGraphStore(state => Array.from(state.scenes.values()));
  const playbackMode = useGraphStore(state => state.scenePlayback.mode);
  const isArrangementMode = playbackMode === 'arrangement';
  
  const sceneOptions = scenes.map((scene, index) => ({
    value: String(index),
    label: `${index}: ${scene.name}`
  }));

  return (
    <>
      {isArrangementMode && (
        <div className={styles.warningNotice}>
          ⚠️ Scene Trigger nodes are inactive in Composition mode. 
          Scenes are scheduled on the timeline instead.
        </div>
      )}
      
      <PropertyRow label="Target Scene">
        <Select
          value={String(props.targetSceneIndex)}
          options={[
            { value: '-1', label: 'None' },
            ...sceneOptions
          ]}
          onChange={v => onChange('targetSceneIndex', Number(v))}
          disabled={isArrangementMode}
        />
      </PropertyRow>
      
      <PropertyRow label="Behavior">
        <Select
          value={props.behavior}
          options={[
            { value: 'jump', label: 'Jump' },
            { value: 'crossfade', label: 'Crossfade' },
          ]}
          onChange={v => onChange('behavior', v)}
          disabled={isArrangementMode}
        />
      </PropertyRow>
    </>
  );
}
