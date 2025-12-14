import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGraphStore } from '@core/store';
import type { AnnotationId } from '@core/types';
import styles from './AnnotationEditor.module.css';

export function AnnotationEditor(): React.ReactElement | null {
  const selectedAnnotationId = useGraphStore(state => state.selection.selectedAnnotationId);
  const annotations = useGraphStore(state => state.annotations);
  const updateAnnotation = useGraphStore(state => state.updateAnnotation);
  const viewport = useGraphStore(state => state.viewport);

  // Store the editing annotation id so it persists through blur even if selection clears
  const [editingId, setEditingId] = useState<AnnotationId | null>(null);
  const [editingText, setEditingText] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // When selection changes, start editing that annotation
  useEffect(() => {
    if (selectedAnnotationId) {
      const ann = annotations.get(selectedAnnotationId);
      if (ann) {
        setEditingId(selectedAnnotationId);
        setEditingText(ann.text);
        // Store position at edit start
        setPosition({ x: ann.x, y: ann.y });
        // Focus after render
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            const len = inputRef.current.value.length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 0);
      }
    }
  }, [selectedAnnotationId, annotations]);

  const handleBlur = useCallback(() => {
    if (editingId) {
      updateAnnotation(editingId, { text: editingText });
    }
    // Clear editing state
    setEditingId(null);
    setPosition(null);
  }, [editingId, editingText, updateAnnotation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Cancel editing without saving
      setEditingId(null);
      setPosition(null);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Save on Enter (Shift+Enter for newline)
      e.preventDefault();
      if (editingId) {
        updateAnnotation(editingId, { text: editingText });
      }
      setEditingId(null);
      setPosition(null);
    }
  }, [editingId, editingText, updateAnnotation]);

  if (!editingId || !position) return null;

  // Convert world position to screen position
  const screenX = position.x * viewport.zoomLevel + viewport.panOffset.x;
  const screenY = position.y * viewport.zoomLevel + viewport.panOffset.y;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenX}px`,
    top: `${screenY}px`,
    transform: 'translate(0, 0)',
    zIndex: 200,
  };

  return (
    <div style={style} className={styles.editorContainer} onMouseDown={e => e.stopPropagation()}>
      <textarea
        ref={inputRef}
        className={styles.textarea}
        value={editingText}
        onChange={e => setEditingText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default AnnotationEditor;
