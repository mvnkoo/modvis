import { IliParserService } from '../IliParserService';
import type { IliParser, IliParseResult } from './IliParser';

export class LegacyIliParser implements IliParser {
  parseContent(content: string): IliParseResult {
    return new IliParserService().parseContent(content);
  }
}
