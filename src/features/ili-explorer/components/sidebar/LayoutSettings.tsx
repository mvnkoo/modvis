import React, { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Popover,
  Box,
  Typography,
  Slider,
  Paper,
  Tooltip,
  TextField,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Settings } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface LayoutSettingsProps {
  maxSubTypesPerRow: number;
  onMaxSubTypesChange: (value: number) => void;
  hoverPreview: boolean;
  onHoverPreviewChange: (value: boolean) => void;
  fullHierarchy: boolean;
  onFullHierarchyChange: (value: boolean) => void;
}

export const LayoutSettings: React.FC<LayoutSettingsProps> = ({
  maxSubTypesPerRow,
  onMaxSubTypesChange,
  hoverPreview,
  onHoverPreviewChange,
  fullHierarchy,
  onFullHierarchyChange,
}) => {
  const { colors } = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [limitSubTypes, setLimitSubTypes] = useState(true);
  const [textFieldValue, setTextFieldValue] = useState('4');
  const initialSetupDone = useRef(false);

 
  useEffect(() => {
    if (!initialSetupDone.current) {
      setLimitSubTypes(true);
      onMaxSubTypesChange(4);
      setTextFieldValue('4');
      initialSetupDone.current = true;
    }
  }, [onMaxSubTypesChange]);

 
  useEffect(() => {
   
    if (maxSubTypesPerRow > 0) {
      setLimitSubTypes(true);
      setTextFieldValue(maxSubTypesPerRow.toString());
    } else {
      setLimitSubTypes(false);
      setTextFieldValue('');
    }
  }, [maxSubTypesPerRow]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const numValue = value as number;
    setTextFieldValue(numValue.toString());
    onMaxSubTypesChange(numValue);
    setLimitSubTypes(true);
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setLimitSubTypes(checked);
    if (checked) {
      onMaxSubTypesChange(4);
      setTextFieldValue('4');
    } else {
      onMaxSubTypesChange(0);
      setTextFieldValue('');
    }
  };

  const handleTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTextFieldValue(value);
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      onMaxSubTypesChange(numValue);
      setLimitSubTypes(true);
    }
  };

  const marks = Array.from({ length: 15 }, (_, i) => ({
    value: i + 1,
    label: (i + 1).toString()
  }));

  const open = Boolean(anchorEl);

  return (
    <Paper
      elevation={4}
      sx={{
        p: 0.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        mb: 1
      }}
    >
      <Tooltip title="Layout-Einstellungen">
        <IconButton onClick={handleClick} size="small">
          <Settings fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, width: 360 }}>
          <Typography variant="subtitle2" gutterBottom>
            Layout-Einstellungen
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={limitSubTypes}
                onChange={handleLimitChange}
                size="small"
              />
            }
            label="Anzahl Subtypen pro Reihe begrenzen"
          />

          <Box sx={{ 
            mt: 2,
            opacity: !limitSubTypes ? 0.5 : 1,
            pointerEvents: !limitSubTypes ? 'none' : 'auto'
          }}>
            <Typography variant="caption" gutterBottom>
              Maximale Anzahl Subtypen pro Reihe
            </Typography>
            
            <TextField
              size="small"
              value={textFieldValue}
              onChange={handleTextFieldChange}
              placeholder="Anzahl eingeben"
              type="number"
              InputProps={{
                inputProps: { 
                  min: 1,
                  max: 100
                }
              }}
              fullWidth
              sx={{ mt: 1, mb: 2 }}
            />

            <Slider
              value={!limitSubTypes ? 15 : (maxSubTypesPerRow || 4)}
              onChange={handleSliderChange}
              min={1}
              max={15}
              step={1}
              marks={marks}
              disabled={!limitSubTypes}
              sx={{
                mt: 1,
                '& .MuiSlider-mark': {
                  height: 8,
                },
                '& .MuiSlider-markLabel': {
                  fontSize: '0.75rem',
                  transform: 'translateX(-50%)',
                }
              }}
            />
          </Box>

          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={hoverPreview}
                  onChange={(e) => onHoverPreviewChange(e.target.checked)}
                  size="small"
                />
              }
              label="Hover-Preview"
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
              Zeigt beim Überfahren einer Klasse die nächsten zwei Subtyp-Ebenen als kleine Vorschau-Boxen.
            </Typography>
          </Box>

          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={fullHierarchy}
                  onChange={(e) => onFullHierarchyChange(e.target.checked)}
                  size="small"
                />
              }
              label="Vollständige Hierarchie anzeigen"
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
              Beim Umschalten wird die Ansicht zurückgesetzt.
            </Typography>
          </Box>
        </Box>
      </Popover>
    </Paper>
  );
}; 