import { useState, useCallback } from 'react';

export interface UseDisplayTogglesReturn {
  showFullHierarchy: boolean;
  setShowFullHierarchy: (v: boolean) => void;
  showEnums: boolean;
  setShowEnums: (v: boolean) => void;
  showAssociations: boolean;
  setShowAssociations: (v: boolean) => void;
  maxSubTypesPerRow: number;
  setMaxSubTypesPerRow: (v: number) => void;
  resetVisibility: () => void;
}

const DEFAULT_MAX_SUBTYPES_PER_ROW = 4;

export function useDisplayToggles(): UseDisplayTogglesReturn {
  const [showFullHierarchy, setShowFullHierarchy] = useState(true);
  const [showEnums, setShowEnums] = useState(true);
  const [showAssociations, setShowAssociations] = useState(true);
  const [maxSubTypesPerRow, setMaxSubTypesPerRow] = useState<number>(DEFAULT_MAX_SUBTYPES_PER_ROW);

  const resetVisibility = useCallback(() => {
    setShowEnums(true);
    setShowAssociations(true);
    setMaxSubTypesPerRow(DEFAULT_MAX_SUBTYPES_PER_ROW);
  }, []);

  return {
    showFullHierarchy,
    setShowFullHierarchy,
    showEnums,
    setShowEnums,
    showAssociations,
    setShowAssociations,
    maxSubTypesPerRow,
    setMaxSubTypesPerRow,
    resetVisibility,
  };
}
