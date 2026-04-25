import type { Node } from '@xyflow/react';

export type IliNodeType =
  | 'MODEL'
  | 'TOPIC'
  | 'CLASS'
  | 'STRUCTURE'
  | 'ASSOCIATION'
  | 'ENUMERATION'
  | 'enumNode'
  | 'domainEnumNode';

export interface IliFlowNodeData {
  [key: string]: any;
  label?: string;
  isHighlighted?: boolean;
  isActive?: boolean;
}

export type IliNode = Node<IliFlowNodeData>;

export interface SearchOption {
  id: string;
  label: string;
  type: string;
  description: string;
  category: string;
}


export interface IliEnumValue {
  value: string;
  id?: string;
  comment?: string;
  subValues?: IliEnumValue[];
  parentValue?: string;
  extends?: string;
}

export interface IliAttribute {
  name: string;
  type: string;
  mandatory: boolean;
  cardinality?: string;
  isEnum?: boolean;
  isInlineEnum?: boolean;
  isDomainEnum?: boolean;
  isReference?: boolean;
  isAllOf?: boolean;
  baseEnum?: string;
  domainEnumName?: string;
  enumValues?: IliEnumValue[];
  comment?: string;
  attributeGroup?: string;
  domainEnumRef?: string;
}

export interface IliAssociation {
  id: string;
  name: string;
  sourceClass: string;
  targetClass: string;
  sourceRole?: string;
  targetRole?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
}

export interface IliBaseNodeData {
  label: string;
  isHighlighted: boolean;
  isActive: boolean;
  enumValues?: IliEnumValue[];
  isInlineEnum?: boolean;
  isDomainEnum?: boolean;
  ownerClass?: string;
  width?: number;
  onResize?: (width: number) => void;
  extends?: string;
  [key: string]: any;
}

export interface IliBaseNode {
  id: string;
  type: IliNodeType;
  name: string;
  position: {
    x: number;
    y: number;
  };
  isAbstract?: boolean;
  data: IliBaseNodeData;
}

export type IliRelationType = 
  | 'EXTENDS' 
  | 'DEPENDS' 
  | 'ASSOCIATES'
  | 'REFERENCES';

export interface IliRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: IliRelationType;
  role?: string;
  cardinality?: string;
}

export interface IliEnumDefinition {
  name: string;
  values: string[];
  comment?: string;
}

export interface NavigationState {
  nodeId: string;
  showEnums: boolean;
  showAssociations: boolean;
  label?: string;
  type?: string;
  isAbstract?: boolean;
  timestamp?: number;
}

export interface IliAssociationNodeData extends IliBaseNodeData {
  association: IliAssociation;
  isSource?: boolean;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export interface DomainDefinition {
  type: 'NUMERIC' | 'ENUMERATION';
  min?: string;
  max?: string;
  unit?: string;
  values?: IliEnumValue[];
  extends?: string;
} 