import { Edge, MarkerType } from '@xyflow/react';
import type { ThemeColors } from '../../../../common/theme/ThemeContext';
import type { IliAssociation, IliNode } from '../types/IliBaseTypes';
import { LAYOUT_CONFIG } from './config';

export function layoutAssociationCenter(
  entity: IliNode,
  allNodes: IliNode[],
  colors: ThemeColors,
  useCurvedLines: boolean,
): { nodes: IliNode[]; edges: Edge[] } | null {
  const association = entity.data.association as IliAssociation;

  const sourceClass = allNodes.find(n =>
    n.data.label === association.sourceClass ||
    n.data.label === association.sourceClass.split('.').pop(),
  );
  const targetClass = allNodes.find(n =>
    n.data.label === association.targetClass ||
    n.data.label === association.targetClass.split('.').pop(),
  );

  const unloadedSourceNode: IliNode | null = !sourceClass
    ? {
        id: `unloaded_${association.sourceClass}`,
        type: 'unloadedClassNode',
        position: { x: -LAYOUT_CONFIG.ASSOCIATION.CLASS_SPACING, y: 0 },
        data: {
          label: 'External Class',
          className: association.sourceClass,
          isHighlighted: false,
          isActive: false,
        },
      }
    : null;

  if (!targetClass && !sourceClass) return null;

  const isSelfAssoc = !!sourceClass && !!targetClass && sourceClass.id === targetClass.id;

  const nodes: IliNode[] = [];
  const edges: Edge[] = [];

  if (sourceClass) {
    nodes.push({
      ...sourceClass,
      position: { x: -LAYOUT_CONFIG.ASSOCIATION.CLASS_SPACING, y: 0 },
      data: { ...sourceClass.data, isHighlighted: false, isActive: false },
    });
  } else if (unloadedSourceNode) {
    nodes.push(unloadedSourceNode);
  }

  nodes.push({
    ...entity,
    position: { x: 0, y: 0 },
    data: { ...entity.data, isHighlighted: true, isActive: true },
  });

  if (targetClass && !isSelfAssoc) {
    nodes.push({
      ...targetClass,
      position: { x: LAYOUT_CONFIG.ASSOCIATION.CLASS_SPACING, y: 0 },
      data: { ...targetClass.data, isHighlighted: false, isActive: false },
    });
  }

  if (sourceClass || unloadedSourceNode) {
    const sourceId = sourceClass?.id || unloadedSourceNode?.id || 'unknown';
    edges.push({
      id: `${sourceId}-${entity.id}-source`,
      source: sourceId,
      target: entity.id,
      type: useCurvedLines ? 'default' : 'step',
      animated: true,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      style: {
        stroke: colors.relationship,
        strokeWidth: 2,
        strokeDasharray: '5,5',
      },
    });
  }

  if (targetClass && !isSelfAssoc) {
    edges.push({
      id: `${entity.id}-${targetClass.id}-target`,
      source: entity.id,
      target: targetClass.id,
      type: useCurvedLines ? 'default' : 'step',
      animated: true,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      style: {
        stroke: colors.relationship,
        strokeWidth: 2,
        strokeDasharray: '5,5',
      },
    });
  }

  return { nodes, edges };
}

export function attachClassAssociations(
  entity: IliNode,
  nodeMap: Map<string, IliNode>,
  relatedNodeIds: Set<string>,
  enhancedNodes: IliNode[],
  enumEdges: Edge[],
  colors: ThemeColors,
  useCurvedLines: boolean,
  useMagicLayout: boolean,
): void {
  const associations = entity.data.associations as IliAssociation[] | undefined;
  if (!associations || associations.length === 0) return;

  const sortedAssociations = [...associations].sort((a, b) => {
    const aIsSource = a.sourceClass === entity.data.label;
    const bIsSource = b.sourceClass === entity.data.label;
    return Number(aIsSource) - Number(bIsSource);
  });

  const baseX = LAYOUT_CONFIG.ASSOCIATION.OFFSET_X;
  // Active node is positioned at the origin by getDirectRelations; center
  // associations around y=0 instead of the incoming click position.
  const activeNodeY = 0;
  const totalAssociations = sortedAssociations.length;
  const spacingY = useMagicLayout
    ? LAYOUT_CONFIG.ASSOCIATION.SPACING_Y * LAYOUT_CONFIG.MAGIC.ASSOCIATION
    : LAYOUT_CONFIG.ASSOCIATION.SPACING_Y;
  const totalHeight = (totalAssociations - 1) * spacingY;
  const startY = activeNodeY - totalHeight / 2;

  sortedAssociations.forEach((assoc, index) => {
    const isSource = assoc.sourceClass === entity.data.label;
    const associationNodeId = `assoc_${assoc.name}_${entity.id}`;

    const associationNode: IliNode = {
      id: associationNodeId,
      type: 'associationNode',
      position: { x: baseX, y: startY + index * spacingY },
      data: {
        label: assoc.name,
        association: assoc,
        isHighlighted: false,
        isActive: false,
        isSource,
        expanded: false,
        showArrow: true,
        arrowDirection: isSource ? 'left' : 'right',
      },
    };

    nodeMap.set(associationNodeId, associationNode);
    relatedNodeIds.add(associationNodeId);
    enhancedNodes.push(associationNode);

    enumEdges.push({
      id: `${entity.id}-${associationNodeId}-assoc`,
      source: isSource ? entity.id : associationNodeId,
      target: isSource ? associationNodeId : entity.id,
      type: useCurvedLines ? 'default' : 'step',
      animated: true,
      sourceHandle: isSource ? 'left-source' : 'right-source',
      targetHandle: isSource ? 'right-target' : 'left-target',
      style: {
        stroke: colors.relationship,
        strokeWidth: 2,
        strokeDasharray: '5,5',
      },
      markerEnd: {
        type: MarkerType.Arrow,
        color: colors.relationship,
        width: 20,
        height: 20,
      },
    });
  });
}
