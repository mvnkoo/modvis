import { Edge, MarkerType } from '@xyflow/react';
import type { ThemeColors } from '../../../../common/theme/ThemeContext';
import type { IliAttribute, IliNode } from '../types/IliBaseTypes';
import { LAYOUT_CONFIG } from './config';

export function layoutEnumCenter(
  entity: IliNode,
  allNodes: IliNode[],
  colors: ThemeColors,
  useCurvedLines: boolean,
): { nodes: IliNode[]; edges: Edge[] } {
  const relatedClasses = allNodes.filter(node => {
    if (node.type !== 'classNode') return false;
    return node.data.attributes?.some((attr: IliAttribute) => {
      if (!attr.isEnum && !attr.isDomainEnum) return false;
      const enumNodeId = attr.isDomainEnum
        ? `domain_${attr.type}`
        : attr.isInlineEnum
          ? `enum_${node.id}_${attr.name}`
          : `enum_${attr.name}`;
      return enumNodeId === entity.id;
    });
  });

  const classNodes = relatedClasses.map((classNode, index) => ({
    ...classNode,
    position: {
      x: -LAYOUT_CONFIG.ENUM.OFFSET_X,
      y: index * LAYOUT_CONFIG.ENUM.CLASS_SPACING -
        ((relatedClasses.length - 1) * LAYOUT_CONFIG.ENUM.CLASS_SPACING) / 2,
    },
    data: {
      ...classNode.data,
      isHighlighted: false,
      isActive: false,
    },
  }));

  const edges: Edge[] = relatedClasses.map(classNode => ({
    id: `${classNode.id}-${entity.id}-enum`,
    source: classNode.id,
    target: entity.id,
    type: useCurvedLines ? 'default' : 'step',
    animated: false,
    sourceHandle: 'right-source',
    targetHandle: 'left',
    style: {
      stroke: colors.typeReference,
      strokeWidth: 2,
      strokeDasharray: '5,5',
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: colors.typeReference,
      width: 20,
      height: 20,
    },
  }));

  return {
    nodes: [
      {
        ...entity,
        position: { x: 0, y: 0 },
        data: {
          ...entity.data,
          isHighlighted: true,
          isActive: true,
        },
      },
      ...classNodes,
    ],
    edges,
  };
}

export function attachClassEnums(
  entity: IliNode,
  nodeMap: Map<string, IliNode>,
  relatedNodeIds: Set<string>,
  enumTypes: Set<string>,
  enumEdges: Edge[],
  colors: ThemeColors,
  useCurvedLines: boolean,
  useMagicLayout: boolean,
): void {
  const attributes = entity.data.attributes as IliAttribute[] | undefined;
  if (!attributes) return;

  const totalEnums = attributes.filter(a => a.isEnum || a.isDomainEnum).length || 0;
  const spacingY = useMagicLayout
    ? LAYOUT_CONFIG.ENUM.SPACING_Y * LAYOUT_CONFIG.MAGIC.MULTIPLIER
    : LAYOUT_CONFIG.ENUM.SPACING_Y;
  const totalHeight = (totalEnums - 1) * spacingY;
  const startY = -(totalHeight / 2);

  attributes.forEach((attr, index) => {
    if (!attr.isEnum && !attr.isDomainEnum) return;

    const enumNodeId = attr.isDomainEnum
      ? `domain_${attr.type}`
      : attr.isInlineEnum
        ? `enum_${entity.id}_${attr.name}`
        : `enum_${attr.type}`;

    const enumNode: IliNode = nodeMap.get(enumNodeId) || {
      id: enumNodeId,
      type: attr.isDomainEnum ? 'domainEnumNode' : 'enumNode',
      position: { x: 0, y: 0 },
      data: {
        label: attr.isDomainEnum ? attr.type : attr.name,
        enumValues: attr.enumValues || [],
        isDomainEnum: attr.isDomainEnum,
        isHighlighted: false,
        isActive: false,
        isInlineEnum: attr.isInlineEnum,
        ownerClass: entity.data.label,
        comment: attr.comment,
      },
    };

    enumNode.position = {
      x: LAYOUT_CONFIG.ENUM.OFFSET_X,
      y: startY + index * spacingY,
    };

    enumTypes.add(enumNodeId);
    nodeMap.set(enumNodeId, enumNode);
    relatedNodeIds.add(enumNodeId);

    enumEdges.push({
      id: `${entity.id}-${enumNodeId}-enum`,
      source: entity.id,
      target: enumNodeId,
      type: useCurvedLines ? 'default' : 'step',
      animated: false,
      sourceHandle: 'right-source',
      targetHandle: 'left',
      style: {
        stroke: colors.typeReference,
        strokeWidth: 2,
        strokeDasharray: '5,5',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: colors.typeReference,
        width: 20,
        height: 20,
      },
    });
  });
}
