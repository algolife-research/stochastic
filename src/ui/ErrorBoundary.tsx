// Application Error Boundary
// A component crash lands here instead of white-screening the app. The
// fallback offers a reload and, when a crash-recovery snapshot exists, a
// download of the composition as a .sto file.

import React from 'react';
import { getAutosaveSnapshot } from '@core/store/autosave';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#0a0a0a', color: '#e0e0e0',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: 24, zIndex: 99999,
  },
  card: {
    maxWidth: 520, width: '100%', background: '#1e1e1e', border: '1px solid #333',
    borderRadius: 10, padding: 28,
  },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 10 },
  text: { fontSize: 14, color: '#aaa', lineHeight: 1.5, marginBottom: 8 },
  detail: {
    fontFamily: 'monospace', fontSize: 12, color: '#d99', background: '#161010',
    border: '1px solid #3a2626', borderRadius: 6, padding: 10, margin: '12px 0',
    maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap',
  },
  row: { display: 'flex', gap: 10, marginTop: 16 },
  primary: {
    padding: '10px 18px', background: '#2c667f', border: '1px solid #3a80a0',
    borderRadius: 6, color: '#eaf6fc', fontSize: 14, cursor: 'pointer',
  },
  secondary: {
    padding: '10px 18px', background: '#2a2a2a', border: '1px solid #444',
    borderRadius: 6, color: '#ccc', fontSize: 14, cursor: 'pointer',
  },
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Uncaught error in UI:', error, info.componentStack);
  }

  private handleDownloadRecovery = (): void => {
    const snapshot = getAutosaveSnapshot();
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.projectName.replace(/[^a-z0-9_-]+/gi, '_') || 'recovery'}.sto`;
    a.click();
    URL.revokeObjectURL(url);
  };

  override render(): React.ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    const hasSnapshot = getAutosaveSnapshot() !== null;

    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={styles.title}>Something went wrong</div>
          <p style={styles.text}>
            The app hit an unexpected error. Your work is autosaved every few
            seconds — reloading will offer to restore your last session.
          </p>
          <div style={styles.detail}>{this.state.error.message}</div>
          <div style={styles.row}>
            <button style={styles.primary} onClick={() => window.location.reload()}>
              Reload
            </button>
            {hasSnapshot && (
              <button style={styles.secondary} onClick={this.handleDownloadRecovery}>
                Download recovery .sto
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
