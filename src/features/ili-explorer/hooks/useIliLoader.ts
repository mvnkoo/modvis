import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { ThemeColors } from '../../../common/theme/ThemeContext';
import { readFileAsText } from '../../../common/utils/readFileAsText';
import { IliSchemaService } from '../services/iliSchemaService';
import { generateSearchOptions } from '../services/searchOptions';
import { flowNodeFromBaseNode, inheritanceEdgesFromRelations } from '../services/flowMapping';
import type { IliRelation, SearchOption } from '../services/types/IliBaseTypes';
import type { IliParseError, IliImportRef } from '../services/parser/types';

export interface LoadResult {
  flowNodes: Node[];
  flowEdges: Edge[];
  relations: IliRelation[];
  fileName: string;
}

interface UseIliLoaderOptions {
  colors: ThemeColors;
  useCurvedLines: boolean;
  onLoaded: (result: LoadResult) => void;
}

export interface UseIliLoaderReturn {
  isLoading: boolean;
  error: string | null;
  parseWarnings: IliParseError[];
  dismissParseWarnings: () => void;
  imports: IliImportRef[];
  interlisVersion: string | undefined;
  currentFileName: string | null;
  allNodes: Node[];
  allEdges: Edge[];
  relations: IliRelation[];
  searchOptions: SearchOption[];
  loadFromFile: (file: File) => Promise<void>;
  clear: () => void;
}

export function useIliLoader(options: UseIliLoaderOptions): UseIliLoaderReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<IliParseError[]>([]);
  const [imports, setImports] = useState<IliImportRef[]>([]);
  const [interlisVersion, setInterlisVersion] = useState<string | undefined>(undefined);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [relations, setRelations] = useState<IliRelation[]>([]);
  const [searchOptions, setSearchOptions] = useState<SearchOption[]>([]);

  const schemaServiceRef = useRef<IliSchemaService>(new IliSchemaService());
  const lastContentRef = useRef<{ content: string; fileName: string } | null>(null);

  const colorsRef = useRef(options.colors);
  const useCurvedLinesRef = useRef(options.useCurvedLines);
  const onLoadedRef = useRef(options.onLoaded);
  useEffect(() => {
    colorsRef.current = options.colors;
    useCurvedLinesRef.current = options.useCurvedLines;
    onLoadedRef.current = options.onLoaded;
  });

  const dismissParseWarnings = useCallback(() => setParseWarnings([]), []);

  const loadFromContent = useCallback(async (content: string, fileName: string) => {
    try {
      setError(null);
      setIsLoading(true);
      setCurrentFileName(fileName);

      lastContentRef.current = { content, fileName };
      schemaServiceRef.current.parseSchema(content);

      const baseNodes = schemaServiceRef.current.getNodes();
      const parsedRelations = schemaServiceRef.current.getRelations();
      const flowNodes = baseNodes.map(flowNodeFromBaseNode);
      const flowEdges = inheritanceEdgesFromRelations(
        parsedRelations,
        colorsRef.current,
        useCurvedLinesRef.current
      );

      setParseWarnings(schemaServiceRef.current.getParseErrors());
      setImports(schemaServiceRef.current.getImports());
      setInterlisVersion(schemaServiceRef.current.getInterlisVersion());
      setAllNodes(flowNodes);
      setAllEdges(flowEdges);
      setRelations(parsedRelations);
      setSearchOptions(generateSearchOptions(baseNodes));

      onLoadedRef.current({
        flowNodes,
        flowEdges,
        relations: parsedRelations,
        fileName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Schemas');
      setCurrentFileName(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFromFile = useCallback(async (file: File) => {
    const content = await readFileAsText(file);
    await loadFromContent(content, file.name);
  }, [loadFromContent]);

  const clear = useCallback(() => {
    setError(null);
    setParseWarnings([]);
    setImports([]);
    setInterlisVersion(undefined);
    setCurrentFileName(null);
    setAllNodes([]);
    setAllEdges([]);
    setRelations([]);
    setSearchOptions([]);
    lastContentRef.current = null;
  }, []);

  return {
    isLoading,
    error,
    parseWarnings,
    dismissParseWarnings,
    imports,
    interlisVersion,
    currentFileName,
    allNodes,
    allEdges,
    relations,
    searchOptions,
    loadFromFile,
    clear,
  };
}
