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
  navigateToNode: (nodeId: string) => boolean;
  handleBack: () => boolean;
  handleForward: () => boolean;
  jumpToHistoryIndex: (targetIndex: number) => boolean;
  navigationHistory: NavigationState[];
  overviewWasShown: boolean;
  setFullHierarchyAndReset: (value: boolean) => void;
  showFullHierarchy: boolean;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
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
  resetCurrentLayout: () => void;
  applyLayout: (node: IliNode, override?: Partial<LayoutOptions>) => { nodes: IliNode[]; edges: Edge[] };
  computeLayout: (node: IliNode, override?: Partial<LayoutOptions>) => { nodes: IliNode[]; edges: Edge[] };
  fitViewRequest: number;
  requestFitView: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  showOverview: () => void;
}

const NAV_HISTORY_LIMIT = 50;

interface NavStack {
  entries: NavigationState[];
  index: number;
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
  const [nav, setNav] = useState<NavStack>({ entries: [], index: -1 });
  const navigationHistory = nav.entries;
  const historyIndex = nav.index;

  const pushHistory = useCallback((entry: NavigationState) => {
    setNav(prev => {
      const truncated = prev.entries.slice(0, prev.index + 1);
      const appended = [...truncated, entry];
      if (appended.length > NAV_HISTORY_LIMIT) {
        const dropped = appended.slice(appended.length - NAV_HISTORY_LIMIT);
        return { entries: dropped, index: dropped.length - 1 };
      }
      return { entries: appended, index: appended.length - 1 };
    });
  }, []);

  const resetHistory = useCallback((seed?: NavigationState) => {
    setNav(seed ? { entries: [seed], index: 0 } : { entries: [], index: -1 });
  }, []);
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

  const applyLayoutRef = useRef(applyLayout);
  useEffect(() => {
    applyLayoutRef.current = applyLayout;
  });

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
      resetHistory();
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
        resetHistory({
          nodeId: '__overview__',
          isOverview: true,
          showEnums: true,
          showAssociations: true,
        });
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
          resetHistory({
            nodeId: initialClass.id,
            showEnums: true,
            showAssociations: showAssociations
          });

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

  const loadFromContentRef = useRef(loadFromContent);
  useEffect(() => {
    loadFromContentRef.current = loadFromContent;
  });

  useEffect(() => {
    schemaServiceRef.current = new IliSchemaService(
      parserBackend === 'ng' ? new NgIliParser() : new LegacyIliParser()
    );
    const cached = lastContentRef.current;
    if (cached) {
      void loadFromContentRef.current(cached.content, cached.fileName);
    }
  }, [parserBackend]);

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

    pushHistory({
      nodeId: node.id,
      node: iliNode,
      showEnums,
      showAssociations,
    });

    setViewportHistory(prev => [...prev, viewport]);

