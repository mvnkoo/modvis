import type { IliBaseNode, IliRelation } from '../types/IliBaseTypes';

export interface IliParseResult {
  nodes: IliBaseNode[];
  relations: IliRelation[];
}

export interface IliParser {
  parseContent(content: string): IliParseResult;
}
