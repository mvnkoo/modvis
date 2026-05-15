import { useState, useCallback, useRef } from 'react';
import { toPng, toSvg } from 'html-to-image';

export interface SelectionRect {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

const HEADER_OFFSET = 36;
const TOOLBAR_OFFSET = 28;

const HIDE_CSS = `
  .react-flow__background { display: none !important; }
  .react-flow__handle { opacity: 0 !important; }
  .react-flow__controls,
  .react-flow__minimap,
  .selection-overlay { display: none !important; }
`;

const HIDE_SELECTORS =
  '.react-flow__controls, .search-toolbar, .layout-settings, .side-toolbar, .upload-area';

const EXCLUDED_CLASSES = [
  'react-flow__background',
  'react-flow__controls',
  'react-flow__minimap',
  'search-toolbar',
  'layout-settings',
  'side-toolbar',
  'upload-area',
  'hidden-for-export',
  'selection-overlay',
];

function nodeFilterForExport(node: HTMLElement): boolean {
  return !EXCLUDED_CLASSES.some((cls) => node.classList?.contains(cls));
}

function withTransientStyles<T>(
  background: string,
  run: () => Promise<T>,
): Promise<T> {
  const tempStyle = document.createElement('style');
  tempStyle.innerHTML = `
    ${HIDE_CSS}
    .react-flow { background-color: ${background} !important; }
  `;
  document.head.appendChild(tempStyle);

  const elementsToHide = document.querySelectorAll(HIDE_SELECTORS);
  elementsToHide.forEach((el) => ((el as HTMLElement).style.display = 'none'));

  return run().finally(() => {
    tempStyle.remove();
    elementsToHide.forEach((el) => ((el as HTMLElement).style.display = ''));
  });
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function copyDataUrlToClipboard(dataUrl: string): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function useExpressDiagramExport(currentFileName: string | null) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClipboardExport, setIsClipboardExport] = useState(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = useCallback(
    (message: string, severity: 'success' | 'info' | 'warning' | 'error') => {
      setToastMessage(message);
      setToastSeverity(severity);
      setToastOpen(true);
    },
    [],
  );

  const baseName = currentFileName?.replace(/\.(exp|express)$/i, '') || 'schema';

  const handleExportClose = useCallback(() => {
    setExportAnchorEl(null);
  }, []);

  const handleExportClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  }, []);

  const startAreaSelection = useCallback(
    (forClipboard: boolean) => {
      if (isExporting) return;
      setIsExporting(true);
      setIsClipboardExport(forClipboard);
      setIsSelectingArea(true);
      handleExportClose();
      setTimeout(() => setIsExporting(false), 500);
    },
    [isExporting, handleExportClose],
  );

  const handleExportAsPng = useCallback(() => startAreaSelection(false), [startAreaSelection]);
  const handleExportToClipboard = useCallback(() => startAreaSelection(true), [startAreaSelection]);

  const handleSelectionStart = useCallback(
    (event: React.MouseEvent) => {
      if (!isSelectingArea) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      selectionStartRef.current = { x, y };
      setIsDragging(true);
      setSelectionRect({ startX: x, startY: y, width: 0, height: 0 });
      event.preventDefault();
    },
    [isSelectingArea],
  );

  const handleSelectionMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging || !selectionStartRef.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;
      setSelectionRect({
        startX: selectionStartRef.current.x,
        startY: selectionStartRef.current.y,
        width: currentX - selectionStartRef.current.x,
        height: currentY - selectionStartRef.current.y,
      });
      event.preventDefault();
    },
    [isDragging],
  );

  const resetSelection = useCallback(() => {
    setIsExporting(false);
    setIsDragging(false);
    setIsSelectingArea(false);
    setSelectionRect(null);
    selectionStartRef.current = null;
    setIsClipboardExport(false);
  }, []);

  const handleSelectionEnd = useCallback(() => {
    if (!isDragging || !selectionRect || isExporting) return;

    const flowElement = document.querySelector('.react-flow');
    if (!flowElement) return;

    setIsExporting(true);

    const totalOffset = HEADER_OFFSET + TOOLBAR_OFFSET;
    const normalizedRect = {
      x: Math.min(selectionRect.startX, selectionRect.startX + selectionRect.width),
      y:
        Math.min(selectionRect.startY, selectionRect.startY + selectionRect.height) -
        totalOffset,
      width: Math.abs(selectionRect.width),
      height: Math.abs(selectionRect.height),
    };

    const exportOptions = {
      quality: 1,
      pixelRatio: window.devicePixelRatio * 4,
      backgroundColor: isClipboardExport ? undefined : '#ffffff',
      filter: nodeFilterForExport,
      width: normalizedRect.width,
      height: normalizedRect.height,
      style: {
        transform: `translate(${-normalizedRect.x}px, ${-normalizedRect.y}px) scale(${1})`,
        transformOrigin: 'top left',
        width: `${(flowElement as HTMLElement).clientWidth}px`,
        height: `${(flowElement as HTMLElement).clientHeight}px`,
      },
    };

    const background = isClipboardExport ? 'transparent' : 'white';
    const wantsClipboard = isClipboardExport;

    withTransientStyles(background, async () => {
      const dataUrl = await toPng(flowElement as HTMLElement, exportOptions);
      if (wantsClipboard) {
        await copyDataUrlToClipboard(dataUrl);
        showToast('Diagramm wurde in die Zwischenablage kopiert', 'success');
      } else {
        downloadDataUrl(dataUrl, `${baseName}.png`);
      }
    })
      .catch((err) => {
        // Surface failures via toast instead of console.
        showToast(
          `Fehler beim Exportieren: ${(err as Error).message ?? 'unbekannt'}`,
          'error',
        );
      })
      .finally(resetSelection);
  }, [
    isDragging,
    selectionRect,
    isExporting,
    isClipboardExport,
    baseName,
    showToast,
    resetSelection,
  ]);

  const handleExportAsSvg = useCallback(() => {
    if (isExporting) return;
    const flowElement = document.querySelector('.react-flow');
    if (!flowElement) return;

    setIsExporting(true);
    handleExportClose();

    withTransientStyles('white', async () => {
      const dataUrl = await toSvg(flowElement as HTMLElement, {
        filter: nodeFilterForExport,
        style: { backgroundColor: 'white' },
      });
      downloadDataUrl(dataUrl, `${baseName}.svg`);
    })
      .catch((err) => {
        showToast(
          `Fehler beim SVG-Export: ${(err as Error).message ?? 'unbekannt'}`,
          'error',
        );
      })
      .finally(() => setIsExporting(false));
  }, [isExporting, handleExportClose, baseName, showToast]);

  return {
    exportAnchorEl,
    handleExportClick,
    handleExportClose,
    handleExportAsPng,
    handleExportToClipboard,
    handleExportAsSvg,

    isSelectingArea,
    isDragging,
    selectionRect,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,

    toastOpen,
    toastMessage,
    toastSeverity,
    setToastOpen,
    showToast,
  };
}
