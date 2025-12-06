// Phonon v2 - Property Panel Component

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGraphStore } from '@core/store';
import type { GraphNode, Annotation, Region } from '@core/types';
import { NODE_COLORS, midiToNoteName } from '@core/constants';
import styles from './PropertyPanel.module.css';

// ============================================================================
// PROPERTY PANEL
// ============================================================================

interface PropertyPanelProps {
  node?: GraphNode;
  annotation?: Annotation;
  region?: Region;
}

export function PropertyPanel({ node, annotation, region }: PropertyPanelProps): React.ReactElement {
  if (annotation) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>✏️ Annotation</h3>
          <span className={styles.nodeId}>{annotation.id.slice(0, 8)}</span>
        </div>
        <div className={styles.content}>
          <AnnotationProperties annotation={annotation} />
        </div>
      </div>
    );
  }
  
  if (region) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>📦 Region</h3>
          <span className={styles.nodeId}>{region.id.slice(0, 8)}</span>
        </div>
        <div className={styles.content}>
          <RegionProperties region={region} />
        </div>
      </div>
    );
  }
  
  if (!node) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>Properties</h3>
        </div>
        <div className={styles.empty}>
          Select a node, annotation, or region to view properties
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.panel}>
      <div 
        className={styles.header}
        style={{ borderLeftColor: NODE_COLORS[node.type] }}
      >
        <h3>{node.type.charAt(0).toUpperCase() + node.type.slice(1)}</h3>
        <span className={styles.nodeId}>{node.id.slice(0, 8)}</span>
      </div>
      
      <div className={styles.content}>
        <NodeProperties node={node} />
      </div>
    </div>
  );
}

// ============================================================================
// NODE-SPECIFIC PROPERTIES
// ============================================================================

interface NodePropertiesProps {
  node: GraphNode;
}

function NodeProperties({ node }: NodePropertiesProps): React.ReactElement {
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
    case 'polariser':
      return <PolariserProps props={node.props as PolariserPropsType} onChange={handleChange} />;
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
    case 'noise':
      return <NoiseProps props={node.props as NoisePropsType} onChange={handleChange} />;
    case 'harmonic':
      return <HarmonicProps props={node.props as HarmonicPropsType} onChange={handleChange} />;
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
      return <SplitterNodeProps props={node.props as SplitterPropsType} onChange={handleChange} />;
    default:
      return <GenericProps props={node.props as unknown as Record<string, unknown>} onChange={handleChange} />;
  }
}

// ============================================================================
// PROPERTY TYPE DEFINITIONS
// ============================================================================

type SourcePropsType = { interval: number; midiNote: number; noteIndex: number; intensity: number; autoTrigger: boolean };
type SpeakerPropsType = { volume: number; reverb: number; pan: number; holdTime: number; releaseTime: number };
type PitchPropsType = { mode: string; shift: number; fixedMidiNote: number };
type PolariserPropsType = { wave: 'sine' | 'square' | 'sawtooth' | 'triangle'; attack: number; decay: number; mix: number };
type FilterPropsType = { cutoff: number; attack: number; decay: number; mod: number };
type GatePropsType = { prob: number };
type DelayPropsType = { delayTime: number };
type GainPropsType = { value: number; mass: number };
type TeleporterPropsType = { channel: string; isEntry: boolean };
type NoisePropsType = { wave: 'white' | 'pink' | 'brown'; attack: number; decay: number; mix: number };
type HarmonicPropsType = { ratio: number; wave: 'sine' | 'square' | 'sawtooth' | 'triangle'; attack: number; decay: number; mix: number };
type ModulatorPropsType = { rate: number; depth: number; delay: number };
type SubNodeType = { type: string; props: Record<string, unknown> };
type TunnelPropsType = { tunnelName: string; subNodes: SubNodeType[] };
type QuantizerPropsType = { strength: number; useGlobalKey: boolean };
type LfoPropsType = { rate: number; shape: 'sine' | 'square' | 'sawtooth' | 'triangle'; min: number; max: number; phase: number };
type MidiOutPropsType = { channel: number; duration: number; velocityScale: number };
type MidiCcPropsType = { channel: number; ccNumber: number };
type SceneTriggerPropsType = { targetSceneIndex: number; behavior: 'jump' | 'crossfade' };
type SplitterPropsType = { entangled: boolean };

// ============================================================================
// SPECIFIC PROPERTY EDITORS
// ============================================================================

