import {
  IliBaseNode,
  IliRelation,
  IliNodeType
} from './types/IliBaseTypes';
import {
  IliModelNode,
  IliTopicNode,
  IliClassNode
} from './types/IliModelTypes';
import type { IliParser, IliParseError, IliImportRef } from './parsers/IliParser';
import { LegacyIliParser } from './parsers/LegacyIliParser';
import { v4 as uuid } from 'uuid';

export class IliSchemaService {
  private nodes: Map<string, IliBaseNode>;
  private relations: Map<string, IliRelation>;
  private parser: IliParser;
  private lastErrors: IliParseError[] = [];
  private lastImports: IliImportRef[] = [];
  private lastInterlisVersion: string | undefined;

  constructor(parser: IliParser = new LegacyIliParser()) {
    this.nodes = new Map();
    this.relations = new Map();
    this.parser = parser;
  }

  public getParseErrors(): IliParseError[] {
    return this.lastErrors;
  }

  public getImports(): IliImportRef[] {
    return this.lastImports;
  }

  public getInterlisVersion(): string | undefined {
    return this.lastInterlisVersion;
  }

  public parseSchema(content: string): void {
    try {
      this.clear();
      this.lastErrors = [];
      this.lastImports = [];
      this.lastInterlisVersion = undefined;

      const { nodes, relations, errors, imports, interlisVersion } = this.parser.parseContent(content);
      this.lastErrors = errors ?? [];
      this.lastImports = imports ?? [];
      this.lastInterlisVersion = interlisVersion;
      
     
      const initialClass =
        nodes.find(node => node.type === 'CLASS' && node.isAbstract) ??
        nodes.find(node => node.type === 'CLASS');

      if (initialClass) {
        this.addNode(initialClass);
      }

      nodes.forEach(node => {
        if (node.id !== initialClass?.id) {
          this.addNode(node);
        }
      });

      relations.forEach(relation => {
        const id = `${relation.sourceId}-${relation.targetId}`;
        this.relations.set(id, relation);
      });

    } catch (error) {
      console.error('Error parsing schema:', error);
      throw error;
    }
  }

  private extractInheritanceRelations(content: string): IliRelation[] {
    const relations: IliRelation[] = [];
    const extendsRegex = /CLASS\s+(\w+)\s*(?:\(ABSTRACT\))?\s*EXTENDS\s+([\w\.]+)/g;
    let match;

    while ((match = extendsRegex.exec(content)) !== null) {
      const [_, subType, superType] = match;
      
     
      const sourceId = subType;
      const targetId = superType.includes('.') 
        ? superType.split('.').pop() || superType
        : superType;
      
      relations.push({
        id: `${sourceId}-${targetId}`,
        sourceId: sourceId,
        targetId: targetId,
        type: 'EXTENDS'
      });
    }

    return relations;
  }

  public getNode(id: string): IliBaseNode | undefined {
    return this.nodes.get(id);
  }

  public getNodes(): IliBaseNode[] {
    return Array.from(this.nodes.values());
  }

  public getRelations(): IliRelation[] {
    return Array.from(this.relations.values());
  }

  public getTopicNodes(modelId: string): IliTopicNode[] {
    return Array.from(this.nodes.values())
      .filter(node => 
        node.type === 'TOPIC' && 
        (node as IliTopicNode).modelId === modelId
      ) as IliTopicNode[];
  }

  public getClassNodes(topicId: string): IliClassNode[] {
    return Array.from(this.nodes.values())
      .filter(node => 
        node.type === 'CLASS' && 
        (node as IliClassNode).topicId === topicId
      ) as IliClassNode[];
  }

  public getNodesByType(type: IliNodeType): IliBaseNode[] {
    return Array.from(this.nodes.values())
      .filter(node => node.type === type);
  }

  public getRelationsForNode(nodeId: string): IliRelation[] {
    return this.getRelations().filter(rel => 
      rel.sourceId === nodeId || rel.targetId === nodeId
    );
  }

 
  private addNode(node: IliBaseNode): void {
    this.nodes.set(node.id, node);
  }

  private addRelation(relation: IliRelation): void {
    this.relations.set(relation.id, relation);
  }

  private clear(): void {
    this.nodes.clear();
    this.relations.clear();
  }

  private createNode(type: IliNodeType, data: Partial<IliBaseNode>): IliBaseNode {
    return {
      id: data.id || uuid(),
      type,
      name: data.name || '',
      position: data.position || { x: 0, y: 0 },
      data: {
        label: data.name || '',
        isHighlighted: false,
        isActive: false,
        ...data.data
      }
    };
  }
} 