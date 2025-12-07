// Phonon v2 - Edge Property Panel Component

import React, { useCallback } from 'react';
import { useGraphStore } from '@core/store';
import type { GraphEdge } from '@core/types';
import styles from './EdgePanel.module.css';

// ============================================================================
// EDGE PANEL
// ============================================================================

interface EdgePanelProps {
  edge: GraphEdge;
  embedded?: boolean;
}

export function EdgePanel({ edge, embedded }: EdgePanelProps): React.ReactElement {
  const updateEdge = useGraphStore(state => state.updateEdge);
  const getNode = useGraphStore(state => state.getNode);
  
  const fromNode = getNode(edge.from);
  const toNode = getNode(edge.to);
  
  const handleTimingModeChange = useCallback((mode: 'physical' | 'fixed') => {
    updateEdge(edge.id, { timingMode: mode });
  }, [edge.id, updateEdge]);
  
  const handleDurationChange = useCallback((beats: number | null) => {
    updateEdge(edge.id, { durationBeats: beats });
  }, [edge.id, updateEdge]);
  
  const handleTargetParamChange = useCallback((param: string | null) => {
    updateEdge(edge.id, { targetParam: param });
  }, [edge.id, updateEdge]);
  
  const handleWeightChange = useCallback((weight: number) => {
    updateEdge(edge.id, { weight });
  }, [edge.id, updateEdge]);
  
  const content = (
    <>
      {/* Header (only shown when embedded) */}
      {embedded && (
        <div className={styles['embeddedHeader']}>
          <h4>Edge Properties</h4>
          <span className={styles['edgeId']}>{edge.id.slice(0, 8)}</span>
        </div>
      )}
      
      <div className={embedded ? styles['embeddedContent'] : styles['content']}>
        {/* Connection info */}
        <div className={styles['connectionInfo']}>
          <span className={styles['nodeType']}>{fromNode?.type ?? '?'}</span>
          <span className={styles['arrow']}>→</span>
          <span className={styles['nodeType']}>{toNode?.type ?? '?'}</span>
        </div>
        
        {/* Timing Mode */}
        <div className={styles['row']}>
          <label className={styles['label']}>Timing Mode</label>
          <div className={styles['input']}>
            <select
              className={styles['select']}
              value={edge.timingMode}
              onChange={e => handleTimingModeChange(e.target.value as 'physical' | 'fixed')}
            >
              <option value="physical">Physical</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
        </div>
        
        {/* Duration (only for fixed timing) */}
        {edge.timingMode === 'fixed' && (
          <div className={styles['row']}>
            <label className={styles['label']}>Duration (beats)</label>
            <div className={styles['input']}>
              <input
                type="number"
                className={styles['numberInput']}
                value={edge.durationBeats ?? 0}
                min={0}
                max={16}
                step={0.25}
                onChange={e => handleDurationChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        )}
        
        {/* Target Parameter (for CV/modulation routing) */}
        <div className={styles['row']}>
          <label className={styles['label']}>Target Param</label>
          <div className={styles['input']}>
            <select
              className={styles['select']}
              value={edge.targetParam ?? ''}
              onChange={e => handleTargetParamChange(e.target.value || null)}
            >
              <option value="">Audio (default)</option>
              <optgroup label="Common">
                <option value="cutoff">Filter Cutoff</option>
                <option value="gain">Gain</option>
                <option value="pan">Pan</option>
                <option value="reverb">Reverb</option>
              </optgroup>
              <optgroup label="Envelope">
                <option value="attack">Attack</option>
                <option value="decay">Decay</option>
              </optgroup>
              <optgroup label="Oscillator">
                <option value="pitch">Pitch</option>
                <option value="rate">Rate</option>
                <option value="depth">Depth</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Markov Weight */}
        <div className={styles['row']}>
          <label className={styles['label']}>Weight (Markov)</label>
          <div className={styles['input']}>
            <input
              type="number"
              className={styles['numberInput']}
              value={edge.weight ?? 1}
              min={0}
              step={0.1}
              onChange={e => handleWeightChange(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        
        {/* Info text */}
        <div className={styles['info']}>
          {edge.timingMode === 'physical' ? (
            <p>Packets travel at speed based on distance.</p>
          ) : (
            <p>Packets arrive after exactly {edge.durationBeats ?? 0} beats.</p>
          )}
          {edge.targetParam && (
            <p>CV modulation → <strong>{edge.targetParam}</strong></p>
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className={styles['panel']}>
      <div className={styles['header']}>
        <h3>Edge Properties</h3>
        <span className={styles['edgeId']}>{edge.id.slice(0, 8)}</span>
      </div>
      {content}
    </div>
  );
}
