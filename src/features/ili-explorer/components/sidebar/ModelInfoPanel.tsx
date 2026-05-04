import React, { useState } from 'react';
import {
  IconButton,
  Popover,
  Box,
  Typography,
  Paper,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Collapse,
  Link,
} from '@mui/material';
import {
  InfoOutlined,
  DownloadOutlined,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { IliImportRef } from '../../services/parsers/IliParser';

interface ModelInfoPanelProps {
  fileName: string | null;
  classCount: number;
  topicCount: number;
  associationCount: number;
  enumCount: number;
  unitCount: number;
  imports: IliImportRef[];
  warningCount: number;
  interlisVersion: string | undefined;
}

const STD_LIBS = new Set(['INTERLIS', 'Units', 'Time', 'CoordSys']);

export const ModelInfoPanel: React.FC<ModelInfoPanelProps> = ({
  fileName,
  classCount,
  topicCount,
  associationCount,
  enumCount,
  unitCount,
  imports,
  warningCount,
  interlisVersion,
}) => {
  const { colors } = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [stdOpen, setStdOpen] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const open = Boolean(anchorEl);
  const hasModel = !!fileName;

  const realImports = imports.filter(i => !STD_LIBS.has(i.name));
  const stdImports = imports.filter(i => STD_LIBS.has(i.name));

  return (
    <Paper
      elevation={4}
      sx={{
        p: 0.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        mb: 1,
      }}
    >
      <Tooltip title={hasModel ? 'Modell-Info & Imports' : 'Kein Modell geladen'}>
        <span>
          <IconButton onClick={handleClick} size="small" disabled={!hasModel}>
            <InfoOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 380, maxHeight: 520, overflowY: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Modell-Info
          </Typography>

          {fileName && (
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mb: 1 }}
            >
              {fileName}
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {interlisVersion && (
              <Chip size="small" color="primary" label={`INTERLIS ${interlisVersion}`} />
            )}
            <Chip size="small" label={`${classCount} Klassen`} />
            {topicCount > 0 && <Chip size="small" label={`${topicCount} Topics`} />}
            {associationCount > 0 && <Chip size="small" label={`${associationCount} Assoc.`} />}
            {enumCount > 0 && <Chip size="small" label={`${enumCount} Enums`} />}
            {unitCount > 0 && <Chip size="small" label={`${unitCount} Units`} />}
            {warningCount > 0 && (
              <Chip
                size="small"
                color="warning"
                label={`${warningCount} ${warningCount === 1 ? 'Warnung' : 'Warnungen'}`}
              />
            )}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Imports {realImports.length > 0 && `(${realImports.length})`}
          </Typography>

          {realImports.length === 0 ? (
            <Typography variant="caption" sx={{ color: colors.text, opacity: 0.6 }}>
              Keine externen Modell-Abhängigkeiten.
            </Typography>
          ) : (
            <List dense disablePadding>
              {realImports.map(imp => (
                <ListItem
                  key={imp.name}
                  disableGutters
                  sx={{ py: 0.25 }}
                  secondaryAction={
                    <Tooltip title="Modell laden (in Vorbereitung)">
                      <span>
                        <IconButton size="small" disabled aria-label={`Import ${imp.name} laden`}>
                          <DownloadOutlined fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Typography
                        variant="body2"
                        component="div"
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                      >
                        {imp.name}
                      </Typography>
                    }
                    secondary={
                      imp.unqualified ? (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                          <Chip
                            size="small"
                            label="UNQUALIFIED"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        </Box>
                      ) : null
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}

          {stdImports.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={() => setStdOpen(o => !o)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.75rem',
                  color: colors.text,
                  opacity: 0.7,
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  p: 0,
                }}
              >
                {stdOpen ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                {stdImports.length} Standard-{stdImports.length === 1 ? 'Library' : 'Libraries'}
              </Link>
              <Collapse in={stdOpen} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 0.5, pl: 2, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {stdImports.map(imp => (
                    <Typography
                      key={imp.name}
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        color: colors.text,
                        opacity: 0.7,
                      }}
                    >
                      {imp.name}
                      {imp.unqualified && (
                        <span style={{ opacity: 0.5, marginLeft: 6 }}>(unqualified)</span>
                      )}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" sx={{ color: colors.text, opacity: 0.6 }}>
            Imports laden ist in Vorbereitung — die Liste zeigt aktuell nur die
            im Modell deklarierten Abhängigkeiten.
          </Typography>
        </Box>
      </Popover>
    </Paper>
  );
};
