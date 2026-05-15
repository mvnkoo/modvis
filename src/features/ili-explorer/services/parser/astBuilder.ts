import type { CstNode, IToken } from 'chevrotain';
import type {
  IliBaseNode, IliRelation, IliAttribute, IliEnumValue, IliAssociation,
  IliAssociationKind,
} from '../types/IliBaseTypes';
import type { IliClassNode, IliStructureNode } from '../types/IliModelTypes';
import type { IliImportRef, IliParseError } from './types';
import { cstParserInstance } from './cstParser';
import {
  VisitState,
  lastSegment,
  qualifyLocal,
  qualifyRef,
  emitWarning,
  decorateExternalNodes,
  validateStructureInheritance,
  decorateStructureAttributes,
  decorateReferences,
  decorateInheritedAttributes,
  decorateAssociations,
  decorateDomainAttributes,
} from './decorators';

const BaseVisitor = cstParserInstance.getBaseCstVisitorConstructorWithDefaults();

function imageOf(token: IToken | undefined): string {
  return token ? token.image : '';
}

function firstTokenOf(node: CstNode): IToken | undefined {
  let earliest: IToken | undefined;
  const walk = (n: CstNode) => {
    for (const key of Object.keys(n.children)) {
      for (const child of n.children[key]) {
        if ((child as IToken).image !== undefined) {
          const tok = child as IToken;
          if (!earliest || tok.startOffset < earliest.startOffset) earliest = tok;
        } else {
          walk(child as CstNode);
        }
      }
    }
  };
  walk(node);
  return earliest;
}

