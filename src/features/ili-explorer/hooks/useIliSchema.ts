import { useState, useCallback, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Node, Edge, Connection } from '@xyflow/react';
import { useTheme } from '../../../common/theme/ThemeContext';
import { getDirectRelations } from '../services/layout/getDirectRelations';
import { isOverviewCandidate, layoutModelOverview } from '../services/layout/overviewStrategy';
import { layoutFullSchemaCanvas } from '../services/layout/layoutFullSchemaCanvas';
import { useNavigationHistory } from './useNavigationHistory';
import { useIliLoader, type LoadResult } from './useIliLoader';
import { useDisplayToggles } from './useDisplayToggles';
import {
  IliNode,
  SearchOption,
  NavigationState,
  LayoutOptions,
} from '../services/types/IliBaseTypes';
import type { IliParseError, IliImportRef } from '../services/parser/types';

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
  handleNodeClick: (event: React.MouseEvent, node: Node) => void;
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
  showAssociations: boolean;
  handleToggleAssociations: (visible: boolean) => void;
  handleMagicLayout: () => void;
  resetCurrentLayout: () => void;
  handleMaxSubTypesChange: (value: number) => void;
  fitViewRequest: number;
  requestFitView: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  showOverview: () => void;
  showFullSchema: () => void;
  registerNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  registerNodeExpand: (nodeId: string, expanded: boolean) => void;
  snapshotNodes: (nodes: IliNode[]) => void;
}

interface CachedNodeState {
  position?: { x: number; y: number };
  expanded?: boolean;
}

const OVERVIEW_KEY = '__overview__';
const FULL_SCHEMA_KEY = '__fullSchema__';

type DisplayTarget =
  | { kind: 'overview' }
  | { kind: 'fullSchema'; showEnums?: boolean; showAssociations?: boolean }
  | { kind: 'node'; node: IliNode; override?: Partial<LayoutOptions> };

function normalizeIliNode(source: Node | IliNode, extraData?: Record<string, unknown>): IliNode {
  return {
    ...source,
    type: source.type || 'classNode',
    position: source.position,
    data: {
      ...source.data,
      isHighlighted: false,
      isActive: false,
      expanded: source.data?.expanded ?? false,
      ...extraData,
    },
  } as IliNode;
}

interface CapturedNodeState {
  position: { x: number; y: number };
  expanded: boolean | undefined;
  isExpanded: boolean | undefined;
  onExpandChange: ((expanded: boolean) => void) | undefined;
}

function captureNodeStates(source: IliNode[]): Map<string, CapturedNodeState> {
  return new Map(
    source.map(n => [n.id, {
      position: { ...n.position },
      expanded: n.data?.expanded as boolean | undefined,
      isExpanded: n.data?.isExpanded as boolean | undefined,
      onExpandChange: n.data?.onExpandChange as ((e: boolean) => void) | undefined,
    }])
  );
}

