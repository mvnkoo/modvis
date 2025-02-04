import React, { useState, useRef } from 'react';
import { Paper, Typography, Button, Box, ListItem, ListItemText, IconButton, LinearProgress } from '@mui/material';
import { Upload, Delete, Cancel } from '@mui/icons-material';
import { useAppState, useAppDispatch } from '../../../context/AppContext';
import { SchemaMergeService } from '../services/schemaMergeService';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { PSetData } from '../types';

function PSetImport() {
  const { psetFiles } = useAppState();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const abortControllerRef = useRef(null);
  const schemaService = new SchemaMergeService();

  const BATCH_SIZE = 20;

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    setLoading(true);
    setProgress({ loaded: 0, total: files.length });
    
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const processFileBatch = async (startIndex) => {
      if (!abortControllerRef.current || signal.aborted) return;

      const batch = files.slice(startIndex, startIndex + BATCH_SIZE);
      const batchPromises = batch.map(async (file) => {
        if (file.name.endsWith('.xml')) {
          try {
            const psetData = await schemaService.parsePSetFile(file, dispatch);
            if (!abortControllerRef.current || signal.aborted) return null;
            
            return { file, data: psetData };
          } catch (error) {
            console.error('Error parsing PSet file:', error);
            return null;
          }
        }
        return null;
      });

      const results = await Promise.all(batchPromises);
      const validResults = results.filter(Boolean);
      
      if (validResults.length > 0) {
        dispatch({ 
          type: 'ADD_PSET_FILES_BATCH', 
          payload: validResults 
        });
      }

      setProgress(prev => ({ 
        ...prev, 
        loaded: Math.min(startIndex + BATCH_SIZE, files.length) 
      }));

      if (startIndex + BATCH_SIZE < files.length) {
        setTimeout(() => processFileBatch(startIndex + BATCH_SIZE), 0);
      } else {
        setLoading(false);
      }
    };

    processFileBatch(0);
  };

  const handleRemove = (index) => {
    dispatch({ type: 'REMOVE_PSET_FILE', payload: index });
  };

  const handleRemoveAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    dispatch({ type: 'CLEAR_PSET_FILES' });
    setProgress({ loaded: 0, total: 0 });
    setLoading(false);
    abortControllerRef.current = null;
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const Row = React.memo(({ index, style }) => {
    const pset = psetFiles[index];
    return (
      <ListItem
        style={style}
        key={index}
        secondaryAction={
          <IconButton 
            edge="end" 
            onClick={() => handleRemove(index)}
            sx={{ color: 'action.active' }}
          >
            <Delete />
          </IconButton>
        }
        sx={{
          pr: 6,
          '& .MuiListItemText-root': {
            overflow: 'hidden'
          }
        }}
      >
        <ListItemText 
          primary={
            <Typography noWrap>
              {pset.file.name}
            </Typography>
          }
        />
      </ListItem>
    );
  });

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontSize: '1.1rem' }} gutterBottom>
        PSet Import
      </Typography>
      <Box sx={{ mt: 2 }}>
        <input
          accept=".xml"
          style={{ display: 'none' }}
          id="pset-file-upload"
          type="file"
          multiple
          onChange={handleFileUpload}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <label htmlFor="pset-file-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={<Upload />}
              fullWidth
              disabled={loading}
            >
              PROPERTY SETS (.XML)
            </Button>
          </label>
          {psetFiles.length > 0 && (
            <Button
              variant="text"
              color="inherit"
              onClick={handleRemoveAll}
              startIcon={<Delete />}
              disabled={loading}
              size="small"
              sx={{ color: 'action.active' }}
            >
              Alle PSets entfernen
            </Button>
          )}
        </Box>

        {(loading || (progress.loaded > 0 && psetFiles.length > 0)) && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(progress.loaded / progress.total) * 100} 
                />
              </Box>
              {loading && (
                <IconButton 
                  size="small" 
                  onClick={handleAbort}
                  color="error"
                >
                  <Cancel />
                </IconButton>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              {progress.loaded} von {progress.total} PSets geladen
            </Typography>
          </Box>
        )}

        {psetFiles.length > 0 && (
          <Box sx={{ 
            height: '270px', 
            mt: 2 
          }}>
            <AutoSizer>
              {({ height, width }) => (
                <FixedSizeList
                  height={height}
                  width={width}
                  itemCount={psetFiles.length}
                  itemSize={48}
                >
                  {Row}
                </FixedSizeList>
              )}
            </AutoSizer>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export default PSetImport;