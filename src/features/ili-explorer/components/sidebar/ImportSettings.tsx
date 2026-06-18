import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Box,
  Typography,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Refresh, Delete, Add } from '@mui/icons-material';
import type { UseImportResolverReturn } from '../../hooks/useImportResolver';
import {
  saveCustomRepos,
  loadCustomRepos,
  DEFAULT_REPO_SEEDS,
  type RepoSpec,
} from '../../services/imports/repoSeeds';
import { readCachedIndex } from '../../services/imports/repositoryIndex';

interface ImportSettingsBodyProps {
  importResolver: UseImportResolverReturn;
  onReload?: () => void;
}

/**
 * Inhalt der Import-Einstellungen — ohne eigenes Icon / Popover-Wrapper.
 * Wird vom übergeordneten Settings-Popover (LayoutSettings) als Sub-Panel
 * eingeblendet.
 */
export const ImportSettingsBody: React.FC<ImportSettingsBodyProps> = ({ importResolver, onReload }) => {
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [customRepos, setCustomRepos] = useState<RepoSpec[]>(() => loadCustomRepos());
  const [probingId, setProbingId] = useState<string | null>(null);

  useEffect(() => {
    importResolver.ensureIndexes().catch(() => { /* render with cached/empty state */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleAuto = (_e: unknown, checked: boolean) => {
    importResolver.setAutoImportEnabled(checked);
  };

  const handleProbeRepo = async (repo: RepoSpec) => {
    setProbingId(repo.id);
    try {
      await importResolver.probeSingleRepo(repo);
      if (onReload) await onReload();
    } finally {
      setProbingId(null);
    }
  };

  const handleAddRepo = () => {
    const label = newLabel.trim();
    const url = newUrl.trim().replace(/\/$/, '');
    if (!label || !url) return;
    const id = `custom-${url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    if (customRepos.some(r => r.id === id) || DEFAULT_REPO_SEEDS.some(r => r.id === id)) return;
    const next = [...customRepos, { id, label, baseUrl: url, custom: true }];
    setCustomRepos(next);
    saveCustomRepos(next);
    importResolver.setRepos([...next, ...DEFAULT_REPO_SEEDS]);
    setNewLabel('');
    setNewUrl('');
  };

  const handleRemoveCustom = (id: string) => {
    const next = customRepos.filter(r => r.id !== id);
    setCustomRepos(next);
    saveCustomRepos(next);
    importResolver.setRepos([...next, ...DEFAULT_REPO_SEEDS]);
  };

  const renderRepoStatusChip = (repo: RepoSpec) => {
    const cached = readCachedIndex(repo);
    if (!cached) return <Chip size="small" label="—" />;
    switch (cached.status) {
      case 'ok':
        return <Chip size="small" color="success" label={`OK · ${cached.entries.length}`} />;
      case 'unreachable':
        return (
          <Tooltip title="Nicht erreichbar (CORS-Blockade, DNS-Fehler, TLS- oder Netzwerkproblem)">
            <Chip size="small" color="warning" label="nicht erreichbar" />
          </Tooltip>
        );
      case 'not-found':
        return <Chip size="small" label="404" />;
      case 'error':
        return <Chip size="small" color="error" label="Fehler" />;
      default:
        return <Chip size="small" label="pending" />;
    }
  };

  const renderRepoActions = (repo: RepoSpec, extraAction?: React.ReactNode) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {renderRepoStatusChip(repo)}
      <Tooltip title="Erreichbarkeit prüfen und Modell-Anzahl aktualisieren">
        <span>
          <IconButton
            size="small"
            onClick={() => handleProbeRepo(repo)}
            disabled={probingId === repo.id}
            sx={{ opacity: 0.7 }}
          >
            {probingId === repo.id
              ? <CircularProgress size={14} />
              : <Refresh fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      {extraAction}
    </Box>
  );

  return (
    <Box sx={{ p: 2, width: 460, maxHeight: 640, overflowY: 'auto' }}>
      <Typography variant="subtitle2" gutterBottom>
        Import-Einstellungen
      </Typography>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={importResolver.autoImportEnabled}
            onChange={handleToggleAuto}
          />
        }
        label="Importe automatisch aus Repositories nachladen"
      />
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, ml: 5, opacity: 0.65 }}>
        Aus = Imports aus den Repositorys werden nicht automatisch beim Laden der Modelle hinzugefügt.
      </Typography>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Eigene Repository-URL hinzufügen
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
        <TextField
          size="small"
          label="Bezeichnung"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          fullWidth
        />
        <TextField
          size="small"
          label="https://models.example.ch"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          fullWidth
        />
        <Button
          size="small"
          startIcon={<Add fontSize="small" />}
          onClick={handleAddRepo}
          disabled={!newLabel.trim() || !newUrl.trim()}
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
        >
          Hinzufügen
        </Button>
      </Box>

      {customRepos.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Eigene Repos:
          </Typography>
          <List dense disablePadding>
            {customRepos.map(repo => (
              <ListItem
                key={repo.id}
                disableGutters
                secondaryAction={renderRepoActions(
                  repo,
                  <IconButton size="small" onClick={() => handleRemoveCustom(repo.id)}>
                    <Delete fontSize="small" />
                  </IconButton>,
                )}
              >
                <ListItemText
                  primary={<Typography variant="body2">{repo.label}</Typography>}
                  secondary={
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.7 }}>
                      {repo.baseUrl}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Standard-Repos
      </Typography>
      <List dense disablePadding>
        {DEFAULT_REPO_SEEDS.map(repo => (
          <ListItem key={repo.id} disableGutters sx={{ py: 0.25 }} secondaryAction={renderRepoActions(repo)}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2">{repo.label}</Typography>
                  {repo.github && (
                    <Tooltip title={`Via jsDelivr/GitHub: ${repo.github.repo}@${repo.github.branch ?? 'master'} — CORS-frei`}>
                      <Chip size="small" label="jsDelivr" sx={{ height: 16, fontSize: '0.6rem' }} />
                    </Tooltip>
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.6 }}>
                  {repo.baseUrl}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
