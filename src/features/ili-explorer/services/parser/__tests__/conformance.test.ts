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

  it('P1.2 — emits CONTAINS relations for structure-valued attributes', () => {
    const { nodes, relations } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const containsRels = relations.filter(r => r.type === 'CONTAINS');
    expect(containsRels.length).toBeGreaterThan(0);

    const single = containsRels.find(r =>
      r.sourceId === 'TopicBravo.ClsBravo8' && r.targetId === 'TopicAlpha.StructAlpha1',
    );
    expect(single).toBeDefined();

    const bag = containsRels.find(r =>
      r.sourceId === 'TopicBravo.ClsBravo1' && r.targetId === 'TopicAlpha.StructAlpha2',
    );
    expect(bag).toBeDefined();

    const bravo8 = nodes.find(n => n.id === 'TopicBravo.ClsBravo8') as any;
    const embedded = bravo8?.attributes?.find((a: any) => a.name === 'Embedded');
    expect(embedded?.isStructValue).toBe(true);
    expect(embedded?.structKind).toBe('single');
  });

  it('P1.3 — parses BAG OF ANYSTRUCTURE and BAG/LIST OF Struct RESTRICTION', () => {
    const content = readFileSync(SYNTHETIC_FIXTURE, 'utf8');
    const { nodes, errors } = new IliParser().parseContent(content);
    expect(errors).toEqual([]);
    const bravo9 = nodes.find(n => n.id === 'TopicBravo.ClsBravo9') as any;
    expect(bravo9).toBeDefined();
    const payload = bravo9.attributes.find((a: any) => a.name === 'Payload');
    expect(payload?.type).toContain('ANYSTRUCTURE');
    const restrict = bravo9.attributes.find((a: any) => a.name === 'Restrict');
    expect(restrict?.type).toContain('RESTRICTION');
  });

  it('P1.5 — persists composition and aggregation kinds on associations', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const assocs = nodes.filter(n => n.type === 'ASSOCIATION');
    const comp = assocs.find(n => n.name === 'AssocBravo03') as any;
    const agg = assocs.find(n => n.name === 'AssocBravo04') as any;
    expect(comp?.data?.association?.kind).toBe('composition');
    expect(agg?.data?.association?.kind).toBe('aggregation');
  });

  it('P1.6 — preserves OR alternatives in role target', () => {
    const { nodes } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const assoc = nodes.find(n => n.name === 'AssocBravo05') as any;
    const alts = assoc?.data?.association?.targetAlternatives;
    expect(alts).toBeDefined();
    expect(alts.length).toBeGreaterThanOrEqual(1);
    expect(alts.some((a: string) => a.endsWith('ClsBravo3'))).toBe(true);
  });

  it('Refhb 3.5.3 — emits warning when STRUCTURE EXTENDS a CLASS', () => {
    const ili = `INTERLIS 2.4;
      MODEL M = TOPIC T =
        CLASS C = a : TEXT*4; END C;
        STRUCTURE S EXTENDS C = b : TEXT*4; END S;
      END T;
      END M.`;
    const { warnings = [] } = new IliParser().parseContent(ili);
    expect(warnings.some(w => /Refhb 3\.5\.3/.test(w.message))).toBe(true);
  });

  it('Refhb 3.6 — RESTRICTION on REFERENCE TO yields REFERENCES per restricted class', () => {
    const { relations } = new IliParser().parseContent(readFileSync(SYNTHETIC_FIXTURE, 'utf8'));
    const fromBravo8 = relations.filter(r =>
      r.type === 'REFERENCES' && r.sourceId === 'TopicBravo.ClsBravo8' && r.role === 'e',
    );
    const targets = fromBravo8.map(r => r.targetId).sort();
    expect(targets).toEqual(['TopicBravo.ClsBravo1', 'TopicBravo.ClsBravo2']);
    expect(targets).not.toContain('TopicBravo.ANYCLASS');
  });

  it('Refhb 3.5.3 — STRUCTURE properties: ABSTRACT/FINAL/EXTENDED are distinct', () => {
    const ili = `INTERLIS 2.4;
      MODEL M = TOPIC T =
        STRUCTURE Sa (ABSTRACT) = x : TEXT*4; END Sa;
        STRUCTURE Sf (FINAL) = x : TEXT*4; END Sf;
      END T;
      END M.`;
    const { nodes } = new IliParser().parseContent(ili);
    const sa = nodes.find(n => n.name === 'Sa') as any;
    const sf = nodes.find(n => n.name === 'Sf') as any;
    expect(sa?.data?.isAbstract).toBe(true);
    expect(sa?.data?.isFinal).toBe(false);
    expect(sf?.data?.isAbstract).toBe(false);
    expect(sf?.data?.isFinal).toBe(true);
  });
});
