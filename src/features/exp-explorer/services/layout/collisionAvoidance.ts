import type { ExpressFlowNode } from '../types/ExpressBaseTypes';

const NODE_SIZE: Record<string, { w: number; h: number }> = {
  expressEntityNode: { w: 380, h: 110 },
  expressTypeNode: { w: 240, h: 90 },
  expressEnumNode: { w: 240, h: 100 },
  expressSelectNode: { w: 260, h: 100 },
  expressDomainCardNode: { w: 240, h: 170 },
};

const ATTR_ROW_H = 22;
const SECTION_HEADER_H = 28;
const WHERE_CLAUSE_H = 50;
const PADDING = 28;
const MAX_ITERATIONS = 16;
const EPSILON = 0.5;

interface Bounds {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function estimateHeight(node: ExpressFlowNode, baseH: number): number {
  const expanded = node.data.forcedExpanded === true;
  if (!expanded) return baseH;
  let extra = SECTION_HEADER_H;
  const attrs = node.data.attributes ?? [];
  if (attrs.length) {
    const direct = attrs.filter((a) => !a.isInverse).length;
    const inverse = attrs.filter((a) => a.isInverse).length;
    extra += direct * ATTR_ROW_H;
    if (inverse > 0) extra += SECTION_HEADER_H + inverse * ATTR_ROW_H;
    if (node.data.whereClause) extra += WHERE_CLAUSE_H;
  } else if (node.data.enumValues?.length) {
    extra += node.data.enumValues.length * 18;
  } else if (node.data.selectMembers?.length) {
    extra += node.data.selectMembers.length * 18;
  }
  return baseH + extra;
}

function getBounds(node: ExpressFlowNode): Bounds {
  const size = NODE_SIZE[node.type ?? ''] ?? { w: 280, h: 110 };
  const h = estimateHeight(node, size.h);
  return {
    cx: node.position.x + size.w / 2,
    cy: node.position.y + h / 2,
    w: size.w,
    h,
  };
}

export function applyCollisionAvoidance(
  nodes: ExpressFlowNode[],
  anchorId?: string,
): ExpressFlowNode[] {
  if (nodes.length < 2) return nodes;

  const working = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const bounds = working.map(getBounds);

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < working.length; i++) {
      for (let j = i + 1; j < working.length; j++) {
        const a = bounds[i];
        const b = bounds[j];
        const minDx = (a.w + b.w) / 2 + PADDING;
        const minDy = (a.h + b.h) / 2 + PADDING;
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const overlapX = minDx - Math.abs(dx);
        const overlapY = minDy - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const pushX = absDx >= absDy;
        const aLocked = working[i].id === anchorId;
        const bLocked = working[j].id === anchorId;
        const share = aLocked || bLocked ? 1 : 0.5;
        const sign = pushX
          ? (Math.sign(dx) || 1)
          : (Math.sign(dy) || 1);
        const delta = (pushX ? overlapX : overlapY) * share + EPSILON;

        if (!aLocked) {
          if (pushX) {
            working[i].position.x -= sign * delta;
            bounds[i].cx -= sign * delta;
          } else {
            working[i].position.y -= sign * delta;
            bounds[i].cy -= sign * delta;
          }
          moved = true;
        }
        if (!bLocked && !aLocked) {
          if (pushX) {
            working[j].position.x += sign * delta;
            bounds[j].cx += sign * delta;
          } else {
            working[j].position.y += sign * delta;
            bounds[j].cy += sign * delta;
          }
          moved = true;
        } else if (!bLocked && aLocked) {
          if (pushX) {
            working[j].position.x += sign * (overlapX + EPSILON);
            bounds[j].cx += sign * (overlapX + EPSILON);
          } else {
            working[j].position.y += sign * (overlapY + EPSILON);
            bounds[j].cy += sign * (overlapY + EPSILON);
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return working;
}
