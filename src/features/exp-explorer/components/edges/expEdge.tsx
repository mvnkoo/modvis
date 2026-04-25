import React from 'react';
import { getBezierPath, Position } from '@xyflow/react';
import { EdgeProps } from '../../types/expTypes';

export const ExpSchemaEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
    curvature: 0.2
  });

  return (
    <path
      d={edgePath}
      style={{
        ...style,
        fill: 'none'
      }}
      markerEnd={markerEnd}
    />
  );
}; 