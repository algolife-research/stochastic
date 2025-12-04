// AIGA - Canvas Rendering

import * as state from '../core/state.js';
import { 
  NODE_RADIUS, HANDLE_OFFSET_X, HANDLE_RADIUS, 
  PIXELS_PER_STEP, GRID_SIZE, NOTE_NAMES 
} from '../core/constants.js';
import { dist } from '../core/utils.js';
import { getNodeColor, getNodeIcon } from '../graph/nodes.js';

/**
 * Main draw function
 */
export function draw() {
  const { ctx, canvas } = state;
  
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(state.panOffset.x, state.panOffset.y);
  ctx.scale(state.zoomLevel, state.zoomLevel);
  
  drawGrid();
  drawTeleporterLinks();
  drawEdges();
  drawLinkingLine();
  drawPackets();
  drawNodes();
  drawBoxSelection();
  drawTunnelLabels();
  
  ctx.restore();
}

/**
 * Draw the background grid
 */
function drawGrid() {
  const { ctx, canvas, panOffset, zoomLevel } = state;
  
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  
  const startX = -panOffset.x / zoomLevel % GRID_SIZE - GRID_SIZE;
  const startY = -panOffset.y / zoomLevel % GRID_SIZE - GRID_SIZE;
  const endX = (canvas.width - panOffset.x) / zoomLevel + GRID_SIZE;
  const endY = (canvas.height - panOffset.y) / zoomLevel + GRID_SIZE;
  
  for (let x = startX; x < endX; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

/**
 * Draw dashed lines connecting teleporters on the same channel
 */
function drawTeleporterLinks() {
  const { ctx, nodes, selectedNode, selectedNodes } = state;
  
  // Group teleporters by channel
  const teleporters = nodes.filter(n => n.type === 'teleporter');
  const channels = {};
  teleporters.forEach(tp => {
    const ch = tp.props.channel;
    if (!channels[ch]) channels[ch] = [];
    channels[ch].push(tp);
  });
  
  // Draw links for each channel with 2+ teleporters
  Object.entries(channels).forEach(([channel, tps]) => {
    if (tps.length < 2) return;
    
    // Check if any teleporter in this channel is selected
    const isActive = tps.some(tp => tp === selectedNode || selectedNodes.includes(tp));
    
    ctx.strokeStyle = isActive ? '#00e676' : 'rgba(0, 230, 118, 0.3)';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.setLineDash([8, 8]);
    
    // Connect all teleporters in channel (star pattern from first)
    const hub = tps[0];
    for (let i = 1; i < tps.length; i++) {
      const tp = tps[i];
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(tp.x, tp.y);
      ctx.stroke();
    }
    
    // Also connect consecutive pairs for visibility
    if (tps.length > 2) {
      for (let i = 1; i < tps.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(tps[i].x, tps[i].y);
        ctx.lineTo(tps[i + 1].x, tps[i + 1].y);
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);
  });
}

/**
 * Draw all edges
 */
function drawEdges() {
  const { ctx, nodes, edges, selectedEdge } = state;
  
  ctx.lineWidth = 3;
  
  edges.forEach(e => {
    const n1 = nodes.find(n => n.id === e.from);
    const n2 = nodes.find(n => n.id === e.to);
    if (!n1 || !n2) return;
    
    const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
    grad.addColorStop(0, '#333');
    grad.addColorStop(1, '#555');
    
    if (e === selectedEdge) {
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = grad;
      ctx.shadowBlur = 0;
    }
    
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Ticks
    const d = dist(n1, n2);
    const pixelsPerBeat = state.globalSettings.pixelsPerBeat;
    const steps = Math.max(1, Math.round(d / pixelsPerBeat));
    const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
    
    const subdivisions = state.globalSettings.subdivisions;
    const totalTicks = steps * subdivisions;

    for (let i = 1; i < totalTicks; i++) {
      const t = i / totalTicks;
      const tx = n1.x + (n2.x - n1.x) * t;
      const ty = n1.y + (n2.y - n1.y) * t;
      
      if (i % subdivisions === 0) {
        // Major Tick (Beat)
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Minor Tick (Subdivision) - Thin Bar
        const perpX = Math.cos(angle + Math.PI / 2);
        const perpY = Math.sin(angle + Math.PI / 2);
        const barLen = 8;
        
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx - perpX * barLen/2, ty - perpY * barLen/2);
        ctx.lineTo(tx + perpX * barLen/2, ty + perpY * barLen/2);
        ctx.stroke();
      }
    }
    
    // Arrow chevron (Centered)
    const arrowT = 0.5; // Center of edge
    const arrowX = n1.x + (n2.x - n1.x) * arrowT;
    const arrowY = n1.y + (n2.y - n1.y) * arrowT;
    // angle is already calculated
    const arrowLen = 10; // Larger
    const arrowAngle = 2.8; // Thinner angle
    
    ctx.strokeStyle = e === selectedEdge ? '#999' : '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arrowX + Math.cos(angle + arrowAngle) * arrowLen, arrowY + Math.sin(angle + arrowAngle) * arrowLen);
    ctx.lineTo(arrowX, arrowY);
    ctx.lineTo(arrowX + Math.cos(angle - arrowAngle) * arrowLen, arrowY + Math.sin(angle - arrowAngle) * arrowLen);
    ctx.stroke();
  });
}

/**
 * Draw the linking line when creating edges
 */
function drawLinkingLine() {
  const { ctx, linkingNode, mousePos } = state;
  
  if (linkingNode) {
    ctx.strokeStyle = '#bb86fc';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(linkingNode.x, linkingNode.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/**
 * Get particle color based on pitch (scaleIndex)
 * Maps 0-36 (C3-C6) to rainbow spectrum
 */
function getPitchColor(scaleIndex, alpha = 1) {
  // Map scaleIndex (0-36) to hue (0-300) - avoiding red-to-red wrap
  const hue = (scaleIndex / 36) * 300;
  return `hsla(${hue}, 85%, 60%, ${alpha})`;
}

/**
 * Draw all packets with trails
 */
function drawPackets() {
  const { ctx, packets, edges, nodes } = state;
  const time = performance.now() / 1000;
  const TRAIL_PIXEL_LENGTH = 40; // Constant trail length in pixels
  
  packets.forEach(p => {
    const edge = edges.find(e => e.id === p.edgeId);
    if (!edge) return;
    const n1 = nodes.find(n => n.id === edge.from);
    const n2 = nodes.find(n => n.id === edge.to);
    
    const x = n1.x + (n2.x - n1.x) * p.t;
    const y = n1.y + (n2.y - n1.y) * p.t;
    
    // Calculate edge distance
    const edgeDx = n2.x - n1.x;
    const edgeDy = n2.y - n1.y;
    const edgeDist = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
    
    // Trail length in parametric form (independent of edge length)
    const trailPixels = TRAIL_PIXEL_LENGTH;
    const trailT = Math.max(0, p.t - (trailPixels / (edgeDist || 1)));
    
    // Color based on pitch
    const scaleIndex = p.payload.scaleIndex || 12;
    const baseColor = getPitchColor(scaleIndex);
    const trailColor = getPitchColor(scaleIndex, 0.5);
    
    // Trail shape based on timbre
    const hasTimbre = p.payload.timbre > 0.5;
    
    if (hasTimbre) {
      // Wavy trail for high timbre (polariser applied)
      const segments = 8;
      const waveAmplitude = 4;
      const waveFreq = 12;
      
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      for (let i = 1; i <= segments; i++) {
        const segT = trailT + ((p.t - trailT) * i / segments);
        if (segT < 0 || segT > 1) continue;
        
        const baseX = n1.x + edgeDx * segT;
        const baseY = n1.y + edgeDy * segT;
        
        // Perpendicular wave offset
        const angle = Math.atan2(edgeDy, edgeDx);
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);
        const wave = Math.sin(time * waveFreq + i * 0.8) * waveAmplitude * (1 - i / segments);
        
        ctx.lineTo(baseX + perpX * wave, baseY + perpY * wave);
      }
      ctx.stroke();
    } else {
      // Straight trail for low timbre
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const trailX = n1.x + edgeDx * trailT;
      const trailY = n1.y + edgeDy * trailT;
      ctx.lineTo(trailX, trailY);
      ctx.stroke();
    }
    
    // Head - color based on pitch
    ctx.fillStyle = baseColor;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

/**
 * Draw all nodes
 */
function drawNodes() {
  state.nodes.forEach(n => drawNode(n));
}

/**
 * Draw a single node
 */
function drawNode(node) {
  const { ctx, selectedNode, selectedNodes, hoveredNode, mousePos, isHoveringHandle } = state;
  
  ctx.save();
  ctx.translate(node.x, node.y);
  
  if (node.flash > 0.01) {
    ctx.shadowColor = getNodeColor(node.type);
    ctx.shadowBlur = node.flash * 40;
  }
  
  if (node.type === 'emitter') {
    // Rectangle for emitter
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(-13, -30, 26, 60);
    
    ctx.strokeStyle = getNodeColor(node.type);
    ctx.lineWidth = (node === selectedNode || selectedNodes.includes(node)) ? 4 : 2;
    ctx.strokeRect(-13, -30, 26, 60);
    
    if (selectedNodes.includes(node)) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(-15, -32, 30, 64);
      ctx.setLineDash([]);
    }
  } else if (node.type === 'tunnel') {
    // Rounded rectangle for tunnel
    const w = 50, h = 40;
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.roundRect(-w/2, -h/2, w, h, 8);
    ctx.fill();
    
    ctx.strokeStyle = getNodeColor(node.type);
    ctx.lineWidth = (node === selectedNode || selectedNodes.includes(node)) ? 4 : 2;
    ctx.stroke();
    
    // Tunnel name label
    const tunnelName = node.props.tunnelName || 'Tunnel';
    ctx.fillStyle = '#00bcd4';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(tunnelName, 0, -h/2 - 4);
    
    if (selectedNodes.includes(node)) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(-w/2 - 2, -h/2 - 2, w + 4, h + 4, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else {
    // Circle for other nodes
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.arc(0, 0, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = getNodeColor(node.type);
    ctx.lineWidth = (node === selectedNode || selectedNodes.includes(node)) ? 4 : 2;
    ctx.stroke();
    
    if (selectedNodes.includes(node)) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, NODE_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getNodeIcon(node.type), 0, 0);
  
  // Visual Feedback for Pitch and Gain
  if (node.type === 'pitch') {
    ctx.fillStyle = '#ffb74d';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    let label = '';
    if (node.props.mode === 'fixed') {
      label = NOTE_NAMES[node.props.fixedNote] || '?';
    } else {
      const shift = node.props.shift;
      label = shift > 0 ? `+${shift}` : `${shift}`;
    }
    ctx.fillText(label, 0, -NODE_RADIUS - 4);
  } else if (node.type === 'gain') {
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`x${node.props.value}`, 0, -NODE_RADIUS - 4);
  } else if (node.type === 'teleporter') {
    // Show channel label above teleporter
    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(node.props.channel || 'A', 0, -NODE_RADIUS - 4);
  }
  
  // Link Handle (when hovering)
  if (node === hoveredNode) {
    const dx = mousePos.x - node.x;
    const dy = mousePos.y - node.y;
    const handleAngle = Math.atan2(dy, dx);
    const handleDist = HANDLE_OFFSET_X;
    const handleX = Math.cos(handleAngle) * handleDist;
    const handleY = Math.sin(handleAngle) * handleDist;
    
    ctx.beginPath();
    ctx.arc(handleX, handleY, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isHoveringHandle ? '#fff' : '#666';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.fillText('+', handleX, handleY + 1);
  }

  ctx.restore();
}

/**
 * Draw box selection rectangle
 */
function drawBoxSelection() {
  const { ctx, isBoxSelecting, boxSelectStart, boxSelectEnd } = state;
  
  if (isBoxSelecting) {
    const x = Math.min(boxSelectStart.x, boxSelectEnd.x);
    const y = Math.min(boxSelectStart.y, boxSelectEnd.y);
    const w = Math.abs(boxSelectEnd.x - boxSelectStart.x);
    const h = Math.abs(boxSelectEnd.y - boxSelectStart.y);
    
    ctx.fillStyle = 'rgba(0, 188, 212, 0.1)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }
}

/**
 * Draw tunnel content labels
 */
function drawTunnelLabels() {
  const { ctx, nodes, hoveredNode, selectedNode, selectedNodes } = state;

  nodes.forEach(n => {
    if (n.type !== 'tunnel') return;
    const isActive = n === hoveredNode || n === selectedNode || (selectedNodes && selectedNodes.includes(n));
    if (!isActive) return;

    const subNodes = n.props.subNodes || [];
    if (!subNodes.length) return;

    const blockSize = 32;
    const gap = 8;
    const paddingX = 12;
    const paddingY = 10;
    const contentWidth = subNodes.length * blockSize + (subNodes.length - 1) * gap;
    const labelWidth = contentWidth + paddingX * 2;
    const labelHeight = blockSize + paddingY * 2;
    const labelX = n.x - labelWidth / 2;
    const labelY = n.y + 30;

    ctx.save();
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    subNodes.forEach((subNode, idx) => {
      const centerX = labelX + paddingX + blockSize / 2 + idx * (blockSize + gap);
      const centerY = labelY + paddingY + blockSize / 2;
      drawTunnelPreviewNode(ctx, subNode, centerX, centerY, blockSize);
    });
  });
}

function drawTunnelPreviewNode(ctx, subNode, centerX, centerY, size) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const color = getNodeColor(subNode.type);
  ctx.fillStyle = '#151515';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (subNode.type === 'emitter') {
    const w = size * 0.4;
    const h = size * 0.9;
    ctx.fillRect(-w, -h / 2, w * 2, h);
    ctx.strokeRect(-w, -h / 2, w * 2, h);
  } else if (subNode.type === 'tunnel') {
    const w = size * 0.9;
    const h = size * 0.7;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else {
    const r = size * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(12, Math.floor(size * 0.5))}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getNodeIcon(subNode.type), 0, 1);
  ctx.restore();
}

/**
 * Resize canvas to fit container
 */
export function resizeCanvas() {
  const canvas = state.canvas;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
