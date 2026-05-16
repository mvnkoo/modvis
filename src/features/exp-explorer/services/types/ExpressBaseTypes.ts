import type { Node, Edge } from '@xyflow/react';

export type ExpressNodeType =
  | 'ENTITY'
  | 'TYPE'
  | 'ENUM'
  | 'SELECT';

export type ExpressRelationType =
  | 'SUBTYPE_OF'
  | 'TYPE_REF'
  | 'ENUM_REF'
  | 'SELECT_MEMBER'
  | 'OBJECT_TYPE_PAIR';

export type ExpressAggregate =
  | 'LIST'
  | 'SET'
  | 'BAG'
  | 'ARRAY'
  | null;

export interface ExpressAttribute {
  name: string;
  type: string;            // raw textual type (`IfcLabel`, `LIST [1:?] OF IfcRoot`, ...)
  baseType: string;        // unwrapped reference (`IfcLabel`, `IfcRoot`)
  isOptional: boolean;
  isInverse: boolean;
  isDerived: boolean;
  aggregate: ExpressAggregate;
  cardinality?: string;    // `[1:?]`, `[0:3]`
}

export interface ExpressFlowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: ExpressNodeType;
  // ENTITY ------------------------------------------------------------
  attributes?: ExpressAttribute[];
  superTypes?: string[];
  subTypes?: string[];
  isAbstract?: boolean;
  isSupertypeOf?: string[];   // for ABSTRACT SUPERTYPE OF (ONEOF(...))
  whereClause?: string | null;
  // TYPE --------------------------------------------------------------
  baseType?: string;          // underlying primitive (STRING, INTEGER, REAL, …)
  aggregate?: ExpressAggregate;
  // ENUM --------------------------------------------------------------
  enumValues?: string[];
  // SELECT ------------------------------------------------------------
  selectMembers?: string[];
  isHighlighted?: boolean;
  isActive?: boolean;
  forcedExpanded?: boolean | undefined;
  pairedTypeId?: string;
  pairedObjectId?: string;
  // DOMAIN CARD (overview) --------------------------------------------
  domain?: string;
  domainKey?: string;
  layer?: 'Core' | 'Shared' | 'Domain' | 'Resource' | 'Other';
  count?: number;
  examples?: string[];
  targetId?: string;
}

export type ExpressFlowNode = Node<ExpressFlowNodeData>;
export type ExpressFlowEdge = Edge;

export interface ExpressRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: ExpressRelationType;
  attributeName?: string;     // for TYPE_REF / ENUM_REF
}

export interface ExpressParseError {
  message: string;
  line?: number;
}

export interface ExpressParseWarning {
  message: string;
  line?: number;
}

export interface ExpressParseResult {
  schemaName?: string;
  nodes: ExpressFlowNode[];
  relations: ExpressRelation[];
  errors: ExpressParseError[];
  warnings: ExpressParseWarning[];
}

export interface ExpressSearchOption {
  id: string;
  label: string;
  type: ExpressNodeType;
  description: string;
  category: string;
}

export interface ExpressLayoutOptions {
  showFullHierarchy: boolean;
  useCurvedLines: boolean;
  showSelects: boolean;
  showEnums: boolean;
  useMagicLayout: boolean;
  forcedExpanded?: boolean;
  resetCounter: number;
  maxComponents: number;
  limitSubTypes: boolean;
  maxSubTypesPerRow: number;
}