export const useIliSchema = (
  nodes: IliNode[],
  setNodes: Dispatch<SetStateAction<IliNode[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  useCurvedLines: boolean,
  setUseCurvedLines: Dispatch<SetStateAction<boolean>>
): UseIliSchemaReturn => {
  const { colors } = useTheme();
  const [overviewWasShown, setOverviewWasShown] = useState(false);
  const [searchValue, setSearchValue] = useState<SearchOption | null>(null);

  const onNavigateRef = useRef<(entry: NavigationState) => boolean>(() => false);
  const handleNavigate = useCallback(
    (entry: NavigationState) => onNavigateRef.current(entry),
    []
  );
  const nav = useNavigationHistory<NavigationState>({ onNavigate: handleNavigate });
  const navigationHistory = nav.entries;
  const historyIndex = nav.index;
  const pushHistory = nav.push;
  const resetHistory = nav.reset;

  const display = useDisplayToggles();
  const {
    showFullHierarchy,
    setShowFullHierarchy,
    showEnums,
    setShowEnums,
    showAssociations,
    setShowAssociations,
    maxSubTypesPerRow,
    setMaxSubTypesPerRow,
    resetVisibility,
  } = display;
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);
  const [viewMode, setViewMode] = useState<'overview' | 'fullSchema' | 'focus'>('overview');
  const [fsShowEnums, setFsShowEnums] = useState(false);
  const [fsShowAssociations, setFsShowAssociations] = useState(false);

  const sessionCacheRef = useRef<Map<string, Map<string, CachedNodeState>>>(new Map());
  const currentViewKeyRef = useRef<string>(OVERVIEW_KEY);

  const getOrCreateView = useCallback((key: string): Map<string, CachedNodeState> => {
    let view = sessionCacheRef.current.get(key);
    if (!view) {
      view = new Map();
      sessionCacheRef.current.set(key, view);
    }
    return view;
  }, []);

  const applyCachedState = useCallback((viewKey: string, list: IliNode[]): IliNode[] => {
    const view = sessionCacheRef.current.get(viewKey);
    if (!view || view.size === 0) return list;
    return list.map(n => {
      const cached = view.get(n.id);
      if (!cached) return n;
      const next: IliNode = { ...n };
      if (cached.position) next.position = cached.position;
      if (cached.expanded !== undefined) {
        next.data = { ...n.data, expanded: cached.expanded, isExpanded: cached.expanded };
      }
      return next;
    });
  }, []);

  const registerNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    const view = getOrCreateView(currentViewKeyRef.current);
    const prev = view.get(nodeId) ?? {};
    view.set(nodeId, { ...prev, position });
  }, [getOrCreateView]);

  const registerNodeExpand = useCallback((nodeId: string, expanded: boolean) => {
    const view = getOrCreateView(currentViewKeyRef.current);
    const prev = view.get(nodeId) ?? {};
    view.set(nodeId, { ...prev, expanded });
  }, [getOrCreateView]);

  const snapshotNodes = useCallback((nodesToSnap: IliNode[]) => {
    const view = getOrCreateView(currentViewKeyRef.current);
    for (const n of nodesToSnap) {
      const prev = view.get(n.id) ?? {};
      const expanded = n.data?.expanded as boolean | undefined;
      view.set(n.id, {
        ...prev,
        position: n.position,
        expanded: expanded ?? prev.expanded,
      });
    }
  }, [getOrCreateView]);

  const requestFitView = useCallback(() => {
    setFitViewRequest(c => c + 1);
  }, []);

  const handleLoadedRef = useRef<(result: LoadResult) => void>(() => {});
  const onLoaded = useCallback(
    (result: LoadResult) => handleLoadedRef.current(result),
    []
  );
  const loader = useIliLoader({ colors, useCurvedLines, onLoaded });
  const {
    isLoading,
    error,
    parseWarnings,
    dismissParseWarnings,
    imports,
    interlisVersion,
    currentFileName,
    allNodes,
    allEdges,
    relations: parsedRelations,
    searchOptions,
    loadFromFile,
  } = loader;

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
      return getDirectRelations(node, allNodes, allEdges, colors, opts);
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

  const commitDisplay = useCallback(
    (result: { nodes: IliNode[]; edges: Edge[] }, activeId: string | null, viewKey: string) => {
      currentViewKeyRef.current = viewKey;
      if (viewKey === OVERVIEW_KEY) setViewMode('overview');
      else if (viewKey === FULL_SCHEMA_KEY) setViewMode('fullSchema');
      else setViewMode('focus');
      setNodes(applyCachedState(viewKey, result.nodes));
      setEdges(result.edges);
      setActiveNodeId(activeId);
      requestFitView();
    },
    [setNodes, setEdges, requestFitView, applyCachedState]
  );

  const displayNode = useCallback((target: DisplayTarget): boolean => {
    if (target.kind === 'overview') {
      if (allNodes.length === 0) return false;
      const overview = layoutModelOverview(allNodes as IliNode[], parsedRelations);
      commitDisplay({ nodes: overview.nodes as IliNode[], edges: overview.edges }, null, OVERVIEW_KEY);
    } else if (target.kind === 'fullSchema') {
      if (allNodes.length === 0) return false;
      const result = layoutFullSchemaCanvas(
        allNodes as IliNode[],
        allEdges,
        colors,
        useCurvedLines,
        {
          maxPerRow: maxSubTypesPerRow > 0 ? maxSubTypesPerRow : 4,
          showEnums: target.showEnums ?? fsShowEnums,
          showAssociations: target.showAssociations ?? fsShowAssociations,
        },
      );
      commitDisplay({ nodes: result.nodes, edges: result.edges }, null, FULL_SCHEMA_KEY);
    } else {
      commitDisplay(computeLayout(target.node, target.override), target.node.id, `node:${target.node.id}`);
    }
    return true;
  }, [allNodes, allEdges, parsedRelations, maxSubTypesPerRow, fsShowEnums, fsShowAssociations, colors, useCurvedLines, computeLayout, commitDisplay]);

  const handleLoaded = useCallback((result: LoadResult) => {
    setSearchValue(null);
    setMaxSubTypesPerRow(4);
    resetHistory();

    sessionCacheRef.current.clear();

    if (isOverviewCandidate(result.flowNodes as IliNode[], result.relations)) {
      const overview = layoutModelOverview(result.flowNodes as IliNode[], result.relations);
      commitDisplay({ nodes: overview.nodes as IliNode[], edges: overview.edges }, null, OVERVIEW_KEY);
      resetHistory({
        nodeId: '__overview__',
        isOverview: true,
        showEnums: true,
        showAssociations: true,
      });
      setOverviewWasShown(true);
      return;
    }

    setOverviewWasShown(false);
    const initialClass = (
      result.flowNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
      result.flowNodes.find(n => n.type === 'classNode')
    ) as IliNode | undefined;
    if (!initialClass) return;

    const layoutResult = getDirectRelations(
      initialClass,
      result.flowNodes as IliNode[],
      result.flowEdges,
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
    commitDisplay(layoutResult, initialClass.id, `node:${initialClass.id}`);
    resetHistory({
      nodeId: initialClass.id,
      showEnums: true,
      showAssociations,
    });
    requestAnimationFrame(() => setMaxSubTypesPerRow(4));
  }, [
    colors,
    showFullHierarchy,
    useCurvedLines,
    showEnums,
    showAssociations,
    setMaxSubTypesPerRow,
    resetHistory,
    commitDisplay,
  ]);

  useEffect(() => {
    handleLoadedRef.current = handleLoaded;
  });

  const handleFileUpload = loadFromFile;

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

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.id === activeNodeId) return;

    const iliNode = normalizeIliNode(node, { width: 400 });
    const result = computeLayout(iliNode);
    const widened = result.nodes.map(n => ({ ...n, data: { ...n.data, width: 400 } }));

    commitDisplay({ nodes: widened, edges: result.edges }, node.id, `node:${node.id}`);
    pushHistory({ nodeId: node.id, node: iliNode, showEnums, showAssociations });
  }, [activeNodeId, computeLayout, commitDisplay, showEnums, showAssociations, pushHistory]);

  const navigateToEntry = useCallback((entry: NavigationState) => {
    if (entry.isOverview) {
      return displayNode({ kind: 'overview' });
    }
    if (entry.isFullSchema) {
      return displayNode({ kind: 'fullSchema' });
    }
    const target = entry.node
      ?? (allNodes.find(node => node.id === entry.nodeId) as IliNode | undefined);
    if (!target) return false;

    setShowAssociations(entry.showAssociations);
    setShowEnums(entry.showEnums);
    return displayNode({
      kind: 'node',
      node: normalizeIliNode(target),
      override: { showEnums: entry.showEnums, showAssociations: entry.showAssociations },
    });
  }, [allNodes, displayNode, setShowEnums, setShowAssociations]);

  useEffect(() => {
    onNavigateRef.current = navigateToEntry;
  });

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

  const handleSearchChange = useCallback((option: SearchOption | null) => {
    setSearchValue(option);
    if (!option) {
      const fallback = (allNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
        allNodes.find(n => n.type === 'classNode')) as IliNode | undefined;
      if (fallback) displayNode({ kind: 'node', node: fallback, override: { maxSubTypesPerRow: 4 } });
      return;
    }
    const nodeId = option.type === 'ATTRIBUTE' ? option.id.split('.')[0] : option.id;
    navigateToNode(nodeId);
    setSearchValue(null);
  }, [allNodes, displayNode, navigateToNode]);

  const canGoBack = nav.canGoBack;
  const canGoForward = nav.canGoForward;

  const showOverview = useCallback(() => {
    if (allNodes.length === 0) return;
    const currentEntry = nav.entries[nav.index];
    if (currentEntry?.isOverview) {
      displayNode({ kind: 'overview' });
      return;
    }
    resetVisibility();
    if (!displayNode({ kind: 'overview' })) return;
    pushHistory({
      nodeId: '__overview__',
      isOverview: true,
      showEnums: true,
      showAssociations: true,
    });
    setOverviewWasShown(true);
  }, [allNodes, nav, displayNode, pushHistory, resetVisibility]);

  const showFullSchema = useCallback(() => {
    if (allNodes.length === 0) return;
    const currentEntry = nav.entries[nav.index];
    if (currentEntry?.isFullSchema) {
      displayNode({ kind: 'fullSchema' });
      return;
    }
    if (!displayNode({ kind: 'fullSchema' })) return;
    pushHistory({
      nodeId: '__fullSchema__',
      isFullSchema: true,
      showEnums: true,
      showAssociations: true,
    });
  }, [allNodes, nav, displayNode, pushHistory]);

  const handleBack = nav.back;
  const handleForward = nav.forward;
  const jumpToHistoryIndex = nav.jumpTo;

  const handleClearFile = useCallback(() => {
    loader.clear();
    setNodes([]);
    setEdges([]);
    setSearchValue(null);
    setOverviewWasShown(false);
    resetHistory();
    setActiveNodeId(null);
    resetVisibility();
    sessionCacheRef.current.clear();
  }, [loader, setNodes, setEdges, resetHistory, resetVisibility]);

  const setFullHierarchyAndReset = useCallback((value: boolean) => {
    setShowFullHierarchy(value);
    setShowEnums(true);
    setShowAssociations(true);

    if (isOverviewCandidate(allNodes as IliNode[], parsedRelations)) {
      displayNode({ kind: 'overview' });
      resetHistory({
        nodeId: '__overview__',
        isOverview: true,
        showEnums: true,
        showAssociations: true,
      });
      setOverviewWasShown(true);
      return;
    }

    setOverviewWasShown(false);
    const initialClass =
      allNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
      allNodes.find(n => n.type === 'classNode');
    if (!initialClass) return;

    displayNode({
      kind: 'node',
      node: initialClass as IliNode,
      override: {
        showFullHierarchy: value,
        showEnums: true,
        showAssociations: true,
        maxSubTypesPerRow: 4,
      },
    });
    resetHistory({
      nodeId: initialClass.id,
      showEnums: true,
      showAssociations: true,
    });
  }, [allNodes, parsedRelations, displayNode, setShowFullHierarchy, setShowEnums, setShowAssociations, resetHistory]);

  const handleToggleEnums = useCallback((visible: boolean) => {
    if (viewMode === 'fullSchema') {
      setFsShowEnums(visible);
      displayNode({ kind: 'fullSchema', showEnums: visible, showAssociations: fsShowAssociations });
      return;
    }

    setShowEnums(visible);

    if (!activeNodeId) return;
    const currentNode = allNodes.find(node => node.id === activeNodeId);
    if (!currentNode) return;

    const captured = captureNodeStates(nodes);
    const relatedNodes = computeLayout(currentNode as IliNode, { showEnums: visible });

    const updatedNodes = relatedNodes.nodes.map(node => {
      const saved = captured.get(node.id);
      if (!saved) return node;
      return {
        ...node,
        position: saved.position,
        data: {
          ...node.data,
          expanded: saved.expanded,
          isExpanded: saved.isExpanded,
          onExpandChange: saved.onExpandChange,
        },
      };
    });

    setNodes(updatedNodes);
    setEdges(relatedNodes.edges);
  }, [activeNodeId, allNodes, computeLayout, nodes, setNodes, setEdges, setShowEnums, viewMode, fsShowAssociations, displayNode]);

  const handleMaxSubTypesChange = useCallback((value: number) => {
    setMaxSubTypesPerRow(value);
    if (!activeNodeId) return;
    const currentNode = allNodes.find(n => n.id === activeNodeId);
    if (!currentNode) return;
    applyLayout(currentNode as IliNode, { maxSubTypesPerRow: value });
  }, [activeNodeId, allNodes, applyLayout, setMaxSubTypesPerRow]);

  useEffect(() => {
    return () => {
      setNodes([]);
      setEdges([]);
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
        resetHistory({
          nodeId: firstAbstractClass.id,
          showEnums: true,
          showAssociations: true,
        });
      }
    }
  }, [activeNodeId, allNodes, overviewWasShown, applyLayout, resetHistory]);

  const handleLineTypeToggle = useCallback(() => {
    setUseCurvedLines(prev => {
      const newValue = !prev;
      const captured = captureNodeStates(nodes);

      setEdges(prevEdges => prevEdges.map(edge => ({
        ...edge,
        type: newValue ? 'default' : 'step',
      })));

      const updatedNodes = nodes.map(node => {
        const saved = captured.get(node.id);
        return {
          ...node,
          position: saved?.position ?? node.position,
          data: { ...node.data, expanded: saved?.expanded ?? node.data?.expanded },
        };
      });

      setNodes(updatedNodes);
      return newValue;
    });
  }, [nodes, setNodes, setEdges, setUseCurvedLines]);

  const handleToggleAssociations = useCallback((visible: boolean) => {
    if (viewMode === 'fullSchema') {
      setFsShowAssociations(visible);
      displayNode({ kind: 'fullSchema', showEnums: fsShowEnums, showAssociations: visible });
      return;
    }

    setShowAssociations(visible);

    if (activeNodeId) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        applyLayout(currentNode as IliNode, { showAssociations: visible });
        nav.patchCurrent({ showAssociations: visible });
      }
    }
  }, [activeNodeId, allNodes, applyLayout, nav, viewMode, fsShowEnums, displayNode]);

  const resetCurrentLayout = useCallback(() => {
    const key = currentViewKeyRef.current;
    sessionCacheRef.current.delete(key);
    if (key === OVERVIEW_KEY) {
      displayNode({ kind: 'overview' });
      return;
    }
    if (key === FULL_SCHEMA_KEY) {
      displayNode({ kind: 'fullSchema' });
      return;
    }
    if (!activeNodeId) return;
    const targetNode = allNodes.find(n => n.id === activeNodeId) as IliNode | undefined;
    if (!targetNode) return;
    applyLayout(targetNode);
    requestFitView();
  }, [activeNodeId, allNodes, displayNode, applyLayout, requestFitView]);

  const handleMagicLayout = useCallback(() => {
    if (!activeNodeId) return;
    const currentNode = allNodes.find(node => node.id === activeNodeId);
    if (!currentNode) return;

    const captured = captureNodeStates(nodes);
    const relatedNodes = computeLayout(currentNode as IliNode, { useMagicLayout: true });

    const nodesWithExpandedStates = relatedNodes.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        expanded: true,
        isExpanded: true,
        onExpandChange: captured.get(node.id)?.onExpandChange ?? node.data?.onExpandChange,
      },
    }));

    snapshotNodes(nodesWithExpandedStates);
    setNodes(nodesWithExpandedStates);
    setEdges(relatedNodes.edges);
  }, [activeNodeId, allNodes, computeLayout, nodes, setNodes, setEdges, snapshotNodes]);

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
    showEnums: viewMode === 'fullSchema' ? fsShowEnums : showEnums,
    handleToggleEnums,
    historyIndex,
    maxSubTypesPerRow,
    setMaxSubTypesPerRow,
    handleLineTypeToggle,
    showAssociations: viewMode === 'fullSchema' ? fsShowAssociations : showAssociations,
    handleToggleAssociations,
    handleMagicLayout,
    resetCurrentLayout,
    handleMaxSubTypesChange,
    fitViewRequest,
    requestFitView,
    showFullSchema,
    registerNodeMove,
    registerNodeExpand,
    snapshotNodes,
  };
};
