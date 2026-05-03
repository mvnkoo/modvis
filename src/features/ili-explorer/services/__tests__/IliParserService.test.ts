import { describe, it, expect } from 'vitest';
import { IliParserService } from '../IliParserService';
import type { IliClassNode } from '../types/IliModelTypes';

function parse(content: string) {
  return new IliParserService().parseContent(content);
}

describe('IliParserService.parseContent', () => {
  it('parses a single class with one attribute', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            name : TEXT*40;
          END Foo;
        END T;
      END Demo.
    `;

    const { nodes } = parse(ili);
    const foo = nodes.find(n => n.name === 'Foo') as IliClassNode | undefined;

    expect(foo).toBeDefined();
    expect(foo?.type).toBe('CLASS');
    expect(foo?.attributes).toHaveLength(1);
    expect(foo?.attributes?.[0].name).toBe('name');
    expect(foo?.attributes?.[0].mandatory).toBe(false);
  });

  it('marks MANDATORY attributes', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            name : MANDATORY TEXT*40;
            note : TEXT*200;
          END Foo;
        END T;
      END Demo.
    `;

    const { nodes } = parse(ili);
    const foo = nodes.find(n => n.name === 'Foo') as IliClassNode | undefined;
    const byName = (n: string) => foo?.attributes?.find(a => a.name === n);

    expect(byName('name')?.mandatory).toBe(true);
    expect(byName('note')?.mandatory).toBe(false);
  });

  it('captures (ABSTRACT) modifier and EXTENDS relation', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Base (ABSTRACT) =
            id : MANDATORY TEXT*10;
          END Base;
          CLASS Sub EXTENDS Base =
            extra : TEXT*40;
          END Sub;
        END T;
      END Demo.
    `;

    const { nodes, relations } = parse(ili);
    const base = nodes.find(n => n.name === 'Base') as IliClassNode | undefined;
    const sub = nodes.find(n => n.name === 'Sub') as IliClassNode | undefined;

    expect(base?.isAbstract).toBe(true);
    expect(sub?.isAbstract).toBe(false);

    const inheritance = relations.find(r => r.type === 'EXTENDS');
    expect(inheritance?.sourceId).toBe('Sub');
    expect(inheritance?.targetId).toBe('Base');
  });

  it('matches qualified superclass names like Topic.Class (P0-3 regression)', () => {
    const ili = `
      MODEL Demo =
        TOPIC OtherTopic =
          CLASS Parent =
            id : MANDATORY TEXT*10;
          END Parent;
        END OtherTopic;
        TOPIC T =
          CLASS Child EXTENDS OtherTopic.Parent =
            extra : TEXT*40;
          END Child;
        END T;
      END Demo.
    `;

    const { relations } = parse(ili);
    const inh = relations.find(r => r.sourceId === 'Child');
    expect(inh).toBeDefined();
    expect(inh?.targetId).toContain('Parent');
  });

  it('parses an inline ENUMERATION attribute (multi-line values)', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            kind : (
              red,
              green,
              blue
            );
          END Foo;
        END T;
      END Demo.
    `;

    const { nodes } = parse(ili);
    const foo = nodes.find(n => n.name === 'Foo') as IliClassNode | undefined;
    const kind = foo?.attributes?.find(a => a.name === 'kind');

    expect(kind?.isEnum).toBe(true);
    expect(kind?.isInlineEnum).toBe(true);
    expect(kind?.enumValues?.map(v => v.value)).toEqual(['red', 'green', 'blue']);
  });

  it('parses an inline ENUMERATION attribute on a single line', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            kind : (red, green, blue);
          END Foo;
        END T;
      END Demo.
    `;

    const { nodes } = parse(ili);
    const foo = nodes.find(n => n.name === 'Foo') as IliClassNode | undefined;
    const kind = foo?.attributes?.find(a => a.name === 'kind');

    expect(kind?.isEnum).toBe(true);
    expect(kind?.enumValues?.map(v => v.value)).toEqual(['red', 'green', 'blue']);
  });

  it('parses ASSOCIATION between two classes', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Owner =
            name : MANDATORY TEXT*40;
          END Owner;
          CLASS Asset =
            label : MANDATORY TEXT*40;
          END Asset;
          ASSOCIATION Owns =
            ownerRef -- {1} Owner;
            assetRef -- {0..*} Asset;
          END Owns;
        END T;
      END Demo.
    `;

    const { nodes } = parse(ili);
    const owner = nodes.find(n => n.name === 'Owner') as IliClassNode | undefined;
    const asset = nodes.find(n => n.name === 'Asset') as IliClassNode | undefined;

    expect(owner?.associations).toHaveLength(1);
    expect(asset?.associations).toHaveLength(1);
    const assoc = owner?.associations?.[0];
    expect(assoc?.name).toBe('Owns');
    expect(assoc?.sourceClass).toBe('Owner');
    expect(assoc?.targetClass).toBe('Asset');
    expect(assoc?.targetCardinality).toBe('0..*');
  });

  it('returns empty result for empty input', () => {
    const { nodes, relations } = parse('');
    expect(nodes).toEqual([]);
    expect(relations).toEqual([]);
  });

  it('parses a top-level ENUMERATION definition (single-line values)', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          ENUMERATION Color = (red, green, blue);
          CLASS Foo =
            id : MANDATORY TEXT*10;
          END Foo;
        END T;
      END Demo.
    `;

    const { nodes } = parse(ili);
    const enumNode = nodes.find(n => n.name === 'Color');

    expect(enumNode?.type).toBe('enumNode');
    expect(enumNode?.data.enumValues?.map((v: { value: string }) => v.value))
      .toEqual(['red', 'green', 'blue']);
  });

  it('parses DOMAIN enumeration with EXTENDS and nested values', () => {
    const ili = `
      MODEL Demo =
        DOMAIN
          BaseEnum = (
            a,
            b,
            c
          );
          ExtEnum EXTENDS BaseEnum = (
            a (
              a1,
              a2
            ),
            b
          );
        TOPIC T =
          CLASS Foo =
            id : MANDATORY TEXT*10;
          END Foo;
        END T;
      END Demo.
    `;

    const { nodes } = parse(ili);
    const ext = nodes.find(n => n.id === 'domain_ExtEnum');

    expect(ext).toBeDefined();
    expect(ext?.type).toBe('domainEnumNode');
    expect(ext?.data.extends).toBe('BaseEnum');
  });
});
