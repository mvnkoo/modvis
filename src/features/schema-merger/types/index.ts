export interface PSetData {
  name: string;
  definition: string;
  ifcVersion: string;
  applicableClasses: string[];
  properties: Array<PropertyDefinition>;
  isQtoSet?: boolean;
}

interface BasePropertyDefinition {
  name: string;
  definition: string;
  dataType: string;
}

export interface PropertyDefinition extends BasePropertyDefinition {
  enumValues?: string[];
  isReference?: boolean;
  isQuantity?: false;
}

export interface QuantityDefinition extends BasePropertyDefinition {
  qtoType: QtoType;
  isQuantity: true;
}

export type QtoType = 
  | 'Q_LENGTH'
  | 'Q_AREA'
  | 'Q_VOLUME'
  | 'Q_COUNT'
  | 'Q_WEIGHT'
  | 'Q_TIME';

export const QtoTypeMapping: Record<QtoType, string> = {
  'Q_LENGTH': 'IfcLengthMeasure',
  'Q_AREA': 'IfcAreaMeasure',
  'Q_VOLUME': 'IfcVolumeMeasure',
  'Q_COUNT': 'IfcCountMeasure',
  'Q_WEIGHT': 'IfcMassMeasure',
  'Q_TIME': 'IfcTimeMeasure'
};

export interface ValidationResult {
  isValid: boolean;
  schemaVersion?: string;
  errors?: string[];
}

export interface MergingRules {
  createNewTypes: boolean;
  extendExistingEntities: boolean;
  useApplicableClasses: boolean;
  addPrefixToTypes: boolean;
  addSuffixToProperties: boolean;
  useDirectTypes: boolean;
  transformTypes: boolean;
  addComments: boolean;
  enumerationStyle: 'ENUMERATION' | 'STRING_WHERE';
  relationships: 'DIRECT_REFERENCE' | 'SEPARATE_RELATIONS' | 'NESTED' | 'SIMPLE';
}

export interface Configuration {
  schemaVersion: string;
  mergingRules: MergingRules;
}

export interface EnumTypeDefinition {
  typeDefinition: string;
  typeReference: string;
} 