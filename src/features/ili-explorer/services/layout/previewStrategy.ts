import { Edge, Node, MarkerType } from '@xyflow/react';
import type { EdgeMarker } from '@xyflow/react';
import type { ThemeColors } from '../../../../common/theme/ThemeContext';

const PREVIEW_W = 180;
const PREVIEW_H = 28;
const SIBLING_GAP_Y = 10;
const FIRST_OFFSET_Y = 32;
const HOVERED_W_FALLBACK = 400;
const HOVERED_H_FALLBACK = 150;
const MAX_PER_LEVEL = 8;
const MAX_DEPTH = 2;
// Trunk emerges from the hovered class's bottom-center; boxes sit clearly to
// the right of that trunk so the L-corner has room to breathe.
const TRUNK_TO_BOX_GAP = 70;
// Level-N child must start to the right of its parent's bottom-center
// (= parent.x + PREVIEW_W/2), otherwise the L-edge bends backwards.
const INDENT_X = PREVIEW_W / 2 + TRUNK_TO_BOX_GAP;
const PREVIEW_Z_INDEX = 1000;

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

interface LayoutCtx {
  nodeById: Map<string, PreviewInputNode>;
  inheritanceEdges: PreviewInputEdge[];
  edgeStyle: React.CSSProperties;
  markerEnd: EdgeMarker;
  outNodes: Node[];
  outEdges: Edge[];
}

function pushPreviewNode(
  ctx: LayoutCtx,
  id: string,
  label: string,
  x: number,
  y: number,
  isPlaceholder = false,
): void {
  ctx.outNodes.push({
    id,
    type: 'previewNode',
    position: { x, y },
    draggable: false,
    selectable: false,
    zIndex: PREVIEW_Z_INDEX,
    data: { label, isPlaceholder },
  } as Node);
}

function pushPreviewEdge(
  ctx: LayoutCtx,
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
): void {
  ctx.outEdges.push({
    id,
    source,
    sourceHandle,
    target,
    targetHandle: 'preview-left',
    type: 'step',
    style: ctx.edgeStyle,
    markerEnd: ctx.markerEnd,
    animated: false,
    zIndex: PREVIEW_Z_INDEX,
  });
}

function layoutChildren(
  ctx: LayoutCtx,
  parentLookupId: string,
  edgeSourceId: string,
  edgeSourceHandle: string,
  startX: number,
  startY: number,
  depth: number,
): number {
  const children = findSubtypes(parentLookupId, ctx.inheritanceEdges);
  if (children.length === 0) return startY;

  const visible = children.slice(0, MAX_PER_LEVEL);
  const overflow = children.length - visible.length;
  let cursorY = startY;

  visible.forEach((childId, i) => {
    const childNode = ctx.nodeById.get(childId);
    const label = (childNode?.data?.label as string | undefined) ?? childId;
    const previewId = `__preview_${edgeSourceId}_${depth}_${i}_${childId}`;

    pushPreviewNode(ctx, previewId, label, startX, cursorY);
    pushPreviewEdge(
      ctx,
      `__preview_edge_${edgeSourceId}_${depth}_${i}`,
      edgeSourceId,
      edgeSourceHandle,
      previewId,
    );

    cursorY += PREVIEW_H + SIBLING_GAP_Y;

    if (depth < MAX_DEPTH) {
      cursorY = layoutChildren(
        ctx,
        childId,
        previewId,
        'preview-bottom',
        startX + INDENT_X,
        cursorY,
        depth + 1,
      );
    }
  });

  if (overflow > 0) {
    const placeholderId = `__preview_${edgeSourceId}_${depth}_more`;
    pushPreviewNode(ctx, placeholderId, `+${overflow} more`, startX, cursorY, true);
    pushPreviewEdge(
      ctx,
      `__preview_edge_${edgeSourceId}_${depth}_more`,
      edgeSourceId,
      edgeSourceHandle,
      placeholderId,
    );
    cursorY += PREVIEW_H + SIBLING_GAP_Y;
  }

  return cursorY;
}

export function layoutHoverPreview(
  hoveredNode: PreviewInputNode,
  allNodes: PreviewInputNode[],
  inheritanceEdges: PreviewInputEdge[],
  colors: ThemeColors,
): { nodes: Node[]; edges: Edge[] } {
  const directSubIds = findSubtypes(hoveredNode.id, inheritanceEdges);
  if (directSubIds.length === 0) return { nodes: [], edges: [] };

  const hoveredW = hoveredNode.width ?? HOVERED_W_FALLBACK;
  const hoveredH = hoveredNode.height ?? HOVERED_H_FALLBACK;
  const hCenterX = hoveredNode.position.x + hoveredW / 2;
  const hBottomY = hoveredNode.position.y + hoveredH;

  // Boxes sit to the right of the trunk (which exits class.bottom-center).
  const startX = hCenterX + TRUNK_TO_BOX_GAP;
  const startY = hBottomY + FIRST_OFFSET_Y;

  const lineColor = '#555';
  const ctx: LayoutCtx = {
    nodeById: new Map(allNodes.map(n => [n.id, n])),
    inheritanceEdges,
    edgeStyle: {
      stroke: lineColor,
      strokeWidth: 1,
      opacity: 0.9,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: lineColor,
      width: 14,
      height: 14,
    },
    outNodes: [],
    outEdges: [],
  };
  // colors is intentionally unused now that the preview uses a fixed dark
  // grey — keep the parameter to preserve the call signature for callers.
  void colors;

  layoutChildren(
    ctx,
    hoveredNode.id,
    hoveredNode.id,
    'bottom-source',
    startX,
    startY,
    1,
  );

  return { nodes: ctx.outNodes, edges: ctx.outEdges };
}
