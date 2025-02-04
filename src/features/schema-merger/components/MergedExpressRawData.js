import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Paper, Typography, Box, Button, useTheme, IconButton, Tooltip } from '@mui/material';
import { Save, TextDecrease, TextIncrease } from '@mui/icons-material';
import { useAppState } from '../../../context/AppContext';
import { useTheme as useCustomTheme } from '../../../common/theme/ThemeContext';
import { FixedSizeList as List } from 'react-window';

function MergedExpressRawData() {
  const { mergedData } = useAppState();
  const theme = useTheme();
  const { colors } = useCustomTheme();
  const listRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const [minimapMarkers, setMinimapMarkers] = useState([]);
  const [scrollInfo, setScrollInfo] = useState({
    scrollTop: 0,
    viewportHeight: 0,
    contentHeight: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [fontSize, setFontSize] = useState(12);

  // Memoisiere die getLineStyle-Funktion
  const getLineStyle = React.useCallback((line) => {
    if (line.includes('(*') && line.includes('*)')) {
      return { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(97, 175, 239, 0.05)' : 'rgba(33, 150, 243, 0.05)' };
    }
    if (line.trim().startsWith('ENTITY') || line.trim().startsWith('TYPE') || line.trim().startsWith('SCHEMA')) {
      return { color: colors.primaryText };
    }
    if (line.includes(':')) {
      return { color: colors.primaryText };
    }
    return {};
  }, [colors]);

  // Memoisiere die Zeilen
  const lines = useMemo(() => mergedData?.split('\n') || [], [mergedData]);

  useEffect(() => {
    if (mergedData) {
      const markers = lines.reduce((acc, line, index) => {
        if (line.includes('(*') && line.includes('*)')) {
          acc.push({
            index,
            position: (index / lines.length) * 100,
            type: 'comment'
          });
        }
        return acc;
      }, []);
      setMinimapMarkers(markers);
    }
  }, [lines, mergedData]);

  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }) => {
    if (!scrollUpdateWasRequested && listRef.current) {
      const { clientHeight, scrollHeight } = listRef.current._outerRef;
      setScrollInfo({
        scrollTop: scrollOffset,
        viewportHeight: clientHeight,
        contentHeight: scrollHeight
      });
    }
  };

  const handleScrollTrackClick = (e) => {
    if (!listRef.current || !scrollTrackRef.current) return;
    
    const { top, height } = scrollTrackRef.current.getBoundingClientRect();
    const clickPosition = (e.clientY - top) / height;
    const scrollOffset = clickPosition * (lines.length * 20);
    
    listRef.current.scrollTo(scrollOffset);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !scrollTrackRef.current || !listRef.current) return;

      const { top, height } = scrollTrackRef.current.getBoundingClientRect();
      const clickPosition = Math.max(0, Math.min(1, (e.clientY - top) / height));
      const scrollOffset = clickPosition * (lines.length * 20);
      
      listRef.current.scrollTo(scrollOffset);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, lines.length]);

  const handleSave = () => {
    if (mergedData) {
      const blob = new Blob([mergedData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged-schema.exp';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

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
        paddingRight: '30px',
        fontSize: `${fontSize}px`
      }}>
        {line}
      </div>
    );
  });

  const scrollBarHeight = scrollInfo.contentHeight ? 
    (scrollInfo.viewportHeight / scrollInfo.contentHeight) * 400 : 0;
  const scrollBarTop = scrollInfo.contentHeight ? 
    (scrollInfo.scrollTop / scrollInfo.contentHeight) * 400 : 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
          Merged Express Raw Data
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
        {mergedData ? (
          <>
            <Box sx={{ 
              height: '400px',
              position: 'relative'
            }}>
              <Box sx={{
                width: 'calc(100% - 20px)', // Platz für Minimap
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
                  onScroll={handleScroll}
                  style={{
                    overflow: 'auto'
                  }}
                >
                  {Row}
                </List>
              </Box>

              {/* Minimap/Scrollbar Container */}
              <Box
                ref={scrollTrackRef}
                onClick={handleScrollTrackClick}
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: '20px',
                  height: '100%',
                  backgroundColor: colors.minimap,
                  borderRadius: '0 4px 4px 0',
                  cursor: 'pointer'
                }}
              >
                {/* Marker für die aktuelle Position */}
                <Box
                  sx={{
                    position: 'absolute',
                    right: 0,
                    width: '100%',
                    height: '2px',
                    top: `${(scrollInfo.scrollTop / scrollInfo.contentHeight) * 100}%`,
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#666666' : '#333333',
                    opacity: 0.8,
                    zIndex: 3
                  }}
                />
                
                {/* Minimap Markers */}
                {minimapMarkers.map((marker, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      right: '2px',
                      width: '16px',
                      height: '2px',
                      top: `${marker.position}%`,
                      backgroundColor: theme => theme.palette.primary.main,
                      borderRadius: '1px',
                      transform: 'translateY(-50%)',
                      opacity: 0.3,
                      zIndex: 1
                    }}
                  />
                ))}
                
                {/* Scrollbar */}
                <Box
                  onMouseDown={handleMouseDown}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    width: '100%',
                    height: `${scrollBarHeight}px`,
                    top: `${scrollBarTop}px`,
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#1a1a1a' : '#e0e0e0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? '#242424' : '#d0d0d0',
                    },
                    transition: 'background-color 0.2s',
                    zIndex: 2
                  }}
                />
              </Box>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<Save sx={{ fontSize: 18 }} />}
              onClick={handleSave}
              fullWidth
              sx={{ mt: 2 }}
            >
              Als .exp speichern
            </Button>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Noch keine gemergten Daten verfügbar
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default MergedExpressRawData;