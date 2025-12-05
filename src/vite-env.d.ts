// Phonon v2 - Vite Type Declarations
/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css' {
  const content: string;
  export default content;
}

// Vite URL imports
declare module '*?url' {
  const url: string;
  export default url;
}

declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

// ============================================================================
// AUDIO WORKLET TYPES
// ============================================================================

// These types are for AudioWorklet processor files
declare const sampleRate: number;
declare const currentFrame: number;
declare const currentTime: number;

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

interface AudioWorkletProcessorConstructor {
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
}
