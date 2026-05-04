import React, { memo } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface IliTopicFrameNodeProps {
  data: {
    width: number;
    height: number;
  };
}

export const IliTopicFrameNode: React.FC<IliTopicFrameNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  return (
    <Box
      sx={{
        width: data.width,
        height: data.height,
        border: `3px dashed ${colors.text}`,
        opacity: 0.55,
        borderRadius: 2,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
});

IliTopicFrameNode.displayName = 'IliTopicFrameNode';
export default IliTopicFrameNode;
