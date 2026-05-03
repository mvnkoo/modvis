import React from 'react';
import { Typography } from '@mui/material';
import type { SelectionRect } from '../hooks/useDiagramExport';

interface IliSelectionOverlayProps {
  isSelectingArea: boolean;
  selectionRect: SelectionRect | null;
  onSelectionStart: (event: React.MouseEvent) => void;
  onSelectionMove: (event: React.MouseEvent) => void;
  onSelectionEnd: () => void;
}

export const IliSelectionOverlay: React.FC<IliSelectionOverlayProps> = ({
  isSelectingArea,
  selectionRect,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
}) => {
  if (!isSelectingArea) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        cursor: 'crosshair',
        zIndex: 1000,
      }}
      className="selection-overlay"
      onMouseDown={onSelectionStart}
      onMouseMove={onSelectionMove}
      onMouseUp={onSelectionEnd}
      onMouseLeave={onSelectionEnd}
    >
      <Typography
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          pointerEvents: 'none',
          textShadow: '0 0 4px rgba(0,0,0,0.5)',
          userSelect: 'none',
        }}
      >
        Ziehen Sie ein Rechteck, um den Export-Bereich auszuwählen
      </Typography>

      {selectionRect && (
        <div
          style={{
            position: 'absolute',
            left: `${selectionRect.startX}px`,
            top: `${selectionRect.startY}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
            border: '2px solid #2196f3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            pointerEvents: 'none',
            zIndex: 1001,
          }}
        />
      )}
    </div>
  );
};
