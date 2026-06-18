import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveModel, extractImportsLight } from '../modelResolver';
import type { RepositoryIndex } from '../repositoryIndex';

describe('extractImportsLight', () => {
  it('extracts single import', () => {
    expect(extractImportsLight('IMPORTS Foo;')).toEqual(['Foo']);
  });

  it('extracts UNQUALIFIED form', () => {
    expect(extractImportsLight('IMPORTS UNQUALIFIED INTERLIS;')).toEqual(['INTERLIS']);
  });

  it('extracts multiple imports in one statement', () => {
    expect(extractImportsLight('IMPORTS Base, Units, Time;').sort()).toEqual(['Base', 'Time', 'Units']);
  });

  it('handles multiple IMPORTS statements', () => {
    const src = `MODEL X =
      IMPORTS UNQUALIFIED INTERLIS;
      IMPORTS Base;
      IMPORTS Units;
    END X.`;
    expect(extractImportsLight(src).sort()).toEqual(['Base', 'INTERLIS', 'Units']);
  });

  it('ignores commented-out IMPORTS', () => {
    const src = `!! IMPORTS NotReal;
      IMPORTS Real;`;
    expect(extractImportsLight(src)).toEqual(['Real']);
  });

  it('returns empty array for empty input', () => {
    expect(extractImportsLight('')).toEqual([]);
  });
});

describe('resolveModel', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns manual status for an overridden model', async () => {
    const r = await resolveModel('Foo', {
      overrides: new Map([['Foo', { fileName: 'Foo-local.ili', content: 'MODEL Foo = END Foo.' }]]),
      indexes: [],
    });
    expect(r.status).toBe('manual');
    expect(r.fileName).toBe('Foo-local.ili');
    expect(r.content).toContain('MODEL Foo');
  });

  it('returns stdlib for INTERLIS even without indexes', async () => {
    const r = await resolveModel('INTERLIS', { overrides: new Map(), indexes: [] });
    expect(r.status).toBe('stdlib');
  });

  it('returns missing when not found anywhere', async () => {
    const r = await resolveModel('NonExistent', { overrides: new Map(), indexes: [] });
    expect(r.status).toBe('missing');
  });

  it('returns auto when found in an index and fetch succeeds', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'INTERLIS 2.3;\nMODEL Base = END Base.\n',
    });
    vi.stubGlobal('fetch', mockFetch);

    const idx: RepositoryIndex = {
      repo: { id: 'r1', baseUrl: 'https://example.com', label: 'Test' },
      entries: [{ name: 'Base', file: 'Base.ili', version: '1.0' }],
      fetchedAt: Date.now(),
      status: 'ok',
    };
    const r = await resolveModel('Base', { overrides: new Map(), indexes: [idx] });
    expect(r.status).toBe('auto');
    expect(r.repoId).toBe('r1');
    expect(r.fileUrl).toBe('https://example.com/Base.ili');
    expect(mockFetch).toHaveBeenCalled();
  });

  it('falls through to next repo on fetch failure', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('CORS'))
      .mockResolvedValueOnce({ ok: true, text: async () => 'MODEL Found = END Found.' });
    vi.stubGlobal('fetch', mockFetch);

    const idx1: RepositoryIndex = {
      repo: { id: 'r1', baseUrl: 'https://r1.example', label: 'R1' },
      entries: [{ name: 'Found', file: 'F.ili' }],
      fetchedAt: Date.now(),
      status: 'ok',
    };
    const idx2: RepositoryIndex = {
      repo: { id: 'r2', baseUrl: 'https://r2.example', label: 'R2' },
      entries: [{ name: 'Found', file: 'F.ili' }],
      fetchedAt: Date.now(),
      status: 'ok',
    };
    const r = await resolveModel('Found', { overrides: new Map(), indexes: [idx1, idx2] });
    expect(r.status).toBe('auto');
    expect(r.repoId).toBe('r2');
  });

  it('prefers jsDelivr URL when repo has a github mirror', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'MODEL Base = END Base.',
    });
    vi.stubGlobal('fetch', mockFetch);

    const idx: RepositoryIndex = {
      repo: {
        id: 'interlis-ch',
        baseUrl: 'https://models.interlis.ch',
        label: 'INTERLIS.ch',
        github: { repo: 'claeis/models', branch: 'master' },
      },
      entries: [{ name: 'Base', file: 'Base.ili' }],
      fetchedAt: Date.now(),
      status: 'ok',
    };

    const r = await resolveModel('Base', { overrides: new Map(), indexes: [idx] });
    expect(r.status).toBe('auto');
    expect(r.fileUrl).toBe('https://cdn.jsdelivr.net/gh/claeis/models@master/Base.ili');
    expect(mockFetch).toHaveBeenCalledWith('https://cdn.jsdelivr.net/gh/claeis/models@master/Base.ili', expect.any(Object));
  });

  it('falls back to direct URL when jsDelivr returns 404', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, text: async () => 'MODEL Base = END Base.' });
    vi.stubGlobal('fetch', mockFetch);

    const idx: RepositoryIndex = {
      repo: {
        id: 'interlis-ch',
        baseUrl: 'https://models.interlis.ch',
        label: 'INTERLIS.ch',
        github: { repo: 'claeis/models', branch: 'master' },
      },
      entries: [{ name: 'Base', file: 'Base.ili' }],
      fetchedAt: Date.now(),
      status: 'ok',
    };

    const r = await resolveModel('Base', { overrides: new Map(), indexes: [idx] });
    expect(r.status).toBe('auto');
    expect(r.fileUrl).toBe('https://models.interlis.ch/Base.ili');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('skips indexes with non-ok status', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const idx: RepositoryIndex = {
      repo: { id: 'cors-r', baseUrl: 'https://x.example', label: 'X' },
      entries: [{ name: 'Foo', file: 'foo.ili' }],
      fetchedAt: Date.now(),
      status: 'cors-blocked',
      error: 'CORS',
    };
    const r = await resolveModel('Foo', { overrides: new Map(), indexes: [idx] });
    expect(r.status).toBe('missing');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
