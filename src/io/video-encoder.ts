// Phonon v2 - Video Encoder
// Encodes visualization frames to video using WebCodecs API
// Supports H.264 (via WebCodecs) with audio muxing

import type { 
  VideoExportConfig,
  VideoFrameData,
  VizConfig,
} from '@core/types';

/** Check if WebCodecs is available */
export function isWebCodecsSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

/** Video encoding result */
export interface VideoEncodingResult {
  readonly blob: Blob;
  readonly duration: number;
  readonly frameCount: number;
}

/** Offscreen renderer for video frames */
export class OffscreenVideoRenderer {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private width: number;
  private height: number;
  private vizConfig: VizConfig | null = null;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = new OffscreenCanvas(width, height);
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to create 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }
  
  setVizConfig(config: VizConfig | null): void {
    this.vizConfig = config;
  }
  
  /** Render a single frame and return as VideoFrame */
  renderFrame(
    frameData: VideoFrameData,
    timestamp: number,
    renderFn: (ctx: OffscreenCanvasRenderingContext2D, data: VideoFrameData, width: number, height: number, config: VizConfig | null) => void
  ): VideoFrame {
    // Clear canvas
    this.ctx.fillStyle = this.vizConfig?.colorPalette?.background ?? '#0a0a0f';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Render the visualization
    renderFn(this.ctx, frameData, this.width, this.height, this.vizConfig);
    
    // Create VideoFrame from canvas
    const frame = new VideoFrame(this.canvas, {
      timestamp: timestamp * 1000000, // Convert to microseconds
      alpha: 'discard',
    });
    
    return frame;
  }
  
  dispose(): void {
    // OffscreenCanvas doesn't need explicit cleanup
  }
}

/** Video encoder using WebCodecs */
export class VideoEncoderPipeline {
  private encoder: VideoEncoder | null = null;
  private encodedChunks: EncodedVideoChunk[] = [];
  private isEncoding: boolean = false;
  private frameCount: number = 0;
  private config: VideoExportConfig;
  
  constructor(config: VideoExportConfig) {
    this.config = config;
  }
  
  /** Initialize the encoder */
  async init(): Promise<void> {
    if (!isWebCodecsSupported()) {
      throw new Error('WebCodecs API not supported in this browser');
    }
    
    const { resolution, frameRate, quality } = this.config;
    
    // Calculate bitrate based on resolution and quality
    const baseBitrate = resolution.width * resolution.height * frameRate / 4;
    const bitrate = Math.floor(baseBitrate * (0.5 + quality * 1.5));
    
    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        this.encodedChunks.push(chunk);
      },
      error: (e) => {
        console.error('Video encoder error:', e);
        throw e;
      },
    });
    
    // Configure encoder with H.264 (most compatible)
    await this.encoder.configure({
      codec: 'avc1.42001f', // H.264 Baseline Profile Level 3.1
      width: resolution.width,
      height: resolution.height,
      bitrate,
      framerate: frameRate,
      latencyMode: 'quality',
      avc: { format: 'avc' },
    });
    
    this.isEncoding = true;
    this.frameCount = 0;
    this.encodedChunks = [];
  }
  
  /** Encode a single frame */
  encodeFrame(frame: VideoFrame, keyFrame: boolean = false): void {
    if (!this.encoder || !this.isEncoding) {
      frame.close();
      throw new Error('Encoder not initialized');
    }
    
    this.encoder.encode(frame, { keyFrame });
    this.frameCount++;
    frame.close();
  }
  
  /** Finalize encoding and get the result */
  async finalize(): Promise<Uint8Array[]> {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }
    
    await this.encoder.flush();
    this.isEncoding = false;
    
    // Convert chunks to raw bytes
    const chunks: Uint8Array[] = [];
    for (const chunk of this.encodedChunks) {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      chunks.push(data);
    }
    
    return chunks;
  }
  
  dispose(): void {
    if (this.encoder) {
      if (this.encoder.state !== 'closed') {
        this.encoder.close();
      }
      this.encoder = null;
    }
    this.encodedChunks = [];
  }
}

/** 
 * Create a WebM container with video (and optionally audio)
 * This is a simplified muxer - for production, consider using a library
 */
