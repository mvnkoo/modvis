import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Paper, Typography, Box, Tooltip } from '@mui/material';
import { Category } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface DomainCardData extends Record<string, unknown> {
  domain: string;
  count: number;
  examples: string[];
  targetId: string;
}

interface Props extends NodeProps {
  data: DomainCardData;
}

const ExpressDomainCardNode: React.FC<Props> = memo(({ data }) => {
  const { colors } = useTheme();
  return (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 320, p: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
            Domain · {data.domain}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {data.count} Entities. Klick öffnet den Einstiegspunkt dieser Gruppe.
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
        <Box sx={{ px: 1, py: 0.6 }}>
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
              + {data.count - 4} weitere
            </Typography>
          )}
        </Box>
      </Paper>
    </Tooltip>
  );
});

ExpressDomainCardNode.displayName = 'ExpressDomainCardNode';
export default ExpressDomainCardNode;
