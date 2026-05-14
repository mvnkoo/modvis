import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';

// Theme Types
interface ScrollbarColors {
  track: string;
  thumb: string;
  thumbHover: string;
}

export interface ThemeColors {
  entity: string;
  abstractEntity: string;
  selectedEntity: string;
  typeNode: string;
  inheritance: string;
  typeReference: string;
  nodeSection: string;
  nodeContent: string;
  background: string;
  paper: string;
  console: string;
  codeViewer: string;
  minimap: string;
  success: string;
  appBar: string;
  primary: string;
  secondary: string;
  active: string;
  text: string;
  propertyText: string;
  primaryText: string;
  secondaryText: string;
  scrollbar: ScrollbarColors;
  shadow: string;
  relationship: string;
  reference: string;
  selectedNodeBg: string;
  nodeHeaderText: string;
}

export interface ThemeContextType {
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  colorScheme: string;
  setColorScheme: (scheme: string) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  colors: ThemeColors;
}

const DEFAULT_ACCENT_COLOR = '#613F82';
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const HIDDEN_SCHEMES = new Set(['purple']);

function normalizeColorScheme(scheme: string | null): string {
  if (!scheme || !colorSchemes[scheme] || HIDDEN_SCHEMES.has(scheme)) {
    return 'default';
  }
  return scheme;
}

