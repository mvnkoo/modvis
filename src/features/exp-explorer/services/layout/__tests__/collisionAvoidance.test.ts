import { describe, it, expect } from 'vitest';
import { applyCollisionAvoidance } from '../collisionAvoidance';
import type { ExpressFlowNode } from '../../types/ExpressBaseTypes';

function node(id: string, type: string, x: number, y: number): ExpressFlowNode {
  return {
    id,
    type,
    position: { x, y },
    data: { label: id, nodeType: 'ENTITY' },
  };
}

describe('applyCollisionAvoidance', () => {
  it('returns input unchanged when there are no overlaps', () => {
    const input = [
      node('a', 'expressEntityNode', 0, 0),
      node('b', 'expressEntityNode', 600, 0),
    ];
    const out = applyCollisionAvoidance(input);
    expect(out[0].position).toEqual({ x: 0, y: 0 });
    expect(out[1].position).toEqual({ x: 600, y: 0 });
  });

  it('separates two overlapping nodes', () => {
    const input = [
      node('a', 'expressEntityNode', 0, 0),
      node('b', 'expressEntityNode', 50, 0),
    ];
    const out = applyCollisionAvoidance(input);
    const dx = Math.abs(out[1].position.x - out[0].position.x);
    expect(dx).toBeGreaterThanOrEqual(380);
  });

  it('keeps anchored node in place', () => {
    const input = [
      node('anchor', 'expressEntityNode', 100, 100),
      node('other', 'expressEntityNode', 120, 110),
    ];
    const out = applyCollisionAvoidance(input, 'anchor');
    const anchor = out.find((n) => n.id === 'anchor')!;
    expect(anchor.position).toEqual({ x: 100, y: 100 });
    const other = out.find((n) => n.id === 'other')!;
    expect(other.position.x).not.toBe(120);
  });

  it('handles many nodes without infinite loop', () => {
    const input = Array.from({ length: 12 }, (_, i) =>
      node(`n${i}`, 'expressTypeNode', i * 10, i * 10),
    );
    const out = applyCollisionAvoidance(input);
    expect(out).toHaveLength(12);
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = Math.abs(out[i].position.x - out[j].position.x);
        const dy = Math.abs(out[i].position.y - out[j].position.y);
        expect(dx > 200 || dy > 100).toBe(true);
      }
    }
  });
});
