import { Edge, MarkerType } from '@xyflow/react';
import type { ThemeColors } from '../../../../common/theme/ThemeContext';
import type {
  IliAssociation,
  IliAttribute,
  IliNode,
} from '../types/IliBaseTypes';
import {
  COMPOSITION_MARKER_ID,
  AGGREGATION_MARKER_ID,
} from '../../components/AssociationMarkerDefs';

const NODE_W = 400;
const NODE_H = 80;
const SIBLING_X = NODE_W + 60;
const ROW_Y = NODE_H + 120;
const SIDE_GAP_X = 260;
const SECONDARY_COLS = 4;
const SECONDARY_NODE_W = 320;
const SECONDARY_NODE_H = 90;
const SECONDARY_GAP_X = 160;
const SECONDARY_GAP_Y = 100;
const DEFAULT_MAX_PER_ROW = 4;

export interface FullSchemaCanvasOptions {
  maxPerRow?: number;
  showEnums?: boolean;
  showAssociations?: boolean;
  useMagicLayout?: boolean;
}

const MAGIC_VERTICAL_SCALE = 2.4;

export interface FullSchemaCanvasResult {
  nodes: IliNode[];
  edges: Edge[];
}

interface NodeMeasure {
  width: number;
  height: number;
}

export function layoutFullSchemaCanvas(
  allNodes: IliNode[],
  allEdges: Edge[],
  colors: ThemeColors,
  useCurvedLines: boolean,
  opts: FullSchemaCanvasOptions = {},
): FullSchemaCanvasResult {
  const maxPerRow = Math.max(1, opts.maxPerRow ?? DEFAULT_MAX_PER_ROW);
  const showEnums = opts.showEnums ?? true;
  const showAssociations = opts.showAssociations ?? true;
  const vScale = opts.useMagicLayout ? MAGIC_VERTICAL_SCALE : 1;
  const effRowY = ROW_Y * vScale;
  const effSecGapY = SECONDARY_GAP_Y * vScale;

  const synthesizedEnums = showEnums ? synthesizeMissingEnumNodes(allNodes) : [];
  const workingNodes: IliNode[] = [...allNodes, ...synthesizedEnums];
  const byId = new Map(workingNodes.map((n) => [n.id, n]));

  const primary = workingNodes.filter(isPrimary);
  if (primary.length === 0) return { nodes: [], edges: [] };

  const subTypeOf = new Map<string, string>();
  for (const e of allEdges) {
    const rt = (e.data as { relationType?: string } | undefined)?.relationType;
    if (rt === 'EXTENDS') subTypeOf.set(e.source, e.target);
  }

  const enums = showEnums ? workingNodes.filter(isEnumNode) : [];
  const assocs = showAssociations ? workingNodes.filter((n) => n.type === 'associationNode') : [];

  const { nodes: treeNodes, width: treesWidth } = layoutTopicTrees(
    primary,
    subTypeOf,
    byId,
    maxPerRow,
    effRowY,
  );
  const enumsGrid = layoutSecondaryGrid(enums, effSecGapY);
  const assocsGrid = layoutSecondaryGrid(assocs, effSecGapY);

  const hasAssocs = assocs.length > 0;
  const hasEnums = enums.length > 0;
  const leftOffsetX = hasAssocs ? assocsGrid.width + SIDE_GAP_X : 0;
  const rightOffsetX = leftOffsetX + treesWidth + (hasEnums ? SIDE_GAP_X : 0);

  const placed: IliNode[] = [];
  for (const n of treeNodes) {
    placed.push({
      ...n,
      position: { x: n.position.x + leftOffsetX, y: n.position.y },
      data: { ...n.data, isHighlighted: false, isActive: false, expanded: false },
    });
  }
  for (const n of assocsGrid.nodes) {
    placed.push({
      ...n,
      position: { x: n.position.x, y: n.position.y },
      data: { ...n.data, isHighlighted: false, isActive: false },
    });
  }
  for (const n of enumsGrid.nodes) {
    placed.push({
      ...n,
      position: { x: n.position.x + rightOffsetX, y: n.position.y },
      data: { ...n.data, isHighlighted: false, isActive: false },
    });
  }

  const visibleIds = new Set(placed.map((n) => n.id));
  const baseEdges = allEdges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  const enumEdges = buildEnumEdges(workingNodes, visibleIds, colors, useCurvedLines);
  const assocEdges = buildAssociationEdges(workingNodes, visibleIds, colors, useCurvedLines);

  return { nodes: placed, edges: [...baseEdges, ...enumEdges, ...assocEdges] };
}