interface PropsEditorProps<T> {
  props: T;
  onChange: (key: string, value: unknown) => void;
}

function SourceProps({ props, onChange }: PropsEditorProps<SourcePropsType>): React.ReactElement {
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

function SpeakerProps({ props, onChange }: PropsEditorProps<SpeakerPropsType>): React.ReactElement {
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

function PitchProps({ props, onChange }: PropsEditorProps<PitchPropsType>): React.ReactElement {
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

// ============================================================================
// POLARISER - Wave Preview Canvas
// ============================================================================

function WaveformPreview({ 
  wave, 
  attack, 
  decay 
}: { 
  wave: 'sine' | 'square' | 'sawtooth' | 'triangle'; 
  attack: number; 
  decay: number;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const cycles = 8;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Generate waveform
    const getWaveValue = (phase: number): number => {
      const p = phase % 1;
      switch (wave) {
        case 'sine':
          return Math.sin(p * Math.PI * 2);
        case 'square':
          return p < 0.5 ? 1 : -1;
        case 'sawtooth':
          return 2 * p - 1;
        case 'triangle':
          return 4 * Math.abs(p - 0.5) - 1;
        default:
          return 0;
      }
    };
    
    // Calculate envelope
    const getEnvelope = (t: number): number => {
      const attackTime = attack * 0.3; // Normalize to 0-0.3 range
      const decayTime = decay * 0.7; // Normalize to 0-0.7 range
      
      if (t < attackTime) {
        return t / attackTime;
      } else if (t < attackTime + decayTime) {
        return 1 - ((t - attackTime) / decayTime) * 0.5;
      } else {
        return 0.5;
      }
    };
    
    // Draw waveform
    ctx.strokeStyle = '#a855f7'; // Purple for polariser
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const phase = t * cycles;
      const waveValue = getWaveValue(phase);
      const envelope = getEnvelope(t);
      const y = height / 2 - (waveValue * envelope * height * 0.4);
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Draw envelope outline
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    // Upper envelope
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const envelope = getEnvelope(t);
      const y = height / 2 - (envelope * height * 0.4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Lower envelope
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const envelope = getEnvelope(t);
      const y = height / 2 + (envelope * height * 0.4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    ctx.setLineDash([]);
  }, [wave, attack, decay]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={190} 
      height={60}
      style={{ 
        width: '100%', 
        height: '60px', 
        borderRadius: '4px',
        border: '1px solid #333'
      }}
    />
  );
}

function PolariserProps({ props, onChange }: PropsEditorProps<PolariserPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Wave Preview">
        <WaveformPreview wave={props.wave} attack={props.attack} decay={props.decay} />
      </PropertyRow>
      
      <PropertyRow label="Wave Type">
        <Select
          value={props.wave}
          options={[
            { value: 'sine', label: 'Sine' },
            { value: 'square', label: 'Square' },
            { value: 'sawtooth', label: 'Sawtooth' },
            { value: 'triangle', label: 'Triangle' },
          ]}
          onChange={v => onChange('wave', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Attack">
        <SliderInput
          value={props.attack}
          min={0}
          max={1}
          step={0.01}
          onChange={(v: number) => onChange('attack', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Decay">
        <SliderInput
          value={props.decay}
          min={0}
          max={1}
          step={0.01}
          onChange={(v: number) => onChange('decay', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Mix">
        <SliderInput
          value={props.mix ?? 1.0}
          min={0}
          max={1}
          step={0.01}
          onChange={(v: number) => onChange('mix', v)}
        />
      </PropertyRow>
    </>
  );
}

function FilterProps({ props, onChange }: PropsEditorProps<FilterPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Cutoff (Hz)">
        <NumberInput
          value={props.cutoff}
          min={20}
          max={20000}
          step={100}
          onChange={v => onChange('cutoff', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Attack">
        <NumberInput
          value={props.attack}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('attack', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Decay">
        <NumberInput
          value={props.decay}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('decay', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Modulation">
        <NumberInput
          value={props.mod}
          min={-10000}
          max={10000}
          step={100}
          onChange={v => onChange('mod', v)}
        />
      </PropertyRow>
    </>
  );
}

function GateProps({ props, onChange }: PropsEditorProps<GatePropsType>): React.ReactElement {
  return (
    <PropertyRow label="Probability">
      <SliderInput
        value={props.prob}
        min={0}
        max={1}
        step={0.01}
        onChange={v => onChange('prob', v)}
      />
    </PropertyRow>
  );
}

function DelayProps({ props, onChange }: PropsEditorProps<DelayPropsType>): React.ReactElement {
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

function GainProps({ props, onChange }: PropsEditorProps<GainPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Gain">
        <SliderInput
          value={props.value}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('value', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Mass (Gravity)">
        <SliderInput
          value={props.mass ?? 1.0}
          min={0.1}
          max={5}
          step={0.1}
          onChange={v => onChange('mass', v)}
        />
      </PropertyRow>
    </>
  );
}

function TeleporterProps({ props, onChange }: PropsEditorProps<TeleporterPropsType>): React.ReactElement {
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

// ============================================================================
// NEW NODE TYPE EDITORS
// ============================================================================

function NoiseProps({ props, onChange }: PropsEditorProps<NoisePropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Noise Type">
        <Select
          value={props.wave}
          options={[
            { value: 'white', label: 'White' },
            { value: 'pink', label: 'Pink' },
            { value: 'brown', label: 'Brown' },
          ]}
          onChange={v => onChange('wave', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Attack">
        <SliderInput
          value={props.attack}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('attack', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Decay">
        <SliderInput
          value={props.decay}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('decay', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Mix">
        <SliderInput
          value={props.mix}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('mix', v)}
        />
      </PropertyRow>
    </>
  );
}

function HarmonicProps({ props, onChange }: PropsEditorProps<HarmonicPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Ratio">
        <NumberInput
          value={props.ratio}
          min={0.5}
          max={8}
          step={0.5}
          onChange={v => onChange('ratio', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Wave">
        <Select
          value={props.wave}
          options={[
            { value: 'sine', label: 'Sine' },
            { value: 'square', label: 'Square' },
            { value: 'sawtooth', label: 'Sawtooth' },
            { value: 'triangle', label: 'Triangle' },
          ]}
          onChange={v => onChange('wave', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Attack">
        <SliderInput
          value={props.attack}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('attack', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Decay">
        <SliderInput
          value={props.decay}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('decay', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Mix">
        <SliderInput
          value={props.mix}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('mix', v)}
        />
      </PropertyRow>
    </>
  );
}

function ModulatorProps({ props, onChange }: PropsEditorProps<ModulatorPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Rate (Hz)">
        <NumberInput
          value={props.rate}
          min={0.1}
          max={20}
          step={0.1}
          onChange={v => onChange('rate', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Depth">
        <NumberInput
          value={props.depth}
          min={0}
          max={100}
          step={1}
          onChange={v => onChange('depth', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Delay (s)">
        <SliderInput
          value={props.delay}
          min={0}
          max={2}
          step={0.01}
          onChange={v => onChange('delay', v)}
        />
      </PropertyRow>
    </>
  );
}

function TunnelProps({ props, onChange }: PropsEditorProps<TunnelPropsType>): React.ReactElement {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const handleSubNodePropChange = (index: number, key: string, value: unknown) => {
    const newSubNodes = [...(props.subNodes || [])];
    if (newSubNodes[index]) {
      newSubNodes[index] = {
        ...newSubNodes[index],
        props: {
          ...newSubNodes[index].props,
          [key]: value
        }
      };
      onChange('subNodes', newSubNodes);
    }
  };
  
  const handleRemoveSubNode = (index: number) => {
    const newSubNodes = [...(props.subNodes || [])];
    newSubNodes.splice(index, 1);
    onChange('subNodes', newSubNodes);
  };
  
  const handleMoveSubNode = (index: number, direction: 'up' | 'down') => {
    const newSubNodes = [...(props.subNodes || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newSubNodes.length) {
      const temp = newSubNodes[index];
      if (temp && newSubNodes[newIndex]) {
        newSubNodes[index] = newSubNodes[newIndex];
        newSubNodes[newIndex] = temp;
        onChange('subNodes', newSubNodes);
        setExpandedIndex(newIndex); // Follow the moved node
      }
    }
  };
  
  return (
    <>
      <PropertyRow label="Name">
        <input
          type="text"
          className={styles.textInput}
          value={props.tunnelName}
          onChange={e => onChange('tunnelName', e.target.value)}
        />
      </PropertyRow>
      
      <div className={styles.subNodesSection}>
        <div className={styles.subNodesHeader}>
          Sub-nodes ({props.subNodes?.length ?? 0})
        </div>
        
        {(props.subNodes || []).map((subNode, index) => (
          <div key={index} className={styles.subNodeItem}>
            <div 
              className={styles.subNodeHeader}
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            >
              <span className={styles.subNodeType}>{subNode.type}</span>
              <div className={styles.subNodeControls}>
                <button
                  className={styles.moveBtn}
                  onClick={(e) => { e.stopPropagation(); handleMoveSubNode(index, 'up'); }}
                  disabled={index === 0}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className={styles.moveBtn}
                  onClick={(e) => { e.stopPropagation(); handleMoveSubNode(index, 'down'); }}
                  disabled={index === (props.subNodes?.length ?? 0) - 1}
                  title="Move down"
                >
                  ↓
                </button>
                <span className={styles.expandIcon}>{expandedIndex === index ? '▼' : '▶'}</span>
              </div>
            </div>
            
            {expandedIndex === index && (
              <div className={styles.subNodeProps}>
                {Object.entries(subNode.props || {}).map(([key, value]) => (
                  <div key={key} className={styles.subNodePropRow}>
                    <label className={styles.subNodePropLabel}>{key}</label>
                    {typeof value === 'number' ? (
                      <input
                        type="number"
                        className={styles.numberInput}
                        value={value}
                        step={value < 1 ? 0.01 : 1}
                        onChange={e => handleSubNodePropChange(index, key, parseFloat(e.target.value))}
                      />
                    ) : typeof value === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={e => handleSubNodePropChange(index, key, e.target.checked)}
                      />
                    ) : typeof value === 'string' ? (
                      <input
                        type="text"
                        className={styles.textInput}
                        value={value}
                        onChange={e => handleSubNodePropChange(index, key, e.target.value)}
                      />
                    ) : (
                      <span>{JSON.stringify(value)}</span>
                    )}
                  </div>
                ))}
                <button 
                  className={styles.removeSubNodeBtn}
                  onClick={() => handleRemoveSubNode(index)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function QuantizerProps({ props, onChange }: PropsEditorProps<QuantizerPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Strength">
        <SliderInput
          value={props.strength}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('strength', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Use Global Key">
        <Checkbox
          checked={props.useGlobalKey}
          onChange={v => onChange('useGlobalKey', v)}
        />
      </PropertyRow>
    </>
  );
}

function LfoProps({ props, onChange }: PropsEditorProps<LfoPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Rate (Hz)">
        <NumberInput
          value={props.rate}
          min={0.01}
          max={20}
          step={0.01}
          onChange={v => onChange('rate', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Shape">
        <Select
          value={props.shape}
          options={[
            { value: 'sine', label: 'Sine' },
            { value: 'square', label: 'Square' },
            { value: 'sawtooth', label: 'Sawtooth' },
            { value: 'triangle', label: 'Triangle' },
          ]}
          onChange={v => onChange('shape', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Min">
        <NumberInput
          value={props.min}
          min={-127}
          max={127}
          step={1}
          onChange={v => onChange('min', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Max">
        <NumberInput
          value={props.max}
          min={-127}
          max={127}
          step={1}
          onChange={v => onChange('max', v)}
        />
      </PropertyRow>
      
      <PropertyRow label="Phase">
        <SliderInput
          value={props.phase}
          min={0}
          max={1}
          step={0.01}
          onChange={v => onChange('phase', v)}
        />
      </PropertyRow>
    </>
  );
}

function MidiOutProps({ props, onChange }: PropsEditorProps<MidiOutPropsType>): React.ReactElement {
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

function MidiCcProps({ props, onChange }: PropsEditorProps<MidiCcPropsType>): React.ReactElement {
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

function SceneTriggerProps({ props, onChange }: PropsEditorProps<SceneTriggerPropsType>): React.ReactElement {
  return (
    <>
      <PropertyRow label="Target Scene">
        <NumberInput
          value={props.targetSceneIndex}
          min={-1}
          max={99}
          step={1}
          onChange={v => onChange('targetSceneIndex', v)}
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
        />
      </PropertyRow>
    </>
  );
}

function SplitterNodeProps({ props, onChange }: PropsEditorProps<SplitterPropsType>): React.ReactElement {
  return (
    <>
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

function GenericProps({ props, onChange }: PropsEditorProps<Record<string, unknown>>): React.ReactElement {
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

// ============================================================================
// REUSABLE INPUT COMPONENTS
// ============================================================================

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

function PropertyRow({ label, children }: PropertyRowProps): React.ReactElement {
  return (
    <div className={styles.row}>
      <label className={styles.label}>{label}</label>
      <div className={styles.input}>{children}</div>
    </div>
  );
}

interface NumberInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

function NumberInput({ value, min, max, step = 1, onChange }: NumberInputProps): React.ReactElement {
  return (
    <input
      type="number"
      className={styles.numberInput}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value))}
    />
  );
}

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderInput({ value, min, max, step, onChange }: SliderInputProps): React.ReactElement {
  const safeValue = value ?? min ?? 0;
  return (
    <div className={styles.sliderContainer}>
      <input
        type="range"
        className={styles.slider}
        value={safeValue}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span className={styles.sliderValue}>{safeValue.toFixed(2)}</span>
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Checkbox({ checked, onChange }: CheckboxProps): React.ReactElement {
  return (
    <input
      type="checkbox"
      className={styles.checkbox}
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
  );
}

interface SelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function Select({ value, options, onChange }: SelectProps): React.ReactElement {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// ANNOTATION PROPERTIES
// ============================================================================

interface AnnotationPropertiesProps {
  annotation: Annotation;
}

function AnnotationProperties({ annotation }: AnnotationPropertiesProps): React.ReactElement {
  const updateAnnotation = useGraphStore(state => state.updateAnnotation);
  
  return (
    <>
      <PropertyRow label="Text">
        <input
          type="text"
          className={styles.textInput}
          value={annotation.text}
          onChange={e => updateAnnotation(annotation.id, { text: e.target.value })}
          placeholder="Enter text..."
        />
      </PropertyRow>
      
      <PropertyRow label="Font Size">
        <NumberInput
          value={annotation.fontSize}
          min={8}
          max={72}
          step={1}
          onChange={value => updateAnnotation(annotation.id, { fontSize: value })}
        />
      </PropertyRow>
      
      <PropertyRow label="Color">
        <input
          type="color"
          className={styles.colorInput}
          value={annotation.color}
          onChange={e => updateAnnotation(annotation.id, { color: e.target.value })}
        />
      </PropertyRow>
      
      <PropertyRow label="Position">
        <div style={{ display: 'flex', gap: '8px' }}>
          <NumberInput
            value={Math.round(annotation.x)}
            onChange={value => updateAnnotation(annotation.id, { x: value })}
          />
          <NumberInput
            value={Math.round(annotation.y)}
            onChange={value => updateAnnotation(annotation.id, { y: value })}
          />
        </div>
      </PropertyRow>
    </>
  );
}

// ============================================================================
// REGION PROPERTIES
// ============================================================================

interface RegionPropertiesProps {
  region: Region;
}

function RegionProperties({ region }: RegionPropertiesProps): React.ReactElement {
  const updateRegion = useGraphStore(state => state.updateRegion);
  
  return (
    <>
      <PropertyRow label="Name">
        <input
          type="text"
          className={styles.textInput}
          value={region.name}
          onChange={e => updateRegion(region.id, { name: e.target.value })}
          placeholder="Enter name..."
        />
      </PropertyRow>
      
      <PropertyRow label="Description">
        <textarea
          className={styles.textArea}
          value={region.description}
          onChange={e => updateRegion(region.id, { description: e.target.value })}
          placeholder="Enter description..."
          rows={3}
        />
      </PropertyRow>
      
      <PropertyRow label="Color">
        <input
          type="color"
          className={styles.colorInput}
          value={region.color}
          onChange={e => updateRegion(region.id, { color: e.target.value })}
        />
      </PropertyRow>
      
      <PropertyRow label="Position">
        <div style={{ display: 'flex', gap: '8px' }}>
          <NumberInput
            value={Math.round(region.x)}
            onChange={value => updateRegion(region.id, { x: value })}
          />
          <NumberInput
            value={Math.round(region.y)}
            onChange={value => updateRegion(region.id, { y: value })}
          />
        </div>
      </PropertyRow>
      
      <PropertyRow label="Size">
        <div style={{ display: 'flex', gap: '8px' }}>
          <NumberInput
            value={Math.round(region.width)}
            min={50}
            onChange={value => updateRegion(region.id, { width: value })}
          />
          <NumberInput
            value={Math.round(region.height)}
            min={50}
            onChange={value => updateRegion(region.id, { height: value })}
          />
        </div>
      </PropertyRow>
    </>
  );
}
