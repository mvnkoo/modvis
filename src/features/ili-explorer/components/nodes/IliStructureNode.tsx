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
import { IliStructureNode as IliStructureNodeType } from '../../services/types/IliModelTypes';
import { IliAttribute } from '../../services/types/IliBaseTypes';

interface StructureNodeProps {
  data: IliStructureNodeType & {
    label: string;
    isHighlighted?: boolean;
    topicName?: string;
  };
}

interface AttributeRowProps {
  attribute: IliAttribute;
}

const AttributeRow: React.FC<AttributeRowProps> = memo(({ attribute }) => {
  const { colors } = useTheme();
  
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
          borderColor: 'primary.main',
          bgcolor: attribute.mandatory ? 'primary.main' : 'transparent',
          boxShadow: theme => `0 0 0 1px ${theme.palette.background.paper}`,
        }} />
      </Box>
      <Typography 
        sx={{ 
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          lineHeight: 1.4
        }}
      >
        {attribute.name}
      </Typography>
      <Typography 
        sx={{ 
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          color: attribute.isReference ? colors.typeReference : 'primary.main',
          lineHeight: 1.4
        }}
      >
        {attribute.type}
      </Typography>
    </Box>
  );
});

export const IliStructureNode: React.FC<StructureNodeProps> = memo(({ data }) => {
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
        bgcolor: data.isHighlighted ? colors.selectedEntity : colors.typeNode,
        color: '#FFFFFF',
        p: 1,
        textAlign: 'center'
      }}>
        <Typography variant="subtitle2" fontWeight="bold">
          «STRUCTURE»
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {data.label}
        </Typography>
        {data.topicName && (
          <Typography variant="caption">
            {data.topicName}.{data.label}
          </Typography>
        )}
      </Box>

      <Box sx={{ 
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="caption">
          {data.attributes.length} Attributes
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
          {data.attributes.map((attr, index) => (
            <AttributeRow key={index} attribute={attr} />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
});

export default IliStructureNode;