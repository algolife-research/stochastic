// Region Properties Component
import React from 'react';
import type { Region } from '@core/types';
import { useGraphStore } from '@core/store';
import { ColorPicker } from '../ColorPicker';
import { PropertyRow, NumberInput } from './shared';
import styles from '../PropertyPanel.module.css';

interface RegionPropertiesProps {
  region: Region;
}

export function RegionProperties({ region }: RegionPropertiesProps): React.ReactElement {
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
        <ColorPicker
          value={region.color}
          onChange={color => updateRegion(region.id, { color })}
          size="small"
          showOpacity={true}
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
