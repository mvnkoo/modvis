import { describe, it, expect } from 'vitest';
import { computeImportImpact } from '../importImpact';
import type { Node, Edge } from '@xyflow/react';

function makeNode(id: string, opts: Partial<{
  label: string;
  type: string;
  sourceModel: string;
  isFromImport: boolean;
  isExternal: boolean;
  externalSource: string;
  association: { name: string; sourceClass: string; targetClass: string };
}> = {}): Node {
  return {
    id,
    type: opts.type ?? 'classNode',
    position: { x: 0, y: 0 },
    data: {
      label: opts.label ?? id,
      sourceModel: opts.sourceModel,
      isFromImport: opts.isFromImport ?? false,
      isExternal: opts.isExternal ?? false,
      externalSource: opts.externalSource,
      association: opts.association,
    },
  };
}

function makeEdge(source: string, target: string, relationType: string): Edge {
  return {
    id: `${source}-${target}-${relationType}`,
    source,
    target,
    data: { relationType },
  };
}

describe('computeImportImpact', () => {
  it('counts EXTENDS from local class into imported class', () => {
    const nodes = [
      makeNode('T.Local', { label: 'Local' }),
      makeNode('Adm.Parent', { label: 'Parent', isFromImport: true, sourceModel: 'Base_LV95' }),
    ];
    const edges = [makeEdge('T.Local', 'Adm.Parent', 'EXTENDS')];
    const r = computeImportImpact(['Base_LV95'], nodes, edges);
    const imp = r.get('Base_LV95')!;
    expect(imp.extendsCount).toBe(1);
    expect(imp.usedImportedClasses).toBe(1);
    expect(imp.rows[0]).toMatchObject({
      localClassName: 'Local', importedClassName: 'Parent', via: 'EXTENDS',
    });
  });

  it('counts REFERENCES and CONTAINS separately', () => {
    const nodes = [
      makeNode('T.A', { label: 'A' }),
      makeNode('T.B', { label: 'B' }),
      makeNode('Imp.X', { label: 'X', isFromImport: true, sourceModel: 'Imp' }),
      makeNode('Imp.Y', { label: 'Y', isFromImport: true, sourceModel: 'Imp' }),
    ];
    const edges = [
      makeEdge('T.A', 'Imp.X', 'REFERENCES'),
      makeEdge('T.B', 'Imp.Y', 'CONTAINS'),
    ];
    const r = computeImportImpact(['Imp'], nodes, edges).get('Imp')!;
    expect(r.referencesCount).toBe(1);
    expect(r.containsCount).toBe(1);
    expect(r.usedImportedClasses).toBe(2);
  });

  it('ignores import-to-import edges (irrelevant for impact)', () => {
    const nodes = [
      makeNode('A.X', { isFromImport: true, sourceModel: 'A' }),
      makeNode('A.Y', { isFromImport: true, sourceModel: 'A' }),
    ];
    const edges = [makeEdge('A.X', 'A.Y', 'EXTENDS')];
    const r = computeImportImpact(['A'], nodes, edges).get('A')!;
    expect(r.extendsCount).toBe(0);
  });

  it('flags external placeholders as unresolved against the matching import', () => {
    const nodes = [
      makeNode('Foo.Bar', {
        label: 'Bar',
        isExternal: true,
        externalSource: 'Foo',
      }),
      makeNode('Foo.Topic.Baz', {
        label: 'Baz',
        isExternal: true,
        externalSource: 'Foo.Topic',
      }),
    ];
    const r = computeImportImpact(['Foo'], nodes, []).get('Foo')!;
    expect(r.unresolved).toHaveLength(2);
    expect(r.unresolved.map(u => u.className).sort()).toEqual(['Bar', 'Baz']);
  });

  it('captures ASSOCIATION node linking local to imported class', () => {
    const nodes = [
      makeNode('T.Local', { label: 'Local' }),
      makeNode('Adm.Org', { label: 'Org', isFromImport: true, sourceModel: 'Base_LV95' }),
      makeNode('T.LocalToOrgAssoc', {
        type: 'associationNode',
        label: 'LocalToOrgAssoc',
        association: { name: 'LocalToOrgAssoc', sourceClass: 'T.Local', targetClass: 'Adm.Org' },
      }),
    ];
    const r = computeImportImpact(['Base_LV95'], nodes, []).get('Base_LV95')!;
    expect(r.associationsCount).toBe(1);
    expect(r.rows[0].via).toBe('ASSOCIATION');
    expect(r.rows[0].associationName).toBe('LocalToOrgAssoc');
  });

  it('returns an empty entry for an import with no touchpoints', () => {
    const r = computeImportImpact(['Nope'], [], []).get('Nope')!;
    expect(r.extendsCount).toBe(0);
    expect(r.referencesCount).toBe(0);
    expect(r.usedImportedClasses).toBe(0);
    expect(r.unresolved).toEqual([]);
  });
});
