// Phonon v2 - File I/O for Save/Load

import type { 
  GraphNode,
  GraphEdge,
  NodeId,
  EdgeId,
  MusicalContext, 
  GlobalSettings,
  ProjectMeta 
} from '@core/types';

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
  globalSettings: { gravityConstant: number };
  projectMeta: { name: string; author: string; created: number; modified: number };
} {
  return {
    nodes: data.graph.nodes.map(n => ({
      id: n.id as NodeId,
      type: n.type as GraphNode['type'],
      x: n.x,
      y: n.y,
      props: n.props as any,
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
  globalSettings: { gravityConstant: number };
  projectMeta: { name: string; author: string; created: number; modified: number };
}> {
  const text = await file.text();
  const data = JSON.parse(text) as SerializedGraph;
  return deserializeGraph(data);
}
