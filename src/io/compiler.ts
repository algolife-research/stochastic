// Stochastic v2 - Graph Compiler for Offline Audio Rendering
// Simulates the graph to collect audio events for export

import type { 
  GraphNode, 
  GraphEdge, 
  NodeId, 
  EdgeId,
  Frequency,
  MidiNote,
  WaveOrNoiseType,
  MusicalContext,
  SpeakerProps,
  PitchProps,
  OscillatorProps,
  ModulatorProps,
  FilterProps,
  GainProps,
  GateProps,
  QuantizerProps,
  LfoProps,
  GlobalSettings,
  PropsForNodeType
} from '@core/types';

export interface AudioEvent {
  time: number;
  freq: Frequency;
  midiNote: MidiNote;
  wave: WaveOrNoiseType;
  gain: number;
  timbre: number;
  cutoff: Frequency;
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  filterResonance: number;
  holdTime: number;
  releaseTime: number;
  pan?: number;
  reverb?: number;
  waves?: Array<{ 
    wave: WaveOrNoiseType; 
    attack: number; 
    decay: number; 
    gain: number; 
    ratio?: number;
    mode?: 'additive' | 'ring' | 'fm';
    modulationIndex?: number;
    feedback?: number;
    unison?: number;
    detune?: number;
    stereoSpread?: number;
  }>;
  vibratoRate?: number;
  vibratoDepth?: number;
  vibratoDelay?: number;
  filterEnv?: { attack: number; decay: number; mod: number };
}

interface SimPacket {
  id: string;
  edgeId: EdgeId;
  t: number;
  spawnTime: number;
  payload: {
    freq: Frequency;
    midiNote: MidiNote;
    wave: WaveOrNoiseType;
    timbre: number;
    cutoff: Frequency;
    filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
    filterResonance: number;
    gain: number;
    holdTime: number;
    releaseTime: number;
    waves?: Array<{ 
      wave: WaveOrNoiseType; 
      attack: number; 
      decay: number; 
      gain: number; 
      ratio?: number;
      mode?: 'additive' | 'ring' | 'fm';
      modulationIndex?: number;
      feedback?: number;
      unison?: number;
      detune?: number;
      stereoSpread?: number;
    }>;
    vibratoRate?: number;
    vibratoDepth?: number;
    vibratoDelay?: number;
    modulationValue?: number;
    filterEnv?: { attack: number; decay: number; mod: number };
  };
}

/**
 * Modulation state for the simulation - mirrors what the live engine keeps in
 * the store: LFO edges continuously rewrite target node props (tick/lfo.ts) and
 * packets arriving over a targetParam edge write CV values (tick/packets.ts).
 */
interface SimModState {
  /** target nodeId -> LFO modulation edges pointing at it */
  lfoTargets: Map<NodeId, Array<{ lfoNode: GraphNode; param: string }>>;
  /** nodeId -> prop overrides written by packet-based CV (targetParam edges) */
  cvOverrides: Map<NodeId, Record<string, unknown>>;
  /** gate nodeId -> density-fitness counter (sim-time beat windows) */
  gateDensity: Map<NodeId, { windowStart: number; count: number }>;
}

/**
 * Compile graph into timed audio events for offline rendering
 */
