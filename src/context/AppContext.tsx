import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import { ValidationResult } from '../features/exp-explorer/types/expTypes';


type LogLevel = 'INFO' | 'WARNING' | 'ERROR';
type EnumStyle = 'ENUMERATION' | 'STRING_WHERE';


interface MergingRules {
 
  readonly createNewTypes: boolean;
  readonly transformTypes: boolean;
  readonly useDirectTypes: boolean;
  readonly addPrefixToTypes: boolean;
  
 
  readonly extendExistingEntities: boolean;
  readonly useApplicableClasses: boolean;
  
 
  readonly addSuffixToProperties: boolean;
  readonly createNewRelations: boolean;
  
 
  readonly addComments: boolean;
  readonly enumerationStyle: EnumStyle;
}

interface Configuration {
  readonly schemaVersion: string;
  readonly mergingRules: MergingRules;
}

interface PSetFile {
  readonly file: File;
  readonly data: unknown;
}

interface MergeLog {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly pset?: string;
}

interface AppState {
  readonly expressFile: File | null;
  readonly expressValidation: ValidationResult | null;
  readonly expressData: string | null;
  readonly psetFiles: readonly PSetFile[];
  readonly ifcSchema: string | null;
  readonly mergedData: string | null;
  readonly mergeLogs: readonly MergeLog[];
  readonly configuration: Configuration;
}


type AppAction = 
  | { readonly type: 'SET_EXPRESS_FILE'; readonly payload: File }
  | { readonly type: 'SET_EXPRESS_DATA'; readonly payload: string }
  | { readonly type: 'ADD_PSET_FILE'; readonly payload: PSetFile }
  | { readonly type: 'REMOVE_PSET_FILE'; readonly payload: number }
  | { readonly type: 'SET_IFC_SCHEMA'; readonly payload: string }
  | { readonly type: 'SET_MERGED_DATA'; readonly payload: string }
  | { readonly type: 'UPDATE_CONFIGURATION'; readonly payload: Partial<Configuration> }
  | { readonly type: 'CLEAR_PSET_FILES' }
  | { readonly type: 'ADD_MERGE_LOG'; readonly payload: MergeLog }
  | { readonly type: 'CLEAR_MERGE_LOGS' }
  | { readonly type: 'ADD_PSET_FILES_BATCH'; readonly payload: readonly PSetFile[] }
  | { readonly type: 'SET_EXPRESS_VALIDATION'; readonly payload: ValidationResult };


const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | undefined>(undefined);


const initialMergingRules = {
  createNewTypes: false,
  transformTypes: false,
  useDirectTypes: true,
  addPrefixToTypes: true,
  extendExistingEntities: true,
  useApplicableClasses: true,
  addSuffixToProperties: true,
  createNewRelations: false,
  addComments: true,
  enumerationStyle: 'ENUMERATION' as const
} satisfies MergingRules;

const initialState = {
  expressFile: null,
  expressValidation: null,
  expressData: null,
  psetFiles: [],
  ifcSchema: null,
  mergedData: null,
  mergeLogs: [],
  configuration: {
    schemaVersion: '4x3',
    mergingRules: initialMergingRules
  }
} as const satisfies AppState;


function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_EXPRESS_FILE':
    case 'SET_EXPRESS_DATA':
    case 'SET_IFC_SCHEMA':
    case 'SET_MERGED_DATA':
    case 'SET_EXPRESS_VALIDATION':
      return { ...state, [getPayloadKey(action.type)]: action.payload };

    case 'ADD_PSET_FILE':
      return { 
        ...state, 
        psetFiles: [...state.psetFiles, action.payload] 
      };

    case 'REMOVE_PSET_FILE': {
      const newPsetFiles = [...state.psetFiles];
      newPsetFiles.splice(action.payload, 1);
      return { ...state, psetFiles: newPsetFiles };
    }

    case 'UPDATE_CONFIGURATION':
      return {
        ...state,
        configuration: {
          ...state.configuration,
          ...action.payload,
          mergingRules: {
            ...state.configuration.mergingRules,
            ...(action.payload.mergingRules || {})
          }
        }
      };

    case 'CLEAR_PSET_FILES':
    case 'CLEAR_MERGE_LOGS':
      return { ...state, [getClearKey(action.type)]: [] };

    case 'ADD_MERGE_LOG':
      return {
        ...state,
        mergeLogs: [...state.mergeLogs, action.payload]
      };

    case 'ADD_PSET_FILES_BATCH':
      return {
        ...state,
        psetFiles: [...state.psetFiles, ...action.payload]
      };

    default:
      return state;
  }
}


function getPayloadKey(type: string): string {
  return type.toLowerCase().replace('set_', '');
}

function getClearKey(type: string): string {
  return type.toLowerCase().replace('clear_', '');
}


export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}


export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState muss innerhalb eines AppProvider verwendet werden');
  }
  return context;
}

export function useAppDispatch(): React.Dispatch<AppAction> {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch muss innerhalb eines AppProvider verwendet werden');
  }
  return context;
} 