    if (!isResizingRef.current) {
      requestFitView();
    }
  }, [
    activeNodeId,
    computeLayout,
    showEnums,
    showAssociations,
    setNodes,
    setEdges,
    requestFitView,
    pushHistory,
  ]);

  const renderOverviewLayout = useCallback(() => {
    if (allNodes.length === 0) return false;
    const relations = schemaServiceRef.current.getRelations();
    const overview = layoutModelOverview(allNodes as IliNode[], relations);
    setNodes(overview.nodes as IliNode[]);
    setEdges(overview.edges);
    setActiveNodeId(null);
    return true;
  }, [allNodes, setNodes, setEdges]);

  const navigateToEntry = useCallback((entry: NavigationState) => {
    if (entry.isOverview) {
      if (!renderOverviewLayout()) return false;
      requestFitView();
      return true;
    }

    const target = entry.node
      ?? (allNodes.find(node => node.id === entry.nodeId) as IliNode | undefined);
    if (!target) return false;

    setShowAssociations(entry.showAssociations);
    setShowEnums(entry.showEnums);

    const iliNode: IliNode = {
      ...target,
      type: target.type || 'classNode',
      position: target.position,
      data: {
        ...target.data,
        isHighlighted: false,
        isActive: false,
        expanded: target.data?.expanded ?? false,
      },
    };

    applyLayoutRef.current(iliNode, {
      showEnums: entry.showEnums,
      showAssociations: entry.showAssociations,
    });
    setActiveNodeId(entry.nodeId);
    requestFitView();
    return true;
  }, [allNodes, requestFitView, renderOverviewLayout]);

  const navigateToNode = useCallback((nodeId: string): boolean => {
    const target = allNodes.find(node => node.id === nodeId) as IliNode | undefined;
    if (!target) return false;
    if (nodeId === activeNodeId) return false;

    const entry: NavigationState = {
      nodeId,
      node: target,
      showEnums,
      showAssociations,
    };
    if (!navigateToEntry(entry)) return false;
    pushHistory(entry);
    return true;
  }, [allNodes, activeNodeId, showEnums, showAssociations, navigateToEntry, pushHistory]);

  const canGoBack = useMemo(() => historyIndex > 0, [historyIndex]);

  const canGoForward = useMemo(() => {
    return navigationHistory.length > 0 && historyIndex < navigationHistory.length - 1;
  }, [historyIndex, navigationHistory.length]);

  // Single entry point that returns the user to the initial state for the
  // current model: renders the topic-grouped overview and resets all
  // session-only toggles (enum/association history, visibility flags, max
  // sub-types per row). Replaces the previous Reset action.
  const showOverview = useCallback(() => {
    if (allNodes.length === 0) return;
    const currentEntry = nav.entries[nav.index];
    if (currentEntry?.isOverview) {
      renderOverviewLayout();
      requestFitView();
      return;
    }
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
    setShowEnums(true);
    setShowAssociations(true);
    setMaxSubTypesPerRow(4);
    if (!renderOverviewLayout()) return;
    pushHistory({
      nodeId: '__overview__',
      isOverview: true,
      showEnums: true,
      showAssociations: true,
    });
    setOverviewWasShown(true);
    requestFitView();
  }, [allNodes, nav, renderOverviewLayout, pushHistory, requestFitView]);

  const handleBack = useCallback((): boolean => {
    if (historyIndex <= 0) return false;
    const targetEntry = navigationHistory[historyIndex - 1];
    if (!navigateToEntry(targetEntry)) return false;
    setNav(prev => ({ ...prev, index: prev.index - 1 }));
    return true;
  }, [historyIndex, navigationHistory, navigateToEntry]);

  const handleForward = useCallback((): boolean => {
    if (!canGoForward) return false;
    const targetEntry = navigationHistory[historyIndex + 1];
    if (!navigateToEntry(targetEntry)) return false;
    setNav(prev => ({ ...prev, index: prev.index + 1 }));
    return true;
  }, [canGoForward, historyIndex, navigationHistory, navigateToEntry]);

  const jumpToHistoryIndex = useCallback((targetIndex: number): boolean => {
    if (targetIndex < 0 || targetIndex >= navigationHistory.length) return false;
    if (targetIndex === historyIndex) return false;
    const targetEntry = navigationHistory[targetIndex];
    if (!navigateToEntry(targetEntry)) return false;
    setNav(prev => ({ ...prev, index: targetIndex }));
    return true;
  }, [navigationHistory, historyIndex, navigateToEntry]);

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
    resetHistory();
    setActiveNodeId(null);
    setMaxSubTypesPerRow(4);
    setShowEnums(true);
    setShowAssociations(true);
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
  }, [setNodes, setEdges, resetHistory]);

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
      resetHistory({
        nodeId: '__overview__',
        isOverview: true,
        showEnums: true,
        showAssociations: true,
      });
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
      resetHistory({
        nodeId: initialClass.id,
        showEnums: true,
        showAssociations: true,
      });
      requestFitView();
    }
  }, [allNodes, computeLayout, setNodes, setEdges, requestFitView, resetHistory]);

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
        applyLayoutRef.current(firstAbstractClass as IliNode, { maxSubTypesPerRow: 4 });
        setActiveNodeId(firstAbstractClass.id);
        resetHistory({
          nodeId: firstAbstractClass.id,
          showEnums: true,
          showAssociations: true,
        });
      }
    }
  }, [activeNodeId, allNodes, overviewWasShown, resetHistory]);


  useEffect(() => {
    if (activeNodeId && allNodes.length > 0) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        const relatedNodes = applyLayoutRef.current(currentNode as IliNode);
        setCurrentNodes(relatedNodes.nodes);
        setCurrentEdges(relatedNodes.edges);
      }
    }
  }, [activeNodeId, allNodes]);

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

        setNav(prev => {
          if (prev.index < 0) return prev;
          const updated = prev.entries.map((entry, idx) =>
            idx === prev.index ? { ...entry, showAssociations: visible } : entry
          );
          return { entries: updated, index: prev.index };
        });
      }
    }
  }, [activeNodeId, allNodes, applyLayout, navigationHistory, historyIndex]);

  const resetCurrentLayout = useCallback(() => {
    if (!activeNodeId) return;
    const targetNode = allNodes.find(n => n.id === activeNodeId) as IliNode | undefined;
    if (!targetNode) return;
    applyLayout(targetNode);
    requestFitView();
  }, [activeNodeId, allNodes, applyLayout, requestFitView]);

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
    navigateToNode,
    handleBack,
    handleForward,
    jumpToHistoryIndex,
    canGoBack,
    canGoForward,
    showOverview,
    navigationHistory,
    overviewWasShown,
    setFullHierarchyAndReset,
    showFullHierarchy,
    activeNodeId,
    setActiveNodeId,
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
    resetCurrentLayout,
    applyLayout,
    computeLayout,
    fitViewRequest,
    requestFitView,
  };
};
