import type { ExpressFlowNode, ExpressAggregate } from '../types/ExpressBaseTypes';

const TYPE_BLOCK_RE = /\bTYPE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*?)\bEND_TYPE\s*;/gi;
const ENUM_RE = /\bENUMERATION\s+OF\s*\(([\s\S]*?)\)/i;
const SELECT_RE = /\bSELECT\s*\(([\s\S]*?)\)/i;
const AGGREGATE_HEAD_RE = /\b(LIST|SET|BAG|ARRAY)\b/i;

export function parseTypes(content: string): ExpressFlowNode[] {
  const nodes: ExpressFlowNode[] = [];

  TYPE_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TYPE_BLOCK_RE.exec(content)) !== null) {
    const [, name, body] = match;
    nodes.push(classifyType(name, body.trim()));
  }
  return nodes;
}

function classifyType(name: string, body: string): ExpressFlowNode {
  const enumMatch = body.match(ENUM_RE);
  if (enumMatch) {
    const enumValues = enumMatch[1]
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return {
      id: name,
      type: 'expressEnumNode',
      position: { x: 0, y: 0 },
      data: {
        label: name,
        nodeType: 'ENUM',
        enumValues,
      },
    };
  }

  const selectMatch = body.match(SELECT_RE);
  if (selectMatch) {
    const members = selectMatch[1]
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return {
      id: name,
      type: 'expressSelectNode',
      position: { x: 0, y: 0 },
      data: {
        label: name,
        nodeType: 'SELECT',
        selectMembers: members,
      },
    };
  }

  const aggMatch = body.match(AGGREGATE_HEAD_RE);
  const aggregate = (aggMatch ? aggMatch[1].toUpperCase() : null) as ExpressAggregate;

  return {
    id: name,
    type: 'expressTypeNode',
    position: { x: 0, y: 0 },
    data: {
      label: name,
      nodeType: 'TYPE',
      baseType: body.replace(/[;\s]+$/g, ''),
      aggregate,
    },
  };
}
