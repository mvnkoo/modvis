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

const Settings: React.FC = () => {
  const { mode, setMode, colorScheme, setColorScheme } = useTheme();
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
            <FormControlLabel 
              value="purple" 
              control={<Radio size="small" />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#9d18e9', borderRadius: 1 }} />
                  <Typography variant="body2">Violett</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </MenuItem>
      </Menu>
    </>
  );
} 

export { Settings };