// AIGA - Video Renderer
// Renders the graph simulation as a video - mirrors the main canvas rendering

import { SCALE_CHROMATIC, NODE_RADIUS, NODE_COLORS, NODE_ICONS } from '../core/constants.js';
import { uid } from '../core/utils.js';
import { compileGraph } from '../io/compiler.js';
import { renderToBuffer } from '../audio/renderer.js';

/**
 * Compile a graph into timed visual frames by simulating packet movement
 * @param {Array} nodes - Graph nodes
 * @param {Array} edges - Graph edges  
 * @param {number} durationSeconds - How long to simulate
 * @param {number} bpm - Beats per minute
 * @param {Object} settings - Global settings
 * @returns {Object} Simulation data for rendering
 */
export function compileGraphSimulation(nodes, edges, durationSeconds, bpm, settings) {
  const beatDuration = 60 / bpm;
  const fps = settings.fps || 30;
  const frameDuration = 1 / fps;
  const totalFrames = Math.ceil(durationSeconds * fps);
  
  // Clone nodes/edges for simulation
  const simNodes = nodes.map(n => ({ ...n, props: { ...n.props }, flash: 0 }));
  const simEdges = edges.map(e => ({ ...e }));
  
  // Simulation state
  const simPackets = [];
  const nodeTimers = new Map();
  const heldPackets = new Map();
  
  // Initialize source timers
  simNodes.filter(n => n.type === 'source').forEach(n => {
    nodeTimers.set(n.id, { lastEmit: -Infinity, interval: n.props.interval || 2 });
  });
  
  // Store frame data
  const frames = [];
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const currentTime = frame * frameDuration;
    const currentBeat = currentTime / beatDuration;
    
    // Decay node flash
    simNodes.forEach(n => {
      if (n.flash > 0) n.flash *= 0.9;
    });
    
    // 1. Check source emissions
    for (const node of simNodes.filter(n => n.type === 'source')) {
      const timer = nodeTimers.get(node.id);
      const interval = node.props.interval || 2;
      
      if (currentBeat - timer.lastEmit >= interval) {
        timer.lastEmit = currentBeat;
        node.flash = 1.0;
        
        const outgoing = simEdges.filter(e => e.from === node.id);
        let scaleIndex = node.props.noteIndex === -1
          ? Math.floor(Math.random() * SCALE_CHROMATIC.length)
          : Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, node.props.noteIndex || 12));
        
        const intensity = node.props.intensity !== undefined ? node.props.intensity : 0.5;
        
        outgoing.forEach(edge => {
          simPackets.push({
            id: uid(),
            edgeId: edge.id,
            t: 0,
            payload: { scaleIndex, gain: intensity, timbre: 0 }
          });
        });
      }
    }
    
    // 2. Check delay node releases
    for (const node of simNodes.filter(n => n.type === 'delay')) {
      const held = heldPackets.get(node.id) || [];
      const toRelease = held.filter(h => h.releaseTime <= currentTime);
      
      toRelease.forEach(h => {
        node.flash = 1.0;
        const outgoing = simEdges.filter(e => e.from === node.id);
        outgoing.forEach(edge => {
          simPackets.push({
            id: uid(),
            edgeId: edge.id,
            t: 0,
            payload: { ...h.payload }
          });
        });
      });
      
      heldPackets.set(node.id, held.filter(h => h.releaseTime > currentTime));
    }
    
    // 3. Move packets
    const pixelsPerBeat = settings.pixelsPerBeat || 200;
    
    for (let i = simPackets.length - 1; i >= 0; i--) {
      const p = simPackets[i];
      const edge = simEdges.find(e => e.id === p.edgeId);
      if (!edge) { simPackets.splice(i, 1); continue; }
      
      const n1 = simNodes.find(n => n.id === edge.from);
      const n2 = simNodes.find(n => n.id === edge.to);
      if (!n1 || !n2) { simPackets.splice(i, 1); continue; }
      
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(0.1, d / pixelsPerBeat);
      const edgeDuration = steps * beatDuration;
      
      p.t += frameDuration / edgeDuration;
      
      if (p.t >= 1.0) {
        // Packet arrived
        n2.flash = 1.0;
        
        // Process node effects
        const result = processNodeArrival(p.payload, n2, simNodes, simEdges, currentTime, beatDuration, heldPackets);
        
        if (result.newPackets) {
          result.newPackets.forEach(np => {
            simPackets.push({
              id: uid(),
              edgeId: np.edgeId,
              t: 0,
              payload: np.payload
            });
          });
        }
        
        simPackets.splice(i, 1);
      }
    }
    
    // Store frame state (deep clone)
    frames.push({
      time: currentTime,
      nodes: simNodes.map(n => ({ ...n, props: { ...n.props } })),
      packets: simPackets.map(p => ({ ...p, payload: { ...p.payload } }))
    });
  }
  
  return {
    frames,
    nodes: simNodes,
    edges: simEdges,
    duration: durationSeconds,
    fps
  };
}

