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
import { IliParserService } from './IliParserService.ts';
import { v4 as uuid } from 'uuid';

export class IliSchemaService {
  private nodes: Map<string, IliBaseNode>;
  private relations: Map<string, IliRelation>;
  private parser: IliParserService;

  constructor() {
    this.nodes = new Map();
    this.relations = new Map();
    this.parser = new IliParserService();
  }

  public parseSchema(content: string): void {
    try {
      console.log('Starting schema parsing...');
      this.clear();

      const { nodes, relations } = this.parser.parseContent(content);
      
     
      const firstAbstractClass = nodes.find(node => 
        node.type === 'CLASS' && node.isAbstract
      );
      
      if (firstAbstractClass) {
        console.log('Found first abstract class:', firstAbstractClass);
        this.addNode(firstAbstractClass);
      }

     
      nodes.forEach(node => {
        if (node.id !== firstAbstractClass?.id) {
          console.log('Adding node:', node);
          this.addNode(node);
        }
      });

     
      relations.forEach(relation => {
        const id = `${relation.sourceId}-${relation.targetId}`;
        console.log('Adding relation:', { id, relation });
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