// Stochastic Viz - State Manager
// Manages visualization state and mode switching

import type { VizMode, VizConfig, VizDisplayState } from '@core/types';
import { VizRenderer } from './renderer';
import { AbstractRenderer, DEFAULT_ABSTRACT_CONFIG } from './modes/abstract';
import { ParticlesRenderer, DEFAULT_PARTICLES_CONFIG } from './modes/particles';
import { SpectralRenderer, DEFAULT_SPECTRAL_CONFIG } from './modes/spectral';
import { GeometricRenderer, DEFAULT_GEOMETRIC_CONFIG } from './modes/geometric';
import { WavesRenderer, DEFAULT_WAVES_CONFIG } from './modes/waves';
import { KaleidoscopeRenderer, DEFAULT_KALEIDOSCOPE_CONFIG } from './modes/kaleidoscope';

/** Viz state manager - singleton */
class VizStateManager {
  private canvas: HTMLCanvasElement | null = null;
  private currentRenderer: VizRenderer | null = null;
  private currentMode: VizMode = 'editor';
  private displayState: VizDisplayState = {
    isVizMode: false,
    previewMode: false,
  };
  
  private listeners: Set<(state: VizDisplayState) => void> = new Set();
  
  /** Initialize with canvas element */
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }
  
  /** Get current display state */
  getDisplayState(): VizDisplayState {
    return { ...this.displayState };
  }
  
  /** Get current mode */
  getCurrentMode(): VizMode {
    return this.currentMode;
  }
  
  /** Get current renderer */
  getRenderer(): VizRenderer | null {
    return this.currentRenderer;
  }
  
  /** Check if in viz mode */
  isVizMode(): boolean {
    return this.displayState.isVizMode;
  }
  
  /** Subscribe to state changes */
  subscribe(listener: (state: VizDisplayState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /** Notify listeners of state change */
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.getDisplayState());
    }
  }
  
  /** Switch to a visualization mode */
  setMode(mode: VizMode, config?: VizConfig): void {
    if (!this.canvas) {
      console.warn('VizStateManager: Canvas not initialized');
      return;
    }
    
    // Stop current renderer
    if (this.currentRenderer) {
      this.currentRenderer.stop();
      this.currentRenderer.dispose();
      this.currentRenderer = null;
    }
    
    this.currentMode = mode;
    
    if (mode === 'editor') {
      // Switch back to editor mode
      this.displayState = {
        isVizMode: false,
        previewMode: false,
      };
      this.notify();
      return;
    }
    
    // Create appropriate renderer
    const renderer = this.createRenderer(mode);
    if (!renderer) {
      console.warn(`VizStateManager: Unknown mode "${mode}"`);
      return;
    }
    
    this.currentRenderer = renderer;
    
    // Initialize with config
    const effectiveConfig = config ?? this.getDefaultConfig(mode);
    if (effectiveConfig) {
      renderer.init(effectiveConfig);
    }
    
    // Resize to canvas dimensions
    const rect = this.canvas.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
    
    // Update state
    this.displayState = {
      isVizMode: true,
      previewMode: false,
    };
    
    // Start rendering
    renderer.start();
    
    this.notify();
  }
  
  /** Enter preview mode (temporary viz display) */
  startPreview(mode: VizMode, config?: VizConfig): void {
    this.setMode(mode, config);
    this.displayState = {
      ...this.displayState,
      previewMode: true,
    };
    this.notify();
  }
  
  /** Exit preview mode and return to editor */
  endPreview(): void {
    if (this.displayState.previewMode) {
      this.setMode('editor');
    }
  }
  
  /** Toggle between editor and viz mode */
  toggle(vizMode: VizMode = 'particles'): void {
    if (this.displayState.isVizMode) {
      this.setMode('editor');
    } else {
      this.setMode(vizMode);
    }
  }
  
  /** Handle canvas resize */
  handleResize(width: number, height: number): void {
    if (this.currentRenderer) {
      this.currentRenderer.resize(width, height);
    }
  }
  
  /** Create renderer for mode */
  private createRenderer(mode: VizMode): VizRenderer | null {
    if (!this.canvas) return null;
    
    switch (mode) {
      case 'abstract':
        return new AbstractRenderer(this.canvas);
      case 'particles':
        return new ParticlesRenderer(this.canvas);
      case 'spectral':
        return new SpectralRenderer(this.canvas);
      case 'geometric':
        return new GeometricRenderer(this.canvas);
      case 'waves':
        return new WavesRenderer(this.canvas);
      case 'kaleidoscope':
        return new KaleidoscopeRenderer(this.canvas);
      default:
        return null;
    }
  }
  
  /** Get default config for mode */
  private getDefaultConfig(mode: VizMode): VizConfig | null {
    switch (mode) {
      case 'abstract':
        return { mode: 'abstract', ...DEFAULT_ABSTRACT_CONFIG };
      case 'particles':
        return { mode: 'particles', ...DEFAULT_PARTICLES_CONFIG };
      case 'spectral':
        return { mode: 'spectral', ...DEFAULT_SPECTRAL_CONFIG };
      case 'geometric':
        return { mode: 'geometric', ...DEFAULT_GEOMETRIC_CONFIG };
      case 'waves':
        return { mode: 'waves', ...DEFAULT_WAVES_CONFIG };
      case 'kaleidoscope':
        return { mode: 'kaleidoscope', ...DEFAULT_KALEIDOSCOPE_CONFIG };
      default:
        return null;
    }
  }
  
  /** Dispose of all resources */
  dispose(): void {
    if (this.currentRenderer) {
      this.currentRenderer.stop();
      this.currentRenderer.dispose();
      this.currentRenderer = null;
    }
    this.canvas = null;
    this.listeners.clear();
  }
}

/** Singleton instance */
export const vizState = new VizStateManager();

/** Export for direct access */
export { VizStateManager };
