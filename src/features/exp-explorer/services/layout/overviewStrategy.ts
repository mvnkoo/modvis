import type { ExpressFlowNode } from '../types/ExpressBaseTypes';

const ROW_H = 220;
const COL_W = 320;
const BACKBONE_X = 0;
const BACKBONE_NODE_W = 380;
const BACKBONE_NODE_H = 110;
const CARD_NODE_W = 240;
const CARD_NODE_H = 160;
const COLUMN_GUTTER = 80;
const CARD_GAP_X = BACKBONE_NODE_W / 2 + CARD_NODE_W / 2 + COLUMN_GUTTER;

const IFC_BACKBONE = ['IfcRoot', 'IfcObjectDefinition', 'IfcRelationship', 'IfcPropertyDefinition'];

export type DomainLayer = 'Core' | 'Shared' | 'Domain' | 'Resource' | 'Other';

interface DomainSpec {
  pattern: RegExp;
  label: string;
  layer: DomainLayer;
}

const DOMAIN_PATTERNS: DomainSpec[] = [
  // CORE (chapter 5)
  { pattern: /^IfcRel/, layer: 'Core', label: 'Relationships' },
  { pattern: /^Ifc(Site|Building$|BuildingStorey|Storey|Space$|SpaceType|Zone|Spatial|External(?!Reference)|Grid|Annotation)/, layer: 'Core', label: 'Spatial Structure' },
  { pattern: /^Ifc(Process|Task|Event$|EventTime|EventType|Procedure|WorkPlan|WorkSchedule|WorkCalendar|WorkTime|Move|Operating|Lab|Crew|ConstructionResource)/, layer: 'Core', label: 'Processes' },
  { pattern: /^Ifc(Actor|Person$|Organization|PersonAndOrganization|Address|Postal|Telecom)/, layer: 'Core', label: 'Actors' },
  { pattern: /^Ifc(Project$|ProjectLibrary|ProjectOrder|Group$|GroupType|System$|SystemType|Inventory|Asset|BuildingSystem)/, layer: 'Core', label: 'Project & Aggregations' },

  // SHARED (chapter 6)
  { pattern: /^Ifc(Beam|Chimney|Column|Covering|CurtainWall|Door|Footing|Member|Pile|Plate|Railing|Ramp|RampFlight|Roof|ShadingDevice|Slab|Stair|StairFlight|Wall|Window|BuildingElement(?:Part|Proxy)?|BuiltElement|DeepFoundation)/, layer: 'Shared', label: 'Building Elements' },
  { pattern: /^Ifc(Furnit|Fastener|MechanicalFastener|DiscreteAccessory|VibrationDamper|VibrationIsolator|SystemFurnitureElement|TransportElement)/, layer: 'Shared', label: 'Building Components' },
  { pattern: /^Ifc(Course|Kerb|Pavement|MooringDevice|Sign(?:al)?|Marine|Berth|Built(?:System)?|Facility|FacilityPart|Bridge|EarthworksElement|EarthworksFill|EarthworksCut|Track|Pavement)/, layer: 'Shared', label: 'Infrastructure' },
  { pattern: /^Ifc(CostItem|CostSchedule|Occupant)/, layer: 'Shared', label: 'Facilities & Mgmt' },

  // DOMAIN-SPECIFIC (chapter 7)
  { pattern: /^Ifc(Alarm|Controller|Sensor|Actuator|FlowInstrument|UnitaryControl|ProtectiveDevice|DistributionControl)/, layer: 'Domain', label: 'Building Controls Domain' },
  { pattern: /^Ifc(AirTerminal|Boiler|Chiller|Coil|Compressor|Condenser|CooledBeam|CoolingTower|Damper|Duct|Evaporat|Fan|Filter|FlowMeter|HeatExchanger|Humidifier|MedicalDevice|Pipe|Pump|SpaceHeater|Tank|TubeBundle|UnitaryEquipment|Valve|Burner|Engine|EnergyConversionDevice|DistributionFlow|FlowController|FlowFitting|FlowMoving|FlowSegment|FlowStorage|FlowTerminal|FlowTreatment)/, layer: 'Domain', label: 'HVAC Domain' },
  { pattern: /^Ifc(Electric|Cable|Junction|Outlet|Motor|Transformer|Lamp|LightFixture|AudioVisual|Communications|Solar|Switching)/, layer: 'Domain', label: 'Electrical Domain' },
  { pattern: /^Ifc(FireSuppression|Sanitary|Waste|Stack|Interceptor)/, layer: 'Domain', label: 'Plumbing & Fire Domain' },
  { pattern: /^Ifc(Structural|Reinforcing|Tendon)/, layer: 'Domain', label: 'Structural Domain' },
  { pattern: /^IfcRail(?!ing)/, layer: 'Domain', label: 'Rail Domain' },
  { pattern: /^IfcRoad/, layer: 'Domain', label: 'Road Domain' },
  { pattern: /^Ifc(Borehole|Geotechnical|GeotechnicalAssembly|GeotechnicalElement|GeotechnicalStratum)/, layer: 'Domain', label: 'Geotechnical Domain' },
  { pattern: /^Ifc(Geographic|GeoModel|GeoSlice)/, layer: 'Domain', label: 'Geographic Domain' },

  // RESOURCES (chapter 8)
  { pattern: /^Ifc(Material|Profile)/, layer: 'Resource', label: 'Materials & Profiles' },
  { pattern: /^Ifc(Property(?!Definition)|Pset|SimpleProperty|ComplexProperty|ExtendedProperties)/, layer: 'Resource', label: 'Properties' },
  { pattern: /^Ifc(Quantity|Physical(Quantity|Simple|Complex)?)/, layer: 'Resource', label: 'Quantities' },
  { pattern: /^Ifc(Representation|Shape|Mapped)/, layer: 'Resource', label: 'Representation' },
  { pattern: /^Ifc(Geometric|Cartesian|Curve(?!Style|Font)|Surface(?!Style|Texture)|Line$|Polyline|Polygon|Edge|Face|Vertex|Point|Trimmed|Circle|Ellipse|Conic|Plane|Bezier|BSpline|Loop|Path|OffsetCurve|Outer|Shell|Solid|Topology|Manifold|Block$|Sphere|Cone|Cylindrical|Sweep|Csg|Swept|Half|Direction|Vector|Axis|Repeat|Placement|TessellatedItem|Triangulated|Indexed)/, layer: 'Resource', label: 'Geometry & Topology' },
  { pattern: /^Ifc(Date$|DateTime|Time$|LocalTime|TimePeriod|TimeSeries|Duration|CalendarDate|TimeOrRatio)/, layer: 'Resource', label: 'Date & Time' },
  { pattern: /^Ifc(Measure|Value|Unit|Conversion|Derived|MonetaryUnit|SIUnit|Boolean|Integer|Real|Logical|Text|Label|Identifier|Numeric|String|Descriptive|Positive|NonNegative)/, layer: 'Resource', label: 'Measures & Units' },
  { pattern: /^Ifc(Approval|Constraint|Document|Library|Classification|ExternalReference|Metric|Objective)/, layer: 'Resource', label: 'Constraints & Docs' },
  { pattern: /^Ifc(Style|Colour|Color|Texture|Lighting|FillArea|HatchLine|TextLiteral|PresentationStyle|PresentationLayer|PresentationItem|Surface(Style|Texture)|Curve(Style|Font))/, layer: 'Resource', label: 'Appearance' },
  { pattern: /^Ifc(Owner|Application)/, layer: 'Resource', label: 'Utility' },
  { pattern: /^Ifc(BoundaryCondition|StructuralLoad)/, layer: 'Resource', label: 'Structural Loads' },

  // CATCH-ALL (lowest priority)
  { pattern: /^Ifc(Object|Product|TypeObject|TypeProduct|TypeProcess|TypeResource)/, layer: 'Core', label: 'Core Objects' },
];

