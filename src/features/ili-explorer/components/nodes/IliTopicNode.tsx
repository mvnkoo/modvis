import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Paper, 
  Typography, 
  Box, 
  IconButton, 
  Collapse 
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { IliTopicNode as IliTopicNodeType } from '../../services/types/IliModelTypes';

interface TopicNodeProps {
  data: IliTopicNodeType & {
    label: string;
    isHighlighted?: boolean;
    classes?: string[];
    structures?: string[];
    dependencies: string[];
  };
}

const DependencyRow: React.FC<{ dependency: string }> = memo(({ dependency }) => {
  const { colors } = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      py: 0.5,
      px: 1,
      '&:hover': {
        bgcolor: 'action.hover'
      }
    }}>
      <Box sx={{ 
        width: 6,
        height: 6,
        borderRadius: '50%',
        bgcolor: colors.typeReference,
      }} />
      <Typography 
        sx={{ 
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          lineHeight: 1.4
        }}
      >
        {dependency}
      </Typography>
    </Box>
  );
});

export const IliTopicNode: React.FC<TopicNodeProps> = memo(({ data }) => {
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
          : `2px solid ${colors.abstractEntity}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: colors.background,
        color: colors.text,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme => theme.shadows[8]
        }
      }}
    >
      <Handle type="source" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />

      <Box sx={{ 
        bgcolor: data.isHighlighted ? colors.selectedEntity : colors.abstractEntity,
        color: '#FFFFFF',
        p: 1,
        textAlign: 'center'
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          «TOPIC»
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {data.label}
        </Typography>
      </Box>

      <Box sx={{ 
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="caption">
          {data.dependencies.length} Dependencies
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleExpandClick}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 1 }}>
          {data.dependencies.length > 0 && (
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  p: 1,
                  bgcolor: theme => theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)'
                }}
              >
                DEPENDS ON:
              </Typography>
              {data.dependencies.map((dep, index) => (
                <DependencyRow key={index} dependency={dep} />
              ))}
            </Box>
          )}

          {data.classes && data.classes.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  p: 1,
                  bgcolor: theme => theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)'
                }}
              >
                Classes:
              </Typography>
              {data.classes.map((className, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    py: 0.5,
                    px: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  {className}
                </Box>
              ))}
            </Box>
          )}

          {data.structures && data.structures.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  p: 1,
                  bgcolor: theme => theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)'
                }}
              >
                Structures:
              </Typography>
              {data.structures.map((structureName, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    py: 0.5,
                    px: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  {structureName}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});

export default IliTopicNode;