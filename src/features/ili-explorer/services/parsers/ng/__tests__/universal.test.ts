import { describe, it, expect } from 'vitest';
import { NgIliParser } from '../NgIliParser';

const wrap = (body: string) =>
  `INTERLIS 2.4;
MODEL M AT "x" VERSION "1" =
${body}
END M.`;

const wrapTopic = (body: string) =>
  `INTERLIS 2.4;
MODEL M AT "x" VERSION "1" =
  TOPIC T =
${body}
  END T;
END M.`;

describe('NG Phase 1 — universal coverage / crash-free skips', () => {
  it('FUNCTION at MODEL level parses without error', () => {
    const src = wrap('  FUNCTION foo(a: NUMERIC; b: TEXT): NUMERIC;');
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('FUNCTION at TOPIC level parses without error', () => {
    const src = wrapTopic('    FUNCTION bar(x: TEXT): BOOLEAN;');
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('VIEW with PROJECTION OF parses without error', () => {
    const src = wrapTopic(`
    VIEW V
      PROJECTION OF C;
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('VIEW with JOIN parses without error', () => {
    const src = wrapTopic(`
    VIEW V
      JOIN OF A, B;
      WHERE A.x = B.x;
      =
      END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('GRAPHIC with BASED ON and DrawingRule parses without error', () => {
    const src = wrapTopic(`
    GRAPHIC G BASED ON V =
      rule OF SignClass: (param := value);
    END G;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('REFSYSTEM MODEL prefix parses without error', () => {
    const src = `INTERLIS 2.4;
REFSYSTEM MODEL M AT "x" VERSION "1" =
END M.`;
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('TYPE MODEL prefix parses without error', () => {
    const src = `INTERLIS 2.4;
TYPE MODEL M AT "x" VERSION "1" =
END M.`;
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('SYMBOLOGY MODEL prefix parses without error', () => {
    const src = `INTERLIS 2.4;
SYMBOLOGY MODEL M AT "x" VERSION "1" =
END M.`;
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('CONTRACTED MODEL prefix parses without error', () => {
    const src = `INTERLIS 2.4;
CONTRACTED MODEL M AT "x" VERSION "1" =
END M.`;
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('PARAMETER block in TOPIC parses without error', () => {
    const src = wrapTopic(`
    PARAMETER
      maxScale : NUMERIC;
      label : TEXT*40;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('REFSYSTEM BASKET in TOPIC parses without error', () => {
    const src = wrapTopic(`
    REFSYSTEM BASKET CHLV95 ~ Coords.LV95;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('SIGN BASKET in TOPIC parses without error', () => {
    const src = wrapTopic(`
    SIGN BASKET DefaultSigns ~ Symbology.Sigs;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('Scientific notation in numeric range', () => {
    const src = wrap(`
  DOMAIN
    R = 1.0e-6 .. 1.5E+9;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });
});

describe('NG Phase 2 — datamodel feinheiten', () => {
  it('NUMERIC range with CIRCULAR + unit + REFSYS', () => {
    const src = wrap(`
  DOMAIN
    Angle = 0.0 .. 359.9 CIRCULAR [Units.Grad] REFSYS "EPSG:4326";`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('NUMERIC range CLOCKWISE / COUNTERCLOCKWISE', () => {
    const src = wrap(`
  DOMAIN
    Heading1 = -180.0 .. 180.0 CLOCKWISE;
    Heading2 = -180.0 .. 180.0 COUNTERCLOCKWISE;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('REFERENCE TO ANYCLASS RESTRICTION', () => {
    const src = wrapTopic(`
    CLASS C =
      r : REFERENCE TO ANYCLASS RESTRICTION (X; Y);
    END C;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('Multi-property attribute (ABSTRACT, EXTENDED, FINAL, TRANSIENT)', () => {
    const src = wrapTopic(`
    CLASS C =
      a (ABSTRACT) : TEXT;
      b (EXTENDED, TRANSIENT) : NUMERIC;
      c (FINAL) : BOOLEAN;
    END C;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('CONTINUOUS SUBDIVISION attribute prefix', () => {
    const src = wrapTopic(`
    CLASS C =
      CONTINUOUS SUBDIVISION geom : SURFACE;
      SUBDIVISION geom2 : AREA;
    END C;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('MANDATORY without nachgelagerten Type', () => {
    const src = wrapTopic(`
    CLASS C EXTENDS Base.A =
      x : MANDATORY;
    END C;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('Domain Properties (ABSTRACT, GENERIC, FINAL)', () => {
    const src = wrap(`
  DOMAIN
    AbsType (ABSTRACT) = NUMERIC;
    GenType (GENERIC) = NUMERIC;
    FinType (FINAL) EXTENDS AbsType = 0 .. 100;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('Domain inline CONSTRAINTS clause', () => {
    const src = wrap(`
  DOMAIN
    Pos = NUMERIC CONSTRAINTS positive : THIS > 0;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });

  it('Default-value list := a, b, c', () => {
    const src = wrapTopic(`
    CLASS C =
      x : NUMERIC := 1, 2, 3;
    END C;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
  });
});

describe('NG Phase 3 — FUNCTION semantisch', () => {
  it('FUNCTION at MODEL level produces a Function node with name and args', () => {
    const src = wrap('  FUNCTION foo(a: NUMERIC; b: TEXT): NUMERIC;');
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const fn = r.nodes.find(n => n.type === 'FUNCTION');
    expect(fn).toBeDefined();
    expect(fn?.name).toBe('foo');
    expect(fn?.data.functionArgs).toEqual(['a', 'b']);
  });

  it('FUNCTION with zero arguments', () => {
    const src = wrap('  FUNCTION pi(): NUMERIC;');
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const fn = r.nodes.find(n => n.type === 'FUNCTION');
    expect(fn?.name).toBe('pi');
    expect(fn?.data.functionArgs).toEqual([]);
  });

  it('FUNCTION at TOPIC level inherits topic context', () => {
    const src = wrapTopic('    FUNCTION bar(x: TEXT): BOOLEAN;');
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const fn = r.nodes.find(n => n.type === 'FUNCTION');
    expect(fn?.name).toBe('bar');
    expect(fn?.data.topic).toBe('T');
  });
});

describe('NG Phase 4 — VIEW semantisch', () => {
  it('VIEW with PROJECTION OF produces View node with formation', () => {
    const src = wrapTopic(`
    VIEW V
      PROJECTION OF C;
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const v = r.nodes.find(n => n.type === 'VIEW');
    expect(v?.name).toBe('V');
    expect(v?.data.formation?.kind).toBe('PROJECTION');
    expect(v?.data.formation?.sources).toEqual(['C']);
  });

  it('VIEW with JOIN OF multiple sources', () => {
    const src = wrapTopic(`
    VIEW V
      JOIN OF A, B, C;
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const v = r.nodes.find(n => n.type === 'VIEW');
    expect(v?.data.formation?.kind).toBe('JOIN');
    expect(v?.data.formation?.sources).toEqual(['A', 'B', 'C']);
  });

  it('VIEW with UNION OF', () => {
    const src = wrapTopic(`
    VIEW V
      UNION OF X, Y;
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const v = r.nodes.find(n => n.type === 'VIEW');
    expect(v?.data.formation?.kind).toBe('UNION');
  });

  it('VIEW with AGGREGATION OF ALL', () => {
    const src = wrapTopic(`
    VIEW V
      AGGREGATION OF C ALL;
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const v = r.nodes.find(n => n.type === 'VIEW');
    expect(v?.data.formation?.kind).toBe('AGGREGATION');
  });

  it('VIEW with AREA INSPECTION OF', () => {
    const src = wrapTopic(`
    VIEW V
      AREA INSPECTION OF C -> attr1 -> attr2;
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const v = r.nodes.find(n => n.type === 'VIEW');
    expect(v?.data.formation?.kind).toBe('AREA INSPECTION');
  });

  it('VIEW with EXTENDS another view', () => {
    const src = wrapTopic(`
    VIEW V EXTENDS Other.V
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const v = r.nodes.find(n => n.type === 'VIEW');
    expect(v?.data.extendsRef).toBe('Other.V');
  });

  it('VIEW renamed-source via base ~ syntax', () => {
    const src = wrapTopic(`
    VIEW V
      JOIN OF a ~ A, b ~ B;
      = END V;`);
    const r = new NgIliParser().parseContent(src);
    expect(r.errors).toEqual([]);
    const v = r.nodes.find(n => n.type === 'VIEW');
    expect(v?.data.formation?.sources).toEqual(['A', 'B']);
  });
});
