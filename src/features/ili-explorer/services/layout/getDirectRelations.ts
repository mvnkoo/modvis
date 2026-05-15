import { Edge, MarkerType } from '@xyflow/react';
import type { ThemeColors } from '../../../../common/theme/ThemeContext';
import type { IliNode, LayoutOptions } from '../types/IliBaseTypes';
import { LAYOUT_CONFIG } from './config';
import { calculateSubtypePosition, calculateSuperTypePosition } from './positioning';
import { collectAllSuperTypes, buildSuperTypeLevels } from './hierarchyCollection';
import { layoutEnumCenter, attachClassEnums } from './enumStrategy';
import { layoutAssociationCenter, attachClassAssociations } from './associationStrategy';

interface NodeData {
  [key: string]: unknown;
  isHighlighted: boolean;
  isActive: boolean;
  label?: string;
  expanded?: boolean;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

function isIliNode(node: unknown): node is IliNode {
  return node !== null && typeof (node as IliNode)?.type === 'string';
}

export function getDirectRelations(
  entity: IliNode,
  allNodes: IliNode[],
  allEdges: Edge[],
  colors: ThemeColors,
  options: LayoutOptions,
): { nodes: IliNode[]; edges: Edge[] } {
  const {
    showFullHierarchy,
    useCurvedLines,
    showEnums,
    showAssociations,
    maxSubTypesPerRow,
    useMagicLayout,
  } = options;

  if (!entity || !allNodes || !allEdges) return { nodes: [], edges: [] };

  const nodeMap = new Map(allNodes.map(node => [node.id, node]));
  const relatedNodeIds = new Set([entity.id]);
  const superTypeChain = new Set<string>();
  const subTypeChain = new Set<string>();
  const enumTypes = new Set<string>();
  const containedStructs = new Set<string>();
  const structureOwners = new Set<string>();
  const referenceTargets = new Set<string>();
  const referenceSources = new Set<string>();
  const enumEdges: Edge[] = [];
  let enhancedNodes: IliNode[] = [];

  if (entity.type === 'enumNode' || entity.type === 'ENUMERATION' || entity.type === 'domainEnumNode') {
    return layoutEnumCenter(entity, allNodes, colors, useCurvedLines);
  }

  if (entity.type === 'classNode' && showEnums) {
    attachClassEnums(
      entity,
      nodeMap,
      relatedNodeIds,
      enumTypes,
      enumEdges,
      colors,
      useCurvedLines,
      useMagicLayout,
    );
  }

  if (showAssociations && entity.type === 'classNode') {
    attachClassAssociations(
      entity,
      nodeMap,
      relatedNodeIds,
      enhancedNodes,
      enumEdges,
      colors,
      useCurvedLines,
      useMagicLayout,
    );
  }

  if (entity.type === 'associationNode') {
    if (!showAssociations) return { nodes: [], edges: [] };
    const result = layoutAssociationCenter(entity, allNodes, colors, useCurvedLines);
    if (result) return result;
  }

  collectAllSuperTypes(
    entity.id,
    allEdges,
    nodeMap,
    superTypeChain,
    relatedNodeIds,
    showFullHierarchy,
  );

  for (const edge of allEdges) {
    if (edge.target !== entity.id) continue;
    const rt = (edge.data as { relationType?: string } | undefined)?.relationType;
    if (rt !== undefined && rt !== 'EXTENDS') continue;
    const sourceNode = nodeMap.get(edge.source);
    if (sourceNode) {
      subTypeChain.add(edge.source);
      relatedNodeIds.add(edge.source);
    }
  }

  for (const edge of allEdges) {
    const rt = (edge.data as { relationType?: string } | undefined)?.relationType;
    if (rt !== 'REFERENCES' && rt !== 'CONTAINS') continue;
    if (edge.source === entity.id) {
      relatedNodeIds.add(edge.target);
      if (rt === 'CONTAINS') containedStructs.add(edge.target);
      else if (rt === 'REFERENCES') referenceTargets.add(edge.target);
    } else if (edge.target === entity.id) {
      relatedNodeIds.add(edge.source);
      if (rt === 'CONTAINS') structureOwners.add(edge.source);
      else if (rt === 'REFERENCES') referenceSources.add(edge.source);
    }
  }

  if (!showAssociations) {
    enhancedNodes = enhancedNodes.filter(node => node.type !== 'associationNode');
    const filteredEdges = enumEdges.filter(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      const isAssociationEdge =
        sourceNode?.type === 'associationNode' ||
        targetNode?.type === 'associationNode' ||
        edge.id.includes('assoc_');
      return !isAssociationEdge;
    });
    enumEdges.length = 0;
    enumEdges.push(...filteredEdges);
  }

  const { superTypeLevels, superTypesByLevel } = buildSuperTypeLevels(superTypeChain, allEdges);

