import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Paper, Typography, Box, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { NodeData, AttributeData } from '../../types/expTypes';

interface EntityNodeProps extends NodeProps {
  data: NodeData;
}

interface PropertyRowProps {
  property: AttributeData;
}

const PropertyRow: React.FC<PropertyRowProps> = memo(({ property }) => {
  const { colors } = useTheme();
  
  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: '24px minmax(100px, 1fr) minmax(100px, 1.2fr)',
      gap: 1,
      alignItems: 'start',
      py: 0.5,
      px: 1,
      transition: 'background-color 0.2s',
      borderRadius: 1,
      '&:hover': {
        bgcolor: 'action.hover'
      }
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        height: '100%',
        pt: 0.3
      }}>
        <Box sx={{ 
          width: 6,
          height: 6,
          borderRadius: '50%',
          border: '1.5px solid',
          borderColor: 'primary.main',
          bgcolor: property.isOptional ? 'transparent' : 'primary.main',
          boxShadow: theme => `0 0 0 1px ${theme.palette.background.paper}`,
        }} />
      </Box>
      <Typography 
        sx={{ 
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.4
        }}
      >
        {property.name}
      </Typography>
      <Typography 
        sx={{ 
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          color: property.isReference ? colors.typeReference : colors.primaryText,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.4
        }}
      >
        {property.type}
      </Typography>
    </Box>
  );
});

export const ExpEntityNode: React.FC<EntityNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<boolean>(false);

  const psetProperties = data.attributes?.filter(attr => attr.isPset) || [];
  const normalProperties = data.attributes?.filter(attr => !attr.isPset) || [];

  const handleExpandClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setExpanded(!expanded);
  }, [expanded]);

  const PropertiesHeader: React.FC = () => (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: '24px minmax(100px, 1fr) minmax(100px, 1.2fr)',
      gap: 1,
      px: 1,
      py: 0.5,
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
    }}>
      <Typography variant="caption" fontWeight="medium" sx={{ color: 'text.secondary' }}>
        
      </Typography>
      <Typography variant="caption" fontWeight="medium" sx={{ color: 'text.secondary' }}>
        Name
      </Typography>
      <Typography variant="caption" fontWeight="medium" sx={{ color: 'text.secondary' }}>
        Typ
      </Typography>
    </Box>
  );

  return (
    <Paper 
      elevation={2}
      sx={{ 
        width: 400,
        border: data.isHighlighted 
          ? `2px solid ${colors.selectedEntity}` 
          : data.isAbstract
            ? `2px solid ${colors.abstractEntity}` 
            : `2px solid ${colors.entity}`,
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
      {/* Handles */}
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
      
      {/* Header */}
      <Box sx={{ 
        bgcolor: data.isHighlighted ? colors.selectedEntity : colors.entity,
        color: '#FFFFFF',
        p: 1,
        textAlign: 'center'
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Entity
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
          {data.attributes?.length || 0} Properties
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleExpandClick}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Properties Content */}
      <Collapse in={expanded}>
        <Box>
          {normalProperties.length > 0 && (
            <>
              <PropertiesHeader />
              {normalProperties.map((prop, index) => (
                <PropertyRow key={index} property={prop} />
              ))}
            </>
          )}

          {psetProperties.length > 0 && (
            <>
              <Box sx={{ 
                px: 1, 
                py: 0.5, 
                bgcolor: theme => theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(0,0,0,0.02)',
                borderTop: 1,
                borderBottom: 1,
                borderColor: 'divider'
              }}>
                <Typography 
                  variant="caption" 
                  fontWeight="medium"
                  color="text.secondary"
                >
                  Property Sets
                </Typography>
              </Box>
              {psetProperties.map((prop, index) => (
                <PropertyRow key={index} property={prop} />
              ))}
            </>
          )}

          {/* Where Clause Section */}
          {data.where && (
            <Box sx={{ 
              borderTop: 1,
              borderColor: 'divider',
              mt: 1
            }}>
              <Box sx={{ 
                px: 1, 
                py: 0.5, 
                bgcolor: theme => theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(0,0,0,0.02)'
              }}>
                <Typography 
                  variant="caption" 
                  fontWeight="medium"
                  color="text.secondary"
                >
                  WHERE
                </Typography>
              </Box>
              <Box sx={{ p: 1 }}>
                {data.where.split(' OR ').map((condition, index, array) => (
                  <React.Fragment key={index}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: 1,
                      py: 0.5
                    }}>
                      {array.length > 1 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: colors.secondaryText,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            pt: 0.2
                          }}
                        >
                          {index === 0 ? '' : index === array.length - 1 ? '└' : '├'}
                        </Typography>
                      )}
                      <Typography 
                        variant="body2" 
                        component="div"
                        sx={{ 
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.75rem',
                          lineHeight: 1.4,
                          wordBreak: 'break-word'
                        }}
                      >
                        {condition}
                      </Typography>
                    </Box>
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});

PropertyRow.displayName = 'PropertyRow';
ExpEntityNode.displayName = 'ExpEntityNode';

export default ExpEntityNode;