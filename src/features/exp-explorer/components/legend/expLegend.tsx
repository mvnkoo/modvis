import React, { useState } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { ChevronRight, ChevronLeft } from '@mui/icons-material';

interface LegendItem {
  label: string;
  color: string;
}

const ExpLegend: React.FC = () => {
  const { colors } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const legendItems: LegendItem[] = [
    { label: 'ABSTRACT', color: colors.abstractEntity },
    { label: 'ENTITY', color: colors.entity },
    { label: 'SELECTED', color: colors.selectedEntity },
    { label: 'TYPE/ENUM', color: colors.typeNode },
    // { label: 'ACTIVE', color: colors.selectedEntity }
  ];

  const attributeItems = [
    { label: 'MANDATORY', type: 'filled' },
    { label: 'OPTIONAL', type: 'outlined' }
  ];

  const relationItems = [
    { label: 'SUPERTYPE OF', color: colors.inheritance, style: 'solid' },
    { label: 'REFERENCES', color: colors.relationship, style: 'dashed' },
    { label: 'TYPE OF', color: colors.reference, style: 'dotted' }
  ];

  return (
    <Paper 
      elevation={4}
      sx={{ 
        position: 'absolute',
        top: 58,
        right: 0,
        marginRight: 0.2,
        width: isCollapsed ? '48px' : 220,
        minHeight: isCollapsed ? '100%' : 'auto',
        bgcolor: colors.paper,
        zIndex: 1000,
        borderRadius: 1,
        boxShadow: colors.shadow,
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header mit Toggle-Button */}
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        borderBottom: !isCollapsed ? `1px solid ${colors.nodeSection}` : 'none'
      }}>
        {!isCollapsed && (
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            color: colors.text,
          }}>
            LEGEND
          </Typography>
        )}
        <IconButton 
          size="small" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{ 
            ml: 'auto',
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      {/* Content */}
      {!isCollapsed && (
        <Box sx={{ p: 1.5 }}>
          {/* Entity Types */}
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            color: colors.text,
            mb: 0.5
          }}>
            ELEMENTS
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            {legendItems.map((item, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 0.5,
                '&:last-child': { mb: 0 }
              }}>
                <Box 
                  sx={{ 
                    width: 16, 
                    height: 16, 
                    bgcolor: item.color,
                    borderRadius: 1,
                    mr: 2.5
                  }} 
                />
                <Typography variant="body2" sx={{ color: colors.text }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Attributes */}
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            color: colors.text,
            mb: 0.5
          }}>
            ATTRIBUTES
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            {attributeItems.map((item, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 0.5,
                '&:last-child': { mb: 0 }
              }}>
                <Box 
                  sx={{ 
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: item.type === 'filled' ? colors.primary : 'transparent',
                    border: `1.5px solid ${colors.primary}`,
                    mr: 3.5
                  }} 
                />
                <Typography variant="body2" sx={{ color: colors.text }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Relations */}
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            color: colors.text,
            mb: 0.5
          }}>
            RELATIONS
          </Typography>
          <Box>
            {relationItems.map((item, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 0.5,
                '&:last-child': { mb: 0 }
              }}>
                <Box 
                  sx={{ 
                    width: 20,
                    height: 0,
                    borderTop: item.style === 'solid' 
                      ? `2px solid ${item.color}`
                      : item.style === 'dashed'
                      ? `2px dashed ${item.color}`
                      : `2px dotted ${item.color}`,
                    mr: 2 
                  }} 
                />
                <Typography variant="body2" sx={{ color: colors.text }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ExpLegend;