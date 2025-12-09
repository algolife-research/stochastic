// Tunnel Node Properties
import React, { useState } from 'react';
import type { SubNode } from '@core/types';
import { TunnelPresetSelector } from '../../TunnelPresetSelector';
import type { TunnelPreset } from '@data/tunnel-presets';
import { PropertyRow } from '../shared';
import type { PropsEditorProps, TunnelPropsType } from '../types';
import styles from '../../PropertyPanel.module.css';

export function TunnelProps({ props, onChange }: PropsEditorProps<TunnelPropsType>): React.ReactElement {
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
  
  const handlePresetSelect = (preset: TunnelPreset) => {
    // Apply preset: update name and subNodes
    onChange('tunnelName', preset.name);
    // Cast subNodes to mutable array for the onChange handler
    onChange('subNodes', [...preset.subNodes] as SubNode[]);
  };
  
  return (
    <>
      {/* Preset Selector */}
      <TunnelPresetSelector 
        onSelect={handlePresetSelect}
        currentName={props.tunnelName}
      />
      
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
