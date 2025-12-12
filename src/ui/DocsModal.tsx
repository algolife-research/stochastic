// Stochastic - Documentation Modal Component
// Quick reference docs accessible from toolbar

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DocsModal.module.css';

// ============================================================================
// DOCUMENTATION CONTENT
// ============================================================================

interface DocSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const NODE_DOCS: DocSection[] = [
  {
    id: 'source',
    title: 'Source',
    icon: '🎵',
    content: (
      <>
        <p>Emits packets at regular intervals. The starting point for all audio chains.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Interval</strong> - Beats between triggers</li>
          <li><strong>Note</strong> - Base MIDI note (0-127)</li>
          <li><strong>Intensity</strong> - Velocity/amplitude (0-1)</li>
          <li><strong>Auto Trigger</strong> - Emit automatically when running</li>
        </ul>
      </>
    ),
  },
  {
    id: 'oscillator',
    title: 'Oscillator',
    icon: '🔊',
    content: (
      <>
        <p>Adds a waveform layer to passing packets. Multiple oscillators can be chained for rich timbres.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Wave</strong> - sine, square, sawtooth, triangle, or noise types</li>
          <li><strong>Attack</strong> - Time to reach full volume (seconds)</li>
          <li><strong>Decay</strong> - Time to fade out (seconds)</li>
          <li><strong>Mix</strong> - Layer volume (0-1)</li>
          <li><strong>Ratio</strong> - Frequency multiplier (harmonics)</li>
        </ul>
      </>
    ),
  },
  {
    id: 'filter',
    title: 'Filter',
    icon: '🎚️',
    content: (
      <>
        <p>Shapes the frequency content of sounds with a lowpass filter and envelope.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Cutoff</strong> - Filter frequency (Hz)</li>
          <li><strong>Mod</strong> - Envelope modulation amount</li>
          <li><strong>Attack</strong> - Envelope attack time</li>
          <li><strong>Decay</strong> - Envelope decay time</li>
        </ul>
      </>
    ),
  },
  {
    id: 'gate',
    title: 'Gate',
    icon: '🚦',
    content: (
      <>
        <p>Controls which packets pass through based on probability or fitness criteria.</p>
        <h4>Modes</h4>
        <ul>
          <li><strong>Probability</strong> - Random chance (0-1)</li>
          <li><strong>Harmonic</strong> - Filter by scale consonance</li>
          <li><strong>Energy</strong> - Filter by gain level</li>
          <li><strong>Density</strong> - Limit packets per beat</li>
          <li><strong>All</strong> - Combine all fitness criteria</li>
        </ul>
      </>
    ),
  },
  {
    id: 'speaker',
    title: 'Speaker',
    icon: '🔈',
    content: (
      <>
        <p>Audio output node. Converts packets into sound.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Volume</strong> - Output level (0-1)</li>
          <li><strong>Pan</strong> - Stereo position (-1 to 1)</li>
          <li><strong>Reverb</strong> - Wet/dry mix (0-1)</li>
          <li><strong>Hold Time</strong> - Sustain duration</li>
          <li><strong>Release Time</strong> - Fade out duration</li>
        </ul>
      </>
    ),
  },
  {
    id: 'lfo',
    title: 'LFO',
    icon: '〰️',
    content: (
      <>
        <p>Low Frequency Oscillator for parameter modulation via CV edges.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Rate</strong> - Oscillation frequency (Hz)</li>
          <li><strong>Shape</strong> - sine, triangle, square, sawtooth, random</li>
          <li><strong>Min/Max</strong> - Output value range</li>
          <li><strong>Phase</strong> - Starting phase offset</li>
        </ul>
        <h4>Usage</h4>
        <p>Connect to another node and set the edge's Target Param to modulate that parameter.</p>
      </>
    ),
  },
  {
    id: 'quantizer',
    title: 'Quantizer',
    icon: '🎼',
    content: (
      <>
        <p>Snaps packet pitches to the nearest note in the selected scale.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Strength</strong> - How strongly to quantize (0-1)</li>
          <li><strong>Mode</strong> - Nearest note or weighted random</li>
          <li><strong>Use Global Key</strong> - Use project key or local override</li>
        </ul>
      </>
    ),
  },
  {
    id: 'pitch',
    title: 'Pitch',
    icon: '🎹',
    content: (
      <>
        <p>Shifts or sets the pitch of passing packets.</p>
        <h4>Modes</h4>
        <ul>
          <li><strong>Shift</strong> - Add semitones to current pitch</li>
          <li><strong>Set</strong> - Set to a specific MIDI note</li>
        </ul>
      </>
    ),
  },
  {
    id: 'splitter',
    title: 'Splitter',
    icon: '🔀',
    content: (
      <>
        <p>Splits incoming packets to multiple outputs.</p>
        <h4>Behaviors</h4>
        <ul>
          <li><strong>Broadcast</strong> - Send to all outputs</li>
          <li><strong>Random</strong> - Send to random output</li>
          <li><strong>Weighted</strong> - Use edge weights for probability</li>
        </ul>
        <h4>Entanglement</h4>
        <p>When enabled, split packets share state changes.</p>
      </>
    ),
  },
  {
    id: 'mutator',
    title: 'Mutator',
    icon: '🧬',
    content: (
      <>
        <p>Applies genetic mutations to packet properties.</p>
        <h4>Modes</h4>
        <ul>
          <li><strong>Drift</strong> - Small, gradual changes</li>
          <li><strong>Radiation</strong> - Large, dramatic changes</li>
        </ul>
        <h4>Targets</h4>
        <p>Can mutate pitch, gain, cutoff, wave type, and timbre.</p>
      </>
    ),
  },
];

