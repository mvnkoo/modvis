import React from 'react';
import { 
  Paper, Typography, Box, FormControl, InputLabel, 
  Select, MenuItem, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails,
  Button, IconButton, Tooltip
} from '@mui/material';
import { ExpandMore, Merge, Upload, Download, Info, FileUpload, FileDownload } from '@mui/icons-material';
import { useAppState, useAppDispatch } from '../../../context/AppContext';
import { SchemaMergeService } from '../services/schemaMergeService';
import { MergingRules, Configuration } from '../types';

const configDescriptions = {
  integrationType: "Wählen Sie, wie die Property Sets in das Schema integriert werden sollen:\n\n" +
    "• Bestehende ENTITYs erweitern: Fügt die Properties direkt in die vorhandenen ENTITY-Definitionen ein. " +
    "Dies ermöglicht eine nahtlose Integration in die bestehende Struktur und macht die Properties direkt verfügbar.\n\n" +
    "• Als neue TYPE-Definitionen erstellen: Erstellt separate TYPE-Definitionen für jedes Property Set. " +
    "Dies ermöglicht eine klare Trennung und bessere Wiederverwendbarkeit, führt aber zu einer komplexeren Schema-Struktur.",
  
  useApplicableClasses: "Verwendet die in den XML-Dateien definierten ApplicableClasses für die automatische Zuordnung " +
    "der Properties zu den korrekten ENTITY-Typen.\n\n" +
    "• Aktiviert: Properties werden nur den in der PSet-Definition angegebenen Entities zugeordnet\n" +
    "• Deaktiviert: Properties können manuell beliebigen Entities zugeordnet werden",
  
  relationships: "Bestimmt, wie Beziehungen zwischen Properties und Entities behandelt werden:\n\n" +
    "• Direkte Referenzen: Erstellt direkte Referenzen zu anderen IFC-Entities (z.B. 'wall : IfcWall'). " +
    "Dies ist die einfachste und üblichste Form der Beziehung in IFC. Sie ermöglicht direkte Verweise auf andere " +
    "Entities und ist besonders nützlich für einfache 1:1 Beziehungen. Die Referenzen sind leicht zu verstehen " +
    "und zu verfolgen.\n\n" +
    
    "• Separate Relationen: Erstellt eigenständige Relationsklassen (z.B. 'ENTITY Wall_has_Properties'). " +
    "Diese Option erstellt neue ENTITY-Definitionen speziell für die Beziehungen. Dies ermöglicht komplexere " +
    "Beziehungsmodelle mit zusätzlichen Attributen und ist besonders nützlich für n:m Beziehungen oder wenn " +
    "die Beziehung selbst weitere Eigenschaften haben soll.\n\n" +
    
    "• Verschachtelte Struktur: Bettet die Properties in verschachtelten Typen ein. Diese Option " +
    "erstellt neue TYPE-Definitionen, die die Beziehungen kapseln. Dies ist nützlich für komplexe " +
    "Datenstrukturen und wenn Properties gruppiert oder hierarchisch organisiert werden sollen. " +
    "Ermöglicht auch die Wiederverwendung von Property-Strukturen.\n\n" +
    
    "• Einfache Properties: Behandelt Beziehungen als einfache Properties ohne Referenzen. Diese Option " +
    "vereinfacht das Schema, indem sie Beziehungen in einfache Attribute umwandelt. Dies reduziert die " +
    "Komplexität und verbessert die Lesbarkeit, geht aber auf Kosten der Referenzierbarkeit und " +
    "der Möglichkeit, Beziehungen zu verfolgen.\n\n" +
    
    "Die Wahl der Beziehungsart hat Auswirkungen auf die Komplexität, Wartbarkeit und Nutzbarkeit des Schemas. " +
    "Direkte Referenzen sind der Standard in IFC, während die anderen Optionen für spezielle Anwendungsfälle " +
    "nützlich sein können.",
  
  addPrefixToTypes: "Fügt automatisch den 'Pset_' Prefix zu neuen TYPE-Definitionen hinzu.\n\n" +
    "• Aktiviert: Neue Typen erhalten den Prefix (z.B. 'Pset_WallCommon')\n" +
    "• Deaktiviert: Typen werden ohne Prefix erstellt\n\n" +
    "Der Prefix verbessert die Lesbarkeit und verhindert Namenskonflikte im Schema.",
  
  addSuffixToProperties: "Behandlung von Property-Namen bei möglichen Namenskonflikten.\n\n" +
    "• Aktiviert: Fügt automatisch den PSet-Namen als Suffix hinzu (z.B. 'LoadBearing_WallCommon')\n" +
    "• Deaktiviert: Behält originale Property-Namen bei\n\n" +
    "Das Suffix stellt sicher, dass alle Property-Namen im Schema eindeutig sind.",
  
  useDirectTypes: "Bestimmt, wie IFC-Datentypen im Schema verwendet werden.\n\n" +
    "• Aktiviert: Verwendet die original IFC-Datentypen aus den PSet-Definitionen\n" +
    "• Deaktiviert: Transformiert IFC-Typen in grundlegende EXPRESS-Typen\n\n" +
    "Die direkte Verwendung gewährleistet maximale IFC-Kompatibilität.",
  
  transformTypes: "Option zur Transformation von IFC-spezifischen Datentypen.\n\n" +
    "• Aktiviert: Wandelt IFC-Typen in BASIS-EXPRESS-Typen um (z.B. IfcLabel → STRING)\n" +
    "• Deaktiviert: Behält die original IFC-Typen bei\n\n" +
    "Die Transformation kann die Schema-Komplexität reduzieren, aber einige IFC-spezifische Typinformationen gehen verloren.",
  
  addComments: "Steuerung der automatischen Kommentierung im Schema.\n\n" +
    "• Aktiviert: Fügt erklärende Kommentare zu allen geänderten oder neuen Elementen hinzu\n" +
    "• Deaktiviert: Fügt keine zusätzlichen Kommentare ein\n\n" +
    "Kommentare verbessern die Nachvollziehbarkeit der Änderungen im Schema.",
  
  enumerationStyle: "Wählen Sie, wie Enumerationen aus den PSets im Schema behandelt werden sollen:\n\n" +
    "• Als ENUMERATION: Erstellt einen eigenen Aufzählungstyp (z.B. 'TYPE MyEnum = ENUMERATION OF (...)'). " +
    "Dies bietet strenge Typsicherheit und bessere Toolunterstützung.\n\n" +
    "• Als STRING mit WHERE: Verwendet einen String-Typ mit WHERE-Regel zur Validierung der Werte. " +
    "Dies ist flexibler bei Erweiterungen und einfacher zu modifizieren.",
};

