import type { Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type {
  ExpressRelation,
  ExpressFlowNode,
} from './types/ExpressBaseTypes';
import type { ThemeColors } from '../../../common/theme/ThemeContext';

export const SUBTYPE_MARKER_ID = 'exp-arrow-inheritance';
export const TYPE_REF_MARKER_ID = 'exp-arrow-typeref';
export const SELECT_MARKER_ID = 'exp-arrow-select';
export const PAIR_MARKER_ID = 'exp-pair';

/**
 * Wandelt einen ExpressRelation in einen xyflow-Edge um. Style/Marker
 * werden je nach Relation-Typ gewählt; alle Marker-Defs leben einmalig
 * unter ExpressMarkerDefs.
 */
export function relationToEdge(
  rel: ExpressRelation,
  colors: ThemeColors,
  useCurvedLines: boolean,
  centerId?: string | null,
): Edge {
  const baseType = useCurvedLines ? 'default' : 'step';
  switch (rel.type) {
    case 'SUBTYPE_OF':
      return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: baseType,
        sourceHandle: 'top-source',
        targetHandle: 'bottom-target',
        style: { stroke: colors.inheritance, strokeWidth: 2 },
        markerEnd: `url(#${SUBTYPE_MARKER_ID})`,
        animated: false,
      };
    case 'TYPE_REF':
      return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: baseType,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        style: { stroke: colors.relationship, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.Arrow,
          color: colors.relationship,
          width: 18,
          height: 18,
        },
        data: { propertyName: rel.attributeName },
        animated: true,
      };
    case 'ENUM_REF':
      return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: baseType,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        style: { stroke: colors.typeReference, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.Arrow,
          color: colors.typeReference,
          width: 18,
          height: 18,
        },
        data: { propertyName: rel.attributeName },
        animated: true,
      };
    case 'SELECT_MEMBER':
      return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: baseType,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        style: { stroke: colors.containment, strokeWidth: 1.5 },
        markerEnd: `url(#${SELECT_MARKER_ID})`,
        animated: false,
      };
    case 'OBJECT_TYPE_PAIR': {
      const centerIsSource = centerId === rel.sourceId;
      return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: 'straight',
        sourceHandle: centerIsSource ? 'left-source' : 'right-source',
        targetHandle: centerIsSource ? 'right-target' : 'left-target',
        style: { stroke: colors.composition, strokeWidth: 2, strokeDasharray: '2 6' },
        markerEnd: `url(#${PAIR_MARKER_ID})`,
        animated: false,
        label: 'uses type',
        labelStyle: { fontSize: 10, fill: colors.composition, fontWeight: 600 },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: colors.paper, fillOpacity: 0.9 },
      };
    }
  }
}

export function isCenterEntity(node: ExpressFlowNode): boolean {
  return !!node.data.isActive;
}
