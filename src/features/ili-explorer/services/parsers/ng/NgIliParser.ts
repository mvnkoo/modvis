import type { IToken } from 'chevrotain';
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

    const commentBefore = buildCommentLookup(lexResult.tokens, lexResult.groups?.comments ?? []);

    cstParserInstance.input = lexResult.tokens;
    const cst = cstParserInstance.iliFile();
    if (cstParserInstance.errors.length) {
      console.warn(
        `[NgIliParser] ${cstParserInstance.errors.length} parse errors (best-effort result):`,
        cstParserInstance.errors.slice(0, 3).map(e => e.message),
      );
    }

    return astVisitor.build(cst, commentBefore);
  }
}

function buildCommentLookup(parserTokens: IToken[], comments: IToken[]): Map<number, IToken[]> {
  const map = new Map<number, IToken[]>();
  if (comments.length === 0) return map;

  let cIdx = 0;
  let pending: IToken[] = [];
  for (const tok of parserTokens) {
    while (cIdx < comments.length && comments[cIdx].startOffset < tok.startOffset) {
      pending.push(comments[cIdx]);
      cIdx++;
    }
    if (pending.length > 0) {
      map.set(tok.startOffset, pending);
      pending = [];
    }
  }
  return map;
}
