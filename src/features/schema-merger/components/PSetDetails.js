import React, { useState } from 'react';
import { Paper, Typography, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useAppState } from '../../../context/AppContext';

function PSetDetails() {
  const { psetFiles } = useAppState();
  // Speichert den Zustand der aufgeklappten Akkordeons
  const [expandedPanels, setExpandedPanels] = useState({});

  const handleAccordionChange = (index) => (event, isExpanded) => {
    setExpandedPanels(prev => ({
      ...prev,
      [index]: isExpanded
    }));
  };

  const formatXML = React.useCallback((psetData) => {
    return (
      <Box component="pre" sx={{ 
        m: 0,
        p: 1,
        fontSize: '12px',
        fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        backgroundColor: 'transparent',
        '& .indent-1': { marginLeft: '20px' },
        '& .indent-2': { marginLeft: '40px' },
        '& .tag': { color: 'primaryText.main' },
        '& .attribute': { color: 'secondary.main' },
        '& .value': { color: 'success.main' }
      }}>
        <div className="tag">{`<?xml version="1.0" ?>`}</div>
        <div className="tag">{`<PropertySetDef>`}</div>
        <div className="indent-1">
          <span className="tag">{`<Name>`}</span>
          <span className="value">{psetData.name}</span>
          <span className="tag">{`</Name>`}</span>
        </div>
        <div className="indent-1">
          <span className="tag">{`<Definition>`}</span>
          <span className="value">{psetData.definition}</span>
          <span className="tag">{`</Definition>`}</span>
        </div>
        <div className="indent-1">
          <span className="tag">{`<IfcVersion version="`}</span>
          <span className="value">{psetData.ifcVersion}</span>
          <span className="tag">{`"/>`}</span>
        </div>
        
        <div className="indent-1 tag">{`<ApplicableClasses>`}</div>
        {psetData.applicableClasses.map((cls, index) => (
          <div key={index} className="indent-2">
            <span className="tag">{`<ClassName>`}</span>
            <span className="value">{cls}</span>
            <span className="tag">{`</ClassName>`}</span>
          </div>
        ))}
        <div className="indent-1 tag">{`</ApplicableClasses>`}</div>

        <div className="indent-1 tag">{`<PropertyDefs>`}</div>
        {psetData.properties.map((prop, index) => (
          <Box key={index} sx={{ ml: '40px' }}>
            <div className="tag">{`<PropertyDef>`}</div>
            <div className="indent-1">
              <span className="tag">{`<Name>`}</span>
              <span className="value">{prop.name}</span>
              <span className="tag">{`</Name>`}</span>
            </div>
            <div className="indent-1">
              <span className="tag">{`<Definition>`}</span>
              <span className="value">{prop.definition}</span>
              <span className="tag">{`</Definition>`}</span>
            </div>
            <div className="indent-1">
              <span className="tag">{`<PropertyType>`}</span>
              <span className="value">{prop.dataType}</span>
              <span className="tag">{`</PropertyType>`}</span>
            </div>
            {prop.enumValues && (
              <>
                <div className="indent-1 tag">{`<EnumList>`}</div>
                {prop.enumValues.map((enumVal, enumIndex) => (
                  <div key={enumIndex} className="indent-2">
                    <span className="tag">{`<EnumItem>`}</span>
                    <span className="value">{enumVal}</span>
                    <span className="tag">{`</EnumItem>`}</span>
                  </div>
                ))}
                <div className="indent-1 tag">{`</EnumList>`}</div>
              </>
            )}
            <div className="tag">{`</PropertyDef>`}</div>
          </Box>
        ))}
        <div className="indent-1 tag">{`</PropertyDefs>`}</div>
        <div className="tag">{`</PropertySetDef>`}</div>
      </Box>
    );
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontSize: '1.1rem' }} gutterBottom>
        PSet Details
      </Typography>
      <Box sx={{ mt: 2 }}>
        {psetFiles.map((pset, index) => (
          <Accordion 
            key={index}
            expanded={!!expandedPanels[index]}
            onChange={handleAccordionChange(index)}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{pset.file.name}</Typography>
            </AccordionSummary>
            {expandedPanels[index] && (
              <AccordionDetails sx={{ 
                maxHeight: '500px', 
                overflow: 'auto',
                backgroundColor: 'background.default'
              }}>
                {formatXML(pset.data)}
              </AccordionDetails>
            )}
          </Accordion>
        ))}
      </Box>
    </Paper>
  );
}

export default PSetDetails;