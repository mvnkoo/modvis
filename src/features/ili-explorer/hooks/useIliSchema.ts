import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Node, Edge, Connection, MarkerType, FitViewOptions } from 'reactflow';
import { useTheme } from '../../../common/theme/ThemeContext';
import { IliSchemaService } from '../services/iliSchemaService';
import { IliLayoutService } from '../services/IliLayoutService';
import { IliBaseNode, IliRelation, IliClassNode } from '../services/types/IliBaseTypes';

// Define IliNode type that extends ReactFlow Node with additional properties
interface IliNode extends Node {
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    isHighlighted: boolean;
    isActive: boolean;
    [key: string]: any;
  };
}

// Search option interface for node search functionality
export interface SearchOption {
  id: string;
  label: string;
  type: string;
  description: string;
  category: string;
}

// Return type for the useIliSchema hook containing all state and handlers
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
  setNavigationHistory: (history: NavigationState[]) => void;
  setHistoryIndex: (index: number) => void;
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

// State interface for nodes, edges and search options
interface NodeState {
  nodes: Node[];
  edges: Edge[];
  searchOptions: SearchOption[];
}

// State interface for viewport position and zoom level
interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

// State interface for navigation history including enum and association visibility
interface NavigationState {
  nodeId: string;
  showEnums: boolean;
  showAssociations: boolean;
}

