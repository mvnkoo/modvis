import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
  Box,
  Radio,
  RadioGroup
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../settings/SettingsContext';

const ACCENT_PRESETS: { label: string; color: string }[] = [
  { label: 'Orange', color: '#e65a1a' },
  { label: 'Lila', color: '#613F82' },
  { label: 'Beton', color: '#6e7378' },
  { label: 'Haselnuss', color: '#8b5e3c' },
];

const Settings: React.FC = () => {
  const { mode, setMode, colorScheme, setColorScheme, accentColor, setAccentColor } = useTheme();
  const {
    experimentalFeatures, setExperimentalFeatures,
    parserBackend, setParserBackend,
  } = useSettings();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton 
        onClick={handleClick} 
        color="inherit"
        size="small"
        sx={{ 
          backgroundColor: 'rgba(255,255,255,0.1)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.2)',
          }
        }}
      >
        <SettingsIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 220 }
        }}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}  
                onChange={(e) => setMode(e.target.checked ? 'dark' : 'light')}
                color='primary'
              />
            }
            label="Dark Mode"
          />
        </MenuItem>
        <Divider />
        <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" gutterBottom>
            Farbschema
          </Typography>
          <RadioGroup
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
          >
            <FormControlLabel 
              value="default" 
              control={<Radio size="small" />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#2196f3', borderRadius: 1 }} />
                  <Typography variant="body2">Standard</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="highContrast"
              control={<Radio size="small" />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#000000', borderRadius: 1 }} />
                  <Typography variant="body2">Hoher Kontrast</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </MenuItem>
        <Divider />
        <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" gutterBottom>
            Aktiv-Farbe
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map(preset => {
              const selected = accentColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <Box
                  key={preset.color}
                  onClick={() => setAccentColor(preset.color)}
                  title={preset.label}
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor: preset.color,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: selected ? 'text.primary' : 'transparent',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.18)',
                    transition: 'transform 120ms ease',
                    '&:hover': { transform: 'scale(1.08)' },
                  }}
                />
              );
            })}
            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
              Eigene:
            </Typography>
            <Box
              component="input"
              type="color"
              value={accentColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccentColor(e.target.value)}
              sx={{
                width: 26,
                height: 26,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '50%',
                cursor: 'pointer',
                bgcolor: 'transparent',
                p: 0,
              }}
            />
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" gutterBottom>
            Parser-Backend (ILI-Explorer)
          </Typography>
          <RadioGroup
            value={parserBackend}
            onChange={(e) => setParserBackend(e.target.value as 'legacy' | 'ng')}
          >
            <FormControlLabel
              value="ng"
              control={<Radio size="small" />}
              label={<Typography variant="body2">Chevrotain (Standard)</Typography>}
            />
            <FormControlLabel
              value="legacy"
              control={<Radio size="small" />}
              label={<Typography variant="body2">Legacy Regex (Old)</Typography>}
            />
          </RadioGroup>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Modell neu laden, damit der Wechsel greift.
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={experimentalFeatures}
                onChange={(e) => setExperimentalFeatures(e.target.checked)}
                color="primary"
              />
            }
            label="Experimentelle Features"
          />
        </MenuItem>
      </Menu>
    </>
  );
}


export { Settings };