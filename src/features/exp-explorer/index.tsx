import React from 'react';
import { Box } from '@mui/material';
import { IfcSchemaFlow } from './components/expGraph';
import { useAppState } from '../../context/AppContext';

const IfcSchemaExplorer: React.FC = () => {
  const { expressData, mergedData } = useAppState();
  
  return (
    <Box sx={{ height: 'calc(100vh - 128px)' }}>
      <IfcSchemaFlow 
        expressData={expressData}
        mergedData={mergedData}
        customExpressData={null}
        schemaSource="unified"
        searchValue={null}
        hasActiveSchema={!!(expressData || mergedData)}
      />
    </Box>
  );
};

export default IfcSchemaExplorer; 