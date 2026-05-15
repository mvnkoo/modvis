import { useCallback, useState } from 'react';
import { readFileAsText } from '../../../common/utils/readFileAsText';

export interface UseExpressLoaderResult {
  source: string | null;
  fileName: string | null;
  error: string | null;
  isLoading: boolean;
  loadFile: (file: File) => Promise<void>;
  clear: () => void;
}

export function useExpressLoader(): UseExpressLoaderResult {
  const [source, setSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFile = useCallback(async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.exp') && !lower.endsWith('.express')) {
      setError('Nur .exp / .express-Dateien werden unterstützt');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const content = await readFileAsText(file);
      setSource(content);
      setFileName(file.name);
    } catch (e) {
      setError((e as Error).message ?? 'Fehler beim Lesen der Datei');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSource(null);
    setFileName(null);
    setError(null);
  }, []);

  return { source, fileName, error, isLoading, loadFile, clear };
}