/**
 * Process node arrival for simulation
 */
function processNodeArrival(payload, node, nodes, edges, currentTime, beatDuration, heldPackets) {
  const result = { newPackets: [] };
  let newPayload = { ...payload };
  
  switch (node.type) {
    case 'speaker':
      // Speaker plays sound but packets can continue if there are outgoing edges
      // Just apply speaker properties to payload
      newPayload.reverb = node.props.reverb || 0;
      newPayload.pan = node.props.pan || 0;
      newPayload.gain = (newPayload.gain || 0.5) * (node.props.volume || 1);
      break;
      
    case 'delay': {
      const delayBeats = node.props.delayTime || 1;
      const delaySeconds = delayBeats * beatDuration;
      if (!heldPackets.has(node.id)) heldPackets.set(node.id, []);
      heldPackets.get(node.id).push({
        payload: newPayload,
        releaseTime: currentTime + delaySeconds
      });
      return result;
    }
    
    case 'chord': {
      const offsets = [0, 4, 7];
      const outgoing = edges.filter(e => e.from === node.id);
      offsets.forEach(semitones => {
        const newIndex = Math.min(SCALE_CHROMATIC.length - 1, newPayload.scaleIndex + semitones);
        outgoing.forEach(edge => {
          result.newPackets.push({
            edgeId: edge.id,
            payload: { ...newPayload, scaleIndex: newIndex }
          });
        });
      });
      return result;
    }
    
    case 'pitch':
      if (node.props.mode === 'fixed') {
        newPayload.scaleIndex = node.props.fixedNote || 12;
      } else {
        newPayload.scaleIndex = Math.max(0, Math.min(SCALE_CHROMATIC.length - 1, 
          newPayload.scaleIndex + (node.props.shift || 0)));
      }
      break;
      
    case 'polariser':
    case 'noise':
    case 'harmonic':
      newPayload.timbre = 0.8;
      break;
      
    case 'gate':
      if (Math.random() > (node.props.prob || 0.5)) return result;
      break;
      
    case 'gain':
      newPayload.gain = (newPayload.gain || 0.5) * (node.props.value || 1);
      break;
      
    case 'teleporter': {
      const channel = node.props.channel;
      const linked = nodes.filter(n => n.type === 'teleporter' && n.id !== node.id && n.props.channel === channel);
      linked.forEach(tp => {
        const outgoing = edges.filter(e => e.from === tp.id);
        outgoing.forEach(edge => {
          result.newPackets.push({ edgeId: edge.id, payload: { ...newPayload } });
        });
      });
      return result;
    }
  }
  
  // Forward to outputs
  const outgoing = edges.filter(e => e.from === node.id);
  outgoing.forEach(edge => {
    result.newPackets.push({ edgeId: edge.id, payload: { ...newPayload } });
  });
  
  return result;
}

/**
 * Render a frame to canvas context
 */
