// Node Properties Switch Component
import React, { useCallback } from 'react';
import type { GraphNode } from '@core/types';
import { useGraphStore } from '@core/store';
import {
  SourceProps,
  SpeakerProps,
  PitchProps,
  OscillatorProps,
  FilterProps,
  GateProps,
  DelayProps,
  GainProps,
  TeleporterProps,
  ModulatorProps,
  TunnelProps,
  QuantizerProps,
  LfoProps,
  MidiOutProps,
  MidiCcProps,
  SceneTriggerProps,
  SplitterProps,
  MutatorProps,
  CrossoverProps,
} from './nodes';
import { PropertyRow, NumberInput, Checkbox } from './shared';
import type {
  SourcePropsType,
  SpeakerPropsType,
  PitchPropsType,
  OscillatorPropsType,
  FilterPropsType,
  GatePropsType,
  DelayPropsType,
  GainPropsType,
  TeleporterPropsType,
  ModulatorPropsType,
  TunnelPropsType,
  QuantizerPropsType,
  LfoPropsType,
  MidiOutPropsType,
  MidiCcPropsType,
  SceneTriggerPropsType,
  SplitterPropsType,
  MutatorPropsType,
  CrossoverPropsType,
} from './types';
import styles from '../PropertyPanel.module.css';

interface NodePropertiesProps {
  node: GraphNode;
}

export function NodeProperties({ node }: NodePropertiesProps): React.ReactElement {
  const updateNodeProps = useGraphStore(state => state.updateNodeProps);
  
  const handleChange = useCallback((key: string, value: unknown) => {
    updateNodeProps(node.id, { [key]: value });
  }, [node.id, updateNodeProps]);
  
  switch (node.type) {
    case 'source':
      return <SourceProps props={node.props as SourcePropsType} onChange={handleChange} />;
    case 'speaker':
      return <SpeakerProps props={node.props as SpeakerPropsType} onChange={handleChange} />;
    case 'pitch':
      return <PitchProps props={node.props as PitchPropsType} onChange={handleChange} />;
    case 'oscillator':
      return <OscillatorProps props={node.props as OscillatorPropsType} onChange={handleChange} />;
    case 'filter':
      return <FilterProps props={node.props as FilterPropsType} onChange={handleChange} />;
    case 'gate':
      return <GateProps props={node.props as GatePropsType} onChange={handleChange} />;
    case 'delay':
      return <DelayProps props={node.props as DelayPropsType} onChange={handleChange} />;
    case 'gain':
      return <GainProps props={node.props as GainPropsType} onChange={handleChange} />;
    case 'teleporter':
      return <TeleporterProps props={node.props as TeleporterPropsType} onChange={handleChange} />;
    case 'modulator':
      return <ModulatorProps props={node.props as ModulatorPropsType} onChange={handleChange} />;
    case 'tunnel':
      return <TunnelProps props={node.props as unknown as TunnelPropsType} onChange={handleChange} />;
    case 'quantizer':
      return <QuantizerProps props={node.props as QuantizerPropsType} onChange={handleChange} />;
    case 'lfo':
      return <LfoProps props={node.props as LfoPropsType} onChange={handleChange} />;
    case 'midi_out':
      return <MidiOutProps props={node.props as MidiOutPropsType} onChange={handleChange} />;
    case 'midi_cc':
      return <MidiCcProps props={node.props as MidiCcPropsType} onChange={handleChange} />;
    case 'scene_trigger':
      return <SceneTriggerProps props={node.props as SceneTriggerPropsType} onChange={handleChange} />;
    case 'splitter':
      return <SplitterProps props={node.props as SplitterPropsType} onChange={handleChange} />;
    case 'mutator':
      return <MutatorProps props={node.props as MutatorPropsType} onChange={handleChange} />;
    case 'crossover':
      return <CrossoverProps props={node.props as CrossoverPropsType} onChange={handleChange} />;
    default:
      return <GenericProps props={node.props as unknown as Record<string, unknown>} onChange={handleChange} />;
  }
}

// Generic fallback component
interface GenericPropsEditorProps {
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function GenericProps({ props, onChange }: GenericPropsEditorProps): React.ReactElement {
  return (
    <>
      {Object.entries(props).map(([key, value]) => (
        <PropertyRow key={key} label={key}>
          {typeof value === 'number' ? (
            <NumberInput
              value={value}
              onChange={v => onChange(key, v)}
            />
          ) : typeof value === 'boolean' ? (
            <Checkbox
              checked={value}
              onChange={v => onChange(key, v)}
            />
          ) : typeof value === 'string' ? (
            <input
              type="text"
              className={styles.textInput}
              value={value}
              onChange={e => onChange(key, e.target.value)}
            />
          ) : (
            <span className={styles.value}>{JSON.stringify(value)}</span>
          )}
        </PropertyRow>
      ))}
    </>
  );
}
