import type {
  ExpressFlowNode,
  ExpressRelation,
} from '../types/ExpressBaseTypes';
import { EXPRESS_LAYOUT as L } from './config';

export interface FocusLayoutOptions {
  showFullHierarchy: boolean;
  showEnums: boolean;
  showSelects: boolean;
  useMagicLayout?: boolean;
  limitSubTypes?: boolean;
  maxSubTypesPerRow?: number;
}

const MAGIC_Y_SCALE = 1.4;
const COL_GUTTER = 220;
const NODE_HALF = 200;
const PAIR_OFFSET_X = 900;
const SELECTS_EXTRA_GAP = 520;

export interface FocusLayoutResult {
  nodes: ExpressFlowNode[];
  visibleRelations: ExpressRelation[];
}

export function getDirectRelations(
  center: ExpressFlowNode,
  allNodes: ExpressFlowNode[],
  relations: ExpressRelation[],
  opts: FocusLayoutOptions,
): FocusLayoutResult {
  const byId = new Map(allNodes.map((n) => [n.id, n]));

  const supers = collectSupers(center, byId, opts.showFullHierarchy);
  const subs = collectDirectSubs(center, allNodes);
  const enumIds = opts.showEnums ? collectEnumRefs(center, relations, byId) : new Set<string>();
  const selectIds = opts.showSelects ? collectSelectRefs(center, relations, byId) : new Set<string>();
  const typeRefIds = collectTypeRefs(center, relations, byId);

  const maxPerRow = opts.limitSubTypes && opts.maxSubTypesPerRow && opts.maxSubTypesPerRow > 0
    ? opts.maxSubTypesPerRow
    : 0;

  const isEnumCenter = center.data.nodeType === 'ENUM';
  const isSelectCenter = center.data.nodeType === 'SELECT';

  const rightIds = new Set<string>(typeRefIds);
  const leftIds = new Set<string>();

  if (isEnumCenter) {
    enumIds.forEach((id) => leftIds.add(id));
  } else {
    enumIds.forEach((id) => rightIds.add(id));
  }

  if (isSelectCenter) {
    selectIds.forEach((id) => rightIds.add(id));
  } else {
    selectIds.forEach((id) => leftIds.add(id));
  }

  const pairedId = center.data.pairedTypeId ?? center.data.pairedObjectId ?? null;

  const visibleIds = new Set<string>([center.id]);
  supers.forEach((id) => visibleIds.add(id));
  subs.forEach((id) => visibleIds.add(id));
  rightIds.forEach((id) => visibleIds.add(id));
  leftIds.forEach((id) => visibleIds.add(id));
  if (pairedId) visibleIds.add(pairedId);

  const yScale = opts.useMagicLayout ? MAGIC_Y_SCALE : 1;
  const rowWidthHalf = subRowHalfWidth(subs.size, maxPerRow);
  const baseSideX = Math.max(L.ENUM_OFFSET_X, rowWidthHalf + NODE_HALF + COL_GUTTER);
  const sideX = pairedId ? Math.max(baseSideX, PAIR_OFFSET_X) : baseSideX;
  const selectsX = pairedId ? sideX + SELECTS_EXTRA_GAP : sideX;

  const positioned: ExpressFlowNode[] = [];
  for (const id of visibleIds) {
    const node = byId.get(id);
    if (!node) continue;
    if (pairedId && id === pairedId) {
      positioned.push(withPositionPair(node, L.CENTER_X - sideX, L.CENTER_Y));
      continue;
    }
    positioned.push(positionNode(node, center.id, {
      supers, subs,
      right: rightIds,
      left: leftIds,
    }, yScale, maxPerRow, sideX, selectsX));
  }

  const visibleRelations = relations.filter((r) => {
    if (!visibleIds.has(r.sourceId) || !visibleIds.has(r.targetId)) return false;
    if (pairedId && (r.sourceId === pairedId || r.targetId === pairedId)) {
      const isPairEdge = r.type === 'OBJECT_TYPE_PAIR'
        && (r.sourceId === center.id || r.targetId === center.id);
      return isPairEdge;
    }
    return true;
  });

  return { nodes: positioned, visibleRelations };
}

