import type {
  ExpressFlowNode,
  ExpressRelation,
} from '../types/ExpressBaseTypes';
import { getDomainMembers } from './overviewStrategy';

const NODE_W = 380;
const NODE_H = 110;
const SIBLING_X = NODE_W + 60;
const ROW_Y = NODE_H + 110;
const TREE_GUTTER_SLOTS = 0.6;
const DEFAULT_MAX_PER_ROW = 4;

export interface DomainCanvasOptions {
  maxPerRow?: number;
}

export interface DomainCanvasResult {
  nodes: ExpressFlowNode[];
  visibleRelations: ExpressRelation[];
}

interface NodeMeasure {
  width: number;
  height: number;
}

export function layoutDomainCanvas(
  domainKey: string,
  allNodes: ExpressFlowNode[],
  allRelations: ExpressRelation[],
  opts: DomainCanvasOptions = {},
): DomainCanvasResult {
  const members = getDomainMembers(domainKey, allNodes);
  if (members.length === 0) return { nodes: [], visibleRelations: [] };

  const maxPerRow = Math.max(1, opts.maxPerRow ?? DEFAULT_MAX_PER_ROW);
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const memberIds = new Set(members.map((m) => m.id));

  const childrenMap = new Map<string, string[]>();
  const roots: string[] = [];
  for (const m of members) {
    const parent = bucketParent(m, memberIds);
    if (parent) {
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(m.id);
    } else {
      roots.push(m.id);
    }
  }

  for (const [pid, kids] of childrenMap) {
    kids.sort((a, b) => {
      const an = byId.get(a)?.data.label ?? '';
      const bn = byId.get(b)?.data.label ?? '';
      return an.localeCompare(bn);
    });
    childrenMap.set(pid, kids);
  }

  const measureCache = new Map<string, NodeMeasure>();
  roots.sort((a, b) => {
    const sa = measureNode(a, childrenMap, maxPerRow, measureCache).width;
    const sb = measureNode(b, childrenMap, maxPerRow, measureCache).width;
    if (sa !== sb) return sb - sa;
    const an = byId.get(a)?.data.label ?? '';
    const bn = byId.get(b)?.data.label ?? '';
    return an.localeCompare(bn);
  });

  const out: ExpressFlowNode[] = [];
  let xSlotCursor = 0;
  for (const rootId of roots) {
    const m = measureNode(rootId, childrenMap, maxPerRow, measureCache);
    placeNode(rootId, xSlotCursor, 0, childrenMap, byId, maxPerRow, measureCache, out);
    xSlotCursor += m.width + TREE_GUTTER_SLOTS;
  }

  const allX = out.map((n) => n.position.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX) + NODE_W;
  const offset = -(minX + maxX) / 2;
  const centered = out.map((n) => ({
    ...n,
    position: { x: n.position.x + offset, y: n.position.y },
    data: { ...n.data, isActive: false, isHighlighted: false },
  }));

  const visibleIds = new Set(centered.map((n) => n.id));
  const visibleRelations = allRelations.filter(
    (r) =>
      r.type === 'SUBTYPE_OF'
      && visibleIds.has(r.sourceId)
      && visibleIds.has(r.targetId),
  );

  return { nodes: centered, visibleRelations };
}

function bucketParent(node: ExpressFlowNode, memberIds: Set<string>): string | null {
  const supers = node.data.superTypes ?? [];
  for (const id of supers) {
    if (memberIds.has(id)) return id;
  }
  return null;
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

function placeNode(
  id: string,
  xLeftSlots: number,
  yDepth: number,
  childrenMap: Map<string, string[]>,
  byId: Map<string, ExpressFlowNode>,
  maxPerRow: number,
  cache: Map<string, NodeMeasure>,
  out: ExpressFlowNode[],
): void {
  const m = measureNode(id, childrenMap, maxPerRow, cache);
  const centerSlots = xLeftSlots + m.width / 2;
  const centerX = centerSlots * SIBLING_X;

  const node = byId.get(id);
  if (node) {
    out.push({
      ...node,
      position: { x: centerX - NODE_W / 2, y: yDepth * ROW_Y },
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
      placeNode(kids[i], xCursor, yCursorDepth, childrenMap, byId, maxPerRow, cache, out);
      xCursor += sub.width;
    }
    yCursorDepth += rowMaxHeight;
  }
}
