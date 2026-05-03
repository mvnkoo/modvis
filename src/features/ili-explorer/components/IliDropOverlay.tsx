import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Upload } from '@mui/icons-material';
import { useTheme } from '../../../common/theme/ThemeContext';

interface IliDropOverlayProps {
  visible: boolean;
}

export const IliDropOverlay: React.FC<IliDropOverlayProps> = ({ visible }) => {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <Box
      sx={{
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
      }}
    >
      <Paper
        elevation={6}
        sx={{
          px: 4,
          py: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Upload sx={{ fontSize: 48, color: colors.primary }} />
        <Typography variant="h6">INTERLIS-Modell hier ablegen</Typography>
        <Typography variant="caption" sx={{ color: colors.secondaryText }}>
          Nur .ili-Dateien werden akzeptiert
        </Typography>
      </Paper>
    </Box>
  );
};
