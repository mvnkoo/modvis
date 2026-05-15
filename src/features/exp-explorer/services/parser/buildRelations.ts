import type {
  ExpressFlowNode,
  ExpressRelation,
} from '../types/ExpressBaseTypes';

/**
 * Erzeugt TYPE_REF / ENUM_REF / SELECT_MEMBER-Relations basierend auf den
 * gegebenen Nodes. Inheritance (SUBTYPE_OF) wird *nicht* hier erzeugt —
 * das macht parseEntity bereits beim Lesen der ENTITY-Blöcke.
 */
export function buildAttributeRelations(
  nodes: ExpressFlowNode[],
): ExpressRelation[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: ExpressRelation[] = [];

  for (const node of nodes) {
    if (node.data.nodeType !== 'ENTITY') continue;
    const attrs = node.data.attributes ?? [];
    for (const attr of attrs) {
      const target = byId.get(attr.baseType);
      if (!target) continue;
      const isEnumTarget = target.data.nodeType === 'ENUM';
      out.push({
        id: `${node.id}--${attr.name}--${target.id}`,
        sourceId: node.id,
        targetId: target.id,
        type: isEnumTarget ? 'ENUM_REF' : 'TYPE_REF',
        attributeName: attr.name,
      });
    }
  }

  // SELECT-Member-Relations
  for (const node of nodes) {
    if (node.data.nodeType !== 'SELECT') continue;
    for (const member of node.data.selectMembers ?? []) {
      if (!byId.has(member)) continue;
      out.push({
        id: `${node.id}--SELECT--${member}`,
        sourceId: node.id,
        targetId: member,
        type: 'SELECT_MEMBER',
      });
    }
  }

  return out;
}
