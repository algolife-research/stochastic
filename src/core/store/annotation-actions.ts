// Annotation Actions
// Operations for creating, updating, and deleting annotations

import type { GraphStore, ImmerSet } from './types';
import type { AnnotationId, Annotation } from '../types';
import { createAnnotationId } from '../types';

export const createAnnotationActions = (
  set: ImmerSet,
  _get: () => GraphStore
) => ({
  addAnnotation: (x: number, y: number, text: string): AnnotationId => {
    const id = createAnnotationId();
    const annotation: Annotation = {
      id,
      x,
      y,
      text,
      fontSize: 14,
      color: '#cccccc',
    };
    
    set(state => {
      state.annotations.set(id, annotation as never);
      state.isDirty = true;
    });
    
    return id;
  },
  
  updateAnnotation: (id: AnnotationId, updates: Partial<Annotation>): void => {
    set(state => {
      const ann = state.annotations.get(id);
      if (ann) {
        Object.assign(ann, updates);
        state.isDirty = true;
      }
    });
  },
  
  deleteAnnotation: (id: AnnotationId): void => {
    set(state => {
      state.annotations.delete(id);
      if (state.selection.selectedAnnotationId === id) {
        state.selection.selectedAnnotationId = null;
      }
      state.isDirty = true;
    });
  },
});
