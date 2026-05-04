import type { IliBaseNode, IliRelation } from '../types/IliBaseTypes';

export interface IliParseError {
  message: string;
  offset?: number;
  line?: number;
  column?: number;
}

export interface IliParseResult {
  nodes: IliBaseNode[];
  relations: IliRelation[];
  errors?: IliParseError[];
}

export interface IliParser {
  parseContent(content: string): IliParseResult;
}