function isPrimary(n: IliNode): boolean {
  return n.type === 'classNode'
    || n.type === 'structureNode'
    || n.type === 'unloadedClassNode';
}

function isEnumNode(n: IliNode): boolean {
  return n.type === 'enumNode'
    || n.type === 'ENUMERATION'
    || n.type === 'domainEnumNode';
}

function enumIdFor(classNode: IliNode, attr: IliAttribute): string {
  if (attr.isDomainEnum) return `domain_${attr.type}`;
  if (attr.isInlineEnum) return `enum_${classNode.id}_${attr.name}`;
  return `enum_${attr.type}`;
}

function synthesizeMissingEnumNodes(allNodes: IliNode[]): IliNode[] {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const out: IliNode[] = [];
  const seen = new Set<string>();
  for (const cls of allNodes) {
    if (cls.type !== 'classNode' && cls.type !== 'structureNode') continue;
    const attributes = cls.data?.attributes as IliAttribute[] | undefined;
    if (!attributes) continue;
    for (const attr of attributes) {
      if (!attr.isEnum && !attr.isDomainEnum) continue;
      const id = enumIdFor(cls, attr);
      if (byId.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        type: attr.isDomainEnum ? 'domainEnumNode' : 'enumNode',
        position: { x: 0, y: 0 },
        draggable: true,
        data: {
          label: attr.isDomainEnum ? attr.type : attr.name,
          enumValues: attr.enumValues || [],
          isDomainEnum: attr.isDomainEnum,
          isHighlighted: false,
          isActive: false,
          isInlineEnum: attr.isInlineEnum,
          ownerClass: cls.data?.label,
          comment: attr.comment,
          topic: cls.data?.topic,
        },
      } as unknown as IliNode);
    }
  }
  return out;
}

