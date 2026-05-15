import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IliParser } from '../IliParser';
import { IliLexer } from '../tokens';
import { cstParserInstance } from '../cstParser';

// Synthetic conformance fixture, colocated under parser/__fixtures__/.
// MIT-licensed original work — safe to ship, exercises every supported
// INTERLIS-2.4 construct.
const SYNTHETIC_FIXTURE = resolve(
  __dirname, '../__fixtures__/Conformance_Synthetic_V1.ili',
);
const EXPECTED_MIN_CLASSES = 15;

describe('IliParser conformance — synthetic fixture', () => {
  it('lexer produces no errors', () => {
    const result = IliLexer.tokenize(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    expect(result.errors).toEqual([]);
  });

  it('parser produces no errors', () => {
    const lexResult = IliLexer.tokenize(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    cstParserInstance.input = lexResult.tokens;
    cstParserInstance.iliFile();
    expect(cstParserInstance.errors).toEqual([]);
  });

  it('produces a populated node graph', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const classNodes = nodes.filter(n => n.type === 'CLASS');
    expect(classNodes.length).toBeGreaterThanOrEqual(EXPECTED_MIN_CLASSES);
    for (const cls of classNodes) {
      expect(cls.id).toBeTruthy();
      expect(cls.name).toBeTruthy();
      expect(cls.data.label).toBe(cls.name);
    }
  });

  it('attributes are well-formed', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    for (const node of nodes) {
      if (node.type !== 'CLASS' && node.type !== 'STRUCTURE') continue;
      const attrs = (node as any).attributes ?? [];
      for (const attr of attrs) {
        expect(attr.name).toBeTruthy();
        expect(typeof attr.mandatory).toBe('boolean');
        expect(typeof attr.type).toBe('string');
      }
    }
  });

  it('comment extraction never crashes and shape is valid', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    for (const n of nodes) {
      if (n.data.comment !== undefined) {
        expect(typeof n.data.comment).toBe('string');
      }
    }
  });

  it('external-marker shape is valid when present', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const externals = nodes.filter(n => n.data.isExternal === true);
    for (const ext of externals) {
      expect(typeof ext.id).toBe('string');
      expect(ext.id.length).toBeGreaterThan(0);
      if (ext.id.includes('.')) {
        expect(ext.data.externalSource).toBeTruthy();
      }
    }
  });

  it('extracts most class comments (>50%)', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const classNodes = nodes.filter(n => n.type === 'CLASS' && !n.data.isExternal);
    const commented = classNodes.filter(n => n.data.comment);
    expect(commented.length).toBeGreaterThan(classNodes.length / 2);
  });

  it('produces external-class markers from IMPORTS', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const externals = nodes.filter(n => n.data.isExternal === true);
    expect(externals.length).toBeGreaterThan(0);
  });

  it('yields STRUCTURE, VIEW, FUNCTION and UNIT nodes', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    expect(nodes.filter(n => n.type === 'STRUCTURE').length).toBeGreaterThan(0);
    expect(nodes.filter(n => n.type === 'VIEW').length).toBeGreaterThan(0);
    expect(nodes.filter(n => n.type === 'FUNCTION').length).toBeGreaterThan(0);
    expect(nodes.filter(n => n.type === 'UNIT').length).toBeGreaterThan(0);
  });

  it('produces EXTENDS and REFERENCES relations', () => {
    const { relations } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    expect(relations.filter(r => r.type === 'EXTENDS').length).toBeGreaterThan(0);
    expect(relations.filter(r => r.type === 'REFERENCES').length).toBeGreaterThan(0);
  });
});
