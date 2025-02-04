import React from 'react';
import { Paper, Typography, Button, Box, Alert, IconButton, ListItem, ListItemText } from '@mui/material';
import { Upload, Check, Error, Delete } from '@mui/icons-material';
import { useAppState, useAppDispatch } from '../../../context/AppContext';
import { SchemaMergeService } from '../services/schemaMergeService';
import { ValidationResult } from '../types';

function ExpImport() {
  const { expressFile, expressValidation } = useAppState();
  const dispatch = useAppDispatch();

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile && uploadedFile.name.endsWith('.exp')) {
      try {
        const content = await uploadedFile.text();
        const schemaService = new SchemaMergeService();
        const validationResult = await schemaService.validateExpressFile(uploadedFile);
        
        if (validationResult.isValid) {
          dispatch({ type: 'SET_EXPRESS_FILE', payload: uploadedFile });
          dispatch({ type: 'SET_EXPRESS_DATA', payload: content });
          dispatch({ type: 'SET_EXPRESS_VALIDATION', payload: validationResult });
          dispatch({ 
            type: 'SET_IFC_SCHEMA', 
            payload: validationResult.schemaVersion 
          });
        }
      } catch (error) {
        dispatch({ 
          type: 'SET_EXPRESS_VALIDATION', 
          payload: { isValid: false, errors: [error.message] }
        });
      }
    }
  };

  const handleRemove = () => {
    dispatch({ type: 'SET_EXPRESS_FILE', payload: null });
    dispatch({ type: 'SET_EXPRESS_DATA', payload: null });
    dispatch({ type: 'SET_EXPRESS_VALIDATION', payload: null });
    dispatch({ type: 'SET_IFC_SCHEMA', payload: null });
    dispatch({ type: 'SET_MERGED_DATA', payload: null });
    
    // File-Input zurücksetzen
    const fileInput = document.getElementById('exp-file-upload');
    if (fileInput) fileInput.value = '';
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontSize: '1.1rem' }} gutterBottom>
        EXP Import
      </Typography>
      <Box sx={{ mt: 2 }}>
        <input
          accept=".exp"
          style={{ display: 'none' }}
          id="exp-file-upload"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="exp-file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<Upload />}
            fullWidth
            color="primary"
          >
            IFC SCHEMA (.EXP)
          </Button>
        </label>
        
        {expressFile && (
          <Box sx={{ mt: 1 }}>
            <ListItem
              sx={{
                px: 0,
                py: 1,
                pr: 6,
                '& .MuiListItemText-root': {
                  overflow: 'hidden'
                }
              }}
              secondaryAction={
                <IconButton 
                  edge="end" 
                  onClick={handleRemove}
                  size="small"
                  sx={{ color: 'action.active' }}
                >
                  <Delete />
                </IconButton>
              }
            >
              <ListItemText 
                primary={
                  <Typography noWrap>
                    {expressFile.name}
                  </Typography>
                }
              />
            </ListItem>
            {expressValidation && (
              <Alert 
                severity={expressValidation.isValid ? "success" : "error"}
                icon={expressValidation.isValid ? <Check /> : <Error />}
                sx={{ 
                  mt: 1,
                  bgcolor: theme => theme.palette.mode === 'dark' 
                    ? 'rgba(76, 175, 80, 0.15)'  // Grünton im Dark Mode
                    : 'rgba(217, 240, 217, 0.95)'  // Grünton im Light Mode
                }}
              >
                {expressValidation.isValid 
                  ? `Schema Version: ${expressValidation.schemaVersion}`
                  : expressValidation.errors?.join(', ')}
              </Alert>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export default ExpImport;