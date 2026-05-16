import { useCallback, useState } from 'react';
import type { ExpressNodeType } from '../services/types/ExpressBaseTypes';

export interface ExpressNavEntry {
  nodeId: string;
  label: string;
  nodeType: ExpressNodeType | 'OVERVIEW' | 'DOMAIN';
  isOverview?: boolean;
  isDomain?: boolean;
  isAbstract?: boolean;
}

export interface UseNavigationHistoryResult {
  history: ExpressNavEntry[];
  index: number;
  canGoBack: boolean;
  canGoForward: boolean;
  push: (entry: ExpressNavEntry) => void;
  back: () => ExpressNavEntry | null;
  forward: () => ExpressNavEntry | null;
  jumpTo: (targetIndex: number) => ExpressNavEntry | null;
  reset: (entry?: ExpressNavEntry) => void;
}

/**
 * Browser-style Back/Forward für die EXP-Navigation. Hält *Labels* mit,
 * damit das Long-Press-Menü die History rendern kann.
 */
export function useNavigationHistory(): UseNavigationHistoryResult {
  const [history, setHistory] = useState<ExpressNavEntry[]>([]);
  const [index, setIndex] = useState(-1);

  const push = useCallback((entry: ExpressNavEntry) => {
    setHistory((prev) => {
      if (prev[index]?.nodeId === entry.nodeId &&
          prev[index]?.isOverview === entry.isOverview) {
        return prev;
      }
      const head = prev.slice(0, index + 1);
      head.push(entry);
      return head;
    });
    setIndex((i) => i + 1);
  }, [index]);

  const back = useCallback(() => {
    if (index <= 0) return null;
    const next = index - 1;
    setIndex(next);
    return history[next] ?? null;
  }, [index, history]);

  const forward = useCallback(() => {
    if (index >= history.length - 1) return null;
    const next = index + 1;
    setIndex(next);
    return history[next] ?? null;
  }, [index, history]);

  const jumpTo = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= history.length) return null;
    setIndex(targetIndex);
    return history[targetIndex] ?? null;
  }, [history]);

  const reset = useCallback((entry?: ExpressNavEntry) => {
    if (entry) {
      setHistory([entry]);
      setIndex(0);
    } else {
      setHistory([]);
      setIndex(-1);
    }
  }, []);

  return {
    history,
    index,
    canGoBack: index > 0,
    canGoForward: index < history.length - 1,
    push,
    back,
    forward,
    jumpTo,
    reset,
  };
}
