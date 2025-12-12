// Mobile Warning Screen
// Displays a message on mobile/tablet devices informing users the app is optimized for desktop

import React, { useEffect, useState } from 'react';
import styles from './MobileWarning.module.css';

/**
 * Check if device is mobile/tablet based on screen width
 */
function isMobileDevice(): boolean {
  const smallScreen = window.innerWidth < 1024; // Tablets and below
  // Show warning if it's a small screen (for testing on desktop or actual mobile devices)
  return smallScreen;
}

export function MobileWarning(): React.ReactElement | null {
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Check if already dismissed in this session
      const isDismissed = sessionStorage.getItem('mobile-warning-dismissed') === 'true';
      
      if (!isDismissed && isMobileDevice()) {
        setShowWarning(true);
      } else if (!isMobileDevice()) {
        setShowWarning(false);
      }
    };

    // Check on mount
    checkDevice();

    // Re-check on window resize (for testing)
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('mobile-warning-dismissed', 'true');
    setDismissed(true);
    setShowWarning(false);
  };

  const handleContinue = () => {
    handleDismiss();
  };

  if (!showWarning || dismissed) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.icon}>📱</div>
        <h2 className={styles.title}>Desktop Experience Recommended</h2>
        <p className={styles.message}>
          Stochastic is optimized for desktop computers with keyboard and mouse input.
          Some features may not work properly on mobile devices or tablets.
        </p>
        
        <div className={styles.features}>
          <p className={styles.featureTitle}>For the best experience, use:</p>
          <ul className={styles.featureList}>
            <li>💻 Desktop or laptop computer</li>
            <li>🖱️ Mouse for precise node placement</li>
            <li>⌨️ Keyboard for shortcuts and quick actions</li>
            <li>🔊 Good speakers or headphones</li>
            <li>🌐 Chrome, Edge, or Firefox browser</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.continueButton}
            onClick={handleContinue}
          >
            Continue Anyway
          </button>
          <button 
            className={styles.dismissButton}
            onClick={handleDismiss}
          >
            Close
          </button>
        </div>

        <p className={styles.footnote}>
          This message will not appear again during this session.
        </p>
      </div>
    </div>
  );
}