export function compileGraph(
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  durationSeconds: number,
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  bpm: number = 120
): AudioEvent[] {
  const events: AudioEvent[] = [];
  const beatDuration = 60 / bpm;
  const ticksPerBeat = 100;
  const tickDuration = beatDuration / ticksPerBeat;
  const totalTicks = Math.ceil(durationSeconds / tickDuration);
  
  // Simulation state
  const simPackets: SimPacket[] = [];
  const nodeTimers = new Map<NodeId, { lastEmit: number; interval: number }>();
  const heldPackets = new Map<NodeId, Array<{ payload: SimPacket['payload']; releaseTime: number }>>();

  // Wire up LFO modulation targets (edges with a targetParam whose source is an
  // LFO node). The live engine rewrites the target prop every frame; the sim
  // computes the LFO value lazily whenever a packet arrives at the target.
  const lfoTargets = new Map<NodeId, Array<{ lfoNode: GraphNode; param: string }>>();
  for (const edge of edges.values()) {
    if (!edge.targetParam) continue;
    const lfoNode = nodes.get(edge.from);
    if (!lfoNode || lfoNode.type !== 'lfo') continue;
    const list = lfoTargets.get(edge.to) ?? [];
    list.push({ lfoNode, param: edge.targetParam });
    lfoTargets.set(edge.to, list);
  }
  const simState: SimModState = {
    lfoTargets,
    cvOverrides: new Map(),
    gateDensity: new Map(),
  };

  // Initialize source node timers
  for (const node of nodes.values()) {
    if (node.type === 'source') {
      const props = node.props as PropsForNodeType<'source'>;
      const interval = props.interval || 2;
      nodeTimers.set(node.id, { lastEmit: -Infinity, interval });
    }
  }
  
  // Main simulation loop
  for (let tick = 0; tick < totalTicks; tick++) {
    const currentTime = tick * tickDuration;
    const currentBeat = currentTime / beatDuration;
    
    // 1. Emit from source nodes
    for (const node of nodes.values()) {
      if (node.type !== 'source') continue;
      
      const timer = nodeTimers.get(node.id);
      if (!timer) continue;

      // Live engine reads source props every frame, so LFO/CV modulation of
      // interval/intensity applies (tick/sources.ts)
      const props = getEffectiveProps(node, simState, currentTime) as PropsForNodeType<'source'>;

      // Manual-trigger sources never auto-emit in the live engine
      if (props.autoTrigger === false) continue;

      const interval = props.interval || 2;

      if (currentBeat - timer.lastEmit >= interval) {
        timer.lastEmit = currentBeat;

        const noteIndex = props.noteIndex ?? -1;
        const intensity = props.intensity ?? 0.5;
        
        // Determine MIDI note - aligned with live engine (tick.ts)
        let midiNote: number;
        if (noteIndex >= 0) {
          // Legacy scale-based index (same as live engine)
          // LEGACY_SCALE_OFFSET = 36
          midiNote = 36 + Math.min(36, noteIndex);
        } else if (noteIndex === -1) {
          // Random note
          midiNote = 36 + Math.floor(Math.random() * 49);
        } else {
          // Fixed MIDI note (noteIndex < -1, typically -2)
          midiNote = props.midiNote ?? 60;
        }
        
        // Clamp to valid MIDI range
        midiNote = Math.max(0, Math.min(127, midiNote));
        
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12) as Frequency;
        
        // Spawn packets to outgoing edges
        const outgoing = Array.from(edges.values()).filter(e => e.from === node.id);
        
        for (const edge of outgoing) {
          simPackets.push({
            id: crypto.randomUUID(),
            edgeId: edge.id,
            t: 0,
            spawnTime: currentTime,
            payload: {
              freq,
              midiNote: midiNote as MidiNote,
              wave: 'sine',
              timbre: 0,
              cutoff: 20000 as Frequency,
              filterType: 'lowpass',
              filterResonance: 0,
              gain: intensity,
              holdTime: 0,
              releaseTime: 0.1,
            },
          });
        }
      }
    }
    
    // 2. Release held packets from delay nodes
    for (const node of nodes.values()) {
      if (node.type !== 'delay') continue;
      
      const held = heldPackets.get(node.id) || [];
      const toRelease = held.filter(h => h.releaseTime <= currentTime);
      
      for (const h of toRelease) {
        const outgoing = Array.from(edges.values()).filter(e => e.from === node.id);
        for (const edge of outgoing) {
          simPackets.push({
            id: crypto.randomUUID(),
            edgeId: edge.id,
            t: 0,
            spawnTime: currentTime,
            payload: { ...h.payload },
          });
        }
      }
      
      heldPackets.set(node.id, held.filter(h => h.releaseTime > currentTime));
    }
    
    // 3. Move packets and process arrivals
    for (let i = simPackets.length - 1; i >= 0; i--) {
      const p = simPackets[i];
      if (!p) continue;
      
      const edge = edges.get(p.edgeId);
      if (!edge) {
        simPackets.splice(i, 1);
        continue;
      }
      
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);
      if (!fromNode || !toNode) {
        simPackets.splice(i, 1);
        continue;
      }
      
      // Calculate travel time
      let edgeDuration: number;
      if (edge.timingMode === 'fixed' && edge.durationBeats !== null) {
        edgeDuration = edge.durationBeats * beatDuration;
      } else {
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pixelsPerBeat = globalSettings.pixelsPerBeat || 200;
        const steps = Math.max(0.1, dist / pixelsPerBeat);
        edgeDuration = steps * beatDuration;
      }
      
      p.t += tickDuration / Math.max(0.001, edgeDuration);
      
      if (p.t >= 1.0) {
        if (edge.targetParam) {
          // Modulation edge (CV routing): write the value to the target node's
          // prop and consume the packet - modulation packets never forward
          // (tick/packets.ts:191-207)
          const value = p.payload.modulationValue ?? p.payload.gain;
          const overrides = simState.cvOverrides.get(toNode.id) ?? {};
          overrides[edge.targetParam] = value;
          simState.cvOverrides.set(toNode.id, overrides);
        } else {
          // Process arrival at destination node
          processArrival(p, toNode, nodes, edges, currentTime, beatDuration, events, simPackets, heldPackets, musicalContext, simState);
        }
        simPackets.splice(i, 1);
      }
    }
  }
  
  return events.sort((a, b) => a.time - b.time);
}

