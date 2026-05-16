import React, { useMemo, useState } from 'react';
import {
  Paper,
  IconButton,
  Tooltip,
  Popover,
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import { InfoOutlined, Warning } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type {
  ExpressParseResult,
  ExpressFlowNode,
} from '../../services/types/ExpressBaseTypes';

interface Props {
  parseResult: ExpressParseResult;
  fileName: string | null;
}

function summarizeDomains(nodes: ExpressFlowNode[]): Array<{ domain: string; count: number }> {
  const map = new Map<string, number>();
  for (const n of nodes) {
    if (n.data.nodeType !== 'ENTITY') continue;
    const m = n.data.label.match(/^Ifc([A-Z][a-z]+)/);
    const key = m ? m[1] : 'Other';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}

export const ExpressInfoPanel: React.FC<Props> = ({ parseResult, fileName }) => {
  const { colors } = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const stats = useMemo(() => {
    const entities = parseResult.nodes.filter((n) => n.data.nodeType === 'ENTITY');
    const abstractEntities = entities.filter((n) => n.data.isAbstract);
    const types = parseResult.nodes.filter((n) => n.data.nodeType === 'TYPE');
    const enums = parseResult.nodes.filter((n) => n.data.nodeType === 'ENUM');
    const selects = parseResult.nodes.filter((n) => n.data.nodeType === 'SELECT');
    const subtypeRels = parseResult.relations.filter((r) => r.type === 'SUBTYPE_OF');
    const refRels = parseResult.relations.filter(
      (r) => r.type === 'TYPE_REF' || r.type === 'ENUM_REF',
    );
    return {
      entities: entities.length,
      abstractEntities: abstractEntities.length,
      types: types.length,
      enums: enums.length,
      selects: selects.length,
      subtypeRels: subtypeRels.length,
      refRels: refRels.length,
      domains: summarizeDomains(parseResult.nodes),
      warnings: parseResult.warnings.length,
    };
  }, [parseResult]);

  const noSchema = parseResult.nodes.length === 0;
  const isIfc = parseResult.nodes.some((n) => n.id === 'IfcRoot');

  return (
    <Paper
      elevation={4}
      sx={{
        p: 0.5,
        bgcolor: 'background.paper',
        boxShadow: colors.shadow,
        borderRadius: 1,
        width: 'fit-content',
      }}
    >
      <Tooltip title="Modell-Info" placement="right">
        <span>
          <IconButton
            size="small"
            disabled={noSchema}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ width: 32, height: 32, borderRadius: 0.5 }}
          >
            <InfoOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { width: 380, maxHeight: 560, overflowY: 'auto', p: 2, ml: 1 } },
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
          Schema-Info
        </Typography>

        {fileName && (
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
            {fileName}
          </Typography>
        )}
        {parseResult.schemaName && (
          <Chip
            size="small"
            label={`SCHEMA ${parseResult.schemaName}`}
            sx={{ mb: 1.5, bgcolor: colors.entity, color: '#fff', fontFamily: 'monospace' }}
          />
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
          {isIfc && <Chip size="small" label="IFC" sx={{ bgcolor: colors.abstractEntity, color: '#fff' }} />}
          <Chip size="small" label={`${stats.entities} Entities`} />
          {stats.abstractEntities > 0 && (
            <Chip size="small" variant="outlined" label={`${stats.abstractEntities} abstract`} />
          )}
          <Chip size="small" label={`${stats.types} Types`} />
          <Chip size="small" label={`${stats.enums} Enums`} />
          <Chip size="small" label={`${stats.selects} Selects`} />
          {stats.warnings > 0 && (
            <Chip
              size="small"
              icon={<Warning fontSize="small" />}
              label={`${stats.warnings} Warnings`}
              sx={{ bgcolor: colors.typeNode, color: '#fff' }}
            />
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
          Beziehungen
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, fontFamily: 'monospace', fontSize: '0.74rem' }}>
          <Box>SUBTYPE OF: {stats.subtypeRels}</Box>
          <Box>REFERENCES: {stats.refRels}</Box>
        </Box>

        {stats.domains.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Top-Domains
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              {stats.domains.slice(0, 8).map((d) => (
                <Box key={d.domain} sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'monospace',
                  fontSize: '0.74rem',
                  px: 0.5,
                }}>
                  <span>Ifc{d.domain}*</span>
                  <span style={{ color: colors.secondaryText }}>{d.count}</span>
                </Box>
              ))}
            </Box>
          </>
        )}

        {parseResult.warnings.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Warnungen
            </Typography>
            {parseResult.warnings.slice(0, 5).map((w, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{ display: 'block', color: colors.secondaryText }}
              >
                {w.message}
              </Typography>
            ))}
          </>
        )}
      </Popover>
    </Paper>
  );
};

export default ExpressInfoPanel;
