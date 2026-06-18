import type { IliBaseNode, IliRelation } from '../types/IliBaseTypes';

export interface IliParseError {
  message: string;
  offset?: number;
  line?: number;
  column?: number;
  severity?: 'error' | 'warning';
  /** Quelldatei beim Multi-File-Parse (z.B. "Base.ili") */
  sourceFile?: string;
  /** INTERLIS-Modellname der Quelldatei */
  sourceModel?: string;
  /** True, wenn die Warnung aus einer auto-geladenen Import-Datei stammt */
  fromImport?: boolean;
}

export interface IliImportRef {
  name: string;
  unqualified?: boolean;
}

export interface IliParseResult {
  nodes: IliBaseNode[];
  relations: IliRelation[];
  errors?: IliParseError[];
  warnings?: IliParseError[];
  imports?: IliImportRef[];
  interlisVersion?: string;
}