export const useIliSchema = (
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  useCurvedLines: boolean,
  setUseCurvedLines: (value: boolean) => void,
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

  // Store IliSchemaService instance in a ref to persist between renders
  const schemaServiceRef = useRef<IliSchemaService>(new IliSchemaService());

  // Add a ref to track resize state
  const isResizingRef = useRef(false);

  // Generate search options from ILI nodes, sorted by category and label
  const generateSearchOptions = useCallback((nodes: IliBaseNode[]): SearchOption[] => {
    const options: SearchOption[] = [];

    // Add nodes as search options
    nodes.forEach(node => {
      // Skip MODEL nodes and other unwanted types
      if (node.type === 'MODEL') return;
      
      // Only include specific node types
      const validTypes = ['CLASS', 'STRUCTURE', 'TOPIC', 'ENUMERATION'];
      if (!validTypes.includes(node.type)) return;

      options.push({
        id: node.id,
        label: node.name,
        type: node.type,
        description: `${node.type} ${node.isAbstract ? '(Abstract)' : ''}`,
        category: node.type === 'CLASS' ? 'Classes' : 
                 node.type === 'STRUCTURE' ? 'Structures' : 
                 node.type === 'TOPIC' ? 'Topics' : 
                 'Enumerations'
      });

      // Add attributes as search options for CLASS nodes
      if (node.type === 'CLASS') {
        const classNode = node as IliClassNode;
        if (classNode.attributes) {
          classNode.attributes.forEach(attr => {
            options.push({
              id: `${node.id}.${attr.name}`,
              label: `${attr.name} (${node.name})`,
              type: 'ATTRIBUTE',
              description: `${attr.type}${attr.mandatory ? ', Mandatory' : ''}`,
              category: 'Attributes'
            });
          });
        }
      }
    });

    // Sort options by category and label
    return options.sort((a, b) => {
      // Sort first by category
      const categoryOrder = ['Classes', 'Topics', 'Structures', 'Enumerations', 'Attributes'];
      const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      
      // Then sort by label
      return a.label.localeCompare(b.label);
    });
  }, []);

  // Filter and layout nodes and edges based on selected node
  const filterNodesAndEdges = useCallback((nodeId: string | null = null) => {
    // Cache layout results to improve performance
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
      const firstAbstractClass = allNodes.find(n => 
        n.type === 'classNode' && n.data.isAbstract
      );
      if (firstAbstractClass) {
        const relatedNodes = IliLayoutService.getDirectRelations(
          firstAbstractClass,
          allNodes,
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          showEnums,
          4  // Use fixed value of 4 instead of maxSubTypesPerRow
        );

        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setActiveNodeId(firstAbstractClass.id);
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
      maxSubTypesPerRow  // Use maxSubTypesPerRow for dynamic layout
    );

    setNodes(relatedNodes.nodes);
    setEdges(relatedNodes.edges);
    setActiveNodeId(nodeId);

    // Cache the layout result
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
    maxSubTypesPerRow  // Wichtig: maxSubTypesPerRow als Dependency hinzufügen
  ]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // 1. Setze zuerst alle States zurück
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

      // 2. Setze die Layout-Einstellung
      setMaxSubTypesPerRow(4);

      // 3. Starte den Ladeprozess
      setIsLoading(true);
      setCurrentFileName(file.name);

      const content = await file.text();
      schemaServiceRef.current.parseSchema(content);

      const baseNodes = schemaServiceRef.current.getNodes();
      const relations = schemaServiceRef.current.getRelations();

      const flowNodes = baseNodes.map(node => ({
        id: node.id,
        type: node.type === 'ASSOCIATION' ? 'associationNode' : `${node.type.toLowerCase()}Node`,
        position: { x: 0, y: 0 },
        draggable: true,
        data: {
          ...node,
          label: node.name,
          isHighlighted: false,
          isActive: false,
          expanded: false
        }
      }));

      const flowEdges = relations
        .filter(relation => relation.type === 'EXTENDS')
        .map(relation => ({
          id: relation.id,
          source: relation.sourceId,
          target: relation.targetId,
          type: useCurvedLines ? 'default' : 'step',
          animated: false,
          style: { stroke: colors.inheritance, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.Arrow,
            color: colors.inheritance
          }
        }));

      // 4. Setze die Basis-Daten
      setAllNodes(flowNodes);
      setAllEdges(flowEdges);
      setSearchOptions(generateSearchOptions(baseNodes));

      // 5. Finde und setze die erste abstrakte Klasse
      const firstAbstractClass = flowNodes.find(n => 
        n.type === 'classNode' && n.data.isAbstract
      ) as IliNode;

      if (firstAbstractClass) {
        // 6. Aktualisiere die Ansicht mit garantiertem maxSubTypesPerRow = 4
        const relatedNodes = IliLayoutService.getDirectRelations(
          firstAbstractClass as IliNode,
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

        // 7. Setze die finale Ansicht
        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setActiveNodeId(firstAbstractClass.id);
        setNavigationHistory([{
          nodeId: firstAbstractClass.id,
          showEnums: true,
          showAssociations: showAssociations
        }]);
        setHistoryIndex(0);

        // 8. Stelle sicher, dass die Layout-Einstellung beibehalten wird
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
    setNodes, 
    setEdges, 
    generateSearchOptions
  ]);

  const handleSearchChange = useCallback((option: SearchOption | null) => {
    setSearchValue(option);
    if (option) {
      // Bei Attributen die Klassen-ID extrahieren
      const nodeId = option.type === 'ATTRIBUTE' 
        ? option.id.split('.')[0]  // Format ist "klassenId.attributName"
        : option.id;

      const processedNode = {
        ...option,
        id: nodeId,  // Verwende die Klassen-ID für Attribute
        type: option.type === 'ENUMERATION' ? 'enumNode' : 'CLASS',  // Bei Attributen immer 'CLASS' verwenden
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
      
      // Fit view to show all nodes
      setTimeout(() => {
        fitView({ duration: 500, padding: 0.2 });
      }, 50);
      
      // Suchfeld nach kurzer Verzögerung zurücksetzen
      setTimeout(() => {
        setSearchValue(null);
      }, 100);
    } else {
      // Wenn keine Option ausgewählt ist, zeige initiale Ansicht
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
    
    // Reset node widths when switching nodes
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

    // Check the ref instead of the undefined variable
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
    // Setze die History-Maps zurück
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
    
    // Setze die States auf ihre Standardwerte
    setShowEnums(true);
    setShowAssociations(true);
    
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
        true, // showEnums auf true
        maxSubTypesPerRow,
        true  // showAssociations auf true
      );

      setNodes(relatedNodes.nodes);
      setEdges(relatedNodes.edges);
      setActiveNodeId(firstAbstractClass.id);
      
      // Initialisiere die History mit den Standard-Werten
      const initialState: NavigationState = {
        nodeId: firstAbstractClass.id,
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
        // Stelle den vorherigen showAssociations-Status wieder her
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

        // Verzögere den fitView-Aufruf leicht
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
    // Setze beide States zurück
    setShowEnums(true);
    setShowAssociations(true);
    // Setze die History-Maps zurück
    setEnumHistory(new Map());
    setAssociationHistory(new Map());
  }, [setNodes, setEdges]);

  const handleHierarchyToggle = useCallback(() => {
    setShowFullHierarchy(prev => !prev);
    return true; // Expliziter Return für Type-Safety
  }, []);

  const handleToggleEnums = useCallback((visible: boolean) => {
    setShowEnums(visible);
    
    if (activeNodeId) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        // Speichere aktuelle Node-Positionen und Expanded-States
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

        // Stelle die gespeicherten Zustände wieder her
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
    currentNodes // Wichtig: currentNodes als Dependency hinzufügen
  ]);

  // Cleanup Effect
  useEffect(() => {
    return () => {
      // Cleanup bei Unmount, aber maxSubTypesPerRow nicht zurücksetzen
      setNodes([]);
      setEdges([]);
      setSearchOptions([]);
    };
  }, []);

  // initiale Konfiguration
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
          showAssociations  // Wichtig: Übergebe aktuellen Status
        );
        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setActiveNodeId(firstAbstractClass.id);
        setNavigationHistory([firstAbstractClass.id]);
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
    showAssociations,  // Wichtig: Als Dependency hinzufügen
    setNodes,
    setEdges
  ]);

  // Effect, der auf maxSubTypesPerRow Änderungen reagiert
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

  // Effect zum Synchronisieren der lokalen States
  useEffect(() => {
    setCurrentNodes(prevNodes => prevNodes);
    setCurrentEdges(prevEdges => prevEdges);
  }, []);

  const handleLineTypeToggle = useCallback(() => {
    setUseCurvedLines(prev => {
      const newValue = !prev;
      
      const expandedStates = new Map<string, boolean>(
        currentNodes.map(node => [node.id, node.data?.expanded || false])
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

    // Setzen des globalen Status
    setShowAssociations(visible);
    
    // Aktualisiere die aktuelle Ansicht mit dem neuen Status
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
                visible  // Verwende den neuen Status
            );

            setNodes(relatedNodes.nodes);
            setEdges(relatedNodes.edges);

            // Aktualisiere auch den History-Eintrag
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
        // Speichere den aktuellen Expanded-Status aller Nodes
        const expandedStates = new Map(
          currentNodes.map(node => [
            node.id,
            {
              expanded: true, // Setze alle Nodes auf expanded
              isExpanded: true, // Setze alle Nodes auf isExpanded
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
          true  // useMagicLayout
        );

        // Stelle den Expanded-Status für alle Nodes auf expanded=true
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
    // Use the ref instead of a local variable
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

    // Clear the resize flag after a short delay
    setTimeout(() => {
      isResizingRef.current = false;
    }, 100);
  }, []);

  // Update the createNode function
  const createNode = useCallback((node: IliBaseNode) => {
    const width = nodeWidths.get(node.id) || 400;
    return {
      ...node,
      data: {
        ...node.data,
        width,
        onResize: (newWidth: number) => handleNodeResize(node.id, newWidth)
      }
    };
  }, [nodeWidths, handleNodeResize]);

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

// Extrahiere wiederverwendbare Logik in separate Hooks
export const useNodeManagement = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  const updateNodeLayout = useCallback((nodeId: string, layout: Partial<Node>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...layout } : node
    ));
  }, []);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    updateNodeLayout
  };
};

export const useNavigationState = () => {
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const navigateTo = useCallback((state: NavigationState) => {
    setNavigationHistory(prev => [...prev.slice(0, historyIndex + 1), state]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  return {
    navigationHistory,
    historyIndex,
    navigateTo,
    setHistoryIndex
  };
}; 