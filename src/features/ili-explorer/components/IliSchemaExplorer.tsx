import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  NodeTypes,
  ReactFlowProvider,
  Panel,
  useNodesState,
  useEdgesState,
  Node as ReactFlowNode,
  Edge,
  MarkerType,
  useReactFlow,
  useNodesInitialized,
  EdgeTypes,
  BezierEdge,
  StepEdge,
  NodeMouseHandler,
} from '@xyflow/react';
import { Box, Alert, CircularProgress, Snackbar } from '@mui/material';
import { useTheme } from '../../../common/theme/ThemeContext';
import {
  IliNode,
  SearchOption,
  NavigationState,
} from '../services/types/IliBaseTypes';

import { IliToolbar } from './toolbar/IliToolbar';
import { IliSideToolbar } from './toolbar/IliSideToolbar';
import { IliSelectionOverlay } from './IliSelectionOverlay';
import { IliDropOverlay } from './IliDropOverlay';
import IliLegend from './legend/IliLegend';
import {
  IliClassNode,
  IliModelNode,
  IliTopicNode,
  IliStructureNode,
  IliEnumNode,
  IliAssociationNode,
  IliUnloadedClassNode,
  IliDomainEnumNode,
  IliTopicLabelNode,
  IliTopicFrameNode
} from './nodes';
import { useIliSchema } from '../hooks/useIliSchema';
import { useDiagramExport } from '../hooks/useDiagramExport';
import { LayoutSettings } from './sidebar/LayoutSettings';
import { ModelInfoPanel } from './sidebar/ModelInfoPanel';

import '@xyflow/react/dist/style.css';
import { debounce } from 'lodash';


interface CustomNode extends ReactFlowNode {
  id: string;
  type: 'modelNode' | 'topicNode' | 'classNode' | 'structureNode' | 'enumNode' | 'associationNode' | 'unloadedClassNode' | 'domainEnumNode';
  data: {
    label: string;
    isHighlighted?: boolean;
    isActive?: boolean;
    [key: string]: any;
  };
}

const nodeTypes: NodeTypes = {
  modelNode: IliModelNode,
  topicNode: IliTopicNode,
  classNode: IliClassNode,
  structureNode: IliStructureNode,
  enumNode: IliEnumNode,
  domainEnumNode: IliDomainEnumNode,
  associationNode: IliAssociationNode,
  unloadedClassNode: IliUnloadedClassNode,
  topicLabelNode: IliTopicLabelNode,
  topicFrameNode: IliTopicFrameNode,
};


const edgeTypes: EdgeTypes = {
  default: BezierEdge,
  step: StepEdge
};

const DEFAULT_FIT_VIEW_OPTIONS = {
  padding: 0.2,
  duration: 500,
  minZoom: 0.2,
  maxZoom: 1.8,
  includeHiddenNodes: false
} as const;


const globalStyles = `
  body.resizing {
    cursor: ew-resize !important;
    user-select: none !important;
  }
  body.resizing * {
    cursor: ew-resize !important;
  }
  .noclick {
    pointer-events: none;
  }
`;