const defaultMergingRules = {
  createNewTypes: false,
  extendExistingEntities: true,
  useApplicableClasses: true,
  relationships: 'DIRECT_REFERENCE',
  addPrefixToTypes: true,
  addSuffixToProperties: true,
  useDirectTypes: true,
  transformTypes: false,
  addComments: true,
  enumerationStyle: 'ENUMERATION',
};

function ConfigurationMerging() {
  const { configuration, psetFiles, expressData } = useAppState();
  const dispatch = useAppDispatch();
  const [configExpanded, setConfigExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!configuration?.mergingRules) {
      dispatch({
        type: 'UPDATE_CONFIGURATION',
        payload: { 
          mergingRules: defaultMergingRules
        }
      });
    }
  }, [configuration?.mergingRules, dispatch]);

  const handleSchemaVersionChange = (event) => {
    dispatch({
      type: 'UPDATE_CONFIGURATION',
      payload: { schemaVersion: event.target.value }
    });
  };

  const handleMergingRuleChange = (key, value) => {
    let updatedRules = {
      ...configuration.mergingRules,
      [key]: value
    };

    if (key === 'createNewTypes' && value === true) {
      updatedRules.extendExistingEntities = false;
    } else if (key === 'extendExistingEntities' && value === true) {
      updatedRules.createNewTypes = false;
    }

    dispatch({
      type: 'UPDATE_CONFIGURATION',
      payload: {
        mergingRules: updatedRules
      }
    });
  };

  const handleMerge = async () => {
    if (!expressData || !psetFiles.length) return;

    dispatch({ type: 'CLEAR_MERGE_LOGS' });

    try {
      const mergeService = new SchemaMergeService();
      
      const mergedContent = await mergeService.mergeExpressWithPSets(
        expressData,
        psetFiles.map(f => f.data),
        configuration,
        dispatch
      );
      
      dispatch({
        type: 'SET_MERGED_DATA',
        payload: mergedContent
      });
    } catch (error) {
      console.error('Fehler beim Zusammenführen:', error);
      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'ERROR',
          message: `Fehler beim Zusammenführen: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const exportConfig = () => {
    const configJson = JSON.stringify(configuration, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wizzbo-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importConfig = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          dispatch({
            type: 'UPDATE_CONFIGURATION',
            payload: config
          });
        } catch (error) {
          console.error('Fehler beim Import der Konfiguration:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleIntegrationTypeChange = (event) => {
    const value = event.target.value;
    dispatch({
      type: 'UPDATE_CONFIGURATION',
      payload: {
        mergingRules: {
          ...configuration.mergingRules,
          createNewTypes: value === 'TYPE',
          extendExistingEntities: value === 'ENTITY'
        }
      }
    });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Accordion expanded={configExpanded} onChange={() => setConfigExpanded(!configExpanded)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Merge Configuration</Typography>
            <Box sx={{ ml: 2 }}>
              <input
                accept=".json"
                style={{ display: 'none' }}
                id="config-file-upload"
                type="file"
                onChange={importConfig}
              />
              <label htmlFor="config-file-upload">
                <Tooltip title="Konfiguration importieren">
                  <IconButton component="span" size="small">
                    <FileDownload />
                  </IconButton>
                </Tooltip>
              </label>
              <Tooltip title="Konfiguration exportieren">
                <IconButton onClick={exportConfig} size="small">
                  <FileUpload />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* Integration der PSets */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Integration der PSets</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl>
                  <InputLabel>Integrationstyp</InputLabel>
                  <Select
                    value={configuration.mergingRules?.createNewTypes ? 'TYPE' : 'ENTITY'}
                    label="Integrationstyp"
                    onChange={handleIntegrationTypeChange}
                  >
                    <MenuItem value="ENTITY">Bestehende ENTITYs erweitern</MenuItem>
                    <MenuItem value="TYPE">Als neue TYPE-Definitionen erstellen</MenuItem>
                  </Select>
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Info fontSize="small" sx={{ color: 'action.active', mt: 0.5 }} />
                    <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line' }}>
                      {configDescriptions.integrationType}
                    </Typography>
                  </Box>
                </FormControl>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Beziehungen */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Beziehungen</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth>
                <InputLabel>Beziehungstyp</InputLabel>
                <Select
                  value={configuration.mergingRules?.relationships || 'DIRECT_REFERENCE'}
                  label="Beziehungstyp"
                  onChange={(e) => handleMergingRuleChange('relationships', e.target.value)}
                >
                  <MenuItem value="DIRECT_REFERENCE">Direkte Referenzen</MenuItem>
                  <MenuItem value="SEPARATE_RELATIONS">Separate Relationen</MenuItem>
                  <MenuItem value="NESTED">Verschachtelte Struktur</MenuItem>
                  <MenuItem value="SIMPLE">Einfache Properties</MenuItem>
                </Select>
                <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', mt: 1 }}>
                  {configDescriptions.relationships}
                </Typography>
              </FormControl>
            </AccordionDetails>
          </Accordion>

          {/* Namenskonflikte */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Namenskonflikte</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={configuration.mergingRules?.addPrefixToTypes ?? true}
                        onChange={(e) => handleMergingRuleChange('addPrefixToTypes', e.target.checked)}
                      />
                    }
                    label="Prefix für neue TYPEs hinzufügen"
                  />
                  <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', mt: 1 }}>
                    {configDescriptions.addPrefixToTypes}
                  </Typography>
                </Box>

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={configuration.mergingRules?.addSuffixToProperties ?? true}
                        onChange={(e) => handleMergingRuleChange('addSuffixToProperties', e.target.checked)}
                      />
                    }
                    label="Suffix für kollidierende Properties"
                  />
                  <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', mt: 1 }}>
                    {configDescriptions.addSuffixToProperties}
                  </Typography>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Datentypen */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Datentypen</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={configuration.mergingRules?.useDirectTypes ?? true}
                        onChange={(e) => handleMergingRuleChange('useDirectTypes', e.target.checked)}
                      />
                    }
                    label="PSet-Typen direkt übernehmen"
                  />
                  <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', mt: 1 }}>
                    {configDescriptions.useDirectTypes}
                  </Typography>
                </Box>

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={configuration.mergingRules?.transformTypes ?? false}
                        onChange={(e) => handleMergingRuleChange('transformTypes', e.target.checked)}
                      />
                    }
                    label="Typen transformieren"
                  />
                  <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', mt: 1 }}>
                    {configDescriptions.transformTypes}
                  </Typography>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
          
          {/* Dokumentation */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Dokumentation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configuration.mergingRules?.addComments ?? true}
                      onChange={(e) => handleMergingRuleChange('addComments', e.target.checked)}
                    />
                  }
                  label="Änderungen kommentieren"
                />
                <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', mt: 1 }}>
                  {configDescriptions.addComments}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Neue Accordion für Enumeration-Behandlung */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Enumerationen</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl>
                  <InputLabel>Enumeration Stil</InputLabel>
                  <Select
                    value={configuration.mergingRules?.enumerationStyle || 'ENUMERATION'}
                    label="Enumeration Stil"
                    onChange={(e) => handleMergingRuleChange('enumerationStyle', e.target.value)}
                  >
                    <MenuItem value="ENUMERATION">Als ENUMERATION TYPE</MenuItem>
                    <MenuItem value="STRING_WHERE">Als STRING mit WHERE-Regel</MenuItem>
                  </Select>
                  <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', mt: 1 }}>
                    {configDescriptions.enumerationStyle}
                  </Typography>
                </FormControl>
              </Box>
            </AccordionDetails>
          </Accordion>

        </AccordionDetails>
      </Accordion>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        startIcon={<Merge />}
        onClick={handleMerge}
        sx={{ mt: 2 }}
        disabled={!expressData || psetFiles.length === 0}
      >
        PSets in Schema zusammenführen
      </Button>
    </Paper>
  );
}

export default ConfigurationMerging;