import { 
  SchemaNode, 
  SchemaData, 
  SchemaEdge, 
  SchemaColors,
  AttributeData,
  LayoutAnalysis
} from '../types/expTypes';
import { MarkerType } from 'reactflow';

export class ExpSchemaService {
  private static readonly CONSTANTS = {
    NODE_HEIGHT: 80,
    MIN_NODE_SPACING: 200,
    GROUP_SPACING: 250,
    VERTICAL_SPACING: 400,
    HORIZONTAL_SPACING: 450,
    BASE_X: 1000
  };

  // Schema Parsing
  public static parseExpressSchema(schemaContent: string | null): SchemaData {
    if (!schemaContent) return { nodes: [], edges: [] };

    const nodes = new Map<string, SchemaNode>();
    const normalizedContent = this.normalizeContent(schemaContent);

    // Parse TYPE definitions
    this.parseTypeDefinitions(normalizedContent, nodes);
    
    // Parse ENTITY definitions
    this.parseEntityDefinitions(normalizedContent, nodes);

    return { 
      nodes: Array.from(nodes.values()),
      edges: []
    };
  }

  private static normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s+/g, '\n')
      .trim();
  }

  private static parseTypeDefinitions(content: string, nodes: Map<string, SchemaNode>): void {
    const typeRegex = /TYPE\s+(\w+)\s*=\s*([\s\S]*?)END_TYPE;/g;
    let match;
    while ((match = typeRegex.exec(content)) !== null) {
      const [, typeName, typeContent] = match;
      const isEnum = typeContent.includes('ENUMERATION OF');
      
      // Parse Enum-Werte
      const enumValues = isEnum ? this.parseEnumValues(typeContent) : null;
      
      console.log(`Parsing enum ${typeName}:`, { isEnum, enumValues }); // Debug-Log
      
      const node: SchemaNode = {
        id: typeName,
        type: isEnum ? 'enumNode' : 'typeNode',
        position: { x: 0, y: 0 },
        data: {
          label: typeName,
          isEnum,
          enumValues,
          baseType: isEnum ? 'ENUMERATION' : typeContent.trim(),
          superTypes: [],
          subTypes: []
        }
      };
      
      nodes.set(typeName, node);
    }
  }

  private static parseEntityDefinitions(content: string, nodes: Map<string, SchemaNode>): void {
    // Teile den Content in Blöcke auf
    const entityBlocks = content.split('ENTITY');
    
    entityBlocks.forEach(block => {
      if (!block.trim().startsWith('ENTITY')) {
        try {
          // Extrahiere den Entity-Namen
          const nameMatch = block.match(/^\s*(\w+)/);
          if (!nameMatch) return;
          
          const entityName = nameMatch[1];
          
          // Prüfe auf ABSTRACT
          const isAbstract = block.includes('ABSTRACT');
          
          // Extrahiere Supertypen
          const superTypeMatch = block.match(/SUBTYPE\s+OF\s*\(([^)]+)\)/);
          const superTypes = superTypeMatch 
            ? superTypeMatch[1].split(',').map(t => t.trim()) 
            : [];

          // Parse Attribute
          const attributes = this.parseAttributes(block);

          // Parse WHERE-Klausel
          const whereClause = this.parseWhereClause(block);

          console.log('Found Entity:', {
            name: entityName,
            superTypes,
            isAbstract,
            attributeCount: attributes.length
          });

          // Erstelle Node
          const node: SchemaNode = {
            id: entityName,
            type: 'entityNode',
            position: { x: 0, y: 0 },
            data: {
              label: entityName,
              attributes,
              superTypes,
              subTypes: [],
              where: whereClause,
              isEnum: false,
              isAbstract,
              isHighlighted: false
            }
          };

          nodes.set(entityName, node);
        } catch (error) {
          console.error('Error processing entity block:', error);
        }
      }
    });

    // Debug-Ausgabe
    console.log('Total Entities found:', nodes.size);
    console.log('Entity Names:', Array.from(nodes.keys()));

    // Nachbearbeitung: Setze Subtypen
    for (const node of Array.from(nodes.values())) {
      if (node.data.superTypes) {
        for (const superType of node.data.superTypes) {
          const superNode = nodes.get(superType);
          if (superNode) {
            if (!superNode.data.subTypes) {
              superNode.data.subTypes = [];
            }
            superNode.data.subTypes.push(node.id);
          }
        }
      }
    }
  }

  private static parseAttributes(entityContent: string): AttributeData[] {
    const attributes: AttributeData[] = [];
    // Regex für Attribute
    const attrRegex = /^\s*(\w+)\s*:\s*(OPTIONAL\s+)?([^;]+);/gm;
    
    let match;
    while ((match = attrRegex.exec(entityContent)) !== null) {
      const [, name, optional, type] = match;
      const cleanType = type.trim();
      
      attributes.push({
        name,
        type: cleanType,
        isOptional: !!optional,
        isEnum: cleanType.endsWith('Enum'),
        isPset: name.includes('_Pset_'),
        isReference: cleanType.startsWith('Ifc')
      });
    }

    return attributes;
  }

  private static parseEnumValues(typeContent: string): string[] {
    // Suche nach dem ENUMERATION OF Block
    const enumMatch = typeContent.match(/ENUMERATION\s+OF\s*\(([\s\S]*?)\)/i);
    if (!enumMatch) return [];

    // Extrahiere die Werte und bereinige sie
    const enumValuesString = enumMatch[1];
    return enumValuesString
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0);
  }

  private static parseWhereClause(entityContent: string): string | null {
    const whereMatch = entityContent.match(/WHERE\s+([\s\S]*?)(?=END_ENTITY|$)/);
    return whereMatch ? whereMatch[1].trim() : null;
  }

  // Edge Creation
  public static createInheritanceEdge(
    sourceId: string,
    targetId: string,
    colors: SchemaColors,
    useCurvedLines: boolean
  ): SchemaEdge {
    return {
      id: `${sourceId}-${targetId}-inheritance`,
      source: sourceId,
      target: targetId,
      type: useCurvedLines ? 'default' : 'step',
      style: { 
        stroke: colors.inheritance, 
        strokeWidth: 2 
      },
      sourceHandle: 'top',
      targetHandle: 'bottom',
      markerEnd: {
        type: MarkerType.Arrow,
        color: colors.inheritance
      }
    };
  }

  public static createTypeReferenceEdge(
    sourceId: string,
    targetId: string,
    propertyName: string,
    colors: SchemaColors,
    useCurvedLines: boolean
  ): SchemaEdge {
    return {
      id: `${sourceId}-${targetId}-typeref-${propertyName}`,
      source: sourceId,
      target: targetId,
      type: useCurvedLines ? 'typeRef' : 'step',
      style: { 
        stroke: colors.typeReference,
        strokeWidth: 1,
        strokeDasharray: '5,5'
      },
      sourceHandle: 'right',
      targetHandle: 'left',
      data: {
        propertyName
      },
      markerEnd: {
        type: MarkerType.Arrow,
        color: colors.typeReference
      }
    };
  }

  // Layout & Visualization
  public static getDirectRelations(
    entity: SchemaNode,
    allNodes: SchemaNode[],
    allEdges: SchemaEdge[],
    colors: SchemaColors,
    fullSuperTypes: string[] = [],
    showFullHierarchy = false,
    useCurvedLines = true
  ): SchemaData {
    if (!entity || !allNodes || !allEdges) return { nodes: [], edges: [] };

    const nodeMap = new Map(allNodes.map(node => [node.id, node]));
    const relatedNodeIds = new Set([entity.id]);
    const superTypeChain = new Set<string>();
    const subTypeChain = new Set<string>();
    const enumTypes = new Set<string>();
    const enumUsers = new Set<string>();

    // Wenn der zentrale Node ein Enum ist, finde alle Entities die es verwenden
    if (entity.data.isEnum) {
      allNodes.forEach(node => {
        if (node.type === 'entityNode') {
          node.data.attributes?.forEach(attr => {
            if (attr.type === entity.id) {
              enumUsers.add(node.id);
              relatedNodeIds.add(node.id);
            }
          });
        }
      });
    } else {
      // Sammle Enums aus den Attributen wie bisher
      entity.data.attributes?.forEach(attr => {
        const referencedNode = allNodes.find(n => n.id === attr.type);
        if (referencedNode && referencedNode.data.isEnum) {
          enumTypes.add(referencedNode.id);
          relatedNodeIds.add(referencedNode.id);
        }
      });
    }

    const collectSuperTypes = (typeId: string) => {
        const node = nodeMap.get(typeId);
        if (node?.data.superTypes) {
            node.data.superTypes.forEach(superTypeId => {
                if (!superTypeChain.has(superTypeId)) {
                    superTypeChain.add(superTypeId);
                    relatedNodeIds.add(superTypeId);
                    if (showFullHierarchy) {
                        collectSuperTypes(superTypeId);
                    }
                }
            });
        }
    };

    const collectDirectSubTypes = (typeId: string) => {
        const directSubTypes = allNodes
            .filter(node => node.data.superTypes?.includes(typeId))
            .map(node => node.id);

        directSubTypes.forEach(subTypeId => {
            if (!subTypeChain.has(subTypeId)) {
                subTypeChain.add(subTypeId);
                relatedNodeIds.add(subTypeId);
            }
        });
    };

    if (entity.data.superTypes) {
        entity.data.superTypes.forEach(superTypeId => {
            superTypeChain.add(superTypeId);
            relatedNodeIds.add(superTypeId);
            if (showFullHierarchy) {
                collectSuperTypes(superTypeId);
            }
        });
    }

    collectDirectSubTypes(entity.id);

    // Berechne die Breite der Subtypen-Gruppe
    const subTypesWidth = subTypeChain.size > 0 
        ? (this.CONSTANTS.HORIZONTAL_SPACING * (subTypeChain.size - 1)) / 2
        : 0;

    // Position für Enums
    const enumOffset = this.CONSTANTS.BASE_X + subTypesWidth + this.CONSTANTS.HORIZONTAL_SPACING * 1.5;

    const enhancedNodes = Array.from(relatedNodeIds)
        .map(id => {
            const node = nodeMap.get(id);
            if (!node) return null;

            const isSuperType = superTypeChain.has(id);
            const isSubType = subTypeChain.has(id);
            const isEnum = enumTypes.has(id);
            const isEnumUser = enumUsers.has(id);
            const isCenter = id === entity.id;

            let position = { x: this.CONSTANTS.BASE_X, y: 0 };

            if (isEnum) {
                const enumArray = Array.from(enumTypes);
                const totalEnums = enumArray.length;
                const index = enumArray.indexOf(id);
                
                const groupHeight = totalEnums * (this.CONSTANTS.VERTICAL_SPACING / 2);
                const startY = -(groupHeight / 2) + (this.CONSTANTS.VERTICAL_SPACING / 4);
                
                position = {
                    x: enumOffset,
                    y: startY + index * this.CONSTANTS.VERTICAL_SPACING / 2
                };
            } else if (isEnumUser) {
                // Positioniere Enum-Benutzer weiter links vom Enum
                const userArray = Array.from(enumUsers);
                const totalUsers = userArray.length;
                const index = userArray.indexOf(id);
                
                const groupHeight = totalUsers * (this.CONSTANTS.VERTICAL_SPACING / 2);
                const startY = -(groupHeight / 2) + (this.CONSTANTS.VERTICAL_SPACING / 4);
                
                position = {
                    x: this.CONSTANTS.BASE_X - (this.CONSTANTS.HORIZONTAL_SPACING * 2),
                    y: startY + index * this.CONSTANTS.VERTICAL_SPACING / 2
                };
            } else if (isSuperType) {
                const level = this.calculateSuperTypeLevel(id, entity.id, nodeMap);
                position = {
                    x: this.CONSTANTS.BASE_X,
                    y: -this.CONSTANTS.VERTICAL_SPACING * level
                };
            } else if (isSubType) {
                const subTypeArray = Array.from(subTypeChain);
                const index = subTypeArray.indexOf(id);
                const totalSubTypes = subTypeArray.length;
                const offset = (index - (totalSubTypes - 1) / 2) * this.CONSTANTS.HORIZONTAL_SPACING;
                position = {
                    x: this.CONSTANTS.BASE_X + offset,
                    y: this.CONSTANTS.VERTICAL_SPACING
                };
            }

            return {
                ...node,
                position,
                data: {
                    ...node.data,
                    isHighlighted: isCenter
                }
            } as SchemaNode;
        })
        .filter((node): node is SchemaNode => node !== null);

    // Erstelle Kanten für Enum-Benutzer
    const edges = [
        ...this.createEdges(enhancedNodes, entity, relatedNodeIds, colors, useCurvedLines),
        // Füge Kanten für Enum-Benutzer hinzu
        ...Array.from(enumUsers).map(userId => {
            const userNode = nodeMap.get(userId);
            if (!userNode) return null;
            
            // Finde das entsprechende Attribut, das das Enum verwendet
            const attribute = userNode.data.attributes?.find(attr => attr.type === entity.id);
            if (!attribute) return null;

            return this.createTypeReferenceEdge(
                userId,
                entity.id,
                attribute.name,
                colors,
                useCurvedLines
            );
        }).filter((edge): edge is SchemaEdge => edge !== null)
    ];

    return {
        nodes: enhancedNodes,
        edges
    };
  }

  private static calculateSuperTypeLevel(
    typeId: string,
    startId: string,
    nodeMap: Map<string, SchemaNode>
  ): number {
    let level = 1;
    let currentId = startId;
    
    while (currentId) {
        const currentNode = nodeMap.get(currentId);
        if (!currentNode?.data.superTypes) break;
        
        if (currentNode.data.superTypes.includes(typeId)) {
            return level;
        }
        
        currentId = currentNode.data.superTypes[0];
        level++;
    }
    
    return level;
  }

  private static calculateLayout(
    entity: SchemaNode,
    subTypes: string[],
    superTypes: string[]
  ): LayoutAnalysis {
    return {
      entitySpacing: this.CONSTANTS.NODE_HEIGHT + this.CONSTANTS.MIN_NODE_SPACING,
      enumSpacing: this.CONSTANTS.NODE_HEIGHT + this.CONSTANTS.MIN_NODE_SPACING,
      entityGroupStart: -this.CONSTANTS.VERTICAL_SPACING * superTypes.length,
      enumGroupStart: this.CONSTANTS.VERTICAL_SPACING,
      boundaries: {
        entityGroup: { height: this.CONSTANTS.VERTICAL_SPACING * superTypes.length },
        enumGroup: { height: this.CONSTANTS.VERTICAL_SPACING * subTypes.length },
        total: this.CONSTANTS.VERTICAL_SPACING * (superTypes.length + subTypes.length)
      }
    };
  }

  // Domain Classification
  public static getDomainFromEntity(entityName: string): string {
    if (!entityName) return 'Other';
    
    // Generische Domänen-Erkennung basierend auf Präfix
    const match = entityName.match(/^([A-Z][a-z]+)/);
    if (match) {
        const prefix = match[1];
        // Gruppiere Entitäten nach ihrem Präfix
        return `${prefix} Domain`;
    }
    
    return 'Other';
  }

  private static createEdges(
    nodes: SchemaNode[],
    entity: SchemaNode,
    relatedNodeIds: Set<string>,
    colors: SchemaColors,
    useCurvedLines: boolean
  ): SchemaEdge[] {
    const edges: SchemaEdge[] = [];

    nodes.forEach(node => {
        if (node.id === entity.id && node.data.superTypes) {
            node.data.superTypes.forEach(superType => {
                if (relatedNodeIds.has(superType)) {
                    edges.push(this.createInheritanceEdge(
                        node.id,
                        superType,
                        colors,
                        useCurvedLines
                    ));
                }
            });
        }
        
        node.data.superTypes?.forEach(superType => {
            if (relatedNodeIds.has(superType) && node.id !== entity.id) {
                edges.push(this.createInheritanceEdge(
                    node.id,
                    superType,
                    colors,
                    useCurvedLines
                ));
            }
        });

        if (node.id === entity.id) {
            node.data.attributes?.forEach(attr => {
                const targetNode = nodes.find(n => n.id === attr.type);
                if (targetNode && relatedNodeIds.has(targetNode.id)) {
                    edges.push(this.createTypeReferenceEdge(
                        node.id,
                        targetNode.id,
                        attr.name,
                        colors,
                        useCurvedLines
                    ));
                }
            });
        }
    });

    return edges;
  }

  // Füge eine Hilfsfunktion hinzu um Beziehungen zu identifizieren
  private static isRelationshipEntity(node: SchemaNode): boolean {
    // Ignoriere Enums
    if (node.data.isEnum) return false;

    // 1. Prüfe auf spezifische IFC Relationship Patterns
    if (
        node.id.startsWith('IfcRel') ||
        node.id.includes('Relationship')
    ) return true;

    // 2. Prüfe die Attribute auf typische Beziehungsmuster
    if (node.data.attributes) {
        // Relating/Related Paare
        const hasRelatingPair = node.data.attributes.some(attr => 
            attr.name.startsWith('Relating')
        ) && node.data.attributes.some(attr =>
            attr.name.startsWith('Related')
        );

        // Collections von Referenzen
        const hasCollectionReferences = node.data.attributes.some(attr => {
            const isCollection = 
                attr.type.includes('SET OF') || 
                attr.type.includes('LIST OF') ||
                attr.type.includes('ARRAY OF');
            const isReference = attr.type.includes('Ifc');
            return isCollection && isReference;
        });

        // Inverse Attribute
        const hasInverseReferences = node.data.attributes.some(attr =>
            attr.name.includes('INVERSE') ||
            attr.type.includes('INVERSE')
        );

        return hasRelatingPair || hasCollectionReferences || hasInverseReferences;
    }

    return false;
  }
} 