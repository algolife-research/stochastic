// Viewport Actions
// Operations for controlling pan, zoom, and mouse position

import type { ImmerSet } from './types';

export const createViewportActions = (
  set: ImmerSet
) => ({
  setPan: (x: number, y: number): void => {
    set(state => {
      state.viewport.panOffset.x = x;
      state.viewport.panOffset.y = y;
    });
  },
  
  setZoom: (zoom: number): void => {
    set(state => {
      state.viewport.zoomLevel = zoom;
    });
  },
  
  setIsPanning: (panning: boolean): void => {
    set(state => {
      state.viewport.isPanning = panning;
    });
  },
  
  setMouse: (x: number, y: number, worldX: number, worldY: number): void => {
    set(state => {
      state.mouse.x = x;
      state.mouse.y = y;
      state.mouse.worldX = worldX;
      state.mouse.worldY = worldY;
    });
  },
});
