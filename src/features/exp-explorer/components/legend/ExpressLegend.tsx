import React, { useState } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { ChevronRight, ChevronLeft } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface Props {
  showEnums: boolean;
  showSelects: boolean;
  onToggleEnums: (v: boolean) => void;
  onToggleSelects: (v: boolean) => void;
}

const ExpressLegend: React.FC<Props> = ({
  showEnums,
  showSelects,
  onToggleEnums,
  onToggleSelects,
}) => {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const elementItems = [
    { label: 'ENTITY', color: colors.entity },
    { label: 'ABSTRACT ENTITY', color: colors.abstractEntity, dashed: true },
    { label: 'TYPE', color: colors.containment },
    {
      label: 'ENUMERATION',
      color: colors.typeNode,
      toggle: () => onToggleEnums(!showEnums),
      disabled: !showEnums,
    },
    {
      label: 'SELECT',
      color: colors.composition,
      toggle: () => onToggleSelects(!showSelects),
      disabled: !showSelects,
    },
    { label: 'ACTIVE', color: colors.selectedEntity },
  ];

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        top: 68,
        right: 16,
        marginRight: 0.2,
        width: collapsed ? 42 : 170,
        bgcolor: colors.paper,
        borderRadius: 1,
        boxShadow: colors.shadow,
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 0.5,
        borderBottom: !collapsed ? `1px solid ${colors.nodeSection}` : 'none',
      }}>
        {!collapsed && (
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', ml: 1, color: colors.text }}>
            LEGENDE
          </Typography>
        )}
        <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ ml: 'auto' }}>
          {collapsed ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      {!collapsed && (
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: colors.text, mb: 0.5 }}>
            ELEMENTS
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {elementItems.map((it) => (
              <Box
                key={it.label}
                onClick={it.toggle}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  opacity: it.disabled ? 0.5 : 1,
                  cursor: it.toggle ? 'pointer' : 'default',
                }}
              >
                <Box sx={{
                  width: 16,
                  height: 16,
                  bgcolor: it.color,
                  borderRadius: 0.5,
                  border: it.dashed ? `1.5px dashed ${it.color}` : 'none',
                  outline: it.dashed ? `2px solid ${colors.paper}` : 'none',
                  outlineOffset: it.dashed ? '-2px' : '0',
                }} />
                <Typography variant="caption">{it.label}</Typography>
              </Box>
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{
            fontWeight: 'bold', color: colors.text, mt: 2, mb: 0.5,
          }}>
            RELATIONS
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: 22, height: 10 }}>
                <Box sx={{ flex: 1, height: 0, borderTop: `2px solid ${colors.inheritance}` }} />
                <svg width="10" height="10"><polygon points="0,1 9,5 0,9" fill={colors.nodeContent} stroke={colors.inheritance} strokeWidth="1.4" /></svg>
              </Box>
              <Typography variant="caption">SUBTYPE OF</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 20, height: 0,
                borderTop: `2px dashed ${colors.relationship}`,
              }} />
              <Typography variant="caption">REFERENCES</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: showEnums ? 1 : 0.5 }}>
              <Box sx={{ width: 20, height: 0, borderTop: `2px dashed ${colors.typeReference}` }} />
              <Typography variant="caption">ENUM REF</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: showSelects ? 1 : 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: 22, height: 10 }}>
                <Box sx={{ flex: 1, height: 0, borderTop: `1.5px solid ${colors.containment}` }} />
                <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={colors.containment} /></svg>
              </Box>
              <Typography variant="caption">SELECT MEMBER</Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ExpressLegend;
