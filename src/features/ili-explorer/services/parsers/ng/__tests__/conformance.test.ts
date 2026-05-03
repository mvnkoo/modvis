import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NgIliParser } from '../NgIliParser';
import { LegacyIliParser } from '../../LegacyIliParser';
import { IliLexer } from '../tokens';
import { cstParserInstance } from '../parser';

interface Fixture {
  name: string;
  path: string;
  expectedMinClasses: number;
}

const fixtures: Fixture[] = [
  {
    name: 'VSA_DSS_2020',
    path: resolve(__dirname, '../../../../../../../testfiles/VSA_DSS_2020_2_d_LV95-20230807.ili'),
    expectedMinClasses: 70,
  },
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
      const { nodes, relations } = new NgIliParser().parseContent(content);

      const classNodes = nodes.filter(n => n.type === 'CLASS');
      expect(classNodes.length).toBeGreaterThanOrEqual(fixture.expectedMinClasses);

      const inheritanceRelations = relations.filter(r => r.type === 'EXTENDS');
      expect(inheritanceRelations.length).toBeGreaterThan(0);

      for (const cls of classNodes) {
        expect(cls.id).toBeTruthy();
        expect(cls.name).toBeTruthy();
        expect(cls.data.label).toBe(cls.name);
      }
    });

    itOrSkip(`${fixture.name}: NG covers at least as many classes as Legacy`, () => {
      const content = readFileSync(fixture.path, 'utf8');
      const ng = new NgIliParser().parseContent(content);
      const legacy = new LegacyIliParser().parseContent(content);

      const ngClassCount = ng.nodes.filter(n => n.type === 'CLASS').length;
      const legacyClassCount = legacy.nodes.filter(n => n.type === 'CLASS').length;

      expect(ngClassCount).toBeGreaterThanOrEqual(legacyClassCount);
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
  }
});
