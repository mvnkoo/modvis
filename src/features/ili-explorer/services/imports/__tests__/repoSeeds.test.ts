import { describe, it, expect } from 'vitest';
import { jsdelivrUrl, DEFAULT_REPO_SEEDS } from '../repoSeeds';

describe('jsdelivrUrl', () => {
  it('builds canonical CDN URL with default master branch', () => {
    expect(jsdelivrUrl({ repo: 'claeis/models' }, 'ilimodels.xml'))
      .toBe('https://cdn.jsdelivr.net/gh/claeis/models@master/ilimodels.xml');
  });

  it('honors custom branch', () => {
    expect(jsdelivrUrl({ repo: 'foo/bar', branch: 'main' }, 'Units.ili'))
      .toBe('https://cdn.jsdelivr.net/gh/foo/bar@main/Units.ili');
  });

  it('strips leading slash on relative path', () => {
    expect(jsdelivrUrl({ repo: 'foo/bar' }, '/sub/Units.ili'))
      .toBe('https://cdn.jsdelivr.net/gh/foo/bar@master/sub/Units.ili');
  });

  it('respects optional subPath', () => {
    expect(jsdelivrUrl({ repo: 'foo/bar', subPath: 'std' }, 'Units.ili'))
      .toBe('https://cdn.jsdelivr.net/gh/foo/bar@master/std/Units.ili');
  });
});

describe('DEFAULT_REPO_SEEDS', () => {
  it('contains the verified geo-admin seed', () => {
    const geoAdmin = DEFAULT_REPO_SEEDS.find(r => r.id === 'geo-admin');
    expect(geoAdmin).toBeDefined();
    expect(geoAdmin?.baseUrl).toBe('https://models.geo.admin.ch');
  });
});
