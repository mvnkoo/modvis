import { describe, it, expect } from 'vitest';
import { parseIlimodelsXml, pickLatestVersion } from '../ilimodelsXml';

const ILI23_TYPICAL = `<?xml version="1.0" encoding="UTF-8"?>
<TRANSFER xmlns="http://www.interlis.ch/INTERLIS2.3">
  <HEADERSECTION SENDER="modvis-test" VERSION="2.3" />
  <DATASECTION>
    <IliRepository09.RepositoryIndex BID="b1">
      <IliRepository09.RepositoryIndex.ModelMetadata TID="1">
        <Name>Base</Name>
        <SchemaLanguage>ili2_3</SchemaLanguage>
        <File>Base.ili</File>
        <Version>2018-11-21</Version>
        <publishingDate>2018-11-21</publishingDate>
        <Issuer>http://www.interlis.ch/</Issuer>
        <md5>abcdef0123</md5>
      </IliRepository09.RepositoryIndex.ModelMetadata>
      <IliRepository09.RepositoryIndex.ModelMetadata TID="2">
        <Name>Units</Name>
        <SchemaLanguage>ili2_3</SchemaLanguage>
        <File>Units.ili</File>
        <Version>2012-05-21</Version>
      </IliRepository09.RepositoryIndex.ModelMetadata>
    </IliRepository09.RepositoryIndex>
  </DATASECTION>
</TRANSFER>`;

const ILI23_WITH_DEPS = `<?xml version="1.0" encoding="UTF-8"?>
<TRANSFER xmlns="http://www.interlis.ch/INTERLIS2.3">
  <DATASECTION>
    <IliRepository09.RepositoryIndex BID="b">
      <IliRepository09.RepositoryIndex.ModelMetadata TID="1">
        <Name>SIA405_Base</Name>
        <SchemaLanguage>ili2_3</SchemaLanguage>
        <File>SIA405_Base.ili</File>
        <Version>2014-06-18</Version>
        <dependsOnModel>
          <IliRepository09.RepositoryIndex.ModelMetadata.dependsOnModel>
            <value>Base</value>
          </IliRepository09.RepositoryIndex.ModelMetadata.dependsOnModel>
          <IliRepository09.RepositoryIndex.ModelMetadata.dependsOnModel>
            <value>Units</value>
          </IliRepository09.RepositoryIndex.ModelMetadata.dependsOnModel>
        </dependsOnModel>
      </IliRepository09.RepositoryIndex.ModelMetadata>
    </IliRepository09.RepositoryIndex>
  </DATASECTION>
</TRANSFER>`;

const FLAT_FORMAT = `<?xml version="1.0"?>
<repository xmlns="urn:test">
  <Model Name="Foo" Version="1.0" File="foo.ili" SchemaLanguage="ili2_4" />
  <Model Name="Bar" Version="2.0" File="bar.ili" SchemaLanguage="ili2_3" />
</repository>`;

describe('parseIlimodelsXml', () => {
  it('returns [] for empty input', () => {
    expect(parseIlimodelsXml('')).toEqual([]);
    expect(parseIlimodelsXml('<not-xml>')).toEqual([]);
  });

  it('returns [] for non-ilimodels XML', () => {
    expect(parseIlimodelsXml('<?xml version="1.0"?><root><foo/></root>')).toEqual([]);
  });

  it('parses standard ili2_3 transfer format with multiple models', () => {
    const entries = parseIlimodelsXml(ILI23_TYPICAL);
    expect(entries).toHaveLength(2);

    const base = entries.find(e => e.name === 'Base');
    expect(base?.file).toBe('Base.ili');
    expect(base?.version).toBe('2018-11-21');
    expect(base?.schemaLanguage).toBe('ili2_3');
    expect(base?.md5).toBe('abcdef0123');

    const units = entries.find(e => e.name === 'Units');
    expect(units?.file).toBe('Units.ili');
  });

  it('captures dependsOnModel references', () => {
    const entries = parseIlimodelsXml(ILI23_WITH_DEPS);
    expect(entries).toHaveLength(1);
    const sia = entries[0];
    expect(sia.name).toBe('SIA405_Base');
    expect(sia.dependsOnModel).toBeDefined();
    expect(sia.dependsOnModel?.length).toBeGreaterThan(0);
  });

  it('parses flat attribute-based Model elements as fallback', () => {
    const entries = parseIlimodelsXml(FLAT_FORMAT);
    const foo = entries.find(e => e.name === 'Foo');
    const bar = entries.find(e => e.name === 'Bar');
    expect(foo?.file).toBe('foo.ili');
    expect(foo?.schemaLanguage).toBe('ili2_4');
    expect(bar?.file).toBe('bar.ili');
  });

  it('dedupes entries by (name|version)', () => {
    const dup = ILI23_TYPICAL.replace('</DATASECTION>',
      `<IliRepository09.RepositoryIndex BID="b2">
        <IliRepository09.RepositoryIndex.ModelMetadata TID="1">
          <Name>Base</Name>
          <SchemaLanguage>ili2_3</SchemaLanguage>
          <File>Base.ili</File>
          <Version>2018-11-21</Version>
        </IliRepository09.RepositoryIndex.ModelMetadata>
      </IliRepository09.RepositoryIndex></DATASECTION>`);
    const entries = parseIlimodelsXml(dup);
    expect(entries.filter(e => e.name === 'Base')).toHaveLength(1);
  });
});

describe('pickLatestVersion', () => {
  it('returns undefined if not found', () => {
    const e = parseIlimodelsXml(ILI23_TYPICAL);
    expect(pickLatestVersion(e, 'Nope')).toBeUndefined();
  });

  it('returns most recent by publishingDate / version', () => {
    const entries = [
      { name: 'Foo', version: '2020-01-01', file: 'foo20.ili' },
      { name: 'Foo', version: '2022-05-01', file: 'foo22.ili' },
      { name: 'Foo', version: '2021-06-01', file: 'foo21.ili' },
    ];
    expect(pickLatestVersion(entries, 'Foo')?.file).toBe('foo22.ili');
  });
});
