import { LAYOUT_CONFIG } from './config';

export function calculateSubtypePosition(
  index: number,
  totalSubTypes: number,
  maxSubTypesPerRow: number,
  useMagicLayout = false,
): { x: number; y: number } {
  if (maxSubTypesPerRow === 0 || maxSubTypesPerRow >= totalSubTypes) {
    const totalWidth = (totalSubTypes - 1) * LAYOUT_CONFIG.SPACING.HORIZONTAL;
    const startX = -(totalWidth / 2);
    return {
      x: startX + index * LAYOUT_CONFIG.SPACING.HORIZONTAL,
      y: LAYOUT_CONFIG.SPACING.VERTICAL * (useMagicLayout ? 2 : 1),
    };
  }

  const row = Math.floor(index / maxSubTypesPerRow);
  const col = index % maxSubTypesPerRow;

  const itemsInLastRow = totalSubTypes - row * maxSubTypesPerRow;
  const currentRowCount = row === Math.floor((totalSubTypes - 1) / maxSubTypesPerRow)
    ? Math.min(itemsInLastRow, maxSubTypesPerRow)
    : maxSubTypesPerRow;

  const rowWidth = (currentRowCount - 1) * LAYOUT_CONFIG.SPACING.HORIZONTAL;
  const startX = -(rowWidth / 2);

  const verticalSpacing = useMagicLayout
    ? LAYOUT_CONFIG.SPACING.VERTICAL * 2
    : LAYOUT_CONFIG.SPACING.VERTICAL;
  const rowSpacing = useMagicLayout
    ? LAYOUT_CONFIG.SPACING.ROW * 2
    : LAYOUT_CONFIG.SPACING.ROW;

  return {
    x: startX + col * LAYOUT_CONFIG.SPACING.HORIZONTAL,
    y: verticalSpacing + row * rowSpacing,
  };
}

export function calculateSuperTypePosition(
  index: number,
  level: number,
  totalInLevel: number,
): { x: number; y: number } {
  const totalWidth = (totalInLevel - 1) * LAYOUT_CONFIG.SPACING.HORIZONTAL;
  const startX = -(totalWidth / 2);
  return {
    x: startX + index * LAYOUT_CONFIG.SPACING.HORIZONTAL,
    y: LAYOUT_CONFIG.SPACING.SUPERTYPE * (level + 1),
  };
}
