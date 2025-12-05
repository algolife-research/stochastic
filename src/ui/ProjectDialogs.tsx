import React, { useState, useEffect } from 'react';
import styles from './ProjectDialogs.module.css';

interface NewCompositionDialogProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  existingFiles: string[];
}

export function NewCompositionDialog({ visible, onClose, onCreate, existingFiles }: NewCompositionDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setError('');
    }
  }, [visible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Name cannot be empty');
      return;
    }
    
    const filename = cleanName.endsWith('.json') ? cleanName : `${cleanName}.json`;
    if (existingFiles.includes(filename)) {
      setError('File already exists');
      return;
    }

    onCreate(cleanName);
  };

  if (!visible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.title}>New Composition</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <input
              autoFocus
              className={styles.input}
              placeholder="Composition Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {error && <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px' }}>{error}</div>}
          </div>
          <div className={styles.buttons}>
            <button type="button" className={styles.button} onClick={onClose}>Cancel</button>
            <button type="submit" className={`${styles.button} ${styles.primary}`}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LoadCompositionDialogProps {
  visible: boolean;
  onClose: () => void;
  onLoad: (filename: string) => void;
  files: string[];
  currentFile: string | null;
}

export function LoadCompositionDialog({ visible, onClose, onLoad, files, currentFile }: LoadCompositionDialogProps) {
  if (!visible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.title}>Load Composition</div>
        <div className={styles.list}>
          {files.length === 0 ? (
            <div style={{ padding: '16px', color: '#888', textAlign: 'center' }}>No compositions found</div>
          ) : (
            files.map(file => (
              <button
                key={file}
                className={`${styles.listItem} ${file === currentFile ? styles.active : ''}`}
                onClick={() => onLoad(file)}
              >
                {file.replace('.json', '')}
              </button>
            ))
          )}
        </div>
        <div className={styles.buttons}>
          <button className={styles.button} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
