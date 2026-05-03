import { describe, it, expect } from 'vitest';
import { NgIliParser } from '../NgIliParser';
import type { IliClassNode } from '../../../types/IliModelTypes';

function parse(content: string) {
  return new NgIliParser().parseContent(content);
}

describe('NgIliParser (Chevrotain backend)', () => {
  it('returns empty result for empty input', () => {
    const r = parse('');
    expect(r.nodes).toEqual([]);
    expect(r.relations).toEqual([]);
  });

  it('parses an empty MODEL', () => {
    const r = parse('MODEL Demo = END Demo.');
    expect(r.nodes).toEqual([]);
    expect(r.relations).toEqual([]);
  });

  it('skips !! line comments and /* block */ comments', () => {
    const r = parse(`
      !! header comment
      /* block
         comment */
      MODEL Demo =
      END Demo.
    `);
    expect(r.nodes).toEqual([]);
  });

  it('accepts an INTERLIS version declaration', () => {
    const r = parse(`
      INTERLIS 2.4;
      MODEL Demo = END Demo.
    `);
    expect(r.nodes).toEqual([]);
  });

  it('accepts MODEL header with language tag and VERSION', () => {
    const r = parse(`
      MODEL Demo (de) VERSION "2024-01-01" =
      END Demo.
    `);
    expect(r.nodes).toEqual([]);
  });

  it('parses a single class with one TEXT*N attribute', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            name : TEXT*40;
          END Foo;
        END T;
      END Demo.
    `);

    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode | undefined;
    expect(foo).toBeDefined();
    expect(foo?.type).toBe('CLASS');
    expect(foo?.attributes).toHaveLength(1);
    expect(foo?.attributes?.[0].name).toBe('name');
    expect(foo?.attributes?.[0].type).toBe('TEXT*40');
    expect(foo?.attributes?.[0].mandatory).toBe(false);
    expect(foo?.topicId).toBe('T');
  });

  it('marks MANDATORY attributes', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            name : MANDATORY TEXT*40;
            note : TEXT*200;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    const byName = (n: string) => foo.attributes?.find(a => a.name === n);
    expect(byName('name')?.mandatory).toBe(true);
    expect(byName('note')?.mandatory).toBe(false);
  });

  it('captures (ABSTRACT) modifier and EXTENDS relation', () => {
    const r = parse(`
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
    `);

    const base = r.nodes.find(n => n.name === 'Base') as IliClassNode;
    const sub = r.nodes.find(n => n.name === 'Sub') as IliClassNode;
    expect(base.isAbstract).toBe(true);
    expect(sub.isAbstract).toBe(false);

    const inh = r.relations.find(rel => rel.type === 'EXTENDS');
    expect(inh?.sourceId).toBe('Sub');
    expect(inh?.targetId).toBe('Base');
  });

  it('keeps qualified superclass names like Topic.Class', () => {
    const r = parse(`
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
    `);
    const inh = r.relations.find(rel => rel.sourceId === 'Child');
    expect(inh).toBeDefined();
    expect(inh?.targetId).toContain('Parent');
  });

  it('parses basic attribute types (NUMERIC, BOOLEAN, DATE, DATETIME, MTEXT)', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            a : NUMERIC;
            b : BOOLEAN;
            c : DATE;
            d : DATETIME;
            e : MTEXT;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.map(a => a.type)).toEqual([
      'NUMERIC', 'BOOLEAN', 'DATE', 'DATETIME', 'MTEXT',
    ]);
  });

  it('parses NUMERIC with range', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            count : NUMERIC 0..100;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.[0].type).toBe('NUMERIC 0..100');
  });

  it('parses NUMERIC with negative range and unit', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            temp : NUMERIC -50..50 [Celsius];
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.[0].type).toBe('NUMERIC -50..50 [Celsius]');
  });

  it('parses NUMERIC with decimal range', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            ratio : NUMERIC 0.0..1.0;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.[0].type).toBe('NUMERIC 0.0..1.0');
  });

  it('parses a top-level ENUMERATION definition', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          ENUMERATION Color = (red, green, blue);
          CLASS Foo =
            id : MANDATORY TEXT*10;
          END Foo;
        END T;
      END Demo.
    `);
    const enumNode = r.nodes.find(n => n.name === 'Color');
    expect(enumNode?.type).toBe('enumNode');
    expect(enumNode?.data.enumValues?.map((v: { value: string }) => v.value))
      .toEqual(['red', 'green', 'blue']);
  });

  it('parses an inline ENUMERATION attribute', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            kind : (red, green, blue);
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    const kind = foo.attributes?.find(a => a.name === 'kind');
    expect(kind?.isEnum).toBe(true);
    expect(kind?.isInlineEnum).toBe(true);
    expect(kind?.enumValues?.map(v => v.value)).toEqual(['red', 'green', 'blue']);
  });

  it('parses a multi-line inline ENUMERATION attribute', () => {
    const r = parse(`
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
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    const kind = foo.attributes?.find(a => a.name === 'kind');
    expect(kind?.enumValues?.map(v => v.value)).toEqual(['red', 'green', 'blue']);
  });

  it('parses a nested ENUMERATION attribute', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            state : (
              in_betrieb (
                provisorisch,
                wird_aufgehoben
              ),
              ausser_betrieb
            );
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    const state = foo.attributes?.find(a => a.name === 'state');
    expect(state?.enumValues?.map(v => v.value)).toEqual(['in_betrieb', 'ausser_betrieb']);
    const inBetrieb = state?.enumValues?.find(v => v.value === 'in_betrieb');
    expect(inBetrieb?.subValues?.map(v => v.value)).toEqual(['provisorisch', 'wird_aufgehoben']);
  });

  it('does not treat words inside !! comments as enum values', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            kind : (
              red, !! something with parens (z.B. case)
              green, !! Projekt in Ausführung (im Bau)
              blue
            );
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    const kind = foo.attributes?.find(a => a.name === 'kind');
    expect(kind?.enumValues?.map(v => v.value)).toEqual(['red', 'green', 'blue']);
  });

  it('parses a DOMAIN section with simple enum domain', () => {
    const r = parse(`
      MODEL Demo =
        DOMAIN
          Status = (active, inactive);
        TOPIC T =
          CLASS Foo =
            id : MANDATORY TEXT*10;
          END Foo;
        END T;
      END Demo.
    `);
    const dom = r.nodes.find(n => n.id === 'domain_Status');
    expect(dom).toBeDefined();
    expect(dom?.type).toBe('domainEnumNode');
    expect(dom?.data.enumValues?.map((v: { value: string }) => v.value))
      .toEqual(['active', 'inactive']);
  });

  it('parses a DOMAIN with EXTENDS', () => {
    const r = parse(`
      MODEL Demo =
        DOMAIN
          BaseStatus EXTENDS External.Status = (
            in_betrieb,
            ausser_betrieb
          );
        TOPIC T =
          CLASS Foo =
            id : MANDATORY TEXT*10;
          END Foo;
        END T;
      END Demo.
    `);
    const dom = r.nodes.find(n => n.id === 'domain_BaseStatus');
    expect(dom?.data.extends).toBe('External.Status');
    expect(dom?.data.enumValues?.map((v: { value: string }) => v.value))
      .toEqual(['in_betrieb', 'ausser_betrieb']);
  });

  it('parses ALL OF domain that copies values from the base', () => {
    const r = parse(`
      MODEL Demo =
        DOMAIN
          BaseStatus = (active, inactive);
          Status = ALL OF BaseStatus;
        TOPIC T =
          CLASS Foo =
            id : MANDATORY TEXT*10;
          END Foo;
        END T;
      END Demo.
    `);
    const dom = r.nodes.find(n => n.id === 'domain_Status');
    expect(dom?.data.isAllOf).toBe(true);
    expect(dom?.data.baseEnum).toBe('BaseStatus');
    expect(dom?.data.enumValues?.map((v: { value: string }) => v.value))
      .toEqual(['active', 'inactive']);
  });

  it('decorates class attributes that reference a DOMAIN', () => {
    const r = parse(`
      MODEL Demo =
        DOMAIN
          Status = (active, inactive);
        TOPIC T =
          CLASS Foo =
            state : Status;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    const state = foo.attributes?.find(a => a.name === 'state');
    expect(state?.isDomainEnum).toBe(true);
    expect(state?.domainEnumName).toBe('Status');
    expect(state?.enumValues?.map(v => v.value)).toEqual(['active', 'inactive']);
  });

  it('parses ASSOCIATION between two classes', () => {
    const r = parse(`
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
    `);
    const owner = r.nodes.find(n => n.name === 'Owner') as IliClassNode;
    const asset = r.nodes.find(n => n.name === 'Asset') as IliClassNode;
    expect(owner.associations).toHaveLength(1);
    expect(asset.associations).toHaveLength(1);
    const assoc = owner.associations?.[0];
    expect(assoc?.name).toBe('Owns');
    expect(assoc?.sourceClass).toBe('Owner');
    expect(assoc?.targetClass).toBe('Asset');
    expect(assoc?.sourceCardinality).toBe('1');
    expect(assoc?.targetCardinality).toBe('0..*');
    expect(assoc?.sourceRole).toBe('owner');
    expect(assoc?.targetRole).toBe('asset');
  });

  it('parses ASSOCIATION with (EXTERNAL) marker', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Owner =
            name : MANDATORY TEXT*40;
          END Owner;
          CLASS Asset =
            label : MANDATORY TEXT*40;
          END Asset;
          ASSOCIATION Owns =
            ownerRef (EXTERNAL) -- {1} Owner;
            assetRef -- {0..*} Asset;
          END Owns;
        END T;
      END Demo.
    `);
    const owner = r.nodes.find(n => n.name === 'Owner') as IliClassNode;
    expect(owner.associations).toHaveLength(1);
  });

  it('parses a STRUCTURE definition', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          STRUCTURE Adresse =
            strasse : MANDATORY TEXT*60;
            plz : NUMERIC 1000..9999;
          END Adresse;
        END T;
      END Demo.
    `);
    const struct = r.nodes.find(n => n.name === 'Adresse');
    expect(struct?.type).toBe('STRUCTURE');
    expect((struct as any).attributes).toHaveLength(2);
  });

  it('parses BAG OF as attribute type', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          STRUCTURE Adresse =
            strasse : MANDATORY TEXT*60;
          END Adresse;
          CLASS Person =
            adressen : BAG OF Adresse;
          END Person;
        END T;
      END Demo.
    `);
    const person = r.nodes.find(n => n.name === 'Person') as IliClassNode;
    const attr = person.attributes?.[0];
    expect(attr?.type).toBe('BAG OF Adresse');
    expect(attr?.isReference).toBe(true);
  });

  it('parses LIST OF with cardinality', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          STRUCTURE Tag =
            label : MANDATORY TEXT*40;
          END Tag;
          CLASS Article =
            tags : LIST {1..5} OF Tag;
          END Article;
        END T;
      END Demo.
    `);
    const article = r.nodes.find(n => n.name === 'Article') as IliClassNode;
    const attr = article.attributes?.[0];
    expect(attr?.type).toBe('LIST {1..5} OF Tag');
  });

  it('parses COORD geometry as black-box type', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            position : COORD 0.000..200.000, 0.000..200.000, ROTATION 2 -> 1;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.[0].type).toBe('COORD');
  });

  it('parses POLYLINE geometry with WITH clause', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            shape : POLYLINE WITH (STRAIGHTS, ARCS);
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.[0].type).toBe('POLYLINE');
  });

  it('parses SURFACE with VERTEX and WITHOUT OVERLAPS clauses', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            boundary : SURFACE WITH (STRAIGHTS, ARCS) VERTEX CHCoord WITHOUT OVERLAPS > 0.001;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.[0].type).toBe('SURFACE');
  });

  it('parses MULTISURFACE / MULTICOORD / AREA / MULTIAREA / MULTIPOLYLINE', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            a : MULTICOORD 0..1, 0..1;
            b : MULTIPOLYLINE WITH (STRAIGHTS);
            c : MULTISURFACE WITH (STRAIGHTS);
            d : AREA WITH (STRAIGHTS);
            e : MULTIAREA WITH (STRAIGHTS);
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.map(a => a.type)).toEqual([
      'MULTICOORD', 'MULTIPOLYLINE', 'MULTISURFACE', 'AREA', 'MULTIAREA',
    ]);
  });

  it('treats type-name attribute as a qualified-name reference', () => {
    const r = parse(`
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            state : SomeDomainType;
          END Foo;
        END T;
      END Demo.
    `);
    const foo = r.nodes.find(n => n.name === 'Foo') as IliClassNode;
    expect(foo.attributes?.[0].type).toBe('SomeDomainType');
  });
});
