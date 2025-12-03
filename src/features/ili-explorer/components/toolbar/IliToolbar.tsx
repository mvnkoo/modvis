import React, { useRef, useState, useEffect } from 'react';
import { Box, Paper, IconButton, Tooltip, Typography, Autocomplete, TextField } from '@mui/material';
import { Search, Upload, Delete, ChevronRight, ChevronLeft } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';

interface SearchOption {
  id: string;
  label: string;
  type: string;
  description: string;
  category: string;
}

interface IliToolbarProps {
  searchValue: SearchOption | null;
  searchOptions: SearchOption[];
  currentFileName: string | null;
  onSearchChange: (value: SearchOption | null) => void;
  onFileUpload: (file: File) => void;
  onClearFile: () => void;
  onToggleEnums: (visible: boolean) => void;
  showEnums: boolean;
}

export const IliToolbar: React.FC<IliToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchOptions,
  onFileUpload,
  currentFileName,
  onClearFile,
  onToggleEnums,
  showEnums
}) => {
  const { colors } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFileNameExpanded, setIsFileNameExpanded] = useState(true);
  const [autoCollapseEnabled, setAutoCollapseEnabled] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(true);

 
  useEffect(() => {
    if (currentFileName && isFileNameExpanded && autoCollapseEnabled) {
      const timer = setTimeout(() => {
        handleCollapse();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentFileName, isFileNameExpanded, autoCollapseEnabled]);

  const handleCollapse = () => {
    setIsContentVisible(false);
    setTimeout(() => {
      setIsFileNameExpanded(false);
    }, 300);
  };

  const handleExpand = () => {
    setIsFileNameExpanded(true);
    setTimeout(() => {
      setIsContentVisible(true);
    }, 50);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
      setIsFileNameExpanded(true);
      setTimeout(() => {
        setIsContentVisible(true);
      }, 50);
      setAutoCollapseEnabled(true);
      event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const toggleFileNameExpanded = () => {
    setAutoCollapseEnabled(false);
    if (isFileNameExpanded) {
      handleCollapse();
    } else {
      handleExpand();
    }
  };

 
  const truncateFileName = (name: string) => {
    return name.length > 32 ? `${name.substring(0, 29)}...` : name;
  };

 
  const sortedOptions = [...searchOptions].sort((a, b) => {
    if (a.category !== b.category) {
      const categoryOrder = ['Classes', 'Topics', 'Structures', 'Enumerations', 'Attributes'];
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    }
    return a.label.localeCompare(b.label);
  });

  return (
    <Box sx={{ 
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      display: 'flex',
      gap: 1.5,
      zIndex: 1000
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Paper 
          elevation={4} 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            width: currentFileName ? (isFileNameExpanded ? 'auto' : 80) : 40,
            transition: 'all 0.3s ease-in-out',
            borderRadius: 1,
            bgcolor: 'background.paper',
            boxShadow: colors.shadow,
            overflow: 'hidden',
            '& .MuiIconButton-root': {
              borderRadius: currentFileName ? '4px 0 0 4px' : 1,
            }
          }}
        >
          <Tooltip title="INTERLIS Schema hochladen">
            <IconButton
              onClick={handleUploadClick}
              size="small"
              sx={{ 
                width: 40,
                height: 40,
                flexShrink: 0
              }}
            >
              <Upload />
            </IconButton>
          </Tooltip>

          <input
            ref={fileInputRef}
            accept=".ili"
            style={{ display: 'none' }}
            id="ili-file-upload"
            type="file"
            onChange={handleFileUpload}
          />
          
          {currentFileName && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                borderLeft: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                transform: isFileNameExpanded ? 'translateX(0)' : 'translateX(-100%)',
                opacity: isFileNameExpanded ? 1 : 0,
                width: isFileNameExpanded ? 'auto' : 0,
                ml: isFileNameExpanded ? 0 : '-1px',
              }}
            >
              {isFileNameExpanded && (
                <Box 
                  sx={{ 
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
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: colors.text,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {truncateFileName(currentFileName)}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    ml: 'auto' 
                  }}>
                    <IconButton
                      size="small"
                      onClick={onClearFile}
                      sx={{
                        width: 40,
                        height: 40,
                        '&:hover': {
                          color: 'error.main'
                        }
                      }}
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
              onClick={toggleFileNameExpanded}
              sx={{
                width: 40,
                height: 40,
                borderLeft: '1px solid',
                borderColor: 'divider',
                borderRadius: 0,
                transition: 'transform 0.3s ease-in-out',
                transform: isFileNameExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
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
          boxShadow: colors.shadow
        }}
      >
        <Autocomplete
          value={searchValue}
          onChange={(_, newValue) => onSearchChange(newValue)}
          options={sortedOptions}
          groupBy={(option) => option.category}
          getOptionLabel={(option) => option.label}
          renderOption={(props: React.HTMLAttributes<HTMLLIElement>, option) => {
           
            const { key, ...restProps } = props;

           
            let mainLabel = option.label;
            let classLabel = '';
            if (option.type === 'ATTRIBUTE') {
              const parts = option.label.match(/^(.*?)\s*\((.*?)\)$/);
              if (parts) {
                mainLabel = parts[1];
                classLabel = parts[2];
              }
            }

            return (
              <li key={option.id} {...restProps}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div>
                    {mainLabel}
                    {classLabel && (
                      <span style={{ color: '#2196f3' }}> ({classLabel})</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8em', color: 'gray' }}>{option.description}</div>
                </div>
              </li>
            );
          }}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Suchen Sie nach einer Klasse oder Struktur (z.B. 'Person', 'Address')"
              InputProps={{
                ...params.InputProps,
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
              }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none'
                },
                '& .MuiAutocomplete-inputRoot': {
                  padding: '2px 8px'
                }
              }}
            />
          )}
        />
      </Paper>
    </Box>
  );
};

export default IliToolbar;