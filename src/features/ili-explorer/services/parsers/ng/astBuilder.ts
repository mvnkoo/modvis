import type { CstNode, IToken } from 'chevrotain';
import type {
  IliBaseNode, IliRelation, IliAttribute, IliEnumValue, IliAssociation,
} from '../../types/IliBaseTypes';
import type { IliClassNode, IliStructureNode } from '../../types/IliModelTypes';
import { cstParserInstance } from './parser';

const BaseVisitor = cstParserInstance.getBaseCstVisitorConstructorWithDefaults();

interface VisitState {
  topicName: string;
  nodes: IliBaseNode[];
  relations: IliRelation[];
  domainEnumsByName: Map<string, IliEnumValue[]>;
  parsedAssociations: IliAssociation[];
}

function lastSegment(qualified: string): string {
  return qualified.includes('.') ? qualified.split('.').pop()! : qualified;
}

function imageOf(token: IToken | undefined): string {
  return token ? token.image : '';
}

class IliCstToAstVisitor extends BaseVisitor {
  private state: VisitState = {
    topicName: '', nodes: [], relations: [],
    domainEnumsByName: new Map(), parsedAssociations: [],
  };

  constructor() {
    super();
    this.validateVisitor();
  }

  build(cst: CstNode): { nodes: IliBaseNode[]; relations: IliRelation[] } {
    this.state = {
      topicName: '', nodes: [], relations: [],
      domainEnumsByName: new Map(), parsedAssociations: [],
    };
    this.visit(cst);
    this.decorateDomainAttributes();
    this.decorateAssociations();
    return { nodes: this.state.nodes, relations: this.state.relations };
  }

  private decorateAssociations(): void {
    this.state.parsedAssociations.forEach(assoc => {
      const sourceNode = this.state.nodes.find(
        n => n.type === 'CLASS' && n.name === assoc.sourceClass,
      ) as IliClassNode | undefined;
      const targetNode = this.state.nodes.find(
        n => n.type === 'CLASS' && n.name === assoc.targetClass,
      ) as IliClassNode | undefined;
      if (sourceNode) {
        sourceNode.associations = [...(sourceNode.associations ?? []), assoc];
        sourceNode.data.associations = sourceNode.associations;
      }
      if (targetNode) {
        targetNode.associations = [...(targetNode.associations ?? []), assoc];
        targetNode.data.associations = targetNode.associations;
      }
    });
  }

  private decorateDomainAttributes(): void {
    this.state.nodes.forEach(node => {
      if (node.type !== 'CLASS') return;
      const classNode = node as IliClassNode;
      classNode.attributes?.forEach(attr => {
        if (attr.isInlineEnum || attr.isEnum) return;
        const baseName = attr.type.includes('.') ? attr.type.split('.').pop()! : attr.type;
        const domainValues = this.state.domainEnumsByName.get(baseName);
        if (domainValues) {
          attr.isDomainEnum = true;
          attr.domainEnumName = baseName;
          attr.enumValues = domainValues;
        }
      });
    });
  }

  iliFile(ctx: any) {
    if (ctx.modelDef) ctx.modelDef.forEach((m: CstNode) => this.visit(m));
  }

  modelDef(ctx: any) {
    if (ctx.domainSection) ctx.domainSection.forEach((d: CstNode) => this.visit(d));
    if (ctx.topicDef) ctx.topicDef.forEach((t: CstNode) => this.visit(t));
  }

  modelHeaderBits() {}
  languageTag() {}
  versionClause() {}
  interlisVersionDecl() {}

  topicDef(ctx: any) {
    const topicName = imageOf(ctx.topicName?.[0]);
    this.state.topicName = topicName;
    if (ctx.domainSection) ctx.domainSection.forEach((d: CstNode) => this.visit(d));
    if (ctx.classDef) ctx.classDef.forEach((c: CstNode) => this.visit(c));
    if (ctx.structureDef) ctx.structureDef.forEach((s: CstNode) => this.visit(s));
    if (ctx.enumerationDef) ctx.enumerationDef.forEach((e: CstNode) => this.visit(e));
    if (ctx.associationDef) ctx.associationDef.forEach((a: CstNode) => this.visit(a));
    this.state.topicName = '';
  }

