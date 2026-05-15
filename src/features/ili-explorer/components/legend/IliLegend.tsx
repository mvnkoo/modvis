import React, { useState } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { ChevronRight, ChevronLeft } from '@mui/icons-material';

interface LegendItem {
  label: string;
  color: string;
  borderColor?: string;
  isActive?: boolean;
  isToggleable?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}

interface IliLegendProps {
  enumsVisible: boolean;
  showAssociations: boolean;
  onToggleEnums: (visible: boolean) => void;
  onToggleAssociations: (visible: boolean) => void;
}

const IliLegend: React.FC<IliLegendProps> = ({ 
  enumsVisible, 
  showAssociations,
  onToggleEnums,
  onToggleAssociations 
}) => {
  const { colors } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
 
 

  const legendItems: LegendItem[] = [
    { label: 'MODEL', color: colors.entity },
    
    { label: 'TOPIC', color: colors.abstractEntity },
    { label: 'CLASS', color: colors.inheritance },
    { label: 'ABSTRACT CLASS', color: colors.abstractEntity },
    { label: 'STRUCTURE', color: colors.containment },
    { 
      label: 'ENUMERATION', 
      color: colors.typeNode,
      isToggleable: true,
      isDisabled: !enumsVisible,
      onClick: () => onToggleEnums(!enumsVisible)
    },
    { 
      label: 'ASSOCIATION',
      color: colors.relationship,
      isToggleable: true,
      isDisabled: !showAssociations,
      onClick: () => onToggleAssociations(!showAssociations)
    },
    { 
      label: 'ACTIVE', 
      color: colors.selectedEntity,
      isActive: true 
    }
  ];

  const relationItems = [
    { label: 'EXTENDS', color: colors.inheritance, style: 'solid' },
    { label: 'DEPENDS ON', color: colors.relationship, style: 'dashed' },
    { label: 'ASSOCIATES', color: colors.reference, style: 'dotted' },
    { label: 'REFERENCES', color: colors.reference, style: 'dashed' },
    { label: 'CONTAINS', color: colors.containment, style: 'solid' },
    {
      label: 'ENUMERATION',
      color: colors.typeReference,
      style: 'dashed',
      isDisabled: !enumsVisible
    }
  ];

  return (
    <Paper 
      elevation={4}
      sx={{ 
        position: 'absolute',
        top: 68,
        right: 16,
        marginRight: 0.2,
        width: isCollapsed ? '42px' : 160,
        minHeight: isCollapsed ? 'auto' : 'auto',
        bgcolor: colors.paper,
        borderRadius: 1,
        boxShadow: colors.shadow,
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 0.5,
        borderBottom: !isCollapsed ? `1px solid ${colors.nodeSection}` : 'none'
      }}>
        {!isCollapsed && (
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            color: colors.text,
            ml: 1
          }}>
            LEGENDE
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

      {!isCollapsed && (
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            color: colors.text,
            mb: 0.5
          }}>
            ELEMENTS
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {legendItems.map((item, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  opacity: item.isDisabled ? 0.5 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                <Box 
                  onClick={item.isToggleable ? item.onClick : undefined}
                  sx={{ 
                    width: 16, 
                    height: 16, 
                    bgcolor: item.color,
                    borderRadius: 0.5,
                    border: item.borderColor ? `2px solid ${item.borderColor}` : 'none',
                    cursor: item.isToggleable ? 'pointer' : 'default',
                    '&:hover': item.isToggleable ? {
                      opacity: 0.8
                    } : undefined
                  }} 
                />
                <Typography variant="caption">{item.label}</Typography>
              </Box>
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            color: colors.text,
            mt: 2,
            mb: 0.5
          }}>
            RELATIONS
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 20,
                height: 0,
                borderTop: `2px solid ${colors.inheritance}`
              }} />
              <Typography variant="caption">EXTENDS</Typography>
            </Box>

            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                opacity: showAssociations ? 1 : 0.5,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => onToggleAssociations(!showAssociations)}
            >
              <Box sx={{ 
                width: 20,
                height: 0,
                borderTop: `2px dashed ${colors.relationship}`
              }} />
              <Typography variant="caption">ASSOCIATES</Typography>
            </Box>

            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                opacity: enumsVisible ? 1 : 0.5,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => onToggleEnums(!enumsVisible)}
            >
              <Box sx={{ 
                width: 20,
                height: 0,
                borderTop: `2px dashed ${colors.typeReference}`
              }} />
              <Typography variant="caption">ENUMERATION</Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default IliLegend;