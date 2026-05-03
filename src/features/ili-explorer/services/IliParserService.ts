import { 
  IliBaseNode, 
  IliRelation,
  IliAttribute,
  IliEnumDefinition,
  IliAssociation,
  IliNodeType,
  IliEnumValue,
  DomainDefinition
} from './types/IliBaseTypes';
import {
  IliModelNode,
  IliTopicNode,
  IliClassNode,
  IliStructureNode
} from './types/IliModelTypes';

/**
 * Service for parsing INTERLIS schema files and converting them into a graph structure
 * of nodes and relations.
 */
export class IliParserService {
  private nodes: Map<string, IliBaseNode>;
  private relations: Map<string, IliRelation>;
  private domainEnums: Map<string, IliEnumValue[]>;
  private domains: Map<string, DomainDefinition>;

  constructor() {
    this.nodes = new Map();
    this.relations = new Map();
    this.domainEnums = new Map();
    this.domains = new Map();
  }

  /**
   * Parses domain enumeration values from the schema content.
   * @param content - Full schema content
   * @returns Map of domain names to their enumeration values
   */
  private parseDomainEnums(content: string): Map<string, IliEnumValue[]> {
    const domainEnums = new Map<string, IliEnumValue[]>();
    
   
    const domainSections = content.match(/DOMAIN\s*\n([\s\S]*?)(?=\s*\b(?:TOPIC|CLASS|END)\b)/g) || [];
    
    domainSections.forEach(section => {
     
      const extendsRegex = /(\w+)\s+EXTENDS\s+([\w\.]+)\s*=\s*\(([\s\S]*?)\);/g;
      let match;

      while ((match = extendsRegex.exec(section)) !== null) {
        const [_, enumName, baseEnum, enumContent] = match;
        const enumComment = this.extractComment(section, enumName);
        
       
        const enumValues = this.parseNestedEnumValues(enumContent);
        
        if (enumValues.length > 0) {
          domainEnums.set(enumName, enumValues);
          
         
          const nodeId = `domain_${enumName}`;
          const enumNode: IliBaseNode = {
            id: nodeId,
            type: 'domainEnumNode',
            name: enumName,
            position: { x: 0, y: 0 },
            data: {
              label: enumName,
              enumValues,
              isDomainEnum: true,
              isAllOf: false,
              extends: baseEnum,
              comment: enumComment,
              isHighlighted: false,
              isActive: false
            }
          };
          
          this.nodes.set(nodeId, enumNode);
        }
      }

     
      const allOfRegex = /(\w+)\s*=\s*ALL\s+OF\s+(\w+)\s*;/g;
      while ((match = allOfRegex.exec(section)) !== null) {
        const [_, enumName, baseEnumName] = match;
        const enumComment = this.extractComment(section, enumName);
        const baseValues = domainEnums.get(baseEnumName) || [];
        
        domainEnums.set(enumName, baseValues);
        
        const nodeId = `domain_${enumName}`;
        const enumNode: IliBaseNode = {
          id: nodeId,
          type: 'domainEnumNode',
          name: enumName,
          position: { x: 0, y: 0 },
          data: {
            label: enumName,
            enumValues: baseValues,
            isDomainEnum: true,
            isAllOf: true,
            baseEnum: baseEnumName,
            comment: enumComment,
            isHighlighted: false,
            isActive: false
          }
        };
        
        this.nodes.set(nodeId, enumNode);
      }
    });

    return domainEnums;
  }

