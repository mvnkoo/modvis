import React, { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position } from 'reactflow';
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

interface IliEnumValue {
  value: string;
  id?: string;
  comment?: string;
}

interface IliEnumNodeProps {
  data: {
    label: string;
    isHighlighted?: boolean;
    isActive?: boolean;
    enumValues?: IliEnumValue[];
    comment?: string;
    topic?: string;
    expanded?: boolean;
    isExpanded?: boolean;
    onExpandChange?: (expanded: boolean) => void;
    width?: number;
    onResize?: (width: number) => void;
  };
}

interface EnumValueRowProps { 
  value: IliEnumValue;
}

const EnumValueRow: React.FC<{ value: IliEnumValue }> = memo(({ value }) => {
  const { colors } = useTheme();
  
  const tooltipContent = value.comment && (
    <Box sx={{ p: 1, maxWidth: 400 }}>
      <Typography variant="caption" sx={{ 
        display: 'block',
        whiteSpace: 'pre-wrap',
        color: 'text.secondary'
      }}>
        {value.comment}
      </Typography>
    </Box>
  );
  
  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: '24px minmax(100px, 1fr)',
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
          bgcolor: 'text.primary'
        }} />
      </Box>
      <Tooltip 
        title={tooltipContent}
        placement="right"
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
        <Typography 
          sx={{ 
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            cursor: value.comment ? 'help' : 'default',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {value.value}
        </Typography>
      </Tooltip>
    </Box>
  );
});

export const IliEnumNode: React.FC<IliEnumNodeProps> = memo(({ data }) => {
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
            : `2px solid ${colors.typeNode}`,
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
        type="target" 
        position={Position.Left}
        id="left"
        style={{ opacity: 0 }}
      />
      <Handle 
        type="target" 
        position={Position.Left}
        id="enum-target"
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
        enterDelay={500}
        enterNextDelay={500}
        leaveDelay={0}        
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
          bgcolor: data.isHighlighted ? colors.selectedEntity : colors.typeNode,
          p: 1,
          textAlign: 'center',
          color: colors.nodeHeaderText
        }}>
          <Typography variant="subtitle2" fontWeight="bold">
            «ENUMERATION»
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {data.label}
          </Typography>
        </Box>
      </Tooltip>

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
            Werte
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

IliEnumNode.displayName = 'IliEnumNode';
export default IliEnumNode; 