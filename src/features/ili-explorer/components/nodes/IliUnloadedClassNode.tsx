import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Paper, Typography, Box } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { alpha } from '@mui/material/styles';
import { ResizeHandle } from './ResizeHandle';

interface IliUnloadedClassNodeProps {
  data: {
    label: string;
    className: string;
    width?: number;
    onResize?: (width: number) => void;
  };
}

export const IliUnloadedClassNode: React.FC<IliUnloadedClassNodeProps> = ({ data }) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(data.width || 400);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

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

 
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <Paper 
      elevation={2}
      onClick={handleClick}
      sx={{ 
        width: width,
        position: 'relative',
        border: `2px solid ${alpha(colors.text, 0.2)}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: alpha(colors.nodeContent, 0.5),
        color: colors.text,
        opacity: 0.7,
        pointerEvents: 'none'
      }}
    >
      <ResizeHandle position="right" onMouseDown={handleResizeStart} />
      
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ opacity: 0 }}
      />
      
      <Box sx={{ 
        bgcolor: alpha(colors.text, 0.1),
        p: 1,
        textAlign: 'center'
      }}>
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
          «EXTERNAL CLASS»
        </Typography>
        <Typography 
          variant="subtitle1" 
          fontWeight="bold" 
          color="text.secondary"
          sx={{ 
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            wordBreak: 'break-all'
          }}
        >
          Organisation
        </Typography>
      </Box>
      
      <Box sx={{ 
        p: 2,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Typography variant="caption" color="text.secondary">
          Modell nicht geladen
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            wordBreak: 'break-all'
          }}
        >
          SIA405_Base_Abwasser_1_LV95.Administration.Organisation
        </Typography>
      </Box>
    </Paper>
  );
};

export default IliUnloadedClassNode; 