  enhancedNodes = Array.from(relatedNodeIds)
    .map(id => {
      const originalNode = nodeMap.get(id);
      if (!originalNode || !isIliNode(originalNode)) return null;

      const nodeData: NodeData = {
        ...originalNode.data,
        isHighlighted: id === entity.id,
        isActive: id === entity.id,
      };

      if (originalNode.data.expanded !== undefined) nodeData.expanded = originalNode.data.expanded;
      if (originalNode.data.isExpanded !== undefined) nodeData.isExpanded = originalNode.data.isExpanded;
      if (originalNode.data.onExpandChange) nodeData.onExpandChange = originalNode.data.onExpandChange;

      let nodeType = originalNode.type;
      if (nodeType === 'ENUMERATION') nodeType = 'enumNode';

      const isAssociation = nodeType === 'associationNode' || originalNode.id.startsWith('assoc_');
      if (isAssociation) {
        return { ...originalNode, type: nodeType, data: nodeData };
      }

      const isSuperType = superTypeChain.has(id);
      const isSubType = subTypeChain.has(id);
      const isEnum = enumTypes.has(id);
      const isContainedStruct = containedStructs.has(id);
      const isStructureOwner = structureOwners.has(id);
      const isReferenceTarget = referenceTargets.has(id);
      const isReferenceSource = referenceSources.has(id);
      const isClassUsingEnum = entity.type === 'enumNode' && originalNode.type === 'classNode';

      const leftColumnOrder: string[] = [
        ...Array.from(structureOwners),
        ...Array.from(referenceSources),
      ];
      const rightColumnOrder: string[] = [
        ...Array.from(referenceTargets),
        ...Array.from(enumTypes),
        ...Array.from(containedStructs),
      ];
      const sideSpacingY = useMagicLayout
        ? LAYOUT_CONFIG.ENUM.SPACING_Y * LAYOUT_CONFIG.MAGIC.ENUM
        : LAYOUT_CONFIG.ENUM.SPACING_Y;
      const rightTotalHeight = (rightColumnOrder.length - 1) * sideSpacingY;
      const rightStartY = -(rightTotalHeight / 2);
      const rightIndex = rightColumnOrder.indexOf(id);
      const leftTotalHeight = (leftColumnOrder.length - 1) * sideSpacingY;
      const leftStartY = -(leftTotalHeight / 2);
      const leftIndex = leftColumnOrder.indexOf(id);

      let position = { x: 0, y: 0 };

      if (isStructureOwner || isReferenceSource) {
        position = {
          x: -LAYOUT_CONFIG.ENUM.OFFSET_X,
          y: leftStartY + leftIndex * sideSpacingY,
        };
      } else if (isReferenceTarget || isContainedStruct) {
        position = {
          x: LAYOUT_CONFIG.ENUM.OFFSET_X,
          y: rightStartY + rightIndex * sideSpacingY,
        };
      } else if (isClassUsingEnum) {
        const classArray = Array.from(relatedNodeIds).filter(nid => {
          const node = nodeMap.get(nid);
          return node && node.type === 'classNode';
        });
        const index = classArray.indexOf(id);
        const totalClasses = classArray.length;
        const groupHeight = totalClasses * (LAYOUT_CONFIG.SPACING.VERTICAL / 2);
        const startY = -(groupHeight / 2) + LAYOUT_CONFIG.SPACING.VERTICAL / 4;

        position = {
          x: -LAYOUT_CONFIG.SPACING.HORIZONTAL,
          y: startY + index * (LAYOUT_CONFIG.SPACING.VERTICAL / 2),
        };
      } else if (isEnum) {
        if (entity.type === 'enumNode') {
          position = { x: 0, y: 0 };
        } else {
          position = {
            x: LAYOUT_CONFIG.ENUM.OFFSET_X,
            y: rightStartY + rightIndex * sideSpacingY,
          };
        }
      } else if (isSuperType) {
        const level = superTypeLevels.get(id) || 0;
        const nodesInLevel = superTypesByLevel.get(level) || [];
        const indexInLevel = nodesInLevel.indexOf(id);
        position = calculateSuperTypePosition(indexInLevel, level, nodesInLevel.length);
      } else if (isSubType) {
        const subTypeArray = Array.from(subTypeChain);
        const index = subTypeArray.indexOf(id);
        position = calculateSubtypePosition(index, subTypeArray.length, maxSubTypesPerRow, useMagicLayout);
      }

      return { ...originalNode, type: nodeType, position, data: nodeData };
    })
    .filter(node => node !== null) as IliNode[];

  const allEdgesResult: Edge[] = [
    ...allEdges
      .filter(edge => relatedNodeIds.has(edge.source) && relatedNodeIds.has(edge.target))
      .map(edge => {
        const rt = (edge.data as { relationType?: string } | undefined)?.relationType;
        if (rt === 'REFERENCES' || rt === 'CONTAINS') {
          return {
            ...edge,
            type: useCurvedLines ? 'default' : 'step',
            animated: false,
            sourceHandle: 'right-source',
            targetHandle: 'left-target',
          };
        }
        return {
          ...edge,
          type: useCurvedLines ? 'default' : 'step',
          animated: false,
          sourceHandle: 'top',
          targetHandle: 'bottom',
          style: { stroke: colors.inheritance, strokeWidth: 2 },
        };
      }),

    ...enumEdges.filter(edge => edge.id.endsWith('-enum')).map(edge => ({
      ...edge,
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
    })),

    ...(showAssociations ? enumEdges.filter(edge => edge.id.endsWith('-assoc')).map(edge => ({ ...edge })) : []),
  ];

  if (!showEnums) {
    const filteredNodes = enhancedNodes.filter(
      node => node.type !== 'enumNode' && !node.id.startsWith('enum_'),
    );
    const filteredEdges = allEdgesResult.filter(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      return !(
        sourceNode?.type === 'enumNode' ||
        sourceNode?.id.startsWith('enum_') ||
        targetNode?.type === 'enumNode' ||
        targetNode?.id.startsWith('enum_')
      );
    });
    return { nodes: filteredNodes, edges: filteredEdges };
  }

  return { nodes: enhancedNodes, edges: allEdgesResult };
}
