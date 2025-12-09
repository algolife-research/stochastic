// Tick System Types

import type { SceneId, NodeId, EdgeId, PacketId, GraphNode, GraphEdge, Packet } from '../types';

/** State for a scene playing on a channel (not on canvas) */
export interface ChannelSceneState {
  sceneId: SceneId;
  channelIndex: number;
  nodes: Map<NodeId, GraphNode>;
  edges: Map<EdgeId, GraphEdge>;
  packets: Map<PacketId, Packet>;
  localBeat: number;
}

/** Track which scenes are currently active per channel */
export interface ActiveSlot {
  slotId: string;
  sceneId: SceneId;
  channelIndex: number;
  startBeat: number;
  endBeat: number;
  localBeat: number;  // Beat within this slot
  loops: number;
}