const Flow: React.FC = () => {
  const { fitView, getViewport } = useReactFlow();
  const { colors, mode } = useTheme();
  const [useCurvedLines, setUseCurvedLines] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<IliNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const {
    isLoading,
    error,
    parseWarnings,
    dismissParseWarnings,
    imports,
    interlisVersion,
    searchValue,
    searchOptions,
    currentFileName,
    historyIndex,
    showFullHierarchy,
    handleSearchChange,
    handleFileUpload: handleFileUploadBase,
    handleClearFile,
    handleConnect,
    handleNodeClick: baseHandleNodeClick,
    handleReset: baseHandleReset,
    handleBack: baseHandleBack,
    canGoBack,
    showOverview,
    handleHierarchyToggle,
    activeNodeId,
    setActiveNodeId,
    allNodes,
    allEdges,
    navigationHistory,
    setNavigationHistory,
    setHistoryIndex,
    showEnums,
    handleToggleEnums,
    maxSubTypesPerRow,
    setMaxSubTypesPerRow,
    showAssociations,
    handleToggleAssociations,
    handleMagicLayout,
    applyLayout,
    fitViewRequest,
    requestFitView,
  } = useIliSchema(
    setNodes, 
    setEdges, 
    useCurvedLines, 
    setUseCurvedLines,
    fitView
  );

  const handleFileUpload = useCallback((file: File) => {
    handleFileUploadBase(file);
    setMaxSubTypesPerRow(0);
    setUseCurvedLines(true);
  }, [handleFileUploadBase]);

  const nodesInitialized = useNodesInitialized();
  const [lastFitDone, setLastFitDone] = useState(0);
  const canvasReady = fitViewRequest === 0 || lastFitDone === fitViewRequest;

  useEffect(() => {
    if (fitViewRequest === 0) return;
    if (lastFitDone === fitViewRequest) return;
    if (!nodesInitialized) return;
    if (nodes.length === 0) return;

    const id = requestAnimationFrame(() => {
      fitView({
        ...DEFAULT_FIT_VIEW_OPTIONS,
        duration: 600,
        padding: 0.3,
      });
      setLastFitDone(fitViewRequest);
    });
    return () => cancelAnimationFrame(id);
  }, [nodesInitialized, nodes.length, fitView, fitViewRequest, lastFitDone]);

  const handleLineTypeToggle = useCallback(() => {
    const newCurvedLines = !useCurvedLines;
    
   
    setEdges(currentEdges => currentEdges.map(edge => ({
      ...edge,
      type: newCurvedLines ? 'default' : 'step'
    })));
    
   
    setUseCurvedLines(newCurvedLines);
  }, [useCurvedLines]);

  const [nodePositionsHistory, setNodePositionsHistory] = useState<Map<string, { x: number; y: number }>[]>([]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
    if (node.type === 'topicLabelNode' || node.type === 'topicFrameNode') return;
    if (node.id === activeNodeId) return;


    const nodeType = node.type || 'classNode';
    const nodeTitle = String(node.data?.label || node.data?.title || node.id);
    const isAbstract = Boolean(node.data?.isAbstract);
    
   
    setNavigationHistory(prev => {
      const newEntry: NavigationState = {
        nodeId: node.id,
        showEnums: true,
        showAssociations: true,
        label: nodeTitle,
        type: nodeType,
        isAbstract: isAbstract,
        timestamp: Date.now(),
      };

      const filteredHistory = prev.filter(entry => entry.nodeId !== node.id);
      return [newEntry, ...filteredHistory].slice(0, 7);
    });

    const iliNode: IliNode = {
      ...node,
      type: node.type || 'classNode',
      position: node.position,
      data: {
        ...node.data,
        isHighlighted: false,
        isActive: false
      }
    };

    const currentViewport = getViewport();
    baseHandleNodeClick(event, iliNode, currentViewport);
  }, [activeNodeId, baseHandleNodeClick, getViewport]);

  const handleReset = useCallback(() => {
    baseHandleReset();

    setMaxSubTypesPerRow(4);
    setUseCurvedLines(true);
    requestFitView();
  }, [baseHandleReset, requestFitView, setMaxSubTypesPerRow]);

  const handleBack = useCallback(() => {
    if (historyIndex < 0) return;
    const went = baseHandleBack();
    if (went && historyIndex > 0) {
      setNavigationHistory(prev => {
        const newHistory = [...prev];
        if (newHistory.length > 1) {
          const [first, ...rest] = newHistory;
          return [...rest, first];
        }
        return newHistory;
      });
    }
  }, [baseHandleBack, historyIndex, setNavigationHistory]);

  const handleMaxSubTypesChange = useCallback((value: number) => {
    setMaxSubTypesPerRow(value);
    if (activeNodeId) {
      const currentNode = allNodes.find(n => n.id === activeNodeId);
      if (currentNode) {
        applyLayout(currentNode as IliNode, { maxSubTypesPerRow: value });
      }
    }
  }, [activeNodeId, allNodes, applyLayout, setMaxSubTypesPerRow]);

  const controlsStyle = useMemo(() => ({
    backgroundColor: colors.paper,
    borderColor: colors.nodeSection,
    button: {
      backgroundColor: colors.paper,
      color: colors.text,
      borderColor: colors.nodeSection,
      '&:hover': {
        backgroundColor: colors.nodeSection
      }
    }
  }), [colors]);

  useEffect(() => {
    if (activeNodeId && allNodes.length > 0) {
      const currentNode = allNodes.find(node => node.id === activeNodeId);
      if (currentNode) {
        applyLayout(currentNode as IliNode);
      }
    }
  }, [maxSubTypesPerRow, activeNodeId, allNodes, applyLayout]);

  const handleSearchSelect = useCallback((selectedNode: SearchOption) => {
    if (selectedNode) {
      const newState: NavigationState = {
        nodeId: selectedNode.id,
        showEnums,
        showAssociations
      };
      
      const newHistory = [...navigationHistory.slice(0, historyIndex + 1), newState];
      setNavigationHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      const currentNode = allNodes.find(node => node.id === selectedNode.id);
      if (currentNode) {
        applyLayout(currentNode as IliNode);
        setActiveNodeId(selectedNode.id);
        requestFitView();
      }
    }
  }, [
    navigationHistory,
    historyIndex,
    showEnums,
    showAssociations,
    allNodes,
    applyLayout,
    setNavigationHistory,
    setHistoryIndex,
    setActiveNodeId,
    requestFitView,
  ]);

 
  const handleCollapseAll = useCallback(() => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          expanded: false,
          isExpanded: false
        }
      }))
    );
  }, [setNodes]);

 
  const handleNodeExpand = useCallback((nodeId: string, expanded: boolean) => {
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return { 
            ...node, 
            data: { 
              ...node.data, 
              expanded,
              isExpanded: expanded,
              onExpandChange: (newExpanded: boolean) => handleNodeExpand(node.id, newExpanded)
            } 
          };
        }
        return node;
      })
    );
  }, []);

 
  const nodesWithHandlers = useMemo(() => 
    nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        expanded: node.data.expanded || false,
        onExpandChange: (expanded: boolean) => handleNodeExpand(node.id, expanded)
      }
    }))
  , [nodes, handleNodeExpand]);

 
  const debouncedHandleMaxSubTypesChange = useCallback(
    debounce((value: number) => {
      setMaxSubTypesPerRow(value);
      if (activeNodeId) {
        const currentNode = allNodes.find(n => n.id === activeNodeId);
        if (currentNode) {
          applyLayout(currentNode as IliNode, { maxSubTypesPerRow: value });
        }
      }
    }, 150),
    [activeNodeId, allNodes, applyLayout, setMaxSubTypesPerRow]
  );


 
  const handleExpandAll = useCallback(() => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          expanded: true,
          isExpanded: true,
          onExpandChange: (expanded: boolean) => handleNodeExpand(node.id, expanded)
        }
      }))
    );
  }, [handleNodeExpand]);

 
  const calculateBounds = (nodes: Node[]) => {
    let minY = Infinity;
    let maxY = -Infinity;
    let maxX = -Infinity;

    nodes.forEach(node => {
      const pos = (node as any).position;
      if (pos) {
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        maxX = Math.max(maxX, pos.x);
      }
    });

    return { minY, maxY, maxX };
  };

  const {
    exportAnchorEl,
    handleExportClick,
    handleExportClose,
    handleExportAsPng,
    handleExportToClipboard,
    handleExportAsSvg,
    isSelectingArea,
    selectionRect,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
    toastOpen,
    toastMessage,
    toastSeverity,
    setToastOpen,
    showToast,
  } = useDiagramExport(currentFileName);

  const [isFileDragging, setIsFileDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (isSelectingArea) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsFileDragging(true);
    }
  }, [isSelectingArea]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (isSelectingArea) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsFileDragging(false);
    }
  }, [isSelectingArea]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isSelectingArea) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, [isSelectingArea]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isSelectingArea) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsFileDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ili')) {
      showToast('Nur .ili-Dateien werden unterstützt', 'error');
      return;
    }

    handleFileUpload(file);
  }, [isSelectingArea, handleFileUpload, showToast]);


 
  const debouncedHandleNodeClick = useMemo(
    () => debounce((event: React.MouseEvent, node: ReactFlowNode) => {
      handleNodeClick(event, node);
    }, 100),
    [handleNodeClick]
  );


  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = globalStyles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const modelStats = useMemo(() => {
    let classCount = 0, associationCount = 0, enumCount = 0, unitCount = 0;
    const topics = new Set<string>();
    for (const n of allNodes) {
      const topic = (n.data as any)?.topic;
      if (typeof topic === 'string' && topic.length > 0) topics.add(topic);
      switch (n.type) {
        case 'classNode': classCount++; break;
        case 'associationNode': associationCount++; break;
        case 'enumNode': enumCount++; break;
        case 'domainEnumNode':
          if ((n.data as any)?.type === 'UNIT') unitCount++;
          else enumCount++;
          break;
      }
    }
    return { classCount, topicCount: topics.size, associationCount, enumCount, unitCount };
  }, [allNodes]);

  const lastLoadedFileRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || error) return;
    if (!currentFileName || currentFileName === lastLoadedFileRef.current) return;
    if (allNodes.length === 0) return;
    lastLoadedFileRef.current = currentFileName;
    const classCount = allNodes.filter(n => n.type === 'classNode').length;
    const warnCount = parseWarnings.length;
    const summary = warnCount > 0
      ? `${currentFileName} geladen — ${classCount} Klassen, ${warnCount} ${warnCount === 1 ? 'Warnung' : 'Warnungen'}`
      : `${currentFileName} geladen — ${classCount} Klassen`;
    showToast(summary, warnCount > 0 ? 'warning' : 'success');
  }, [isLoading, error, currentFileName, allNodes, parseWarnings, showToast]);

  useEffect(() => {
    if (!currentFileName) lastLoadedFileRef.current = null;
  }, [currentFileName]);

  return (
    <Box
      sx={{ position: 'absolute', inset: 0 }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <IliDropOverlay visible={isFileDragging} />

      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Box sx={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {parseWarnings.length > 0 && (
        <Box sx={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxWidth: '80%' }}>
          <Alert
            severity="warning"
            onClose={dismissParseWarnings}
            sx={{ '& .MuiAlert-message': { maxWidth: '100%' } }}
          >
            <strong>{parseWarnings.length} Parser-{parseWarnings.length === 1 ? 'Warnung' : 'Warnungen'}</strong>
            {' — einige Stellen konnten von ModVis nicht vollständig interpretiert werden, das angezeigte Diagramm ist daher möglicherweise lückenhaft. '}
            {parseWarnings[0].line ? `Erste Stelle: Zeile ${parseWarnings[0].line}. ` : ''}
            <span style={{ opacity: 0.85 }}>{parseWarnings[0].message}</span>
          </Alert>
        </Box>
      )}

      <IliToolbar
        searchValue={searchValue}
        searchOptions={searchOptions}
        currentFileName={currentFileName}
        onSearchChange={handleSearchChange}
        onFileUpload={handleFileUpload}
        onClearFile={handleClearFile}
        onToggleEnums={handleToggleEnums}
        showEnums={showEnums}
      />

      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edges}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick as unknown as NodeMouseHandler}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={mode}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={1.5}
        style={{ opacity: canvasReady ? 1 : 0, transition: 'opacity 200ms ease-out' }}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: {
            stroke: colors.inheritance,
            strokeWidth: 2
          },
          markerEnd: {
            type: MarkerType.Arrow,
            color: colors.inheritance
          }
        }}
        nodesDraggable={!isSelectingArea}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
        onMouseDown={isSelectingArea ? handleSelectionStart : undefined}
        onMouseMove={isSelectingArea ? handleSelectionMove : undefined}
        onMouseUp={isSelectingArea ? handleSelectionEnd : undefined}
      >
        <Background />
        <Controls style={controlsStyle} />
        
        <Panel position="top-right" style={{ 
          marginTop: 0,
          marginRight: 0,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <IliLegend 
            enumsVisible={showEnums} 
            showAssociations={showAssociations}
            onToggleEnums={handleToggleEnums}
            onToggleAssociations={handleToggleAssociations}
          />
        </Panel>

        <Panel position="top-left" style={{ marginTop: 68, marginLeft: 16 }}>
          <ModelInfoPanel
            fileName={currentFileName}
            classCount={modelStats.classCount}
            topicCount={modelStats.topicCount}
            associationCount={modelStats.associationCount}
            enumCount={modelStats.enumCount}
            unitCount={modelStats.unitCount}
            imports={imports}
            warningCount={parseWarnings.length}
            interlisVersion={interlisVersion}
          />
          <LayoutSettings
            maxSubTypesPerRow={maxSubTypesPerRow}
            onMaxSubTypesChange={debouncedHandleMaxSubTypesChange}
          />
          <IliSideToolbar
            currentFileName={currentFileName}
            activeNodeId={activeNodeId}
            historyIndex={historyIndex}
            canGoBack={canGoBack}
            onShowOverview={showOverview}
            showFullHierarchy={showFullHierarchy}
            useCurvedLines={useCurvedLines}
            exportAnchorEl={exportAnchorEl}
            onReset={handleReset}
            onBack={handleBack}
            onHierarchyToggle={handleHierarchyToggle}
            onLineTypeToggle={handleLineTypeToggle}
            onMagicLayout={handleMagicLayout}
            onCollapseAll={handleCollapseAll}
            onExpandAll={handleExpandAll}
            onExportClick={handleExportClick}
            onExportClose={handleExportClose}
            onExportToClipboard={handleExportToClipboard}
            onExportAsPng={handleExportAsPng}
            onExportAsSvg={handleExportAsSvg}
          />
        </Panel>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".ili"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
            }
          }}
        />
      </ReactFlow>

      {/* Toast-Benachrichtigung hinzufügen */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setToastOpen(false)} 
          severity={toastSeverity}
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>

      <IliSelectionOverlay
        isSelectingArea={isSelectingArea}
        selectionRect={selectionRect}
        onSelectionStart={handleSelectionStart}
        onSelectionMove={handleSelectionMove}
        onSelectionEnd={handleSelectionEnd}
      />
    </Box>
  );
};


export const IliSchemaExplorer: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)',
      position: 'relative'
    }}>
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: colors.background
      }}>
        <ReactFlowProvider>
          <Flow />
        </ReactFlowProvider>
      </Box>
    </Box>
  );
};