const LAYER_RANK: Record<DomainLayer, number> = {
  Core: 0,
  Shared: 1,
  Domain: 2,
  Resource: 3,
  Other: 9,
};

const DOMAIN_PRIORITY: Record<string, number> = {
  'Core Objects': 1,
  'Spatial Structure': 2,
  'Building Elements': 3,
  'Building Components': 4,
  'Infrastructure': 5,
  'Relationships': 6,
  'Project & Aggregations': 7,
  'Building Controls Domain': 10,
  'HVAC Domain': 11,
  'Electrical Domain': 12,
  'Plumbing & Fire Domain': 13,
  'Structural Domain': 14,
  'Rail Domain': 15,
  'Road Domain': 16,
  'Geotechnical Domain': 17,
  'Geographic Domain': 18,
  'Properties': 20,
  'Quantities': 21,
  'Materials & Profiles': 22,
  'Geometry & Topology': 23,
  'Representation': 24,
  'Structural Loads': 25,
  'Constraints & Docs': 26,
  'Appearance': 27,
  'Date & Time': 28,
  'Measures & Units': 29,
  'Actors': 30,
  'Processes': 31,
  'Facilities & Mgmt': 32,
  'Utility': 33,
  'Other': 99,
};

export interface OverviewOptions {
  maxComponents: number;
}

interface DomainBucket {
  domain: string;
  layer: DomainLayer;
  members: ExpressFlowNode[];
}

export function classifyDomain(name: string): { domain: string; layer: DomainLayer } {
  for (const { pattern, label, layer } of DOMAIN_PATTERNS) {
    if (pattern.test(name)) return { domain: label, layer };
  }
  return { domain: 'Other', layer: 'Other' };
}

