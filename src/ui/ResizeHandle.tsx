// Phonon v2 - Resizable Panel Handle Component

import React, { useCallback, useRef, useEffect } from 'react';
import styles from './ResizeHandle.module.css';

// ============================================================================
// RESIZE HANDLE
// ============================================================================

export type ResizeDirection = 'left' | 'right' | 'top' | 'bottom';

interface ResizeHandleProps {
  direction: ResizeDirection;
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export function ResizeHandle({ direction, onResize, onResizeEnd }: ResizeHandleProps): React.ReactElement {
  const isDragging = useRef(false);
  const lastPos = useRef(0);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    lastPos.current = direction === 'left' || direction === 'right' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'left' || direction === 'right' ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const currentPos = direction === 'left' || direction === 'right' ? e.clientX : e.clientY;
      const delta = currentPos - lastPos.current;
      lastPos.current = currentPos;
      
      // For left/top handles, invert the delta (dragging left/up should increase size)
      const adjustedDelta = direction === 'left' || direction === 'top' ? -delta : delta;
      onResize(adjustedDelta);
    };
    
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onResizeEnd?.();
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize, onResizeEnd]);
  
  return (
    <div 
      className={`${styles.handle} ${styles[direction]}`}
      onMouseDown={handleMouseDown}
    />
  );
}
