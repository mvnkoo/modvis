import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
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
import { ResizeHandle } from './ResizeHandle';
import { alpha } from '@mui/material/styles';

interface IliEnumValue {
  value: string;
  id?: string;
  comment?: string;
  subValues?: IliEnumValue[];
  parentValue?: string;
  extends?: string;
}

interface IliDomainEnumNodeProps {
  data: {
    label: string;
    isHighlighted?: boolean;
    isActive?: boolean;
    enumValues?: IliEnumValue[];
    comment?: string;
    isDomainEnum: true;
    isAllOf?: boolean;
    baseEnum?: string;
    expanded?: boolean;
    isExpanded?: boolean;
    onExpandChange?: (expanded: boolean) => void;
    width?: number;
    onResize?: (width: number) => void;
  };
}

const EnumValueRow: React.FC<{ value: IliEnumValue; depth?: number }> = memo(({ value, depth = 0 }) => {
  const { colors } = useTheme();
  
  const getTooltipContent = (value: IliEnumValue): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    
    if (value.comment) {
      parts.push(
        <Typography variant="caption" sx={{ display: 'block' }}>
          {value.comment}
        </Typography>
      );
    }
    
    return parts.length ? <Box sx={{ p: 1 }}>{parts}</Box> : null;
  };

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: '24px minmax(100px, 1fr)',
      gap: 1,
      alignItems: 'start',
      py: 0.5,
      px: 1,
      pl: 1 + depth * 2,
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
          bgcolor: 'text.primary'
        }} />
      </Box>
      <Box>
        <Tooltip 
          title={getTooltipContent(value)}
          placement="right"
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: colors.paper,
                color: colors.text,
                boxShadow: colors.shadow,
                maxWidth: 'none'
              }
            }
          }}
        >
          <Typography 
            sx={{ 
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              lineHeight: 1.4,
              color: colors.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {value.value}
            {value.comment && (
              <Typography 
                component="span" 
                sx={{ 
                  ml: 1,
                  color: 'text.secondary',
                  fontSize: '0.7rem'
                }}
              >
                ({value.comment})
              </Typography>
            )}
          </Typography>
        </Tooltip>
      </Box>
    </Box>
  );
});

export const IliDomainEnumNode: React.FC<IliDomainEnumNodeProps> = memo(({ data }) => {
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

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

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
            : `2px solid ${alpha(colors.typeNode, 0.8)}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: data.isActive ? colors.selectedNodeBg : colors.nodeContent,
        color: colors.text,
        '&:hover': {
          boxShadow: colors.shadow
        }
      }}
    >
      <ResizeHandle position="right" onMouseDown={handleResizeStart} />
      
      <Handle 
        type="target"
        position={Position.Left}
        id="left"
        style={{ 
          opacity: 1,
          background: colors.typeReference,
          width: 8,
          height: 8
        }}
      />
      
      <Box sx={{ 
        bgcolor: data.isHighlighted 
          ? colors.selectedEntity 
          : alpha(colors.typeNode, 0.8),
        p: 1,
        textAlign: 'center',
        color: colors.nodeHeaderText
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          «DOMAIN ENUMERATION»
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {data.label}
        </Typography>
        {data.isAllOf && data.baseEnum && (
          <Typography variant="caption">
            ALL OF {data.baseEnum}
          </Typography>
        )}
      </Box>

      <Box sx={{ 
        bgcolor: colors.nodeSection,
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: colors.text
      }}>
        <Typography variant="subtitle2">
          {data.enumValues?.length || 0} Values
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleExpandClick}
          sx={{ color: colors.text }}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              p: 1,
              bgcolor: colors.nodeSection,
              color: colors.text,
              fontWeight: 'bold'
            }}
          >
            Domain Values
          </Typography>
          <Box>
            {data.enumValues?.map((value, index) => (
              <EnumValueRow key={index} value={value} />
            ))}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
});

IliDomainEnumNode.displayName = 'IliDomainEnumNode';
export default IliDomainEnumNode; 