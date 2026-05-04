import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Node, Edge, Connection, FitViewOptions } from '@xyflow/react';
import { useTheme } from '../../../common/theme/ThemeContext';
import { useSettings } from '../../../common/settings/SettingsContext';
import { readFileAsText } from '../../../common/utils/readFileAsText';
import { IliSchemaService } from '../services/iliSchemaService';
import { LegacyIliParser } from '../services/parsers/LegacyIliParser';
import { NgIliParser } from '../services/parsers/ng/NgIliParser';
import { IliLayoutService } from '../services/IliLayoutService';
import { isOverviewCandidate, layoutModelOverview } from '../services/layout/overviewStrategy';
import { generateSearchOptions } from '../services/searchOptions';
import {
  flowNodeFromBaseNode,
  inheritanceEdgesFromRelations,
} from '../services/flowMapping';
import {
  IliBaseNode,
  IliRelation,
  IliNode,
  SearchOption,
  NavigationState,
  LayoutOptions,
} from '../services/types/IliBaseTypes';
import { IliClassNode } from '../services/types/IliModelTypes';
import type { IliParseError, IliImportRef } from '../services/parsers/IliParser';

export type { SearchOption };


interface UseIliSchemaReturn {
  isLoading: boolean;
  error: string | null;
  parseWarnings: IliParseError[];
  dismissParseWarnings: () => void;
  imports: IliImportRef[];
  interlisVersion: string | undefined;
  searchValue: SearchOption | null;
  searchOptions: SearchOption[];
  currentFileName: string | null;
  handleSearchChange: (value: SearchOption | null) => void;
  handleFileUpload: (file: File) => Promise<void>;
  handleClearFile: () => void;
  handleConnect: (params: Connection) => void;
  handleNodeClick: (event: React.MouseEvent, node: Node, viewport: ViewportState) => void;
  handleBack: () => boolean;
  navigationHistory: NavigationState[];
  setFullHierarchyAndReset: (value: boolean) => void;
  showFullHierarchy: boolean;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
  setNavigationHistory: Dispatch<SetStateAction<NavigationState[]>>;
  setHistoryIndex: Dispatch<SetStateAction<number>>;
  allNodes: Node[];
  allEdges: Edge[];
  showEnums: boolean;
  handleToggleEnums: (visible: boolean) => void;
  historyIndex: number;
  maxSubTypesPerRow: number;
  setMaxSubTypesPerRow: (value: number) => void;
  handleLineTypeToggle: () => void;
  currentNodes: Node[];
  currentEdges: Edge[];
  showAssociations: boolean;
  handleToggleAssociations: (visible: boolean) => void;
  handleMagicLayout: () => void;
  applyLayout: (node: IliNode, override?: Partial<LayoutOptions>) => { nodes: IliNode[]; edges: Edge[] };
  computeLayout: (node: IliNode, override?: Partial<LayoutOptions>) => { nodes: IliNode[]; edges: Edge[] };
  fitViewRequest: number;
  requestFitView: () => void;
  canGoBack: boolean;
  showOverview: () => void;
}


interface NodeState {
  nodes: Node[];
  edges: Edge[];
  searchOptions: SearchOption[];
}


interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}


