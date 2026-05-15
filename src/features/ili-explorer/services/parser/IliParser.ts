import type { IToken } from 'chevrotain';
import { IliLexer } from './tokens';
import { cstParserInstance } from './cstParser';
import { astVisitor } from './astBuilder';
import type { IliParseResult, IliParseError } from './types';

const LEADING_NOISE = /^(?:\s+|!![^\n]*\n?|\/\*[\s\S]*?\*\/)*/;

export interface IliParserOptions {
  strict?: boolean;
}

export class IliParser {
  parseContent(content: string, options: IliParserOptions = {}): IliParseResult {
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const stripped = content.replace(LEADING_NOISE, '');
    if (/^TRANSFER\b/i.test(stripped)) {
      return {
        nodes: [],
        relations: [],
        errors: [{
          message: 'INTERLIS 1 (TRANSFER) wird nicht unterstützt. Bitte das Modell zu INTERLIS 2 konvertieren.',
          offset: 0,
          line: 1,
          column: 1,
          severity: 'error',
        }],
      };
    }

    const lexResult = IliLexer.tokenize(content);
    const errors: IliParseError[] = [];

    for (const lexErr of lexResult.errors) {
      errors.push({
        message: lexErr.message,
        offset: lexErr.offset,
        line: lexErr.line,
        column: lexErr.column,
        severity: 'error',
      });
    }

    const commentBefore = buildCommentLookup(lexResult.tokens, lexResult.groups?.comments ?? []);

    cstParserInstance.input = lexResult.tokens;
    const cst = cstParserInstance.iliFile();

    for (const parseErr of cstParserInstance.errors) {
      const tok = (parseErr as any).token as IToken | undefined;
      errors.push({
        message: parseErr.message,
        offset: tok?.startOffset,
        line: tok?.startLine,
        column: tok?.startColumn,
        severity: 'error',
      });
    }

    const ast = astVisitor.build(cst, commentBefore);
    if (options.strict) {
      for (const w of ast.warnings) errors.push({ ...w, severity: 'error' });
    }
    return {
      nodes: ast.nodes,
      relations: ast.relations,
      errors,
      warnings: ast.warnings,
      imports: ast.imports,
      interlisVersion: ast.interlisVersion,
    };
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
