import { describe, it, expect } from 'vitest';
import { IliParser } from '../IliParser';

const BASE_ILI = `
INTERLIS 2.3;
MODEL Base AT "http://example.org/base" VERSION "1.0" =
  TOPIC BaseTopic =
    CLASS BaseClass (ABSTRACT) =
      id : MANDATORY TEXT*16;
    END BaseClass;
  END BaseTopic;
END Base.
`;

const UNITS_ILI = `
INTERLIS 2.3;
MODEL Units AT "http://example.org/units" VERSION "1.0" =
  UNIT
    Meter [m] = (METRIC);
END Units.
`;

const PRIMARY_ILI = `
INTERLIS 2.3;
MODEL Demo AT "http://example.org/demo" VERSION "1.0" =
  IMPORTS UNQUALIFIED INTERLIS;
  IMPORTS Base;
  IMPORTS Units;
  TOPIC T =
    CLASS LocalClass EXTENDS BaseTopic.BaseClass =
      extra : TEXT*40;
    END LocalClass;
  END T;
END Demo.
`;

describe('IliParser.parseContents (multi-file merge)', () => {
  it('removes external placeholders when target is defined in another file', () => {
    const parser = new IliParser();
    const single = parser.parseContent(PRIMARY_ILI);
    const externalsSingle = single.nodes.filter(n => n.data?.isExternal === true);
    expect(externalsSingle.length).toBeGreaterThan(0);

    const multi = parser.parseContents([
      { name: 'Demo.ili', content: PRIMARY_ILI },
      { name: 'Base.ili', content: BASE_ILI },
      { name: 'Units.ili', content: UNITS_ILI },
    ]);

    const externals = multi.nodes.filter(n => n.data?.isExternal === true);
    expect(externals).toHaveLength(0);

    const baseClass = multi.nodes.find(n => n.id === 'BaseTopic.BaseClass');
    expect(baseClass).toBeDefined();
    expect(baseClass?.data?.isExternal).not.toBe(true);

    const localClass = multi.nodes.find(n => n.id === 'T.LocalClass');
    expect(localClass).toBeDefined();

    const inh = multi.relations.find(r =>
      r.type === 'EXTENDS' && r.sourceId === 'T.LocalClass'
    );
    expect(inh?.targetId).toBe('BaseTopic.BaseClass');
  });

  it('aggregates imports across files and dedupes', () => {
    const parser = new IliParser();
    const result = parser.parseContents([
      { name: 'Demo.ili', content: PRIMARY_ILI },
      { name: 'Base.ili', content: BASE_ILI },
    ]);
    const names = (result.imports ?? []).map(i => i.name).sort();
    expect(names).toContain('Base');
    expect(names).toContain('Units');
    expect(names).toContain('INTERLIS');
  });

  it('first definition wins on collision (qualified id)', () => {
    const parser = new IliParser();
    const a = `MODEL Demo = TOPIC T = CLASS Foo = id : MANDATORY TEXT*10; END Foo; END T; END Demo.`;
    const b = `MODEL Demo = TOPIC T = CLASS Foo = id : MANDATORY TEXT*99; END Foo; END T; END Demo.`;
    const result = parser.parseContents([
      { name: 'a.ili', content: a },
      { name: 'b.ili', content: b },
    ]);
    const foo = result.nodes.find(n => n.id === 'T.Foo');
    expect(foo).toBeDefined();
    expect((foo as any).attributes[0].type).toBe('TEXT*10');
  });

  it('parseContents with single file matches parseContent', () => {
    const parser = new IliParser();
    const single = parser.parseContent(PRIMARY_ILI);
    const wrapped = parser.parseContents([{ name: 'p.ili', content: PRIMARY_ILI }]);
    expect(wrapped.nodes.length).toBe(single.nodes.length);
  });

  it('empty list returns empty result', () => {
    const parser = new IliParser();
    const r = parser.parseContents([]);
    expect(r.nodes).toEqual([]);
    expect(r.relations).toEqual([]);
  });
});
