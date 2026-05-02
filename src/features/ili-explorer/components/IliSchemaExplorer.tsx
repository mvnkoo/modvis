import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  ReactFlowProvider,
  Panel,
  useNodesState,
  useEdgesState,
  Node as ReactFlowNode,
  Edge,
  MarkerType,
  ReactFlowInstance,
  useReactFlow,
  EdgeTypes,
  BezierEdge,
  StepEdge,
  NodeMouseHandler,
  FitViewOptions
} from '@xyflow/react';
import { Box, Paper, Alert, CircularProgress, IconButton, Divider, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Snackbar } from '@mui/material';
import { AccountTree, Refresh, Upload, ArrowBack, AutoFixHigh, ExpandMore, ExpandLess, FileDownload } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useTheme } from '../../../common/theme/ThemeContext';
import { CurvedIcon, StraightIcon } from '../../exp-explorer/components/expIcons';
import { IliLayoutService } from '../services/IliLayoutService';
import {
  IliNode,
  SearchOption,
  NavigationState,
} from '../services/types/IliBaseTypes';

import { IliToolbar } from './toolbar/IliToolbar';
import IliLegend from './legend/IliLegend';
import {
  IliClassNode,
  IliModelNode,
  IliTopicNode,
  IliStructureNode,
  IliEnumNode,
  IliAssociationNode,
  IliUnloadedClassNode,
  IliDomainEnumNode
} from './nodes';
import { useIliSchema } from '../hooks/useIliSchema';
import { useDiagramExport } from '../hooks/useDiagramExport';
import { LayoutSettings } from './sidebar/LayoutSettings';

import '@xyflow/react/dist/style.css';
import { debounce, throttle } from 'lodash';


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
  unloadedClassNode: IliUnloadedClassNode
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
  const { 
    fitView,
    setViewport,
    getViewport,
    getZoom,
  } = useReactFlow();
  const { colors, mode } = useTheme();
  const [useCurvedLines, setUseCurvedLines] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<IliNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const {
    isLoading,
    error,
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

  useEffect(() => {
    if (fitViewRequest === 0) return;
    const id = requestAnimationFrame(() => {
      fitView({
        ...DEFAULT_FIT_VIEW_OPTIONS,
        duration: 800,
        padding: 0.3,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [fitViewRequest, fitView]);

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
    if (historyIndex > 0) {
      baseHandleBack();

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

 
  const throttledFitView = useMemo(
    () => throttle((options: FitViewOptions) => {
      fitView(options);
    }, 100),
    [fitView]
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

  return (
    <Box
      sx={{ position: 'absolute', inset: 0 }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isFileDragging && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1500,
            bgcolor: alpha(colors.primary, 0.1),
            border: `3px dashed ${colors.primary}`,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Paper
            elevation={6}
            sx={{
              px: 4,
              py: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Upload sx={{ fontSize: 48, color: colors.primary }} />
            <Typography variant="h6">INTERLIS-Modell hier ablegen</Typography>
            <Typography variant="caption" sx={{ color: colors.secondaryText }}>
              Nur .ili-Dateien werden akzeptiert
            </Typography>
          </Paper>
        </Box>
      )}

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
        <Box sx={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <Alert severity="error">{error}</Alert>
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
          <LayoutSettings
            maxSubTypesPerRow={maxSubTypesPerRow}
            onMaxSubTypesChange={debouncedHandleMaxSubTypesChange}
          />
          <Paper
            elevation={4}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              p: 0.5,
              bgcolor: 'background.paper',
              borderRadius: 1,
              width: 'fit-content',
              '& .MuiIconButton-root': {
                width: 32,
                height: 32,
                borderRadius: 0.5,
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                '&.Mui-disabled': {
                  bgcolor: 'transparent',
                  color: theme => theme.palette.action.disabled
                }
              }
            }}
          >
            <Tooltip 
              title="Ansicht zurücksetzen" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleReset}
                  disabled={!currentFileName}
                  aria-label="Reset view"
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip 
              title="Zurück zur vorherigen Ansicht" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleBack}
                  disabled={historyIndex <= 0}
                  aria-label="Go back"
                >
                  <ArrowBack fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip 
              title="Vollständige Hierarchie anzeigen" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleHierarchyToggle}
                  disabled={!currentFileName || !activeNodeId}
                  sx={{
                    color: showFullHierarchy ? colors.active : 'default'
                  }}
                  aria-label="Toggle hierarchy view"
                >
                  <AccountTree fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Divider sx={{ my: 0.5 }} />

            <Tooltip 
              title="Linientyp wechseln" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleLineTypeToggle}
                  aria-label="Toggle line type"
                >
                  {useCurvedLines ? <StraightIcon /> : <CurvedIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <Divider sx={{ my: 0.5 }} />

            <Tooltip 
              title="Magic Layout" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleMagicLayout}
                  disabled={!currentFileName || !activeNodeId}
                  aria-label="Magic layout"
                  sx={{
                    color: theme => theme.palette.warning.main,
                    '&:hover': {
                      bgcolor: theme => alpha(theme.palette.warning.main, 0.08)
                    }
                  }}
                >
                  <AutoFixHigh fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip 
              title="Alle Komponenten einklappen" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleCollapseAll}
                  disabled={!currentFileName || !activeNodeId}
                  aria-label="Collapse all nodes"
                >
                  <ExpandLess fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip 
              title="Alle Komponenten ausklappen" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleExpandAll}
                  disabled={!currentFileName || !activeNodeId}
                  aria-label="Expand all nodes"
                >
                  <ExpandMore fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Divider sx={{ my: 0.5 }} />

            <Tooltip 
              title="Als Datei exportieren" 
              placement="right"
            >
              <span>
                <IconButton
                  size="small"
                  onClick={handleExportClick}
                  disabled={!currentFileName || !activeNodeId}
                  aria-label="Export diagram"
                >
                  <FileDownload fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={handleExportClose}
              anchorOrigin={{
                vertical: 'center',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'center',
                horizontal: 'left',
              }}
            >
              <MenuItem onClick={handleExportToClipboard}>
                In Zwischenablage kopieren
              </MenuItem>
              <MenuItem onClick={handleExportAsPng}>
                Als PNG speichern
              </MenuItem>
              <MenuItem onClick={handleExportAsSvg}>
                Als SVG speichern
              </MenuItem>
            </Menu>
          </Paper>
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

      {isSelectingArea && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            cursor: 'crosshair',
            zIndex: 1000,
          }}
          className="selection-overlay"
          onMouseDown={handleSelectionStart}
          onMouseMove={handleSelectionMove}
          onMouseUp={handleSelectionEnd}
          onMouseLeave={handleSelectionEnd}
        >
          <Typography
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              textAlign: 'center',
              pointerEvents: 'none',
              textShadow: '0 0 4px rgba(0,0,0,0.5)',
              userSelect: 'none',
            }}
          >
            Ziehen Sie ein Rechteck, um den Export-Bereich auszuwählen
          </Typography>

          {selectionRect && (
            <div
              style={{
                position: 'absolute',
                left: `${selectionRect.startX}px`,
                top: `${selectionRect.startY}px`,
                width: `${selectionRect.width}px`,
                height: `${selectionRect.height}px`,
                border: '2px solid #2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                pointerEvents: 'none',
                zIndex: 1001,
              }}
            />
          )}
        </div>
      )}
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
