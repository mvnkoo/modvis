import React, { useState } from 'react';
import {
  Paper,
  IconButton,
  Tooltip,
  Popover,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Divider,
} from '@mui/material';
import { Settings } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { ExpressLayoutOptions } from '../../services/types/ExpressBaseTypes';

interface Props {
  options: ExpressLayoutOptions;
  onChange: <K extends keyof ExpressLayoutOptions>(k: K, v: ExpressLayoutOptions[K]) => void;
}

const SUBTYPE_MARKS = Array.from({ length: 14 }, (_, i) => ({ value: i + 2, label: '' }));

export const ExpressSettings: React.FC<Props> = ({ options, onChange }) => {
  const { colors } = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

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
      <Tooltip title="Einstellungen" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ width: 32, height: 32, borderRadius: 0.5 }}
          >
            <Settings fontSize="small" />
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
          paper: { sx: { width: 380, p: 2, ml: 1 } },
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
          Anzeige-Einstellungen
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={options.showFullHierarchy}
              onChange={(_, v) => onChange('showFullHierarchy', v)}
            />
          }
          label="Vollständige Hierarchie zeigen"
        />
        <Typography variant="caption" sx={{ display: 'block', color: colors.secondaryText, mb: 1, ml: 4 }}>
          Beim Fokussieren wird die komplette SUBTYPE-Kette nach oben sichtbar.
        </Typography>

        <Divider sx={{ my: 1 }} />

        <FormControlLabel
          control={
            <Switch
              checked={options.limitSubTypes}
              onChange={(_, v) => onChange('limitSubTypes', v)}
            />
          }
          label="Anzahl Subtypen pro Reihe begrenzen"
        />
        <Box sx={{
          opacity: options.limitSubTypes ? 1 : 0.5,
          pointerEvents: options.limitSubTypes ? 'auto' : 'none',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          mt: 1,
          mb: 1,
          px: 1,
        }}>
          <TextField
            value={options.maxSubTypesPerRow}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n) && n >= 1 && n <= 50) onChange('maxSubTypesPerRow', n);
            }}
            type="number"
            size="small"
            sx={{ width: 80 }}
            inputProps={{ min: 1, max: 50 }}
          />
          <Slider
            value={options.maxSubTypesPerRow}
            min={2}
            max={15}
            step={1}
            marks={SUBTYPE_MARKS}
            onChange={(_, v) => onChange('maxSubTypesPerRow', Array.isArray(v) ? v[0] : v)}
            sx={{ flex: 1 }}
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Max. Komponenten in der Übersicht
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: colors.secondaryText, mb: 1 }}>
          IFC4.3 hat &gt; 800 Entities — die Übersicht zeigt nur eine sinnvolle Teilmenge.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 1, mb: 1 }}>
          <TextField
            value={options.maxComponents}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n) && n >= 5 && n <= 1000) onChange('maxComponents', n);
            }}
            type="number"
            size="small"
            sx={{ width: 90 }}
            inputProps={{ min: 5, max: 1000 }}
          />
          <Slider
            value={options.maxComponents}
            min={10}
            max={300}
            step={10}
            valueLabelDisplay="auto"
            onChange={(_, v) => onChange('maxComponents', Array.isArray(v) ? v[0] : v)}
            sx={{ flex: 1 }}
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        <FormControlLabel
          control={
            <Switch
              checked={options.showEnums}
              onChange={(_, v) => onChange('showEnums', v)}
            />
          }
          label="Enums anzeigen"
        />
        <FormControlLabel
          control={
            <Switch
              checked={options.showSelects}
              onChange={(_, v) => onChange('showSelects', v)}
            />
          }
          label="Select-Typen anzeigen"
        />
        <FormControlLabel
          control={
            <Switch
              checked={options.useCurvedLines}
              onChange={(_, v) => onChange('useCurvedLines', v)}
            />
          }
          label="Geschwungene Linien"
        />
      </Popover>
    </Paper>
  );
};

export default ExpressSettings;