export function renderFrame(ctx, frameData, edges, width, height, options = {}) {
  const { nodes, packets } = frameData;
  const bgColor = options.backgroundColor || '#0a0a0f';
  const scale = options.scale || 1;
  const offsetX = options.offsetX || 0;
  const offsetY = options.offsetY || 0;
  
  // Clear
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  
  // Draw edges
  ctx.lineWidth = 3;
  edges.forEach(e => {
    const n1 = nodes.find(n => n.id === e.from);
    const n2 = nodes.find(n => n.id === e.to);
    if (!n1 || !n2) return;
    
    const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
    grad.addColorStop(0, '#333');
    grad.addColorStop(1, '#555');
    ctx.strokeStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
  });
  
  // Draw packets with trails
  packets.forEach(p => {
    const edge = edges.find(e => e.id === p.edgeId);
    if (!edge) return;
    
    const n1 = nodes.find(n => n.id === edge.from);
    const n2 = nodes.find(n => n.id === edge.to);
    if (!n1 || !n2) return;
    
    const x = n1.x + (n2.x - n1.x) * p.t;
    const y = n1.y + (n2.y - n1.y) * p.t;
    
    // Color based on pitch
    const scaleIndex = p.payload.scaleIndex || 12;
    const hue = (scaleIndex / 36) * 300;
    const color = `hsl(${hue}, 85%, 60%)`;
    const trailColor = `hsla(${hue}, 85%, 60%, 0.5)`;
    
    // Trail
    const trailT = Math.max(0, p.t - 0.15);
    const trailX = n1.x + (n2.x - n1.x) * trailT;
    const trailY = n1.y + (n2.y - n1.y) * trailT;
    
    ctx.strokeStyle = trailColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(trailX, trailY);
    ctx.stroke();
    
    // Head
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  
  // Draw nodes
  nodes.forEach(node => {
    const color = NODE_COLORS[node.type] || '#888';
    
    // Flash glow
    if (node.flash > 0.01) {
      ctx.shadowColor = color;
      ctx.shadowBlur = node.flash * 40;
    }
    
    // Node body
    ctx.fillStyle = '#1e1e1e';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    if (node.type === 'speaker') {
      ctx.fillRect(node.x - 13, node.y - 30, 26, 60);
      ctx.strokeRect(node.x - 13, node.y - 30, 26, 60);
    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Icon
    const icon = NODE_ICONS[node.type] || '?';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(icon, node.x, node.y);
  });
  
  ctx.restore();
}

/**
 * Calculate bounding box of nodes
 */
export function calculateBounds(nodes) {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  nodes.forEach(n => {
    minX = Math.min(minX, n.x - 50);
    minY = Math.min(minY, n.y - 50);
    maxX = Math.max(maxX, n.x + 50);
    maxY = Math.max(maxY, n.y + 50);
  });
  
  return { minX, minY, maxX, maxY };
}

/**
 * Get supported video mimeType for MediaRecorder (video only)
 */
function getSupportedVideoMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

/**
 * Get supported mimeType for MediaRecorder with audio+video
 */
function getSupportedAudioVideoMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,vorbis',
    'video/webm;codecs=vp8,vorbis',
    'video/webm',
    'video/mp4'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

/**
 * Export simulation to video
 */
export async function exportToVideo(simulationData, edges, options = {}) {
  const { frames, fps } = simulationData;
  const width = options.width || 1920;
  const height = options.height || 1080;
  
  // Calculate bounds and scale to fit
  const bounds = calculateBounds(simulationData.nodes);
  const padding = 100;
  const graphWidth = bounds.maxX - bounds.minX;
  const graphHeight = bounds.maxY - bounds.minY;
  
  const scaleX = (width - padding * 2) / (graphWidth || 1);
  const scaleY = (height - padding * 2) / (graphHeight || 1);
  const scale = Math.min(scaleX, scaleY, 2); // Cap at 2x
  
  const offsetX = padding - bounds.minX * scale + (width - padding * 2 - graphWidth * scale) / 2;
  const offsetY = padding - bounds.minY * scale + (height - padding * 2 - graphHeight * scale) / 2;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(fps);
    const mimeType = getSupportedVideoMimeType();
    
    let mediaRecorder;
    try {
      const recorderOptions = { videoBitsPerSecond: options.bitrate || 5000000 };
      if (mimeType) recorderOptions.mimeType = mimeType;
      mediaRecorder = new MediaRecorder(stream, recorderOptions);
    } catch (e) {
      mediaRecorder = new MediaRecorder(stream);
    }
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      resolve(blob);
    };
    
    mediaRecorder.onerror = reject;
    mediaRecorder.start();
    
    // Render frames at correct timing
    let frameIndex = 0;
    const frameDuration = 1000 / fps;
    
    function renderNextFrame() {
      if (frameIndex >= frames.length) {
        setTimeout(() => mediaRecorder.stop(), 100);
        return;
      }
      
      renderFrame(ctx, frames[frameIndex], edges, width, height, {
        scale,
        offsetX,
        offsetY,
        backgroundColor: options.backgroundColor || '#0a0a0f'
      });
      
      frameIndex++;
      
      if (options.onProgress) {
        options.onProgress(frameIndex / frames.length);
      }
      
      setTimeout(renderNextFrame, frameDuration);
    }
    
    renderNextFrame();
  });
}

/**
 * Create a real-time preview renderer
 */
export function createPreviewRenderer(canvas, simulationData, edges, options = {}) {
  const ctx = canvas.getContext('2d');
  const { frames, fps } = simulationData;
  
  const bounds = calculateBounds(simulationData.nodes);
  const padding = 20;
  const graphWidth = bounds.maxX - bounds.minX;
  const graphHeight = bounds.maxY - bounds.minY;
  
  const scaleX = (canvas.width - padding * 2) / (graphWidth || 1);
  const scaleY = (canvas.height - padding * 2) / (graphHeight || 1);
  const scale = Math.min(scaleX, scaleY, 2);
  
  const offsetX = padding - bounds.minX * scale + (canvas.width - padding * 2 - graphWidth * scale) / 2;
  const offsetY = padding - bounds.minY * scale + (canvas.height - padding * 2 - graphHeight * scale) / 2;
  
  let isRunning = false;
  let frameIndex = 0;
  let animationId = null;
  let lastTime = 0;
  
  function render(timestamp) {
    if (!isRunning) return;
    
    const elapsed = timestamp - lastTime;
    if (elapsed >= 1000 / fps) {
      lastTime = timestamp;
      
      if (frameIndex < frames.length) {
        renderFrame(ctx, frames[frameIndex], edges, canvas.width, canvas.height, {
          scale,
          offsetX,
          offsetY,
          backgroundColor: options.backgroundColor || '#0a0a0f'
        });
        frameIndex++;
      } else {
        frameIndex = 0; // Loop
      }
    }
    
    animationId = requestAnimationFrame(render);
  }
  
  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      frameIndex = 0;
      lastTime = performance.now();
      animationId = requestAnimationFrame(render);
    },
    
    stop() {
      isRunning = false;
      if (animationId) cancelAnimationFrame(animationId);
    },
    
    isPlaying() {
      return isRunning;
    }
  };
}

