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
  /** Extra search terms beyond the title (searched case-insensitively) */
  keywords?: string;
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
    keywords: 'genetic evolution random variation',
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
  {
    id: 'delay',
    title: 'Delay',
    icon: '⏱️',
    keywords: 'echo hold time beats',
    content: (
      <>
        <p>Holds each packet for a fixed number of beats before releasing it, creating echoes and canons.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Delay Time</strong> - Beats to hold the packet</li>
        </ul>
        <h4>Tip</h4>
        <p>Split a signal, delay one branch, and pitch-shift it for instant counterpoint.</p>
      </>
    ),
  },
  {
    id: 'gain',
    title: 'Gain',
    icon: '📶',
    keywords: 'volume amplitude mass gravity',
    content: (
      <>
        <p>Scales the loudness of passing packets.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Value</strong> - Gain multiplier applied to the packet</li>
          <li><strong>Mass</strong> - Physical weight used by gravity-based timing effects</li>
        </ul>
      </>
    ),
  },
  {
    id: 'modulator',
    title: 'Modulator',
    icon: '🎻',
    keywords: 'vibrato lfo pitch wobble expression',
    content: (
      <>
        <p>Adds vibrato to passing packets - periodic pitch variation like a string player&apos;s finger.</p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Rate</strong> - Vibrato speed (Hz)</li>
          <li><strong>Depth</strong> - Pitch variation (cents)</li>
          <li><strong>Delay</strong> - Seconds before vibrato fades in</li>
        </ul>
      </>
    ),
  },
  {
    id: 'tunnel',
    title: 'Tunnel',
    icon: '🚇',
    keywords: 'group subgraph instrument preset encapsulate',
    content: (
      <>
        <p>
          Encapsulates a chain of processing nodes into a single node - Stochastic&apos;s
          &quot;instrument&quot; abstraction. Packets are processed by every sub-node in
          sequence during one hop.
        </p>
        <h4>Usage</h4>
        <ul>
          <li>Select nodes and press <strong>Ctrl+G</strong> to group them into a tunnel</li>
          <li>Edit sub-nodes from the tunnel&apos;s property panel</li>
          <li>Choose a preset (Thick, Dark, Voice, Shimmer) or build your own</li>
        </ul>
      </>
    ),
  },
  {
    id: 'teleporter',
    title: 'Teleporter',
    icon: '🌀',
    keywords: 'wormhole portal channel wireless',
    content: (
      <>
        <p>
          Transports packets instantly between distant parts of the graph without a
          visible edge. An entry teleporter re-emits packets from every exit teleporter
          on the same channel.
        </p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Channel</strong> - Letter (A-Z) pairing entries with exits</li>
          <li><strong>Entry / Exit</strong> - Direction of this teleporter</li>
        </ul>
      </>
    ),
  },
  {
    id: 'crossover',
    title: 'Crossover',
    icon: '🧫',
    keywords: 'breed genetic reproduction parents combine',
    content: (
      <>
        <p>
          Waits for two packets ("parents"), then emits a child that inherits properties
          from both - genetic recombination for melodies.
        </p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Inheritance</strong> - How pitch/wave/gain are combined</li>
          <li><strong>Timeout</strong> - Beats to wait for a second parent</li>
        </ul>
      </>
    ),
  },
  {
    id: 'scene_trigger',
    title: 'Scene Trigger',
    icon: '🎬',
    keywords: 'jump crossfade arrangement jam navigation',
    content: (
      <>
        <p>
          Jumps to another scene when a packet arrives - lets the music navigate its own
          structure in Jam mode.
        </p>
        <h4>Properties</h4>
        <ul>
          <li><strong>Target Scene</strong> - Scene to switch to (-1 = next)</li>
          <li><strong>Behavior</strong> - Jump instantly or crossfade</li>
        </ul>
      </>
    ),
  },
  {
    id: 'midi',
    title: 'MIDI Out / MIDI CC',
    icon: '🎛️',
    keywords: 'hardware daw external control change',
    content: (
      <>
        <p>
          Send notes (<strong>MIDI Out</strong>) or control-change values
          (<strong>MIDI CC</strong>) to external hardware and DAWs.
        </p>
        <p>
          <em>Status: experimental - these nodes are placeholders while MIDI routing is
          being built out. They do not emit MIDI yet.</em>
        </p>
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
  keywords: 'keys hotkeys bindings',
  content: (
    <>
      <h4>Playback</h4>
      <ul>
        <li><strong>Space</strong> - Play / Pause</li>
        <li><strong>M</strong> - Mute / Unmute</li>
      </ul>
      <h4>Editing</h4>
      <ul>
        <li><strong>Delete / Backspace</strong> - Delete selection</li>
        <li><strong>Ctrl+A</strong> - Select all nodes</li>
        <li><strong>Ctrl+C / Ctrl+V</strong> - Copy / Paste nodes</li>
        <li><strong>Ctrl+D</strong> - Duplicate selection</li>
        <li><strong>Ctrl+G</strong> - Group selection into a Tunnel</li>
        <li><strong>Escape</strong> - Cancel linking / Deselect</li>
      </ul>
      <h4>Tools</h4>
      <ul>
        <li><strong>1-7</strong> - Node tools (Source, Speaker, Pitch, Filter, Gate, Delay, Gain), then click the canvas to place</li>
        <li><strong>0</strong> - Select tool</li>
        <li><strong>A</strong> - Annotation tool</li>
        <li><strong>R</strong> - Region tool</li>
      </ul>
      <h4>Navigation</h4>
      <ul>
        <li><strong>Scroll</strong> - Zoom in/out</li>
        <li><strong>Middle Mouse Drag</strong> - Pan canvas</li>
        <li><strong>Left Drag (empty canvas)</strong> - Box-select</li>
      </ul>
    </>
  ),
};

const SPACE_IS_TIME: DocSection = {
  id: 'concept',
  title: 'Space is Time',
  icon: '🌌',
  keywords: 'concept distance rhythm tempo pixels beat physical model philosophy',
  content: (
    <>
      <p>
        Stochastic&apos;s core idea: <strong>the canvas is a temporal landscape</strong>.
        Packets (musical events) travel along edges at constant speed, so the
        <em> distance</em> between nodes determines the <em>rhythm</em>.
      </p>
      <ul>
        <li><strong>200 px = 1 beat</strong> (default) - a longer edge means a longer wait</li>
        <li>Moving a node re-times every path through it - <em>arranging is composing</em></li>
        <li>Parallel paths of different lengths create polyrhythms naturally</li>
        <li>Set an edge to <strong>Fixed</strong> timing to pin its duration in beats, independent of distance</li>
      </ul>
      <p>
        Melody works the same way: the <em>topology</em> of the graph - how paths split,
        merge, loop and interleave - decides which notes happen and in what order.
      </p>
    </>
  ),
};

const QUICK_START: DocSection = {
  id: 'quickstart',
  title: 'Quick Start',
  icon: '🚀',
  keywords: 'begin first sound tutorial getting started',
  content: (
    <>
      <h4>Hear something immediately</h4>
      <ol>
        <li>Press <strong>Space</strong> - a new project starts with a Source already wired to a Speaker</li>
        <li>Drag the Speaker further away - the pulse slows down (<em>distance is rhythm</em>)</li>
      </ol>
      <h4>Build your own chain</h4>
      <ol>
        <li><strong>Right-click</strong> the canvas → Add Node → pick an <strong>Oscillator</strong></li>
        <li>Hover a node and <strong>drag from its edge</strong> to another node to connect them</li>
        <li>Insert the Oscillator between Source and Speaker to shape the sound</li>
        <li>Select any node to edit its properties in the right panel</li>
      </ol>
      <h4>Adding variation</h4>
      <ul>
        <li>Use <strong>Gate</strong> for probabilistic patterns</li>
        <li>Use <strong>Quantizer</strong> to stay in key</li>
        <li>Use <strong>LFO</strong> with CV edges for movement</li>
        <li>Use <strong>Splitter</strong> to create parallel paths</li>
      </ul>
      <p>
        Or open <strong>Examples</strong> in the toolbar - start with
        <em> Tutorials → Tutorial: Learn Stochastic</em>, ten guided scenes.
      </p>
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

  const allSections = [QUICK_START, SPACE_IS_TIME, KEYBOARD_SHORTCUTS, EDGE_DOCS, ...NODE_DOCS];

  const query = searchQuery.trim().toLowerCase();
  const filteredSections = query
    ? allSections.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        (s.keywords ?? '').toLowerCase().includes(query)
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
          <a href="https://github.com/algolife-research/stochastic" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
            📖 Full Documentation
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
