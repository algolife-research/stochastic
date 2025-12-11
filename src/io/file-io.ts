// Phonon v2/v3 - File I/O for Save/Load

import type { 
  GraphNode,
  GraphEdge,
  NodeId,
  EdgeId,
  SceneId,
  MusicalContext, 
  GlobalSettings,
  ProjectMeta,
  Scene,
  ArrangementSlot,
  ArrangementChannel,
  ScaleName,
  AnnotationId,
  RegionId,
  VizMode,
  VizConfig,
  VizTransition
} from '@core/types';

// ============================================================================
// V2 FORMAT (Legacy - single graph)
// ============================================================================

export interface SerializedGraph {
  meta: {
    version: string;
    created: number;
    modified: number;
    name: string;
    author: string;
  };
  global: {
    rootNote: number;
    scaleName: string;
    gravity: number;
    defaultEdgeBehaviour?: 'physical' | 'fixed';
  };
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      x: number;
      y: number;
      props: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      from: string;
      to: string;
      timingMode: 'physical' | 'fixed';
      durationBeats: number | null;
      targetParam: string | null;
    }>;
  };
}

// ============================================================================
// V3 FORMAT (Scene System)
// ============================================================================

export interface SerializedScene {
  id: string;
  name: string;
  color: string;
  durationBeats: number;
  loopCount: number;
  localBpm: number | null;
  localRoot: number | null;
  localScale: string | null;
  enterTransition: { type: string; durationBeats: number };
  exitTransition: { type: string; durationBeats: number };
  jamTrigger: {
    midiNote: number | null;
    midiChannel: number;
    quantize: string;
    phraseLength: number;
  };
  nodes: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    props: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    timingMode: 'physical' | 'fixed';
    durationBeats: number | null;
    targetParam: string | null;
  }>;
  annotations?: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
  }>;
  regions?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    description: string;
    color: string;
  }>;
  // Viz properties (optional for backward compatibility)
  vizMode?: string;
  vizConfig?: unknown;
  vizTransition?: { type: string; durationBeats: number };
}

export interface SerializedArrangementSlot {
  id: string;
  sceneId: string;
  startBeat: number;
  channel: number;
  instanceLoopCount?: number;
  instanceBpm?: number;
}

export interface SerializedArrangementChannel {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
}

export interface SerializedComposition {
  meta: {
    version: string;
    created: number;
    modified: number;
    name: string;
    author: string;
  };
  global: {
    rootNote: number;
    scaleName: string;
    gravity: number;
    defaultEdgeBehaviour: 'physical' | 'fixed';
    masterBpm: number;
  };
  scenes: SerializedScene[];
  arrangement: SerializedArrangementSlot[];
  channels?: SerializedArrangementChannel[];  // Optional for backward compatibility
}

// ============================================================================
// VERSION DETECTION
// ============================================================================

export function detectFileVersion(data: unknown): '2.0' | '3.0' {
  const obj = data as Record<string, unknown>;
  if (obj.scenes && Array.isArray(obj.scenes)) {
    return '3.0';
  }
  return '2.0';
}

// ============================================================================
// V2 SERIALIZATION (Legacy)
// ============================================================================

export function serializeGraph(
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  projectMeta: ProjectMeta
): SerializedGraph {
  return {
    meta: {
      version: projectMeta.version,
      created: projectMeta.created,
      modified: Date.now(),
      name: projectMeta.name,
      author: projectMeta.author,
    },
    global: {
      rootNote: musicalContext.root,
      scaleName: musicalContext.scaleName,
      gravity: globalSettings.gravityConstant,
      defaultEdgeBehaviour: globalSettings.defaultEdgeBehaviour,
    },
    graph: {
      nodes: Array.from(nodes.values()).map(node => ({
        id: node.id,
        type: node.type,
        x: node.x,
        y: node.y,
        props: node.props as unknown as Record<string, unknown>,
      })),
      edges: Array.from(edges.values()).map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        timingMode: edge.timingMode,
        durationBeats: edge.durationBeats,
        targetParam: edge.targetParam,
      })),
    },
  };
}

