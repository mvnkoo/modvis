import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { 
  Paper, 
  Typography, 
  Box, 
  IconButton, 
  Collapse 
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { IliModelNode as IliModelNodeType } from '../../services/types/IliModelTypes';

interface ModelNodeProps {
  data: IliModelNodeType & {
    label: string;
    isHighlighted?: boolean;
    imports?: string[];
  };
}

const ImportRow: React.FC<{ importName: string }> = memo(({ importName }) => {
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
        {importName}
      </Typography>
    </Box>
  );
});

export const IliModelNode: React.FC<ModelNodeProps> = memo(({ data }) => {
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
          : `2px solid ${colors.entity}`,
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
        type="source"
        position={Position.Right}
        id="right"
        style={{ opacity: 0 }}
      />

      <Box sx={{ 
        bgcolor: data.isHighlighted ? colors.selectedEntity : colors.entity,
        color: '#FFFFFF',
        p: 1,
        textAlign: 'center'
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          «MODEL»
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {data.label}
        </Typography>
        <Typography variant="caption">
          Version {data.version} ({data.language || 'unknown'})
        </Typography>
      </Box>

      <Box sx={{ 
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="caption">
          {data.imports?.length || 0} Imports
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
          {data.imports?.map((importName, index) => (
            <ImportRow key={index} importName={importName} />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
});

export default IliModelNode;