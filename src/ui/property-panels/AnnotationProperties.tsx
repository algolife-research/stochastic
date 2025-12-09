// Annotation Properties Component
import React from 'react';
import type { Annotation } from '@core/types';
import { useGraphStore } from '@core/store';
import { ColorPicker } from '../ColorPicker';
import { PropertyRow, NumberInput } from './shared';
import styles from '../PropertyPanel.module.css';

interface AnnotationPropertiesProps {
  annotation: Annotation;
}

export function AnnotationProperties({ annotation }: AnnotationPropertiesProps): React.ReactElement {
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
        <ColorPicker
          value={annotation.color}
          onChange={color => updateAnnotation(annotation.id, { color })}
          size="small"
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
