import React from 'react';
import { useTheme } from '../../../common/theme/ThemeContext';
import {
  SUBTYPE_MARKER_ID,
  SELECT_MARKER_ID,
  PAIR_MARKER_ID,
} from '../services/flowMapping';

/**
 * Wiederverwendbare SVG-Marker für Express-Edges:
 *   - SUBTYPE_OF: hollow UML-Triangle (Subtype → Supertype)
 *   - SELECT_MEMBER: filled circle (Select → Member)
 * TYPE_REF und ENUM_REF nutzen den eingebauten xyflow-Pfeil (Arrow) — die
 * Marker hier sind nur für Spezialformen.
 */
const ExpressMarkerDefs: React.FC = () => {
  const { colors } = useTheme();
  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={SUBTYPE_MARKER_ID}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="14"
          markerHeight="14"
          orient="auto-start-reverse"
        >
          <polygon
            points="0,1 11,6 0,11"
            fill={colors.nodeContent}
            stroke={colors.inheritance}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </marker>
        <marker
          id={SELECT_MARKER_ID}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <circle
            cx="6"
            cy="6"
            r="4"
            fill={colors.containment}
            stroke={colors.containment}
            strokeWidth="1"
          />
        </marker>
        <marker
          id={PAIR_MARKER_ID}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <polygon
            points="0,2 10,6 0,10 3,6"
            fill={colors.composition}
            stroke={colors.composition}
            strokeWidth="1"
          />
        </marker>
      </defs>
    </svg>
  );
};

export default ExpressMarkerDefs;
