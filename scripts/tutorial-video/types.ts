// Tutorial Video Generation Types

import type { NodeType } from '../../src/core/types';

// ============================================================================
// Recording-Based Workflow (NEW)
// ============================================================================

/** Tutorial defined from a Playwright recording + AI narration */
export interface RecordedTutorial {
  id: string;
  title: string;
  description: string;
  /** Path to recorded .webm video */
  recordingPath: string;
  /** Optional: Path to Playwright test file for re-recording */
  playwrightScript?: string;
  /** Chapters with auto-generated or manual narration */
  chapters: TutorialChapter[];
}

export interface TutorialChapter {
  /** When chapter starts (seconds from video start) */
  startTime: number;
  /** Chapter duration in seconds */
  duration: number;
  /** Narration text (TTS or manual script) */
  narration: string;
  /** Optional visual annotations */
  annotations?: Annotation[];
}

export interface Annotation {
  /** When to show (seconds from chapter start) */
  time: number;
  /** Duration to display (seconds) */
  duration: number;
  type: 'highlight' | 'arrow' | 'text' | 'circle';
  position: { x: number; y: number };
  text?: string;
}

// ============================================================================
// Script-Based Workflow (LEGACY - keeping for backwards compat)
// ============================================================================

export interface TutorialVideoScript {
  id: string;
  title: string;
  description: string;
  resolution: { width: number; height: number };
  fps: number;
  segments: TutorialSegment[];
}

export interface TutorialSegment {
  /** Text for TTS narration */
  narration: string;
  /** UI automation steps */
  actions: TutorialAction[];
  /** Extra pause after segment (ms) */
  pauseAfter?: number;
}

export type TutorialAction =
  | { type: 'wait'; ms: number }
  | { type: 'click'; selector: string }
  | { type: 'rightClick'; x: number; y: number }
  | { type: 'selectContextMenu'; item: string }
  | { type: 'drag'; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'pressKey'; key: string }
  | { type: 'type'; text: string }
  | { type: 'highlight'; selector: string; duration: number }
  | { type: 'moveMouse'; x: number; y: number };
