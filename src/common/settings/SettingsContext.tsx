import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ParserBackend = 'legacy' | 'ng';

interface SettingsContextType {
  experimentalFeatures: boolean;
  setExperimentalFeatures: (enabled: boolean) => void;
  parserBackend: ParserBackend;
  setParserBackend: (backend: ParserBackend) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'experimentalFeatures';
const PARSER_KEY = 'parserBackend';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [experimentalFeatures, setExperimentalFeatures] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [parserBackend, setParserBackend] = useState<ParserBackend>(() => {
    const stored = localStorage.getItem(PARSER_KEY);
    return stored === 'legacy' ? 'legacy' : 'ng';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(experimentalFeatures));
  }, [experimentalFeatures]);

  useEffect(() => {
    localStorage.setItem(PARSER_KEY, parserBackend);
  }, [parserBackend]);

  return (
    <SettingsContext.Provider value={{
      experimentalFeatures, setExperimentalFeatures,
      parserBackend, setParserBackend,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
