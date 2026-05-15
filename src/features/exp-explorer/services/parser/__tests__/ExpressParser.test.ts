import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ExpressParser } from '../ExpressParser';

const FIXTURE = resolve(__dirname, '../__fixtures__/Minimal_IFC.exp');
const fixture = () => readFileSync(FIXTURE, 'utf8');

describe('ExpressParser — Minimal_IFC fixture', () => {
  it('produces no errors', () => {
    const result = new ExpressParser().parseContent(fixture());
    expect(result.errors).toEqual([]);
  });

  it('extracts SCHEMA name', () => {
    const result = new ExpressParser().parseContent(fixture());
    expect(result.schemaName).toBe('Minimal_IFC');
  });

  it('finds all ENTITY definitions', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const entities = nodes.filter((n) => n.data.nodeType === 'ENTITY');
    expect(entities.map((e) => e.id).sort()).toEqual([
      'IfcObject',
      'IfcObjectDefinition',
      'IfcOrganization',
      'IfcOwnerHistory',
      'IfcPerson',
      'IfcRelDefinesByObject',
      'IfcRelationship',
      'IfcRoot',
      'IfcWall',
      'IfcWallType',
    ]);
  });

  it('marks abstract entities', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const root = nodes.find((n) => n.id === 'IfcRoot');
    expect(root?.data.isAbstract).toBe(true);
    const person = nodes.find((n) => n.id === 'IfcPerson');
    expect(person?.data.isAbstract).toBe(false);
  });

  it('builds SUBTYPE_OF relations', () => {
    const { relations } = new ExpressParser().parseContent(fixture());
    const inh = relations.filter((r) => r.type === 'SUBTYPE_OF');
    const pairs = inh.map((r) => `${r.sourceId}→${r.targetId}`).sort();
    expect(new Set(pairs)).toEqual(new Set([
      'IfcObject→IfcObjectDefinition',
      'IfcObjectDefinition→IfcRoot',
      'IfcRelDefinesByObject→IfcRelationship',
      'IfcRelationship→IfcRoot',
      'IfcWall→IfcObject',
      'IfcWallType→IfcObject',
    ]));
  });

  it('detects IFC Object/Type pairs', () => {
    const { nodes, relations } = new ExpressParser().parseContent(fixture());
    const wall = nodes.find((n) => n.id === 'IfcWall');
    const wallType = nodes.find((n) => n.id === 'IfcWallType');
    expect(wall?.data.pairedTypeId).toBe('IfcWallType');
    expect(wallType?.data.pairedObjectId).toBe('IfcWall');
    const pairRel = relations.find(
      (r) => r.type === 'OBJECT_TYPE_PAIR' && r.sourceId === 'IfcWall' && r.targetId === 'IfcWallType',
    );
    expect(pairRel).toBeDefined();
  });

  it('back-links subTypes on parents', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const root = nodes.find((n) => n.id === 'IfcRoot');
    expect(root?.data.subTypes?.sort()).toEqual([
      'IfcObjectDefinition',
      'IfcRelationship',
    ]);
  });

  it('detects ENUMERATION type', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const en = nodes.find((n) => n.id === 'IfcRoleEnum');
    expect(en?.data.nodeType).toBe('ENUM');
    expect(en?.data.enumValues).toEqual([
      'SUPPLIER',
      'MANUFACTURER',
      'CONTRACTOR',
      'USERDEFINED',
      'NOTDEFINED',
    ]);
  });

  it('detects SELECT type and its members', () => {
    const { nodes, relations } = new ExpressParser().parseContent(fixture());
    const sel = nodes.find((n) => n.id === 'IfcActorSelect');
    expect(sel?.data.nodeType).toBe('SELECT');
    expect(sel?.data.selectMembers).toEqual([
      'IfcOrganization',
      'IfcPerson',
    ]);
    const memberRels = relations.filter(
      (r) => r.sourceId === 'IfcActorSelect' && r.type === 'SELECT_MEMBER',
    );
    expect(memberRels.map((r) => r.targetId).sort()).toEqual([
      'IfcOrganization',
      'IfcPerson',
    ]);
  });

  it('detects TYPE aliases', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const label = nodes.find((n) => n.id === 'IfcLabel');
    expect(label?.data.nodeType).toBe('TYPE');
    expect(label?.data.baseType).toBe('STRING');
  });

  it('parses optional attribute', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const root = nodes.find((n) => n.id === 'IfcRoot');
    const owner = root?.data.attributes?.find((a) => a.name === 'OwnerHistory');
    expect(owner?.isOptional).toBe(true);
    expect(owner?.baseType).toBe('IfcOwnerHistory');
  });

  it('parses LIST and SET aggregates with cardinality', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const person = nodes.find((n) => n.id === 'IfcPerson');
    const roles = person?.data.attributes?.find((a) => a.name === 'Roles');
    expect(roles?.aggregate).toBe('LIST');
    expect(roles?.cardinality).toBe('[1:?]');
    expect(roles?.baseType).toBe('IfcRoleEnum');

    const reldef = nodes.find((n) => n.id === 'IfcRelDefinesByObject');
    const relObj = reldef?.data.attributes?.find((a) => a.name === 'RelatedObjects');
    expect(relObj?.aggregate).toBe('SET');
    expect(relObj?.cardinality).toBe('[1:?]');
  });

  it('parses INVERSE attributes separately', () => {
    const { nodes } = new ExpressParser().parseContent(fixture());
    const obj = nodes.find((n) => n.id === 'IfcObject');
    const inv = obj?.data.attributes?.find((a) => a.name === 'IsDeclaredBy');
    expect(inv?.isInverse).toBe(true);
    expect(inv?.aggregate).toBe('SET');
  });

  it('builds attribute TYPE_REF relations to other entities', () => {
    const { relations } = new ExpressParser().parseContent(fixture());
    const rels = relations.filter(
      (r) => r.sourceId === 'IfcRoot' && r.attributeName === 'OwnerHistory',
    );
    expect(rels[0]?.type).toBe('TYPE_REF');
    expect(rels[0]?.targetId).toBe('IfcOwnerHistory');
  });

  it('builds ENUM_REF relations for enum-typed attributes', () => {
    const { relations } = new ExpressParser().parseContent(fixture());
    const rel = relations.find(
      (r) => r.sourceId === 'IfcPerson' && r.attributeName === 'Roles',
    );
    expect(rel?.type).toBe('ENUM_REF');
    expect(rel?.targetId).toBe('IfcRoleEnum');
  });

  it('strips block comments without breaking line offsets', () => {
    const src = `SCHEMA test;
      (* comment ENTITY Fake; nope *)
      ENTITY Real; a : INTEGER; END_ENTITY;
      END_SCHEMA;`;
    const { nodes } = new ExpressParser().parseContent(src);
    expect(nodes.map((n) => n.id)).toEqual(['Real']);
  });

  it('handles empty / null input gracefully', () => {
    const empty = new ExpressParser().parseContent('');
    expect(empty.nodes).toEqual([]);
    const nul = new ExpressParser().parseContent(null);
    expect(nul.nodes).toEqual([]);
  });

  it('emits a warning for non-EXPRESS input', () => {
    const result = new ExpressParser().parseContent('hello world');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
