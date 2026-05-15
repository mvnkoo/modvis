import type { IToken } from 'chevrotain';
import type {
  IliBaseNode, IliRelation, IliAttribute, IliEnumValue, IliAssociation,
} from '../types/IliBaseTypes';
import type { IliClassNode } from '../types/IliModelTypes';
import type { IliImportRef, IliParseError } from './types';

export interface VisitState {
  topicName: string;
  nodes: IliBaseNode[];
  relations: IliRelation[];
  imports: IliImportRef[];
  interlisVersion: string | undefined;
  domainEnumsByName: Map<string, IliEnumValue[]>;
  parsedAssociations: IliAssociation[];
  pendingReferences: { sourceClass: string; targetQualified: string; attrName: string; isExternal: boolean }[];
  warnings: IliParseError[];
}

export function lastSegment(qualified: string): string {
  return qualified.includes('.') ? qualified.split('.').pop()! : qualified;
}

export function qualifyLocal(localName: string, topicName: string): string {
  return topicName ? `${topicName}.${localName}` : localName;
}

export function qualifyRef(rawRef: string, currentTopic: string): string {
  return rawRef.includes('.') ? rawRef : qualifyLocal(rawRef, currentTopic);
}

export function emitWarning(state: VisitState, message: string, token?: IToken): void {
  state.warnings.push({
    message,
    severity: 'warning',
    offset: token?.startOffset,
    line: token?.startLine,
    column: token?.startColumn,
  });
}

export function decorateExternalNodes(state: VisitState): void {
  const knownIds = new Set(state.nodes.map(n => n.id));
  const seen = new Set<string>();
  for (const rel of state.relations) {
    if (knownIds.has(rel.targetId) || seen.has(rel.targetId)) continue;
    seen.add(rel.targetId);
    const localName = lastSegment(rel.targetId);
    const externalSource = rel.targetId.includes('.')
      ? rel.targetId.slice(0, rel.targetId.lastIndexOf('.'))
      : undefined;
    state.nodes.push({
      id: rel.targetId,
      type: 'CLASS',
      name: localName,
      position: { x: 0, y: 0 },
      data: {
        label: localName,
        isExternal: true,
        externalSource,
        isHighlighted: false,
        isActive: false,
      },
    });
  }
}

export function validateStructureInheritance(state: VisitState): void {
  const typeById = new Map<string, string>();
  for (const node of state.nodes) typeById.set(node.id, node.type);
  for (const rel of state.relations) {
    if (rel.type !== 'EXTENDS') continue;
    const sourceType = typeById.get(rel.sourceId);
    const targetType = typeById.get(rel.targetId);
    if (sourceType === 'STRUCTURE' && targetType === 'CLASS') {
      emitWarning(
        state,
        `STRUCTURE '${rel.sourceId}' erweitert die CLASS '${rel.targetId}' — Refhb 3.5.3 verbietet das.`,
      );
    }
  }
}

export function decorateStructureAttributes(state: VisitState): void {
  const structIds = new Set<string>();
  for (const node of state.nodes) {
    if (node.type === 'STRUCTURE') structIds.add(node.id);
  }
  if (structIds.size === 0) return;

  const seenContains = new Set<string>();
  const tryEmit = (sourceId: string, targetId: string, attrName: string) => {
    const key = `${sourceId}|${targetId}|${attrName}`;
    if (seenContains.has(key)) return;
    seenContains.add(key);
    state.relations.push({
      id: `${sourceId}-${attrName}-${targetId}-contains`,
      sourceId,
      targetId,
      type: 'CONTAINS',
      role: attrName,
    });
  };

  for (const node of state.nodes) {
    if (node.type !== 'CLASS' && node.type !== 'STRUCTURE') continue;
    const owner = node as IliClassNode;
    if (!owner.attributes) continue;
    for (const attr of owner.attributes) {
      if (!attr.isEnum && !attr.isInlineEnum && !attr.isDomainEnum && !attr.isReference) {
        const t = attr.type ?? '';
        const primitive = /^(TEXT|MTEXT|NUMERIC|BOOLEAN|DATE|DATETIME|COORD|MULTICOORD|POLYLINE|MULTIPOLYLINE|SURFACE|MULTISURFACE|AREA|MULTIAREA|GEOMETRY|FORMAT|ENUMERATION|BAG|LIST|REFERENCE)\b/.test(t);
        if (!primitive && t.length > 0) {
          const candidate = qualifyRef(t, owner.topicId ?? '');
          if (structIds.has(candidate)) {
            attr.isStructValue = true;
            attr.structRef = candidate;
            attr.structKind = 'single';
            tryEmit(owner.id, candidate, attr.name);
          }
        }
      }
      if (attr.isReference) {
        const m = attr.type?.match(/^(BAG|LIST)(?:\s+\{[^}]*\})?\s+OF\s+(\S+)$/);
        if (m) {
          const target = qualifyRef(m[2], owner.topicId ?? '');
          if (structIds.has(target)) {
            attr.isStructValue = true;
            attr.structRef = target;
            attr.structKind = m[1] === 'BAG' ? 'bag' : 'list';
            tryEmit(owner.id, target, attr.name);
          }
        }
      }
    }
    if (owner.data && Array.isArray(owner.data.attributes)) {
      owner.data.attributes = owner.attributes;
    }
  }
}

