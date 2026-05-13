import React, { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Paper, 
  Typography, 
  Box, 
  IconButton, 
  Collapse,
  Divider,
  Tooltip
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { IliAssociation } from '../../services/types/IliBaseTypes';
import { alpha } from '@mui/material/styles';
import { ResizeHandle } from './ResizeHandle';

interface IliAssociationNodeProps {
  data: {
    label: string;
    isHighlighted?: boolean;
    isActive?: boolean;
    association: IliAssociation;
    expanded?: boolean;
    isExpanded?: boolean;
    onExpandChange?: (expanded: boolean) => void;
    width?: number;
    onResize?: (width: number) => void;
    isSource?: boolean;
    comment?: string;
    showArrow?: boolean;
    arrowDirection?: 'left' | 'right';
  };
}

export const IliAssociationNode: React.FC<IliAssociationNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  const expanded = data.expanded || data.isExpanded || false;
  const [width, setWidth] = useState(data.width || 400);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleExpandClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.onExpandChange) {
      data.onExpandChange(!expanded);
    }
  }, [data.onExpandChange, expanded]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [width]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    
    const delta = e.clientX - startXRef.current;
    const newWidth = Math.max(300, Math.min(800, startWidthRef.current + delta));
    setWidth(newWidth);
    
    if (data.onResize) {
      data.onResize(newWidth);
    }
  }, [data.onResize]);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

 
  const getShortClassName = (fullName: string) => {
    const parts = fullName.split('.');
    return parts[parts.length - 1];
  };

 
  return (
    <Paper 
      elevation={2}
      sx={{ 
        width: width,
        position: 'relative',
        border: data.isActive 
          ? `2px solid ${colors.selectedEntity}`
          : data.isHighlighted 
            ? `2px solid ${colors.selectedEntity}` 
            : `2px solid ${colors.relationship}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: data.isActive ? colors.selectedNodeBg : colors.nodeContent,
        color: colors.text,
        transition: 'box-shadow 0.2s ease-in-out, background-color 1400ms ease-out, border-color 1400ms ease-out',
        '& .ili-node-header': {
          transition: 'background-color 1400ms ease-out',
        },
        '&:hover': {
          boxShadow: colors.shadow,
          ...(data.isActive ? {} : {
            ...(expanded ? {} : { bgcolor: alpha(colors.selectedEntity, 0.18) }),
            borderColor: colors.selectedEntity,
            '& .ili-node-header': {
              bgcolor: colors.selectedEntity,
            },
          }),
        }
      }}
    >
      <ResizeHandle position="right" onMouseDown={handleResizeStart} />
      
      <Handle 
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ opacity: 0 }}
      />
      <Handle 
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ opacity: 0 }}
      />
      <Handle 
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ opacity: 0 }}
      />
      <Handle 
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ opacity: 0 }}
      />
      
      <Tooltip 
        title={
          data.comment && (
            <Box sx={{ p: 1, maxWidth: 400 }}>
              <Typography variant="caption" sx={{ 
                display: 'block',
                whiteSpace: 'pre-wrap',
                color: 'text.secondary'
              }}>
                {data.comment}
              </Typography>
            </Box>
          )
        }
        placement="top"
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: colors.paper,
              color: colors.text,
              boxShadow: colors.shadow
            }
          }
        }}
      >
        <Box className="ili-node-header" sx={{
          bgcolor: data.isActive || data.isHighlighted
            ? colors.selectedEntity
            : data.isSource
              ? alpha(colors.relationship, 0.8)
              : alpha(colors.relationship, 0.5),
          p: 1,
          textAlign: 'center',
          color: '#FFFFFF',
          borderTopLeftRadius: 'inherit',
          borderTopRightRadius: 'inherit',
          overflow: 'hidden'
        }}>
          <Typography variant="subtitle2" fontWeight="bold">
            «ASSOCIATION»
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {data.association.name}
          </Typography>
        </Box>
      </Tooltip>

      <Box sx={{
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: colors.nodeSection,
        borderBottomLeftRadius: expanded ? 0 : 2,
        borderBottomRightRadius: expanded ? 0 : 2,
        overflow: 'hidden'
      }}>
        <Typography variant="subtitle2">
          Relationship Details
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
          p: 2,
          bgcolor: colors.nodeContent,
          borderBottomLeftRadius: 'inherit',
          borderBottomRightRadius: 'inherit',
          overflow: 'hidden'
        }}>
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              sx={{ mb: 1, fontWeight: 600 }}
            >
              Source Class
            </Typography>
            
            <Tooltip 
              title={data.association.sourceRole && (
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" sx={{ 
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    color: 'text.secondary'
                  }}>
                    Role: {data.association.sourceRole}
                  </Typography>
                </Box>
              )}
              placement="left"
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: colors.paper,
                    color: colors.text,
                    boxShadow: colors.shadow
                  }
                }
              }}
            >
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) max-content',
                gap: 2,
                alignItems: 'start'
              }}>
                <Box>
                  <Typography 
                    variant="body2" 
                    color={colors.propertyText}
                    sx={{ 
                      fontFamily: 'monospace',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {getShortClassName(data.association.sourceClass)}
                  </Typography>
                  {data.association.sourceRole && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      as {data.association.sourceRole}
                    </Typography>
                  )}
                </Box>
                {data.association.sourceCardinality && (
                  <Typography
                    variant="body2"
                    color={colors.propertyText}
                    sx={{
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                      bgcolor: alpha(colors.primary, 0.1),
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 600
                    }}
                  >
                    [{data.association.sourceCardinality}]
                  </Typography>
                )}
              </Box>
            </Tooltip>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              sx={{ mb: 1, fontWeight: 600 }}
            >
              Target Class
            </Typography>
            
            <Tooltip 
              title={data.association.targetRole && (
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" sx={{ 
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    color: 'text.secondary'
                  }}>
                    Role: {data.association.targetRole}
                  </Typography>
                </Box>
              )}
              placement="right"
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: colors.paper,
                    color: colors.text,
                    boxShadow: colors.shadow
                  }
                }
              }}
            >
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) max-content',
                gap: 2,
                alignItems: 'start'
              }}>
                <Box>
                  <Typography 
                    variant="body2"
                    color={colors.propertyText}
                    sx={{ 
                      fontFamily: 'monospace',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {getShortClassName(data.association.targetClass)}
                  </Typography>
                  {data.association.targetRole && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      as {data.association.targetRole}
                    </Typography>
                  )}
                </Box>
                {data.association.targetCardinality && (
                  <Typography
                    variant="body2"
                    color={colors.propertyText}
                    sx={{
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                      bgcolor: alpha(colors.primary, 0.1),
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 600
                    }}
                  >
                    [{data.association.targetCardinality}]
                  </Typography>
                )}
              </Box>
            </Tooltip>
          </Box>
        </Box>
      </Collapse>

      {!data.isActive && data.showArrow && (
        <Box sx={{ 
          position: 'absolute',
          top: '50%',
          [data.arrowDirection === 'left' ? 'left' : 'right']: -16,
          transform: 'translateY(-50%)',
         
         
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          [data.arrowDirection === 'left' 
            ? 'borderRight' 
            : 'borderLeft']: `12px solid ${colors.relationship}`,
          opacity: 0.8
        }} />
      )}
    </Paper>
  );
});

IliAssociationNode.displayName = 'IliAssociationNode';
export default IliAssociationNode; 