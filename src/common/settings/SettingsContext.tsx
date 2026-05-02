import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  experimentalFeatures: boolean;
  setExperimentalFeatures: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'experimentalFeatures';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [experimentalFeatures, setExperimentalFeatures] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(experimentalFeatures));
  }, [experimentalFeatures]);

  return (
    <SettingsContext.Provider value={{ experimentalFeatures, setExperimentalFeatures }}>
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
