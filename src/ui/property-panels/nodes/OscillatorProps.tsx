// Oscillator Node Properties
import React, { useEffect, useRef } from 'react';
import { PropertyRow, NumberInput, SliderInput, Select } from '../shared';
import type { PropsEditorProps, OscillatorPropsType } from '../types';

// ============================================================================
// WAVEFORM PREVIEW CANVAS
// ============================================================================

function WaveformPreview({ 
  wave, 
  attack, 
  decay 
}: { 
  wave: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'white' | 'pink' | 'brown'; 
  attack: number; 
  decay: number;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isNoiseWave = wave === 'white' || wave === 'pink' || wave === 'brown';
  
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
    const getWaveValue = (phase: number, x: number): number => {
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
        case 'white':
          return (Math.sin(x * 47.3) + Math.sin(x * 97.7) + Math.sin(x * 157.1)) * 0.33;
        case 'pink':
          return (Math.sin(x * 23.1) + Math.sin(x * 67.3) * 0.7 + Math.sin(x * 113.7) * 0.5) * 0.4;
        case 'brown':
          return (Math.sin(x * 11.7) + Math.sin(x * 31.3) * 0.5) * 0.6;
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
    ctx.strokeStyle = isNoiseWave ? '#9e9e9e' : '#a855f7'; // Grey for noise, Purple for oscillator
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const phase = t * cycles;
      const waveValue = getWaveValue(phase, x);
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
    ctx.strokeStyle = isNoiseWave ? 'rgba(158, 158, 158, 0.3)' : 'rgba(168, 85, 247, 0.3)';
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
  }, [wave, attack, decay, isNoiseWave]);
  
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

export function OscillatorProps({ props, onChange }: PropsEditorProps<OscillatorPropsType>): React.ReactElement {
  // Determine if this is a noise wave
  const isNoiseWave = props.wave === 'white' || props.wave === 'pink' || props.wave === 'brown';
  
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
            { value: 'white', label: 'White Noise' },
            { value: 'pink', label: 'Pink Noise' },
            { value: 'brown', label: 'Brown Noise' },
          ]}
          onChange={v => onChange('wave', v)}
        />
      </PropertyRow>
      
      {!isNoiseWave && (
        <PropertyRow label="Ratio">
          <NumberInput
            value={props.ratio}
            min={0.1}
            max={16}
            step={0.1}
            onChange={v => onChange('ratio', v)}
          />
        </PropertyRow>
      )}
      
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
