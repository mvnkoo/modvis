import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Paper, Typography, Box, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { NodeData } from '../../types/expTypes';

interface EnumNodeProps {
  data: NodeData;
}

const ExpEnumNode: React.FC<EnumNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        width: 400,
        border: data.isHighlighted 
          ? `2px solid ${colors.selectedEntity}` 
          : `2px solid ${colors.typeNode}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: colors.nodeContent,
        color: colors.text,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme => theme.palette.mode === 'dark' 
            ? '0 4px 15px rgba(255, 255, 255, 0.3)'
            : theme.shadows[8]
        }
      }}
    >
      <Handle 
        type="target" 
        position={Position.Left}
        style={{ opacity: 0 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right}
        style={{ opacity: 0 }} 
      />
      
      <Box sx={{ 
        bgcolor: data.isHighlighted ? colors.selectedEntity : colors.typeNode,
        color: '#FFFFFF',
        p: 1,
        textAlign: 'center'
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          «Enumeration»
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {data.label}
        </Typography>
      </Box>
      
      {/* Properties Section */}
      <Box sx={{ 
        bgcolor: colors.nodeSection,
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="subtitle2">
          {data.enumValues?.length || 0} Values
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleExpandClick}
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s'
          }}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Enum Values */}
      <Collapse in={expanded}>
        <Box sx={{ p: 1 }}>
          {data.enumValues?.map((value, index) => (
            <Box 
              key={index}
              sx={{
                py: 0.5,
                px: 1,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Typography 
                variant="body2"
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
});

ExpEnumNode.displayName = 'ExpEnumNode';

export default ExpEnumNode; 