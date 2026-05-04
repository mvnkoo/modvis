import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Box, Paper, Tooltip, Typography, IconButton, Snackbar, Alert } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ExpSchemaFlow } from './expGraph';
import { ExpSchemaControls } from './expSearchBar';
import { useTheme } from '../../../common/theme/ThemeContext';
import { SearchOption } from '../types/expTypes';
import { Upload, Delete } from '@mui/icons-material';
import { ExpSchemaService } from '../services/expService';
import { readFileAsText } from '../../../common/utils/readFileAsText';

export const ExpSchemaExplorer: React.FC = () => {
  const { colors } = useTheme();
  const [searchValue, setSearchValue] = useState<SearchOption | null>(null);
  const [expressData, setExpressData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const dragCounterRef = useRef(0);

  const loadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.exp')) {
      setErrorOpen(true);
      return;
    }
    const content = await readFileAsText(file);
    setExpressData(content);
    setFileName(file.name);
  }, []);

  const { searchOptions } = useMemo(() => {
    if (!expressData) return { searchOptions: [] };

    const parsedSchema = ExpSchemaService.parseExpressSchema(expressData);

    const options = parsedSchema.nodes
      .map(node => ({
        id: node.id,
        label: node.data.label,
        type: node.type === 'entityNode' ? 'Entity' : 'Type',
        description: `${node.type === 'entityNode' ? 'Entity' : 'Type'} - ${
          node.data.superTypes && node.data.superTypes.length > 0
            ? `Subtype of ${node.data.superTypes.join(', ')}`
            : 'No supertypes'
        }`,
        category: ExpSchemaService.getDomainFromEntity(node.data.label)
      } as SearchOption));

    return {
      searchOptions: options.sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        return a.label.localeCompare(b.label);
      })
    };
  }, [expressData]);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.exp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) loadFile(file);
    };
    input.click();
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsFileDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsFileDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsFileDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleClearFile = () => {
    setExpressData(null);
    setFileName(null);
    setSearchValue(null);
  };

  const handleNodeNavigation = useCallback(() => {
    requestAnimationFrame(() => {
      setSearchValue(null);
    });
  }, []);

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)',
        position: 'relative'
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: colors.background
      }}>
        <ExpSchemaFlow
          expressData={expressData}
          searchValue={searchValue}
          onNodeNavigation={handleNodeNavigation}
        />
      </Box>

      {isFileDragging && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1500,
            bgcolor: alpha(colors.primary, 0.1),
            border: `3px dashed ${colors.primary}`,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Paper
            elevation={6}
            sx={{
              px: 4,
              py: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Upload sx={{ fontSize: 48, color: colors.primary }} />
            <Typography variant="h6">EXPRESS-Schema hier ablegen</Typography>
            <Typography variant="caption" sx={{ color: colors.secondaryText }}>
              Nur .exp-Dateien werden akzeptiert
            </Typography>
          </Paper>
        </Box>
      )}

      <Snackbar
        open={errorOpen}
        autoHideDuration={3000}
        onClose={() => setErrorOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorOpen(false)} severity="error" sx={{ width: '100%' }}>
          Nur .exp-Dateien werden unterstützt
        </Alert>
      </Snackbar>

      <Box sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        gap: 2,
        zIndex: 1000
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Paper
            elevation={4}
            sx={{
              borderRadius: 1,
              bgcolor: 'background.paper',
              boxShadow: colors.shadow
            }}
          >
            <Tooltip title="EXPRESS-Datei laden (.exp)">
              <IconButton size="small" onClick={handleUpload}>
                <Upload />
              </IconButton>
            </Tooltip>
          </Paper>

          {fileName && (
            <Paper
              elevation={4}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 1,
                bgcolor: 'background.paper',
                boxShadow: colors.shadow,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Typography variant="body2" sx={{ color: colors.text }}>
                {fileName}
              </Typography>
              <IconButton
                size="small"
                onClick={handleClearFile}
                sx={{
                  width: 24,
                  height: 24,
                  '&:hover': {
                    color: 'error.main'
                  }
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Paper>
          )}
        </Box>

        <Paper
          elevation={4}
          sx={{
            flexGrow: 1,
            borderRadius: 1,
            bgcolor: 'background.paper',
            boxShadow: colors.shadow,
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            },
            '& .MuiAutocomplete-inputRoot': {
              padding: '2px 8px'
            }
          }}
        >
          <ExpSchemaControls
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchOptions={searchOptions}
          />
        </Paper>
      </Box>
    </Box>
  );
};
