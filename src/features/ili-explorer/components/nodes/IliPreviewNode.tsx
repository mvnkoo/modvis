import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface IliPreviewNodeProps {
  data: {
    label: string;
    isPlaceholder?: boolean;
  };
}

export const IliPreviewNode: React.FC<IliPreviewNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  return (
    <Box
      sx={{
        position: 'relative',
        px: 1.25,
        py: 0.5,
        borderRadius: 0.5,
        border: `1px solid ${colors.selectedEntity}`,
        bgcolor: 'background.paper',
        color: colors.text,
        pointerEvents: 'none',
        width: 180,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        opacity: data.isPlaceholder ? 0.65 : 1,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} id="preview-left" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="preview-bottom" style={{ opacity: 0 }} />
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.72rem',
          fontWeight: data.isPlaceholder ? 400 : 500,
          fontStyle: data.isPlaceholder ? 'italic' : 'normal',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
          letterSpacing: 0.2,
        }}
      >
        {data.label}
      </Typography>
    </Box>
  );
});

IliPreviewNode.displayName = 'IliPreviewNode';
export default IliPreviewNode;
