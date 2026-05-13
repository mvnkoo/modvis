import { Edge } from '@xyflow/react';
import type { IliNode, IliRelation } from '../types/IliBaseTypes';

const COL_W = 460;
const ROW_H = 230;
const TOPIC_HEADER_H = 70;
const TOPIC_GAP = 90;
const MAX_COLS = 4;
const FRAME_PAD_X = 24;
const FRAME_PAD_Y = 16;
const NO_TOPIC = '__no_topic__';
const NO_TOPIC_LABEL = 'Model level';

function topicOf(node: IliNode): string {
  return (node.data?.topic as string | undefined) || NO_TOPIC;
}

export function isOverviewCandidate(allNodes: IliNode[], allRelations: IliRelation[]): boolean {
  const roots = collectRootClasses(allNodes, allRelations);
  if (roots.length <= 1) return false;
  const topics = new Set(roots.map(topicOf));
  return roots.length > 1 || topics.size > 1;
}

function collectRootClasses(allNodes: IliNode[], allRelations: IliRelation[]): IliNode[] {
  const externalIds = new Set(
    allNodes.filter(n => (n.data as { isExternal?: boolean } | undefined)?.isExternal).map(n => n.id),
  );
  // A class counts as a root if it does NOT extend something that is part of
  // this model. Classes that only extend external (imported) classes are still
  // shown as roots — the external supertype isn't really part of this model's
  // structure, so the local class is the actual entry point.
  const extendsToInternal = new Set<string>();
  for (const rel of allRelations) {
    if (rel.type !== 'EXTENDS') continue;
    if (externalIds.has(rel.targetId)) continue;
    extendsToInternal.add(rel.sourceId);
  }
  return allNodes.filter(n =>
    n.type === 'classNode'
    && !(n.data as { isExternal?: boolean } | undefined)?.isExternal
    && !extendsToInternal.has(n.id),
  );
}

export function layoutModelOverview(
  allNodes: IliNode[],
  allRelations: IliRelation[],
): { nodes: IliNode[]; edges: Edge[] } {
  const roots = collectRootClasses(allNodes, allRelations);

  const byTopic = new Map<string, IliNode[]>();
  for (const node of roots) {
    const topic = topicOf(node);
    const list = byTopic.get(topic) ?? [];
    list.push(node);
    byTopic.set(topic, list);
  }

  const orderedTopics = [...byTopic.keys()].sort((a, b) => {
    if (a === NO_TOPIC) return 1;
    if (b === NO_TOPIC) return -1;
    return a.localeCompare(b);
  });

  const totalGridWidth = MAX_COLS * COL_W;
  const placedNodes: IliNode[] = [];
  let cursorY = 0;
  let topicIndex = 0;

  for (const topic of orderedTopics) {
    const classes = byTopic.get(topic)!;
    const rows = Math.max(1, Math.ceil(classes.length / MAX_COLS));
    const groupContentH = TOPIC_HEADER_H + rows * ROW_H;

    // Frame must be pushed first so it renders behind the cards.
    placedNodes.push({
      id: `__topic_frame_${topic}_${topicIndex}`,
      type: 'topicFrameNode',
      position: { x: -FRAME_PAD_X, y: cursorY - FRAME_PAD_Y },
      draggable: false,
      selectable: false,
      data: {
        width: totalGridWidth + FRAME_PAD_X * 2,
        height: groupContentH + FRAME_PAD_Y * 2,
        isHighlighted: false,
        isActive: false,
      },
    } as unknown as IliNode);

    placedNodes.push({
      id: `__topic_label_${topic}_${topicIndex}`,
      type: 'topicLabelNode',
      position: { x: 0, y: cursorY },
      draggable: false,
      selectable: false,
      data: {
        label: topic === NO_TOPIC ? NO_TOPIC_LABEL : topic,
        classCount: classes.length,
        isOrphanGroup: topic === NO_TOPIC,
        isHighlighted: false,
        isActive: false,
      },
    } as unknown as IliNode);

    const cardsStartY = cursorY + TOPIC_HEADER_H;
    classes.forEach((cn, i) => {
      const col = i % MAX_COLS;
      const row = Math.floor(i / MAX_COLS);
      placedNodes.push({
        ...cn,
        position: { x: col * COL_W, y: cardsStartY + row * ROW_H },
        data: {
          ...cn.data,
          isHighlighted: false,
          isActive: false,
          expanded: false,
        },
      });
    });

    cursorY += groupContentH + TOPIC_GAP;
    topicIndex++;
  }

  return { nodes: placedNodes, edges: [] };
}
