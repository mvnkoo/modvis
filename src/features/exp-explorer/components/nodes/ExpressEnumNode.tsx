import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Paper, Typography, Box, IconButton, Collapse, Tooltip } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { ExpressFlowNodeData } from '../../services/types/ExpressBaseTypes';

interface Props extends NodeProps {
  data: ExpressFlowNodeData;
}

const ExpressEnumNode: React.FC<Props> = memo(({ data }) => {
  const { colors } = useTheme();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = data.forcedExpanded !== undefined ? data.forcedExpanded : localExpanded;
  const values = data.enumValues ?? [];
  const accent =
    data.isActive || data.isHighlighted ? colors.selectedEntity : colors.typeNode;

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalExpanded((x) => !x);
  }, []);

  return (
    <Paper
      elevation={2}
      sx={{
        width: 240,
        border: `2px solid ${accent}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: colors.nodeContent,
        color: colors.text,
        cursor: 'pointer',
        transition: 'box-shadow 200ms ease, border-color 600ms ease',
        '& .exp-node-header': { transition: 'background-color 600ms ease' },
        '&:hover': {
          boxShadow: colors.shadow,
          borderColor: colors.selectedEntity,
          '& .exp-node-header': { bgcolor: colors.selectedEntity },
        },
      }}
    >
      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0 }} />

      <Tooltip
        title={
          <Box sx={{ maxWidth: 320, p: 0.5 }}>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>ENUMERATION</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              Feste Liste benannter Werte — in IFC typischerweise als PredefinedType-Attribut
              an Entities (z.B. <code>IfcWallTypeEnum</code> mit STANDARD, POLYGONAL, …).
            </Typography>
          </Box>
        }
        placement="top"
      >
        <Box className="exp-node-header" sx={{ bgcolor: accent, color: '#FFFFFF', p: 0.8, textAlign: 'center' }}>
          <Typography variant="caption" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
            «ENUM»
          </Typography>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
        </Box>
      </Tooltip>

      <Box sx={{
        bgcolor: colors.nodeSection,
        px: 1, py: 0.4,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography variant="caption" sx={{ color: colors.secondaryText }}>
          {values.length} values
        </Typography>
        <IconButton size="small" onClick={toggle}>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ py: 0.5 }}>
          {values.map((v) => (
            <Typography
              key={v}
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                px: 1.5, py: 0.2,
                color: colors.text,
              }}
            >
              {v}
            </Typography>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
});

ExpressEnumNode.displayName = 'ExpressEnumNode';
export default ExpressEnumNode;
