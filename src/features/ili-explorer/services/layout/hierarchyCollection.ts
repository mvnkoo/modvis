import type { Edge } from '@xyflow/react';
import type { IliNode } from '../types/IliBaseTypes';

export function collectAllSuperTypes(
  currentId: string,
  allEdges: Edge[],
  nodeMap: Map<string, IliNode>,
  superTypeChain: Set<string>,
  relatedNodeIds: Set<string>,
  showFullHierarchy: boolean,
  visited: Set<string> = new Set(),
): void {
  if (visited.has(currentId)) return;
  visited.add(currentId);

  for (const edge of allEdges) {
    if (edge.source !== currentId) continue;
    const targetNode = nodeMap.get(edge.target);
    if (!targetNode) continue;

    superTypeChain.add(edge.target);
    relatedNodeIds.add(edge.target);

    if (showFullHierarchy) {
      collectAllSuperTypes(
        edge.target,
        allEdges,
        nodeMap,
        superTypeChain,
        relatedNodeIds,
        showFullHierarchy,
        visited,
      );
    }
  }
}

export function buildSuperTypeLevels(
  superTypeChain: Set<string>,
  allEdges: Edge[],
): { superTypeLevels: Map<string, number>; superTypesByLevel: Map<number, string[]> } {
  const superTypeLevels = new Map<string, number>();
  const superTypesByLevel = new Map<number, string[]>();

  function visit(nodeId: string, level = 0, visited = new Set<string>()) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    superTypeLevels.set(nodeId, level);
    if (!superTypesByLevel.has(level)) {
      superTypesByLevel.set(level, []);
    }
    superTypesByLevel.get(level)!.push(nodeId);

    for (const edge of allEdges) {
      if (edge.source === nodeId && superTypeChain.has(edge.target)) {
        visit(edge.target, level + 1, visited);
      }
    }
  }

  for (const id of superTypeChain) {
    if (!superTypeLevels.has(id)) {
      visit(id);
    }
  }

  return { superTypeLevels, superTypesByLevel };
}