function buildEnumEdges(
  allNodes: IliNode[],
  visibleIds: Set<string>,
  colors: ThemeColors,
  useCurvedLines: boolean,
): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const cls of allNodes) {
    if (cls.type !== 'classNode' && cls.type !== 'structureNode') continue;
    if (!visibleIds.has(cls.id)) continue;
    const attributes = cls.data?.attributes as IliAttribute[] | undefined;
    if (!attributes) continue;
    for (const attr of attributes) {
      if (!attr.isEnum && !attr.isDomainEnum) continue;
      const enumId = enumIdFor(cls, attr);
      if (!visibleIds.has(enumId)) continue;
      const key = `${cls.id}-${enumId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        id: `${cls.id}-${enumId}-enum-full`,
        source: cls.id,
        target: enumId,
        type: useCurvedLines ? 'default' : 'step',
        animated: false,
        sourceHandle: 'right-source',
        targetHandle: 'left',
        data: { relationType: 'ENUM_REF' },
        style: {
          stroke: colors.typeReference,
          strokeWidth: 1.5,
          strokeDasharray: '5,5',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colors.typeReference,
          width: 18,
          height: 18,
        },
      });
    }
  }
  return edges;
}

function buildAssociationEdges(
  allNodes: IliNode[],
  visibleIds: Set<string>,
  colors: ThemeColors,
  useCurvedLines: boolean,
): Edge[] {
  const edges: Edge[] = [];
  for (const node of allNodes) {
    if (node.type !== 'associationNode') continue;
    if (!visibleIds.has(node.id)) continue;
    const assoc = node.data?.association as IliAssociation | undefined;
    if (!assoc) continue;
    const kind = assoc.kind ?? 'plain';
    const isStrong = kind === 'composition' || kind === 'aggregation';
    const stroke = isStrong ? colors.composition : colors.relationship;
    const marker =
      kind === 'composition'
        ? `url(#${COMPOSITION_MARKER_ID})`
        : kind === 'aggregation'
          ? `url(#${AGGREGATION_MARKER_ID})`
          : { type: MarkerType.Arrow, color: stroke, width: 18, height: 18 };

    if (visibleIds.has(assoc.sourceClass)) {
      edges.push({
        id: `${assoc.sourceClass}-${node.id}-assoc-src-full`,
        source: assoc.sourceClass,
        target: node.id,
        type: useCurvedLines ? 'default' : 'step',
        animated: !isStrong,
        sourceHandle: 'left-source',
        targetHandle: 'right-target',
        data: { relationType: 'ASSOCIATES' },
        style: { stroke, strokeWidth: 1.8 },
      });
    }
    if (visibleIds.has(assoc.targetClass)) {
      edges.push({
        id: `${node.id}-${assoc.targetClass}-assoc-tgt-full`,
        source: node.id,
        target: assoc.targetClass,
        type: useCurvedLines ? 'default' : 'step',
        animated: !isStrong,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        data: { relationType: 'ASSOCIATES' },
        style: { stroke, strokeWidth: 1.8 },
        markerEnd: marker,
      });
    }
  }
  return edges;
}

function layoutTopicTrees(
  members: IliNode[],
  subTypeOf: Map<string, string>,
  byId: Map<string, IliNode>,
  maxPerRow: number,
  rowY: number,
): { nodes: IliNode[]; width: number; depth: number } {
  if (members.length === 0) return { nodes: [], width: 0, depth: 0 };

  const memberIds = new Set(members.map((m) => m.id));
  const childrenMap = new Map<string, string[]>();
  const roots: string[] = [];
  for (const m of members) {
    const parent = subTypeOf.get(m.id);
    if (parent && memberIds.has(parent)) {
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(m.id);
    } else {
      roots.push(m.id);
    }
  }
  for (const kids of childrenMap.values()) {
    kids.sort((a, b) =>
      labelOf(byId.get(a)).localeCompare(labelOf(byId.get(b))),
    );
  }

  const measureCache = new Map<string, NodeMeasure>();
  roots.sort((a, b) => {
    const ma = measureNode(a, childrenMap, maxPerRow, measureCache);
    const mb = measureNode(b, childrenMap, maxPerRow, measureCache);
    if (ma.width !== mb.width) return mb.width - ma.width;
    return labelOf(byId.get(a)).localeCompare(labelOf(byId.get(b)));
  });

  const out: IliNode[] = [];
  let xSlots = 0;
  let maxDepth = 0;
  const TREE_GUTTER_SLOTS = 0.6;
  for (const rootId of roots) {
    const m = measureNode(rootId, childrenMap, maxPerRow, measureCache);
    placeTreeNode(rootId, xSlots, 0, childrenMap, byId, maxPerRow, rowY, measureCache, out);
    xSlots += m.width + TREE_GUTTER_SLOTS;
    maxDepth = Math.max(maxDepth, m.height);
  }

  const allX = out.map((n) => n.position.x);
  const minX = allX.length ? Math.min(...allX) : 0;
  const maxX = allX.length ? Math.max(...allX) + NODE_W : 0;
  const widthPx = maxX - minX;
  const shifted = out.map((n) => ({
    ...n,
    position: { x: n.position.x - minX, y: n.position.y },
  }));

  return { nodes: shifted, width: widthPx, depth: maxDepth };
}

function layoutSecondaryGrid(items: IliNode[], gapY: number): { nodes: IliNode[]; width: number; height: number } {
  if (items.length === 0) return { nodes: [], width: 0, height: 0 };
  const sorted = [...items].sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
  const cols = Math.min(SECONDARY_COLS, sorted.length);
  const rows = Math.ceil(sorted.length / cols);
  const nodes: IliNode[] = [];
  sorted.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes.push({
      ...n,
      position: {
        x: col * (SECONDARY_NODE_W + SECONDARY_GAP_X),
        y: row * (SECONDARY_NODE_H + gapY),
      },
    });
  });
  const width = cols * SECONDARY_NODE_W + (cols - 1) * SECONDARY_GAP_X;
  const height = rows * SECONDARY_NODE_H + (rows - 1) * gapY;
  return { nodes, width, height };
}