export function getDomainMembers(
  domainKey: string,
  allNodes: ExpressFlowNode[],
): ExpressFlowNode[] {
  return allNodes.filter(
    (n) => n.data.nodeType === 'ENTITY' && classifyDomain(n.data.label).domain === domainKey,
  );
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
    .map((b) => domainCardNode(b, byId))
    .slice(0, Math.max(4, Math.min(opts.maxComponents / 4, 14)));

  const half = Math.ceil(cards.length / 2);
  const leftCards = cards.slice(0, half);
  const rightCards = cards.slice(half);

  spreadInColumn(out, backbone, BACKBONE_X, ROW_H, BACKBONE_NODE_W, BACKBONE_NODE_H);
  spreadInColumn(out, leftCards, BACKBONE_X - CARD_GAP_X, ROW_H, CARD_NODE_W, CARD_NODE_H);
  spreadInColumn(out, rightCards, BACKBONE_X + CARD_GAP_X, ROW_H, CARD_NODE_W, CARD_NODE_H);

  return out;
}

function spreadInColumn(
  target: ExpressFlowNode[],
  items: ExpressFlowNode[],
  xCenter: number,
  step: number,
  nodeW: number,
  nodeH: number,
): void {
  if (items.length === 0) return;
  const totalSpan = (items.length - 1) * step;
  items.forEach((node, i) => {
    const centerY = i * step - totalSpan / 2;
    target.push(positionedExact(node, xCenter - nodeW / 2, centerY - nodeH / 2));
  });
}

function positionedExact(node: ExpressFlowNode, x: number, y: number): ExpressFlowNode {
  return {
    ...node,
    position: { x, y },
    data: { ...node.data, isActive: false, isHighlighted: false },
  };
}

function bucketByDomain(
  allNodes: ExpressFlowNode[],
  excludeIds: Set<string>,
): DomainBucket[] {
  const map = new Map<string, { layer: DomainLayer; members: ExpressFlowNode[] }>();
  for (const n of allNodes) {
    if (n.data.nodeType !== 'ENTITY') continue;
    if (excludeIds.has(n.id)) continue;
    const { domain, layer } = classifyDomain(n.data.label);
    if (!map.has(domain)) map.set(domain, { layer, members: [] });
    map.get(domain)!.members.push(n);
  }
  return [...map.entries()].map(([domain, { layer, members }]) => ({ domain, layer, members }));
}

function rankBuckets(buckets: DomainBucket[]): DomainBucket[] {
  return [...buckets].sort((a, b) => {
    const la = LAYER_RANK[a.layer];
    const lb = LAYER_RANK[b.layer];
    if (la !== lb) return la - lb;
    const pa = DOMAIN_PRIORITY[a.domain] ?? 999;
    const pb = DOMAIN_PRIORITY[b.domain] ?? 999;
    if (pa !== pb) return pa - pb;
    return b.members.length - a.members.length;
  });
}

function domainCardNode(bucket: DomainBucket, allById: Map<string, ExpressFlowNode>): ExpressFlowNode {
  const sortedMembers = [...bucket.members].sort((a, b) =>
    a.data.label.length - b.data.label.length || a.data.label.localeCompare(b.data.label));
  const target = pickDomainEntryPoint(bucket.members, allById) ?? sortedMembers[0];
  return {
    id: `__domain__${bucket.domain}`,
    type: 'expressDomainCardNode',
    position: { x: 0, y: 0 },
    data: {
      label: bucket.domain,
      nodeType: 'ENTITY',
      domain: bucket.domain,
      domainKey: bucket.domain,
      layer: bucket.layer,
      count: bucket.members.length,
      examples: sortedMembers.slice(0, 6).map((n) => n.data.label),
      targetId: target.id,
    },
  };
}

function pickDomainEntryPoint(
  members: ExpressFlowNode[],
  allById: Map<string, ExpressFlowNode>,
): ExpressFlowNode | null {
  if (members.length === 0) return null;

  const inheritsFrom = (node: ExpressFlowNode, ancestorId: string): boolean => {
    const seen = new Set<string>();
    const queue = [...(node.data.superTypes ?? [])];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      if (id === ancestorId) return true;
      const parent = allById.get(id);
      if (parent?.data.superTypes) queue.push(...parent.data.superTypes);
    }
    return false;
  };

  let best = members[0];
  let bestScore = -1;
  for (const m of members) {
    let score = 0;
    for (const other of members) {
      if (other.id === m.id) continue;
      if (inheritsFrom(other, m.id)) score++;
    }
    const beatsScore = score > bestScore;
    const tiebreakAbstract = score === bestScore
      && score > 0
      && m.data.isAbstract === true
      && best.data.isAbstract !== true;
    if (beatsScore || tiebreakAbstract) {
      bestScore = score;
      best = m;
    }
  }
  return bestScore > 0 ? best : null;
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
