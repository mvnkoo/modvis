import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Paper, Typography, Box, IconButton, Collapse, Tooltip } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { ExpressFlowNodeData } from '../../services/types/ExpressBaseTypes';
import ExpressAttributeRow from './ExpressAttributeRow';

interface Props extends NodeProps {
  data: ExpressFlowNodeData;
}

const HEADER_TEXT = '#FFFFFF';

const ExpressEntityNode: React.FC<Props> = memo(({ data }) => {
  const { colors } = useTheme();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = data.forcedExpanded !== undefined ? data.forcedExpanded : localExpanded;

  const direct = (data.attributes ?? []).filter((a) => !a.isInverse);
  const inverse = (data.attributes ?? []).filter((a) => a.isInverse);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalExpanded((x) => !x);
  }, []);

  const accent =
    data.isActive || data.isHighlighted
      ? colors.selectedEntity
      : data.isAbstract
        ? colors.abstractEntity
        : colors.entity;

  return (
    <Paper
      elevation={2}
      sx={{
        width: 380,
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
      <Handle type="target" position={Position.Top} id="top-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="top-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0 }} />

      <Tooltip
        title={
          <Box sx={{ maxWidth: 360, p: 0.5 }}>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
              {data.isAbstract ? 'ABSTRACT ENTITY' : 'ENTITY'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              {data.isAbstract
                ? 'Abstrakte Klasse — kann nicht direkt instanziiert werden, nur durch ihre Subtypen.'
                : 'Klasse — ein konkretes Objekt im EXPRESS-Schema.'}
            </Typography>
            {data.pairedTypeId && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                Object/Type-Paar: <strong>{data.pairedTypeId}</strong> (Vorlage / Catalog-Eintrag,
                verknüpft über <code>IfcRelDefinesByType</code>)
              </Typography>
            )}
            {data.pairedObjectId && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                Object/Type-Paar: <strong>{data.pairedObjectId}</strong> (konkrete Occurrence
                dieser Type-Vorlage)
              </Typography>
            )}
            {data.whereClause && (
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.7rem', whiteSpace: 'pre-wrap', mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                WHERE {data.whereClause}
              </Box>
            )}
          </Box>
        }
        placement="top"
      >
        <Box className="exp-node-header" sx={{
          bgcolor: accent,
          color: HEADER_TEXT,
          p: 1,
          textAlign: 'center',
        }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
            {data.isAbstract ? '«ABSTRACT ENTITY»' : '«ENTITY»'}
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {data.label}
          </Typography>
        </Box>
      </Tooltip>

      <Box sx={{
        bgcolor: colors.nodeSection,
        px: 1,
        py: 0.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography variant="caption" sx={{ color: colors.secondaryText }}>
          {direct.length} attr
          {inverse.length > 0 ? ` · ${inverse.length} inverse` : ''}
        </Typography>
        <IconButton size="small" onClick={handleToggle}>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {direct.length > 0 && (
          <Box sx={{ py: 0.5 }}>
            {direct.map((a) => <ExpressAttributeRow key={a.name} attr={a} />)}
          </Box>
        )}
        {inverse.length > 0 && (
          <>
            <Box sx={{
              px: 1, py: 0.4,
              borderTop: `1px solid ${colors.nodeSection}`,
              bgcolor: colors.nodeSection,
            }}>
              <Typography variant="caption" sx={{ color: colors.secondaryText }}>
                INVERSE
              </Typography>
            </Box>
            <Box sx={{ py: 0.5 }}>
              {inverse.map((a) => <ExpressAttributeRow key={a.name} attr={a} />)}
            </Box>
          </>
        )}
      </Collapse>
    </Paper>
  );
});

ExpressEntityNode.displayName = 'ExpressEntityNode';
export default ExpressEntityNode;
