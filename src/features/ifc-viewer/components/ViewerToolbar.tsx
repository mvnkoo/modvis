import React from 'react';
import { Box, Button } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

interface ViewerToolbarProps {
  onFileSelect: (file: File) => void;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({ onFileSelect }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Box sx={{ p: 1, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
      <Button
        variant="contained"
        component="label"
        startIcon={<CloudUpload />}
        size="small"
      >
        Load IFC
        <input
          type="file"
          hidden
          accept=".ifc"
          onChange={handleFileChange}
        />
      </Button>
    </Box>
  );
}; 