function labelOf(n: IliNode | undefined): string {
  return (n?.data?.label as string | undefined) ?? '';
}

function measureNode(
  id: string,
  childrenMap: Map<string, string[]>,
  maxPerRow: number,
  cache: Map<string, NodeMeasure>,
): NodeMeasure {
  const cached = cache.get(id);
  if (cached) return cached;

  const kids = childrenMap.get(id) ?? [];
  if (kids.length === 0) {
    const m = { width: 1, height: 1 };
    cache.set(id, m);
    return m;
  }

  const cols = Math.min(maxPerRow, kids.length);
  const rows = Math.ceil(kids.length / cols);

  let maxRowWidth = 0;
  let totalChildHeight = 0;
  for (let r = 0; r < rows; r++) {
    const start = r * cols;
    const end = Math.min(start + cols, kids.length);
    let rowWidth = 0;
    let rowMaxHeight = 0;
    for (let i = start; i < end; i++) {
      const sub = measureNode(kids[i], childrenMap, maxPerRow, cache);
      rowWidth += sub.width;
      rowMaxHeight = Math.max(rowMaxHeight, sub.height);
    }
    maxRowWidth = Math.max(maxRowWidth, rowWidth);
    totalChildHeight += rowMaxHeight;
  }

  const m = { width: Math.max(1, maxRowWidth), height: 1 + totalChildHeight };
  cache.set(id, m);
  return m;
}

function placeTreeNode(
  id: string,
  xLeftSlots: number,
  yDepth: number,
  childrenMap: Map<string, string[]>,
  byId: Map<string, IliNode>,
  maxPerRow: number,
  rowY: number,
  cache: Map<string, NodeMeasure>,
  out: IliNode[],
): void {
  const m = measureNode(id, childrenMap, maxPerRow, cache);
  const centerSlots = xLeftSlots + m.width / 2;
  const centerX = centerSlots * SIBLING_X;
  const node = byId.get(id);
  if (node) {
    out.push({
      ...node,
      position: { x: centerX - NODE_W / 2, y: yDepth * rowY },
    });
  }

  const kids = childrenMap.get(id) ?? [];
  if (kids.length === 0) return;
  const cols = Math.min(maxPerRow, kids.length);
  const rows = Math.ceil(kids.length / cols);

  let yCursorDepth = yDepth + 1;
  for (let r = 0; r < rows; r++) {
    const start = r * cols;
    const end = Math.min(start + cols, kids.length);
    let rowWidth = 0;
    let rowMaxHeight = 0;
    for (let i = start; i < end; i++) {
      const sub = measureNode(kids[i], childrenMap, maxPerRow, cache);
      rowWidth += sub.width;
      rowMaxHeight = Math.max(rowMaxHeight, sub.height);
    }
    let xCursor = xLeftSlots + (m.width - rowWidth) / 2;
    for (let i = start; i < end; i++) {
      const sub = measureNode(kids[i], childrenMap, maxPerRow, cache);
      placeTreeNode(kids[i], xCursor, yCursorDepth, childrenMap, byId, maxPerRow, rowY, cache, out);
      xCursor += sub.width;
    }
    yCursorDepth += rowMaxHeight;
  }
}

