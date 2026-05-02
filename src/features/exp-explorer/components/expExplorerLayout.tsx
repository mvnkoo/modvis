import React, { useState, useMemo, useCallback } from 'react';
import { Box, Paper, Tooltip, Typography, IconButton } from '@mui/material';
import { ExpSchemaFlow } from './expGraph';
import { ExpSchemaControls } from './expSearchBar';
import { useTheme } from '../../../common/theme/ThemeContext';
import { SearchOption } from '../types/expTypes';
import { Upload, Delete } from '@mui/icons-material';
import { ExpSchemaService } from '../services/expService';

export const ExpSchemaExplorer: React.FC = () => {
  const { colors } = useTheme();
  const [searchValue, setSearchValue] = useState<SearchOption | null>(null);
  const [expressData, setExpressData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

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
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.name.endsWith('.exp')) {
        const content = await file.text();
        setExpressData(content);
        setFileName(file.name);
      }
    };
    input.click();
  };

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
    <Box sx={{
      height: 'calc(100vh - 64px)',
      position: 'relative'
    }}>
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
