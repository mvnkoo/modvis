import React, { useState, useRef, useMemo, useCallback } from 'react';
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
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  InfoOutlined,
  ExpandMore,
  ExpandLess,
  CloudDownload,
  UploadFile,
  MenuBook,
  ErrorOutline,
  Refresh,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { IliImportRef } from '../../services/parser/types';
import type { UseImportResolverReturn } from '../../hooks/useImportResolver';
import type { ResolutionResult } from '../../services/imports/modelResolver';
import type { ImportImpact } from '../../services/imports/importImpact';

const STATUS_COLOR: Record<string, string> = {
  auto: '#2e7d32',
  manual: '#2e7d32',
  stdlib: '#777',
  missing: '#c62828',
  pending: '#999',
};

const STATUS_LABEL: Record<string, string> = {
  auto: 'auto',
  manual: 'manuell',
  stdlib: 'stdlib',
  missing: 'nicht geladen',
  pending: 'pending',
};

interface ImportSubTreeProps {
  names: string[];
  ancestors: string[];
  buildRow: (name: string, unqualified?: boolean) => ImportRow;
  subImportsOf: (name: string) => string[];
  isHidden: (name: string) => boolean;
}

/**
 * Rekursiv: für jeden Namen eine kleine Zeile mit Status-Punkt + Name,
 * darunter ggf. eingerückte Sub-Imports. Schutz gegen Zyklen via ancestors[].
 */
