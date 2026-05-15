import React, { useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab, Chip } from '@mui/material';
import { Schema, Science } from '@mui/icons-material';
import { useTheme } from './common/theme/ThemeContext';
import { useSettings } from './common/settings/SettingsContext';
import { Settings } from './common/components/Settings';

import { ExpExplorer } from './features/exp-explorer/expExplorer';
import { IliSchemaExplorer } from './features/ili-explorer/components/IliSchemaExplorer';

function App() {
  const { mode, colors } = useTheme();
  const { experimentalFeatures } = useSettings();
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (!experimentalFeatures && currentTab === 1) {
      setCurrentTab(0);
    }
  }, [experimentalFeatures, currentTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const theme = createTheme({
    palette: {
      mode: mode,
      primary: {
        main: colors.primary,
        light: colors.primary,
        dark: colors.primary,
      },
      secondary: {
        main: colors.selectedEntity,
        light: colors.selectedEntity,
        dark: colors.selectedEntity,
      },
      background: {
        default: colors.background,
        paper: colors.paper,
      },
    },
    typography: {
      fontFamily: '"Segoe UI", "Inter", "Roboto", "Helvetica Neue", sans-serif',
      h6: {
        fontWeight: 600,
        letterSpacing: '0.0075em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '*::-webkit-scrollbar-track': {
            background: mode === 'dark' ? '#151515' : 'rgba(0,0,0,0.05)',
            borderRadius: '4px'
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'dark' ? '#2a2a2a' : 'rgba(0,0,0,0.2)',
            borderRadius: '4px'
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: mode === 'dark' ? '#353535' : 'rgba(0,0,0,0.3)'
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${mode === 'dark' ? '#2a2a2a' : 'rgba(0,0,0,0.2)'} ${mode === 'dark' ? '#151515' : 'rgba(0,0,0,0.05)'}`
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: colors.shadow,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 600,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: colors.appBar,
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          dense: {
            minHeight: '36px',
            padding: '0 16px',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: '28px',
            backgroundColor: colors.primary,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: '28px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.813rem',
            py: 0,
            '&.Mui-selected': {
              color: '#FFFFFF'
            }
          },
        },
      },
    },
  });

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
          minHeight: '100vh',
          background: colors.background,
          backgroundImage: colors.background.startsWith('linear-gradient') 
            ? colors.background 
            : 'none',
        }}>
          <AppBar position="static" elevation={0}>
            <Toolbar 
              variant="dense"
              sx={{ 
                minHeight: '36px !important',
                '& .MuiTypography-subtitle1': {
                  fontSize: '0.938rem',
                }
              }}
            >
              <Typography 
                variant="subtitle1" 
                component="div" 
                sx={{ 
                  flexGrow: 1,
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  color: '#FFFFFF',
                  background: colors.background === 'transparent'
                    ? 'linear-gradient(45deg, #fff 30%, rgba(255,255,255,0.8) 90%)'
                    : 'none',
                  WebkitBackgroundClip: colors.background === 'transparent' ? 'text' : 'none',
                  WebkitTextFillColor: colors.background === 'transparent' ? 'transparent' : '#FFFFFF',
                  cursor: 'default'
                }}
              >
                MODVIS
                {currentTab === 0 && (
                  <Box component="span" sx={{ opacity: 0.6, fontWeight: 500, mx: 1 }}>·</Box>
                )}
                {currentTab === 0 && (
                  <Box component="span" sx={{ fontWeight: 500 }}>ILI Explorer</Box>
                )}
                {currentTab === 1 && experimentalFeatures && (
                  <Box component="span" sx={{ opacity: 0.6, fontWeight: 500, mx: 1 }}>·</Box>
                )}
                {currentTab === 1 && experimentalFeatures && (
                  <Box component="span" sx={{ fontWeight: 500 }}>EXP Explorer</Box>
                )}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2
              }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    userSelect: 'none',
                    opacity: 0.8
                  }}
                >
                  V{__APP_VERSION__} (BETA)
                </Typography>
                <Settings />
              </Box>
            </Toolbar>
            <Box 
              sx={{ 
                width: '100%',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                position: 'relative'
              }}
            >
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ 
                  minHeight: '28px',
                  px: 2,
                  '& .MuiTab-root': {
                    minHeight: '28px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.813rem',
                    py: 0,
                    whiteSpace: 'nowrap',
                    '&.Mui-selected': {
                      color: '#FFFFFF'
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: 1.5,
                    backgroundColor: '#FFFFFF'
                  },
                  '& .MuiTabs-scrollButtons': {
                    color: 'rgba(255,255,255,0.7)',
                    width: 20,
                    '&.Mui-disabled': {
                      opacity: 0.3
                    },
                    '&.MuiTabs-scrollButtons--left': {
                      position: 'absolute',
                      left: 0,
                      zIndex: 1,
                      background: 'linear-gradient(to right, rgba(21,35,90,0.9) 0%, rgba(21,35,90,0) 100%)'
                    },
                    '&.MuiTabs-scrollButtons--right': {
                      position: 'absolute',
                      right: 0,
                      zIndex: 1,
                      background: 'linear-gradient(to left, rgba(21,35,90,0.9) 0%, rgba(21,35,90,0) 100%)'
                    }
                  }
                }}
              >
                <Tab
                  icon={<Schema fontSize="small" />}
                  label="ILI Explorer"
                  iconPosition="start"
                />
                {experimentalFeatures && (
                  <Tab
                    icon={<Science fontSize="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        EXP Explorer
                        <Chip
                          label="experimentell"
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.625rem',
                            color: '#fff',
                            bgcolor: 'rgba(255,255,255,0.2)',
                          }}
                        />
                      </Box>
                    }
                    iconPosition="start"
                  />
                )}
              </Tabs>
            </Box>
          </AppBar>

        {currentTab === 0 && <IliSchemaExplorer />}
        {currentTab === 1 && experimentalFeatures && <ExpExplorer />}
      </Box>
    </MuiThemeProvider>
  );
}

export default App; 