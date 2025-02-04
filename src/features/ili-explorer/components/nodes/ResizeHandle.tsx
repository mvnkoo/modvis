import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface ResizeHandleProps {
  position: 'left' | 'right';
  onMouseDown: (e: React.MouseEvent) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ position, onMouseDown }) => {
  const { colors } = useTheme();
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMouseDown(e);
  };
  
  return (
    <Box
      className="nodrag"
      onMouseDown={handleMouseDown}
      sx={{
        position: 'absolute',
        top: 0,
        [position]: -3,
        width: 6,
        height: '100%',
        cursor: 'ew-resize',
        zIndex: 1000,
        pointerEvents: 'all',
        touchAction: 'none',
        '&:hover::after': {
          bgcolor: colors.primary,
          opacity: 0.8
        },
        '&:active::after': {
          bgcolor: colors.primary
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 2,
          height: '100%',
          bgcolor: 'transparent',
          transition: 'background-color 0.2s'
        }
      }}
    />
  );
}; 