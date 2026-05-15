import type { ExpressFlowNode, ExpressRelation } from '../types/ExpressBaseTypes';
import { parseAttributes } from './parseAttribute';

const ENTITY_BLOCK_RE = /\bENTITY\s+([A-Za-z_][A-Za-z0-9_]*)\b([\s\S]*?)\bEND_ENTITY\s*;/gi;
const SUBTYPE_OF_RE = /\bSUBTYPE\s+OF\s*\(([^)]+)\)/i;
const SUPERTYPE_OF_RE = /\bSUPERTYPE\s+OF\s*\(\s*ONEOF\s*\(([^)]+)\)\s*\)/i;
const ABSTRACT_RE = /\bABSTRACT(?:\s+SUPERTYPE)?\b/i;
const WHERE_RE = /\bWHERE\s+([\s\S]*?)(?=\b(?:UNIQUE|END_ENTITY)\b)/i;

export interface ParsedEntities {
  nodes: ExpressFlowNode[];
  relations: ExpressRelation[];
}

export function parseEntities(content: string): ParsedEntities {
  const nodes: ExpressFlowNode[] = [];
  const relations: ExpressRelation[] = [];

  ENTITY_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENTITY_BLOCK_RE.exec(content)) !== null) {
    const [, name, body] = match;
    const isAbstract = ABSTRACT_RE.test(body);

    const subtypeMatch = body.match(SUBTYPE_OF_RE);
    const superTypes = subtypeMatch
      ? subtypeMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const supertypeMatch = body.match(SUPERTYPE_OF_RE);
    const isSupertypeOf = supertypeMatch
      ? supertypeMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const whereMatch = body.match(WHERE_RE);
    const whereClause = whereMatch ? whereMatch[1].trim() : null;

    const attributes = parseAttributes(body);

    nodes.push({
      id: name,
      type: 'expressEntityNode',
      position: { x: 0, y: 0 },
      data: {
        label: name,
        nodeType: 'ENTITY',
        attributes,
        superTypes,
        subTypes: [],
        isAbstract,
        isSupertypeOf,
        whereClause,
      },
    });

    for (const parent of superTypes) {
      relations.push({
        id: `${name}--SUBTYPE_OF--${parent}`,
        sourceId: name,
        targetId: parent,
        type: 'SUBTYPE_OF',
      });
    }
  }

  // Backlink subTypes for cheap downstream layout lookups.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    const parents = node.data.superTypes ?? [];
    for (const p of parents) {
      const parentNode = byId.get(p);
      if (!parentNode) continue;
      const subs = (parentNode.data.subTypes ??= []);
      if (!subs.includes(node.id)) subs.push(node.id);
    }
  }

  return { nodes, relations };
}