export function decorateReferences(state: VisitState): void {
  for (const ref of state.pendingReferences) {
    state.relations.push({
      id: `${ref.sourceClass}-${ref.attrName}-${ref.targetQualified}-ref`,
      sourceId: ref.sourceClass,
      targetId: ref.targetQualified,
      type: 'REFERENCES',
      role: ref.attrName,
    });
  }
}

export function decorateInheritedAttributes(state: VisitState): void {
  const classById = new Map<string, IliClassNode>();
  for (const node of state.nodes) {
    if (node.type === 'CLASS' || node.type === 'STRUCTURE') {
      classById.set(node.id, node as IliClassNode);
    }
  }

  const superTypeOf = new Map<string, string>();
  for (const rel of state.relations) {
    if (rel.type === 'EXTENDS') superTypeOf.set(rel.sourceId, rel.targetId);
  }

  for (const [classId, classNode] of classById) {
    const inherited: { className: string; attributes: IliAttribute[] }[] = [];
    const visited = new Set<string>([classId]);
    let current = superTypeOf.get(classId);
    while (current && !visited.has(current)) {
      visited.add(current);
      const ancestor = classById.get(current);
      if (!ancestor) break;
      if (ancestor.attributes && ancestor.attributes.length > 0) {
        inherited.push({ className: ancestor.name, attributes: ancestor.attributes });
      }
      current = superTypeOf.get(current);
    }
    classNode.inheritedAttributes = inherited;
    classNode.data.inheritedAttributes = inherited;
  }
}

export function decorateAssociations(state: VisitState): void {
  state.parsedAssociations.forEach(assoc => {
    const sourceNode = state.nodes.find(
      n => n.type === 'CLASS' && n.id === assoc.sourceClass,
    ) as IliClassNode | undefined;
    const targetNode = state.nodes.find(
      n => n.type === 'CLASS' && n.id === assoc.targetClass,
    ) as IliClassNode | undefined;
    // Self-Assoc nur einmal anhängen — sonst rendert die UI zwei Edges
    // mit identischer Key und React Flow erzeugt Geister-Edges.
    const isSelf = sourceNode && targetNode && sourceNode.id === targetNode.id;
    if (sourceNode) {
      sourceNode.associations = [...(sourceNode.associations ?? []), assoc];
      sourceNode.data.associations = sourceNode.associations;
    }
    if (targetNode && !isSelf) {
      targetNode.associations = [...(targetNode.associations ?? []), assoc];
      targetNode.data.associations = targetNode.associations;
    }

    // Suchbarkeit: synthetischer ASSOCIATION-Node, damit `generateSearchOptions`
    // den Assoc-Namen findet. Layout zentriert ihn via `layoutAssociationCenter`.
    const topic = (sourceNode?.topicId as string | undefined) ?? (targetNode?.topicId as string | undefined) ?? '';
    state.nodes.push({
      id: assoc.id,
      type: 'ASSOCIATION',
      name: assoc.name,
      position: { x: 0, y: 0 },
      data: {
        label: assoc.name,
        association: assoc,
        topic,
        comment: assoc.comment,
        isHighlighted: false,
        isActive: false,
      },
    });
  });
}

export function decorateDomainAttributes(state: VisitState): void {
  state.nodes.forEach(node => {
    if (node.type !== 'CLASS') return;
    const classNode = node as IliClassNode;
    classNode.attributes?.forEach(attr => {
      if (attr.isInlineEnum || attr.isEnum) return;
      const baseName = attr.type.includes('.') ? attr.type.split('.').pop()! : attr.type;
      const domainValues = state.domainEnumsByName.get(baseName);
      if (domainValues) {
        attr.isDomainEnum = true;
        attr.domainEnumName = baseName;
        attr.enumValues = domainValues;
      }
    });
  });
}
