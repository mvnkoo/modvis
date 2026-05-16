import React, { useRef, useState } from 'react';
import {
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AccountTree,
  ArrowBack,
  ArrowForward,
  AutoFixHigh,
  ExpandMore,
  ExpandLess,
  FileDownload,
  GridView,
  RestartAlt,
  GridView as OverviewIcon,
} from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { CurvedIcon, StraightIcon } from '../../../exp-explorer/components/expIcons';
import type { NavigationState } from '../../services/types/IliBaseTypes';

const LONG_PRESS_MS = 380;

type HistoryDirection = 'back' | 'forward';

function describeEntry(entry: NavigationState): { kind: string; label: string } {
  if (entry.isOverview) {
    return { kind: 'OVERVIEW', label: 'Übersicht' };
  }
  if (entry.isFullSchema) {
    return { kind: 'FULL SCHEMA', label: 'Alles anzeigen' };
  }
  const node = entry.node;
  const label = String(node?.data?.label ?? entry.label ?? entry.nodeId);
  const flowType = node?.type ?? entry.type;
  const isAbstract = node?.data?.isAbstract ?? entry.isAbstract;
  let kind: string;
  switch (flowType) {
    case 'classNode':
    case 'CLASS':
      kind = isAbstract ? 'ABSTRACT CLASS' : 'CLASS';
      break;
    case 'structureNode':
    case 'STRUCTURE':
      kind = 'STRUCTURE';
      break;
    case 'enumNode':
    case 'ENUMERATION':
      kind = 'ENUMERATION';
      break;
    case 'domainEnumNode':
      kind = node?.data?.isDomainEnum ? 'DOMAIN ENUMERATION' : 'ENUMERATION';
      break;
    case 'associationNode':
    case 'ASSOCIATION':
      kind = 'ASSOCIATION';
      break;
    case 'topicNode':
    case 'TOPIC':
      kind = 'TOPIC';
      break;
    default:
      kind = String(flowType ?? 'NODE').toUpperCase();
  }
  return { kind, label };
}

interface IliSideToolbarProps {
  currentFileName: string | null;
  activeNodeId: string | null;
  historyIndex: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
  navigationHistory: NavigationState[];
  overviewWasShown: boolean;
  onJumpToHistoryIndex: (targetIndex: number) => boolean;
  useCurvedLines: boolean;
  exportAnchorEl: HTMLElement | null;
  onShowOverview: () => void;
  onShowFullSchema: () => void;
  onBack: () => void;
  onForward: () => void;
  onLineTypeToggle: () => void;
  onResetLayout: () => void;
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
  canGoForward,
  navigationHistory,
  overviewWasShown,
  onJumpToHistoryIndex,
  useCurvedLines,
  exportAnchorEl,
  onShowOverview,
  onShowFullSchema,
  onBack,
  onForward,
  onLineTypeToggle,
  onResetLayout,
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

  const [historyMenu, setHistoryMenu] = useState<{ anchor: HTMLElement; direction: HistoryDirection } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (direction: HistoryDirection) => (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    longPressFiredRef.current = false;
    const target = event.currentTarget;
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      longPressTimer.current = null;
      setHistoryMenu({ anchor: target, direction });
    }, LONG_PRESS_MS);
  };

  const handleNavClick = (direction: HistoryDirection) => () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    cancelLongPress();
    if (direction === 'back') onBack();
    else onForward();
  };

  const closeHistoryMenu = () => setHistoryMenu(null);

  const jumpAndClose = (targetIndex: number) => () => {
    onJumpToHistoryIndex(targetIndex);
    closeHistoryMenu();
  };

  const backMenuItems: { index: number; entry: NavigationState }[] = [];
  if (historyMenu?.direction === 'back') {
    for (let i = historyIndex - 1; i >= 0; i--) {
      backMenuItems.push({ index: i, entry: navigationHistory[i] });
    }
  }

  const forwardMenuItems: { index: number; entry: NavigationState }[] = [];
  if (historyMenu?.direction === 'forward') {
    for (let i = historyIndex + 1; i < navigationHistory.length; i++) {
      forwardMenuItems.push({ index: i, entry: navigationHistory[i] });
    }
  }

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
      <Tooltip title="Overview / Ansicht zurücksetzen" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={onShowOverview}
            disabled={noSchema}
            aria-label="Show overview"
            sx={{
              color: colors.entity,
              bgcolor: alpha(colors.entity, 0.12),
              '&:hover': { bgcolor: alpha(colors.entity, 0.24) },
            }}
          >
            <GridView fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Alles anzeigen (ganzes Modell als Vererbungsbaum pro Topic)" placement="right">
        <span>
          <IconButton size="small" onClick={onShowFullSchema} disabled={noSchema} aria-label="Show full schema">
            <AccountTree fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Zurück (lang drücken für Verlauf)" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={handleNavClick('back')}
            onPointerDown={startLongPress('back')}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            disabled={canGoBack === undefined ? historyIndex <= 0 : !canGoBack}
            aria-label="Go back"
          >
            <ArrowBack fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Vorwärts (lang drücken für Verlauf)" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={handleNavClick('forward')}
            onPointerDown={startLongPress('forward')}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            disabled={!canGoForward}
            aria-label="Go forward"
          >
            <ArrowForward fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={historyMenu?.anchor ?? null}
        open={historyMenu !== null}
        onClose={closeHistoryMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 360,
              minWidth: 220,
              maxHeight: 'min(80vh, 720px)',
              overflowY: 'auto',
            },
          },
        }}
      >
        {historyMenu?.direction === 'back' && backMenuItems.map(({ index, entry }) => {
          const desc = describeEntry(entry);
          const isOv = entry.isOverview;
          return (
            <MenuItem key={`b-${index}`} onClick={jumpAndClose(index)} sx={isOv ? { gap: 1 } : undefined}>
              {isOv && <OverviewIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
              <ListItemText
                primary={desc.label}
                secondary={desc.kind}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
              />
            </MenuItem>
          );
        })}
        {historyMenu?.direction === 'forward' && forwardMenuItems.map(({ index, entry }) => {
          const desc = describeEntry(entry);
          const isOv = entry.isOverview;
          return (
            <MenuItem key={`f-${index}`} onClick={jumpAndClose(index)} sx={isOv ? { gap: 1 } : undefined}>
              {isOv && <OverviewIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
              <ListItemText
                primary={desc.label}
                secondary={desc.kind}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
              />
            </MenuItem>
          );
        })}
        {historyMenu?.direction === 'back' && backMenuItems.length === 0 && (
          <MenuItem disabled>
            <Typography variant="caption">Kein Verlauf</Typography>
          </MenuItem>
        )}
        {historyMenu?.direction === 'forward' && forwardMenuItems.length === 0 && (
          <MenuItem disabled>
            <Typography variant="caption">Kein Verlauf</Typography>
          </MenuItem>
        )}
      </Menu>

      <Divider sx={{ my: 0.5 }} />

      <Tooltip title="Linientyp wechseln" placement="right">
        <span>
          <IconButton size="small" onClick={onLineTypeToggle} aria-label="Toggle line type">
            {useCurvedLines ? <StraightIcon /> : <CurvedIcon />}
          </IconButton>
        </span>
      </Tooltip>

      <Divider sx={{ my: 0.5 }} />

      <Tooltip title="Layout zurücksetzen" placement="right">
        <span>
          <IconButton
            size="small"
            onClick={onResetLayout}
            disabled={noNode}
            aria-label="Reset layout"
          >
            <RestartAlt fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

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