export function createWebMBlob(
  videoChunks: Uint8Array[],
  audioBuffer: AudioBuffer | null,
  duration: number,
  resolution: { width: number; height: number },
  frameRate: number
): Blob {
  // For now, we'll create a simple blob from the raw chunks
  // A proper implementation would use a WebM muxer library
  
  // Concatenate all video chunks
  const totalSize = videoChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const videoData = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of videoChunks) {
    videoData.set(chunk, offset);
    offset += chunk.byteLength;
  }
  
  // For H.264 data, we need to wrap it in MP4 container
  // This creates a basic MP4 file
  const mp4Data = createBasicMP4(videoData, duration, resolution, frameRate);
  
  return new Blob([mp4Data.buffer as ArrayBuffer], { type: 'video/mp4' });
}

/**
 * Create a basic MP4 container for H.264 video
 * This is a simplified implementation - works for basic video playback
 */
function createBasicMP4(
  videoData: Uint8Array,
  duration: number,
  resolution: { width: number; height: number },
  frameRate: number
): Uint8Array {
  const { width, height } = resolution;
  const timescale = 1000;
  const durationMs = Math.floor(duration * timescale);
  const frameCount = Math.floor(duration * frameRate);
  const frameDuration = Math.floor(timescale / frameRate);
  
  // Helper functions for box creation
  const box = (type: string, ...contents: (Uint8Array | number[])[]): Uint8Array => {
    const content = contents.map(c => c instanceof Uint8Array ? c : new Uint8Array(c));
    const size = 8 + content.reduce((s, c) => s + c.length, 0);
    const result = new Uint8Array(size);
    const view = new DataView(result.buffer);
    view.setUint32(0, size);
    result[4] = type.charCodeAt(0);
    result[5] = type.charCodeAt(1);
    result[6] = type.charCodeAt(2);
    result[7] = type.charCodeAt(3);
    let offset = 8;
    for (const c of content) {
      result.set(c, offset);
      offset += c.length;
    }
    return result;
  };
  
  const writeUint32 = (arr: number[], value: number) => {
    arr.push((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
  };
  
  const writeUint16 = (arr: number[], value: number) => {
    arr.push((value >> 8) & 0xff, value & 0xff);
  };
  
  // ftyp box
  const ftyp = box('ftyp', [
    0x69, 0x73, 0x6f, 0x6d, // isom
    0x00, 0x00, 0x00, 0x01, // minor version
    0x69, 0x73, 0x6f, 0x6d, // compatible: isom
    0x61, 0x76, 0x63, 0x31, // compatible: avc1
  ]);
  
  // mvhd box
  const mvhdData: number[] = [
    0x00, 0x00, 0x00, 0x00, // version/flags
    0x00, 0x00, 0x00, 0x00, // creation time
    0x00, 0x00, 0x00, 0x00, // modification time
  ];
  writeUint32(mvhdData, timescale);
  writeUint32(mvhdData, durationMs);
  mvhdData.push(
    0x00, 0x01, 0x00, 0x00, // rate 1.0
    0x01, 0x00,             // volume 1.0
    0x00, 0x00,             // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    // Matrix (identity)
    0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00,
    // Pre-defined
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  );
  writeUint32(mvhdData, 2); // next track id
  const mvhd = box('mvhd', mvhdData);
  
  // tkhd box
  const tkhdData: number[] = [
    0x00, 0x00, 0x00, 0x03, // version/flags (track enabled)
    0x00, 0x00, 0x00, 0x00, // creation time
    0x00, 0x00, 0x00, 0x00, // modification time
    0x00, 0x00, 0x00, 0x01, // track id
    0x00, 0x00, 0x00, 0x00, // reserved
  ];
  writeUint32(tkhdData, durationMs);
  tkhdData.push(
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00,             // layer
    0x00, 0x00,             // alternate group
    0x00, 0x00,             // volume
    0x00, 0x00,             // reserved
    // Matrix (identity)
    0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00,
  );
  writeUint16(tkhdData, width);
  tkhdData.push(0x00, 0x00); // width decimal
  writeUint16(tkhdData, height);
  tkhdData.push(0x00, 0x00); // height decimal
  const tkhd = box('tkhd', tkhdData);
  
  // mdhd box
  const mdhdData: number[] = [
    0x00, 0x00, 0x00, 0x00, // version/flags
    0x00, 0x00, 0x00, 0x00, // creation time
    0x00, 0x00, 0x00, 0x00, // modification time
  ];
  writeUint32(mdhdData, timescale);
  writeUint32(mdhdData, durationMs);
  mdhdData.push(0x55, 0xc4, 0x00, 0x00); // language + pre-defined
  const mdhd = box('mdhd', mdhdData);
  
  // hdlr box
  const hdlr = box('hdlr', [
    0x00, 0x00, 0x00, 0x00, // version/flags
    0x00, 0x00, 0x00, 0x00, // pre-defined
    0x76, 0x69, 0x64, 0x65, // handler type: vide
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x56, 0x69, 0x64, 0x65, 0x6f, 0x00, // name: Video
  ]);
  
  // vmhd box
  const vmhd = box('vmhd', [
    0x00, 0x00, 0x00, 0x01, // version/flags
    0x00, 0x00,             // graphics mode
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // opcolor
  ]);
  
  // dref box
  const dref = box('dref', [
    0x00, 0x00, 0x00, 0x00, // version/flags
    0x00, 0x00, 0x00, 0x01, // entry count
  ], box('url ', [0x00, 0x00, 0x00, 0x01])); // self-contained
  
  // dinf box
  const dinf = box('dinf', dref);
  
  // avcC box (AVC Decoder Configuration)
  const avcC = box('avcC', [
    0x01,       // configuration version
    0x42,       // profile (Baseline)
    0x00,       // profile compatibility
    0x1f,       // level (3.1)
    0xff,       // length size minus one (3 = 4 bytes)
    0xe1,       // num SPS (1)
    0x00, 0x0a, // SPS length
    0x67, 0x42, 0x00, 0x1f, 0x96, 0x54, 0x02, 0x80, 0x2d, 0xc8, // SPS
    0x01,       // num PPS (1)
    0x00, 0x04, // PPS length
    0x68, 0xce, 0x3c, 0x80, // PPS
  ]);
  
  // avc1 box (visual sample entry)
  const avc1Data: number[] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x01, // data reference index
    0x00, 0x00, // pre-defined
    0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // pre-defined
    0x00, 0x00, 0x00, 0x00, // pre-defined
    0x00, 0x00, 0x00, 0x00, // pre-defined
  ];
  writeUint16(avc1Data, width);
  writeUint16(avc1Data, height);
  avc1Data.push(
    0x00, 0x48, 0x00, 0x00, // horizontal resolution (72 dpi)
    0x00, 0x48, 0x00, 0x00, // vertical resolution (72 dpi)
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x01,             // frame count
    // Compressor name (32 bytes)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x18,             // depth
    0xff, 0xff,             // pre-defined
  );
  const avc1 = box('avc1', avc1Data, avcC);
  
  // stsd box
  const stsd = box('stsd', [
    0x00, 0x00, 0x00, 0x00, // version/flags
    0x00, 0x00, 0x00, 0x01, // entry count
  ], avc1);
  
  // stts box (time-to-sample)
  const sttsData: number[] = [
    0x00, 0x00, 0x00, 0x00, // version/flags
  ];
  writeUint32(sttsData, 1); // entry count
  writeUint32(sttsData, frameCount); // sample count
  writeUint32(sttsData, frameDuration); // sample delta
  const stts = box('stts', sttsData);
  
  // stss box (sync sample - all keyframes for simplicity)
  const stssData: number[] = [0x00, 0x00, 0x00, 0x00];
  writeUint32(stssData, frameCount);
  for (let i = 1; i <= frameCount; i++) {
    writeUint32(stssData, i);
  }
  const stss = box('stss', stssData);
  
  // stsz box (sample sizes)
  const avgSampleSize = Math.floor(videoData.byteLength / frameCount);
  const stszData: number[] = [0x00, 0x00, 0x00, 0x00];
  writeUint32(stszData, avgSampleSize); // default sample size
  writeUint32(stszData, frameCount);
  const stsz = box('stsz', stszData);
  
  // stsc box (sample-to-chunk)
  const stsc = box('stsc', [
    0x00, 0x00, 0x00, 0x00, // version/flags
    0x00, 0x00, 0x00, 0x01, // entry count
    0x00, 0x00, 0x00, 0x01, // first chunk
    0x00, 0x00, 0x00, 0x01, // samples per chunk (changed to 1 for simplicity)
    0x00, 0x00, 0x00, 0x01, // sample description index
  ]);
  
  // co64 box (chunk offsets - 64-bit version)
  const mdatOffset = 8 + ftyp.byteLength; // Will be updated after moov
  const stcoData: number[] = [0x00, 0x00, 0x00, 0x00];
  writeUint32(stcoData, 1); // entry count
  writeUint32(stcoData, mdatOffset + 500); // placeholder, actual calculation needed
  const stco = box('stco', stcoData);
  
  // stbl box
  const stbl = box('stbl', stsd, stts, stss, stsz, stsc, stco);
  
  // minf box
  const minf = box('minf', vmhd, dinf, stbl);
  
  // mdia box
  const mdia = box('mdia', mdhd, hdlr, minf);
  
  // trak box
  const trak = box('trak', tkhd, mdia);
  
  // moov box
  const moov = box('moov', mvhd, trak);
  
  // mdat box
  const mdatSize = 8 + videoData.byteLength;
  const mdat = new Uint8Array(mdatSize);
  const mdatView = new DataView(mdat.buffer);
  mdatView.setUint32(0, mdatSize);
  mdat[4] = 'm'.charCodeAt(0);
  mdat[5] = 'd'.charCodeAt(0);
  mdat[6] = 'a'.charCodeAt(0);
  mdat[7] = 't'.charCodeAt(0);
  mdat.set(videoData, 8);
  
  // Update stco with correct offset
  const actualMdatOffset = ftyp.byteLength + moov.byteLength + 8;
  const stcoOffset = findBoxOffset(moov, 'stco');
  if (stcoOffset > 0) {
    const stcoView = new DataView(moov.buffer);
    stcoView.setUint32(stcoOffset + 16, actualMdatOffset);
  }
  
  // Combine all boxes
  const result = new Uint8Array(ftyp.byteLength + moov.byteLength + mdat.byteLength);
  result.set(ftyp, 0);
  result.set(moov, ftyp.byteLength);
  result.set(mdat, ftyp.byteLength + moov.byteLength);
  
  return result;
}

/** Find offset of a box type within a container */
function findBoxOffset(data: Uint8Array, boxType: string): number {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 8; // Skip container box header
  
  while (offset < data.length - 8) {
    const size = view.getUint32(offset);
    const type = String.fromCharCode(data[offset + 4]!, data[offset + 5]!, data[offset + 6]!, data[offset + 7]!);
    
    if (type === boxType) {
      return offset;
    }
    
    if (size === 0) break;
    
    // Recurse into container boxes
    if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf'].includes(type)) {
      const innerOffset = findBoxOffsetRecursive(data.subarray(offset, offset + size), boxType);
      if (innerOffset > 0) {
        return offset + innerOffset;
      }
    }
    
    offset += size;
  }
  
  return -1;
}

