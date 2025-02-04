import React, { useState, useMemo, useCallback } from 'react';
import { Box, Paper, ToggleButtonGroup, ToggleButton, Tooltip, Typography, IconButton } from '@mui/material';
import { ExpSchemaFlow } from './expGraph';
import { ExpSchemaControls } from './expSearchBar';
import { useTheme } from '../../../common/theme/ThemeContext';
import { useAppState } from '../../../context/AppContext';
import { SearchOption } from '../types/expTypes';
import { Merge, Upload, Delete } from '@mui/icons-material';
import { ExpSchemaService } from '../services/expService';

export const ExpSchemaExplorer: React.FC = () => {
  const { colors } = useTheme();
  const { expressData, mergedData } = useAppState();
  const [searchValue, setSearchValue] = useState<SearchOption | null>(null);
  const [schemaSource, setSchemaSource] = useState<'unified' | 'custom'>('unified');
  const [customExpressData, setCustomExpressData] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);

  // Berechne, ob ein Schema aktiv ist
  const hasActiveSchema = useMemo(() => {
    return schemaSource === 'unified' ? !!(mergedData || expressData) : !!customExpressData;
  }, [schemaSource, mergedData, expressData, customExpressData]);

  // Schema Daten laden und Suchoptionen generieren
  const { searchOptions } = useMemo(() => {
    const data = schemaSource === 'unified' ? (mergedData || expressData) : customExpressData;
    if (!data) return { searchOptions: [] };

    const parsedSchema = ExpSchemaService.parseExpressSchema(data);
    
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
  }, [expressData, mergedData, customExpressData, schemaSource]);

  const handleSchemaSourceChange = async (event: React.MouseEvent<HTMLElement>, newSource: 'unified' | 'custom' | null) => {
    // Verhindere das Standard-Toggle-Verhalten
    event.preventDefault();
    
    // Wenn custom geklickt wird, öffne einfach den Dialog ohne den Source zu ändern
    if (newSource === 'custom') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.exp';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && file.name.endsWith('.exp')) {
          const content = await file.text();
          setCustomExpressData(content);
          setCustomFileName(file.name);
          setSchemaSource('custom');
        }
      };
      input.click();
      return;
    }
    
    // Nur wenn unified geklickt wird, ändere den Source
    if (newSource === 'unified') {
      setSchemaSource('unified');
    }
  };

  const handleClearCustomFile = () => {
    setCustomExpressData(null);
    setCustomFileName(null);
    setSearchValue(null); // Reset search value
  };

  // Neue Callback-Funktion für Graph-Navigation
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
          mergedData={mergedData}
          customExpressData={customExpressData}
          schemaSource={schemaSource}
          searchValue={searchValue}
          hasActiveSchema={hasActiveSchema}
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
              boxShadow: colors.shadow,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 1,
                '&:not(:first-of-type)': {
                  borderLeft: 'none'
                }
              },
              '& .MuiToggleButtonGroup-root': {
                border: 'none'
              }
            }}
          >
            <ToggleButtonGroup
              value={schemaSource}
              exclusive
              onChange={handleSchemaSourceChange}
              size="small"
            >
              <ToggleButton value="unified">
                <Tooltip title="Unified Schema">
                  <Merge />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="custom">
                <Tooltip title="Custom Schema">
                  <Upload />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>

          {customFileName && (
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
                {customFileName}
              </Typography>
              <IconButton
                size="small"
                onClick={handleClearCustomFile}
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