const colorSchemes: Record<string, Record<string, any>> = {
  default: {
    // Schema Explorer Farben (default)
    entity: '#2196f3',          
    abstractEntity: '#1565c0',  
    selectedEntity: '#613F82',   
    typeNode: '#ff4081',        
    inheritance: '#2196f3',     
    typeReference: '#ff4081',   

    // Schema Explorer Node Farben
    relationship: '#4caf50',    // Grün für Beziehungen
    reference: '#ff4081',       // Pink wie typeNode
    
    // Explorer Node Farben (Hintergrund)
    nodeSection: (mode: string) => mode === 'dark' ? '#333333' : '#f5f5f5',
    nodeContent: (mode: string) => mode === 'dark' ? '#242424' : '#ffffff',
    
    // UI Farben
    background: (mode: string) => mode === 'dark' ? '#121212' : '#f8f7f4',
    paper: (mode: string) => mode === 'dark' ? '#242424' : '#ffffff',
    console: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    codeViewer: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    minimap: (mode: string) => mode === 'dark' ? '#151515' : '#f0f0f0',
    success: (mode: string) => mode === 'dark' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(237, 247, 237, 0.9)',
    
    // UI Element Farben
    appBar: (mode: string) => mode === 'dark' ? '#0d4f99' : '#1565c0',
    primary: (mode: string) => mode === 'dark' ? '#0c81de' : '#2196f3',
    secondary: (mode: string) => mode === 'dark' ? '#0c81de' : '#2196f3',
    active: (mode: string) => mode === 'dark' ? '#0c81de' : '#2196f3',
    
    // Text Farben
    text: (mode: string) => mode === 'dark' ? '#ffffff' : '#000000',
    primaryText: (mode: string) => mode === 'dark' ? '#90caf9' : '#1976d2',
    secondaryText: (mode: string) => mode === 'dark' ? '#9e9e9e' : '#757575',
    propertyText: (mode: string) => mode === 'dark' ? '#bac6ff' : '#000a3b',
    
    // Scrollbar Farben
    scrollbar: {
      track: (mode: string) => mode === 'dark' ? '#151515' : 'rgba(0,0,0,0.05)',
      thumb: (mode: string) => mode === 'dark' ? '#2a2a2a' : 'rgba(0,0,0,0.2)',
      thumbHover: (mode: string) => mode === 'dark' ? '#353535' : 'rgba(0,0,0,0.3)',
    },
    
    shadow: (mode: string) => mode === 'dark' 
      ? '0 3px 10px 0 rgba(0,0,0,0.4)'
      : '0 3px 10px 0 rgba(0,0,0,0.08)',
    
    selectedNodeBg: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    nodeHeaderText: '#FFFFFF',
  },
  highContrast: {
    // Schema Explorer Farben
    entity: '#2196f3',          
    abstractEntity: '#1565c0',  
    selectedEntity: '#613F82',   
    typeNode: '#ff4081',        
    inheritance: '#2196f3',     
    typeReference: '#ff4081', 
    
    // Schema Explorer Farben
    // entity: '#000000',          
    // abstractEntity: '#333333',  
    // selectedEntity: '#666666',   
    // typeNode: '#000000',        
    // inheritance: '#000000',     
    // typeReference: '#333333',   

    // Schema Explorer Node Farben
    relationship: '#4caf50',    // Grün für Beziehungen
    reference: '#ff4081',       // Pink wie typeNode

    // Explorer Node Farben
    nodeSection: (mode: string) => mode === 'dark' ? '#333333' : '#f5f5f5',
    nodeContent: (mode: string) => mode === 'dark' ? '#242424' : '#ffffff',
    
    // UI Farben
    background: (mode: string) => mode === 'dark' ? '#121212' : '#ffffff',
    paper: (mode: string) => mode === 'dark' ? '#242424' : '#ffffff',
    console: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    codeViewer: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    minimap: (mode: string) => mode === 'dark' ? '#151515' : '#f0f0f0',
    success: (mode: string) => mode === 'dark' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(237, 247, 237, 0.9)',
    
    // UI Element Farben
    appBar: (mode: string) => mode === 'dark' ? '#000000' : '#333333',
    primary: (mode: string) => mode === 'dark' ? '#000000' : '#4f4f4f',
    secondary: (mode: string) => mode === 'dark' ? '#000000' : '#333333',
    active: (mode: string) => mode === 'dark' ? '#75b8ff' : '#001680',
    
    // Text Farben
    text: (mode: string) => mode === 'dark' ? '#ffffff' : '#000000',
    primaryText: (mode: string) => mode === 'dark' ? '#ffffff' : '#000000',
    secondaryText: (mode: string) => mode === 'dark' ? '#9e9e9e' : '#757575',
    propertyText: (mode: string) => mode === 'dark' ? '#75b8ff' : '#001680',
        
    // Scrollbar Farben
    scrollbar: {
      track: (mode: string) => mode === 'dark' ? '#151515' : 'rgba(0,0,0,0.05)',
      thumb: (mode: string) => mode === 'dark' ? '#2a2a2a' : 'rgba(0,0,0,0.2)',
      thumbHover: (mode: string) => mode === 'dark' ? '#353535' : 'rgba(0,0,0,0.3)',
    },
    
    shadow: (mode: string) => mode === 'dark' 
      ? '0 3px 10px 0 rgba(0,0,0,0.4)'
      : '0 3px 10px 0 rgba(0,0,0,0.08)',
    
    selectedNodeBg: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    nodeHeaderText: '#FFFFFF',
  },
  purple: {
    // Schema Explorer Farben
    entity: '#2196f3',          
    abstractEntity: '#1565c0',  
    selectedEntity: '#613F82',   
    typeNode: '#ff4081',        
    inheritance: '#2196f3',     
    typeReference: '#ff4081',     
    
    // Schema Explorer Farben
    // entity: '#9d18e9',          
    // abstractEntity: '#7b13b8',  
    // selectedEntity: '#c44dff',   
    // typeNode: '#9d18e9',        
    // inheritance: '#9d18e9',     
    // typeReference: '#c44dff',   

    // Schema Explorer Node Farben
    relationship: '#4caf50',    // Grün für Beziehungen
    reference: '#ff4081',       // Pink wie typeNode

    // Explorer Node Farben
    nodeSection: (mode: string) => mode === 'dark' ? '#333333' : '#f5f5f5',
    nodeContent: (mode: string) => mode === 'dark' ? '#242424' : '#ffffff',
    
    // UI Farben
    background: (mode: string) => mode === 'dark'
      ? 'linear-gradient(135deg, #15235A 0%, #260C38 50%, #380C24 100%)'  // Dunkler Verlauf: Violett -> Indigo -> Dunkelblau
      : 'linear-gradient(135deg, #8CC3E4 0%, #CAA2EF 60%, #F189C2 100%)',  // Heller Verlauf: Helles Violett -> Indigo -> Hellblau
    paper: (mode: string) => mode === 'dark' ? '#242424' : '#ffffff',
    console: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    codeViewer: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    minimap: (mode: string) => mode === 'dark' ? '#151515' : '#f0f0f0',
    success: (mode: string) => mode === 'dark' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(237, 247, 237, 0.9)',
    
    // UI Element Farben
    appBar: (mode: string) => mode === 'dark' ? '#7b13b8' : '#9d18e9',
    primary: (mode: string) => mode === 'dark' ? '#9d18e9' : '#7b13b8',
    secondary: (mode: string) => mode === 'dark' ? '#9d18e9' : '#7b13b8',
    active: (mode: string) => mode === 'dark' ? '#9d18e9' : '#7b13b8',
    
    // Text Farben
    text: (mode: string) => mode === 'dark' ? '#ffffff' : '#000000',
    primaryText: (mode: string) => mode === 'dark' ? '#c44dff' : '#9d18e9',
    secondaryText: (mode: string) => mode === 'dark' ? '#9e9e9e' : '#757575',
    propertyText: (mode: string) => mode === 'dark' ? '#d64fff' : '#28003b',
    
    // Scrollbar Farben
    scrollbar: {
      track: (mode: string) => mode === 'dark' ? '#151515' : 'rgba(0,0,0,0.05)',
      thumb: (mode: string) => mode === 'dark' ? '#2a2a2a' : 'rgba(0,0,0,0.2)',
      thumbHover: (mode: string) => mode === 'dark' ? '#353535' : 'rgba(0,0,0,0.3)',
    },
    
    shadow: (mode: string) => mode === 'dark' 
      ? '0 3px 10px 0 rgba(0,0,0,0.4)'
      : '0 3px 10px 0 rgba(0,0,0,0.08)',
    
    selectedNodeBg: (mode: string) => mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    nodeHeaderText: '#FFFFFF',
  }
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }
    
    if (typeof window !== 'undefined') {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (darkModeMediaQuery.matches) {
        return 'dark';
      }
    }
    
    return 'light';
  });

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const savedMode = localStorage.getItem('themeMode');
      if (!savedMode) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem('colorScheme');
    const normalized = normalizeColorScheme(saved);
    if (normalized !== saved) {
      localStorage.setItem('colorScheme', normalized);
    }
    return normalized;
  });

  const [accentColor, setAccentColor] = useState<string>(() => {
    const saved = localStorage.getItem('accentColor');
    return saved && HEX_COLOR_RE.test(saved) ? saved : DEFAULT_ACCENT_COLOR;
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const processColorValue = useCallback((value: any): string => {
    if (typeof value === 'function') {
      return value(mode);
    }
    return value;
  }, [mode]);

  const colors = useMemo(() => {
    const schemeKey = colorSchemes[colorScheme] ? colorScheme : 'default';
    const scheme = colorSchemes[schemeKey];
    const resolved = Object.keys(scheme).reduce<Partial<ThemeColors>>((acc, key) => {
      const value = scheme[key];
      if (typeof value === 'object' && value !== null) {
        acc[key as keyof ThemeColors] = Object.keys(value).reduce((subAcc: any, subKey) => {
          subAcc[subKey] = processColorValue(value[subKey]);
          return subAcc;
        }, {}) as any;
      } else {
        acc[key as keyof ThemeColors] = processColorValue(value) as any;
      }
      return acc;
    }, {}) as ThemeColors;
    resolved.selectedEntity = accentColor;
    return resolved;
  }, [colorScheme, processColorValue, accentColor]);

  const value = {
    mode,
    setMode,
    colorScheme,
    setColorScheme,
    accentColor,
    setAccentColor,
    colors
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 