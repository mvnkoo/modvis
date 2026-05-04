import { Edge, Node } from '@xyflow/react';
import type { ThemeColors } from '../../../../common/theme/ThemeContext';

const PREVIEW_W = 180;
const PREVIEW_GAP_X = 24;
const LEVEL_GAP_Y = 70;
const HOVERED_W_FALLBACK = 400;
const HOVERED_H_FALLBACK = 150;
const MAX_PER_LEVEL = 6;
const MAX_LEVEL2_PER_PARENT = 4;

interface PreviewInputNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  data?: { label?: string; [k: string]: unknown };
}

interface PreviewInputEdge {
  source: string;
  target: string;
}

function findSubtypes(parentId: string, edges: PreviewInputEdge[]): string[] {
  return edges.filter(e => e.target === parentId).map(e => e.source);
}

export function layoutHoverPreview(
  hoveredNode: PreviewInputNode,
  allNodes: PreviewInputNode[],
  inheritanceEdges: PreviewInputEdge[],
  colors: ThemeColors,
): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(allNodes.map(n => [n.id, n]));
  const directSubIds = findSubtypes(hoveredNode.id, inheritanceEdges);
  if (directSubIds.length === 0) return { nodes: [], edges: [] };

  const hoveredW = hoveredNode.width ?? HOVERED_W_FALLBACK;
  const hoveredH = hoveredNode.height ?? HOVERED_H_FALLBACK;
  const hCenterX = hoveredNode.position.x + hoveredW / 2;
  const hBottomY = hoveredNode.position.y + hoveredH;

  const visibleLevel1 = directSubIds.slice(0, MAX_PER_LEVEL);
  const overflowLevel1 = directSubIds.length - visibleLevel1.length;

  const level1Y = hBottomY + LEVEL_GAP_Y;
  const level1Count = visibleLevel1.length + (overflowLevel1 > 0 ? 1 : 0);
  const level1TotalW = level1Count * PREVIEW_W + (level1Count - 1) * PREVIEW_GAP_X;
  const level1StartX = hCenterX - level1TotalW / 2;

  const previewNodes: Node[] = [];
  const previewEdges: Edge[] = [];
  const edgeStyle = {
    stroke: colors.text,
    strokeWidth: 1,
    strokeDasharray: '4,4',
    opacity: 0.4,
  };

  visibleLevel1.forEach((subId, i) => {
    const sub = nodeById.get(subId);
    const label = (sub?.data?.label as string | undefined) ?? subId;
    const x = level1StartX + i * (PREVIEW_W + PREVIEW_GAP_X);
    const previewId = `__preview_l1_${subId}`;

    previewNodes.push({
      id: previewId,
      type: 'previewNode',
      position: { x, y: level1Y },
      draggable: false,
      selectable: false,
      data: { label },
    } as Node);

    previewEdges.push({
      id: `__preview_edge_${hoveredNode.id}_${subId}`,
      source: hoveredNode.id,
      sourceHandle: 'bottom-source',
      target: previewId,
      targetHandle: 'preview-top',
      type: 'default',
      style: edgeStyle,
      animated: false,
    });

    // Level 2: subtypes of this level-1 sub
    const level2Ids = findSubtypes(subId, inheritanceEdges);
    if (level2Ids.length === 0) return;

    const visibleLevel2 = level2Ids.slice(0, MAX_LEVEL2_PER_PARENT);
    const overflowLevel2 = level2Ids.length - visibleLevel2.length;
    const l2Count = visibleLevel2.length + (overflowLevel2 > 0 ? 1 : 0);
    const l2Y = level1Y + LEVEL_GAP_Y + 30;

    // Center under the level-1 box
    const l1CenterX = x + PREVIEW_W / 2;
    const l2NarrowW = 140;
    const l2GapX = 16;
    const l2TotalW = l2Count * l2NarrowW + (l2Count - 1) * l2GapX;
    const l2StartX = l1CenterX - l2TotalW / 2;

    visibleLevel2.forEach((sub2Id, j) => {
      const sub2 = nodeById.get(sub2Id);
      const label2 = (sub2?.data?.label as string | undefined) ?? sub2Id;
      const x2 = l2StartX + j * (l2NarrowW + l2GapX);
      const previewId2 = `__preview_l2_${subId}_${sub2Id}`;

      previewNodes.push({
        id: previewId2,
        type: 'previewNode',
        position: { x: x2, y: l2Y },
        draggable: false,
        selectable: false,
        data: { label: label2 },
      } as Node);

      previewEdges.push({
        id: `__preview_edge_${subId}_${sub2Id}`,
        source: previewId,
        sourceHandle: 'preview-bottom',
        target: previewId2,
        targetHandle: 'preview-top',
        type: 'default',
        style: edgeStyle,
        animated: false,
      });
    });

    if (overflowLevel2 > 0) {
      const x2 = l2StartX + visibleLevel2.length * (l2NarrowW + l2GapX);
      const placeholderId = `__preview_l2_more_${subId}`;
      previewNodes.push({
        id: placeholderId,
        type: 'previewNode',
        position: { x: x2, y: l2Y },
        draggable: false,
        selectable: false,
        data: { label: `+${overflowLevel2} more`, isPlaceholder: true },
      } as Node);
      previewEdges.push({
        id: `__preview_edge_${subId}_more`,
        source: previewId,
        sourceHandle: 'preview-bottom',
        target: placeholderId,
        targetHandle: 'preview-top',
        type: 'default',
        style: edgeStyle,
        animated: false,
      });
    }
  });

  if (overflowLevel1 > 0) {
    const x = level1StartX + visibleLevel1.length * (PREVIEW_W + PREVIEW_GAP_X);
    const placeholderId = `__preview_l1_more`;
    previewNodes.push({
      id: placeholderId,
      type: 'previewNode',
      position: { x, y: level1Y },
      draggable: false,
      selectable: false,
      data: { label: `+${overflowLevel1} more`, isPlaceholder: true },
    } as Node);
    previewEdges.push({
      id: `__preview_edge_${hoveredNode.id}_more`,
      source: hoveredNode.id,
      sourceHandle: 'bottom-source',
      target: placeholderId,
      targetHandle: 'preview-top',
      type: 'default',
      style: edgeStyle,
      animated: false,
    });
  }

  return { nodes: previewNodes, edges: previewEdges };
}
