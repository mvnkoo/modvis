import { describe, it, expect } from 'vitest';
import { IliLexer } from '../tokens';

function lex(input: string) {
  const result = IliLexer.tokenize(input);
  return {
    tokens: result.tokens.map(t => ({ type: t.tokenType.name, image: t.image })),
    errors: result.errors,
  };
}

describe('IliLexer', () => {
  it('returns no tokens and no errors for empty input', () => {
    const r = lex('');
    expect(r.tokens).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it('skips whitespace and !! line comments', () => {
    const r = lex('!! hello world\n   !! more\n');
    expect(r.tokens).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it('skips /* block comments */', () => {
    const r = lex('MODEL /* multi\nline */ Demo');
    expect(r.tokens.map(t => t.type)).toEqual(['Model', 'Identifier']);
    expect(r.errors).toEqual([]);
  });

  it('recognizes keywords vs identifiers (longer_alt)', () => {
    const r = lex('MODEL Modeling MODELS');
    expect(r.tokens.map(t => ({ type: t.type, image: t.image }))).toEqual([
      { type: 'Model', image: 'MODEL' },
      { type: 'Identifier', image: 'Modeling' },
      { type: 'Identifier', image: 'MODELS' },
    ]);
    expect(r.errors).toEqual([]);
  });

  it('lexes a minimal MODEL header', () => {
    const r = lex('MODEL Demo = END Demo.');
    expect(r.tokens.map(t => t.type)).toEqual([
      'Model', 'Identifier', 'Equals', 'End', 'Identifier', 'Dot',
    ]);
    expect(r.errors).toEqual([]);
  });

  it('handles umlauts in identifiers', () => {
    const r = lex('Grünfläche');
    expect(r.tokens).toEqual([{ type: 'Identifier', image: 'Grünfläche' }]);
    expect(r.errors).toEqual([]);
  });

  it('lexes string and number literals', () => {
    const r = lex('VERSION "2024-01-01" NUMERIC 0..100');
    expect(r.tokens.map(t => t.type)).toEqual([
      'Version', 'StringLiteral', 'Numeric', 'NumberLiteral', 'DotDot', 'NumberLiteral',
    ]);
  });

  it('disambiguates .. from . and -- from -', () => {
    const r = lex('a..b a.b -- -');
    expect(r.tokens.map(t => t.type)).toEqual([
      'Identifier', 'DotDot', 'Identifier',
      'Identifier', 'Dot', 'Identifier',
      'DashDash', 'Minus',
    ]);
  });

  it('lexes cardinality braces', () => {
    const r = lex('{0..*}');
    expect(r.tokens.map(t => t.type)).toEqual([
      'LBrace', 'NumberLiteral', 'DotDot', 'Star', 'RBrace',
    ]);
  });

  it('lexes a tiny CLASS definition', () => {
    const r = lex(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            name : MANDATORY TEXT*40;
          END Foo;
        END T;
      END Demo.
    `);
    expect(r.errors).toEqual([]);
    const types = r.tokens.map(t => t.type);
    expect(types).toContain('Model');
    expect(types).toContain('Topic');
    expect(types).toContain('Class');
    expect(types).toContain('Mandatory');
    expect(types).toContain('Text');
  });
});
