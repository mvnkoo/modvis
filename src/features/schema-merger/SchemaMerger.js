import React from 'react';
import { Box, Grid } from '@mui/material';
import ExpImport from './components/ExpImport';
import PSetImport from './components/PSetImport';
import ExpressRawData from './components/ExpressRawData';
import PSetDetails from './components/PSetDetails';
import MergeConsole from './components/MergeConsole';
import MergedExpressRawData from './components/MergedExpressRawData';
import ConfigurationMerging from './components/ConfigurationMerging';

function SchemaMerger() {
  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', // 64px ist die Höhe von AppBar (36px) + Tabs (28px)
      overflow: 'auto'  // Macht nur diesen Bereich scrollbar
    }}>
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {/* Linke Spalte (1/5) */}
          <Grid item xs={12} md={2.4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ExpImport />
              <PSetImport />
            </Box>
          </Grid>

          {/* Mittlere Spalte (2/5) */}
          <Grid item xs={12} md={4.8}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ExpressRawData />
              <PSetDetails />
            </Box>
          </Grid>

          {/* Rechte Spalte (2/5) */}
          <Grid item xs={12} md={4.8}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ConfigurationMerging />
              <MergeConsole />
              <MergedExpressRawData />
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default SchemaMerger;