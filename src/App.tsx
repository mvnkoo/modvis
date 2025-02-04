import React, { useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import { Merge, Schema, ViewInAr } from '@mui/icons-material';
import { AppProvider } from './context/AppContext';
import { useTheme } from './common/theme/ThemeContext';
import { Settings } from './common/components/Settings';

// Feature Imports
import SchemaMerger from './features/schema-merger/SchemaMerger';
import { ExpExplorer } from './features/exp-explorer/expExplorer';
import { IliSchemaExplorer } from './features/ili-explorer/components/IliSchemaExplorer';
import { IfcViewer } from './features/ifc-viewer/components';

function App() {
  const { mode, colors } = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [showAllTabs, setShowAllTabs] = useState(false);

  const handleLogoClick = () => {
    setClickCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 8) {
        setShowAllTabs(true);
      }
      return newCount;
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0 || showAllTabs) {
      setCurrentTab(newValue);
    }
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
    <AppProvider>
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
                onClick={handleLogoClick}
              >
                Wizzbo
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
                  V0.7.6 (NICHT FÜR DEN PRODUKTIVEN EINSATZ!)
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
                scrollButtons={showAllTabs ? "auto" : "never"}
                allowScrollButtonsMobile={showAllTabs}
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
                <Tab 
                  icon={<Schema fontSize="small" />} 
                  label="EXP Explorer" 
                  iconPosition="start"
                  sx={{ display: showAllTabs ? 'flex' : 'none' }}
                />
                <Tab 
                  icon={<Merge fontSize="small" />} 
                  label="IFC MERGE" 
                  iconPosition="start"
                  sx={{ display: showAllTabs ? 'flex' : 'none' }}
                />
                <Tab 
                  icon={<ViewInAr fontSize="small" />} 
                  label="IFC Viewer" 
                  iconPosition="start"
                  sx={{ display: showAllTabs ? 'flex' : 'none' }}
                />
              </Tabs>
            </Box>
          </AppBar>
          
          {currentTab === 0 && <IliSchemaExplorer />}
          {showAllTabs && currentTab === 1 && <ExpExplorer />}
          {showAllTabs && currentTab === 2 && <SchemaMerger />}
          {showAllTabs && currentTab === 3 && <IfcViewer />}
        </Box>
      </MuiThemeProvider>
    </AppProvider>
  );
}

export default App; 