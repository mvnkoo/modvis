import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Paper, Typography, Box, Tooltip } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { alpha } from '@mui/material/styles';

interface IliUnsupportedNodeProps {
  data: {
    label: string;
    type?: string;
    isHighlighted?: boolean;
    isActive?: boolean;
    comment?: string;
  };
}

export const IliUnsupportedNode: React.FC<IliUnsupportedNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  const kind = data.type ?? 'UNKNOWN';

  return (
    <Paper
      elevation={1}
      sx={{
        minWidth: 240,
        maxWidth: 320,
        border: `2px dashed ${alpha(colors.text, 0.4)}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: alpha(colors.nodeContent, 0.5),
        color: colors.text,
        opacity: data.isActive ? 1 : 0.8,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      <Tooltip
        title={data.comment ?? `INTERLIS-${kind} — Visualisierung folgt`}
        placement="top"
      >
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ opacity: 0.6, letterSpacing: 1 }}>
            «{kind}»
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ wordBreak: 'break-word' }}>
            {data.label}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.5, fontStyle: 'italic' }}>
            Visualisierung folgt
          </Typography>
        </Box>
      </Tooltip>
    </Paper>
  );
});

IliUnsupportedNode.displayName = 'IliUnsupportedNode';
export default IliUnsupportedNode;
