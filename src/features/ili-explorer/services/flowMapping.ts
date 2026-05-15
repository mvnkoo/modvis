import { Edge, MarkerType } from '@xyflow/react';
import { IliBaseNode, IliRelation } from './types/IliBaseTypes';
import { ThemeColors } from '../../../common/theme/ThemeContext';

const FLOW_NODE_TYPE: Record<string, string> = {
  MODEL: 'modelNode',
  TOPIC: 'topicNode',
  CLASS: 'classNode',
  STRUCTURE: 'structureNode',
  ASSOCIATION: 'associationNode',
  ENUMERATION: 'enumNode',
  UNIT: 'domainEnumNode',
  FUNCTION: 'unsupportedNode',
  VIEW: 'unsupportedNode',
  enumNode: 'enumNode',
  domainEnumNode: 'domainEnumNode',
};

export function flowNodeFromBaseNode(node: IliBaseNode) {
  const { data: nodeData, ...nodeRest } = node;
  return {
    id: node.id,
    type: FLOW_NODE_TYPE[node.type] ?? 'unsupportedNode',
    position: { x: 0, y: 0 },
    draggable: true,
    data: {
      ...nodeData,
      ...nodeRest,
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
