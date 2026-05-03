import { IliLexer } from './tokens';
import { cstParserInstance } from './parser';
import { astVisitor } from './astBuilder';
import type { IliParser, IliParseResult } from '../IliParser';

export class NgIliParser implements IliParser {
  parseContent(content: string): IliParseResult {
    const lexResult = IliLexer.tokenize(content);
    if (lexResult.errors.length) {
      console.warn(
        `[NgIliParser] ${lexResult.errors.length} lexing warnings (skipped):`,
        lexResult.errors.slice(0, 3).map(e => e.message),
      );
    }

    cstParserInstance.input = lexResult.tokens;
    const cst = cstParserInstance.iliFile();
    if (cstParserInstance.errors.length) {
      console.warn(
        `[NgIliParser] ${cstParserInstance.errors.length} parse errors (best-effort result):`,
        cstParserInstance.errors.slice(0, 3).map(e => e.message),
      );
    }

    return astVisitor.build(cst);
  }
}
