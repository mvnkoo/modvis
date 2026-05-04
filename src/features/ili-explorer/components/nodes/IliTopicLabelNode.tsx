import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface IliTopicLabelNodeProps {
  data: {
    label: string;
    classCount: number;
    isOrphanGroup?: boolean;
  };
}

export const IliTopicLabelNode: React.FC<IliTopicLabelNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  const accent = data.isOrphanGroup ? colors.text : colors.primary;
  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.5,
        borderLeft: `4px solid ${accent}`,
        bgcolor: 'transparent',
        color: colors.text,
        userSelect: 'none',
        pointerEvents: 'none',
        opacity: data.isOrphanGroup ? 0.85 : 1,
      }}
    >
      <Typography variant="overline" sx={{ display: 'block', lineHeight: 1, opacity: 0.7 }}>
        {data.isOrphanGroup ? 'NO TOPIC' : 'TOPIC'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 0.25 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {data.label}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.55 }}>
          {data.classCount} {data.classCount === 1 ? 'root class' : 'root classes'}
        </Typography>
      </Box>
    </Box>
  );
});

IliTopicLabelNode.displayName = 'IliTopicLabelNode';
export default IliTopicLabelNode;