export const useIliSchema = (
  setNodes: Dispatch<SetStateAction<IliNode[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  useCurvedLines: boolean,
  setUseCurvedLines: Dispatch<SetStateAction<boolean>>,
  fitView: (options?: FitViewOptions) => void
): UseIliSchemaReturn => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<IliParseError[]>([]);
  const dismissParseWarnings = useCallback(() => setParseWarnings([]), []);
  const [imports, setImports] = useState<IliImportRef[]>([]);
  const [interlisVersion, setInterlisVersion] = useState<string | undefined>(undefined);
  const [overviewWasShown, setOverviewWasShown] = useState(false);
  const [searchValue, setSearchValue] = useState<SearchOption | null>(null);
  const [searchOptions, setSearchOptions] = useState<SearchOption[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showFullHierarchy, setShowFullHierarchy] = useState(true);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [showEnums, setShowEnums] = useState(true);
  const [showAssociations, setShowAssociations] = useState(true);
  const [maxSubTypesPerRow, setMaxSubTypesPerRow] = useState<number>(4);
  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);
  const [viewportHistory, setViewportHistory] = useState<ViewportState[]>([]);
  const [enumHistory, setEnumHistory] = useState<Map<string, boolean>>(new Map());
  const [associationHistory, setAssociationHistory] = useState<Map<string, boolean>>(new Map());
  const [useMagicLayout, setUseMagicLayout] = useState(false);
  const [nodeWidths, setNodeWidths] = useState<Map<string, number>>(new Map());
  const [fitViewRequest, setFitViewRequest] = useState(0);

  const requestFitView = useCallback(() => {
    setFitViewRequest(c => c + 1);
  }, []);

  const { parserBackend } = useSettings();
  const schemaServiceRef = useRef<IliSchemaService>(
    new IliSchemaService(parserBackend === 'ng' ? new NgIliParser() : new LegacyIliParser())
  );
  const lastContentRef = useRef<{ content: string; fileName: string } | null>(null);
  const isResizingRef = useRef(false);

  const computeLayout = useCallback(
    (node: IliNode, override?: Partial<LayoutOptions>) => {
      const opts: LayoutOptions = {
        showFullHierarchy,
        useCurvedLines,
        showEnums,
        showAssociations,
        maxSubTypesPerRow,
        useMagicLayout: false,
        ...override,
      };
      return IliLayoutService.getDirectRelations(node, allNodes, allEdges, colors, opts);
    },
    [
      allNodes,
      allEdges,
      colors,
      showFullHierarchy,
      useCurvedLines,
      showEnums,
      showAssociations,
      maxSubTypesPerRow,
    ]
  );

  const applyLayout = useCallback(
    (node: IliNode, override?: Partial<LayoutOptions>) => {
      const result = computeLayout(node, override);
      setNodes(result.nodes);
      setEdges(result.edges);
      return result;
    },
    [computeLayout, setNodes, setEdges]
  );

  const filterNodesAndEdges = useCallback((nodeId: string | null = null) => {
    const targetNode = nodeId
      ? (allNodes.find(n => n.id === nodeId) as IliNode | undefined)
      : ((allNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
          allNodes.find(n => n.type === 'classNode')) as IliNode | undefined);

    if (!targetNode) return;

    applyLayout(targetNode, nodeId ? undefined : { maxSubTypesPerRow: 4 });
    setActiveNodeId(targetNode.id);
  }, [allNodes, applyLayout]);

  const loadFromContent = useCallback(async (content: string, fileName: string) => {
    try {
      setNodes([]);
      setEdges([]);
      setAllNodes([]);
      setAllEdges([]);
      setSearchOptions([]);
      setSearchValue(null);
      setError(null);
      setNavigationHistory([]);
      setHistoryIndex(-1);
      setActiveNodeId(null);
      setMaxSubTypesPerRow(4);
      setIsLoading(true);
      setCurrentFileName(fileName);

      lastContentRef.current = { content, fileName };
      schemaServiceRef.current.parseSchema(content);
      setParseWarnings(schemaServiceRef.current.getParseErrors());
      setImports(schemaServiceRef.current.getImports());
      setInterlisVersion(schemaServiceRef.current.getInterlisVersion());

      const baseNodes = schemaServiceRef.current.getNodes();
      const relations = schemaServiceRef.current.getRelations();

      const flowNodes = baseNodes.map(flowNodeFromBaseNode);
      const flowEdges = inheritanceEdgesFromRelations(relations, colors, useCurvedLines);

     
      setAllNodes(flowNodes);
      setAllEdges(flowEdges);
      setSearchOptions(generateSearchOptions(baseNodes));

     
      const useOverviewLayout = isOverviewCandidate(flowNodes as IliNode[], relations);

      if (useOverviewLayout) {
        const overview = layoutModelOverview(flowNodes as IliNode[], relations);
        setNodes(overview.nodes);
        setEdges(overview.edges);
        setActiveNodeId(null);
        setNavigationHistory([]);
        setHistoryIndex(-1);
        setOverviewWasShown(true);
      } else {
        setOverviewWasShown(false);
        const initialClass = (
          flowNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
          flowNodes.find(n => n.type === 'classNode')
        ) as IliNode | undefined;

        if (initialClass) {
          const relatedNodes = IliLayoutService.getDirectRelations(
            initialClass,
            flowNodes as IliNode[],
            flowEdges,
            colors,
            {
              showFullHierarchy,
              useCurvedLines,
              showEnums,
              showAssociations,
              maxSubTypesPerRow: 4,
              useMagicLayout: false,
            }
          );

          setNodes(relatedNodes.nodes);
          setEdges(relatedNodes.edges);
          setActiveNodeId(initialClass.id);
          setNavigationHistory([{
            nodeId: initialClass.id,
            showEnums: true,
            showAssociations: showAssociations
          }]);
          setHistoryIndex(0);

          requestAnimationFrame(() => {
            setMaxSubTypesPerRow(4);
          });
        }
      }

      requestFitView();

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Laden des Schemas');
      setCurrentFileName(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    colors,
    showFullHierarchy,
    useCurvedLines,
    showEnums,
    showAssociations,
    setNodes,
    setEdges,
    requestFitView,
  ]);

  const handleFileUpload = useCallback(async (file: File) => {
    const content = await readFileAsText(file);
    await loadFromContent(content, file.name);
  }, [loadFromContent]);

  useEffect(() => {
    schemaServiceRef.current = new IliSchemaService(
      parserBackend === 'ng' ? new NgIliParser() : new LegacyIliParser()
    );
    const cached = lastContentRef.current;
    if (cached) {
      void loadFromContent(cached.content, cached.fileName);
    }
  }, [parserBackend, loadFromContent]);

  const handleSearchChange = useCallback((option: SearchOption | null) => {
    setSearchValue(option);
    if (option) {
     
      const nodeId = option.type === 'ATTRIBUTE' 
        ? option.id.split('.')[0] 
        : option.id;

      const processedNode = {
        ...option,
        id: nodeId, 
        type: option.type === 'ENUMERATION' ? 'enumNode' : 'CLASS', 
        position: { x: 0, y: 0 },
        data: {
          ...option,
          isHighlighted: false,
          isActive: false
        }
      };

      applyLayout(processedNode as IliNode);
      setActiveNodeId(nodeId);
      requestFitView();
      setSearchValue(null);
    } else {
     
      filterNodesAndEdges(null);
    }
  }, [filterNodesAndEdges, showAssociations, allNodes, allEdges, colors, showFullHierarchy, useCurvedLines, showEnums, maxSubTypesPerRow, fitView]);

  const handleConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: useCurvedLines ? 'default' : 'step',
        animated: false,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle || null,
        targetHandle: params.targetHandle || null
      } as Edge;

      setEdges((edges: Edge[]) => [...edges, newEdge]);
    }
  }, [setEdges, useCurvedLines]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node, viewport: ViewportState) => {
    if (node.id === activeNodeId) return;
    
   
    setNodeWidths(new Map());
    
    const iliNode: IliNode = {
      ...node,
      type: node.type || 'classNode',
      position: node.position,
      data: {
        ...node.data,
        isHighlighted: false,
        isActive: false,
        expanded: node.data?.expanded ?? false,
        width: 400
      }
    };

    const relatedNodes = computeLayout(iliNode);

    const nodesWithDefaultWidth = relatedNodes.nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        width: 400
      }
    }));

    setNodes(nodesWithDefaultWidth);
    setEdges(relatedNodes.edges);
    setActiveNodeId(node.id);

    const historyEntry: NavigationState = {
      nodeId: node.id,
      showEnums,
      showAssociations
    };
    
    const updatedHistory = [...navigationHistory.slice(0, historyIndex + 1), historyEntry];
    setNavigationHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);

    setViewportHistory(prev => [...prev, viewport]);

   
    if (!isResizingRef.current) {
      requestFitView();
    }
  }, [
    activeNodeId,
    allNodes,
    computeLayout,
    showEnums,
    showAssociations,
    navigationHistory,
    historyIndex,
    setNodes,
    setEdges,
    requestFitView,
  ]);

  const canGoBack = useMemo(() => {
    if (historyIndex > 0) return true;
    if (historyIndex === 0) return overviewWasShown;
    return false;
  }, [historyIndex, overviewWasShown]);

  // Single entry point that returns the user to the initial state for the
  // current model: renders the topic-grouped overview and resets all
  // session-only toggles (enum/association history, visibility flags, max
  // sub-types per row). Replaces the previous Reset action.
  const showOverview = useCallback(() => {
    if (allNodes.length === 0) return;
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
    setShowEnums(true);
    setShowAssociations(true);
    setMaxSubTypesPerRow(4);
    const relations = schemaServiceRef.current.getRelations();
    const overview = layoutModelOverview(allNodes as IliNode[], relations);
    setNodes(overview.nodes as IliNode[]);
    setEdges(overview.edges);
    setActiveNodeId(null);
    setNavigationHistory([]);
    setHistoryIndex(-1);
    setOverviewWasShown(true);
    requestFitView();
  }, [allNodes, setNodes, setEdges, requestFitView]);

  const handleBack = useCallback((): boolean => {
    if (historyIndex === 0) {
      if (overviewWasShown) {
        const relations = schemaServiceRef.current.getRelations();
        const overview = layoutModelOverview(allNodes as IliNode[], relations);
        setNodes(overview.nodes as IliNode[]);
        setEdges(overview.edges);
        setActiveNodeId(null);
        setNavigationHistory([]);
        setHistoryIndex(-1);
        requestFitView();
        return true;
      }
      return false;
    }
    if (historyIndex > 0) {
      const previousState = navigationHistory[historyIndex - 1];
      const previousNode = allNodes.find(node => node.id === previousState.nodeId);
      
      if (previousNode) {
       
        setShowAssociations(previousState.showAssociations);
        setShowEnums(previousState.showEnums);
        
        const iliNode: IliNode = {
          ...previousNode,
          type: previousNode.type || 'classNode',
          position: previousNode.position,
          data: {
            ...previousNode.data,
            isHighlighted: false,
            isActive: false,
            expanded: previousNode.data?.expanded ?? false
          }
        };

        applyLayout(iliNode, {
          showEnums: previousState.showEnums,
          showAssociations: previousState.showAssociations,
        });
        setActiveNodeId(previousState.nodeId);
        setHistoryIndex(historyIndex - 1);
        requestFitView();

        return true;
      }
    }
    return false;
  }, [historyIndex, navigationHistory, allNodes, applyLayout, requestFitView, overviewWasShown, setNodes, setEdges]);

  const handleClearFile = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setAllNodes([]);
    setAllEdges([]);
    setSearchOptions([]);
    setSearchValue(null);
    setCurrentFileName(null);
    setError(null);
    setParseWarnings([]);
    setImports([]);
    setInterlisVersion(undefined);
    setOverviewWasShown(false);
    setNavigationHistory([]);
    setHistoryIndex(-1);
    setActiveNodeId(null);
    setMaxSubTypesPerRow(4);
   
    setShowEnums(true);
    setShowAssociations(true);
   
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
  }, [setNodes, setEdges]);

  // Setting full-hierarchy from the layout-settings panel: flip the flag and
  // bring the user back to the initial view (overview if multi-root, else the
  // abstract base class) using the new value as override so the closure
  // staleness from setShowFullHierarchy doesn't matter.
  const setFullHierarchyAndReset = useCallback((value: boolean) => {
    setShowFullHierarchy(value);
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
    setShowEnums(true);
    setShowAssociations(true);

    const relations = schemaServiceRef.current.getRelations();
    if (isOverviewCandidate(allNodes as IliNode[], relations)) {
      const overview = layoutModelOverview(allNodes as IliNode[], relations);
      setNodes(overview.nodes as IliNode[]);
      setEdges(overview.edges);
      setActiveNodeId(null);
      setNavigationHistory([]);
      setHistoryIndex(-1);
      setOverviewWasShown(true);
      requestFitView();
      return;
    }

    setOverviewWasShown(false);
    const initialClass =
      allNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
      allNodes.find(n => n.type === 'classNode');
    if (initialClass) {
      const result = computeLayout(initialClass as IliNode, {
        showFullHierarchy: value,
        showEnums: true,
        showAssociations: true,
        maxSubTypesPerRow: 4,
      });
      setNodes(result.nodes);
      setEdges(result.edges);
      setActiveNodeId(initialClass.id);
      setNavigationHistory([{
        nodeId: initialClass.id,
        showEnums: true,
        showAssociations: true,
      }]);
      setHistoryIndex(0);
      requestFitView();
    }
  }, [allNodes, computeLayout, setNodes, setEdges, requestFitView]);

  const handleToggleEnums = useCallback((visible: boolean) => {
    setShowEnums(visible);
    
    if (activeNodeId) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
       
        const nodeStates = new Map(
          currentNodes.map(node => [
            node.id,
            {
              position: { ...node.position },
              expanded: node.data?.expanded,
              isExpanded: node.data?.isExpanded,
              onExpandChange: node.data?.onExpandChange
            }
          ])
        );

        const relatedNodes = computeLayout(currentNode as IliNode, { showEnums: visible });

        const updatedNodes = relatedNodes.nodes.map(node => {
          const savedState = nodeStates.get(node.id);
          if (savedState) {
            return {
              ...node,
              position: savedState.position,
              data: {
                ...node.data,
                expanded: savedState.expanded,
                isExpanded: savedState.isExpanded,
                onExpandChange: savedState.onExpandChange
              }
            };
          }
          return node;
        });

        setNodes(updatedNodes);
        setEdges(relatedNodes.edges);
      }
    }
  }, [activeNodeId, allNodes, computeLayout, currentNodes, setNodes, setEdges]);

 
  useEffect(() => {
    return () => {
     
      setNodes([]);
      setEdges([]);
      setSearchOptions([]);
    };
  }, []);

 
  useEffect(() => {
    if (overviewWasShown) return;
    if (!activeNodeId && allNodes.length > 0) {
      const firstAbstractClass = allNodes.find(n =>
        n.type === 'classNode' && n.data.isAbstract
      );
      if (firstAbstractClass) {
        applyLayout(firstAbstractClass as IliNode, { maxSubTypesPerRow: 4 });
        setActiveNodeId(firstAbstractClass.id);
        setNavigationHistory([{
          nodeId: firstAbstractClass.id,
          showEnums: true,
          showAssociations: true,
        }]);
        setHistoryIndex(0);
      }
    }
  }, [activeNodeId, allNodes, applyLayout, overviewWasShown]);

 
  useEffect(() => {
    if (activeNodeId && allNodes.length > 0) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        const relatedNodes = applyLayout(currentNode as IliNode);
        setCurrentNodes(relatedNodes.nodes);
        setCurrentEdges(relatedNodes.edges);
      }
    }
  }, [activeNodeId, allNodes, applyLayout]);

  const handleLineTypeToggle = useCallback(() => {
    setUseCurvedLines(prev => {
      const newValue = !prev;
      
      const expandedStates = new Map<string, boolean>(
        currentNodes.map(node => [node.id, Boolean(node.data?.expanded)] as const)
      );
      
      const nodePositions = new Map<string, { x: number; y: number }>(
        currentNodes.map(node => [node.id, { ...node.position }])
      );

      setEdges(edges => edges.map(edge => ({
        ...edge,
        type: newValue ? 'default' : 'step'
      })));

      const updatedNodes = currentNodes.map(node => ({
        ...node,
        position: nodePositions.get(node.id) || node.position,
        data: {
          ...node.data,
          expanded: expandedStates.get(node.id) ?? node.data?.expanded
        }
      }));

      setNodes(updatedNodes);
      setCurrentNodes(updatedNodes);

      return newValue;
    });
  }, [currentNodes, setNodes, setEdges]);

  const handleToggleAssociations = useCallback((visible: boolean) => {
    setShowAssociations(visible);

    if (activeNodeId) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        applyLayout(currentNode as IliNode, { showAssociations: visible });

        if (historyIndex >= 0) {
          const updatedHistory = navigationHistory.map((entry, idx) =>
            idx === historyIndex ? { ...entry, showAssociations: visible } : entry
          );
          setNavigationHistory(updatedHistory);
        }
      }
    }
  }, [activeNodeId, allNodes, applyLayout, navigationHistory, historyIndex]);

  const handleMagicLayout = useCallback(() => {
    if (activeNodeId) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        const expandedHandlers = new Map(
          currentNodes.map(node => [node.id, node.data?.onExpandChange])
        );

        const relatedNodes = computeLayout(currentNode as IliNode, { useMagicLayout: true });

        const nodesWithExpandedStates = relatedNodes.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            expanded: true,
            isExpanded: true,
            onExpandChange: expandedHandlers.get(node.id) || node.data?.onExpandChange
          }
        }));

        setNodes(nodesWithExpandedStates);
        setCurrentNodes(nodesWithExpandedStates);
        setEdges(relatedNodes.edges);
        setCurrentEdges(relatedNodes.edges);
      }
    }
  }, [activeNodeId, allNodes, computeLayout, currentNodes, setNodes, setEdges]);

  const handleNodeResize = useCallback((nodeId: string, width: number) => {
   
    isResizingRef.current = true;
    
    setNodeWidths(prev => {
      const newWidths = new Map(prev);
      newWidths.set(nodeId, width);
      return newWidths;
    });

    setNodes(currentNodes => 
      currentNodes.map(node => 
        node.id === nodeId 
          ? {
              ...node,
              data: {
                ...node.data,
                width
              },
              position: node.position
            }
          : node
      )
    );

   
    setTimeout(() => {
      isResizingRef.current = false;
    }, 100);
  }, []);

 
  return {
    isLoading,
    error,
    parseWarnings,
    imports,
    interlisVersion,
    dismissParseWarnings,
    searchValue,
    searchOptions,
    currentFileName,
    handleSearchChange,
    handleFileUpload,
    handleClearFile,
    handleConnect,
    handleNodeClick,
    handleBack,
    canGoBack,
    showOverview,
    navigationHistory,
    setFullHierarchyAndReset,
    showFullHierarchy,
    activeNodeId,
    setActiveNodeId,
    setNavigationHistory,
    setHistoryIndex,
    allNodes,
    allEdges,
    showEnums,
    handleToggleEnums,
    historyIndex,
    maxSubTypesPerRow,
    setMaxSubTypesPerRow,
    handleLineTypeToggle,
    currentNodes,
    currentEdges,
    showAssociations,
    handleToggleAssociations,
    handleMagicLayout,
    applyLayout,
    computeLayout,
    fitViewRequest,
    requestFitView,
  };
};
