import React from 'react';
import {
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AccountTree,
  Refresh,
  ArrowBack,
  AutoFixHigh,
  ExpandMore,
  ExpandLess,
  FileDownload,
  GridView,
} from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { CurvedIcon, StraightIcon } from '../../../exp-explorer/components/expIcons';

interface IliSideToolbarProps {
  currentFileName: string | null;
  activeNodeId: string | null;
  historyIndex: number;
  canGoBack?: boolean;
  showFullHierarchy: boolean;
  useCurvedLines: boolean;
  exportAnchorEl: HTMLElement | null;
  onShowOverview: () => void;
  onReset: () => void;
  onBack: () => void;
  onHierarchyToggle: () => void;
  onLineTypeToggle: () => void;
  onMagicLayout: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onExportClick: (event: React.MouseEvent<HTMLElement>) => void;
  onExportClose: () => void;
  onExportToClipboard: () => void;
  onExportAsPng: () => void;
  onExportAsSvg: () => void;
}

export const IliSideToolbar: React.FC<IliSideToolbarProps> = ({
  currentFileName,
  activeNodeId,
  historyIndex,
  canGoBack,
  showFullHierarchy,
  useCurvedLines,
  exportAnchorEl,
  onShowOverview,
  onReset,
  onBack,
  onHierarchyToggle,
  onLineTypeToggle,
  onMagicLayout,
  onCollapseAll,
  onExpandAll,
  onExportClick,
  onExportClose,
  onExportToClipboard,
  onExportAsPng,
  onExportAsSvg,
}) => {
  const { colors } = useTheme();
  const noSchema = !currentFileName;
  const noNode = !currentFileName || !activeNodeId;

  return (
    <Paper
      elevation={4}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        p: 0.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        width: 'fit-content',
        '& .MuiIconButton-root': {
          width: 32,
          height: 32,
          borderRadius: 0.5,
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover' },
          '&.Mui-disabled': {
            bgcolor: 'transparent',
            color: theme => theme.palette.action.disabled,
          },
        },
      }}
    >
      <Tooltip title="Overview" placement="right">
        <span>
          <IconButton size="small" onClick={onShowOverview} disabled={noSchema} aria-label="Show overview">
            <GridView fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Ansicht zurücksetzen" placement="right">
        <span>
          <IconButton size="small" onClick={onReset} disabled={noSchema} aria-label="Reset view">
            <Refresh fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Zurück zur vorherigen Ansicht" placement="right">
        <span>
          <IconButton size="small" onClick={onBack} disabled={canGoBack === undefined ? historyIndex <= 0 : !canGoBack} aria-label="Go back">
            <ArrowBack fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Vollständige Hierarchie anzeigen" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={onHierarchyToggle}
            disabled={noNode}
            sx={{ color: showFullHierarchy ? colors.active : 'default' }}
            aria-label="Toggle hierarchy view"
          >
            <AccountTree fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider sx={{ my: 0.5 }} />

      <Tooltip title="Linientyp wechseln" placement="right">
        <span>
          <IconButton size="small" onClick={onLineTypeToggle} aria-label="Toggle line type">
            {useCurvedLines ? <StraightIcon /> : <CurvedIcon />}
          </IconButton>
        </span>
      </Tooltip>

      <Divider sx={{ my: 0.5 }} />

      <Tooltip title="Magic Layout" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={onMagicLayout}
            disabled={noNode}
            aria-label="Magic layout"
            sx={{
              color: theme => theme.palette.warning.main,
              '&:hover': { bgcolor: theme => alpha(theme.palette.warning.main, 0.08) },
            }}
          >
            <AutoFixHigh fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Alle Komponenten einklappen" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={onCollapseAll}
            disabled={noNode}
            aria-label="Collapse all nodes"
          >
            <ExpandLess fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Alle Komponenten ausklappen" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={onExpandAll}
            disabled={noNode}
            aria-label="Expand all nodes"
          >
            <ExpandMore fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider sx={{ my: 0.5 }} />

      <Tooltip title="Als Datei exportieren" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={onExportClick}
            disabled={noNode}
            aria-label="Export diagram"
          >
            <FileDownload fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={onExportClose}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
      >
        <MenuItem onClick={onExportToClipboard}>In Zwischenablage kopieren</MenuItem>
        <MenuItem onClick={onExportAsPng}>Als PNG speichern</MenuItem>
        <MenuItem onClick={onExportAsSvg}>Als SVG speichern</MenuItem>
      </Menu>
    </Paper>
  );
};
