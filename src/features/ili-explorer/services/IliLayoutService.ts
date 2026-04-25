import { Node, Edge, Position, MarkerType } from '@xyflow/react';
import { ThemeColors } from '../../../common/theme/ThemeContext';
import { IliAttribute, IliAssociation } from './types/IliBaseTypes';

interface IliNode extends Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    isHighlighted: boolean;
    isActive: boolean;
    [key: string]: any;
  };
}

interface NodeData {
  isHighlighted: boolean;
  isActive: boolean;
  label: string;
  expanded?: boolean;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  [key: string]: any;
}

export class IliLayoutService {
  private static readonly LAYOUT_CONFIG = {
    NODE: {
      HEIGHT: 80,
      MIN_SPACING: 200,
      GROUP_SPACING: 250,
    },
    SPACING: {
      VERTICAL: 370,
      HORIZONTAL: 450,
      ROW: 200,
      SUPERTYPE: -370,
    },
    ENUM: {
      OFFSET_X: 1200,
      SPACING_Y: 170,
      CLASS_SPACING: 170,
    },
    ASSOCIATION: {
      OFFSET_X: -1200,
      SPACING_Y: 170,
      CLASS_SPACING: 1000,
    },
    MAGIC: {
      GAP: 50,
      MULTIPLIER: 2.5,
    }
  } as const;

 
  private static calculateBounds(nodes: IliNode[]): {minX: number; maxX: number; minY: number; maxY: number} {
    return nodes.reduce((acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      maxX: Math.max(acc.maxX, node.position.x),
      minY: Math.min(acc.minY, node.position.y),
      maxY: Math.max(acc.maxY, node.position.y)
    }), {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity
    });
  }

 
  private static isIliNode(node: Node | null): node is IliNode {
    return node !== null && typeof node.type === 'string';
  }

 
  private static areValidNodes(nodes: (Node | null)[]): nodes is IliNode[] {
    return nodes.every(node => this.isIliNode(node));
  }

 
  private static collectAllSuperTypes(
    currentId: string, 
    allEdges: Edge[], 
    nodeMap: Map<string, IliNode>,
    superTypeChain: Set<string>,
    relatedNodeIds: Set<string>,
    showFullHierarchy: boolean,
    visited = new Set<string>()
  ): void {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    allEdges.forEach(edge => {
      if (edge.source === currentId) {
        const targetNode = nodeMap.get(edge.target);
        if (targetNode) {
          superTypeChain.add(edge.target);
          relatedNodeIds.add(edge.target);
          
          if (showFullHierarchy) {
            this.collectAllSuperTypes(
              edge.target,
              allEdges,
              nodeMap,
              superTypeChain,
              relatedNodeIds,
              showFullHierarchy,
              visited
            );
          }
        }
      }
    });
  }

 
  private static calculateSubtypePosition(
    index: number, 
    totalSubTypes: number,
    maxSubTypesPerRow: number,
    heightMap: Map<string, number>,
    subTypes: string[],
    useMagicLayout: boolean = false
  ): { x: number; y: number } {
   
    if (maxSubTypesPerRow === 0 || maxSubTypesPerRow >= totalSubTypes) {
     
      const totalWidth = (totalSubTypes - 1) * this.LAYOUT_CONFIG.SPACING.HORIZONTAL;
      const startX = 0 - (totalWidth / 2);
      return {
        x: startX + (index * this.LAYOUT_CONFIG.SPACING.HORIZONTAL),
        y: this.LAYOUT_CONFIG.SPACING.VERTICAL * (useMagicLayout ? 2 : 1) 
      };
    }

   
    const row = Math.floor(index / maxSubTypesPerRow);
    const col = index % maxSubTypesPerRow;
    
   
    const itemsInLastRow = totalSubTypes - (row * maxSubTypesPerRow);
    const currentRowCount = row === Math.floor((totalSubTypes - 1) / maxSubTypesPerRow)
      ? Math.min(itemsInLastRow, maxSubTypesPerRow)
      : maxSubTypesPerRow;
    
   
    const rowWidth = (currentRowCount - 1) * this.LAYOUT_CONFIG.SPACING.HORIZONTAL;
    const startX = 0 - (rowWidth / 2);
    
   
    const verticalSpacing = useMagicLayout ? 
      this.LAYOUT_CONFIG.SPACING.VERTICAL * 2 : 
      this.LAYOUT_CONFIG.SPACING.VERTICAL;
    
    const rowSpacing = useMagicLayout ? 
      this.LAYOUT_CONFIG.SPACING.ROW * 2 : 
      this.LAYOUT_CONFIG.SPACING.ROW;

    const yPosition = verticalSpacing + (row * rowSpacing);

    return {
      x: startX + (col * this.LAYOUT_CONFIG.SPACING.HORIZONTAL),
      y: yPosition
    };
  }

 
  private static calculateSuperTypePosition(
    index: number,
    level: number,
    totalInLevel: number
  ): { x: number; y: number } {
    const totalWidth = (totalInLevel - 1) * this.LAYOUT_CONFIG.SPACING.HORIZONTAL;
    const startX = 0 - (totalWidth / 2);
    return {
      x: startX + (index * this.LAYOUT_CONFIG.SPACING.HORIZONTAL),
      y: this.LAYOUT_CONFIG.SPACING.SUPERTYPE * (level + 1)
    };
  }

 
  public static getDirectRelations(
    entity: IliNode,
    allNodes: IliNode[],
    allEdges: Edge[],
    colors: ThemeColors,
    nodeHeights: [string, number][] = [],
    showFullHierarchy = false,
    useCurvedLines = true,
    showEnums = true,
    maxSubTypesPerRow = 0,
    showAssociations = true,
    useMagicLayout = false,
  ): { nodes: IliNode[]; edges: Edge[] } {
   
    console.log('getDirectRelations input entity:', {
      id: entity.id,
      type: entity.type,
      data: entity.data,
      showAssociations
    });

   
    if (!entity || !allNodes || !allEdges) return { nodes: [], edges: [] };

   
    const nodeMap = new Map(allNodes.map(node => [node.id, node]));
    const relatedNodeIds = new Set([entity.id]);
    const superTypeChain = new Set<string>();
    const subTypeChain = new Set<string>();
    const enumTypes = new Set<string>();
    const enumEdges: Edge[] = [];
    let enhancedNodes: IliNode[] = [];
    let allEdgesResult: Edge[] = [];

   
    const heightMap = new Map(nodeHeights);

   
    const calculateVerticalOffset = (nodeId: string, baseOffset: number): number => {
      const previousNodes = Array.from(relatedNodeIds)
        .filter(id => {
          const node = nodeMap.get(id);
          return node && node.position.y < baseOffset;
        });

      let offset = baseOffset;
      for (const prevId of previousNodes) {
        const height = heightMap.get(prevId) || this.LAYOUT_CONFIG.NODE.HEIGHT;
        offset += height + this.LAYOUT_CONFIG.SPACING.VERTICAL;
      }
      return offset;
    };

   
    if (entity.type === 'enumNode' || entity.type === 'ENUMERATION' || entity.type === 'domainEnumNode') {
      console.log('Processing enum node:', entity);
      
     
      const relatedClasses = allNodes.filter(node => {
        if (node.type !== 'classNode') return false;
        
       
        return node.data.attributes?.some((attr: IliAttribute) => {
          if (attr.isEnum || attr.isDomainEnum) {
            const enumNodeId = attr.isDomainEnum 
              ? `domain_${attr.type}`
              : attr.isInlineEnum 
                ? `enum_${node.id}_${attr.name}`
                : `enum_${attr.name}`;
            return enumNodeId === entity.id;
          }
          return false;
        });
      });

      console.log('Found related classes:', relatedClasses);

     
      const classNodes = relatedClasses.map((classNode, index) => ({
        ...classNode,
        position: {
          x: -this.LAYOUT_CONFIG.ENUM.OFFSET_X,
          y: index * this.LAYOUT_CONFIG.ENUM.CLASS_SPACING - 
             ((relatedClasses.length - 1) * this.LAYOUT_CONFIG.ENUM.CLASS_SPACING) / 2
        },
        data: {
          ...classNode.data,
          isHighlighted: false,
          isActive: false
        }
      }));

     
      const edges = relatedClasses.map(classNode => ({
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
          strokeDasharray: '5,5'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colors.typeReference,
          width: 20,
          height: 20
        }
      }));

     
      return {
        nodes: [
         
          {
            ...entity,
            position: { x: 0, y: 0 },
            data: {
              ...entity.data,
              isHighlighted: true,
              isActive: true
            }
          },
         
          ...classNodes
        ],
        edges
      };
    }
   
    else if (entity.type === 'classNode' && showEnums) {
      
      entity.data.attributes?.forEach((attr: IliAttribute, index: number) => {
       
        if (attr.isEnum || attr.isDomainEnum) {
         
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
              comment: attr.comment
            }
          };

         
          const totalEnums = entity.data.attributes?.filter((a: IliAttribute) => 
            a.isEnum || a.isDomainEnum
          ).length || 0;

          const spacingY = useMagicLayout ? 
            this.LAYOUT_CONFIG.ENUM.SPACING_Y * this.LAYOUT_CONFIG.MAGIC.MULTIPLIER : 
            this.LAYOUT_CONFIG.ENUM.SPACING_Y;
          
          const totalHeight = (totalEnums - 1) * spacingY;
          const startY = -(totalHeight / 2);
          
          enumNode.position = {
            x: this.LAYOUT_CONFIG.ENUM.OFFSET_X,
            y: startY + (index * spacingY)
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
              strokeDasharray: '5,5'
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: colors.typeReference,
              width: 20,
              height: 20
            }
          });
        }
      });
    }

   
    if (!showAssociations) {
      console.log('Skipping associations because showAssociations is false');
    } else if (entity.type === 'classNode') {
      console.log('Processing associations for class:', entity.data.label);
      console.log('Associations data:', entity.data.associations);
      
      if (entity.data.associations && entity.data.associations.length > 0) {
       
        const placedNodes = Array.from(relatedNodeIds)
          .map(nid => nodeMap.get(nid))
          .filter((n): n is IliNode => {
            if (!n) return false;
            if (!entity.data.associations) return false;
            return !entity.data.associations.some((assoc: IliAssociation) => 
              `assoc_${assoc.name}_${entity.id}` === n.id
            );
          });
        
        const bounds = this.calculateBounds(placedNodes);
        
       
        const sortedAssociations = [...entity.data.associations].sort((a, b) => {
          const aIsSource = a.sourceClass === entity.data.label;
          const bIsSource = b.sourceClass === entity.data.label;
          return Number(aIsSource) - Number(bIsSource);
        });

        console.log('Sorted associations:', sortedAssociations);

       
        sortedAssociations.forEach((assoc, index) => {
          const baseX = this.LAYOUT_CONFIG.ASSOCIATION.OFFSET_X;
         
          const activeNodeY = entity.position.y;
          const totalAssociations = sortedAssociations.length;
          const spacingY = useMagicLayout ? 
            this.LAYOUT_CONFIG.ASSOCIATION.SPACING_Y * this.LAYOUT_CONFIG.MAGIC.MULTIPLIER : 
            this.LAYOUT_CONFIG.ASSOCIATION.SPACING_Y;
          const totalHeight = (totalAssociations - 1) * spacingY;
          const startY = activeNodeY - (totalHeight / 2);
          
          const position = {
            x: baseX,
            y: startY + (index * spacingY)
          };

         
          const isSource = assoc.sourceClass === entity.data.label;
          const associationNodeId = `assoc_${assoc.name}_${entity.id}`;

          const associationNode: IliNode = {
            id: associationNodeId,
            type: 'associationNode',
            position,
            data: {
              label: assoc.name,
              association: assoc,
              isHighlighted: false,
              isActive: false,
              isSource,
              expanded: false,
             
              showArrow: true,
              arrowDirection: isSource ? 'left' : 'right'
            }
          };

          console.log('Created association node:', associationNode);

          nodeMap.set(associationNodeId, associationNode);
          relatedNodeIds.add(associationNodeId);
          enhancedNodes.push(associationNode);

         
          enumEdges.push({
            id: `${entity.id}-${associationNodeId}-assoc`,
            source: isSource ? entity.id : associationNodeId,
            target: isSource ? associationNodeId : entity.id,
            type: useCurvedLines ? 'default' : 'step',
            animated: false,
            sourceHandle: isSource ? 'left-source' : 'right-source',
            targetHandle: isSource ? 'right-target' : 'left-target',
            style: { 
              stroke: colors.relationship,
              strokeWidth: 2,
              strokeDasharray: '5,5'
            },
            markerEnd: {
              type: MarkerType.Arrow,
              color: colors.relationship,
              width: 20,
              height: 20
            }
          });
        });
      }
    }

   
    if (entity.type === 'associationNode') {
     
      if (!showAssociations) {
        return { nodes: [], edges: [] };
      }

      console.log('Processing active association node:', entity.data.label);
      
     
      console.log('All available nodes:', allNodes.map(n => ({
        label: n.data.label,
        type: n.type,
        id: n.id
      })));
      
     
      const sourceClass = allNodes.find(n => 
        n.data.label === entity.data.association.sourceClass ||
        n.data.label === entity.data.association.sourceClass.split('.').pop()
      );
      
      const targetClass = allNodes.find(n => 
        n.data.label === entity.data.association.targetClass ||
        n.data.label === entity.data.association.targetClass.split('.').pop()
      );

     
      const unloadedSourceNode = !sourceClass ? {
        id: `unloaded_${entity.data.association.sourceClass}`,
        type: 'unloadedClassNode',
        position: { x: -this.LAYOUT_CONFIG.ASSOCIATION.CLASS_SPACING, y: 0 },
        data: {
          label: 'External Class',
          className: entity.data.association.sourceClass,
          isHighlighted: false,
          isActive: false
        }
      } : null;

     
      if (targetClass || sourceClass) {
        const nodes: IliNode[] = [];
        const edges: Edge[] = [];

       
        if (sourceClass) {
          nodes.push({
            ...sourceClass,
            position: { x: -this.LAYOUT_CONFIG.ASSOCIATION.CLASS_SPACING, y: 0 },
            data: { ...sourceClass.data, isHighlighted: false, isActive: false }
          });
        } else if (unloadedSourceNode) {
          nodes.push(unloadedSourceNode);
        }

       
        nodes.push({
          ...entity,
          position: { x: 0, y: 0 },
          data: { ...entity.data, isHighlighted: true, isActive: true }
        });

       
        if (targetClass) {
          nodes.push({
            ...targetClass,
            position: { x: this.LAYOUT_CONFIG.ASSOCIATION.CLASS_SPACING, y: 0 },
            data: { ...targetClass.data, isHighlighted: false, isActive: false }
          });
        }

       
        if (sourceClass || unloadedSourceNode) {
          edges.push({
            id: `${sourceClass?.id || unloadedSourceNode?.id || 'unknown'}-${entity.id}-source`,
            source: sourceClass?.id || unloadedSourceNode?.id || 'unknown',
            target: entity.id,
            type: useCurvedLines ? 'default' : 'step',
            animated: false,
            sourceHandle: 'right-source',
            targetHandle: 'left-target',
            style: { 
              stroke: colors.relationship,
              strokeWidth: 2,
              strokeDasharray: '5,5'
            }
          });
        }

        if (targetClass) {
          edges.push({
            id: `${entity.id}-${targetClass.id}-target`,
            source: entity.id,
            target: targetClass.id,
            type: useCurvedLines ? 'default' : 'step',
            animated: false,
            sourceHandle: 'right-source',
            targetHandle: 'left-target',
            style: { 
              stroke: colors.relationship,
              strokeWidth: 2,
              strokeDasharray: '5,5'
            }
          });
        }

        return { nodes, edges };
      }
    }

   
    this.collectAllSuperTypes(
      entity.id,
      allEdges,
      nodeMap,
      superTypeChain,
      relatedNodeIds,
      showFullHierarchy
    );

   
    allEdges.forEach(edge => {
      if (edge.target === entity.id) {
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode) {
          subTypeChain.add(edge.source);
          relatedNodeIds.add(edge.source);
        }
      }
    });

   
    if (!showAssociations) {
      console.log('Removing all association nodes and edges');
      enhancedNodes = enhancedNodes.filter(node => node.type !== 'associationNode');
      const filteredEdges = enumEdges.filter(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        const isAssociationEdge = sourceNode?.type === 'associationNode' || 
                                targetNode?.type === 'associationNode' ||
                                edge.id.includes('assoc_');
        return !isAssociationEdge;
      });
      enumEdges.length = 0;
      enumEdges.push(...filteredEdges);
    }

   
    const superTypeLevels = new Map<string, number>();
    const superTypesByLevel = new Map<number, string[]>();
    
   
    const calculateSuperTypeLevel = (nodeId: string, level = 0, visited = new Set<string>()) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      superTypeLevels.set(nodeId, level);
      if (!superTypesByLevel.has(level)) {
        superTypesByLevel.set(level, []);
      }
      superTypesByLevel.get(level)?.push(nodeId);
      
      allEdges.forEach(edge => {
        if (edge.source === nodeId && superTypeChain.has(edge.target)) {
          calculateSuperTypeLevel(edge.target, level + 1, visited);
        }
      });
    };

    Array.from(superTypeChain).forEach(id => {
      if (!superTypeLevels.has(id)) {
        calculateSuperTypeLevel(id);
      }
    });

   
    const calculateBounds = (nodes: IliNode[]): {minX: number; maxX: number; minY: number; maxY: number} => {
      return nodes.reduce((acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y)
      }), {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
      });
    };

   
    const originalExpandedStates = new Map(
      allNodes.map(node => [node.id, {
        expanded: node.data?.expanded,
        isExpanded: node.data?.isExpanded,
        onExpandChange: node.data?.onExpandChange
      }])
    );

   
    enhancedNodes = Array.from(relatedNodeIds)
      .map(id => {
        const originalNode = nodeMap.get(id);
        if (!originalNode || !this.isIliNode(originalNode)) return null;

       
        const nodeData: NodeData = {
          ...originalNode.data,
          isHighlighted: id === entity.id,
          isActive: id === entity.id,
        };

       
        if (originalNode.data.expanded !== undefined) {
          nodeData.expanded = originalNode.data.expanded;
        }
        if (originalNode.data.isExpanded !== undefined) {
          nodeData.isExpanded = originalNode.data.isExpanded;
        }
        if (originalNode.data.onExpandChange) {
          nodeData.onExpandChange = originalNode.data.onExpandChange;
        }

       
        let nodeType = originalNode.type;
        if (nodeType === 'ENUMERATION') {
          nodeType = 'enumNode';
        }

       
        const isAssociation = nodeType === 'associationNode' || 
                             originalNode.id.startsWith('assoc_');
        
       
        if (isAssociation) {
          return {
            ...originalNode,
            type: nodeType,
            data: nodeData
          };
        }  

       
        const isSuperType = superTypeChain.has(id);
        const isSubType = subTypeChain.has(id);
        const isEnum = enumTypes.has(id);
        const isCenter = id === entity.id;
        const isClassUsingEnum = entity.type === 'enumNode' && originalNode.type === 'classNode';

        let position = { x: 0, y: 0 };

        if (isClassUsingEnum) {
         
          const classArray = Array.from(relatedNodeIds).filter(nid => {
            const node = nodeMap.get(nid);
            return node && node.type === 'classNode';
          });
          const index = classArray.indexOf(id);
          const totalClasses = classArray.length;
          const groupHeight = totalClasses * (this.LAYOUT_CONFIG.SPACING.VERTICAL / 2);
          const startY = -(groupHeight / 2) + (this.LAYOUT_CONFIG.SPACING.VERTICAL / 4);
          
          position = {
            x: -this.LAYOUT_CONFIG.SPACING.HORIZONTAL,
            y: startY + index * (this.LAYOUT_CONFIG.SPACING.VERTICAL / 2)
          };
        } else if (isEnum) {
          if (entity.type === 'enumNode') {
           
            position = { x: 0, y: 0 };
          } else {
           
            const enumArray = Array.from(enumTypes);
            const index = enumArray.indexOf(id);
            const totalEnums = enumArray.length;
            const spacingY = useMagicLayout ? 
              this.LAYOUT_CONFIG.ENUM.SPACING_Y * this.LAYOUT_CONFIG.MAGIC.MULTIPLIER : 
              this.LAYOUT_CONFIG.ENUM.SPACING_Y;
            
           
            const totalHeight = (totalEnums - 1) * spacingY;
            
           
            const startY = -(totalHeight / 2);
            
            position = {
              x: this.LAYOUT_CONFIG.ENUM.OFFSET_X,
              y: startY + (index * spacingY)
            };
          }
        } else if (isSuperType) {
          const level = superTypeLevels.get(id) || 0;
          const nodesInLevel = superTypesByLevel.get(level) || [];
          const indexInLevel = nodesInLevel.indexOf(id);
          position = this.calculateSuperTypePosition(
            indexInLevel,
            level,
            nodesInLevel.length
          );
        } else if (isSubType) {
          const subTypeArray = Array.from(subTypeChain);
          const index = subTypeArray.indexOf(id);
          position = this.calculateSubtypePosition(
            index,
            subTypeArray.length,
            maxSubTypesPerRow,
            heightMap,
            subTypeArray,
            useMagicLayout
          );
        }

       
        console.log('Processing node:', {
          id: originalNode.id,
          type: originalNode.type,
          originalExpanded: originalNode.data?.expanded,
          currentExpanded: originalNode.data?.expanded
        });

        return {
          ...originalNode,
          type: nodeType,
          position,
          data: nodeData
        };
      })
      .filter((node): node is IliNode => node !== null);

   
    allEdgesResult = [
     
      ...allEdges
        .filter(edge => relatedNodeIds.has(edge.source) && relatedNodeIds.has(edge.target))
        .map(edge => ({
          ...edge,
          id: `${edge.source}-${edge.target}-${Date.now()}`,
          type: useCurvedLines ? 'default' : 'step',
          animated: false,
          sourceHandle: 'top',
          targetHandle: 'bottom',
          style: { 
            stroke: colors.inheritance,
            strokeWidth: 2
          }
        })),

     
      ...enumEdges.filter(edge => edge.id.includes('enum_')).map(edge => ({
        ...edge,
        sourceHandle: 'right-source',
        targetHandle: 'left',
        style: { 
          stroke: colors.typeReference,
          strokeWidth: 2,
          strokeDasharray: '5,5'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colors.typeReference,
          width: 20,
          height: 20
        }
      })),

     
      ...(showAssociations ? enumEdges.filter(edge => edge.id.includes('assoc_')).map(edge => ({
        ...edge,
       
      })) : [])
    ];

    const result = {
      nodes: enhancedNodes,
      edges: allEdgesResult
    };

   
    console.log('Final result:', {
      nodeCount: result.nodes.length,
      edgeCount: result.edges.length,
      associationNodes: result.nodes.filter(n => n.type === 'associationNode').length,
      showAssociations
    });

    console.log('Node data before processing:', {
      nodeId: entity.id,
      type: entity.type,
      expanded: entity.data.expanded,
      useMagicLayout
    });

    console.log('Final nodes expanded states:', enhancedNodes.map(node => ({
      id: node.id,
      type: node.type,
      expanded: node.data.expanded
    })));

    if (!showEnums) {
     
     
      const filteredNodes = enhancedNodes.filter(node => 
        node.type !== 'enumNode' && !node.id.startsWith('enum_')
      );
      
      const filteredEdges = allEdgesResult.filter(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        return !(
          (sourceNode?.type === 'enumNode' || sourceNode?.id.startsWith('enum_')) ||
          (targetNode?.type === 'enumNode' || targetNode?.id.startsWith('enum_'))
        );
      });

      return {
        nodes: filteredNodes,
        edges: filteredEdges
      };
    }

    return {
      nodes: enhancedNodes,
      edges: allEdgesResult
    };
  }

 
  private static calculateSuperTypeLevel(
    typeId: string,
    startId: string,
    nodeMap: Map<string, IliNode>,
    edges: Edge[]
  ): number {
    let level = 0;
    let currentId = startId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      
      const edge = edges.find(e => e.source === currentId);
      if (!edge) break;

      if (edge.target === typeId) {
        return level + 1;
      }

      currentId = edge.target;
      level++;
    }

    return level;
  }

 
  private static isValidNode(node: any): node is IliNode {
    return (
      node &&
      typeof node.id === 'string' &&
      typeof node.type === 'string' &&
      node.position &&
      typeof node.position.x === 'number' &&
      typeof node.position.y === 'number' &&
      node.data &&
      typeof node.data.label === 'string'
    );
  }

 
  private static filterValidNodes(nodes: any[]): IliNode[] {
    return nodes.filter(this.isValidNode);
  }
} 