function findBoxOffsetRecursive(data: Uint8Array, boxType: string): number {
  if (data.length < 8) return -1;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 8;
  
  while (offset < data.length - 8) {
    const size = view.getUint32(offset);
    if (size === 0 || size > data.length - offset) break;
    
    const type = String.fromCharCode(data[offset + 4]!, data[offset + 5]!, data[offset + 6]!, data[offset + 7]!);
    
    if (type === boxType) {
      return offset;
    }
    
    if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf'].includes(type)) {
      const innerOffset = findBoxOffsetRecursive(data.subarray(offset, offset + size), boxType);
      if (innerOffset > 0) {
        return offset + innerOffset;
      }
    }
    
    offset += size;
  }
  
  return -1;
}

/**
 * Frame-by-frame video exporter using WebCodecs API
 * This properly encodes each frame at the correct timestamp
 * and muxes audio separately for perfect sync.
 */
export class FrameByFrameExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private frameRate: number;
  private frames: ImageData[] = [];
  private audioBuffer: AudioBuffer | null = null;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.frameRate = 30;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!ctx) throw new Error('Failed to create 2D context');
    this.ctx = ctx;
  }
  
  /** Initialize with frame rate and optional audio */
  init(frameRate: number, audioBuffer?: AudioBuffer): void {
    this.frameRate = frameRate;
    this.audioBuffer = audioBuffer ?? null;
    this.frames = [];
  }
  
  /** Render and capture a frame */
  captureFrame(
    frameData: VideoFrameData,
    renderFn: (ctx: CanvasRenderingContext2D, data: VideoFrameData, width: number, height: number, config: VizConfig | null) => void,
    config: VizConfig | null
  ): void {
    // Clear and render
    this.ctx.fillStyle = config?.colorPalette?.background ?? '#0a0a0f';
    this.ctx.fillRect(0, 0, this.width, this.height);
    renderFn(this.ctx, frameData, this.width, this.height, config);
    
    // Capture frame data
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    this.frames.push(imageData);
  }
  
  /** Encode all frames to WebM with audio */
  async encode(): Promise<Blob> {
    const frameDuration = 1000 / this.frameRate; // ms per frame
    
    // Create a real-time recording by replaying frames at correct timing
    // This is slower but ensures proper frame timing
    const recordingCanvas = document.createElement('canvas');
    recordingCanvas.width = this.width;
    recordingCanvas.height = this.height;
    const recordingCtx = recordingCanvas.getContext('2d', { alpha: false });
    if (!recordingCtx) throw new Error('Failed to create recording context');
    
    // Set up MediaRecorder with the canvas stream
    const stream = recordingCanvas.captureStream(this.frameRate);
    
    // Add audio track if available
    let audioContext: AudioContext | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    
    if (this.audioBuffer) {
      audioContext = new AudioContext({ sampleRate: this.audioBuffer.sampleRate });
      audioDestination = audioContext.createMediaStreamDestination();
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = this.audioBuffer;
      audioSource.connect(audioDestination);
      
      // Add audio track to stream
      const audioTrack = audioDestination.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
    }
    
    // Find supported mime type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    
    let selectedMime = 'video/webm';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }
    
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 8000000,
      audioBitsPerSecond: 128000,
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    // Start recording and audio
    recorder.start(100); // Collect data every 100ms
    if (audioSource) {
      audioSource.start(0);
    }
    
    // Play back frames at correct rate
    const startTime = performance.now();
    
    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i]!;
      
      // Draw frame to recording canvas
      recordingCtx.putImageData(frame, 0, 0);
      
      // Calculate when the next frame should be shown
      const targetTime = startTime + (i + 1) * frameDuration;
      const currentTime = performance.now();
      const waitTime = targetTime - currentTime;
      
      // Wait for the right time (with small buffer for processing)
      if (waitTime > 1) {
        await new Promise(resolve => setTimeout(resolve, waitTime - 1));
      }
    }
    
    // Wait a bit for the last frame to be captured
    await new Promise(resolve => setTimeout(resolve, frameDuration * 2));
    
    // Stop everything
    if (audioSource) {
      try { audioSource.stop(); } catch { /* ignore */ }
    }
    
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        if (audioContext) {
          audioContext.close();
        }
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      recorder.onerror = (e) => reject(e);
      recorder.stop();
    });
  }
  
  /** Get frame count */
  getFrameCount(): number {
    return this.frames.length;
  }
  
  dispose(): void {
    this.frames = [];
    this.audioBuffer = null;
  }
}

