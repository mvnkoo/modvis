import React, { useState } from 'react';
import { Paper, Typography, Box, Chip, IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Clear, ExpandMore } from '@mui/icons-material';
import { useAppState, useAppDispatch } from '../../../context/AppContext';

// Definition der Log-Level Farben
const LOG_LEVELS = {
  INFO: { 
    color: {
      light: '#2196f3',  // Blau
      dark: '#90caf9'    // Helleres Blau für Dark Mode
    },
    label: 'Info',
    bgColor: {
      light: 'rgba(33, 150, 243, 0.1)',
      dark: 'rgba(144, 202, 249, 0.1)'
    }
  },
  WARNING: { 
    color: {
      light: '#ff9800',  // Orange
      dark: '#ffb74d'    // Helleres Orange für Dark Mode
    },
    label: 'Warnung',
    bgColor: {
      light: 'rgba(255, 152, 0, 0.1)',
      dark: 'rgba(255, 183, 77, 0.1)'
    }
  },
  ERROR: { 
    color: {
      light: '#f44336',  // Rot
      dark: '#ef5350'    // Helleres Rot für Dark Mode
    },
    label: 'Fehler',
    bgColor: {
      light: 'rgba(244, 67, 54, 0.1)',
      dark: 'rgba(239, 83, 80, 0.1)'
    }
  }
};

function MergeConsole() {
  const { mergeLogs = [] } = useAppState();
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState(Object.keys(LOG_LEVELS));

  const clearLogs = () => {
    dispatch({ type: 'CLEAR_MERGE_LOGS' });
  };

  const toggleFilter = (level) => {
    setActiveFilters(prev => {
      if (prev.includes(level)) {
        return prev.filter(f => f !== level);
      } else {
        return [...prev, level];
      }
    });
  };

  const filteredLogs = mergeLogs.filter(log => activeFilters.includes(log.level));

  return (
    <Paper sx={{ p: 2 }}>
      <Accordion 
        expanded={expanded} 
        onChange={() => setExpanded(!expanded)}
        sx={{ 
          '&.MuiAccordion-root': {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            '&:before': {
              display: 'none',
            },
          }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore />}
          sx={{ 
            p: 0,
            minHeight: 'unset',
            '& .MuiAccordionSummary-content': {
              m: 0,
              alignItems: 'center'
            }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            width: '100%',
            mr: 1
          }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              Merge Protokoll
            </Typography>
            <Tooltip title="Protokoll löschen">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  clearLogs();
                }}
              >
                <Clear />
              </IconButton>
            </Tooltip>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails sx={{ p: 0, pt: 1 }}>
          {/* Filter Chips mit angepassten Farben */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            mb: 1, 
            flexWrap: 'wrap'
          }}>
            {Object.entries(LOG_LEVELS).map(([level, { color, label, bgColor }]) => (
              <Chip
                key={level}
                label={label}
                sx={{
                  backgroundColor: theme => activeFilters.includes(level) 
                    ? (theme.palette.mode === 'dark' ? bgColor.dark : bgColor.light)
                    : 'transparent',
                  color: theme => theme.palette.mode === 'dark' ? color.dark : color.light,
                  border: theme => `1px solid ${theme.palette.mode === 'dark' ? color.dark : color.light}`,
                  '&:hover': {
                    backgroundColor: theme => theme.palette.mode === 'dark' ? bgColor.dark : bgColor.light
                  }
                }}
                variant={activeFilters.includes(level) ? "filled" : "outlined"}
                onClick={() => toggleFilter(level)}
                size="small"
              />
            ))}
          </Box>

          {/* Log Messages mit angepassten Farben */}
          <Box sx={{ 
            height: '200px',
            overflow: 'auto',
            bgcolor: theme => theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
            borderRadius: 1,
            p: 1,
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.2',
            '& > div:not(:last-child)': {
              mb: 0.5
            }
          }}>
            {filteredLogs.length > 0 ? filteredLogs.map((log, index) => {
              const logStyle = LOG_LEVELS[log.level];
              return (
                <Box key={index} sx={{ 
                  color: theme => theme.palette.mode === 'dark' ? '#fff' : '#000',
                  backgroundColor: theme => theme.palette.mode === 'dark' 
                    ? logStyle.bgColor.dark 
                    : logStyle.bgColor.light,
                  py: 0.5,
                  px: 1,
                  borderRadius: 0.5,
                  ...(log.message.startsWith('•') && {
                    pl: 3
                  })
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'inherit',
                      color: 'inherit',
                      lineHeight: 'inherit'
                    }}
                  >
                    <span style={{ 
                      color: theme => theme.palette.mode === 'dark' 
                        ? logStyle.color.dark 
                        : logStyle.color.light 
                    }}>
                      {`[${logStyle.label}]`}
                    </span>
                    {` ${log.message}`}
                  </Typography>
                </Box>
              );
            }) : (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontFamily: 'inherit',
                  lineHeight: 'inherit'
                }}
              >
                Keine Merge-Informationen für die ausgewählten Filter verfügbar
              </Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

export default MergeConsole;