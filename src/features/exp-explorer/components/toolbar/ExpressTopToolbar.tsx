import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, IconButton, Tooltip, Typography, Autocomplete, TextField } from '@mui/material';
import { Search, Upload, Delete, ChevronRight } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { ExpressSearchOption } from '../../services/types/ExpressBaseTypes';

interface Props {
  searchValue: ExpressSearchOption | null;
  searchOptions: ExpressSearchOption[];
  currentFileName: string | null;
  schemaName: string | null;
  onSearchChange: (value: ExpressSearchOption | null) => void;
  onFileUpload: (file: File) => void;
  onClearFile: () => void;
}

const truncate = (name: string) => (name.length > 32 ? `${name.slice(0, 29)}...` : name);

export const ExpressTopToolbar: React.FC<Props> = ({
  searchValue,
  searchOptions,
  currentFileName,
  schemaName,
  onSearchChange,
  onFileUpload,
  onClearFile,
}) => {
  const { colors } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoCollapseEnabled, setAutoCollapseEnabled] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(true);

  useEffect(() => {
    if (currentFileName && isExpanded && autoCollapseEnabled) {
      const t = setTimeout(() => {
        setIsContentVisible(false);
        setTimeout(() => setIsExpanded(false), 300);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [currentFileName, isExpanded, autoCollapseEnabled]);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
      setIsExpanded(true);
      setTimeout(() => setIsContentVisible(true), 50);
      setAutoCollapseEnabled(true);
      event.target.value = '';
    }
  };

  const handleChevron = () => {
    setAutoCollapseEnabled(false);
    if (isExpanded) {
      setIsContentVisible(false);
      setTimeout(() => setIsExpanded(false), 300);
    } else {
      setIsExpanded(true);
      setTimeout(() => setIsContentVisible(true), 50);
    }
  };

  const displayLabel = currentFileName
    ? schemaName
      ? `${truncate(currentFileName)} — ${schemaName}`
      : truncate(currentFileName)
    : '';

  return (
    <Box className="search-toolbar" sx={{
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      display: 'flex',
      gap: 1.5,
      zIndex: 1000,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Paper
          elevation={4}
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: currentFileName ? (isExpanded ? 'auto' : 80) : 40,
            transition: 'all 0.3s ease-in-out',
            borderRadius: 1,
            bgcolor: 'background.paper',
            boxShadow: colors.shadow,
            overflow: 'hidden',
            '& .MuiIconButton-root': {
              borderRadius: currentFileName ? '4px 0 0 4px' : 1,
            },
          }}
        >
          <Tooltip title="EXPRESS-Schema laden (.exp / .express)">
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              size="small"
              sx={{ width: 40, height: 40, flexShrink: 0 }}
            >
              <Upload />
            </IconButton>
          </Tooltip>

          <input
            ref={fileInputRef}
            accept=".exp,.express"
            style={{ display: 'none' }}
            type="file"
            onChange={handleFileInput}
          />

          {currentFileName && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              borderLeft: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              transform: isExpanded ? 'translateX(0)' : 'translateX(-100%)',
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 'auto' : 0,
              ml: isExpanded ? 0 : '-1px',
            }}>
              {isExpanded && (
                <Box sx={{
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  height: 40,
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease-in-out, opacity 0.2s ease-in-out',
                  transform: isContentVisible ? 'translateX(0)' : 'translateX(-100%)',
                  opacity: isContentVisible ? 1 : 0,
                  paddingRight: 0,
                }}>
                  <Typography variant="body2" sx={{ color: colors.text, whiteSpace: 'nowrap' }}>
                    {displayLabel}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                    <IconButton
                      size="small"
                      onClick={onClearFile}
                      sx={{ width: 40, height: 40, '&:hover': { color: 'error.main' } }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {currentFileName && (
            <IconButton
              size="small"
              onClick={handleChevron}
              sx={{
                width: 40,
                height: 40,
                borderLeft: '1px solid',
                borderColor: 'divider',
                borderRadius: 0,
                transition: 'transform 0.3s ease-in-out',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <ChevronRight />
            </IconButton>
          )}
        </Paper>
      </Box>

      <Paper
        elevation={4}
        sx={{
          flexGrow: 1,
          borderRadius: 1,
          bgcolor: 'background.paper',
          boxShadow: colors.shadow,
        }}
      >
        <Autocomplete
          value={searchValue}
          onChange={(_, v) => onSearchChange(v)}
          options={searchOptions}
          groupBy={(option) => option.category}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderOption={(props, option) => {
            const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
            return (
              <li key={option.id} {...rest}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div>
                    {option.label}{' '}
                    <span style={{ fontSize: '0.7em', color: '#888' }}>· {option.type}</span>
                  </div>
                  <div style={{ fontSize: '0.78em', color: 'gray' }}>{option.description}</div>
                </div>
              </li>
            );
          }}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Suche nach Entity / Type / Enum / Select (z.B. 'IfcWall', 'IfcRoot')"
              InputProps={{
                ...params.InputProps,
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiAutocomplete-inputRoot': { padding: '2px 8px' },
              }}
            />
          )}
        />
      </Paper>
    </Box>
  );
};

export default ExpressTopToolbar;