export function deserializeGraph(data: SerializedGraph): {
  nodes: Array<Omit<GraphNode, 'timer' | 'lastTrigger' | 'flash' | 'heldPackets'>>;
  edges: Array<GraphEdge>;
  musicalContext: { root: number; scaleName: string };
  globalSettings: { gravityConstant: number; defaultEdgeBehaviour: 'physical' | 'fixed' };
  projectMeta: { name: string; author: string; created: number; modified: number };
} {
  return {
    nodes: data.graph.nodes.map(n => ({
      id: n.id as NodeId,
      type: n.type as GraphNode['type'],
      x: n.x,
      y: n.y,
      props: n.props as unknown as GraphNode['props'],
    })),
    edges: data.graph.edges.map(e => ({
      id: e.id as EdgeId,
      from: e.from as NodeId,
      to: e.to as NodeId,
      timingMode: e.timingMode,
      durationBeats: e.durationBeats,
      targetParam: e.targetParam,
    })),
    musicalContext: {
      root: data.global.rootNote,
      scaleName: data.global.scaleName,
    },
    globalSettings: {
      gravityConstant: data.global.gravity,
      defaultEdgeBehaviour: data.global.defaultEdgeBehaviour ?? 'fixed',
    },
    projectMeta: {
      name: data.meta.name,
      author: data.meta.author,
      created: data.meta.created,
      modified: data.meta.modified,
    },
  };
}

export async function saveGraphToFile(
  filename: string,
  nodes: Map<NodeId, GraphNode>,
  edges: Map<EdgeId, GraphEdge>,
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  projectMeta: ProjectMeta
): Promise<void> {
  const data = serializeGraph(nodes, edges, musicalContext, globalSettings, projectMeta);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.phono') ? filename : `${filename}.phono`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export async function loadGraphFromFile(file: File): Promise<{
  nodes: Array<Omit<GraphNode, 'timer' | 'lastTrigger' | 'flash' | 'heldPackets'>>;
  edges: Array<GraphEdge>;
  musicalContext: { root: number; scaleName: string };
  globalSettings: { gravityConstant: number; defaultEdgeBehaviour: 'physical' | 'fixed' };
  projectMeta: { name: string; author: string; created: number; modified: number };
}> {
  const text = await file.text();
  const data = JSON.parse(text) as SerializedGraph;
  return deserializeGraph(data);
}

// ============================================================================
// V3 SERIALIZATION (Scene System)
// ============================================================================

export function serializeScene(scene: Scene): SerializedScene {
  return {
    id: scene.id,
    name: scene.name,
    color: scene.color,
    durationBeats: scene.durationBeats,
    loopCount: scene.loopCount,
    localBpm: scene.localBpm,
    localRoot: scene.localRoot,
    localScale: scene.localScale,
    enterTransition: {
      type: scene.enterTransition.type,
      durationBeats: scene.enterTransition.durationBeats,
    },
    exitTransition: {
      type: scene.exitTransition.type,
      durationBeats: scene.exitTransition.durationBeats,
    },
    jamTrigger: {
      midiNote: scene.jamTrigger.midiNote,
      midiChannel: scene.jamTrigger.midiChannel,
      quantize: scene.jamTrigger.quantize,
      phraseLength: scene.jamTrigger.phraseLength,
    },
    nodes: scene.nodes.map(node => ({
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      props: node.props as unknown as Record<string, unknown>,
    })),
    edges: scene.edges.map(edge => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      timingMode: edge.timingMode,
      durationBeats: edge.durationBeats,
      targetParam: edge.targetParam,
    })),
    annotations: scene.annotations?.map(a => ({
      id: a.id,
      x: a.x,
      y: a.y,
      text: a.text,
      fontSize: a.fontSize,
      color: a.color,
    })),
    regions: scene.regions?.map(r => ({
      id: r.id,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      name: r.name,
      description: r.description,
      color: r.color,
    })),
    // Viz properties
    vizMode: scene.vizMode,
    vizConfig: scene.vizConfig,
    vizTransition: scene.vizTransition,
  };
}

