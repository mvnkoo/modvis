import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Paper, Typography, Box, Tooltip, Chip } from '@mui/material';
import { Category } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';

type Layer = 'Core' | 'Shared' | 'Domain' | 'Resource' | 'Other';

interface DomainCardData extends Record<string, unknown> {
  domain: string;
  domainKey?: string;
  layer?: Layer;
  count: number;
  examples: string[];
  targetId: string;
}

interface Props extends NodeProps {
  data: DomainCardData;
}

const LAYER_COLORS: Record<Layer, string> = {
  Core: '#4a8fd6',
  Shared: '#5fb3a3',
  Domain: '#d68a4a',
  Resource: '#a48ad6',
  Other: '#8a8a8a',
};

const ExpressDomainCardNode: React.FC<Props> = memo(({ data }) => {
  const { colors } = useTheme();
  const layer = data.layer ?? 'Other';
  const layerColor = LAYER_COLORS[layer];
  return (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 320, p: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
            {layer} · {data.domain}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Klick zeigt alle {data.count} Entities dieser Domain, gruppiert nach ihren Vererbungs-Wurzeln.
          </Typography>
        </Box>
      }
      placement="top"
    >
      <Paper
        elevation={2}
        sx={{
          width: 240,
          border: `1.5px dashed ${colors.entity}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: colors.nodeContent,
          color: colors.text,
          cursor: 'pointer',
          transition: 'box-shadow 200ms ease, border-color 600ms ease',
          '&:hover': {
            boxShadow: colors.shadow,
            borderColor: colors.selectedEntity,
            borderStyle: 'solid',
          },
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.8,
          bgcolor: colors.entity,
          color: '#fff',
        }}>
          <Category fontSize="small" />
          <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1 }}>
            {data.domain}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontFamily: 'monospace' }}>
            {data.count}
          </Typography>
        </Box>
        <Box sx={{ px: 1, pt: 0.5, pb: 0.2 }}>
          <Chip
            label={layer}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.62rem',
              fontWeight: 600,
              bgcolor: layerColor,
              color: '#fff',
              '& .MuiChip-label': { px: 0.7 },
            }}
          />
        </Box>
        <Box sx={{ px: 1, py: 0.4 }}>
          {data.examples.slice(0, 4).map((ex) => (
            <Typography
              key={ex}
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                color: colors.secondaryText,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ex}
            </Typography>
          ))}
          {data.count > 4 && (
            <Typography variant="caption" sx={{ color: colors.secondaryText, fontStyle: 'italic' }}>
              … alle {data.count} per Klick
            </Typography>
          )}
        </Box>
      </Paper>
    </Tooltip>
  );
});

ExpressDomainCardNode.displayName = 'ExpressDomainCardNode';
export default ExpressDomainCardNode;
