// Phonon v2 - Export Modal (Audio/MIDI/Video)

import React, { useState, useMemo } from 'react';
import { useGraphStore } from '@core/store';
import { compileGraph, compileArrangement, calculateArrangementDuration } from '../io/compiler';
import { compileVideoFrames, compileArrangementVideoFrames } from '../io/video-compiler';
import { FrameByFrameExporter } from '../io/video-encoder';
import { renderOfflineFrame, createOfflineRenderState } from '../viz/offline-renderer';
import { encodeMIDI } from '../io/midi';
import type { MIDIEvent } from '../io/midi';
import type { AudioEvent } from '../io/compiler';
import type { VideoResolution, VizConfig } from '@core/types';
import { getDefaultVizConfig } from '@core/store';
import styles from './ExportModal.module.css';
// Video resolution options
const RESOLUTIONS: VideoResolution[] = [
  { width: 1280, height: 720, name: '720p' },
  { width: 1920, height: 1080, name: '1080p' },
  { width: 2560, height: 1440, name: '1440p' },
  { width: 3840, height: 2160, name: '4K' },
];

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

type ExportTab = 'audio' | 'video';

export function ExportModal({ visible, onClose }: ExportModalProps): React.ReactElement | null {
  // Tab state
  const [activeTab, setActiveTab] = useState<ExportTab>('audio');
  
  // Audio export state
  const [duration, setDuration] = useState(10);
  const [format, setFormat] = useState<'wav' | 'midi'>('wav');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState('');
  const [exportMode, setExportMode] = useState<'canvas' | 'arrangement'>('arrangement');
  
  // Video export state
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(RESOLUTIONS[1]!);
  const [videoFrameRate, setVideoFrameRate] = useState<30 | 60>(30);
  const [includeAudio, setIncludeAudio] = useState(true);
  
  const nodes = useGraphStore(state => state.nodes);
  const edges = useGraphStore(state => state.edges);
  const musicalContext = useGraphStore(state => state.musicalContext);
  const globalSettings = useGraphStore(state => state.globalSettings);
  const projectMeta = useGraphStore(state => state.projectMeta);
  const scenes = useGraphStore(state => state.scenes);
  const arrangement = useGraphStore(state => state.arrangement);
  const getCurrentScene = useGraphStore(state => state.getCurrentScene);
  const currentScene = getCurrentScene();
  
  // Check if arrangement has scenes
  const hasArrangement = arrangement.length > 0;
  
  // Calculate arrangement duration (memoized)
  const arrangementDuration = useMemo(() => {
    if (!hasArrangement) return 0;
    return calculateArrangementDuration(scenes, arrangement, 120);
  }, [scenes, arrangement, hasArrangement]);
  
  const handleExport = async () => {
    if (activeTab === 'audio') {
      await handleAudioExport();
    } else {
      await handleVideoExport();
    }
  };
  
  const handleAudioExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setProgressPhase('Compiling...');
    
    try {
      if (format === 'wav') {
        await exportWAV();
      } else {
        await exportMIDI();
      }
      
      setProgress(100);
      setProgressPhase('Complete!');
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Check console for details.');
      setIsExporting(false);
    }
  };
  
  const handleVideoExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setProgressPhase('Compiling frames...');
    
    try {
      await exportVideo();
      
      setProgress(100);
      setProgressPhase('Complete!');
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Video export failed:', err);
      alert('Video export failed. Check console for details.');
      setIsExporting(false);
    }
  };
  
  const exportVideo = async () => {
    const useArrangement = exportMode === 'arrangement' && hasArrangement;
    const videoDuration = useArrangement ? arrangementDuration : duration;
    const frameDuration = 1 / videoFrameRate;
    
    // Check for speaker nodes if including audio
    let audioBuffer: AudioBuffer | undefined;
    if (includeAudio) {
      const hasSpeakers = useArrangement 
        ? arrangement.some(slot => {
            const scene = scenes.get(slot.sceneId);
            return scene?.nodes.some(n => n.type === 'speaker');
          })
        : Array.from(nodes.values()).some(n => n.type === 'speaker');
      
      if (hasSpeakers) {
        setProgressPhase('Compiling audio...');
        setProgress(2);
        
        // Compile audio events
        let audioEvents: AudioEvent[];
        if (useArrangement) {
          audioEvents = compileArrangement(scenes, arrangement, musicalContext, globalSettings, 120);
        } else {
          audioEvents = compileGraph(nodes, edges, videoDuration, musicalContext, globalSettings);
        }
        
        if (audioEvents.length > 0) {
          setProgress(5);
          setProgressPhase('Rendering audio...');
          
          // Render audio events to buffer - use video duration to ensure full length
          const sampleRate = 44100;
          const numChannels = 2;
          // Add a small buffer to ensure audio covers the full video
          const numSamples = Math.ceil((videoDuration + 0.5) * sampleRate);
          
          audioBuffer = await renderEventsToBuffer(audioEvents, sampleRate, numChannels, numSamples, (p) => {
            setProgress(5 + p * 5); // 5% to 10%
          });
        }
      }
    }
    
    setProgressPhase('Compiling frame data...');
    setProgress(10);
    
    // Compile frame data (includes per-scene vizConfig for arrangement)
    let frameData;
    if (useArrangement) {
      frameData = compileArrangementVideoFrames(
        scenes,
        arrangement,
        videoFrameRate,
        musicalContext,
        globalSettings,
        120
      );
    } else {
      // For canvas mode, use current scene's viz config or default
      const canvasVizMode = currentScene?.vizMode ?? 'particles';
      const defaultVizConfig = getDefaultVizConfig(canvasVizMode);
      const canvasVizConfig = currentScene?.vizConfig ?? defaultVizConfig ?? getDefaultVizConfig('particles');
      
      const rawFrames = compileVideoFrames(
        nodes,
        edges,
        videoDuration,
        videoFrameRate,
        musicalContext,
        globalSettings
      );
      
      // Add viz config to each frame (ensure not null/undefined)
      frameData = rawFrames.map(frame => ({
        ...frame,
        vizMode: canvasVizMode,
        vizConfig: canvasVizConfig ?? undefined,
      }));
    }
    
    if (frameData.length === 0) {
      throw new Error('No frames generated. Check your arrangement or duration.');
    }
    
    setProgress(15);
    setProgressPhase(`Rendering ${frameData.length} frames...`);
    
    // Create render state for offline rendering
    const renderState = createOfflineRenderState();
    
    // Use frame-by-frame exporter for proper timing
    const exporter = new FrameByFrameExporter(videoResolution.width, videoResolution.height);
    exporter.init(videoFrameRate, audioBuffer);
    
    // Track current viz config to detect scene changes
    let currentVizConfigForRendering: VizConfig | null = null;
    
    // Render and capture each frame
    for (let i = 0; i < frameData.length; i++) {
      const frame = frameData[i]!;
      
      // Get the viz config for this frame (from scene or default)
      const frameVizConfig = frame.vizConfig ?? getDefaultVizConfig(frame.vizMode ?? 'particles');
      
      // If viz config changed (new scene), reset some render state
      if (frameVizConfig !== currentVizConfigForRendering) {
        currentVizConfigForRendering = frameVizConfig;
        // Could reset particle systems here for clean scene transitions
      }
      
      // Render and capture frame using the scene's viz config
      exporter.captureFrame(frame, (exportCtx, fdata, w, h, _cfg) => {
        renderOfflineFrame(exportCtx, fdata, w, h, frameVizConfig, renderState, frameDuration);
      }, frameVizConfig);
      
      // Update progress periodically
      if (i % 30 === 0) {
        const frameProgress = (i / frameData.length);
        setProgress(15 + frameProgress * 35); // 15% to 50%
        setProgressPhase(`Rendering frame ${i + 1} / ${frameData.length}`);
        // Yield to UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    setProgress(50);
    setProgressPhase(`Encoding video (${frameData.length} frames)... This plays back in real-time.`);
    
    // Encode video (this takes real-time as it plays back the frames)
    const videoBlob = await exporter.encode();
    exporter.dispose();
    
    setProgress(95);
    setProgressPhase('Saving...');
    
    // Download
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectMeta.name || 'export'}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportWAV = async () => {
    const useArrangement = exportMode === 'arrangement' && hasArrangement;
    
    // Check for speaker nodes in the appropriate source
    if (useArrangement) {
      // Check all scenes in arrangement for speaker nodes
      let hasSpeakerInArrangement = false;
      for (const slot of arrangement) {
        const scene = scenes.get(slot.sceneId);
        if (scene && scene.nodes.some(n => n.type === 'speaker')) {
          hasSpeakerInArrangement = true;
          break;
        }
      }
      if (!hasSpeakerInArrangement) {
        alert('No speaker nodes found in any scene in the arrangement. Add at least one speaker to export audio.');
        throw new Error('No speaker nodes in arrangement');
      }
    } else {
      const hasSpeaker = Array.from(nodes.values()).some(n => n.type === 'speaker');
      if (!hasSpeaker) {
        alert('No speaker nodes found in graph. Add at least one speaker to export audio.');
        throw new Error('No speaker nodes');
      }
    }
    
    setProgress(10);
    
    // Compile graph or arrangement to audio events
    let events: AudioEvent[];
    if (useArrangement) {
      events = compileArrangement(scenes, arrangement, musicalContext, globalSettings, 120);
    } else {
      events = compileGraph(nodes, edges, duration, musicalContext, globalSettings);
    }
    
    setProgress(30);
    
    // Render events to audio buffer
    const sampleRate = 44100;
    const numChannels = 2;
    const renderDuration = useArrangement ? arrangementDuration : duration;
    const numSamples = Math.floor(renderDuration * sampleRate);
    
    const audioBuffer = await renderEventsToBuffer(events, sampleRate, numChannels, numSamples, (p) => {
      setProgress(30 + p * 0.4); // 30% to 70%
    });
    
    setProgress(70);
    
    // Encode to WAV
    const wavBlob = encodeWAV(audioBuffer);
    
    setProgress(90);
    
    // Download
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectMeta.name || 'export'}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportMIDI = async () => {
    const useArrangement = exportMode === 'arrangement' && hasArrangement;
    
    setProgress(10);
    
    // Compile graph or arrangement to audio events
    let audioEvents: AudioEvent[];
    if (useArrangement) {
      audioEvents = compileArrangement(scenes, arrangement, musicalContext, globalSettings, 120);
    } else {
      audioEvents = compileGraph(nodes, edges, duration, musicalContext, globalSettings);
    }
    
    if (audioEvents.length === 0) {
      alert('No audio events generated. Make sure you have sources connected to speakers.');
      throw new Error('No audio events');
    }
    
    setProgress(30);
    
    // Convert audio events to MIDI events
    const midiEvents: MIDIEvent[] = [];
    const bpm = 120; // TODO: Get from global settings when available
    
    for (const event of audioEvents) {
      // Convert frequency to MIDI note (if not already available)
      const midiNote = event.midiNote ?? Math.round(12 * Math.log2(event.freq / 440) + 69);
      
      // Clamp to valid MIDI range
      const note = Math.max(0, Math.min(127, midiNote));
      
      // Calculate velocity from gain (0-127)
      const velocity = Math.max(1, Math.min(127, Math.round(event.gain * 100)));
      
      // Note duration (hold + release, converted to beats)
      const noteDuration = event.holdTime + event.releaseTime;
      
      // Add noteOn
      midiEvents.push({
        time: event.time,
        type: 'noteOn',
        channel: 0,
        note,
        velocity
      });
      
      // Add noteOff
      midiEvents.push({
        time: event.time + noteDuration,
        type: 'noteOff',
        channel: 0,
        note,
        velocity: 0
      });
    }
    
    setProgress(70);
    
    // Encode to MIDI
    const midiBlob = encodeMIDI(midiEvents, bpm);
    
    setProgress(90);
    
    // Download
    const url = URL.createObjectURL(midiBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectMeta.name || 'export'}.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!visible) return null;
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📤 Export</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        {/* Tab bar */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'audio' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('audio')}
            disabled={isExporting}
          >
            🔊 Audio
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'video' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('video')}
            disabled={isExporting}
          >
            🎬 Video
          </button>
        </div>
        
        <div className={styles.content}>
          {/* Export source selection (shared) */}
          <div className={styles.row}>
            <label>Export Source</label>
            <select 
              value={exportMode} 
              onChange={e => setExportMode(e.target.value as 'canvas' | 'arrangement')} 
              disabled={isExporting}
            >
              <option value="arrangement" disabled={!hasArrangement}>
                Arrangement ({arrangement.length} scenes) {hasArrangement ? `- ${arrangementDuration.toFixed(1)}s` : '- empty'}
              </option>
              <option value="canvas">Current Canvas</option>
            </select>
          </div>
          
          {/* Duration - only shown for canvas mode */}
          {exportMode === 'canvas' && (
            <div className={styles.row}>
              <label>Duration (seconds)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(parseFloat(e.target.value))}
                min={1}
                max={600}
                step={1}
                disabled={isExporting}
              />
            </div>
          )}
          
          {/* Arrangement info */}
          {exportMode === 'arrangement' && hasArrangement && (
            <div className={styles.info}>
              <p>
                📋 Exporting {arrangement.length} scene{arrangement.length !== 1 ? 's' : ''} 
                ({arrangementDuration.toFixed(1)} seconds total)
              </p>
            </div>
          )}
          
          {/* Audio-specific options */}
          {activeTab === 'audio' && (
            <>
              <div className={styles.row}>
                <label>Format</label>
                <select value={format} onChange={e => setFormat(e.target.value as 'wav' | 'midi')} disabled={isExporting}>
                  <option value="wav">WAV (Audio)</option>
                  <option value="midi">MIDI</option>
                </select>
              </div>
              
              {format === 'wav' && (
                <div className={styles.info}>
                  <p>Exports audio output from all Speaker nodes.</p>
                </div>
              )}
              
              {format === 'midi' && (
                <div className={styles.info}>
                  <p>Exports MIDI events from MIDI Out nodes.</p>
                </div>
              )}
            </>
          )}
          
          {/* Video-specific options */}
          {activeTab === 'video' && (
            <>
              <div className={styles.row}>
                <label>Resolution</label>
                <select 
                  value={`${videoResolution.width}x${videoResolution.height}`}
                  onChange={e => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    const res = RESOLUTIONS.find(r => r.width === w && r.height === h);
                    if (res) setVideoResolution(res);
                  }}
                  disabled={isExporting}
                >
                  {RESOLUTIONS.map(r => (
                    <option key={r.name} value={`${r.width}x${r.height}`}>
                      {r.name} ({r.width}×{r.height})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.row}>
                <label>Frame Rate</label>
                <select 
                  value={videoFrameRate}
                  onChange={e => setVideoFrameRate(parseInt(e.target.value) as 30 | 60)}
                  disabled={isExporting}
                >
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
              
              <div className={styles.row}>
                <label>Include Audio</label>
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={e => setIncludeAudio(e.target.checked)}
                  disabled={isExporting}
                />
              </div>
              
              <div className={styles.info}>
                <p>
                  🎬 Exports WebM video ({videoResolution.name}, {videoFrameRate}fps)
                  {includeAudio && ' with audio'}
                  <br />
                  Visualization uses each scene's viz mode setting.
                  <br />
                  Estimated frames: {Math.ceil((exportMode === 'arrangement' && hasArrangement ? arrangementDuration : duration) * videoFrameRate)}
                </p>
              </div>
            </>
          )}
          
          {isExporting && (
            <div className={styles.progressContainer}>
              <div className={styles.progressLabel}>{progressPhase}</div>
              <div className={styles.progress}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button className={styles.exportBtn} onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : `Export ${activeTab === 'audio' ? (format === 'wav' ? 'WAV' : 'MIDI') : 'Video'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Voice state for offline rendering (mirrors worklet Voice interface)
interface RenderVoice {
  freq: number;
  gain: number;
  wave: string;
  attack: number;
  decay: number;
  holdTime: number;
  releaseTime: number;
  cutoff: number;
  timbre: number;
  pan: number;
  
  // State
  time: number;
  state: 'attack' | 'hold' | 'decay' | 'dead';
  envelope: number;
  
  // Layers
  layers: Array<{
    wave: string;
    phase: number;
    attack: number;
    decay: number;
    gain: number;
    ratio: number;
    envelope: number;
  }>;
  
  // Vibrato
  vibratoRate: number;
  vibratoDepth: number;
  vibratoDelay: number;
  vibratoPhase: number;
  
  // Filter
  filterEnv: { attack: number; decay: number; mod: number } | null;
  filterEnvValue: number;
  
  // Biquad filter state
  filterX1: number;
  filterX2: number;
  filterY1: number;
  filterY2: number;
}

// Render audio events to buffer
async function renderEventsToBuffer(
  events: AudioEvent[],
  sampleRate: number,
  numChannels: number,
  numSamples: number,
  onProgress: (progress: number) => void
): Promise<AudioBuffer> {
  const audioBuffer = new AudioBuffer({
    length: numSamples,
    numberOfChannels: numChannels,
    sampleRate,
  });
  
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);
  const dt = 1 / sampleRate;
  
  // Create voices from events
  const voices: Array<{ startSample: number; voice: RenderVoice }> = [];
  
  for (const event of events) {
    if (!event) continue;
    
    const layers = event.waves || [{ wave: event.wave, attack: 0.01, decay: 0.4, gain: 1.0 }];
    
    // Calculate main envelope times from layers (like audio engine does)
    const mainAttack = layers.length > 0 ? Math.max(...layers.map(l => l.attack)) : 0.01;
    const mainDecay = layers.length > 0 ? Math.max(...layers.map(l => l.decay)) : event.releaseTime;
    
    const voice: RenderVoice = {
      freq: event.freq as number,
      gain: event.gain,
      wave: event.wave,
      attack: mainAttack,
      decay: mainDecay,
      holdTime: event.holdTime,
      releaseTime: event.releaseTime,
      cutoff: event.cutoff as number,
      timbre: event.timbre,
      pan: event.pan || 0,
      
      time: 0,
      state: 'attack',
      envelope: 0,
      
      layers: layers.map(l => ({
        wave: l.wave,
        phase: Math.random() * Math.PI * 2, // Random phase like worklet
        attack: l.attack,
        decay: l.decay,
        gain: l.gain,
        ratio: l.ratio ?? 1,
        envelope: 0,
      })),
      
      vibratoRate: event.vibratoRate || 0,
      vibratoDepth: event.vibratoDepth || 0,
      vibratoDelay: event.vibratoDelay || 0,
      vibratoPhase: 0,
      
      filterEnv: event.filterEnv || null,
      filterEnvValue: 0,
      
      filterX1: 0,
      filterX2: 0,
      filterY1: 0,
      filterY2: 0,
    };
    
    voices.push({
      startSample: Math.floor(event.time * sampleRate),
      voice,
    });
  }
  
  // Process all samples
  const activeVoices: RenderVoice[] = [];
  let nextVoiceIdx = 0;
  
  // Sort voices by start time
  voices.sort((a, b) => a.startSample - b.startSample);
  
  for (let i = 0; i < numSamples; i++) {
    // Activate voices that start at this sample
    while (nextVoiceIdx < voices.length && voices[nextVoiceIdx]!.startSample <= i) {
      activeVoices.push(voices[nextVoiceIdx]!.voice);
      nextVoiceIdx++;
    }
    
    let leftSample = 0;
    let rightSample = 0;
    
    // Process each active voice
    for (let v = activeVoices.length - 1; v >= 0; v--) {
      const voice = activeVoices[v]!;
      
      // Update main envelope
      updateVoiceEnvelope(voice, dt);
      
      if (voice.state === 'dead') {
        activeVoices.splice(v, 1);
        continue;
      }
      
      // Update vibrato
      if (voice.vibratoRate > 0 && voice.time > voice.vibratoDelay) {
        voice.vibratoPhase += voice.vibratoRate * dt * Math.PI * 2;
      }
      
      const vibratoMod = voice.vibratoDepth > 0 && voice.time > voice.vibratoDelay
        ? Math.pow(2, (Math.sin(voice.vibratoPhase) * voice.vibratoDepth) / 1200)
        : 1;
      
      // Update filter envelope
      if (voice.filterEnv) {
        const totalTime = voice.filterEnv.attack + voice.filterEnv.decay;
        if (voice.time < voice.filterEnv.attack) {
          voice.filterEnvValue = voice.time / Math.max(0.001, voice.filterEnv.attack);
        } else if (voice.time < totalTime) {
          voice.filterEnvValue = 1 - (voice.time - voice.filterEnv.attack) / Math.max(0.001, voice.filterEnv.decay);
        } else {
          voice.filterEnvValue = 0;
        }
      }
      
      // Process each layer
      let sample = 0;
      for (const layer of voice.layers) {
        updateLayerEnvelope(layer, voice.state, dt);
        
        const layerFreq = voice.freq * layer.ratio * vibratoMod;
        const phaseDelta = (layerFreq / sampleRate) * Math.PI * 2;
        layer.phase += phaseDelta;
        
        if (layer.phase > Math.PI * 2) {
          layer.phase -= Math.PI * 2;
        }
        
        const osc = oscillate(layer.wave, layer.phase);
        sample += osc * layer.gain * layer.envelope;
      }
      
      // Apply main envelope and gain
      sample *= voice.envelope * voice.gain;
      
      // Apply filter
      if (voice.cutoff < 20000 || voice.filterEnv) {
        sample = applyFilter(voice, sample, sampleRate);
      }
      
      // Mix to output with panning
      const pan = voice.pan;
      const leftGain = Math.cos((pan + 1) * Math.PI / 4);
      const rightGain = Math.sin((pan + 1) * Math.PI / 4);
      const masterGain = 0.5;
      
      leftSample += sample * masterGain * leftGain;
      rightSample += sample * masterGain * rightGain;
      
      voice.time += dt;
    }
    
    // Clip and write
    leftChannel[i] = Math.max(-1, Math.min(1, leftSample));
    rightChannel[i] = Math.max(-1, Math.min(1, rightSample));
    
    // Progress update
    if (i % (sampleRate * 2) === 0) {
      onProgress(i / numSamples);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  onProgress(1);
  return audioBuffer;
}

function updateVoiceEnvelope(voice: RenderVoice, dt: number): void {
  switch (voice.state) {
    case 'attack':
      voice.envelope += dt / Math.max(0.001, voice.attack);
      if (voice.envelope >= 1) {
        voice.envelope = 1;
        voice.state = voice.holdTime > 0 ? 'hold' : 'decay';
      }
      break;
      
    case 'hold':
      if (voice.time - voice.attack >= voice.holdTime) {
        voice.state = 'decay';
      }
      break;
      
    case 'decay':
      voice.envelope -= dt / Math.max(0.001, voice.decay);
      if (voice.envelope <= 0) {
        voice.envelope = 0;
        voice.state = 'dead';
      }
      break;
  }
}

function updateLayerEnvelope(
  layer: RenderVoice['layers'][0],
  voiceState: RenderVoice['state'],
  dt: number
): void {
  if (voiceState === 'attack') {
    layer.envelope += dt / Math.max(0.001, layer.attack);
    if (layer.envelope > 1) layer.envelope = 1;
  } else if (voiceState === 'decay' || voiceState === 'dead') {
    layer.envelope -= dt / Math.max(0.001, layer.decay);
    if (layer.envelope < 0) layer.envelope = 0;
  }
}

function oscillate(wave: string, phase: number): number {
  switch (wave) {
    case 'sine':
      return Math.sin(phase);
    case 'square':
      return phase < Math.PI ? 1 : -1;
    case 'sawtooth':
      return (phase / Math.PI) - 1;
    case 'triangle':
      if (phase < Math.PI) {
        return (2 * phase / Math.PI) - 1;
      } else {
        return 3 - (2 * phase / Math.PI);
      }
    case 'white':
    case 'pink':
    case 'brown':
      return Math.random() * 2 - 1;
    default:
      return Math.sin(phase);
  }
}

function applyFilter(voice: RenderVoice, input: number, sampleRate: number): number {
  let cutoff = voice.cutoff;
  
  // Apply filter envelope
  if (voice.filterEnv) {
    cutoff = Math.max(20, Math.min(20000, cutoff + voice.filterEnv.mod * voice.filterEnvValue));
  }
  
  // Calculate biquad coefficients (lowpass)
  const w0 = (2 * Math.PI * cutoff) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const Q = 1 + voice.timbre * 10;
  const alpha = sinw0 / (2 * Q);
  
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  
  // Normalize
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  
  // Apply filter (Direct Form II Transposed)
  const output = nb0 * input + nb1 * voice.filterX1 + nb2 * voice.filterX2
                 - na1 * voice.filterY1 - na2 * voice.filterY2;
  
  voice.filterX2 = voice.filterX1;
  voice.filterX1 = input;
  voice.filterY2 = voice.filterY1;
  voice.filterY1 = output;
  
  return output;
}

// WAV encoding function
function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = interleave(audioBuffer);
  const dataLength = data.length * bytesPerSample;
  
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // write samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i] || 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function interleave(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const result = new Float32Array(length * numChannels);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      result[i * numChannels + channel] = channelData[i] || 0;
    }
  }
  
  return result;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