  structureDef(ctx: any) {
    const structName = imageOf(ctx.structName?.[0]);
    const isAbstract = !!ctx.classModifier;

    let superTypeQualified: string | undefined;
    if (ctx.extendsClause) {
      const ext = ctx.extendsClause[0] as CstNode;
      const qn = (ext.children as any).qualifiedName?.[0];
      if (qn) superTypeQualified = this.visit(qn) as string;
    }

    const attributes: IliAttribute[] = [];
    if (ctx.attributeDef) {
      ctx.attributeDef.forEach((a: CstNode) => {
        const attr = this.visit(a) as IliAttribute | undefined;
        if (attr) attributes.push(attr);
      });
    }

    const node: IliStructureNode = {
      id: structName,
      type: 'STRUCTURE',
      name: structName,
      isAbstract,
      position: { x: 0, y: 0 },
      attributes,
      topicId: this.state.topicName,
      data: {
        label: structName,
        isAbstract,
        attributes,
        topic: this.state.topicName,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);

    if (superTypeQualified) {
      this.state.relations.push({
        id: `${structName}-${superTypeQualified}`,
        sourceId: structName,
        targetId: superTypeQualified,
        type: 'EXTENDS',
      });
    }
  }

  collectionType(ctx: any): Partial<IliAttribute> {
    const isBag = !!ctx.Bag;
    const card = ctx.cardinality ? this.visit(ctx.cardinality[0]) as string : undefined;
    const target = this.visit(ctx.qualifiedName[0]) as string;
    const kind = isBag ? 'BAG' : 'LIST';
    const cardPart = card ? ` {${card}}` : '';
    return { type: `${kind}${cardPart} OF ${target}`, isReference: true };
  }

  associationDef(ctx: any) {
    const assocName = imageOf(ctx.assocName?.[0]);
    const roles = (ctx.roleDef as CstNode[] | undefined)?.map(
      r => this.visit(r) as { roleName: string; targetClass: string; cardinality: string },
    ) ?? [];
    if (roles.length !== 2) return;
    const [source, target] = roles;
    const assoc: IliAssociation = {
      id: `assoc_${assocName}`,
      name: assocName,
      sourceClass: lastSegment(source.targetClass),
      targetClass: lastSegment(target.targetClass),
      sourceRole: source.roleName.replace(/Ref$/, ''),
      targetRole: target.roleName.replace(/Ref$/, ''),
      sourceCardinality: source.cardinality,
      targetCardinality: target.cardinality,
    };
    this.state.parsedAssociations.push(assoc);
  }

  roleDef(ctx: any): { roleName: string; targetClass: string; cardinality: string } {
    return {
      roleName: imageOf(ctx.roleName?.[0]),
      targetClass: ctx.targetClass?.[0] ? this.visit(ctx.targetClass[0]) as string : '',
      cardinality: ctx.cardinality?.[0] ? this.visit(ctx.cardinality[0]) as string : '',
    };
  }

  domainSection(ctx: any) {
    if (ctx.domainDef) ctx.domainDef.forEach((d: CstNode) => this.visit(d));
  }

  domainDef(ctx: any) {
    const domainName = imageOf(ctx.domainName?.[0]);
    const id = `domain_${domainName}`;
    const extendsName = ctx.extendsRef ? this.visit(ctx.extendsRef[0]) as string : undefined;

    if (ctx.allOfClause) {
      const baseRefName = this.visit(ctx.allOfClause[0]) as string;
      const baseLocal = baseRefName.includes('.') ? baseRefName.split('.').pop()! : baseRefName;
      const baseValues = this.state.domainEnumsByName.get(baseLocal) ?? [];
      const node: IliBaseNode = {
        id,
        type: 'domainEnumNode',
        name: domainName,
        position: { x: 0, y: 0 },
        data: {
          label: domainName,
          enumValues: baseValues,
          isDomainEnum: true,
          isAllOf: true,
          baseEnum: baseRefName,
          isHighlighted: false,
          isActive: false,
        },
      };
      this.state.nodes.push(node);
      this.state.domainEnumsByName.set(domainName, baseValues);
      return;
    }

    if (ctx.enumValueList) {
      const values = this.visit(ctx.enumValueList[0]) as IliEnumValue[];
      const node: IliBaseNode = {
        id,
        type: 'domainEnumNode',
        name: domainName,
        position: { x: 0, y: 0 },
        data: {
          label: domainName,
          enumValues: values,
          isDomainEnum: true,
          isAllOf: false,
          extends: extendsName,
          isHighlighted: false,
          isActive: false,
        },
      };
      this.state.nodes.push(node);
      this.state.domainEnumsByName.set(domainName, values);
    }
  }

  unitSection() {}
  skipStatement() {}

  allOfClause(ctx: any): string {
    return this.visit(ctx.baseRef[0]) as string;
  }

  enumerationDef(ctx: any) {
    const enumName = imageOf(ctx.enumName?.[0]);
    const enumValues = (this.visit(ctx.enumValueList[0]) as IliEnumValue[]) ?? [];
    const node: IliBaseNode = {
      id: enumName,
      type: 'enumNode',
      name: enumName,
      position: { x: 0, y: 0 },
      data: {
        label: enumName,
        enumValues,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);
  }

  enumValueList(ctx: any): IliEnumValue[] {
    const items = ctx.enumValue as CstNode[] | undefined;
    if (!items) return [];
    return items.map(v => this.visit(v) as IliEnumValue);
  }

  enumValue(ctx: any): IliEnumValue {
    const value = imageOf(ctx.valueName?.[0]);
    const result: IliEnumValue = { value };
    if (ctx.enumValueList) {
      result.subValues = this.visit(ctx.enumValueList[0]) as IliEnumValue[];
    }
    return result;
  }

  classDef(ctx: any) {
    const className = imageOf(ctx.className?.[0]);
    const isAbstract = !!ctx.classModifier;

    let superTypeQualified: string | undefined;
    if (ctx.extendsClause) {
      const ext = ctx.extendsClause[0];
      const qn = ext.children.qualifiedName?.[0];
      if (qn) superTypeQualified = this.qualifiedNameAsString(qn);
    }

    const attributes: IliAttribute[] = [];
    if (ctx.attributeDef) {
      ctx.attributeDef.forEach((a: CstNode) => {
        const attr = this.visit(a) as IliAttribute | undefined;
        if (attr) attributes.push(attr);
      });
    }

    const node: IliClassNode = {
      id: className,
      type: 'CLASS',
      name: className,
      isAbstract,
      position: { x: 0, y: 0 },
      attributes,
      associations: [],
      inheritedAttributes: [],
      topicId: this.state.topicName,
      data: {
        label: className,
        isAbstract,
        attributes,
        associations: [],
        inheritedAttributes: [],
        topic: this.state.topicName,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);

    if (superTypeQualified) {
      this.state.relations.push({
        id: `${className}-${superTypeQualified}`,
        sourceId: className,
        targetId: superTypeQualified,
        type: 'EXTENDS',
      });
    }
  }

  classModifier() {}
  extendsClause() {}

  qualifiedName(ctx: any): string {
    const parts = (ctx.identifierLike as CstNode[] | undefined)
      ?.map(c => this.visit(c) as string) ?? [];
    return parts.join('.');
  }

  identifierLike(ctx: any): string {
    if (ctx.Identifier) return ctx.Identifier[0].image;
    if (ctx.Interlis) return ctx.Interlis[0].image;
    return '';
  }

  qualifiedNameAsString(cst: CstNode): string {
    return this.visit(cst) as string;
  }

  attributeDef(ctx: any): IliAttribute {
    const name = imageOf(ctx.attrName?.[0]);
    const mandatory = !!ctx.Mandatory;
    const typeInfo = ctx.attributeType?.[0]
      ? this.visit(ctx.attributeType[0]) as Partial<IliAttribute>
      : { type: '' };
    return {
      name,
      mandatory,
      type: typeInfo.type ?? '',
      ...typeInfo,
    };
  }

  attributeType(ctx: any): Partial<IliAttribute> {
    if (ctx.textType) return { type: this.visit(ctx.textType[0]) as string };
    if (ctx.mtextType) return { type: this.visit(ctx.mtextType[0]) as string };
    if (ctx.numericType) return { type: this.visit(ctx.numericType[0]) as string };
    if (ctx.numericRange) return { type: this.visit(ctx.numericRange[0]) as string };
    if (ctx.Boolean) return { type: 'BOOLEAN' };
    if (ctx.Date) return { type: 'DATE' };
    if (ctx.DateTime) return { type: 'DATETIME' };
    if (ctx.collectionType) return this.visit(ctx.collectionType[0]) as Partial<IliAttribute>;
    if (ctx.geometryType) return this.visit(ctx.geometryType[0]) as Partial<IliAttribute>;
    if (ctx.enumValueList) {
      const values = this.visit(ctx.enumValueList[0]) as IliEnumValue[];
      return {
        type: 'ENUMERATION',
        isEnum: true,
        isInlineEnum: true,
        enumValues: values,
      };
    }
    if (ctx.qualifiedName) return { type: this.visit(ctx.qualifiedName[0]) as string };
    return { type: '' };
  }

  mtextType(ctx: any): string {
    if (ctx.NumberLiteral) return `MTEXT*${imageOf(ctx.NumberLiteral[0])}`;
    return 'MTEXT';
  }

  oidClause() {}
  constraintClause() {}

  geometryType(ctx: any): Partial<IliAttribute> {
    if (ctx.Coord) return { type: 'COORD' };
    if (ctx.MultiCoord) return { type: 'MULTICOORD' };
    if (ctx.Polyline) return { type: 'POLYLINE' };
    if (ctx.MultiPolyline) return { type: 'MULTIPOLYLINE' };
    if (ctx.Surface) return { type: 'SURFACE' };
    if (ctx.MultiSurface) return { type: 'MULTISURFACE' };
    if (ctx.Area) return { type: 'AREA' };
    if (ctx.MultiArea) return { type: 'MULTIAREA' };
    return { type: 'GEOMETRY' };
  }

  geometryBodyToken() {}

  textType(ctx: any): string {
    if (ctx.NumberLiteral) {
      return `TEXT*${imageOf(ctx.NumberLiteral[0])}`;
    }
    return 'TEXT';
  }

  numericType(ctx: any): string {
    if (!ctx.numericRange) return 'NUMERIC';
    const range = this.visit(ctx.numericRange[0]) as string;
    return `NUMERIC ${range}`;
  }

  numericRange(ctx: any): string {
    const min = this.visit(ctx.min[0]) as string;
    const max = this.visit(ctx.max[0]) as string;
    let s = `${min}..${max}`;
    if (ctx.unitRef) s += ` ${this.visit(ctx.unitRef[0]) as string}`;
    return s;
  }

  signedNumber(ctx: any): string {
    const sign = ctx.Minus ? '-' : '';
    return sign + imageOf(ctx.NumberLiteral?.[0]);
  }

  unitRef(ctx: any): string {
    const qn = this.visit(ctx.qualifiedName[0]) as string;
    return `[${qn}]`;
  }

  cardinality(ctx: any): string {
    const minStr = this.visit(ctx.min[0]) as string;
    if (!ctx.max) return minStr;
    const maxStr = this.visit(ctx.max[0]) as string;
    return `${minStr}..${maxStr}`;
  }

  cardinalityValue(ctx: any): string {
    if (ctx.NumberLiteral) return imageOf(ctx.NumberLiteral[0]);
    if (ctx.Star) return '*';
    return '';
  }
}

export const astVisitor = new IliCstToAstVisitor();