const EDGE_DOCS: DocSection = {
  id: 'edges',
  title: 'Edges & CV Routing',
  icon: '🔗',
  content: (
    <>
      <p>Edges connect nodes and route packets or control signals.</p>
      <h4>Timing Modes</h4>
      <ul>
        <li><strong>Physical</strong> - Travel time based on distance</li>
        <li><strong>Fixed</strong> - Exact beat duration</li>
      </ul>
      <h4>CV Modulation</h4>
      <p>Set Target Param on an edge from an LFO to modulate that parameter on the destination node.</p>
      <h4>Modulatable Parameters</h4>
      <ul>
        <li><strong>Speaker</strong> - volume, pan, reverb</li>
        <li><strong>Filter</strong> - cutoff, mod</li>
        <li><strong>Gate</strong> - probability, thresholds</li>
        <li><strong>Gain</strong> - value</li>
        <li><strong>Oscillator</strong> - mix, attack, decay</li>
        <li><strong>Modulator</strong> - rate, depth</li>
      </ul>
      <h4>Weight</h4>
      <p>Used by Markov/weighted routing in splitter nodes.</p>
    </>
  ),
};

const KEYBOARD_SHORTCUTS: DocSection = {
  id: 'shortcuts',
  title: 'Keyboard Shortcuts',
  icon: '⌨️',
  content: (
    <>
      <h4>General</h4>
      <ul>
        <li><strong>Space</strong> - Play/Pause</li>
        <li><strong>Ctrl+N</strong> - New project</li>
        <li><strong>Ctrl+O</strong> - Open file</li>
        <li><strong>Ctrl+S</strong> - Save file</li>
        <li><strong>Ctrl+Z</strong> - Undo</li>
        <li><strong>Ctrl+Y</strong> - Redo</li>
      </ul>
      <h4>Canvas</h4>
      <ul>
        <li><strong>Delete</strong> - Delete selection</li>
        <li><strong>Ctrl+A</strong> - Select all</li>
        <li><strong>Ctrl+D</strong> - Duplicate</li>
        <li><strong>Escape</strong> - Deselect</li>
      </ul>
      <h4>Navigation</h4>
      <ul>
        <li><strong>Scroll</strong> - Pan canvas</li>
        <li><strong>Ctrl+Scroll</strong> - Zoom</li>
        <li><strong>Middle Mouse</strong> - Pan canvas</li>
      </ul>
    </>
  ),
};

const QUICK_START: DocSection = {
  id: 'quickstart',
  title: 'Quick Start',
  icon: '🚀',
  content: (
    <>
      <h4>Basic Chain</h4>
      <ol>
        <li>Add a <strong>Source</strong> node (right-click → Add Node)</li>
        <li>Add an <strong>Oscillator</strong> for sound generation</li>
        <li>Add a <strong>Speaker</strong> for audio output</li>
        <li>Connect them with edges (drag from node to node)</li>
        <li>Press <strong>Space</strong> to play!</li>
      </ol>
      <h4>Adding Variation</h4>
      <ul>
        <li>Use <strong>Gate</strong> for probabilistic patterns</li>
        <li>Use <strong>Quantizer</strong> to stay in key</li>
        <li>Use <strong>LFO</strong> with CV edges for movement</li>
        <li>Use <strong>Splitter</strong> to create parallel paths</li>
      </ul>
    </>
  ),
};

// ============================================================================
// DOCS MODAL COMPONENT
// ============================================================================

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsModal({ isOpen, onClose }: DocsModalProps): React.ReactElement | null {
  const [expandedSection, setExpandedSection] = useState<string | null>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const allSections = [QUICK_START, KEYBOARD_SHORTCUTS, EDGE_DOCS, ...NODE_DOCS];
  
  const filteredSections = searchQuery
    ? allSections.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allSections;

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📚 Documentation</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.search}>
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.content}>
          <div className={styles.sections}>
            {filteredSections.map(section => (
              <div key={section.id} className={styles.section}>
                <button
                  className={`${styles.sectionHeader} ${expandedSection === section.id ? styles.expanded : ''}`}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className={styles.sectionIcon}>{section.icon}</span>
                  <span className={styles.sectionTitle}>{section.title}</span>
                  <span className={styles.expandIcon}>{expandedSection === section.id ? '▼' : '▶'}</span>
                </button>
                {expandedSection === section.id && (
                  <div className={styles.sectionContent}>
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.footer}>
          <a href="https://github.com/your-repo/stochastic" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
            📖 Full Documentation
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