function processArrival(
  packet: SimPacket,
  node: GraphNode,
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  currentTime: number,
  beatDuration: number,
  events: AudioEvent[],
  simPackets: SimPacket[],
  heldPackets: Map<NodeId, Array<{ payload: SimPacket['payload']; releaseTime: number }>>,
  musicalContext: MusicalContext,
  simState: SimModState
): void {
  let payload = { ...packet.payload };

  // Static props overlaid with packet-CV writes and current LFO modulation -
  // in the live engine both write directly into node.props
  const effectiveProps = getEffectiveProps(node, simState, currentTime);

  switch (node.type) {
    case 'speaker': {
      const props = effectiveProps as PropsForNodeType<'speaker'>;
      const volume = props.volume ?? 1.0;
      const pan = props.pan ?? 0;
      // Live engine defaults reverb to 0.3 (tick/packets.ts playNote options)
      const reverb = props.reverb ?? 0.3;

      events.push({
        time: currentTime,
        freq: payload.freq,
        midiNote: payload.midiNote,
        wave: payload.wave,
        gain: payload.gain * volume,
        timbre: payload.timbre,
        cutoff: payload.cutoff,
        filterType: payload.filterType,
        filterResonance: payload.filterResonance,
        // Speaker hold/release override the payload's (tick/packets.ts)
        holdTime: props.holdTime ?? payload.holdTime,
        releaseTime: props.releaseTime ?? payload.releaseTime,
        pan,
        reverb,
        waves: payload.waves,
        vibratoRate: payload.vibratoRate,
        vibratoDepth: payload.vibratoDepth,
        vibratoDelay: payload.vibratoDelay,
        filterEnv: payload.filterEnv,
      });
      // Live engine still propagates the (unchanged) payload past a speaker
      // if it has outgoing edges (tick/packets.ts falls through to propagation)
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }

    case 'pitch': {
      const props = effectiveProps as PropsForNodeType<'pitch'>;
      // Live engine: mode defaults to 'shift'; 'set' jumps to fixedMidiNote
      const newMidi = (props.mode ?? 'shift') === 'set'
        ? clampMidi(props.fixedMidiNote ?? 60)
        : clampMidi(payload.midiNote + (props.shift ?? 0));
      payload.midiNote = newMidi;
      payload.freq = midiToFreq(newMidi);
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'oscillator': {
      const props = effectiveProps as PropsForNodeType<'oscillator'>;
      const wave = props.wave ?? 'sawtooth';
      const attack = props.attack ?? 0.01;
      const decay = props.decay ?? 0.4;
      const mix = props.mix ?? 1.0;
      const ratio = props.ratio ?? 1;
      const mode = props.mode ?? 'additive';
      const modulationIndex = props.modulationIndex ?? 2;
      const feedback = props.feedback ?? 0;
      const unison = props.unison ?? 1;
      const detune = props.detune ?? 0;
      const stereoSpread = props.stereoSpread ?? 0.5;
      
      // Add wave layer
      const existingWaves = payload.waves ?? [];
      payload.wave = wave;
      payload.timbre = 0.8;
      payload.waves = [...existingWaves, {
        wave,
        attack,
        decay,
        gain: mix,
        ratio,
        mode,
        modulationIndex,
        feedback,
        unison,
        detune,
        stereoSpread,
      }];
      
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'modulator': {
      const props = effectiveProps as PropsForNodeType<'modulator'>;
      payload.vibratoRate = props.rate ?? 5;
      payload.vibratoDepth = props.depth ?? 20;
      payload.vibratoDelay = props.delay ?? 0.2;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'filter': {
      const props = effectiveProps as PropsForNodeType<'filter'>;
      payload.cutoff = (props.cutoff ?? 20000) as Frequency;
      payload.filterType = props.type ?? 'lowpass';
      payload.filterResonance = props.resonance ?? 0;
      const mod = props.mod ?? 0;
      // Live engine replaces filterEnv unconditionally (clears it when mod = 0)
      payload.filterEnv = mod !== 0
        ? { attack: props.attack ?? 0, decay: props.decay ?? 0, mod }
        : undefined;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'gate': {
      const props = effectiveProps as PropsForNodeType<'gate'>;
      // Single authority for the roll (mirrors processGate in engine.ts: one
      // probability roll / fitness evaluation; live marks blocked packets with
      // gain: -1 and the pipeline drops them - the sim just drops them here)
      if (gateSurvives(payload, props, musicalContext, simState.gateDensity, node.id, currentTime, beatDuration)) {
        forwardPacket(node.id, payload, edges, simPackets, currentTime);
      }
      break;
    }
    
    case 'delay': {
      const props = effectiveProps as PropsForNodeType<'delay'>;
      const delayBeats = props.delayTime ?? 1;
      const delaySeconds = delayBeats * beatDuration;
      
      if (!heldPackets.has(node.id)) {
        heldPackets.set(node.id, []);
      }
      heldPackets.get(node.id)!.push({
        payload,
        releaseTime: currentTime + delaySeconds,
      });
      break;
    }
    
    case 'gain': {
      const props = effectiveProps as PropsForNodeType<'gain'>;
      const gainMult = props.value ?? 1.0;
      payload.gain *= gainMult;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }

    case 'quantizer': {
      const props = effectiveProps as PropsForNodeType<'quantizer'>;
      applyQuantizer(payload, props, musicalContext);
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'tunnel': {
      const props = effectiveProps as PropsForNodeType<'tunnel'>;
      const subNodes = props.subNodes ?? [];

      const currentPayload = { ...payload };
      // A speaker sub-node stops further sub-processing, but the packet still
      // leaves the tunnel in the live engine (processTunnel returns early and
      // packets.ts propagates normally)
      let speakerTerminus = false;

      for (const subNode of subNodes) {
        // Process each sub-node (subNode.props is Record<string, unknown>)
        switch (subNode.type) {
          case 'speaker': {
            // Speaker inside tunnel - emit event
            const subProps = subNode.props as Partial<SpeakerProps>;
            const volume = subProps.volume ?? 1.0;
            const pan = subProps.pan ?? 0;
            // Live engine defaults tunnel speaker reverb to 0.3 (tick/packets.ts)
            const reverb = subProps.reverb ?? 0.3;

            events.push({
              time: currentTime,
              freq: currentPayload.freq,
              midiNote: currentPayload.midiNote,
              wave: currentPayload.wave,
              gain: currentPayload.gain * volume,
              timbre: currentPayload.timbre,
              cutoff: currentPayload.cutoff,
              filterType: currentPayload.filterType,
              filterResonance: currentPayload.filterResonance,
              holdTime: currentPayload.holdTime,
              releaseTime: currentPayload.releaseTime,
              pan,
              reverb,
              waves: currentPayload.waves,
              vibratoRate: currentPayload.vibratoRate,
              vibratoDepth: currentPayload.vibratoDepth,
              vibratoDelay: currentPayload.vibratoDelay,
              filterEnv: currentPayload.filterEnv,
            });
            speakerTerminus = true;
            break;
          }
          
          case 'pitch': {
            // `semitones` is a legacy alias for `shift`
            const subProps = subNode.props as Partial<PitchProps> & { semitones?: number };
            let newMidi: MidiNote;
            if ((subProps.mode ?? 'shift') === 'set') {
              newMidi = clampMidi(subProps.fixedMidiNote ?? 60);
            } else {
              const semitones = subProps.semitones ?? subProps.shift ?? 0;
              newMidi = clampMidi(currentPayload.midiNote + semitones);
            }
            currentPayload.midiNote = newMidi;
            currentPayload.freq = midiToFreq(newMidi);
            break;
          }

          case 'oscillator': {
            const subProps = subNode.props as Partial<OscillatorProps>;
            const attack = subProps.attack ?? 0.01;
            const decay = subProps.decay ?? 0.4;
            const mix = subProps.mix ?? 1.0;
            const ratio = subProps.ratio ?? 1;
            const mode = subProps.mode ?? 'additive';
            const modulationIndex = subProps.modulationIndex ?? 2;
            const feedback = subProps.feedback ?? 0;
            const unison = subProps.unison ?? 1;
            const detune = subProps.detune ?? 0;
            const stereoSpread = subProps.stereoSpread ?? 0.5;
            const existingWaves = currentPayload.waves ?? [];
            currentPayload.wave = subProps.wave ?? 'sawtooth';
            currentPayload.timbre = 0.8;
            currentPayload.waves = [...existingWaves, {
              wave: subProps.wave ?? 'sawtooth',
              attack,
              decay,
              gain: mix,
              ratio,
              mode,
              modulationIndex,
              feedback,
              unison,
              detune,
              stereoSpread,
            }];
            break;
          }
          
          case 'modulator': {
            const subProps = subNode.props as Partial<ModulatorProps>;
            currentPayload.vibratoRate = subProps.rate ?? 5;
            currentPayload.vibratoDepth = subProps.depth ?? 20;
            currentPayload.vibratoDelay = subProps.delay ?? 0.2;
            break;
          }
          
          case 'filter': {
            const subProps = subNode.props as Partial<FilterProps>;
            currentPayload.cutoff = (subProps.cutoff ?? 20000) as Frequency;
            currentPayload.filterType = subProps.type ?? 'lowpass';
            currentPayload.filterResonance = subProps.resonance ?? 0;
            const mod = subProps.mod ?? 0;
            // Live engine replaces filterEnv unconditionally (clears when mod = 0)
            currentPayload.filterEnv = mod !== 0
              ? { attack: subProps.attack ?? 0, decay: subProps.decay ?? 0, mod }
              : undefined;
            break;
          }

          case 'gain': {
            const subProps = subNode.props as Partial<GainProps>;
            currentPayload.gain *= subProps.value ?? 1.0;
            break;
          }

          case 'gate': {
            const subProps = subNode.props as Partial<GateProps>;
            // Live routes tunnel sub-gates through processGate too (all modes,
            // single roll). Density counters never persist for tunnel sub-gates
            // in the live engine (it rolls on a copied node), so pass a null
            // key to use an ephemeral per-packet count.
            if (!gateSurvives(currentPayload, subProps, musicalContext, simState.gateDensity, null, currentTime, beatDuration)) {
              return; // Gate blocked
            }
            break;
          }

          case 'quantizer': {
            const subProps = subNode.props as Partial<QuantizerProps>;
            applyQuantizer(currentPayload, subProps, musicalContext);
            break;
          }

          case 'lfo': {
            // Live processLFO stamps the current LFO value on the payload
            const subProps = subNode.props as Partial<LfoProps>;
            currentPayload.modulationValue = computeLfoValue(subProps, currentTime, true);
            break;
          }
        }

        if (speakerTerminus) break;
      }

      // Forward processed payload
      payload = currentPayload;
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'teleporter': {
      const props = effectiveProps as PropsForNodeType<'teleporter'>;
      const channel = props.channel;
      const isEntry = props.isEntry ?? true;
      
      if (isEntry) {
        // Find exit teleporters
        for (const n of nodes.values()) {
          if (n.type === 'teleporter' && n.id !== node.id) {
            const nProps = n.props as PropsForNodeType<'teleporter'>;
            if (nProps.channel === channel && !nProps.isEntry) {
              forwardPacket(n.id, payload, edges, simPackets, currentTime);
            }
          }
        }
      }
      break;
    }
    
    case 'mutator': {
      const props = effectiveProps as PropsForNodeType<'mutator'>;
      const probability = props.probability ?? 0.5;
      const mode = props.mode ?? 'drift';
      const targets = props.targets ?? ['pitch'];

      // Check probability
      if (Math.random() > probability) {
        forwardPacket(node.id, payload, edges, simPackets, currentTime);
        break;
      }

      if (mode === 'drift') {
        if (targets.includes('pitch')) {
          const drift = (Math.random() - 0.5) * 2 * (props.pitchDrift ?? 2);
          const newMidi = Math.max(0, Math.min(127, Math.round(payload.midiNote + drift)));
          payload.midiNote = newMidi as MidiNote;
          payload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
        }
        if (targets.includes('gain')) {
          const drift = (Math.random() - 0.5) * 2 * (props.gainDrift ?? 0.1);
          payload.gain = Math.max(0, Math.min(1, payload.gain + drift));
        }
        if (targets.includes('cutoff')) {
          const ratio = 1 + (Math.random() - 0.5) * 2 * (props.cutoffDrift ?? 0.2);
          payload.cutoff = Math.max(20, Math.min(20000, payload.cutoff * ratio)) as Frequency;
        }
        if (targets.includes('timbre')) {
          const drift = (Math.random() - 0.5) * 0.2;
          payload.timbre = Math.max(0, Math.min(1, payload.timbre + drift));
        }
      } else {
        // Radiation mode
        if (targets.includes('pitch')) {
          const jump = (Math.random() - 0.5) * 2 * (props.pitchRadiation ?? 12);
          const newMidi = Math.max(0, Math.min(127, Math.round(payload.midiNote + jump)));
          payload.midiNote = newMidi as MidiNote;
          payload.freq = (440 * Math.pow(2, (newMidi - 69) / 12)) as Frequency;
        }
        if (targets.includes('gain')) {
          payload.gain = Math.random();
        }
        if (targets.includes('cutoff')) {
          payload.cutoff = (200 + Math.random() * 19800) as Frequency;
        }
        if (targets.includes('wave') && props.waveChange) {
          const waveTypes: WaveOrNoiseType[] = ['sine', 'square', 'sawtooth', 'triangle'];
          const randomWave = waveTypes[Math.floor(Math.random() * waveTypes.length)];
          if (randomWave) {
            payload.wave = randomWave;
          }
        }
        if (targets.includes('timbre')) {
          payload.timbre = Math.random();
        }
      }

      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }
    
    case 'crossover': {
      // Crossover waits for two parents (first parent held until timeout)
      const props = effectiveProps as PropsForNodeType<'crossover'>;
      const held = heldPackets.get(node.id) || [];

      if (held.length === 0) {
        // First parent - hold it
        const timeout = (props.timeout ?? 2) * beatDuration;
        heldPackets.set(node.id, [{ payload, releaseTime: currentTime + timeout }]);
      } else {
        const firstHeld = held[0]!;

        if (currentTime >= firstHeld.releaseTime) {
          // First parent timed out - discard it and pass the new packet
          // through unchanged (matches tick/packets.ts)
          heldPackets.set(node.id, []);
          forwardPacket(node.id, payload, edges, simPackets, currentTime);
          break;
        }

        // Second parent - perform crossover with the live engine's genetics
        const offspring = performCrossover(
          firstHeld.payload as unknown as AudioPayload,
          payload as unknown as AudioPayload,
          props
        );
        const offspringPayload: SimPacket['payload'] = {
          ...payload,
          ...offspring,
          vibratoRate: offspring.vibratoRate,
          filterType: offspring.filterType ?? payload.filterType,
          filterResonance: offspring.filterResonance ?? payload.filterResonance,
          waves: offspring.waves ? [...offspring.waves] : undefined,
        };

        // Clear held and forward offspring
        heldPackets.set(node.id, []);
        forwardPacket(node.id, offspringPayload, edges, simPackets, currentTime);
      }
      break;
    }
    
    case 'lfo': {
      // Continuous modulation is handled via getEffectiveProps; packets that
      // physically pass through an LFO node get stamped with the current LFO
      // value and keep going (engine.ts processLFO + normal propagation)
      const props = effectiveProps as PropsForNodeType<'lfo'>;
      payload.modulationValue = computeLfoValue(props, currentTime, true);
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
    }

    case 'scene_trigger':
      // Scene triggers are not relevant during offline export
      // Just pass through
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;

    case 'splitter': {
      const props = effectiveProps as PropsForNodeType<'splitter'>;
      const behavior = props.behavior ?? 'broadcast';
      const outgoing = Array.from(edges.values()).filter(e => e.from === node.id);
      let targetEdges = outgoing;

      if (behavior === 'random' && outgoing.length > 0) {
        // Pick one random edge (tick/packets.ts)
        const selected = outgoing[Math.floor(Math.random() * outgoing.length)];
        if (selected) {
          targetEdges = [selected];
        }
      } else if (behavior === 'weighted' && outgoing.length > 0) {
        // Pick one edge based on weights (edge.weight ?? 1, tick/packets.ts)
        let totalWeight = 0;
        for (const e of outgoing) {
          totalWeight += (e.weight ?? 1);
        }

        let r = Math.random() * totalWeight;
        let selected = outgoing[0];

        for (const e of outgoing) {
          r -= (e.weight ?? 1);
          if (r <= 0) {
            selected = e;
            break;
          }
        }

        if (selected) {
          targetEdges = [selected];
        }
      }
      // 'broadcast' is default (all edges)

      spawnOnEdges(targetEdges, payload, simPackets, currentTime);
      break;
    }

    default:
      forwardPacket(node.id, payload, edges, simPackets, currentTime);
      break;
  }
}

function forwardPacket(
  nodeId: NodeId,
  payload: SimPacket['payload'],
  edges: Map<EdgeId, GraphEdge>,
  simPackets: SimPacket[],
  currentTime: number
): void {
  const outgoing = Array.from(edges.values()).filter(e => e.from === nodeId);
  spawnOnEdges(outgoing, payload, simPackets, currentTime);
}

function spawnOnEdges(
  targetEdges: GraphEdge[],
  payload: SimPacket['payload'],
  simPackets: SimPacket[],
  currentTime: number
): void {
  for (const edge of targetEdges) {
    simPackets.push({
      id: crypto.randomUUID(),
      edgeId: edge.id,
      t: 0,
      spawnTime: currentTime,
      payload: { ...payload },
    });
  }
}

/**
 * Effective props for a node at the current sim time: static props overlaid
 * with packet-CV writes and the current value of any LFOs modulating the node.
 * Mirrors the live engine, where tick/lfo.ts and tick/packets.ts write these
 * values directly into node.props.
 */
function getEffectiveProps(
  node: GraphNode,
  simState: SimModState,
  currentTime: number
): GraphNode['props'] {
  const overrides = simState.cvOverrides.get(node.id);
  const lfoMods = simState.lfoTargets.get(node.id);
  if (!overrides && !lfoMods) return node.props;

  const merged: Record<string, unknown> = { ...node.props, ...(overrides ?? {}) };

  if (lfoMods) {
    for (const mod of lfoMods) {
      // The LFO's own props may have been retuned by packet CV
      const lfoOverrides = simState.cvOverrides.get(mod.lfoNode.id);
      const lfoProps = (lfoOverrides
        ? { ...mod.lfoNode.props, ...lfoOverrides }
        : mod.lfoNode.props) as Partial<LfoProps>;
      merged[mod.param] = computeLfoValue(lfoProps, currentTime, false);
    }
  }

  return merged as unknown as GraphNode['props'];
}

/**
 * LFO waveform math, with t = simTimeSeconds * rate + phase.
 * Matches tick/lfo.ts (continuous modulation - only the four deterministic
 * shapes; 'random'/'noise' fall back to 0.5 there) and engine.ts processLFO
 * (packet stamping - all six shapes), selected via allowStochastic.
 */
function computeLfoValue(
  props: Partial<LfoProps>,
  timeSeconds: number,
  allowStochastic: boolean
): number {
  const rate = props.rate ?? 1;
  const shape = props.shape ?? 'sine';
  const min = props.min ?? 0;
  const max = props.max ?? 1;
  const phase = props.phase ?? 0;

  const t = timeSeconds * rate + phase;

  let value: number;
  switch (shape) {
    case 'sine':
      value = (Math.sin(t * Math.PI * 2) + 1) / 2;
      break;
    case 'triangle':
      value = 1 - Math.abs((t % 1) * 2 - 1);
      break;
    case 'square':
      value = (t % 1) < 0.5 ? 1 : 0;
      break;
    case 'sawtooth':
      value = t % 1;
      break;
    case 'random':
      // Sample & hold: stable pseudo-random value per cycle (engine.ts)
      value = allowStochastic
        ? Math.abs(Math.sin(Math.floor(t) * 12.9898 + 78.233) * 43758.5453) % 1
        : 0.5;
      break;
    case 'noise':
      value = allowStochastic ? Math.random() : 0.5;
      break;
    default:
      value = 0.5;
  }

  return min + value * (max - min);
}

/**
 * Resolve scale/root for key-aware nodes (gate/quantizer), matching the live
 * engine: useGlobalKey resolves to the effective scene key (the compiler
 * receives it as musicalContext - compileArrangement already folds in the
 * scene's local scale/root), otherwise the node's own scale/root props.
 * Returns an undefined scale for invalid props (live passes through then).
 */
function resolveNodeKey(
  props: { useGlobalKey?: boolean; scale?: ScaleName; root?: number },
  musicalContext: MusicalContext
): { root: number; scale: ScaleIntervals | undefined } {
  if (props.useGlobalKey) {
    return { root: musicalContext.root, scale: musicalContext.scale };
  }
  return {
    root: props.root ?? musicalContext.root,
    scale: props.scale ? SCALES[props.scale] : undefined,
  };
}

/**
 * Gate logic ported from processGate (engine.ts) - the single authority for
 * the probability roll and the harmonic/energy/density fitness modes. Returns
 * false when the packet is blocked (live marks it with gain: -1 and the
 * pipeline drops it; the sim simply does not forward it).
 * densityKey null = ephemeral count (tunnel sub-gates, where live operates on
 * a copied node so the counter never persists).
 */
function gateSurvives(
  payload: SimPacket['payload'],
  props: Partial<GateProps>,
  musicalContext: MusicalContext,
  gateDensity: Map<NodeId, { windowStart: number; count: number }>,
  densityKey: NodeId | null,
  currentTime: number,
  beatDuration: number
): boolean {
  const mode = props.mode ?? 'probability';

  // Probability mode - simple random gate (single roll)
  if (mode === 'probability') {
    return Math.random() < (props.probability ?? 1.0);
  }

  // Fitness modes - criteria-based selection
  const { root, scale } = resolveNodeKey(props, musicalContext);
  if (!scale) return true;

  let survives = true;

  // Harmonic fitness (is the note consonant with the scale?)
  if (mode === 'harmonic' || mode === 'all') {
    const threshold = props.harmonicThreshold ?? 0.5;
    const chroma = payload.midiNote % 12;
    const relativeToRoot = (chroma - root + 12) % 12;
    const inScale = scale.includes(relativeToRoot);

    if (!inScale) {
      let minDist = 12;
      for (const interval of scale) {
        const scaleChroma = (root + interval) % 12;
        const d = Math.min(Math.abs(chroma - scaleChroma), 12 - Math.abs(chroma - scaleChroma));
        minDist = Math.min(minDist, d);
      }
      const consonance = 1 - (minDist / 6);
      if (consonance < threshold) survives = false;
    }
  }

  // Energy fitness (is the packet loud enough?)
  if (survives && (mode === 'energy' || mode === 'all')) {
    if (payload.gain < (props.energyThreshold ?? 0.1)) survives = false;
  }

  // Density fitness (packets per beat window, sim-time windows)
  if (survives && (mode === 'density' || mode === 'all')) {
    const threshold = props.densityThreshold ?? 8;
    let count = 1;
    if (densityKey !== null) {
      let counter = gateDensity.get(densityKey);
      if (!counter || currentTime - counter.windowStart > beatDuration) {
        counter = { windowStart: currentTime, count: 0 };
        gateDensity.set(densityKey, counter);
      }
      counter.count += 1;
      count = counter.count;
    }
    if (count > threshold) survives = false;
  }

  return survives;
}

/**
 * Quantizer ported from processQuantizer (engine.ts): strength roll, nearest
 * or weighted-random mode, defaultPitch = target octave in random mode.
 * Mutates the payload's pitch in place.
 */
function applyQuantizer(
  payload: SimPacket['payload'],
  props: Partial<QuantizerProps>,
  musicalContext: MusicalContext
): void {
  // Strength roll - failing it passes the note through unquantized
  if (Math.random() > (props.strength ?? 1)) return;

  const { root, scale } = resolveNodeKey(props, musicalContext);

  // Safety check: if scale is undefined (e.g. invalid prop), pass through
  if (!scale) return;

  let quantized: number;

  if ((props.mode ?? 'nearest') === 'random') {
    // Weighted random scale-degree selection
    const weights = props.weights ?? {};
    const indices = Object.keys(weights).map(Number);

    let selectedIndex = 0;

    // Filter indices to only those valid for the current scale
    const validIndices = indices.filter(i => i < scale.length);

    if (validIndices.length === 0) {
      // Uniform random if no weights
      selectedIndex = Math.floor(Math.random() * scale.length);
    } else {
      let totalWeight = 0;
      for (const i of validIndices) {
        totalWeight += (weights[i] || 0);
      }

      if (totalWeight <= 0) {
        const idx = Math.floor(Math.random() * validIndices.length);
        selectedIndex = validIndices[idx] ?? 0;
      } else {
        let r = Math.random() * totalWeight;
        for (const i of validIndices) {
          r -= (weights[i] || 0);
          if (r <= 0) {
            selectedIndex = i;
            break;
          }
        }
      }
    }

    const interval = scale[selectedIndex] ?? 0;
    const chroma = (root + interval) % 12;
    const octave = props.defaultPitch ?? 4;  // defaultPitch is the octave
    quantized = octave * 12 + chroma;
  } else {
    // Nearest scale degree
    const midiNote = payload.midiNote;
    const chroma = midiNote % 12;
    const octave = Math.floor(midiNote / 12);

    let minDist = 12;
    let nearestChroma = chroma;

    for (const interval of scale) {
      const scaleChroma = (root + interval) % 12;
      const d = Math.min(Math.abs(chroma - scaleChroma), 12 - Math.abs(chroma - scaleChroma));
      if (d < minDist) {
        minDist = d;
        nearestChroma = scaleChroma;
      }
    }

    quantized = octave * 12 + nearestChroma;
    if (nearestChroma > chroma + 6) quantized -= 12;
    else if (nearestChroma < chroma - 6) quantized += 12;
  }

  const newMidi = clampMidi(quantized);
  payload.midiNote = newMidi;
  payload.freq = midiToFreq(newMidi);
}

// Import Scene and ArrangementSlot types for arrangement compilation
import type { Scene, ArrangementSlot, SceneId, ScaleName, ScaleIntervals, AudioPayload } from '@core/types';
import { SCALES, midiToFreq, clampMidi } from '@core/constants';
import { performCrossover } from '@core/tick/crossover';

/**
 * Compile an arrangement (multi-channel scenes) into timed audio events.
 * Scenes on different channels play simultaneously based on their startBeat positions.
 */
export function compileArrangement(
  scenes: Map<SceneId, Scene>,
  arrangement: ArrangementSlot[],
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  bpm: number = 120
): AudioEvent[] {
  const allEvents: AudioEvent[] = [];
  
  if (arrangement.length === 0) {
    return allEvents;
  }
  
  const beatDuration = 60 / bpm;
  
  // Process each slot independently - slots can overlap on different channels
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) {
      continue;
    }
    
    // Get loop count (slot override or scene default)
    const loopCount = slot.instanceLoopCount ?? scene.loopCount ?? 1;
    
    // Convert scene nodes/edges arrays to Maps for compileGraph
    const nodesMap = new Map<NodeId, GraphNode>();
    const edgesMap = new Map<EdgeId, GraphEdge>();
    
    for (const node of scene.nodes) {
      nodesMap.set(node.id, node);
    }
    for (const edge of scene.edges) {
      edgesMap.set(edge.id, edge);
    }
    
    // Calculate scene timing
    const sceneBpm = slot.instanceBpm ?? scene.localBpm ?? bpm;
    const sceneBeatDuration = 60 / sceneBpm;
    const sceneDurationBeats = scene.durationBeats * loopCount;
    const sceneDurationSeconds = sceneDurationBeats * sceneBeatDuration;
    
    // Calculate the time offset for this slot based on its startBeat
    const slotStartTime = slot.startBeat * beatDuration;
    
    // Use scene's local musical context if available
    const sceneScale = scene.localScale !== null 
      ? SCALES[scene.localScale as ScaleName] 
      : musicalContext.scale;
    
    const sceneMusicalContext: MusicalContext = {
      ...musicalContext,
      ...(scene.localRoot !== null && { root: scene.localRoot }),
      scale: sceneScale,
      ...(scene.localScale !== null && { scaleName: scene.localScale as ScaleName }),
    };
    
    // Compile this scene (pass scene's BPM)
    const sceneEvents = compileGraph(
      nodesMap,
      edgesMap,
      sceneDurationSeconds,
      sceneMusicalContext,
      globalSettings,
      sceneBpm
    );
    
    // Add time offset based on slot's startBeat position (not sequential)
    for (const event of sceneEvents) {
      allEvents.push({
        ...event,
        time: event.time + slotStartTime,
      });
    }
  }
  
  return allEvents.sort((a, b) => a.time - b.time);
}

/**
 * Calculate total duration of an arrangement in seconds.
 * With multi-channel support, duration is the maximum end time across all slots.
 */
export function calculateArrangementDuration(
  scenes: Map<SceneId, Scene>,
  arrangement: ArrangementSlot[],
  bpm: number = 120
): number {
  if (arrangement.length === 0) return 0;
  
  const beatDuration = 60 / bpm;
  let maxEndTime = 0;
  
  for (const slot of arrangement) {
    const scene = scenes.get(slot.sceneId);
    if (!scene) continue;
    
    const loopCount = slot.instanceLoopCount ?? scene.loopCount ?? 1;
    const sceneBpm = slot.instanceBpm ?? scene.localBpm ?? bpm;
    const sceneBeatDuration = 60 / sceneBpm;
    const sceneDurationBeats = scene.durationBeats * loopCount;
    const sceneDurationSeconds = sceneDurationBeats * sceneBeatDuration;
    
    // Calculate when this slot ends (startBeat position + scene duration)
    const slotStartTime = slot.startBeat * beatDuration;
    const slotEndTime = slotStartTime + sceneDurationSeconds;
    
    maxEndTime = Math.max(maxEndTime, slotEndTime);
  }
  
  return maxEndTime;
}
