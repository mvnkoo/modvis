const OVERRIDE_KEY = 'modvis.overrides.v1';

export interface OverrideEntry {
  fileName: string;
  content: string;
  uploadedAt: number;
}

type StoredOverrides = Record<string, { fileName: string; content: string; uploadedAt: number }>;

function readStore(): StoredOverrides {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredOverrides) : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoredOverrides): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(store));
  } catch {
    /* quota: ignore */
  }
}

export function loadOverrides(): Map<string, OverrideEntry> {
  const store = readStore();
  return new Map(Object.entries(store));
}

export function saveOverride(modelName: string, entry: OverrideEntry): void {
  const store = readStore();
  store[modelName] = entry;
  writeStore(store);
}

export function removeOverride(modelName: string): void {
  const store = readStore();
  delete store[modelName];
  writeStore(store);
}

export function clearAllOverrides(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}
