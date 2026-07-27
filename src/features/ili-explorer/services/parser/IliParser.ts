import type { IToken } from 'chevrotain';
import { IliLexer } from './tokens';
import { cstParserInstance } from './cstParser';
import { astVisitor } from './astBuilder';
import type { IliParseResult, IliParseError, IliImportRef } from './types';
import type { IliBaseNode, IliRelation } from '../types/IliBaseTypes';
import { decorateInheritedAttributesOver } from './decorators';

const LEADING_NOISE = /^(?:\s+|!![^\n]*\n?|\/\*[\s\S]*?\*\/)*/;

export interface IliParserOptions {
  strict?: boolean;
}

export interface IliFileInput {
  /** Dateiname (z.B. "Base.ili") */
  name: string;
  /** Optionaler INTERLIS-Modellname (z.B. "Base") — wird auf Nodes gestempelt für UI-Herkunft */
  modelName?: string;
  /** True für die primäre, vom User geladene Datei; default false (Auto-Import) */
  isPrimary?: boolean;
  content: string;
}

export class IliParser {
  parseContent(content: string, options: IliParserOptions = {}): IliParseResult {
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const stripped = content.replace(LEADING_NOISE, '');
    if (/^TRANSFER\b/i.test(stripped)) {
      return {
        nodes: [],
        relations: [],
        errors: [{
          message: 'INTERLIS 1 (TRANSFER) wird nicht unterstützt. Bitte das Modell zu INTERLIS 2 konvertieren.',
          offset: 0,
          line: 1,
          column: 1,
          severity: 'error',
        }],
      };
    }

    const lexResult = IliLexer.tokenize(content);
    const errors: IliParseError[] = [];

    for (const lexErr of lexResult.errors) {
      errors.push({
        message: lexErr.message,
        offset: lexErr.offset,
        line: lexErr.line,
        column: lexErr.column,
        severity: 'error',
      });
    }

    const commentBefore = buildCommentLookup(lexResult.tokens, lexResult.groups?.comments ?? []);

    cstParserInstance.input = lexResult.tokens;
    const cst = cstParserInstance.iliFile();

    for (const parseErr of cstParserInstance.errors) {
      const tok = (parseErr as any).token as IToken | undefined;
      errors.push({
        message: parseErr.message,
        offset: tok?.startOffset,
        line: tok?.startLine,
        column: tok?.startColumn,
        severity: 'error',
      });
    }

    const ast = astVisitor.build(cst, commentBefore);
    if (options.strict) {
      for (const w of ast.warnings) errors.push({ ...w, severity: 'error' });
    }
    return {
      nodes: ast.nodes,
      relations: ast.relations,
      errors,
      warnings: ast.warnings,
      imports: ast.imports,
      interlisVersion: ast.interlisVersion,
    };
  }

