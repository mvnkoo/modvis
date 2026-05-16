import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Paper, Typography, Box, Tooltip } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { ExpressFlowNodeData } from '../../services/types/ExpressBaseTypes';

interface Props extends NodeProps {
  data: ExpressFlowNodeData;
}

const ExpressTypeNode: React.FC<Props> = memo(({ data }) => {
  const { colors } = useTheme();
  const accent =
    data.isActive || data.isHighlighted ? colors.selectedEntity : colors.containment;

  return (
    <Paper
      elevation={2}
      sx={{
        width: 240,
        border: `2px solid ${accent}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: colors.nodeContent,
        color: colors.text,
        cursor: 'pointer',
        transition: 'box-shadow 200ms ease, border-color 600ms ease',
        '& .exp-node-header': { transition: 'background-color 600ms ease' },
        '&:hover': {
          boxShadow: colors.shadow,
          borderColor: colors.selectedEntity,
          '& .exp-node-header': { bgcolor: colors.selectedEntity },
        },
      }}
    >
      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0 }} />

      <Tooltip
        title={
          <Box sx={{ maxWidth: 320, p: 0.5 }}>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>TYPE</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              Alias auf einen Basistyp oder eine Aggregation — kein eigenes Objekt, sondern
              ein benannter Stempel für einen Wert.
            </Typography>
          </Box>
        }
        placement="top"
      >
        <Box className="exp-node-header" sx={{
          bgcolor: accent,
          color: '#FFFFFF',
          p: 0.8,
          textAlign: 'center',
        }}>
          <Typography variant="caption" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
            «TYPE»
          </Typography>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
        </Box>
      </Tooltip>

      <Box sx={{ px: 1, py: 0.5, fontFamily: 'monospace', fontSize: '0.74rem' }}>
        {data.aggregate ? `${data.aggregate} OF ` : ''}
        {data.baseType ?? '—'}
      </Box>
    </Paper>
  );
});

ExpressTypeNode.displayName = 'ExpressTypeNode';
export default ExpressTypeNode;
