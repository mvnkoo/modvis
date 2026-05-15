import type { ExpressFlowNode } from '../types/ExpressBaseTypes';

const ROW_H = 220;
const COL_W = 320;
const BACKBONE_X = 0;
const CARD_GAP_X = 360;
const BACKBONE_NODE_H = 110;
const CARD_NODE_H = 160;

const IFC_BACKBONE = ['IfcRoot', 'IfcObjectDefinition', 'IfcRelationship', 'IfcPropertyDefinition'];

interface DomainSpec {
  pattern: RegExp;
  label: string;
}

const DOMAIN_PATTERNS: DomainSpec[] = [
  { pattern: /^IfcRel/, label: 'Relationships' },
  { pattern: /^Ifc(Wall|Slab|Beam|Column|Door|Window|Stair|Railing|Roof|Plate|Member|Ramp|CurtainWall|Footing|Pile|Covering|Chimney|Furniture|Furnishing|BuildingElement|Element)/, label: 'Building Elements' },
  { pattern: /^Ifc(Site|Building|Storey|Space|Zone|Spatial|External|Grid)/, label: 'Spatial' },
  { pattern: /^Ifc(Geometric|Cartesian|Curve|Surface|Line|Polyline|Polygon|Edge|Face|Vertex|Point|Trimmed|Circle|Ellipse|Conic|Plane|Bezier|BSpline|Loop|Path|OffsetCurve|Outer|Shell|Solid|Topology|Manifold)/, label: 'Geometry & Topology' },
  { pattern: /^Ifc(Material|Profile)/, label: 'Materials & Profiles' },
  { pattern: /^Ifc(Property|Pset|Quantity|Physical|PreDefined|Simple|Complex)/, label: 'Properties & Quantities' },
  { pattern: /^Ifc(Structural|Reinforcing|Tendon)/, label: 'Structural' },
  { pattern: /^Ifc(Distribution|Air|Boiler|Pipe|Duct|Cable|Junction|Outlet|Pump|Fan|Tank|Valve|Damper|Chiller|Cooling|Heating|Flow|Switching|Electric|Sanitary|Fire|Audio|Communication|Alarm|Sensor|Actuator|Controller)/, label: 'Building Services & Controls' },
  { pattern: /^Ifc(Actor|Person|Organization|Address|PostalAddress|TelecomAddress)/, label: 'Actors' },
  { pattern: /^Ifc(Process|Task|Event|Schedule|WorkPlan|WorkSchedule|Resource|Procedure|Construction|Move|Operating|Lab|Crew)/, label: 'Process & Resources' },
  { pattern: /^Ifc(Style|Color|Texture|Lighting|FillArea|Hatch|TextLiteral|Pre|Surface(Style|Texture)|Curve(Style|Font))/, label: 'Appearance' },
  { pattern: /^Ifc(Representation|Shape|Mapped)/, label: 'Representation' },
  { pattern: /^Ifc(Date|Calendar|Time|Local|TimePeriod)/, label: 'Time & Dates' },
  { pattern: /^Ifc(Measure|Value|Unit|Conversion|Derived|MonetaryUnit|SI|Boolean|Integer|Real|Logical|Text|Label|Identifier|Numeric|String)/, label: 'Measures & Units' },
  { pattern: /^Ifc(Owner|Application|OrganizationRelationship)/, label: 'Ownership' },
  { pattern: /^Ifc(Approval|Constraint|Document|Library|Classification|Reference|Metric|Objective)/, label: 'Constraints & Docs' },
  { pattern: /^Ifc(Object|Product|Asset|Group|System|Inventory|Annotation)/, label: 'Core Objects' },
];

const DOMAIN_PRIORITY: Record<string, number> = {
  'Core Objects': 1,
  'Spatial': 2,
  'Building Elements': 3,
  'Relationships': 4,
  'Properties & Quantities': 5,
  'Materials & Profiles': 6,
  'Geometry & Topology': 7,
  'Representation': 8,
  'Building Services & Controls': 9,
  'Structural': 10,
  'Process & Resources': 11,
  'Actors': 12,
  'Ownership': 13,
  'Constraints & Docs': 14,
  'Appearance': 15,
  'Time & Dates': 16,
  'Measures & Units': 17,
  'Other': 99,
};

export interface OverviewOptions {
  maxComponents: number;
}

interface DomainBucket {
  domain: string;
  members: ExpressFlowNode[];
}

export function layoutOverview(
  allNodes: ExpressFlowNode[],
  opts: OverviewOptions = { maxComponents: 80 },
): ExpressFlowNode[] {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const isIfc = byId.has('IfcRoot');
  if (isIfc) return layoutIfcDomainHub(allNodes, byId, opts);
  return layoutGenericOverview(allNodes, opts);
}