/**
 * Export video with audio track
 * @param {Object} simulationData - From compileGraphSimulation
 * @param {Array} edges - Graph edges
 * @param {Array} nodes - Original nodes for audio compilation
 * @param {number} bpm - Beats per minute
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} Video blob with audio
 */
export async function exportToVideoWithAudio(simulationData, edges, nodes, bpm, options = {}) {
  const { frames, fps, duration } = simulationData;
  const width = options.width || 1920;
  const height = options.height || 1080;
  
  // Compile audio events
  if (options.onProgress) options.onProgress(0, 'Compiling audio...');
  
  const settings = {
    pixelsPerBeat: options.pixelsPerBeat || 200
  };
  
  const audioEvents = compileGraph(nodes, edges, duration, bpm, settings);
  
  // Render audio to buffer
  if (options.onProgress) options.onProgress(0.1, 'Rendering audio...');
  const audioBuffer = await renderToBuffer(audioEvents, duration);
  
  // Create AudioContext and destination for mixing
  const audioCtx = new AudioContext({ sampleRate: audioBuffer.sampleRate });
  const audioDestination = audioCtx.createMediaStreamDestination();
  
  // Calculate video bounds and scale
  const bounds = calculateBounds(simulationData.nodes);
  const padding = 100;
  const graphWidth = bounds.maxX - bounds.minX;
  const graphHeight = bounds.maxY - bounds.minY;
  
  const scaleX = (width - padding * 2) / (graphWidth || 1);
  const scaleY = (height - padding * 2) / (graphHeight || 1);
  const scale = Math.min(scaleX, scaleY, 2);
  
  const offsetX = padding - bounds.minX * scale + (width - padding * 2 - graphWidth * scale) / 2;
  const offsetY = padding - bounds.minY * scale + (height - padding * 2 - graphHeight * scale) / 2;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  return new Promise((resolve, reject) => {
    // Get video stream from canvas
    const videoStream = canvas.captureStream(fps);
    
    // Combine video and audio streams
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks()
    ]);
    
    const mimeType = getSupportedAudioVideoMimeType();
    
    let mediaRecorder;
    try {
      const recorderOptions = { 
        videoBitsPerSecond: options.bitrate || 5000000,
        audioBitsPerSecond: 128000
      };
      if (mimeType) recorderOptions.mimeType = mimeType;
      mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
    } catch (e) {
      // Fallback: try without specifying mime type
      try {
        mediaRecorder = new MediaRecorder(combinedStream);
      } catch (e2) {
        reject(new Error('Browser does not support recording audio with video. Try unchecking "Include Audio".'));
        return;
      }
    }
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      audioCtx.close();
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      resolve(blob);
    };
    
    mediaRecorder.onerror = (e) => {
      audioCtx.close();
      reject(e);
    };
    
    // Start audio playback connected to the stream destination
    const audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioDestination);
    audioSource.start(0);
    
    // Start recording
    mediaRecorder.start();
    
    if (options.onProgress) options.onProgress(0.15, 'Recording video...');
    
    // Render frames at correct timing
    let frameIndex = 0;
    const frameDuration = 1000 / fps;
    
    function renderNextFrame() {
      if (frameIndex >= frames.length) {
        setTimeout(() => mediaRecorder.stop(), 100);
        return;
      }
      
      renderFrame(ctx, frames[frameIndex], edges, width, height, {
        scale,
        offsetX,
        offsetY,
        backgroundColor: options.backgroundColor || '#0a0a0f'
      });
      
      frameIndex++;
      
      if (options.onProgress) {
        const progress = 0.15 + (frameIndex / frames.length) * 0.85;
        options.onProgress(progress, `Rendering: ${Math.round((frameIndex / frames.length) * 100)}%`);
      }
      
      setTimeout(renderNextFrame, frameDuration);
    }
    
    renderNextFrame();
  });
}