  /**
   * Parses enumeration values from an INTERLIS enum definition.
   * @param enumContent - The raw enum content string
   * @returns Array of parsed enum values
   */
  private parseEnumValues(enumContent: string): IliEnumValue[] {
    const values: IliEnumValue[] = [];
    const lines = enumContent.split('\n');
    let currentParent: IliEnumValue | null = null;
    let currentComment = '';
    let nestingLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;

     
      if (line.startsWith('!!')) {
        currentComment = this.extractComment(line) || '';
        continue;
      }

     
      if (line.includes('(')) {
        nestingLevel++;
        const valueMatch = line.match(/(\w+)\s*\(/);
        if (valueMatch) {
          const value = valueMatch[1].trim();
          currentParent = {
            value,
            comment: currentComment,
            subValues: []
          };
          values.push(currentParent);
          currentComment = '';
        }
        continue;
      }

     
      if (line.includes(')')) {
        nestingLevel--;
        if (nestingLevel === 0) {
          currentParent = null;
        }
        continue;
      }

      const inlineComment = this.extractComment(line);
      const codePart = line.split('!!')[0];

      const valueMatches = [...codePart.matchAll(/([a-zA-ZäöüÄÖÜß\w]+)\s*(?:,|$)/g)];
      for (const m of valueMatches) {
        const value = m[1].trim();
        if (!value) continue;
        const comment = inlineComment || currentComment;

        const enumValue: IliEnumValue = {
          value,
          comment: comment || undefined
        };

        if (nestingLevel > 0 && currentParent && currentParent.subValues) {
          currentParent.subValues.push(enumValue);
        } else if (nestingLevel === 0) {
          values.push(enumValue);
        }
      }

      if (valueMatches.length > 0) currentComment = '';
    }

    return values;
  }

