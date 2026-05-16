import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Upload, AccountTree, Category, ListAlt, AltRoute } from '@mui/icons-material';
import { useTheme } from '../../../common/theme/ThemeContext';

interface LegendItem {
  icon: React.ReactNode;
  title: string;
  body: string;
  color: string;
}

export const ExpressEmptyState: React.FC = () => {
  const { colors } = useTheme();

  const items: LegendItem[] = [
    {
      icon: <AccountTree fontSize="small" />,
      title: 'ENTITY',
      body: 'Eine Klasse — die Hauptbausteine eines EXPRESS-Schemas. Erbt von Supertypen (SUBTYPE OF), hat Attribute.',
      color: colors.entity,
    },
    {
      icon: <Category fontSize="small" />,
      title: 'TYPE',
      body: 'Ein Alias auf einen Basistyp (STRING, REAL, …) oder eine Aggregation (LIST OF X).',
      color: colors.containment,
    },
    {
      icon: <ListAlt fontSize="small" />,
      title: 'ENUMERATION',
      body: 'Feste Liste benannter Werte (z.B. NORTH, SOUTH, EAST, WEST).',
      color: colors.typeNode,
    },
    {
      icon: <AltRoute fontSize="small" />,
      title: 'SELECT',
      body: 'Polymorphe Vereinigung — ein Attribut kann ein beliebiger der gelisteten Typen sein.',
      color: colors.composition,
    },
  ];

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          maxWidth: 640,
          px: 4,
          py: 3.5,
          bgcolor: colors.paper,
          boxShadow: colors.shadow,
          borderRadius: 2,
          pointerEvents: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Upload sx={{ fontSize: 32, color: colors.primary }} />
          <Typography variant="h6" sx={{ color: colors.text }}>
            EXPRESS-Schema laden
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: colors.secondaryText, mb: 2.5 }}>
          Drag &amp; Drop eine <code>.exp</code>-Datei (z.B. IFC4.3 von{' '}
          <span style={{ fontFamily: 'monospace' }}>buildingsmart.org</span>) oder klick auf
          das Upload-Symbol oben links. modvis parst das Schema und zeigt es als Klassendiagramm.
        </Typography>

        <Typography variant="subtitle2" sx={{ color: colors.text, mb: 1 }}>
          Was du sehen wirst:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {items.map((it) => (
            <Box key={it.title} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: 0.8,
                  bgcolor: it.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {it.icon}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight="bold" sx={{ color: colors.text }}>
                  {it.title}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.secondaryText }}>
                  {it.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 2.5, color: colors.secondaryText, fontStyle: 'italic' }}
        >
          IFC4.3 wird automatisch erkannt: die Übersicht zeigt dann <code>IfcRoot</code> und die
          Hauptzweige <code>IfcObjectDefinition</code>, <code>IfcRelationship</code>,{' '}
          <code>IfcPropertyDefinition</code>.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ExpressEmptyState;
