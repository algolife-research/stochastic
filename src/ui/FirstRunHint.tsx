// First-run hint overlay
// Teaches the three core gestures the first time someone sees the canvas.
// Dismissed once, it never comes back (persisted in localStorage).

import React, { useState } from 'react';
import styles from './FirstRunHint.module.css';

const STORAGE_KEY = 'stochastic-first-run-hint-dismissed';

export function FirstRunHint(): React.ReactElement | null {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Private browsing: hint simply reappears next session
    }
  };

  return (
    <div className={styles.hint}>
      <div className={styles.steps}>
        <div className={styles.step}>
          <span className={styles.key}>Space</span>
          <span className={styles.text}>play / pause — try it now</span>
        </div>
        <div className={styles.step}>
          <span className={styles.key}>Right-click</span>
          <span className={styles.text}>add nodes to the canvas</span>
        </div>
        <div className={styles.step}>
          <span className={styles.key}>Drag</span>
          <span className={styles.text}>from a node&apos;s edge to connect it</span>
        </div>
      </div>
      <button className={styles.dismissButton} onClick={handleDismiss}>
        Got it
      </button>
    </div>
  );
}