function extractCommentText(token: IToken): string | null {
  const raw = token.image;
  if (raw.startsWith('!!@')) {
    const m = raw.match(/^!!@\s*comment\s*=\s*"([^"]*)"/);
    return m ? m[1].trim() : null;
  }
  if (raw.startsWith('!!')) {
    const text = raw.slice(2).trim();
    return text.length > 0 ? text : null;
  }
  if (raw.startsWith('/*')) {
    const text = raw.slice(2, -2).trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

class IliCstToAstVisitor extends BaseVisitor {
  private state: VisitState = {
    topicName: '', nodes: [], relations: [], imports: [], interlisVersion: undefined,
    domainEnumsByName: new Map(), parsedAssociations: [],
    pendingReferences: [], warnings: [],
  };
  private commentBefore: Map<number, IToken[]> = new Map();

  constructor() {
    super();
    this.validateVisitor();
  }

  build(
    cst: CstNode,
    commentBefore: Map<number, IToken[]> = new Map(),
  ): { nodes: IliBaseNode[]; relations: IliRelation[]; imports: IliImportRef[]; interlisVersion: string | undefined; warnings: IliParseError[] } {
    this.state = {
      topicName: '', nodes: [], relations: [], imports: [], interlisVersion: undefined,
      domainEnumsByName: new Map(), parsedAssociations: [],
      pendingReferences: [], warnings: [],
    };
    this.commentBefore = commentBefore;
    this.visit(cst);
    decorateDomainAttributes(this.state);
    decorateStructureAttributes(this.state);
    decorateAssociations(this.state);
    decorateReferences(this.state);
    decorateInheritedAttributes(this.state);
    validateStructureInheritance(this.state);
    decorateExternalNodes(this.state);
    return {
      nodes: this.state.nodes,
      relations: this.state.relations,
      imports: this.state.imports,
      interlisVersion: this.state.interlisVersion,
      warnings: this.state.warnings,
    };
  }

  private commentFor(token: IToken | undefined): string | undefined {
    if (!token) return undefined;
    const cs = this.commentBefore.get(token.startOffset);
    if (!cs || cs.length === 0) return undefined;
    const texts = cs.map(extractCommentText).filter((t): t is string => !!t);
    if (texts.length === 0) return undefined;
    return texts.join('\n');
  }

  iliFile(ctx: any) {
    if (ctx.interlisVersionDecl) ctx.interlisVersionDecl.forEach((v: CstNode) => this.visit(v));
    if (ctx.modelDef) ctx.modelDef.forEach((m: CstNode) => this.visit(m));
  }

  modelDef(ctx: any) {
    if (ctx.importsClause) ctx.importsClause.forEach((i: CstNode) => this.visit(i));
    if (ctx.domainSection) ctx.domainSection.forEach((d: CstNode) => this.visit(d));
    if (ctx.topicDef) ctx.topicDef.forEach((t: CstNode) => this.visit(t));
    if (ctx.classDef) ctx.classDef.forEach((c: CstNode) => this.visit(c));
    if (ctx.structureDef) ctx.structureDef.forEach((s: CstNode) => this.visit(s));
    if (ctx.enumerationDef) ctx.enumerationDef.forEach((e: CstNode) => this.visit(e));
    if (ctx.associationDef) ctx.associationDef.forEach((a: CstNode) => this.visit(a));
    if (ctx.functionDef) ctx.functionDef.forEach((f: CstNode) => this.visit(f));
    if (ctx.viewDef) ctx.viewDef.forEach((v: CstNode) => this.visit(v));
    if (ctx.unitSection) ctx.unitSection.forEach((u: CstNode) => this.visit(u));
  }

  modelHeaderBits() {}
  languageTag() {}
  versionClause() {}
  interlisVersionDecl(ctx: any) {
    const numTok = ctx.NumberLiteral?.[0] as IToken | undefined;
    if (numTok) this.state.interlisVersion = numTok.image;
  }

  importsClause(ctx: any) {
    const names = (ctx.qualifiedName as CstNode[] | undefined) ?? [];
    const unqualifiedOffsets = new Set<number>(
      ((ctx.Unqualified as IToken[] | undefined) ?? []).map(t => t.startOffset),
    );
    for (const nameNode of names) {
      const name = this.visit(nameNode) as string;
      if (!name) continue;
      const firstTok = firstTokenOf(nameNode);
      const unqualified = firstTok
        ? [...unqualifiedOffsets].some(off => off < firstTok.startOffset && firstTok.startOffset - off < 64)
        : false;
      if (this.state.imports.some(im => im.name === name)) continue;
      this.state.imports.push({ name, unqualified });
    }
  }

  topicDef(ctx: any) {
    const topicName = imageOf(ctx.topicName?.[0]);
    this.state.topicName = topicName;
    if (ctx.dependsOnDecl) ctx.dependsOnDecl.forEach((d: CstNode) => this.visit(d));
    if (ctx.domainSection) ctx.domainSection.forEach((d: CstNode) => this.visit(d));
    if (ctx.classDef) ctx.classDef.forEach((c: CstNode) => this.visit(c));
    if (ctx.structureDef) ctx.structureDef.forEach((s: CstNode) => this.visit(s));
    if (ctx.enumerationDef) ctx.enumerationDef.forEach((e: CstNode) => this.visit(e));
    if (ctx.associationDef) ctx.associationDef.forEach((a: CstNode) => this.visit(a));
    if (ctx.functionDef) ctx.functionDef.forEach((f: CstNode) => this.visit(f));
    if (ctx.viewDef) ctx.viewDef.forEach((v: CstNode) => this.visit(v));
    this.state.topicName = '';
  }

  dependsOnDecl(ctx: any) {
    if (!this.state.topicName) return;
    const sourceTopic = this.state.topicName;
    const qualifiedNames = (ctx.qualifiedName as CstNode[] | undefined) ?? [];
    for (const qn of qualifiedNames) {
      const target = this.visit(qn) as string;
      if (!target) continue;
      const targetLocal = lastSegment(target);
      this.state.relations.push({
        id: `depends_${sourceTopic}_${targetLocal}`,
        sourceId: sourceTopic,
        targetId: targetLocal,
        type: 'DEPENDS',
      });
    }
  }

  functionDef(ctx: any) {
    const fnName = imageOf(ctx.fnName?.[0]);
    if (!fnName) return;
    const args = (ctx.functionArg as CstNode[] | undefined)?.map(
      a => this.visit(a) as string,
    ) ?? [];
    const node: IliBaseNode = {
      id: `fn_${fnName}`,
      type: 'FUNCTION',
      name: fnName,
      position: { x: 0, y: 0 },
      data: {
        label: fnName,
        functionArgs: args,
        topic: this.state.topicName,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);
  }

  functionArg(ctx: any): string {
    return imageOf(ctx.argName?.[0]);
  }

  viewDef(ctx: any) {
    const viewName = imageOf(ctx.viewName?.[0]);
    if (!viewName) return;
    let formation: { kind: string; sources: string[] } | undefined;
    if (ctx.formationDef) {
      formation = this.visit(ctx.formationDef[0]) as typeof formation;
    }
    let extendsRef: string | undefined;
    if (ctx.viewExtendsRef) {
      extendsRef = this.visit(ctx.viewExtendsRef[0]) as string;
    }
    const node: IliBaseNode = {
      id: `view_${viewName}`,
      type: 'VIEW',
      name: viewName,
      position: { x: 0, y: 0 },
      data: {
        label: viewName,
        formation,
        extendsRef,
        topic: this.state.topicName,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);

    if (formation) {
      for (const src of formation.sources) {
        const targetId = qualifyRef(src, this.state.topicName);
        this.state.relations.push({
          id: `view_${viewName}-uses-${targetId}`,
          sourceId: `view_${viewName}`,
          targetId,
          type: 'REFERENCES',
          role: formation.kind.toLowerCase(),
        });
      }
    }
  }

  formationDef(ctx: any): { kind: string; sources: string[] } {
    const sources: string[] = [];
    const collect = (key: string) => {
      const arr = ctx[key] as CstNode[] | undefined;
      if (arr) for (const r of arr) sources.push(this.visit(r) as string);
    };
    collect('renamedViewableRef');
    let kind = 'PROJECTION';
    if (ctx.Projection) kind = 'PROJECTION';
    else if (ctx.Join) kind = 'JOIN';
    else if (ctx.Union) kind = 'UNION';
    else if (ctx.Aggregation) kind = 'AGGREGATION';
    else if (ctx.Inspection) kind = ctx.Area ? 'AREA INSPECTION' : 'INSPECTION';
    return { kind, sources };
  }

  renamedViewableRef(ctx: any): string {
    const qn = ctx.qualifiedName?.[0] ? this.visit(ctx.qualifiedName[0]) as string : '';
    return qn;
  }

  structureDef(ctx: any) {
    const structName = imageOf(ctx.structName?.[0]);
    const structId = qualifyLocal(structName, this.state.topicName);
    const mod = ctx.classModifier?.[0]?.children ?? {};
    const isAbstract = !!mod.Abstract;
    const isFinal = !!mod.Final;
    const isExtended = !!mod.Extended;
    const comment = this.commentFor(ctx.Structure?.[0]);

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
      id: structId,
      type: 'STRUCTURE',
      name: structName,
      isAbstract,
      position: { x: 0, y: 0 },
      attributes,
      topicId: this.state.topicName,
      data: {
        label: structName,
        isAbstract,
        isFinal,
        isExtended,
        attributes,
        topic: this.state.topicName,
        comment,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);

    if (superTypeQualified) {
      const targetId = qualifyRef(superTypeQualified, this.state.topicName);
      this.state.relations.push({
        id: `${structId}-${targetId}`,
        sourceId: structId,
        targetId,
        type: 'EXTENDS',
      });
    }
  }

  referenceType(ctx: any): Partial<IliAttribute> {
    const target = ctx.AnyClass
      ? 'ANYCLASS'
      : (this.visit(ctx.qualifiedName[0]) as string);
    const restriction = ctx.restrictionClause
      ? this.visit(ctx.restrictionClause[0]) as string[]
      : undefined;
    const restrPart = restriction && restriction.length > 0
      ? ` RESTRICTION (${restriction.join('; ')})`
      : '';
    const result: Partial<IliAttribute> = {
      type: `REFERENCE TO ${target}${restrPart}`,
      isReference: true,
    };
    if (restriction && restriction.length > 0) {
      result.restriction = restriction;
    }
    return result;
  }

  collectionType(ctx: any): Partial<IliAttribute> {
    const isBag = !!ctx.Bag;
    const card = ctx.cardinality ? this.visit(ctx.cardinality[0]) as string : undefined;
    const target = ctx.AnyStructure
      ? 'ANYSTRUCTURE'
      : (this.visit(ctx.qualifiedName[0]) as string);
    const restriction = ctx.restrictionClause
      ? this.visit(ctx.restrictionClause[0]) as string[]
      : undefined;
    const kind = isBag ? 'BAG' : 'LIST';
    const cardPart = card ? ` {${card}}` : '';
    const restrPart = restriction && restriction.length > 0
      ? ` RESTRICTION (${restriction.join('; ')})`
      : '';
    return { type: `${kind}${cardPart} OF ${target}${restrPart}`, isReference: true };
  }

  restrictionClause(ctx: any): string[] {
    const qns = ctx.qualifiedName as CstNode[] | undefined;
    if (!qns) return [];
    return qns.map(q => this.visit(q) as string);
  }

  associationDef(ctx: any) {
    const assocName = imageOf(ctx.assocName?.[0]);
    const roles = (ctx.roleDef as CstNode[] | undefined)?.map(
      r => this.visit(r) as ReturnType<IliCstToAstVisitor['roleDef']>,
    ) ?? [];
    if (roles.length !== 2) {
      emitWarning(
        this.state,
        `ASSOCIATION '${assocName}' hat ${roles.length} Rollen — modvis unterstützt aktuell nur binäre Assoziationen (Roles=2). Verworfen.`,
        ctx.assocName?.[0],
      );
      return;
    }
    const [source, target] = roles;
    const assocId = qualifyLocal(`assoc_${assocName}`, this.state.topicName);
    const comment = this.commentFor(ctx.Association?.[0]) ?? this.commentFor(ctx.assocName?.[0]);
    const kind = source.kind !== 'plain' ? source.kind
      : target.kind !== 'plain' ? target.kind
      : 'plain';
    const targetAlternatives = target.targetAlternatives?.map(
      raw => qualifyRef(raw, this.state.topicName),
    );
    const assoc: IliAssociation = {
      id: assocId,
      name: assocName,
      sourceClass: qualifyRef(source.targetClass, this.state.topicName),
      targetClass: qualifyRef(target.targetClass, this.state.topicName),
      sourceRole: source.roleName.replace(/Ref$/, ''),
      targetRole: target.roleName.replace(/Ref$/, ''),
      sourceCardinality: source.cardinality,
      targetCardinality: target.cardinality,
      comment,
      kind,
    };
    if (targetAlternatives && targetAlternatives.length > 0) {
      assoc.targetAlternatives = targetAlternatives;
    }
    this.state.parsedAssociations.push(assoc);
  }

  roleDef(ctx: any): {
    roleName: string;
    targetClass: string;
    cardinality: string;
    kind: IliAssociationKind;
    targetAlternatives?: string[];
  } {
    let kind: IliAssociationKind = 'plain';
    if (ctx.CompositionArrow) kind = 'composition';
    else if (ctx.AggregationArrow) kind = 'aggregation';
    const targetAlternatives = (ctx.targetClassAlt as CstNode[] | undefined)?.map(
      a => this.visit(a) as string,
    );
    return {
      roleName: imageOf(ctx.roleName?.[0]),
      targetClass: ctx.targetClass?.[0] ? this.visit(ctx.targetClass[0]) as string : '',
      cardinality: ctx.cardinality?.[0] ? this.visit(ctx.cardinality[0]) as string : '',
      kind,
      ...(targetAlternatives && targetAlternatives.length > 0
        ? { targetAlternatives }
        : {}),
    };
  }

  domainSection(ctx: any) {
    if (ctx.domainDef) ctx.domainDef.forEach((d: CstNode) => this.visit(d));
  }

  domainDef(ctx: any) {
    const domainName = imageOf(ctx.domainName?.[0]);
    const comment = this.commentFor(ctx.domainName?.[0]);
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
          comment,
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
          comment,
          isHighlighted: false,
          isActive: false,
        },
      };
      this.state.nodes.push(node);
      this.state.domainEnumsByName.set(domainName, values);
    }
  }

  unitSection(ctx: any) {
    if (ctx.unitDef) ctx.unitDef.forEach((u: CstNode) => this.visit(u));
  }

  unitDef(ctx: any) {
    const unitName = imageOf(ctx.unitName?.[0]);
    if (!unitName) return;
    const isAbstract = !!ctx.Abstract;
    const shortName = ctx.shortName?.[0] ? imageOf(ctx.shortName[0]) : undefined;
    const comment = this.commentFor(ctx.unitName?.[0]);

    let extendsRef: string | undefined;
    if (ctx.extendsRef) {
      extendsRef = this.visit(ctx.extendsRef[0]) as string;
    }

    const id = `unit_${unitName}`;
    const label = shortName ? `${unitName} [${shortName}]` : unitName;
    const node: IliBaseNode = {
      id,
      type: 'UNIT',
      name: unitName,
      isAbstract,
      position: { x: 0, y: 0 },
      data: {
        label,
        isAbstract,
        shortName,
        extends: extendsRef,
        topic: this.state.topicName,
        comment,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);

    if (extendsRef) {
      this.state.relations.push({
        id: `${id}-extends-${extendsRef}`,
        sourceId: id,
        targetId: `unit_${lastSegment(extendsRef)}`,
        type: 'EXTENDS',
      });
    }
  }

  skipStatement() {}

  allOfClause(ctx: any): string {
    return this.visit(ctx.baseRef[0]) as string;
  }

  enumerationDef(ctx: any) {
    const enumName = imageOf(ctx.enumName?.[0]);
    const comment = this.commentFor(ctx.Enumeration?.[0]);
    const enumValues = (this.visit(ctx.enumValueList[0]) as IliEnumValue[]) ?? [];
    const node: IliBaseNode = {
      id: enumName,
      type: 'enumNode',
      name: enumName,
      position: { x: 0, y: 0 },
      data: {
        label: enumName,
        enumValues,
        comment,
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
    const comment = this.commentFor(ctx.valueName?.[0]);
    const result: IliEnumValue = { value };
    if (comment) result.comment = comment;
    if (ctx.enumValueList) {
      result.subValues = this.visit(ctx.enumValueList[0]) as IliEnumValue[];
    }
    return result;
  }

  classDef(ctx: any) {
    const className = imageOf(ctx.className?.[0]);
    const classId = qualifyLocal(className, this.state.topicName);
    const mod = ctx.classModifier?.[0]?.children ?? {};
    const isAbstract = !!mod.Abstract;
    const isFinal = !!mod.Final;
    const isExtended = !!mod.Extended;
    const comment = this.commentFor(ctx.Class?.[0]);

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

    for (const attr of attributes) {
      if (!attr.isReference || !attr.type.startsWith('REFERENCE TO ')) continue;
      const restriction = attr.restriction;
      const refBase = attr.type.slice('REFERENCE TO '.length);
      const base = refBase.split(' RESTRICTION')[0].trim();
      if (restriction && restriction.length > 0) {
        for (const r of restriction) {
          this.state.pendingReferences.push({
            sourceClass: classId,
            targetQualified: qualifyRef(r, this.state.topicName),
            attrName: attr.name,
            isExternal: r.includes('.'),
          });
        }
      } else {
        this.state.pendingReferences.push({
          sourceClass: classId,
          targetQualified: qualifyRef(base, this.state.topicName),
          attrName: attr.name,
          isExternal: base.includes('.'),
        });
      }
    }

    const node: IliClassNode = {
      id: classId,
      type: 'CLASS',
      name: className,
      isAbstract,
      isFinal,
      position: { x: 0, y: 0 },
      attributes,
      associations: [],
      inheritedAttributes: [],
      topicId: this.state.topicName,
      comment,
      data: {
        label: className,
        isAbstract,
        isFinal,
        isExtended,
        attributes,
        associations: [],
        inheritedAttributes: [],
        topic: this.state.topicName,
        comment,
        isHighlighted: false,
        isActive: false,
      },
    };
    this.state.nodes.push(node);

    if (superTypeQualified) {
      const targetId = qualifyRef(superTypeQualified, this.state.topicName);
      this.state.relations.push({
        id: `${classId}-${targetId}`,
        sourceId: classId,
        targetId,
        type: 'EXTENDS',
      });
    }
  }

  classModifier() {}
  extendsClause() {}

  qualifiedName(ctx: any): string {
    const parts: string[] = [];
    const first = (ctx.identifierLike as CstNode[] | undefined)?.[0];
    if (first) parts.push(this.visit(first) as string);
    const tail = (ctx.qualifiedSegment as CstNode[] | undefined) ?? [];
    for (const seg of tail) parts.push(this.visit(seg) as string);
    return parts.join('.');
  }

  identifierLike(ctx: any): string {
    if (ctx.Identifier) return ctx.Identifier[0].image;
    if (ctx.Interlis) return ctx.Interlis[0].image;
    return '';
  }

  qualifiedSegment(ctx: any): string {
    if (ctx.Identifier) return ctx.Identifier[0].image;
    if (ctx.Interlis) return ctx.Interlis[0].image;
    if (ctx.Refsystem) return ctx.Refsystem[0].image;
    if (ctx.Coordsystem) return ctx.Coordsystem[0].image;
    return '';
  }

  qualifiedNameAsString(cst: CstNode): string {
    return this.visit(cst) as string;
  }

  attributeDef(ctx: any): IliAttribute {
    const name = imageOf(ctx.attrName?.[0]);
    const mandatory = !!ctx.Mandatory;
    const comment = this.commentFor(ctx.attrName?.[0]);
    const typeInfo = ctx.attributeType?.[0]
      ? this.visit(ctx.attributeType[0]) as Partial<IliAttribute>
      : { type: '' };
    const result: IliAttribute = {
      name,
      mandatory,
      type: typeInfo.type ?? '',
      ...typeInfo,
    };
    if (comment) result.comment = comment;
    return result;
  }

  attributeType(ctx: any): Partial<IliAttribute> {
    if (ctx.textType) return { type: this.visit(ctx.textType[0]) as string };
    if (ctx.mtextType) return { type: this.visit(ctx.mtextType[0]) as string };
    if (ctx.numericType) return { type: this.visit(ctx.numericType[0]) as string };
    if (ctx.numericRange) return { type: this.visit(ctx.numericRange[0]) as string };
    if (ctx.Boolean) return { type: 'BOOLEAN' };
    if (ctx.Date) return { type: 'DATE' };
    if (ctx.DateTime) return { type: 'DATETIME' };
    if (ctx.referenceType) return this.visit(ctx.referenceType[0]) as Partial<IliAttribute>;
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
    if (ctx.formatType) return { type: this.visit(ctx.formatType[0]) as string };
    if (ctx.qualifiedName) return { type: this.visit(ctx.qualifiedName[0]) as string };
    emitWarning(this.state, 'attributeType: keine Variante matched, Typ leer');
    return { type: '' };
  }

  formatType(ctx: any): string {
    const base = ctx.qualifiedName?.[0] ? this.visit(ctx.qualifiedName[0]) as string : '';
    const min = ctx.minVal?.[0]?.image;
    const max = ctx.maxVal?.[0]?.image;
    const range = min && max ? ` ${min}..${max}` : '';
    return `FORMAT ${base}${range}`;
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
