import React from 'react';
import { useTheme } from '../../../common/theme/ThemeContext';

export const COMPOSITION_MARKER_ID = 'modvis-diamond-filled';
export const AGGREGATION_MARKER_ID = 'modvis-diamond-open';

const AssociationMarkerDefs: React.FC = () => {
  const { colors } = useTheme();
  const stroke = colors.composition;

  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={COMPOSITION_MARKER_ID}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="14"
          markerHeight="14"
          orient="auto-start-reverse"
        >
          <polygon points="0,6 6,2 12,6 6,10" fill={stroke} stroke={stroke} strokeWidth="1" />
        </marker>
        <marker
          id={AGGREGATION_MARKER_ID}
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="14"
          markerHeight="14"
          orient="auto-start-reverse"
        >
          <polygon points="0,6 6,2 12,6 6,10" fill="white" stroke={stroke} strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  );
};

export default AssociationMarkerDefs;
