import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Upload } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useTheme } from '../../../common/theme/ThemeContext';

interface Props {
  active: boolean;
}

const ExpressDropOverlay: React.FC<Props> = ({ active }) => {
  const { colors } = useTheme();
  if (!active) return null;
  return (
    <Box sx={{
      position: 'absolute',
      inset: 0,
      zIndex: 1500,
      bgcolor: alpha(colors.primary, 0.1),
      border: `3px dashed ${colors.primary}`,
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <Paper elevation={6} sx={{
        px: 4, py: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        bgcolor: colors.paper,
      }}>
        <Upload sx={{ fontSize: 48, color: colors.primary }} />
        <Typography variant="h6">EXPRESS-Schema hier ablegen</Typography>
        <Typography variant="caption" sx={{ color: colors.secondaryText }}>
          .exp / .express
        </Typography>
      </Paper>
    </Box>
  );
};

export default ExpressDropOverlay;