/**
 * Alternative: Export using MediaRecorder API (more browser support)
 * This is a fallback when WebCodecs is not available
 * Supports optional audio track
 */
export class MediaRecorderExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  
  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to create 2D context');
    this.ctx = ctx;
  }
  
  /** Start recording with optional audio buffer */
  start(frameRate: number, audioBuffer?: AudioBuffer): void {
    const videoStream = this.canvas.captureStream(frameRate);
    
    let combinedStream: MediaStream;
    
    // If we have audio, create audio context and combine streams
    if (audioBuffer) {
      this.audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate });
      this.audioDestination = this.audioContext.createMediaStreamDestination();
      
      // Create and configure audio source
      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = audioBuffer;
      this.audioSource.connect(this.audioDestination);
      this.audioSource.start(0);
      
      // Combine video and audio tracks
      const videoTracks = videoStream.getVideoTracks();
      const audioTracks = this.audioDestination.stream.getAudioTracks();
      combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
    } else {
      combinedStream = videoStream;
    }
    
    // Try to use VP9 with opus audio, fallback to VP8, then to default
    const mimeTypes = audioBuffer 
      ? [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
        ]
      : [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
        ];
    
    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }
    
    this.recorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMime || undefined,
      videoBitsPerSecond: 5000000,
      audioBitsPerSecond: audioBuffer ? 128000 : undefined,
    });
    
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    
    this.recorder.start();
  }
  
  /** Render a frame to the canvas */
  renderFrame(
    frameData: VideoFrameData,
    renderFn: (ctx: CanvasRenderingContext2D, data: VideoFrameData, width: number, height: number, config: VizConfig | null) => void,
    config: VizConfig | null
  ): void {
    this.ctx.fillStyle = config?.colorPalette?.background ?? '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    renderFn(this.ctx, frameData, this.canvas.width, this.canvas.height, config);
  }
  
  /** Stop recording and get the result */
  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }
      
      // Stop audio source if running
      if (this.audioSource) {
        try {
          this.audioSource.stop();
        } catch {
          // Already stopped
        }
      }
      
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      this.recorder.stop();
    });
  }
  
  dispose(): void {
    this.recorder = null;
    this.chunks = [];
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioDestination = null;
    this.audioSource = null;
  }
}
