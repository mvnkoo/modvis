import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Paper, Box } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface BaseNodeProps {
  data: {
    label: string;
    isHighlighted?: boolean;
    isActive?: boolean;
    [key: string]: any;
  };
  children: React.ReactNode;
  borderColor: string;
  headerBgColor: string;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  data,
  children,
  borderColor,
  headerBgColor
}) => {
  const { colors } = useTheme();
  
  return (
    <Paper 
      elevation={2}
      sx={{ 
        width: 400,
        border: data.isActive 
          ? `2px solid ${colors.selectedEntity}`
          : data.isHighlighted 
            ? `2px solid ${colors.selectedEntity}` 
            : `2px solid ${borderColor}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: data.isActive ? colors.selectedNodeBg : colors.nodeContent,
        color: colors.text,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: colors.shadow
        }
      }}
    >
      <Handle type="source" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      
      <Box sx={{ 
        bgcolor: headerBgColor,
        p: 1,
        textAlign: 'center',
        color: colors.nodeHeaderText
      }}>
        {children}
      </Box>
    </Paper>
  );
}; 