import type { ThemeColors } from '../../../../common/theme/ThemeContext';
import type { LayoutOptions } from '../types/IliBaseTypes';

export const mockColors: ThemeColors = {
  entity: '#000',
  abstractEntity: '#000',
  selectedEntity: '#000',
  typeNode: '#000',
  inheritance: '#000',
  typeReference: '#000',
  nodeSection: '#000',
  nodeContent: '#000',
  background: '#000',
  paper: '#000',
  console: '#000',
  codeViewer: '#000',
  minimap: '#000',
  success: '#000',
  appBar: '#000',
  primary: '#000',
  secondary: '#000',
  active: '#000',
  text: '#000',
  propertyText: '#000',
  primaryText: '#000',
  secondaryText: '#000',
  scrollbar: { track: '#000', thumb: '#000', thumbHover: '#000' },
  shadow: '#000',
  relationship: '#000',
  reference: '#000',
  containment: '#000',
  selectedNodeBg: '#000',
  nodeHeaderText: '#000',
};

export const defaultLayoutOptions: LayoutOptions = {
  showFullHierarchy: true,
  useCurvedLines: true,
  showEnums: true,
  showAssociations: true,
  maxSubTypesPerRow: 4,
  useMagicLayout: false,
};
