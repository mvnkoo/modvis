import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Node, Edge, Connection, FitViewOptions } from '@xyflow/react';
import { useTheme } from '../../../common/theme/ThemeContext';
import { IliSchemaService } from '../services/iliSchemaService';
import { IliLayoutService } from '../services/IliLayoutService';
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
} from '../services/types/IliBaseTypes';
import { IliClassNode } from '../services/types/IliModelTypes';

export type { SearchOption };


interface UseIliSchemaReturn {
  isLoading: boolean;
  error: string | null;
  searchValue: SearchOption | null;
  searchOptions: SearchOption[];
  currentFileName: string | null;
  handleSearchChange: (value: SearchOption | null) => void;
  handleFileUpload: (file: File) => Promise<void>;
  handleClearFile: () => void;
  handleConnect: (params: Connection) => void;
  handleNodeClick: (event: React.MouseEvent, node: Node, viewport: ViewportState) => void;
  handleReset: () => void;
  handleBack: () => boolean;
  navigationHistory: NavigationState[];
  handleHierarchyToggle: () => void;
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

 
  const schemaServiceRef = useRef<IliSchemaService>(new IliSchemaService());

 
  const isResizingRef = useRef(false);

  const filterNodesAndEdges = useCallback((nodeId: string | null = null) => {
   
    const layoutCache = new Map<string, {nodes: Node[]; edges: Edge[]}>();
    
    if (layoutCache.has(nodeId || '')) {
      const cached = layoutCache.get(nodeId || '');
      if (cached) {
        setNodes(cached.nodes);
        setEdges(cached.edges);
        return;
      }
    }
    
    if (!nodeId) {
      const initialClass =
        allNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
        allNodes.find(n => n.type === 'classNode');
      if (initialClass) {
        const relatedNodes = IliLayoutService.getDirectRelations(
          initialClass,
          allNodes,
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          showEnums,
          4
        );

        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setActiveNodeId(initialClass.id);
      }
      return;
    }

    const activeNode = allNodes.find(n => n.id === nodeId);
    if (!activeNode) return;

    const relatedNodes = IliLayoutService.getDirectRelations(
      activeNode,
      allNodes,
      allEdges,
      colors,
      [],
      showFullHierarchy,
      useCurvedLines,
      showEnums,
      maxSubTypesPerRow 
    );

    setNodes(relatedNodes.nodes);
    setEdges(relatedNodes.edges);
    setActiveNodeId(nodeId);

   
    layoutCache.set(nodeId || '', { nodes: relatedNodes.nodes, edges: relatedNodes.edges });
  }, [
    allNodes, 
    allEdges, 
    showFullHierarchy, 
    colors, 
    useCurvedLines, 
    setNodes, 
    setEdges,
    showEnums,
    maxSubTypesPerRow 
  ]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
     
      setNodes([]);
      setEdges([]);
      setAllNodes([]);
      setAllEdges([]);
      setSearchOptions([]);
      setSearchValue(null);
      setCurrentFileName(null);
      setError(null);
      setNavigationHistory([]);
      setHistoryIndex(-1);
      setActiveNodeId(null);

     
      setMaxSubTypesPerRow(4);

     
      setIsLoading(true);
      setCurrentFileName(file.name);

      const content = await file.text();
      schemaServiceRef.current.parseSchema(content);

      const baseNodes = schemaServiceRef.current.getNodes();
      const relations = schemaServiceRef.current.getRelations();

      const flowNodes = baseNodes.map(flowNodeFromBaseNode);
      const flowEdges = inheritanceEdgesFromRelations(relations, colors, useCurvedLines);

     
      setAllNodes(flowNodes);
      setAllEdges(flowEdges);
      setSearchOptions(generateSearchOptions(baseNodes));

     
      const initialClass = (
        flowNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
        flowNodes.find(n => n.type === 'classNode')
      ) as IliNode | undefined;

      if (initialClass) {
        const relatedNodes = IliLayoutService.getDirectRelations(
          initialClass,
          flowNodes,
          flowEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          showEnums,
          4,
          showAssociations
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
  ]);

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

      const relatedNodes = IliLayoutService.getDirectRelations(
        processedNode as IliNode,
        allNodes as IliNode[],
        allEdges,
        colors,
        [],
        showFullHierarchy,
        useCurvedLines,
        showEnums,
        maxSubTypesPerRow,
        showAssociations
      );

      setNodes(relatedNodes.nodes);
      setEdges(relatedNodes.edges);
      setActiveNodeId(nodeId);
      
     
      setTimeout(() => {
        fitView({ duration: 500, padding: 0.2 });
      }, 50);
      
     
      setTimeout(() => {
        setSearchValue(null);
      }, 100);
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

    const relatedNodes = IliLayoutService.getDirectRelations(
      iliNode,
      allNodes as IliNode[],
      allEdges,
      colors,
      [],
      showFullHierarchy,
      useCurvedLines,
      showEnums,
      maxSubTypesPerRow,
      showAssociations
    );

    const nodesWithDefaultWidth = relatedNodes.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
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
      setTimeout(() => {
        fitView({
          padding: 0.3,
          duration: 800,
          includeHiddenNodes: false,
          minZoom: 0.2,
          maxZoom: 1.8
        });
      }, 100);
    }
  }, [
    activeNodeId,
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    maxSubTypesPerRow,
    showEnums,
    showAssociations,
    navigationHistory,
    historyIndex,
    setNodes,
    setEdges,
    fitView
  ]);

  const handleReset = useCallback(() => {
   
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
    
   
    setShowEnums(true);
    setShowAssociations(true);
    
    const initialClass =
      allNodes.find(n => n.type === 'classNode' && n.data.isAbstract) ??
      allNodes.find(n => n.type === 'classNode');

    if (initialClass) {
      const relatedNodes = IliLayoutService.getDirectRelations(
        initialClass as IliNode,
        allNodes as IliNode[],
        allEdges,
        colors,
        [],
        showFullHierarchy,
        useCurvedLines,
        true,
        maxSubTypesPerRow,
        true
      );

      setNodes(relatedNodes.nodes);
      setEdges(relatedNodes.edges);
      setActiveNodeId(initialClass.id);

      const initialState: NavigationState = {
        nodeId: initialClass.id,
        showEnums: true,
        showAssociations: true
      };
      setNavigationHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    maxSubTypesPerRow
  ]);

  const handleBack = useCallback((): boolean => {
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

        const relatedNodes = IliLayoutService.getDirectRelations(
          iliNode,
          allNodes as IliNode[],
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          previousState.showEnums,
          maxSubTypesPerRow,
          previousState.showAssociations
        );

        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setActiveNodeId(previousState.nodeId);
        setHistoryIndex(historyIndex - 1);

       
        setTimeout(() => {
          fitView({
            padding: 0.2,
            duration: 800,
            minZoom: 0.5,
            maxZoom: 1.5
          });
        }, 50);

        return true;
      }
    }
    return false;
  }, [
    historyIndex,
    navigationHistory,
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    maxSubTypesPerRow,
    setNodes,
    setEdges,
    fitView
  ]);

  const handleClearFile = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setAllNodes([]);
    setAllEdges([]);
    setSearchOptions([]);
    setSearchValue(null);
    setCurrentFileName(null);
    setError(null);
    setNavigationHistory([]);
    setHistoryIndex(-1);
    setActiveNodeId(null);
    setMaxSubTypesPerRow(4);
   
    setShowEnums(true);
    setShowAssociations(true);
   
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
  }, [setNodes, setEdges]);

  const handleHierarchyToggle = useCallback(() => {
    setShowFullHierarchy(prev => !prev);
    return true;
  }, []);

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

        const relatedNodes = IliLayoutService.getDirectRelations(
          currentNode as IliNode,
          allNodes as IliNode[],
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          visible,
          maxSubTypesPerRow,
          showAssociations
        );

       
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
  }, [
    activeNodeId,
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    maxSubTypesPerRow,
    showAssociations,
    currentNodes
  ]);

 
  useEffect(() => {
    return () => {
     
      setNodes([]);
      setEdges([]);
      setSearchOptions([]);
    };
  }, []);

 
  useEffect(() => {
    if (!activeNodeId && allNodes.length > 0) {
      const firstAbstractClass = allNodes.find(n => 
        n.type === 'classNode' && n.data.isAbstract
      );
      if (firstAbstractClass) {
        const relatedNodes = IliLayoutService.getDirectRelations(
          firstAbstractClass as IliNode,
          allNodes as IliNode[],
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          showEnums,
          4,
          showAssociations 
        );
        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setActiveNodeId(firstAbstractClass.id);
        setNavigationHistory([{
          nodeId: firstAbstractClass.id,
          showEnums: true,
          showAssociations: true,
        }]);
        setHistoryIndex(0);
      }
    }
  }, [
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    showEnums,
    showAssociations, 
    setNodes,
    setEdges
  ]);

 
  useEffect(() => {
    if (activeNodeId && allNodes.length > 0) {
      console.log('Effect triggered - Current showAssociations state:', showAssociations);
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        console.log('Updating view for node:', currentNode.id);
        const relatedNodes = IliLayoutService.getDirectRelations(
          currentNode as IliNode,
          allNodes as IliNode[],
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          showEnums,
          maxSubTypesPerRow,
          showAssociations
        );

        console.log('Effect update result:', {
          nodeCount: relatedNodes.nodes.length,
          edgeCount: relatedNodes.edges.length,
          associationNodes: relatedNodes.nodes.filter(n => n.type === 'associationNode').length
        });

        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setCurrentNodes(relatedNodes.nodes);
        setCurrentEdges(relatedNodes.edges);
      }
    }
  }, [activeNodeId, maxSubTypesPerRow, showAssociations]);

 
  useEffect(() => {
    setCurrentNodes(prevNodes => prevNodes);
    setCurrentEdges(prevEdges => prevEdges);
  }, []);

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
    console.log('handleToggleAssociations called with:', visible);
    console.log('Current showAssociations state before update:', showAssociations);

   
    setShowAssociations(visible);
    
   
    if (activeNodeId) {
        const currentNode = allNodes.find(node => node.id === activeNodeId);
        if (currentNode) {
            const relatedNodes = IliLayoutService.getDirectRelations(
                currentNode as IliNode,
                allNodes as IliNode[],
                allEdges,
                colors,
                [],
                showFullHierarchy,
                useCurvedLines,
                showEnums,
                maxSubTypesPerRow,
                visible 
            );

            setNodes(relatedNodes.nodes);
            setEdges(relatedNodes.edges);

           
            if (historyIndex >= 0) {
                const updatedHistory = navigationHistory.map((entry, idx) => {
                    if (idx === historyIndex) {
                        return { ...entry, showAssociations: visible };
                    }
                    return entry;
                });
                setNavigationHistory(updatedHistory);
            }
        }
    }
  }, [
    activeNodeId,
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    showEnums,
    maxSubTypesPerRow,
    navigationHistory,
    historyIndex
  ]);

  const handleMagicLayout = useCallback(() => {
    if (activeNodeId) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
       
        const expandedStates = new Map(
          currentNodes.map(node => [
            node.id,
            {
              expanded: true,
              isExpanded: true,
              onExpandChange: node.data?.onExpandChange
            }
          ])
        );

        const relatedNodes = IliLayoutService.getDirectRelations(
          currentNode as IliNode,
          allNodes as IliNode[],
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          showEnums,
          maxSubTypesPerRow,
          showAssociations,
          true 
        );

       
        const nodesWithExpandedStates = relatedNodes.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            expanded: true,
            isExpanded: true,
            onExpandChange: expandedStates.get(node.id)?.onExpandChange || node.data?.onExpandChange
          }
        }));

        setNodes(nodesWithExpandedStates);
        setCurrentNodes(nodesWithExpandedStates);
        setEdges(relatedNodes.edges);
        setCurrentEdges(relatedNodes.edges);
      }
    }
  }, [
    activeNodeId,
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    showEnums,
    maxSubTypesPerRow,
    showAssociations,
    currentNodes
  ]);

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
    searchValue,
    searchOptions,
    currentFileName,
    handleSearchChange,
    handleFileUpload,
    handleClearFile,
    handleConnect,
    handleNodeClick,
    handleReset,
    handleBack,
    navigationHistory,
    handleHierarchyToggle,
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
  };
};
