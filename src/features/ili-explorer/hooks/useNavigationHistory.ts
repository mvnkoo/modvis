import { useState, useCallback, useMemo } from 'react';

interface NavStack<T> {
  entries: T[];
  index: number;
}

interface UseNavigationHistoryOptions<T> {
  limit?: number;
  onNavigate: (entry: T) => boolean;
}

export interface UseNavigationHistoryReturn<T> {
  entries: T[];
  index: number;
  canGoBack: boolean;
  canGoForward: boolean;
  push: (entry: T) => void;
  reset: (seed?: T) => void;
  back: () => boolean;
  forward: () => boolean;
  jumpTo: (targetIndex: number) => boolean;
  patchCurrent: (patch: Partial<T>) => void;
}

const DEFAULT_LIMIT = 50;

export function useNavigationHistory<T>(
  options: UseNavigationHistoryOptions<T>
): UseNavigationHistoryReturn<T> {
  const { limit = DEFAULT_LIMIT, onNavigate } = options;
  const [nav, setNav] = useState<NavStack<T>>({ entries: [], index: -1 });

  const push = useCallback((entry: T) => {
    setNav(prev => {
      const truncated = prev.entries.slice(0, prev.index + 1);
      const appended = [...truncated, entry];
      if (appended.length > limit) {
        const dropped = appended.slice(appended.length - limit);
        return { entries: dropped, index: dropped.length - 1 };
      }
      return { entries: appended, index: appended.length - 1 };
    });
  }, [limit]);

  const reset = useCallback((seed?: T) => {
    setNav(seed ? { entries: [seed], index: 0 } : { entries: [], index: -1 });
  }, []);

  const canGoBack = useMemo(() => nav.index > 0, [nav.index]);
  const canGoForward = useMemo(
    () => nav.entries.length > 0 && nav.index < nav.entries.length - 1,
    [nav.index, nav.entries.length]
  );

  const back = useCallback((): boolean => {
    if (nav.index <= 0) return false;
    const target = nav.entries[nav.index - 1];
    if (!onNavigate(target)) return false;
    setNav(prev => ({ ...prev, index: prev.index - 1 }));
    return true;
  }, [nav, onNavigate]);

  const forward = useCallback((): boolean => {
    if (!(nav.entries.length > 0 && nav.index < nav.entries.length - 1)) return false;
    const target = nav.entries[nav.index + 1];
    if (!onNavigate(target)) return false;
    setNav(prev => ({ ...prev, index: prev.index + 1 }));
    return true;
  }, [nav, onNavigate]);

  const jumpTo = useCallback((targetIndex: number): boolean => {
    if (targetIndex < 0 || targetIndex >= nav.entries.length) return false;
    if (targetIndex === nav.index) return false;
    const target = nav.entries[targetIndex];
    if (!onNavigate(target)) return false;
    setNav(prev => ({ ...prev, index: targetIndex }));
    return true;
  }, [nav, onNavigate]);

  const patchCurrent = useCallback((patch: Partial<T>) => {
    setNav(prev => {
      if (prev.index < 0) return prev;
      const updated = prev.entries.map((entry, idx) =>
        idx === prev.index ? { ...entry, ...patch } : entry
      );
      return { entries: updated, index: prev.index };
    });
  }, []);

  return {
    entries: nav.entries,
    index: nav.index,
    canGoBack,
    canGoForward,
    push,
    reset,
    back,
    forward,
    jumpTo,
    patchCurrent,
  };
}