export function deserializeScene(data: SerializedScene): Scene {
  return {
    id: data.id as SceneId,
    name: data.name,
    color: data.color,
    durationBeats: data.durationBeats,
    loopCount: data.loopCount,
    localBpm: data.localBpm,
    localRoot: data.localRoot,
    localScale: data.localScale as ScaleName | null,
    enterTransition: {
      type: data.enterTransition.type as 'cut' | 'crossfade' | 'fade',
      durationBeats: data.enterTransition.durationBeats,
    },
    exitTransition: {
      type: data.exitTransition.type as 'cut' | 'crossfade' | 'fade',
      durationBeats: data.exitTransition.durationBeats,
    },
    jamTrigger: {
      midiNote: data.jamTrigger?.midiNote ?? null,
      midiChannel: data.jamTrigger?.midiChannel ?? 1,
      quantize: (data.jamTrigger?.quantize ?? 'bar') as 'immediate' | 'beat' | 'bar' | 'phrase',
      phraseLength: data.jamTrigger?.phraseLength ?? 4,
    },
    nodes: data.nodes.map(n => ({
      id: n.id as NodeId,
      type: n.type as GraphNode['type'],
      x: n.x,
      y: n.y,
      props: n.props as unknown as GraphNode['props'],
      timer: 0,
      lastTrigger: 0,
      flash: 0,
      heldPackets: [],
    })),
    edges: data.edges.map(e => ({
      id: e.id as EdgeId,
      from: e.from as NodeId,
      to: e.to as NodeId,
      timingMode: e.timingMode,
      durationBeats: e.durationBeats,
      targetParam: e.targetParam,
    })),
    annotations: data.annotations?.map(a => ({
      id: a.id as AnnotationId,
      x: a.x,
      y: a.y,
      text: a.text,
      fontSize: a.fontSize,
      color: a.color,
    })) ?? [],
    regions: data.regions?.map(r => ({
      id: r.id as RegionId,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      name: r.name,
      description: r.description,
      color: r.color,
    })) ?? [],
    // Viz properties with defaults for backward compatibility
    vizMode: (data.vizMode ?? 'editor') as VizMode,
    vizConfig: data.vizConfig as VizConfig | null ?? null,
    vizTransition: (data.vizTransition ?? { type: 'crossfade', durationBeats: 2 }) as VizTransition,
  };
}

export function serializeComposition(
  scenes: Map<SceneId, Scene>,
  arrangement: ArrangementSlot[],
  channels: ArrangementChannel[],
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  projectMeta: ProjectMeta,
  masterBpm: number
): SerializedComposition {
  return {
    meta: {
      version: '3.0.0',
      created: projectMeta.created,
      modified: Date.now(),
      name: projectMeta.name,
      author: projectMeta.author,
    },
    global: {
      rootNote: musicalContext.root,
      scaleName: musicalContext.scaleName,
      gravity: globalSettings.gravityConstant,
      defaultEdgeBehaviour: globalSettings.defaultEdgeBehaviour,
      masterBpm,
    },
    scenes: Array.from(scenes.values()).map(serializeScene),
    arrangement: arrangement.map(slot => ({
      id: slot.id,
      sceneId: slot.sceneId,
      startBeat: slot.startBeat,
      channel: slot.channel,
      instanceLoopCount: slot.instanceLoopCount,
      instanceBpm: slot.instanceBpm,
    })),
    channels: channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      color: ch.color,
      muted: ch.muted,
      solo: ch.solo,
      volume: ch.volume,
    })),
  };
}

