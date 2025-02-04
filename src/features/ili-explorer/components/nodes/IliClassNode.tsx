import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { 
  Paper, 
  Typography, 
  Box, 
  IconButton, 
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip
} from '@mui/material';
import { ExpandMore, ExpandLess, KeyboardArrowDown, KeyboardArrowRight, ChevronRight } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { ResizeHandle } from './ResizeHandle';
import { 
  IliAttribute,
  IliEnumValue 
} from '../../services/types/IliBaseTypes';
import { alpha } from '@mui/material/styles';

interface IliClassNodeProps {
  data: {
    id?: string;
    label: string;
    isHighlighted?: boolean;
    isAbstract?: boolean;
    isActive?: boolean;
    attributes?: IliAttribute[];
    extends?: string[];
    comment?: string;
    topic?: string;
    inheritedAttributes?: InheritedAttributesProps[];
    expanded?: boolean;
    onExpandChange?: (expanded: boolean) => void;
    width?: number;
    onResize?: (width: number) => void;
  };
}

interface AttributeRowProps {
  attribute: IliAttribute;
}

interface InheritedAttributesProps {
  className: string;
  attributes: IliAttribute[];
}

const AttributeRow: React.FC<AttributeRowProps> = memo(({ attribute }) => {
  const { colors } = useTheme();
  
  const displayType = useMemo(() => {
    if (attribute.isEnum) {
      return 'ENUMERATION';
    }
    if (attribute.isDomainEnum) {
      return `ENUMERATION (${attribute.domainEnumName})`;
    }
    return attribute.type;
  }, [attribute]);
  
  const tooltipContent = useMemo(() => (
    <Box sx={{ p: 1, maxWidth: 400 }}>
      {attribute.comment && (
        <Typography variant="caption" sx={{ 
          display: 'block',
          whiteSpace: 'pre-wrap',
          color: 'text.secondary'
        }}>
          {attribute.comment}
        </Typography>
      )}
      
      {(attribute.isEnum || attribute.isDomainEnum) && attribute.enumValues && (
        <Box sx={{ mt: attribute.comment ? 1 : 0 }}>
          <Typography variant="caption" sx={{ 
            fontWeight: 'bold', 
            display: 'block', 
            mb: 0.5 
          }}>
            Mögliche Werte:
          </Typography>
          {attribute.enumValues.map((enumValue, index) => (
            <Box key={index} sx={{ ml: 1 }}>
              <Typography variant="caption" sx={{ 
                display: 'block',
                fontFamily: 'monospace'
              }}>
                • {enumValue.value}
                {enumValue.subValues?.map((subValue, subIndex) => (
                  <Box key={`${index}-${subIndex}`} sx={{ ml: 2 }}>
                    <Typography variant="caption" sx={{ 
                      display: 'block',
                      fontFamily: 'monospace'
                    }}>
                      ∟ {subValue.value}
                    </Typography>
                  </Box>
                ))}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {!attribute.isEnum && !attribute.isDomainEnum && attribute.type.includes('..') && (
        <Box sx={{ mt: attribute.comment ? 1 : 0 }}>
          <Typography variant="caption" sx={{ 
            fontWeight: 'bold', 
            display: 'block',
            fontFamily: 'monospace'
          }}>
            {attribute.type}
          </Typography>
        </Box>
      )}
    </Box>
  ), [attribute]);
  
  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: '24px minmax(100px, 1fr) minmax(100px, 1.2fr)',
      gap: 1,
      alignItems: 'start',
      py: 0.5,
      px: 1,
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
          borderColor: 'text.primary',
          bgcolor: attribute.mandatory ? 'text.primary' : 'transparent',
          boxShadow: theme => `0 0 0 1px ${theme.palette.background.paper}`,
        }} />
      </Box>
      <Tooltip 
        title={tooltipContent}
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
        <Typography 
          sx={{ 
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            cursor: 'help',
            wordBreak: 'break-word'
          }}
        >
          {attribute.name}
        </Typography>
      </Tooltip>
      <Tooltip 
        title={tooltipContent}
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
        <Typography 
          sx={{ 
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: attribute.isEnum || attribute.isDomainEnum ? colors.typeReference : colors.propertyText,
            lineHeight: 1.4,
            cursor: 'help',
            wordBreak: 'break-word'
          }}
        >
          {displayType}
        </Typography>
      </Tooltip>
    </Box>
  );
});

export const IliClassNode = memo<IliClassNodeProps>(({ data }) => {
  const { colors } = useTheme();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(data.width || 400);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleExpandClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.onExpandChange) {
      data.onExpandChange(!data.expanded);
    }
  };

  const formatTopic = (topic?: string) => {
    if (!topic) return '';
    
    const parts = topic.split('.');
    if (parts.length > 1) {
      return `${parts[0]} • ${parts[parts.length - 1]}`;
    }
    return topic;
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    document.body.classList.add('resizing');
    
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

    e.preventDefault();
  }, [data.onResize]);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    document.body.classList.remove('resizing');

    const preventClick = (e: MouseEvent) => {
      e.stopPropagation();
      document.removeEventListener('click', preventClick, true);
    };
    document.addEventListener('click', preventClick, true);
  }, [handleResizeMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  useEffect(() => {
    if (data.width && data.width !== width) {
      setWidth(data.width);
    }
  }, [data.width]);

  return (
    <>
      <Handle
        type="source"
        position={Position.Top}
        id="top"
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
        type="source"
        position={Position.Right}
        id="enum-source"
        style={{ opacity: 0 }}
      />
      
      <Paper 
        ref={nodeRef}
        elevation={2}
        data-nodeid={data.id}
        data-expanded={data.expanded}
        data-height={0}
        sx={{ 
          width: width,
          position: 'relative',
          userSelect: resizingRef.current ? 'none' : 'auto',
          border: data.isActive 
            ? `2px solid ${colors.selectedEntity}` 
            : data.isHighlighted 
              ? `2px solid ${colors.selectedEntity}` 
              : data.isAbstract
                ? `2px solid ${colors.abstractEntity}` 
                : `2px solid ${colors.inheritance}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: data.isActive ? colors.selectedNodeBg : colors.nodeContent,
          color: colors.text,
          transition: 'box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme => theme.shadows[8]
          }
        }}
      >
        <ResizeHandle position="right" onMouseDown={handleResizeStart} />
        
        <Tooltip 
          title={
            <Box sx={{ p: 1, maxWidth: 400 }}>
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 'bold', 
                display: 'block', 
                mb: 0.5,
                color: colors.text
              }}>
                {data.label}
                {data.isAbstract && ' (Abstract)'}
              </Typography>
              {data.comment && (
                <Typography variant="caption" sx={{ 
                  display: 'block',
                  whiteSpace: 'pre-wrap',
                  color: colors.text,
                  opacity: 0.8,
                  mb: 1
                }}>
                  {data.comment}
                </Typography>
              )}
              {data.topic && (
                <Box sx={{ 
                  mt: 0.5,
                  pt: 1,
                  borderTop: `1px solid ${alpha(colors.text, 0.1)}`
                }}>
                  <Typography variant="caption" sx={{ 
                    display: 'block',
                    color: colors.text,
                    opacity: 0.7,
                    fontFamily: 'monospace',
                    fontSize: '0.7rem'
                  }}>
                    {data.topic}
                  </Typography>
                </Box>
              )}
            </Box>
          }
          placement="top"
          enterDelay={500}
          enterNextDelay={500}
          leaveDelay={0}
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: colors.paper,
                color: colors.text,
                boxShadow: colors.shadow,
                '& .MuiTooltip-arrow': {
                  color: colors.paper
                }
              }
            }
          }}
        >
          <Box sx={{ 
            bgcolor: data.isHighlighted 
              ? colors.selectedEntity 
              : data.isAbstract
                ? colors.abstractEntity 
                : colors.inheritance,
            p: 1,
            textAlign: 'center',
            color: '#FFFFFF'
          }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {data.isAbstract ? 'ABSTRACT CLASS' : 'CLASS'}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {data.label}
            </Typography>
            {data.topic && (
              <Typography variant="caption">
                {data.topic}
              </Typography>
            )}
          </Box>
        </Tooltip>

        <Box 
          onClick={(e) => e.stopPropagation()}
          sx={{ 
            bgcolor: colors.nodeSection,
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="subtitle2">
            {data.attributes?.length || 0} Attributes
          </Typography>
          <IconButton 
            size="small" 
            onClick={handleExpandClick}
          >
            {data.expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={data.expanded}>
          <Box>
            {data.inheritedAttributes && data.inheritedAttributes.length > 0 && (
              <Box 
                onClick={(e) => e.stopPropagation()}
                sx={{ mt: 1 }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    p: 1,
                    bgcolor: colors.nodeSection,
                    fontWeight: 'bold'
                  }}
                >
                  Geerbte Attribute ({data.inheritedAttributes.length})
                </Typography>
                {data.inheritedAttributes.map((inherited, index) => (
                  <Accordion 
                    key={index} 
                    sx={{ 
                      '&:before': { display: 'none' },
                      boxShadow: 'none',
                      bgcolor: 'transparent'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMore />}
                      sx={{ 
                        minHeight: 'unset !important',
                        p: 1,
                        '& .MuiAccordionSummary-content': {
                          m: 0
                        }
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {inherited.className} ({inherited.attributes.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, bgcolor: 'rgba(0, 0, 0, 0.01)' }}>
                      {inherited.attributes.map((attr, attrIndex) => (
                        <AttributeRow key={attrIndex} attribute={attr} />
                      ))}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {data.attributes && data.attributes.length > 0 && (
              <Box sx={{ mt: data.inheritedAttributes?.length ? 2 : 0 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    p: 1,
                    bgcolor: colors.nodeSection,
                    fontWeight: 'bold'
                  }}
                >
                  Eigene Attribute ({data.attributes.length})
                </Typography>
                {data.attributes.map((attr, index) => (
                  <AttributeRow key={index} attribute={attr} />
                ))}
              </Box>
            )}

            {data.extends && data.extends.length > 0 && (
              <Box sx={{ 
                borderTop: 1,
                borderColor: 'divider',
                p: 1
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: 'text.secondary',
                    mb: 1
                  }}
                >
                  EXTENDS
                </Typography>
                {data.extends.map((ext, index) => (
                  <Typography 
                    key={index}
                    variant="body2"
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: colors.inheritance
                    }}
                  >
                    {ext}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.data.expanded === nextProps.data.expanded &&
    prevProps.data.isActive === nextProps.data.isActive &&
    prevProps.data.isHighlighted === nextProps.data.isHighlighted &&
    JSON.stringify(prevProps.data.attributes) === JSON.stringify(nextProps.data.attributes)
  );
});

IliClassNode.displayName = 'IliClassNode';