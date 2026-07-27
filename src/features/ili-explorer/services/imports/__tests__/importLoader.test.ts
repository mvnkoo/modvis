import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadWithDependencies } from '../importLoader';
import type { RepositoryIndex } from '../repositoryIndex';

const PRIMARY = `INTERLIS 2.3;
MODEL Demo =
  IMPORTS UNQUALIFIED INTERLIS;
  IMPORTS Base;
  IMPORTS Units;
END Demo.`;

const BASE_CONTENT = `INTERLIS 2.3;
MODEL Base AT "x" VERSION "1" =
END Base.`;

describe('loadWithDependencies (T1 auto-resolve)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves all imports against a stub repo', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/ilimodels.xml')) {
        return {
          ok: true,
          text: async () => `<?xml version="1.0"?>
            <root>
              <Model Name="Base" Version="1.0" File="Base.ili" SchemaLanguage="ili2_3"/>
            </root>`,
        };
      }
      if (url.endsWith('/Base.ili')) {
        return { ok: true, text: async () => BASE_CONTENT };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await loadWithDependencies(
      { name: 'Demo.ili', content: PRIMARY },
      {
        overrides: new Map(),
        forceRefresh: true,
        repos: [{ id: 'test', baseUrl: 'https://x.example', label: 'Test' }],
      },
    );

    expect(result.summary.autoCount).toBeGreaterThanOrEqual(1);
    expect(result.summary.stdlibCount).toBeGreaterThanOrEqual(2);
    expect(result.resolved.find(r => r.modelName === 'Base')?.status).toBe('auto');
    expect(result.resolved.find(r => r.modelName === 'INTERLIS')?.status).toBe('stdlib');
    expect(result.resolved.find(r => r.modelName === 'Units')?.status).toBe('stdlib');
    expect(result.missing).toEqual([]);
  });

  it('T2: reports missing models that are not in any repo', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', mockFetch);

    const result = await loadWithDependencies(
      { name: 'Foo.ili', content: 'MODEL Foo = IMPORTS Nichtexistent; END Foo.' },
      {
        overrides: new Map(),
        forceRefresh: true,
        repos: [{ id: 't', baseUrl: 'https://x.example', label: 'T' }],
      },
    );
    expect(result.summary.missingCount).toBe(1);
    expect(result.summary.missingNames).toEqual(['Nichtexistent']);
  });

  it('T4: override beats auto-resolution', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/ilimodels.xml')) {
        return {
          ok: true,
          text: async () => `<?xml version="1.0"?><Model Name="Base" File="Base.ili"/>`,
        };
      }
      return { ok: true, text: async () => BASE_CONTENT };
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await loadWithDependencies(
      { name: 'Demo.ili', content: 'MODEL Demo = IMPORTS Base; END Demo.' },
      {
        overrides: new Map([['Base', { fileName: 'user-Base.ili', content: 'MODEL Base = END Base.' }]]),
        forceRefresh: true,
        repos: [{ id: 't', baseUrl: 'https://x.example', label: 'T' }],
      },
    );
    expect(result.summary.manualCount).toBe(1);
    expect(result.summary.autoCount).toBe(0);
    const base = result.resolved.find(r => r.modelName === 'Base');
    expect(base?.status).toBe('manual');
    expect(base?.fileName).toBe('user-Base.ili');
  });

  it('recursively resolves transitive imports', async () => {
    const SIA = `INTERLIS 2.3;
MODEL SIA = IMPORTS Base; END SIA.`;
    const BASE = `INTERLIS 2.3;
MODEL Base = IMPORTS Units; END Base.`;
    const UNITS = `INTERLIS 2.3;
MODEL Units = END Units.`;

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/ilimodels.xml')) {
        return {
          ok: true,
          text: async () => `<?xml version="1.0"?>
            <root>
              <Model Name="SIA" File="SIA.ili"/>
              <Model Name="Base" File="Base.ili"/>
              <Model Name="Units" File="Units.ili"/>
            </root>`,
        };
      }
      if (url.endsWith('/SIA.ili')) return { ok: true, text: async () => SIA };
      if (url.endsWith('/Base.ili')) return { ok: true, text: async () => BASE };
      if (url.endsWith('/Units.ili')) return { ok: true, text: async () => UNITS };
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await loadWithDependencies(
      { name: 'Top.ili', content: 'MODEL Top = IMPORTS SIA; END Top.' },
      {
        overrides: new Map(),
        forceRefresh: true,
        repos: [{ id: 't', baseUrl: 'https://x.example', label: 'T' }],
      },
    );
    const names = result.summary.resolvedNames.sort();
    expect(names).toContain('SIA');
    expect(names).toContain('Base');
    // Units kommt durch Base.IMPORTS Units (depth 2)
    expect(names).toContain('Units');
  });
});