  parseContents(files: IliFileInput[], options: IliParserOptions = {}): IliParseResult {
    if (files.length === 0) {
      return { nodes: [], relations: [], errors: [], warnings: [], imports: [] };
    }
    if (files.length === 1) {
      return this.parseContent(files[0].content, options);
    }

    const mergedNodes = new Map<string, IliBaseNode>();
    const mergedRelations = new Map<string, IliRelation>();
    const mergedErrors: IliParseError[] = [];
    const mergedWarnings: IliParseError[] = [];
    const mergedImports = new Map<string, IliImportRef>();
    let mergedVersion: string | undefined;

    // Alias-Map: 'ModelName.Topic.Class' / 'ModelName.Class' -> kanonische Node-ID.
    // Wird beim Verarbeiten der Import-Dateien aufgebaut und nach dem Merge
    // benutzt, um EXTENDS-/REFERENCES-Targets umzuschreiben, die fully-qualified
    // mit Modellpräfix referenzieren.
    const aliasToCanonical = new Map<string, string>();

    for (const file of files) {
      const res = this.parseContent(file.content, options);
      const isPrimary = file.isPrimary === true;
      const sourceModel = file.modelName ?? file.name.replace(/\.ili$/i, '');

      if (res.errors) {
        for (const e of res.errors) {
          mergedErrors.push({
            ...e,
            message: isPrimary ? e.message : `[${file.name}] ${e.message}`,
            sourceFile: file.name,
            sourceModel,
            fromImport: !isPrimary,
          });
        }
      }
      if (res.warnings) {
        for (const w of res.warnings) {
          mergedWarnings.push({
            ...w,
            message: isPrimary ? w.message : `[${file.name}] ${w.message}`,
            sourceFile: file.name,
            sourceModel,
            fromImport: !isPrimary,
          });
        }
      }
      if (res.imports && isPrimary) {
        for (const imp of res.imports) {
          if (!mergedImports.has(imp.name)) mergedImports.set(imp.name, imp);
        }
      }
      if (res.interlisVersion && !mergedVersion) {
        mergedVersion = res.interlisVersion;
      }

      for (const node of res.nodes) {
        const existing = mergedNodes.get(node.id);
        const stamped: IliBaseNode = isPrimary
          ? node
          : {
              ...node,
              data: { ...node.data, sourceModel, isFromImport: true },
            };
        if (!existing) {
          mergedNodes.set(node.id, stamped);
        } else {
          // Wenn vorhandener Node ein externer Platzhalter ist und der neue
          // eine echte Definition liefert, überschreiben.
          const existingExternal = existing.data?.isExternal === true;
          const incomingExternal = node.data?.isExternal === true;
          if (existingExternal && !incomingExternal) {
            mergedNodes.set(node.id, stamped);
          }
        }

        // Alias mit Modellpräfix registrieren, damit fully-qualified
        // Cross-File-Referenzen wie 'Base_LV95.Administration.SIA405_BaseClass'
        // oder 'Base_LV95.SIA405_BaseClass' nach dem Merge auf den
        // kanonischen Topic.Class-Knoten zurückführbar sind.
        if (!isPrimary && !node.data?.isExternal) {
          aliasToCanonical.set(`${sourceModel}.${node.id}`, node.id);
        }
      }

      for (const rel of res.relations) {
        const key = `${rel.sourceId}::${rel.type}::${rel.targetId}::${rel.role ?? ''}`;
        if (!mergedRelations.has(key)) mergedRelations.set(key, rel);
      }
    }

    // --- Postprocess: Cross-File-Resolution ---

    // (a) Relation-Targets/Sources umschreiben, wenn ein Alias greift.
    const rewrittenRelations = new Map<string, IliRelation>();
    for (const rel of mergedRelations.values()) {
      let target = aliasToCanonical.get(rel.targetId) ?? rel.targetId;
      let source = aliasToCanonical.get(rel.sourceId) ?? rel.sourceId;
      if (target === source && rel.sourceId !== rel.targetId) {
        target = rel.targetId;
        source = rel.sourceId;
      }
      const next: IliRelation =
        target === rel.targetId && source === rel.sourceId
          ? rel
          : { ...rel, sourceId: source, targetId: target };
      const key = `${next.sourceId}::${next.type}::${next.targetId}::${next.role ?? ''}`;
      if (!rewrittenRelations.has(key)) rewrittenRelations.set(key, next);
    }

    // (b) Auch Association-Source/Target in ASSOCIATION-Nodes umschreiben.
    for (const [id, node] of mergedNodes) {
      if (node.type !== 'ASSOCIATION') continue;
      const assoc = (node.data as { association?: { sourceClass: string; targetClass: string } }).association;
      if (!assoc) continue;
      const newSource = aliasToCanonical.get(assoc.sourceClass) ?? assoc.sourceClass;
      const newTarget = aliasToCanonical.get(assoc.targetClass) ?? assoc.targetClass;
      if (newSource !== assoc.sourceClass || newTarget !== assoc.targetClass) {
        mergedNodes.set(id, {
          ...node,
          data: {
            ...node.data,
            association: { ...assoc, sourceClass: newSource, targetClass: newTarget },
          },
        });
      }
    }

    const stillReferenced = new Set<string>();
    for (const rel of rewrittenRelations.values()) {
      stillReferenced.add(rel.sourceId);
      stillReferenced.add(rel.targetId);
    }
    for (const [id, node] of mergedNodes) {
      if (node.data?.isExternal !== true) continue;
      if (stillReferenced.has(id)) continue;
      const canonical = aliasToCanonical.get(id);
      if (canonical && mergedNodes.has(canonical)) {
        mergedNodes.delete(id);
      }
    }

    // Nach dem Merge alle Nodes "external" entfernen, die nun real existieren.
    const realIds = new Set<string>();
    for (const node of mergedNodes.values()) {
      if (node.data?.isExternal !== true) realIds.add(node.id);
    }
    for (const [id, node] of mergedNodes) {
      if (node.data?.isExternal === true && realIds.has(id)) {
        mergedNodes.delete(id);
      }
    }

    // Inheritance-Decoration nochmal über das gesamte Merge-Set ausführen, damit
    // Klassen mit Cross-File-EXTENDS jetzt die geerbten Attribute mitnehmen.
    const finalNodes = Array.from(mergedNodes.values());
    const finalRelations = Array.from(rewrittenRelations.values());
    decorateInheritedAttributesOver(finalNodes, finalRelations);

    return {
      nodes: finalNodes,
      relations: finalRelations,
      errors: mergedErrors,
      warnings: mergedWarnings,
      imports: Array.from(mergedImports.values()),
      interlisVersion: mergedVersion,
    };
  }
}

function buildCommentLookup(parserTokens: IToken[], comments: IToken[]): Map<number, IToken[]> {
  const map = new Map<number, IToken[]>();
  if (comments.length === 0) return map;

  let cIdx = 0;
  let pending: IToken[] = [];
  for (const tok of parserTokens) {
    while (cIdx < comments.length && comments[cIdx].startOffset < tok.startOffset) {
      pending.push(comments[cIdx]);
      cIdx++;
    }
    if (pending.length > 0) {
      map.set(tok.startOffset, pending);
      pending = [];
    }
  }
  return map;
}
