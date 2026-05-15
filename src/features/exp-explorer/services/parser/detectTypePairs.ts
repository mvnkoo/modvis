import type {
  ExpressFlowNode,
  ExpressRelation,
} from '../types/ExpressBaseTypes';

export function detectTypePairs(nodes: ExpressFlowNode[]): ExpressRelation[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pairRelations: ExpressRelation[] = [];

  for (const node of nodes) {
    if (node.data.nodeType !== 'ENTITY') continue;
    if (node.id.endsWith('Type')) continue;
    const typeId = `${node.id}Type`;
    const partner = byId.get(typeId);
    if (!partner || partner.data.nodeType !== 'ENTITY') continue;
    node.data.pairedTypeId = partner.id;
    partner.data.pairedObjectId = node.id;
    pairRelations.push({
      id: `${node.id}--PAIR--${partner.id}`,
      sourceId: node.id,
      targetId: partner.id,
      type: 'OBJECT_TYPE_PAIR',
    });
  }

  return pairRelations;
}