const ImportSubTree: React.FC<ImportSubTreeProps> = ({ names, ancestors, buildRow, subImportsOf, isHidden }) => {
  return (
    <Box component="ul" sx={{ m: 0, pl: 2, listStyle: 'none' }}>
      {names.map(name => {
        const cycle = ancestors.includes(name);
        const sub = cycle ? [] : subImportsOf(name);
        const row = buildRow(name);
        const hidden = isHidden(name);
        return (
          <Box component="li" key={`${ancestors.join('>')}>${name}`} sx={{ py: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: STATUS_COLOR[row.status] ?? '#999',
                  opacity: hidden ? 0.4 : 1,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  opacity: cycle ? 0.5 : 0.9,
                  textDecoration: hidden ? 'line-through' : 'none',
                }}
              >
                {name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.55, fontSize: '0.65rem' }}>
                {cycle ? '↻ Zyklus' : STATUS_LABEL[row.status] ?? ''}
              </Typography>
            </Box>
            {sub.length > 0 && (
              <ImportSubTree
                names={sub}
                ancestors={[...ancestors, name]}
                buildRow={buildRow}
                subImportsOf={subImportsOf}
                isHidden={isHidden}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

interface ModelInfoPanelProps {
  fileName: string | null;
  classCount: number;
  structureCount: number;
  topicCount: number;
  associationCount: number;
  enumCount: number;
  inlineEnumCount: number;
  unitCount: number;
  imports: IliImportRef[];
  warningCount: number;
  importWarningCount?: number;
  interlisVersion: string | undefined;
  importResolver?: UseImportResolverReturn;
  onReload?: () => void;
  /** Pro Import-Name: Übersicht über Klassen-Touchpoints */
  importImpacts?: Map<string, ImportImpact>;
}

const STD_LIBS = new Set(['INTERLIS', 'Units', 'Time', 'CoordSys']);

type ImportStatus = 'auto' | 'manual' | 'stdlib' | 'missing' | 'pending';

interface ImportRow {
  name: string;
  unqualified: boolean;
  status: ImportStatus;
  resolution?: ResolutionResult;
  overrideFileName?: string;
}

export const ModelInfoPanel: React.FC<ModelInfoPanelProps> = ({
  fileName,
  classCount,
  structureCount,
  topicCount,
  associationCount,
  enumCount,
  inlineEnumCount,
  unitCount,
  imports,
  warningCount,
  importWarningCount = 0,
  interlisVersion,
  importResolver,
  onReload,
  importImpacts,
}) => {
  const { colors } = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [stdOpen, setStdOpen] = useState(false);
  const [expandedImpact, setExpandedImpact] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  const toggleImpact = (name: string) => {
    setExpandedImpact(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const open = Boolean(anchorEl);
  const hasModel = !!fileName;

  // Helper: Aus einem Modellnamen die ImportRow (Status + Metadaten) ableiten.
  // Wird sowohl für direkte Imports als auch für transitive Sub-Imports genutzt.
  const buildRow = useCallback((name: string, unqualified = false): ImportRow => {
    const lastResult = importResolver?.lastResult;
    const overrides = importResolver?.overrides ?? new Map();
    const override = overrides.get(name);
    if (override) {
      return { name, unqualified, status: 'manual', overrideFileName: override.fileName };
    }
    const res = lastResult?.resolved.find(r => r.modelName === name);
    if (res) {
      return { name, unqualified, status: res.status, resolution: res };
    }
    if (lastResult && lastResult.missing.includes(name)) {
      return { name, unqualified, status: 'missing' };
    }
    return { name, unqualified, status: STD_LIBS.has(name) ? 'stdlib' : 'pending' };
  }, [importResolver?.lastResult, importResolver?.overrides]);

  // Liefert für ein Modell die direkt importierten Sub-Modellnamen — aus dem
  // dependsOn-Feld der Resolution (gefüllt nur wenn das Modell auch wirklich
  // geladen wurde).
  const subImportsOf = useCallback((name: string): string[] => {
    const res = importResolver?.lastResult?.resolved.find(r => r.modelName === name);
    return res?.dependsOn ?? [];
  }, [importResolver?.lastResult]);

  const importRows = useMemo<ImportRow[]>(() => {
    return imports.map(imp => buildRow(imp.name, !!imp.unqualified));
  }, [imports, buildRow]);

  const realImports = importRows.filter(r => !STD_LIBS.has(r.name));
  const stdImports = importRows.filter(r => STD_LIBS.has(r.name));

  const triggerUpload = (modelName: string) => {
    uploadTargetRef.current = modelName;
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const modelName = uploadTargetRef.current;
    if (e.target) e.target.value = '';
    if (!file || !modelName || !importResolver) return;
    await importResolver.uploadOverride(modelName, file);
    uploadTargetRef.current = null;
    if (onReload) await onReload();
  };

  const [fetchingName, setFetchingName] = useState<string | null>(null);
  const [recentFailures, setRecentFailures] = useState<Set<string>>(() => new Set());

  const flashFailure = (modelName: string) => {
    setRecentFailures(prev => {
      const next = new Set(prev);
      next.add(modelName);
      return next;
    });
    setTimeout(() => {
      setRecentFailures(prev => {
        const next = new Set(prev);
        next.delete(modelName);
        return next;
      });
    }, 1100);
  };
  const [fetchToast, setFetchToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const handleAutoFetchSingle = async (modelName: string) => {
    if (!importResolver) return;
    setFetchingName(modelName);
    setFetchToast(null);
    try {
      const result = await importResolver.fetchSingleModel(modelName);
      if (result.status === 'auto' || result.status === 'stdlib') {
        setFetchToast({
          msg: `${modelName} via ${result.repoLabel ?? 'Standard-Library'} geladen.`,
          ok: true,
        });
        if (onReload) await onReload();
      } else {
        setFetchToast({
          msg: `${modelName}: in keinem konfigurierten Repository gefunden.`,
          ok: false,
        });
        flashFailure(modelName);
      }
    } catch (err) {
      setFetchToast({
        msg: `${modelName}: ${err instanceof Error ? err.message : 'Fehler beim Abruf'}`,
        ok: false,
      });
      flashFailure(modelName);
    } finally {
      setFetchingName(null);
    }
  };

  // Toggle: wenn das Modell aktuell per Auto-Fetch geladen ist → entladen.
  // Sonst → versuche Auto-Fetch aus den konfigurierten Repos.
  const handleCloudClick = async (row: ImportRow) => {
    if (!importResolver) return;
    if (row.status === 'auto') {
      importResolver.removeSingleFetched(row.name);
      if (onReload) await onReload();
      setFetchToast({ msg: `${row.name} entladen.`, ok: true });
      return;
    }
    await handleAutoFetchSingle(row.name);
  };

  // Toggle: wenn das Modell aktuell manuell überschrieben ist → entfernen.
  // Sonst → Datei-Picker öffnen.
  const handleUploadClick = async (row: ImportRow) => {
    if (!importResolver) return;
    if (row.status === 'manual') {
      importResolver.removeOverride(row.name);
      if (onReload) await onReload();
      setFetchToast({ msg: `Manueller Upload für ${row.name} entfernt.`, ok: true });
      return;
    }
    triggerUpload(row.name);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importResolver) return;
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.ili')) return;
    const guess = file.name.replace(/\.ili$/i, '');
    const target = imports.find(i => i.name.toLowerCase() === guess.toLowerCase());
    const modelName = target?.name ?? guess;
    await importResolver.uploadOverride(modelName, file);
    if (onReload) await onReload();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const isHidden = (name: string) => !!importResolver?.hiddenImports.has(name);

  const handleToggleHidden = async (modelName: string) => {
    if (!importResolver) return;
    importResolver.toggleHidden(modelName);
    if (onReload) await onReload();
  };

  const renderStatusIcon = (row: ImportRow) => {
    if (row.status === 'auto' || row.status === 'manual') {
      const hidden = isHidden(row.name);
      const tip = hidden
        ? `Modell ausgeblendet — klicken zum Einblenden${row.status === 'auto' && row.resolution?.repoLabel ? ` (via ${row.resolution.repoLabel})` : row.status === 'manual' && row.overrideFileName ? ` (${row.overrideFileName})` : ''}`
        : `Modell sichtbar — klicken zum Ausblenden${row.status === 'auto' && row.resolution?.repoLabel ? ` (via ${row.resolution.repoLabel})` : row.status === 'manual' && row.overrideFileName ? ` (${row.overrideFileName})` : ''}`;
      return (
        <Tooltip title={tip}>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); handleToggleHidden(row.name); }}
            sx={{
              p: 0.25,
              // Hover-Hint: das Icon wird grau & deutet "Ausblenden" an
              '&:hover .ili-eye-visible': { display: 'none' },
              '&:hover .ili-eye-hover': { display: 'inline-flex' },
            }}
          >
            {hidden ? (
              <VisibilityOff fontSize="small" sx={{ color: colors.text, opacity: 0.45 }} />
            ) : (
              <>
                <Visibility
                  fontSize="small"
                  className="ili-eye-visible"
                  sx={{ color: '#1565c0' }}
                />
                <VisibilityOff
                  fontSize="small"
                  className="ili-eye-hover"
                  sx={{ display: 'none', color: colors.text, opacity: 0.55 }}
                />
              </>
            )}
          </IconButton>
        </Tooltip>
      );
    }
    switch (row.status) {
      case 'stdlib':
        return (
          <Tooltip title="Standard-Library (eingebaut)">
            <MenuBook fontSize="small" sx={{ color: colors.text, opacity: 0.5 }} />
          </Tooltip>
        );
      case 'missing':
        return (
          <Tooltip title="Modell nicht geladen — automatisch nachladen oder manuell hochladen">
            <ErrorOutline fontSize="small" sx={{ color: '#c62828' }} />
          </Tooltip>
        );
      case 'pending':
      default:
        return (
          <Tooltip title="Auflösung läuft …">
            <CircularProgress size={14} />
          </Tooltip>
        );
    }
  };

  const isResolving = !!importResolver?.isResolving;

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
        slotProps={{ paper: { sx: { ml: 1, mt: -1 } } }}
      >
        <Box
          sx={{ p: 2, width: 420, maxHeight: 600, overflowY: 'auto' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">
              Modell-Info
            </Typography>
            {isResolving && <CircularProgress size={14} />}
          </Box>

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
            <Chip size="small" label={`${classCount} Classes`} />
            {structureCount > 0 && (
              <Tooltip title="Wertgebundene Datenstrukturen ohne eigene Identität (Refhb 3.5/3.6 Structure)">
                <Chip size="small" label={`${structureCount} Structures`} />
              </Tooltip>
            )}
            {topicCount > 0 && <Chip size="small" label={`${topicCount} Topics`} />}
            {associationCount > 0 && <Chip size="small" label={`${associationCount} Assoc.`} />}
            {enumCount > 0 && (
              <Tooltip title="Wiederverwendbare Enumeration als Wertebereich (INTERLIS-Regel DomainDef, Refhb 3.8.2)">
                <Chip size="small" label={`${enumCount} Enums`} />
              </Tooltip>
            )}
            {inlineEnumCount > 0 && (
              <Tooltip title="Anonyme Enumeration direkt als Attribut-Typ (INTERLIS-Regel AttrTypeDef, Refhb 3.6)">
                <Chip size="small" label={`${inlineEnumCount} Enums (Inline)`} />
              </Tooltip>
            )}
            {unitCount > 0 && <Chip size="small" label={`${unitCount} Units`} />}
            {warningCount > 0 && (
              <Tooltip title="Parser-Warnungen aus dieser Datei">
                <Chip
                  size="small"
                  color="warning"
                  label={`${warningCount} ${warningCount === 1 ? 'Warnung' : 'Warnungen'}`}
                />
              </Tooltip>
            )}
            {importWarningCount > 0 && (
              <Tooltip title="Parser-Hinweise aus auto-geladenen Import-Modellen (betreffen nicht deine Datei)">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${importWarningCount} Import-Hinweis${importWarningCount === 1 ? '' : 'e'}`}
                />
              </Tooltip>
            )}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="subtitle2">
              Imports {realImports.length > 0 && `(${realImports.length})`}
            </Typography>
            {onReload && (
              <Tooltip title="Imports neu auflösen">
                <span>
                  <IconButton size="small" onClick={onReload} disabled={isResolving}>
                    <Refresh fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>

          {realImports.length === 0 ? (
            <Typography variant="caption" sx={{ color: colors.text, opacity: 0.6 }}>
              Keine externen Modell-Abhängigkeiten.
            </Typography>
          ) : (
            <List dense disablePadding>
              {realImports.map(row => {
                const impact = importImpacts?.get(row.name);
                const subImports = subImportsOf(row.name);
                const hasImpactData = (!!impact && (
                  impact.extendsCount + impact.referencesCount + impact.containsCount
                  + impact.associationsCount + impact.unresolved.length > 0
                )) || subImports.length > 0;
                const isOpen = expandedImpact.has(row.name);
                return (
                  <React.Fragment key={row.name}>
                    <ListItem
                      disableGutters
                      sx={{
                        py: 0.5,
                        gap: 1,
                        alignItems: 'flex-start',
                        cursor: hasImpactData ? 'pointer' : 'default',
                        '&:hover': hasImpactData ? { bgcolor: 'action.hover', borderRadius: 1 } : {},
                      }}
                      onClick={hasImpactData ? () => toggleImpact(row.name) : undefined}
                      secondaryAction={
                        row.status === 'stdlib' || row.status === 'pending' ? null : (
                          <Box sx={{ display: 'flex', gap: 0.25 }}>
                            <Tooltip
                              title={
                                row.status === 'auto'
                                  ? `Auto-geladen aus ${row.resolution?.repoLabel ?? 'Repository'} — klicken zum Entladen`
                                  : 'Automatisch aus konfigurierten Repositories nachladen'
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); handleCloudClick(row); }}
                                  disabled={fetchingName === row.name}
                                  sx={{
                                    color: recentFailures.has(row.name)
                                      ? '#c62828'
                                      : row.status === 'auto'
                                        ? '#2e7d32'
                                        : undefined,
                                    opacity: recentFailures.has(row.name)
                                      ? 1
                                      : row.status === 'auto'
                                        ? 1
                                        : 0.55,
                                    transition: 'color 200ms ease',
                                  }}
                                >
                                  {fetchingName === row.name
                                    ? <CircularProgress size={14} />
                                    : <CloudDownload fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip
                              title={
                                row.status === 'manual'
                                  ? `Manueller Upload (${row.overrideFileName ?? row.name}) — klicken zum Entfernen`
                                  : 'Eigene .ili-Datei manuell hochladen'
                              }
                            >
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleUploadClick(row); }}
                                sx={{
                                  color: row.status === 'manual' ? '#2e7d32' : undefined,
                                  opacity: row.status === 'manual' ? 1 : 0.55,
                                }}
                              >
                                <UploadFile fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {hasImpactData && (
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); toggleImpact(row.name); }}
                                sx={{ opacity: 0.7 }}
                              >
                                {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                              </IconButton>
                            )}
                          </Box>
                        )
                      }
                    >
                      <Box sx={{ mt: 0.5 }}>{renderStatusIcon(row)}</Box>
                      <ListItemText
                        disableTypography
                        primary={
                          <Typography
                            variant="body2"
                            component="div"
                            sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                          >
                            {row.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                            {row.unqualified && (
                              <Chip
                                size="small"
                                label="UNQUALIFIED"
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            )}
                            {row.status === 'auto' && row.resolution?.repoLabel && (
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {row.resolution.repoLabel}
                              </Typography>
                            )}
                            {row.status === 'manual' && row.overrideFileName && (
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {row.overrideFileName}
                              </Typography>
                            )}
                            {row.status === 'missing' && (
                              <Typography variant="caption" sx={{ color: '#c62828' }}>
                                Modell nicht geladen
                              </Typography>
                            )}
                            {impact && hasImpactData && (
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {[
                                  impact.extendsCount > 0 ? `${impact.extendsCount} EXTENDS` : null,
                                  impact.referencesCount > 0 ? `${impact.referencesCount} REF` : null,
                                  impact.containsCount > 0 ? `${impact.containsCount} CONT` : null,
                                  impact.associationsCount > 0 ? `${impact.associationsCount} ASSOC` : null,
                                  impact.unresolved.length > 0 ? `${impact.unresolved.length} ungelöst` : null,
                                ].filter(Boolean).join(' · ')}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {hasImpactData && (
                      <Collapse in={isOpen} timeout="auto" unmountOnExit>
                        <Box sx={{ pl: 4, pr: 1, pb: 1 }}>
                          {subImports.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
                                Imports von {row.name} ({subImports.length}):
                              </Typography>
                              <ImportSubTree
                                names={subImports}
                                ancestors={[row.name]}
                                buildRow={buildRow}
                                subImportsOf={subImportsOf}
                                isHidden={isHidden}
                              />
                            </Box>
                          )}
                          {impact && impact.unresolved.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ color: '#c62828', display: 'block', fontWeight: 600 }}>
                                Ungelöste Referenzen ({impact.unresolved.length}):
                              </Typography>
                              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                {impact.unresolved.slice(0, 20).map(u => (
                                  <Typography component="li" variant="caption" key={u.qualified} sx={{ fontFamily: 'monospace', color: colors.text, opacity: 0.85 }}>
                                    {u.qualified}
                                  </Typography>
                                ))}
                                {impact.unresolved.length > 20 && (
                                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                    … +{impact.unresolved.length - 20} weitere
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                          {impact && impact.rows.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                                Verwendung in deiner Datei ({impact.usedImportedClasses} Klasse{impact.usedImportedClasses === 1 ? '' : 'n'}):
                              </Typography>
                              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                {impact.rows.slice(0, 30).map((r, i) => (
                                  <Typography
                                    component="li"
                                    variant="caption"
                                    key={`${r.localClassId}-${r.via}-${i}`}
                                    sx={{ color: colors.text, opacity: 0.85 }}
                                  >
                                    <span style={{ fontFamily: 'monospace' }}>{r.localClassName}</span>
                                    {' '}<span style={{ opacity: 0.6 }}>
                                      {r.via === 'EXTENDS' ? 'erweitert' :
                                       r.via === 'REFERENCES' ? 'referenziert' :
                                       r.via === 'CONTAINS' ? 'enthält' :
                                       'assoziiert mit'}
                                    </span>{' '}
                                    <span style={{ fontFamily: 'monospace' }}>{r.importedClassName}</span>
                                    {r.via === 'ASSOCIATION' && r.associationName && (
                                      <span style={{ opacity: 0.5 }}> ({r.associationName})</span>
                                    )}
                                  </Typography>
                                ))}
                                {impact.rows.length > 30 && (
                                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                    … +{impact.rows.length - 30} weitere
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          )}

          {importResolver && (
            <Box
              sx={{
                mt: 1.5,
                p: 1,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: colors.text, opacity: 0.6 }}>
                Dateien hier ablegen, um fehlende oder falsche Imports zu ersetzen.
              </Typography>
            </Box>
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
                  {stdImports.map(row => (
                    <Typography
                      key={row.name}
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        color: colors.text,
                        opacity: 0.7,
                      }}
                    >
                      {row.name}
                      {row.unqualified && (
                        <span style={{ opacity: 0.5, marginLeft: 6 }}>(unqualified)</span>
                      )}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>
      </Popover>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ili"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />

      <Snackbar
        open={Boolean(fetchToast)}
        autoHideDuration={fetchToast?.ok ? 4000 : 5000}
        onClose={(_e, reason) => {
          if (reason === 'clickaway') return;
          setFetchToast(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {fetchToast ? (
          <Alert
            onClose={() => setFetchToast(null)}
            severity={fetchToast.ok ? 'success' : 'warning'}
            sx={{ width: '100%' }}
          >
            {fetchToast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Paper>
  );
};
