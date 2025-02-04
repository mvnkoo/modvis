import React, { useRef, useState, useMemo } from 'react';
import { Paper, Typography, Box, useTheme, IconButton, Tooltip } from '@mui/material';
import { TextDecrease, TextIncrease } from '@mui/icons-material';
import { useAppState } from '../../../context/AppContext';
import { useTheme as useCustomTheme } from '../../../common/theme/ThemeContext';
import { FixedSizeList as List } from 'react-window';

function ExpressRawData() {
  const { expressData } = useAppState();
  const theme = useTheme();
  const { colors } = useCustomTheme();
  const listRef = useRef(null);
  const [fontSize, setFontSize] = useState(12);

  // Memoisiere die getLineStyle-Funktion
  const getLineStyle = React.useCallback((line) => {
    if (line.trim().startsWith('ENTITY') || line.trim().startsWith('TYPE') || line.trim().startsWith('SCHEMA')) {
      return { color: colors.primaryText };
    }
    if (line.includes(':')) {
      return { color: colors.primaryText };
    }
    return {};
  }, [colors]);

  // Memoisiere die Zeilen
  const lines = useMemo(() => expressData?.split('\n') || [], [expressData]);

  const handleFontSizeChange = (delta) => {
    setFontSize(prev => Math.min(Math.max(8, prev + delta), 16)); // Begrenzt auf 8-16px
  };

  // Optimierte Row-Komponente mit React.memo
  const Row = React.memo(({ index, style }) => {
    const line = lines[index];
    const lineStyle = getLineStyle(line);
    return (
      <div style={{ 
        ...style, 
        ...lineStyle, 
        fontFamily: 'Consolas, Monaco, monospace', 
        whiteSpace: 'pre',
        overflow: 'visible',
        paddingRight: '10px',
        fontSize: `${fontSize}px`
      }}>
        {line}
      </div>
    );
  });

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
          Express Raw Data
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Schrift verkleinern">
            <IconButton 
              size="small" 
              onClick={() => handleFontSizeChange(-1)}
              disabled={fontSize <= 8}
            >
              <TextDecrease fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Schrift vergrößern">
            <IconButton 
              size="small" 
              onClick={() => handleFontSizeChange(1)}
              disabled={fontSize >= 16}
            >
              <TextIncrease fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ mt: 2 }}>
        {expressData ? (
          <Box sx={{ 
            height: '400px',
            position: 'relative'
          }}>
            <Box sx={{
              width: '100%',
              height: '100%',
              bgcolor: colors.codeViewer,
              borderRadius: 1,
              p: 1,
              overflow: 'hidden'
            }}>
              <List
                ref={listRef}
                height={400}
                itemCount={lines.length}
                itemSize={20}
                width="100%"
                style={{
                  overflow: 'auto'
                }}
              >
                {Row}
              </List>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Kein Express Schema geladen
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default ExpressRawData;