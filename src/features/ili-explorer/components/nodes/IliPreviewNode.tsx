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
        borderRadius: 1,
        border: `1px dashed ${colors.text}`,
        bgcolor: 'background.paper',
        color: colors.text,
        opacity: data.isPlaceholder ? 0.4 : 0.65,
        pointerEvents: 'none',
        minWidth: 160,
        maxWidth: 220,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="preview-top" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="preview-bottom" style={{ opacity: 0 }} />
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.7rem',
          fontStyle: data.isPlaceholder ? 'italic' : 'normal',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }}
      >
        {data.label}
      </Typography>
    </Box>
  );
});

IliPreviewNode.displayName = 'IliPreviewNode';
export default IliPreviewNode;
