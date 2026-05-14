import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NgIliParser } from '../NgIliParser';
import { IliLexer } from '../tokens';
import { cstParserInstance } from '../parser';

interface Fixture {
  name: string;
  path: string;
  expectedMinClasses: number;
}

const TESTMODELLE = resolve(__dirname, '../../../../../../../testfiles/Testmodelle');

const fixtures: Fixture[] = [
  { name: 'VSA_DSS_2020',         path: `${TESTMODELLE}/VSA_DSS_2020_2_d_LV95-20230807.ili`, expectedMinClasses: 70 },
  { name: 'IlisMeta16',            path: `${TESTMODELLE}/IlisMeta16.ili`,                     expectedMinClasses: 30 },
  { name: 'Axis_V1_1',             path: `${TESTMODELLE}/Axis_V1_1.ili`,                      expectedMinClasses: 20 },
  { name: 'Hpm_Network_V1',        path: `${TESTMODELLE}/Hpm_Network_V1.ili`,                 expectedMinClasses: 20 },
  { name: 'UASGeographicalZone_V2',path: `${TESTMODELLE}/UASGeographicalZone_V2.ili`,         expectedMinClasses: 10 },
  { name: 'Richtplaene_V1',        path: `${TESTMODELLE}/Richtplaene_V1.ili`,                 expectedMinClasses: 10 },
  { name: 'SurfacesDAssolement_V1',path: `${TESTMODELLE}/SurfacesDAssolement_V1.ili`,         expectedMinClasses: 5  },
  { name: 'MainRoads_V1_1',        path: `${TESTMODELLE}/MainRoads_V1_1.ili`,                 expectedMinClasses: 1  },
  { name: 'Alpenkonvention_V1_1',  path: `${TESTMODELLE}/Alpenkonvention_V1_1.ili`,           expectedMinClasses: 1  },
];

describe('NgIliParser conformance — real INTERLIS schemas', () => {
  for (const fixture of fixtures) {
    const exists = existsSync(fixture.path);
    const itOrSkip = exists ? it : it.skip;

    itOrSkip(`${fixture.name}: lexer produces no errors`, () => {
      const content = readFileSync(fixture.path, 'utf8');
      const result = IliLexer.tokenize(content);
      expect(result.errors).toEqual([]);
    });

    itOrSkip(`${fixture.name}: parser produces no errors`, () => {
      const content = readFileSync(fixture.path, 'utf8');
      const lexResult = IliLexer.tokenize(content);
      cstParserInstance.input = lexResult.tokens;
      cstParserInstance.iliFile();
      expect(cstParserInstance.errors).toEqual([]);
    });

    itOrSkip(`${fixture.name}: NG produces a populated node graph`, () => {
      const content = readFileSync(fixture.path, 'utf8');
      const { nodes } = new NgIliParser().parseContent(content);

      const classNodes = nodes.filter(n => n.type === 'CLASS');
      expect(classNodes.length).toBeGreaterThanOrEqual(fixture.expectedMinClasses);

      for (const cls of classNodes) {
        expect(cls.id).toBeTruthy();
        expect(cls.name).toBeTruthy();
        expect(cls.data.label).toBe(cls.name);
      }
    });

    itOrSkip(`${fixture.name}: NG attributes are well-formed`, () => {
      const content = readFileSync(fixture.path, 'utf8');
      const { nodes } = new NgIliParser().parseContent(content);

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

    itOrSkip(`${fixture.name}: NG comment extraction never crashes and shape is valid`, () => {
      const content = readFileSync(fixture.path, 'utf8');
      const { nodes } = new NgIliParser().parseContent(content);
      for (const n of nodes) {
        if (n.data.comment !== undefined) {
          expect(typeof n.data.comment).toBe('string');
        }
      }
    });

    itOrSkip(`${fixture.name}: NG external-marker shape is valid when present`, () => {
      const content = readFileSync(fixture.path, 'utf8');
      const { nodes } = new NgIliParser().parseContent(content);
      const externals = nodes.filter(n => n.data.isExternal === true);
      for (const ext of externals) {
        expect(typeof ext.id).toBe('string');
        expect(ext.id.length).toBeGreaterThan(0);
        if (ext.id.includes('.')) {
          expect(ext.data.externalSource).toBeTruthy();
        }
      }
    });
  }
});

describe('NgIliParser conformance — VSA detailed asserts', () => {
  const vsaPath = resolve(__dirname, '../../../../../../../testfiles/Testmodelle/VSA_DSS_2020_2_d_LV95-20230807.ili');
  const itOrSkip = existsSync(vsaPath) ? it : it.skip;

  itOrSkip('VSA: extracts most class comments (>50%)', () => {
    const { nodes } = new NgIliParser().parseContent(readFileSync(vsaPath, 'utf8'));
    const classNodes = nodes.filter(n => n.type === 'CLASS' && !n.data.isExternal);
    const commented = classNodes.filter(n => n.data.comment);
    expect(commented.length).toBeGreaterThan(classNodes.length / 2);
  });

  itOrSkip('VSA: produces external-class markers from IMPORTS', () => {
    const { nodes } = new NgIliParser().parseContent(readFileSync(vsaPath, 'utf8'));
    const externals = nodes.filter(n => n.data.isExternal === true);
    expect(externals.length).toBeGreaterThan(0);
  });
});
