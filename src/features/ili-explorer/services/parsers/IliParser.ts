import type { IliBaseNode, IliRelation } from '../types/IliBaseTypes';

export interface IliParseError {
  message: string;
  offset?: number;
  line?: number;
  column?: number;
}

export interface IliImportRef {
  name: string;
  unqualified?: boolean;
}

export interface IliParseResult {
  nodes: IliBaseNode[];
  relations: IliRelation[];
  errors?: IliParseError[];
  imports?: IliImportRef[];
  interlisVersion?: string;
}

export interface IliParser {
  parseContent(content: string): IliParseResult;
}
