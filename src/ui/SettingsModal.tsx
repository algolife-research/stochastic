// Stochastic v2 - Global Settings Modal

import React, { useState, useEffect } from 'react';
import { useGraphStore } from '@core/store';
import { SCALES } from '@core/constants';
import type { ScaleName } from '@core/types';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps): React.ReactElement | null {
  const musicalContext = useGraphStore(state => state.musicalContext);
  const globalSettings = useGraphStore(state => state.globalSettings);
  const projectMeta = useGraphStore(state => state.projectMeta);
  const setMusicalContext = useGraphStore(state => state.setMusicalContext);
  const setGlobalSettings = useGraphStore(state => state.setGlobalSettings);
  const setProjectMeta = useGraphStore(state => state.setProjectMeta);
  
  const [rootNote, setRootNote] = useState(musicalContext.root);
  const [scaleName, setScaleName] = useState(musicalContext.scaleName);
  const [gravity, setGravity] = useState(globalSettings.gravityConstant);
  const [defaultEdgeBehaviour, setDefaultEdgeBehaviour] = useState(globalSettings.defaultEdgeBehaviour);
  const [uiScale, setUiScale] = useState(globalSettings.uiScale);
  const [projectName, setProjectName] = useState(projectMeta.name);
  const [projectAuthor, setProjectAuthor] = useState(projectMeta.author);
  
  useEffect(() => {
    if (visible) {
      setRootNote(musicalContext.root);
      setScaleName(musicalContext.scaleName);
      setGravity(globalSettings.gravityConstant);
      setDefaultEdgeBehaviour(globalSettings.defaultEdgeBehaviour);
      setUiScale(globalSettings.uiScale);
      setProjectName(projectMeta.name);
      setProjectAuthor(projectMeta.author);
    }
  }, [visible, musicalContext, globalSettings, projectMeta]);
  
  const handleSave = () => {
    // Update musical context
    const scale = SCALES[scaleName];
    if (scale) {
      setMusicalContext({ root: rootNote, scale, scaleName });
    }
    
    // Update universal constants
    setGlobalSettings({ gravityConstant: gravity, defaultEdgeBehaviour, uiScale });
    
    // Update project meta
    setProjectMeta({
      ...projectMeta,
      name: projectName,
      author: projectAuthor,
      modified: Date.now(),
    });
    
    onClose();
  };
  
  const handleCancel = () => {
    // Reset to current values
    setRootNote(musicalContext.root);
    setScaleName(musicalContext.scaleName);
    setGravity(globalSettings.gravityConstant);
    setDefaultEdgeBehaviour(globalSettings.defaultEdgeBehaviour);
    setUiScale(globalSettings.uiScale);
    setProjectName(projectMeta.name);
    setProjectAuthor(projectMeta.author);
    onClose();
  };
  
  if (!visible) return null;
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>⚙️ Universal Constants</h2>
          <button className={styles.closeBtn} onClick={handleCancel}>×</button>
        </div>
        
        <div className={styles.content}>
          {/* Project Info */}
          <section className={styles.section}>
            <h3>Project Info</h3>
            
            <div className={styles.row}>
              <label>Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Untitled Composition"
              />
            </div>
            
            <div className={styles.row}>
              <label>Author</label>
              <input
                type="text"
                value={projectAuthor}
                onChange={e => setProjectAuthor(e.target.value)}
                placeholder="Anonymous"
              />
            </div>
          </section>
          
          {/* Musical Context */}
          <section className={styles.section}>
            <h3>Musical Context</h3>
            
            <div className={styles.row}>
              <label>Root Note</label>
              <select value={rootNote} onChange={e => setRootNote(parseInt(e.target.value))}>
                {noteNames.map((name, index) => (
                  <option key={index} value={index}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.row}>
              <label>Scale</label>
              <select value={scaleName} onChange={e => setScaleName(e.target.value as ScaleName)}>
                {Object.keys(SCALES).map(name => (
                  <option key={name} value={name}>
                    {name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className={styles.info}>
              <p>Global key used by Quantizer nodes when "Use Global Key" is enabled.</p>
            </div>
          </section>
          
          {/* Universal Constants */}
          <section className={styles.section}>
            <h3>Universal Constants</h3>
            
            <div className={styles.row}>
              <label>Default Edge Behaviour</label>
              <select 
                value={defaultEdgeBehaviour} 
                onChange={e => setDefaultEdgeBehaviour(e.target.value as 'physical' | 'fixed')}
              >
                <option value="fixed">Fixed (1 beat)</option>
                <option value="physical">Physical (length-based)</option>
              </select>
            </div>
            
            <div className={styles.info}>
              <p>New edges default to this timing mode. Fixed = 1 beat duration, Physical = based on edge length.</p>
            </div>
            
            <div className={styles.row}>
              <label>Gravity Constant</label>
              <input
                type="number"
                value={gravity}
                onChange={e => setGravity(parseFloat(e.target.value))}
                min={0}
                max={10}
                step={0.1}
              />
            </div>
            
            <div className={styles.info}>
              <p>Affects packet speed when Gain nodes have mass &gt; 1.</p>
            </div>
          </section>
          
          {/* UI Settings */}
          <section className={styles.section}>
            <h3>Interface</h3>
            
            <div className={styles.row}>
              <label>UI Scale</label>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  value={uiScale}
                  onChange={e => setUiScale(parseInt(e.target.value))}
                  min={50}
                  max={150}
                  step={5}
                />
                <span className={styles.sliderValue}>{uiScale}%</span>
              </div>
            </div>
            
            <div className={styles.info}>
              <p>Scale the entire UI. Useful for high-DPI displays or accessibility.</p>
            </div>
          </section>
        </div>
        
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