  /**
   * Extracts comments from INTERLIS content
   * @param content - Either a single line or multiple lines of content
   * @param context - Optional context (previous line or identifier)
   * @returns Extracted comment or undefined
   */
  private extractComment(content: string, context?: string): string | undefined {
   
    if (!content.includes('\n')) {
     
      const inlineAtComment = content.match(/!!@\s*comment\s*=\s*"([^"]*)"/);
      if (inlineAtComment) {
        return inlineAtComment[1].trim();
      }

     
      const inlineComment = content.match(/!!\s*([^@][^;\n]*)/);
      if (inlineComment) {
        return inlineComment[1].trim();
      }

     
      if (context && !context.includes('\n')) {
        const previousAtComment = context.match(/!!@\s*comment\s*=\s*"([^"]*)"/);
        if (previousAtComment) {
          return previousAtComment[1].trim();
        }

        const previousComment = context.match(/!!\s*([^@][^\n]*)/);
        if (previousComment) {
          return previousComment[1].trim();
        }
      }
    } 
   
    else {
      const lines = content.split('\n');
     
      if (context) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(context)) {
           
            for (let j = i - 1; j >= 0; j--) {
              const commentMatch = lines[j].match(/!!@\s*comment\s*=\s*"([^"]*)"|\s*!!\s*(.+)/);
              if (commentMatch) {
                return commentMatch[1] || commentMatch[2];
              }
              if (!lines[j].trim().startsWith('!!')) break;
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Parses class attributes from INTERLIS class content.
   * @param classContent - The raw class content string
   * @returns Array of parsed attributes
   */
  private parseAttributes(classContent: string): IliAttribute[] {
    const attributes: IliAttribute[] = [];
    const lines = classContent.split('\n');
    let currentAttributeGroup = '';
    let collectingEnum = false;
    let currentAttribute: Partial<IliAttribute> | null = null;
    let enumValues: IliEnumValue[] = [];
    let currentParent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const previousLine = i > 0 ? lines[i - 1].trim() : undefined;
      
      if (!line) continue;

      if (line.startsWith('!!') && line.includes('Attributgruppe:')) {
        currentAttributeGroup = line.split('Attributgruppe:')[1].trim();
        continue;
      }

      const attrMatch = line.match(/^(\w+)\s*:\s*([^;]+)/);
      if (attrMatch) {
        if (currentAttribute) {
          attributes.push(currentAttribute as IliAttribute);
          currentAttribute = null;
          collectingEnum = false;
        }

        const [_, name, type] = attrMatch;
        let resolvedType = type.trim();
        let mandatory = resolvedType.includes('MANDATORY');
        resolvedType = resolvedType.replace('MANDATORY', '').trim();

       
        const domainEnum = this.domainEnums.get(resolvedType);
        if (domainEnum) {
          currentAttribute = {
            name,
            type: resolvedType,
            mandatory,
            isEnum: false,
            isDomainEnum: true,
            domainEnumName: resolvedType,
            enumValues: domainEnum,
            comment: this.extractComment(line, previousLine)
          };
        } else if (resolvedType.includes('(') && !resolvedType.includes('..')) {
          const closesOnSameLine = resolvedType.includes(')');
          const insideParens = resolvedType.match(/\(([^)]*)\)/)?.[1] ?? '';
          const inlineValues: IliEnumValue[] = [...insideParens.matchAll(/([a-zA-ZäöüÄÖÜß\w]+)/g)]
            .map(m => ({ value: m[1].trim() }))
            .filter(v => v.value.length > 0);

          collectingEnum = !closesOnSameLine;
          currentAttribute = {
            name,
            type: 'ENUMERATION',
            mandatory,
            isEnum: true,
            isInlineEnum: true,
            enumValues: inlineValues,
            comment: this.extractComment(line, previousLine)
          };
        } else {
         
          currentAttribute = {
            name,
            type: resolvedType,
            mandatory,
            comment: this.extractComment(line, previousLine)
          };
        }
      } else if (collectingEnum && currentAttribute) {
       
        if (line.trim().startsWith('!!@')) {
          continue;
        }

       
        const parentMatch = line.match(/^\s*([a-zA-ZäöüÄÖÜß\w]+)\s*\(/);
        if (parentMatch) {
          const parentValue = parentMatch[1].trim();
          currentParent = parentValue;
          continue;
        }

       
        if (line.includes(')')) {
          if (line === ');') {
            collectingEnum = false;
            currentParent = '';
            if (currentAttribute) {
              attributes.push(currentAttribute as IliAttribute);
              currentAttribute = null;
            }
          }
          continue;
        }

       
       
        const codePart = line.split('!!')[0];
        const comment = this.extractComment(line, previousLine);
        const valueMatches = [...codePart.matchAll(/([a-zA-ZäöüÄÖÜß\w]+)\s*(?:,|$)/g)];

        for (const m of valueMatches) {
          const value = m[1].trim();
          if (!value) continue;
          const fullValue = currentParent ? `${currentParent}.${value}` : value;

          if (!currentAttribute.enumValues) {
            currentAttribute.enumValues = [];
          }
          currentAttribute.enumValues.push({
            value: fullValue,
            comment: comment || undefined
          });
        }
      }
    }

    if (currentAttribute) {
      attributes.push(currentAttribute as IliAttribute);
    }

    return attributes;
  }

  /**
   * Recursively collects inherited attributes from superclasses.
   * @param className - Name of the class to collect attributes for
   * @param content - Full schema content
   * @param visited - Set of already visited classes to prevent cycles
   * @returns Array of inherited attributes grouped by source class
   */
  private collectInheritedAttributes(
    className: string, 
    content: string, 
    visited = new Set<string>()
  ): { className: string; attributes: IliAttribute[] }[] {
    const inherited: { className: string; attributes: IliAttribute[] }[] = [];
    console.log(`Collecting inherited attributes for ${className}`);

   
    const classRegex = new RegExp(`CLASS\\s+${className}\\s*(?:\\(ABSTRACT\\))?\\s*EXTENDS\\s+([\\w\\.]+)\\s*=`, 'i');
    const match = classRegex.exec(content);
    
    if (match) {
      const superClassName = match[1];
      console.log(`Found superclass: ${superClassName}`);

     
      if (visited.has(superClassName)) {
        console.log(`Already visited ${superClassName}, skipping`);
        return inherited;
      }
      visited.add(superClassName);
      
     
      const superClassRegex = new RegExp(
        `CLASS\\s+${superClassName}\\s*(?:\\(ABSTRACT\\))?\\s*(?:EXTENDS\\s+[\\w\\.]+)?\\s*=\\s*([\\s\\S]*?)END\\s+${superClassName};`, 'i'
      );
      const superClassMatch = superClassRegex.exec(content);
      
      if (superClassMatch) {
        const superClassContent = superClassMatch[1];
        const attributes = this.parseAttributes(superClassContent);
        console.log(`Found ${attributes.length} attributes in superclass ${superClassName}`);
        
        if (attributes.length > 0) {
         
          inherited.push({
            className: superClassName,
            attributes
          });
        }
        
       
        const parentInherited = this.collectInheritedAttributes(superClassName, content, visited);
        inherited.push(...parentInherited);
      }
    }
    
    return inherited;
  }

  /**
   * Parses association definitions from the schema content.
   * @param content - Full schema content
   * @returns Map of class names to their associations
   */
  private parseAssociations(content: string): Map<string, IliAssociation[]> {
    const associations = new Map<string, IliAssociation[]>();
    
   
    const assocRegex = /ASSOCIATION\s+(\w+)\s*=\s*([\s\S]*?)END\s+\1;/g;
    
    let match;
    while ((match = assocRegex.exec(content)) !== null) {
      const [_, assocName, assocContent] = match;
      console.log('Found association:', assocName);
      
     
      const refRegex = /(\w+)Ref\s*(?:\(EXTERNAL\))?\s*--\s*\{(\d+|\*|\d+\.\.\d+|\d+\.\.\*)\}\s*([\w\.]+);/g;
      let refs: { role: string; card: string; class: string }[] = [];
      
      let refMatch;
      while ((refMatch = refRegex.exec(assocContent)) !== null) {
        const [__, role, card, className] = refMatch;
        refs.push({
          role,
          card,
         
          class: className.includes('.') ? className.split('.').pop()! : className
        });
      }
      
      if (refs.length === 2) {
        const [source, target] = refs;
        
        const association: IliAssociation = {
          id: `assoc_${assocName}`,
          name: assocName,
          sourceClass: source.class,
          targetClass: target.class,
          sourceRole: source.role.replace('Ref', ''),
          targetRole: target.role.replace('Ref', ''),
          sourceCardinality: source.card,
          targetCardinality: target.card
        };
        
        console.log('Created association:', association);
        
       
        this.addAssociationToClass(associations, source.class, association);
        this.addAssociationToClass(associations, target.class, association);
      }
    }
    
    return associations;
  }

  /**
   * Parses cardinality string into standardized format.
   * @param cardStr - Raw cardinality string
   * @returns Formatted cardinality string
   */
  private parseCardinality(cardStr?: string): string {
    if (!cardStr) return '1';
    const match = cardStr.match(/\{(\d+)\.\.(\d+|\*)\}/);
    if (!match) return '1';
    return `${match[1]}..${match[2]}`;
  }

  /**
   * Adds an association to the associations map for a given class.
   * @param associations - Map of associations
   * @param className - Name of the class
   * @param association - Association to add
   */
  private addAssociationToClass(
    associations: Map<string, IliAssociation[]>, 
    className: string, 
    association: IliAssociation
  ) {
    const existing = associations.get(className) || [];
    associations.set(className, [...existing, association]);
    console.log(`Added association to class ${className}:`, association);
  }

  /**
   * Main method to parse INTERLIS schema content into nodes and relations.
   * @param content - Full schema content
   * @returns Object containing parsed nodes and relations
   */
  public parseContent(content: string): { nodes: IliBaseNode[]; relations: IliRelation[] } {
    try {
      this.nodes.clear();
      this.relations.clear();
      
     
      this.domainEnums = this.parseDomainEnums(content);
      
      console.log('Starting to parse content...');

     
      const enumRegex = /ENUMERATION\s+(\w+)\s*=\s*\(([\s\S]*?)\);/g;
      let match;

     
      while ((match = enumRegex.exec(content)) !== null) {
        const [_, enumName, enumContent] = match;
        const enumValues = this.parseEnumValues(enumContent);
        
        const nodeId = enumName;
       
        const node: IliBaseNode = {
          id: nodeId,
          type: 'enumNode', 
          name: enumName,
          position: { x: 0, y: 0 },
          data: { 
            label: enumName,
            enumValues,
            comment: undefined,
            isHighlighted: false,
            isActive: false
          }
        };
        
        this.nodes.set(nodeId, node);
        console.log(`Created enum node:`, node);
      }

      const classRegex = /CLASS\s+(\w+)\s*(?:\(ABSTRACT\))?\s*(?:EXTENDS\s+([\w\.]+))?\s*=\s*([\s\S]*?)(?=END\s+\1;)/g;
      
     
      const associations = this.parseAssociations(content);
      console.log('Parsed associations:', associations);
      console.log('Association count:', associations.size);
      
     
      const topicMatch = content.match(/TOPIC\s+(\w+)\s*=/);
      const topicName = topicMatch ? topicMatch[1] : '';

     
      while ((match = classRegex.exec(content)) !== null) {
        const [fullMatch, className, superType, classContent] = match;
        const isAbstract = fullMatch.includes('(ABSTRACT)');
        const nodeId = `${className}`;
        
       
        const beforeClass = content.substring(0, match.index);
        const lines = beforeClass.split('\n');
        let classComment: string | undefined;
        
       
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line === '') continue;
          
         
          const quotedCommentMatch = line.match(/!!@\s*comment\s*=\s*"([^"]*)"/);
          if (quotedCommentMatch) {
            classComment = quotedCommentMatch[1].trim();
            break;
          }
          
         
          const simpleCommentMatch = line.match(/!!\s*(.+)/);
          if (simpleCommentMatch) {
            classComment = simpleCommentMatch[1].trim();
            break;
          }
          
         
          if (!line.startsWith('!!')) {
            break;
          }
        }

       
        const attributes = this.parseAttributes(classContent);
        
       
        const classAssociations = associations.get(className) || [];
        
        const node: IliClassNode = {
          id: nodeId,
          type: 'CLASS',
          name: className,
          isAbstract,
          position: { x: 0, y: 0 },
          attributes,
          associations: classAssociations,
          inheritedAttributes: superType ? this.collectInheritedAttributes(className, content) : [],
          topicId: topicName,
          comment: classComment,
          data: {
            label: className,
            isAbstract,
            attributes,
            associations: classAssociations,
            inheritedAttributes: superType ? this.collectInheritedAttributes(className, content) : [],
            topic: topicName,
            isHighlighted: false,
            isActive: false
          }
        };
        
        this.nodes.set(nodeId, node);

        if (superType) {
          const targetId = superType.includes('.') 
            ? superType 
            : superType;
          
          const relation: IliRelation = {
            id: `${nodeId}-${targetId}`,
            sourceId: nodeId,
            targetId: targetId,
            type: 'EXTENDS'
          };
          this.relations.set(relation.id, relation);
        }
      }

      return {
        nodes: Array.from(this.nodes.values()),
        relations: Array.from(this.relations.values())
      };
    } catch (error) {
      console.error('Error parsing content:', error);
      throw new Error(`Failed to parse ILI content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseNestedEnumValues(enumContent: string): IliEnumValue[] {
    const values: IliEnumValue[] = [];
    const lines = enumContent.split('\n');
    let currentParent: IliEnumValue | null = null;
    let currentComment = '';
    let nestingLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

     
      if (line.startsWith('!!')) {
        currentComment = this.extractComment(line) || '';
        continue;
      }

     
      if (line.includes('(')) {
        nestingLevel++;
        const valueMatch = line.match(/(\w+)\s*\(/);
        if (valueMatch) {
          const value = valueMatch[1].trim();
          const comment = currentComment;
          currentParent = {
            value,
            comment: comment || undefined,
            subValues: []
          };
          values.push(currentParent);
          currentComment = '';
        }
        continue;
      }

     
      if (line.includes(')')) {
        nestingLevel--;
        if (nestingLevel === 0) {
          currentParent = null;
        }
        continue;
      }

      const inlineComment = this.extractComment(line);
      const codePart = line.split('!!')[0];

      const valueMatches = [...codePart.matchAll(/([a-zA-ZäöüÄÖÜß\w]+)\s*(?:,|$)/g)];
      for (const m of valueMatches) {
        const value = m[1].trim();
        if (!value) continue;
        const comment = inlineComment || currentComment;

        const enumValue: IliEnumValue = {
          value,
          comment: comment || undefined
        };

        if (currentParent && currentParent.subValues) {
          currentParent.subValues.push(enumValue);
        } else if (nestingLevel === 0) {
          values.push(enumValue);
        }
      }

      if (valueMatches.length > 0) currentComment = '';
    }

    return values;
  }
}