function collectSupers(
  center: ExpressFlowNode,
  byId: Map<string, ExpressFlowNode>,
  full: boolean,
): Set<string> {
  const out = new Set<string>();
  const queue: string[] = [...(center.data.superTypes ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (out.has(id)) continue;
    out.add(id);
    if (!full) continue;
    const parent = byId.get(id);
    if (parent?.data.superTypes) queue.push(...parent.data.superTypes);
  }
  return out;
}

function collectDirectSubs(
  center: ExpressFlowNode,
  allNodes: ExpressFlowNode[],
): Set<string> {
  const out = new Set<string>();
  for (const n of allNodes) {
    if (n.data.superTypes?.includes(center.id)) out.add(n.id);
  }
  return out;
}

function collectEnumRefs(
  center: ExpressFlowNode,
  relations: ExpressRelation[],
  byId: Map<string, ExpressFlowNode>,
): Set<string> {
  const out = new Set<string>();
  if (center.data.nodeType === 'ENUM') {
    for (const r of relations) {
      if (r.type === 'ENUM_REF' && r.targetId === center.id) out.add(r.sourceId);
    }
    return out;
  }
  for (const r of relations) {
    if (r.type !== 'ENUM_REF' || r.sourceId !== center.id) continue;
    const target = byId.get(r.targetId);
    if (target) out.add(target.id);
  }
  return out;
}

function collectSelectRefs(
  center: ExpressFlowNode,
  relations: ExpressRelation[],
  byId: Map<string, ExpressFlowNode>,
): Set<string> {
  const out = new Set<string>();
  if (center.data.nodeType === 'SELECT') {
    for (const m of center.data.selectMembers ?? []) {
      if (byId.has(m)) out.add(m);
    }
    return out;
  }
  for (const r of relations) {
    if (r.type === 'SELECT_MEMBER' && r.targetId === center.id) out.add(r.sourceId);
  }
  return out;
}

function collectTypeRefs(
  center: ExpressFlowNode,
  relations: ExpressRelation[],
  byId: Map<string, ExpressFlowNode>,
): Set<string> {
  const out = new Set<string>();
  for (const r of relations) {
    if (r.type !== 'TYPE_REF') continue;
    if (r.sourceId === center.id) {
      const t = byId.get(r.targetId);
      if (t && t.data.nodeType !== 'ENUM') out.add(t.id);
    }
  }
  return out;
}

interface Groups {
  supers: Set<string>;
  subs: Set<string>;
  right: Set<string>;
  left: Set<string>;
}

function positionNode(
  node: ExpressFlowNode,
  centerId: string,
  groups: Groups,
  yScale: number,
  maxPerRow: number,
  sideX: number,
  selectsX: number,
): ExpressFlowNode {
  if (node.id === centerId) {
    return withPosition(node, L.CENTER_X, L.CENTER_Y, true);
  }
  if (groups.supers.has(node.id)) {
    const level = supLevel(node.id, groups.supers);
    return withPosition(node, L.CENTER_X, -L.SUPER_LEVEL_Y * level * yScale);
  }
  if (groups.subs.has(node.id)) {
    const subList = [...groups.subs];
    const idx = subList.indexOf(node.id);
    const { x, y } = subtypeRowPosition(idx, subList.length, maxPerRow, yScale);
    return withPosition(node, x, y);
  }
  if (groups.right.has(node.id)) {
    const list = [...groups.right];
    const idx = list.indexOf(node.id);
    const groupH = (list.length - 1) * L.ENUM_ROW_Y;
    return withPosition(
      node,
      L.CENTER_X + sideX,
      (idx * L.ENUM_ROW_Y - groupH / 2) * yScale,
    );
  }
  if (groups.left.has(node.id)) {
    const list = [...groups.left];
    const idx = list.indexOf(node.id);
    const groupH = (list.length - 1) * L.ENUM_ROW_Y;
    return withPosition(
      node,
      L.CENTER_X - selectsX,
      (idx * L.ENUM_ROW_Y - groupH / 2) * yScale,
    );
  }
  return withPosition(node, L.CENTER_X, L.CENTER_Y);
}

function withPosition(
  node: ExpressFlowNode,
  x: number,
  y: number,
  isActive = false,
): ExpressFlowNode {
  return {
    ...node,
    position: { x, y },
    data: {
      ...node.data,
      isActive,
      isHighlighted: isActive,
    },
  };
}

function withPositionPair(
  node: ExpressFlowNode,
  x: number,
  y: number,
): ExpressFlowNode {
  return {
    ...node,
    position: { x, y },
    data: {
      ...node.data,
      isActive: false,
      isHighlighted: false,
    },
  };
}

function supLevel(id: string, supers: Set<string>): number {
  return [...supers].indexOf(id) + 1;
}

function subRowHalfWidth(total: number, maxPerRow: number): number {
  if (total === 0) return 0;
  const perRow = maxPerRow === 0 || maxPerRow >= total ? total : maxPerRow;
  return ((perRow - 1) * L.SIBLING_X) / 2;
}

function subtypeRowPosition(
  index: number,
  total: number,
  maxPerRow: number,
  yScale: number,
): { x: number; y: number } {
  if (maxPerRow === 0 || maxPerRow >= total) {
    const offset = (index - (total - 1) / 2) * L.SIBLING_X;
    return { x: L.CENTER_X + offset, y: L.SUB_ROW_Y * yScale };
  }
  const row = Math.floor(index / maxPerRow);
  const col = index % maxPerRow;
  const lastRowIndex = Math.floor((total - 1) / maxPerRow);
  const itemsInThisRow = row === lastRowIndex
    ? total - row * maxPerRow
    : maxPerRow;
  const rowOffset = (col - (itemsInThisRow - 1) / 2) * L.SIBLING_X;
  return {
    x: L.CENTER_X + rowOffset,
    y: (L.SUB_ROW_Y + row * L.SUB_ROW_STAGGER) * yScale,
  };
}
