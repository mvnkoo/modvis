import { Edge, MarkerType } from '@xyflow/react';
import { IliBaseNode, IliRelation } from './types/IliBaseTypes';
import { ThemeColors } from '../../../common/theme/ThemeContext';

export function flowNodeFromBaseNode(node: IliBaseNode) {
  return {
    id: node.id,
    type: node.type === 'ASSOCIATION' ? 'associationNode' : `${node.type.toLowerCase()}Node`,
    position: { x: 0, y: 0 },
    draggable: true,
    data: {
      ...node,
      label: node.name,
      isHighlighted: false,
      isActive: false,
      expanded: false,
    },
  };
}

export function inheritanceEdgesFromRelations(
  relations: IliRelation[],
  colors: ThemeColors,
  useCurvedLines: boolean,
): Edge[] {
  return relations
    .filter(relation => relation.type === 'EXTENDS')
    .map(relation => ({
      id: relation.id,
      source: relation.sourceId,
      target: relation.targetId,
      type: useCurvedLines ? 'default' : 'step',
      animated: false,
      style: { stroke: colors.inheritance, strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.Arrow,
        color: colors.inheritance,
      },
    }));
}