function layoutIfcDomainHub(
  allNodes: ExpressFlowNode[],
  byId: Map<string, ExpressFlowNode>,
  opts: OverviewOptions,
): ExpressFlowNode[] {
  const out: ExpressFlowNode[] = [];

  const backbone = IFC_BACKBONE
    .map((id) => byId.get(id))
    .filter(Boolean) as ExpressFlowNode[];

  const usedIds = new Set<string>(backbone.map((n) => n.id));
  const buckets = bucketByDomain(allNodes, usedIds);
  const ranked = rankBuckets(buckets).filter((b) => b.members.length >= 2);

  const cards = ranked
    .map((b) => domainCardNode(b))
    .slice(0, Math.max(4, Math.min(opts.maxComponents / 4, 14)));

  const half = Math.ceil(cards.length / 2);
  const leftCards = cards.slice(0, half);
  const rightCards = cards.slice(half);

  spreadInColumn(out, backbone, BACKBONE_X, ROW_H, BACKBONE_NODE_H);
  spreadInColumn(out, leftCards, BACKBONE_X - CARD_GAP_X, ROW_H, CARD_NODE_H);
  spreadInColumn(out, rightCards, BACKBONE_X + CARD_GAP_X, ROW_H, CARD_NODE_H);

  return out;
}

function spreadInColumn(
  target: ExpressFlowNode[],
  items: ExpressFlowNode[],
  x: number,
  step: number,
  nodeH: number,
): void {
  if (items.length === 0) return;
  const totalSpan = (items.length - 1) * step;
  items.forEach((node, i) => {
    const centerY = i * step - totalSpan / 2;
    target.push(positionedExact(node, x, centerY - nodeH / 2));
  });
}

function positionedExact(node: ExpressFlowNode, x: number, y: number): ExpressFlowNode {
  return {
    ...node,
    position: { x, y },
    data: { ...node.data, isActive: false, isHighlighted: false },
  };
}

function classifyDomain(name: string): string {
  for (const { pattern, label } of DOMAIN_PATTERNS) {
    if (pattern.test(name)) return label;
  }
  return 'Other';
}

function bucketByDomain(
  allNodes: ExpressFlowNode[],
  excludeIds: Set<string>,
): DomainBucket[] {
  const map = new Map<string, ExpressFlowNode[]>();
  for (const n of allNodes) {
    if (n.data.nodeType !== 'ENTITY') continue;
    if (excludeIds.has(n.id)) continue;
    const key = classifyDomain(n.data.label);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  return [...map.entries()].map(([domain, members]) => ({ domain, members }));
}

function rankBuckets(buckets: DomainBucket[]): DomainBucket[] {
  return [...buckets].sort((a, b) => {
    const pa = DOMAIN_PRIORITY[a.domain] ?? 999;
    const pb = DOMAIN_PRIORITY[b.domain] ?? 999;
    if (pa !== pb) return pa - pb;
    return b.members.length - a.members.length;
  });
}

function domainCardNode(bucket: DomainBucket): ExpressFlowNode {
  const sortedMembers = [...bucket.members].sort((a, b) =>
    a.data.label.length - b.data.label.length || a.data.label.localeCompare(b.data.label));
  const target = sortedMembers[0];
  return {
    id: `__domain__${bucket.domain}`,
    type: 'expressDomainCardNode',
    position: { x: 0, y: 0 },
    data: {
      label: bucket.domain,
      nodeType: 'ENTITY',
      domain: bucket.domain,
      count: bucket.members.length,
      examples: sortedMembers.slice(0, 6).map((n) => n.data.label),
      targetId: target.id,
    },
  };
}

function layoutGenericOverview(
  allNodes: ExpressFlowNode[],
  opts: OverviewOptions,
): ExpressFlowNode[] {
  const cap = opts.maxComponents;
  const enums = allNodes.filter((n) => n.data.nodeType === 'ENUM').slice(0, cap / 4);
  const selects = allNodes.filter((n) => n.data.nodeType === 'SELECT').slice(0, cap / 4);
  const types = allNodes.filter((n) => n.data.nodeType === 'TYPE').slice(0, cap / 4);
  const entities = allNodes
    .filter((n) => n.data.nodeType === 'ENTITY' && (!n.data.superTypes || n.data.superTypes.length === 0))
    .slice(0, cap);

  const out: ExpressFlowNode[] = [];
  pushColumn(out, enums, -2 * COL_W - 80);
  pushColumn(out, selects, -COL_W - 40);
  pushColumn(out, entities, 40);
  pushColumn(out, types, COL_W + 80);
  return out;
}

function pushColumn(target: ExpressFlowNode[], nodes: ExpressFlowNode[], x: number): void {
  const totalH = (nodes.length - 1) * ROW_H;
  nodes.forEach((n, i) => {
    target.push(positionedExact(n, x, i * ROW_H - totalH / 2));
  });
}