export function deserializeComposition(data: SerializedComposition): {
  scenes: Scene[];
  arrangement: ArrangementSlot[];
  channels: ArrangementChannel[];
  musicalContext: { root: number; scaleName: string };
  globalSettings: { gravityConstant: number; defaultEdgeBehaviour: 'physical' | 'fixed' };
  projectMeta: { name: string; author: string; created: number; modified: number };
  masterBpm: number;
} {
  // Default channel if none saved (backward compatibility)
  const defaultChannel: ArrangementChannel = {
    id: 'channel-0',
    name: 'Track 1',
    color: '#4CAF50',
    muted: false,
    solo: false,
    volume: 1,
  };
  
  return {
    scenes: data.scenes.map(deserializeScene),
    arrangement: data.arrangement.map(slot => ({
      id: slot.id,
      sceneId: slot.sceneId as SceneId,
      startBeat: slot.startBeat,
      channel: slot.channel ?? 0,  // Default to channel 0 for backward compatibility
      instanceLoopCount: slot.instanceLoopCount,
      instanceBpm: slot.instanceBpm,
    })),
    channels: data.channels?.map(ch => ({
      id: ch.id,
      name: ch.name,
      color: ch.color,
      muted: ch.muted,
      solo: ch.solo,
      volume: ch.volume,
    })) ?? [defaultChannel],
    musicalContext: {
      root: data.global.rootNote,
      scaleName: data.global.scaleName,
    },
    globalSettings: {
      gravityConstant: data.global.gravity,
      defaultEdgeBehaviour: data.global.defaultEdgeBehaviour,
    },
    projectMeta: {
      name: data.meta.name,
      author: data.meta.author,
      created: data.meta.created,
      modified: data.meta.modified,
    },
    masterBpm: data.global.masterBpm,
  };
}

/**
 * Migrate V2 format to V3 (single graph -> single scene)
 */
export function migrateV2ToV3(v2Data: SerializedGraph): SerializedComposition {
  const mainSceneId = crypto.randomUUID();
  
  return {
    meta: {
      version: '3.0.0',
      created: v2Data.meta.created,
      modified: Date.now(),
      name: v2Data.meta.name,
      author: v2Data.meta.author,
    },
    global: {
      rootNote: v2Data.global.rootNote,
      scaleName: v2Data.global.scaleName,
      gravity: v2Data.global.gravity,
      defaultEdgeBehaviour: v2Data.global.defaultEdgeBehaviour ?? 'fixed',
      masterBpm: 120, // Default BPM for migrated files
    },
    scenes: [{
      id: mainSceneId,
      name: 'Main',
      color: '#4CAF50',
      durationBeats: 16,
      loopCount: 1,
      localBpm: null,
      localRoot: null,
      localScale: null,
      enterTransition: { type: 'cut', durationBeats: 0 },
      exitTransition: { type: 'cut', durationBeats: 0 },
      jamTrigger: {
        midiNote: null,
        midiChannel: 1,
        quantize: 'bar',
        phraseLength: 4,
      },
      nodes: v2Data.graph.nodes,
      edges: v2Data.graph.edges,
      annotations: [],
      regions: [],
    }],
    arrangement: [{
      id: crypto.randomUUID(),
      sceneId: mainSceneId,
      startBeat: 0,
      channel: 0,
    }],
    channels: [{
      id: 'channel-0',
      name: 'Track 1',
      color: '#4CAF50',
      muted: false,
      solo: false,
      volume: 1,
    }],
  };
}

export async function saveCompositionToFile(
  filename: string,
  scenes: Map<SceneId, Scene>,
  arrangement: ArrangementSlot[],
  channels: ArrangementChannel[],
  musicalContext: MusicalContext,
  globalSettings: GlobalSettings,
  projectMeta: ProjectMeta,
  masterBpm: number
): Promise<void> {
  const data = serializeComposition(scenes, arrangement, channels, musicalContext, globalSettings, projectMeta, masterBpm);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.phono') ? filename : `${filename}.phono`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export async function loadCompositionFromFile(file: File): Promise<{
  scenes: Scene[];
  arrangement: ArrangementSlot[];
  channels: ArrangementChannel[];
  musicalContext: { root: number; scaleName: string };
  globalSettings: { gravityConstant: number; defaultEdgeBehaviour: 'physical' | 'fixed' };
  projectMeta: { name: string; author: string; created: number; modified: number };
  masterBpm: number;
}> {
  const text = await file.text();
  const rawData = JSON.parse(text);
  
  // Detect version and migrate if needed
  const version = detectFileVersion(rawData);
  
  if (version === '2.0') {
    const v3Data = migrateV2ToV3(rawData as SerializedGraph);
    return deserializeComposition(v3Data);
  }
  
  return deserializeComposition(rawData as SerializedComposition);
}
