// Source Emission Module
// When a source releases, and the note it releases. Exact time (beat units):
// a source releases at its last release + its interval, so its releases are
// origin + n x interval, never counted from the frame they fell on. The
// packets themselves are made by the step's events (packets.ts).

import { getGraphStore } from '../store';
import type { NodeId, MidiNote, AudioPayload, Frequency, GraphNode } from '../types';
import { midiToFreq, clampMidi, LEGACY_SCALE_OFFSET, NOTE_INDEX_KEY, keyNotes, toUnits } from '../constants';

type SourceProps = { interval: number; autoTrigger: boolean; noteIndex: number; midiNote: MidiNote; intensity: number };

/** A source's interval in beat units (at least one) */
export function intervalUnits(node: GraphNode): number {
  return Math.max(toUnits((node.props as SourceProps).interval ?? 1), 1);
}

/**
 * Every release due in this step's window (start, end], node by node: a
 * source releases at its last release + its interval, and again while that
 * is due; one whose next release is already past (its pace turned down, or
 * set to release at once) releases at the window's start.
 */
export function gatherSources(start: number, end: number, release: (nodeId: NodeId, at: number) => void): void {
  const store = getGraphStore();
  store.nodes.forEach((node) => {
    if (node.type !== 'source') return;
    if ((node.props as SourceProps).autoTrigger === false) return;
    const step = intervalUnits(node);
    let due = Math.max((node.lastRelease ?? 0) + step, start);
    let last = node.lastRelease ?? 0;
    while (due <= end) {
      release(node.id, due);
      last = due;
      due += step;
    }
    if (last !== (node.lastRelease ?? 0)) getGraphStore().setNodeRuntime(node.id, { lastRelease: last });
  });
}

/** The note a source releases (sources.ts spawnPacketFromSource's payload) */
export function sourcePayload(props: SourceProps): AudioPayload {
  const store = getGraphStore();
  let midiNote: MidiNote;
  if (props.noteIndex >= 0) {
    midiNote = clampMidi(LEGACY_SCALE_OFFSET + Math.min(36, props.noteIndex)) as MidiNote;
  } else if (props.noteIndex === -1) {
    // Random note
    midiNote = (36 + Math.floor(Math.random() * 49)) as MidiNote;
  } else if (props.noteIndex === NOTE_INDEX_KEY) {
    // Any note of the key (the scene's, else the project's), one draw
    const notes = keyNotes(store.scenePlayback.effectiveRoot ?? store.musicalContext.root,
      store.scenePlayback.effectiveScale ?? store.musicalContext.scaleName);
    midiNote = notes[Math.floor(Math.random() * notes.length)] as MidiNote;
  } else {
    midiNote = props.midiNote ?? (60 as MidiNote);
  }
  return {
    freq: midiToFreq(midiNote),
    midiNote,
    wave: 'sine',
    timbre: 0,
    cutoff: 20000 as Frequency,
    gain: props.intensity ?? 0.5,
    holdTime: 0,
    releaseTime: 0.1,
  };
}

export type { SourceProps };
