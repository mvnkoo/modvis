import { Node, Edge as ReactFlowEdge } from 'reactflow';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ScrollbarColors {
  track: string;
  thumb: string;
  thumbHover: string;
}

export interface SchemaColors {
  entity: string;
  abstractEntity: string;
  selectedEntity: string;
  typeNode: string;
  inheritance: string;
  typeReference: string;
  nodeSection: string;
  nodeContent: string;
  background: string;
  paper: string;
  console: string;
  codeViewer: string;
  minimap: string;
  success: string;
  appBar: string;
  primary: string;
  text: string;
  primaryText: string;
  secondaryText: string;
  scrollbar: ScrollbarColors;
  shadow: string;
}

export interface AttributeData {
  name: string;
  type: string;
  isOptional: boolean;
  isEnum?: boolean;
  isPset?: boolean;
  isReference?: boolean;
}

export interface NodeData {
  label: string;
  attributes?: AttributeData[];
  superTypes?: string[];
  subTypes?: string[];
  where?: string | null;
  isEnum?: boolean;
  enumValues?: string[] | null;
  isHighlighted?: boolean;
  isAbstract?: boolean;
  baseType?: string;
}

export interface SchemaNode extends Node {
  id: string;
  type: 'entityNode' | 'typeNode';
  position: { x: number; y: number };
  data: NodeData;
}

export interface SchemaEdge extends Omit<ReactFlowEdge, 'style'> {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: React.CSSProperties;
  data?: {
    propertyName?: string;
  };
}

export interface SchemaData {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
}

export interface SearchOption {
  id: string;
  label: string;
  type: 'Entity' | 'Type';
  description: string;
  category: string;
}

export interface TypeReference {
  id: string;
  name: string;
  isEnum: boolean;
}

export interface LayoutAnalysis {
  entitySpacing: number;
  enumSpacing: number;
  entityGroupStart: number;
  enumGroupStart: number;
  boundaries: {
    entityGroup: { height: number };
    enumGroup: { height: number };
    total: number;
  };
}

export interface EdgeProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  style?: React.CSSProperties;
  markerEnd?: string;
} 