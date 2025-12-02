// Test Setup File
// This file runs before each test file

import { vi } from 'vitest';

// Mock Web Audio API for unit tests
class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = {};
    this.sampleRate = 44100;
  }
  
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  
  createConvolver() {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createBuffer(channels, length, sampleRate) {
    return {
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }
  
  createStereoPanner() {
    return {
      pan: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 350, setValueAtTime: vi.fn() },
      Q: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

// Set up global mocks
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  setLineDash: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
}));

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  global.performance = { now: () => Date.now() };
}

// Mock requestAnimationFrame - return ID but don't actually schedule
let rafId = 0;
global.requestAnimationFrame = vi.fn(() => ++rafId);
global.cancelAnimationFrame = vi.fn();
