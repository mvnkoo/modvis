import { describe, it, expect } from 'vitest';
import { IliParser } from '../../parser/IliParser';
import { getDirectRelations } from '../getDirectRelations';
import {
  flowNodeFromBaseNode,
  inheritanceEdgesFromRelations,
} from '../../flowMapping';
import type { IliNode } from '../../types/IliBaseTypes';
import { mockColors, defaultLayoutOptions } from '../../__tests__/testHelpers';

function buildLayoutInput(ili: string) {
  const wrapped = `INTERLIS 2.4;\n${ili}`;
  const { nodes: baseNodes, relations } = new IliParser().parseContent(wrapped);
  const flowNodes = baseNodes.map(flowNodeFromBaseNode) as IliNode[];
  const flowEdges = inheritanceEdgesFromRelations(relations, mockColors, true);
  return { flowNodes, flowEdges };
}

describe('getDirectRelations', () => {
  it('returns just the entity if it has no relations', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Foo =
            id : MANDATORY TEXT*10;
          END Foo;
        END T;
      END Demo.
    `;

    const { flowNodes, flowEdges } = buildLayoutInput(ili);
    const foo = flowNodes.find(n => n.id === 'T.Foo')!;

    const result = getDirectRelations(
      foo,
      flowNodes,
      flowEdges,
      mockColors,
      defaultLayoutOptions,
    );

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('T.Foo');
    expect(result.nodes[0].data.isActive).toBe(true);
    expect(result.edges).toHaveLength(0);
  });

  it('places supertype above (negative y) and subtypes below (positive y)', () => {
    const ili = `
      MODEL Demo =
        TOPIC T =
          CLASS Base (ABSTRACT) =
            id : MANDATORY TEXT*10;
          END Base;
          CLASS Mid EXTENDS Base =
            extra : TEXT*40;
          END Mid;
          CLASS LeafA EXTENDS Mid =
            a : TEXT*40;
          END LeafA;
          CLASS LeafB EXTENDS Mid =
            b : TEXT*40;
          END LeafB;
        END T;
      END Demo.
    `;

    const { flowNodes, flowEdges } = buildLayoutInput(ili);
    const mid = flowNodes.find(n => n.id === 'T.Mid')!;

    const result = getDirectRelations(
      mid,
      flowNodes,
      flowEdges,
      mockColors,
      defaultLayoutOptions,
    );

    const ids = result.nodes.map(n => n.id);
    expect(ids).toContain('T.Mid');
    expect(ids).toContain('T.Base');
    expect(ids).toContain('T.LeafA');
    expect(ids).toContain('T.LeafB');

    const yOf = (id: string) => result.nodes.find(n => n.id === id)!.position.y;
    expect(yOf('T.Base')).toBeLessThan(yOf('T.Mid'));
    expect(yOf('T.LeafA')).toBeGreaterThan(yOf('T.Mid'));
    expect(yOf('T.LeafB')).toBeGreaterThan(yOf('T.Mid'));
  });

  it('attaches association nodes when showAssociations is true', () => {
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

    const { flowNodes, flowEdges } = buildLayoutInput(ili);
    const owner = flowNodes.find(n => n.id === 'T.Owner')!;

    const result = getDirectRelations(
      owner,
      flowNodes,
      flowEdges,
      mockColors,
      defaultLayoutOptions,
    );

    const assocNode = result.nodes.find(n => n.type === 'associationNode');
    expect(assocNode).toBeDefined();
    expect(assocNode?.data.label).toBe('Owns');
  });

  it('omits association nodes when showAssociations is false', () => {
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

    const { flowNodes, flowEdges } = buildLayoutInput(ili);
    const owner = flowNodes.find(n => n.id === 'T.Owner')!;

    const result = getDirectRelations(
      owner,
      flowNodes,
      flowEdges,
      mockColors,
      { ...defaultLayoutOptions, showAssociations: false },
    );

    expect(result.nodes.find(n => n.type === 'associationNode')).toBeUndefined();
  });

  it('returns deterministic edge ids across two runs (P0-2 regression)', () => {
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

    const { flowNodes, flowEdges } = buildLayoutInput(ili);
    const sub = flowNodes.find(n => n.id === 'T.Sub')!;

    const a = getDirectRelations(sub, flowNodes, flowEdges, mockColors, defaultLayoutOptions);
    const b = getDirectRelations(sub, flowNodes, flowEdges, mockColors, defaultLayoutOptions);

    expect(a.edges.map(e => e.id).sort()).toEqual(b.edges.map(e => e.id).sort());
  });

  it('preserves canonical react-flow node types via flowMapping (regression)', () => {
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

    const { flowNodes } = buildLayoutInput(ili);
    const enumNode = flowNodes.find(n => n.id === 'Color');
    expect(enumNode?.type).toBe('enumNode');
  });

  it('flattens parser data into flowNode.data so enumValues survive (regression)', () => {
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

    const { flowNodes } = buildLayoutInput(ili);
    const enumNode = flowNodes.find(n => n.id === 'Color');
    expect(enumNode?.data.enumValues?.map((v: { value: string }) => v.value))
      .toEqual(['red', 'green', 'blue']);
  });

  it('emits an edge from a class to its domain-enum attribute (regression)', () => {
    const ili = `
      MODEL Demo =
        DOMAIN
          BaseStatus EXTENDS External.Base = (
            active,
            inactive
          );
          Status = ALL OF BaseStatus;
        TOPIC T =
          CLASS Foo =
            state : Status;
          END Foo;
        END T;
      END Demo.
    `;

    const { flowNodes, flowEdges } = buildLayoutInput(ili);
    const foo = flowNodes.find(n => n.id === 'T.Foo')!;

    const result = getDirectRelations(
      foo,
      flowNodes,
      flowEdges,
      mockColors,
      defaultLayoutOptions,
    );

    const domainEdge = result.edges.find(e => e.target === 'domain_Status');
    expect(domainEdge).toBeDefined();
    expect(domainEdge?.source).toBe('T.Foo');
  });

  it('returns empty result for falsy entity / nodes / edges', () => {
    const empty = getDirectRelations(
      null as unknown as IliNode,
      [],
      [],
      mockColors,
      defaultLayoutOptions,
    );
    expect(empty.nodes).toEqual([]);
    expect(empty.edges).toEqual([]);
  });
});
