import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Paper, Typography, Box, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { NodeData } from '../../types/expTypes';

interface TypeNodeProps extends NodeProps {
  data: NodeData;
}

export const ExpTypeNode: React.FC<TypeNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<boolean>(false);

  const handleExpandClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setExpanded(!expanded);
  }, [expanded]);

  const renderEnumValues = useCallback(() => (
    <Box>
      {data.enumValues?.map((value, index) => (
        <Box 
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
            pl: 1,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <Typography 
            variant="body2"
            sx={{ 
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: colors.primaryText
            }}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  ), [data.enumValues, colors.primaryText]);

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
        position={Position.Bottom}
        id="bottom"
        style={{ opacity: 0 }} 
      />
      <Handle 
        type="source" 
        position={Position.Top}
        id="top"
        style={{ opacity: 0 }} 
      />
      <Handle 
        type="target" 
        position={Position.Left}
        id="left"
        style={{ opacity: 0 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right}
        id="right"
        style={{ opacity: 0 }} 
      />
      
      <Box sx={{ 
        bgcolor: data.isHighlighted ? colors.selectedEntity : colors.typeNode,
        color: '#FFFFFF',
        p: 1,
        textAlign: 'center'
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          «{data.isEnum ? 'Enumeration' : 'Type'}»
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {data.label}
        </Typography>
      </Box>
      
      <Box sx={{ 
        bgcolor: colors.nodeSection,
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="subtitle2">
          {data.isEnum ? 'Enumeration Values' : 'Base Type'}
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleExpandClick}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ 
          bgcolor: colors.nodeContent,
          p: 1 
        }}>
          {data.isEnum ? (
            renderEnumValues()
          ) : (
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace',
                py: 0.5,
                pl: 1,
                fontSize: '0.75rem',
                color: theme => theme.palette.primary.main
              }}
            >
              {data.baseType}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});

ExpTypeNode.displayName = 'ExpTypeNode';

export default ExpTypeNode;