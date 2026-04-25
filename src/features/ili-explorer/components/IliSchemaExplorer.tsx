import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls,
  MiniMap,
  NodeTypes,
  ReactFlowProvider,
  Panel,
  useNodesState,
  useEdgesState,
  Node as ReactFlowNode,
  MarkerType,
  ReactFlowInstance,
  useReactFlow,
  EdgeTypes,
  BezierEdge,
  StepEdge,
  NodeMouseHandler,
  FitViewOptions
} from 'reactflow';
import { Box, Paper, Alert, CircularProgress, IconButton, Divider, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Snackbar } from '@mui/material';
import { AccountTree, Refresh, Upload, ArrowBack, AutoFixHigh, ExpandMore, ExpandLess, FileDownload } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useTheme } from '../../../common/theme/ThemeContext';
import { CurvedIcon, StraightIcon } from '../../exp-explorer/components/expIcons';
import { IliLayoutService } from '../services/IliLayoutService';

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
import { LayoutSettings } from './sidebar/LayoutSettings';

import 'reactflow/dist/style.css';
import { debounce, throttle } from 'lodash';
import { toPng, toSvg } from 'html-to-image';


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


interface SelectionRect {
  startX: number;
  startY: number;
  width: number;
  height: number;
}


interface IliNode extends ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    isHighlighted?: boolean;
    isActive?: boolean;
    [key: string]: any;
  };
}

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
    project
  } = useReactFlow();
  const { colors } = useTheme();
  const [useCurvedLines, setUseCurvedLines] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
    const nodeTitle = node.data?.label || node.data?.title || node.id;
    const isAbstract = node.data?.isAbstract || false;
    
   
    setNavigationHistory(prev => {
      const newEntry: HistoryEntry = {
        id: node.id,
        label: nodeTitle, 
        type: nodeType,   
        isAbstract: isAbstract,
        timestamp: Date.now()
      };
      
     
      const filteredHistory = prev.filter(entry => entry.id !== node.id);
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

    const relatedNodes = IliLayoutService.getDirectRelations(
      iliNode,
      allNodes as IliNode[],
      allEdges,
      colors,
      [],
      showFullHierarchy,
      useCurvedLines,
      showEnums,
      maxSubTypesPerRow
    );

    const currentViewport = getViewport();
    baseHandleNodeClick(event, iliNode, currentViewport);

    setTimeout(() => {
      fitView({
        ...DEFAULT_FIT_VIEW_OPTIONS,
        duration: 800,
        padding: 0.3,
        includeHiddenNodes: false
      });
    }, 100);
  }, [
    activeNodeId,
    baseHandleNodeClick,
    getViewport,
    fitView,
    nodes,
    historyIndex
  ]);

  const handleReset = useCallback(() => {
    baseHandleReset();
    
    setMaxSubTypesPerRow(4);
    setUseCurvedLines(true);
    
   
    const initialState: NavigationState = {
      nodeId: 'VSA_BaseClass',
      showEnums: true,
      showAssociations: true
    };
    
    setActiveNodeId(initialState.nodeId);
    setNavigationHistory([initialState]);
    setHistoryIndex(0);
    
    setTimeout(() => {
      fitView({ 
        padding: 0.2,
        duration: 200
      });
    }, 50);
  }, [baseHandleReset, setActiveNodeId, setNavigationHistory, setHistoryIndex, fitView]);

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const shouldGoBack = baseHandleBack();
      
      if (shouldGoBack) {
        setTimeout(() => {
          fitView({
            padding: 0.2,
            duration: 800,
            minZoom: 0.5,
            maxZoom: 1.5
          });
        }, 50);
      }

     
      setNavigationHistory(prev => {
        const newHistory = [...prev];
       
        if (newHistory.length > 1) {
          const [first, ...rest] = newHistory;
          return [...rest, first];
        }
        return newHistory;
      });
    }
  }, [baseHandleBack, fitView]);

  const handleMaxSubTypesChange = useCallback((value: number) => {
    setMaxSubTypesPerRow(value);
    if (activeNodeId) {
      const currentNode = allNodes.find(n => n.id === activeNodeId);
      if (currentNode) {
        const relatedNodes = IliLayoutService.getDirectRelations(
          currentNode,
          allNodes,
          allEdges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines,
          showEnums,
          value
        );

        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
      }
    }
  }, [activeNodeId, allNodes, allEdges, colors, showFullHierarchy, useCurvedLines, showEnums, setNodes, setEdges]);

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
    if (activeNodeId && allNodes.length > 0 && (maxSubTypesPerRow !== undefined)) {
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
          maxSubTypesPerRow
        );
        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
      }
    }
  }, [maxSubTypesPerRow, activeNodeId]);

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

        setNodes(relatedNodes.nodes);
        setEdges(relatedNodes.edges);
        setActiveNodeId(selectedNode.id);

        setTimeout(() => {
          fitView({
            padding: 0.2,
            duration: 800,
            minZoom: 0.2,
            maxZoom: 1.8
          });
        }, 100);
      }
    }
  }, [
    navigationHistory,
    historyIndex,
    showEnums,
    showAssociations,
    allNodes,
    allEdges,
    colors,
    showFullHierarchy,
    useCurvedLines,
    maxSubTypesPerRow,
    setNodes,
    setEdges,
    setActiveNodeId,
    fitView
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
          const relatedNodes = IliLayoutService.getDirectRelations(
            currentNode,
            allNodes,
            allEdges,
            colors,
            [],
            showFullHierarchy,
            useCurvedLines,
            showEnums,
            value
          );

          setNodes(relatedNodes.nodes);
          setEdges(relatedNodes.edges);
        }
      }
    }, 150),
    [activeNodeId, allNodes, allEdges, colors, showFullHierarchy, useCurvedLines, showEnums]
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

  const [isExporting, setIsExporting] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClipboardExport, setIsClipboardExport] = useState(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

 
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

 
  const handleExportClose = useCallback(() => {
    setExportAnchorEl(null);
  }, []);

 
  const handleExportClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  }, []);

  const handleExportAsPng = useCallback(() => {
    if (isExporting) return;
    setIsExporting(true);
    setIsClipboardExport(false);
    setIsSelectingArea(true);
    handleExportClose();
    setTimeout(() => setIsExporting(false), 500);
  }, [isExporting, handleExportClose]);

  const handleExportToClipboard = useCallback(() => {
    if (isExporting) return;
    setIsExporting(true);
    setIsClipboardExport(true);
    setIsSelectingArea(true);
    handleExportClose();
    setTimeout(() => setIsExporting(false), 500);
  }, [isExporting, handleExportClose]);

 
  const handleSelectionStart = useCallback((event: React.MouseEvent) => {
    if (!isSelectingArea) return;
    
   
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    selectionStartRef.current = { x, y };
    setIsDragging(true);
    setSelectionRect({
      startX: x,
      startY: y,
      width: 0,
      height: 0
    });

   
    event.preventDefault();
  }, [isSelectingArea]);

  const handleSelectionMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || !selectionStartRef.current) return;
    
   
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    setSelectionRect({
      startX: selectionStartRef.current.x,
      startY: selectionStartRef.current.y,
      width: currentX - selectionStartRef.current.x,
      height: currentY - selectionStartRef.current.y
    });

   
    event.preventDefault();
  }, [isDragging]);

  const handleSelectionEnd = useCallback(() => {
    if (!isDragging || !selectionRect || isExporting) return;
    
    const flowElement = document.querySelector('.react-flow');
    if (!flowElement) return;

    setIsExporting(true);

    const viewport = getViewport();
    const zoom = getZoom();
    
   
    const headerOffset = 36;
    const toolbarOffset = 28;
    const totalOffset = headerOffset + toolbarOffset;
    
   
    const normalizedRect = {
      x: Math.min(selectionRect.startX, selectionRect.startX + selectionRect.width),
      y: Math.min(selectionRect.startY, selectionRect.startY + selectionRect.height) - totalOffset,
      width: Math.abs(selectionRect.width),
      height: Math.abs(selectionRect.height)
    };

   
    const flowRect = {
      x: (normalizedRect.x - viewport.x * zoom) / zoom,
      y: (normalizedRect.y - viewport.y * zoom) / zoom,
      width: normalizedRect.width / zoom,
      height: normalizedRect.height / zoom
    };

   
    const tempStyle = document.createElement('style');
    tempStyle.innerHTML = `
      .react-flow__background { display: none !important; }
      .react-flow { background-color: ${isClipboardExport ? 'transparent' : 'white'} !important; }
      .react-flow__handle { opacity: 0 !important; }
      .react-flow__controls,
      .react-flow__minimap,
      .selection-overlay { display: none !important; }
    `;
    document.head.appendChild(tempStyle);

   
    const elementsToHide = document.querySelectorAll(
      '.react-flow__controls, .search-toolbar, .layout-settings, .side-toolbar, .upload-area'
    );
    elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

    const exportOptions = {
      quality: 1,
      pixelRatio: window.devicePixelRatio * 4,
      backgroundColor: isClipboardExport ? undefined : '#ffffff',
      filter: (node: HTMLElement) => {
        return !node.classList?.contains('react-flow__background') &&
               !node.classList?.contains('react-flow__controls') &&
               !node.classList?.contains('react-flow__minimap') &&
               !node.classList?.contains('search-toolbar') &&
               !node.classList?.contains('layout-settings') &&
               !node.classList?.contains('side-toolbar') &&
               !node.classList?.contains('upload-area') &&
               !node.classList?.contains('hidden-for-export') &&
               !node.classList?.contains('selection-overlay');
      },
      width: normalizedRect.width,
      height: normalizedRect.height,
      style: {
        transform: `
          translate(${-normalizedRect.x}px, ${-normalizedRect.y}px)
          scale(${1})
        `,
        transformOrigin: 'top left',
        width: `${flowElement.clientWidth}px`,
        height: `${flowElement.clientHeight}px`
      }
    };

   
    toPng(flowElement as HTMLElement, exportOptions)
      .then(dataUrl => {
        if (isClipboardExport) {
          return fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
              return navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
            })
            .then(() => {
              setToastMessage('Diagramm wurde in die Zwischenablage kopiert');
              setToastSeverity('success');
              setToastOpen(true);
            });
        } else {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${currentFileName?.replace('.ili', '') || 'diagram'}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      })
      .catch(error => {
        console.error('Export error:', error);
        setToastMessage('Fehler beim Exportieren des Diagramms');
        setToastSeverity('error');
        setToastOpen(true);
      })
      .finally(() => {
       
        tempStyle.remove();
        elementsToHide.forEach(el => (el as HTMLElement).style.display = '');
        
        setIsExporting(false);
        setIsDragging(false);
        setIsSelectingArea(false);
        setSelectionRect(null);
        selectionStartRef.current = null;
        setIsClipboardExport(false);
      });
  }, [
    isDragging, 
    selectionRect, 
    currentFileName, 
    getZoom, 
    getViewport, 
    isClipboardExport,
    isExporting
  ]);

 
  const debouncedHandleNodeClick = useMemo(
    () => debounce((event: React.MouseEvent, node: Node) => {
      handleNodeClick(event, node);
    }, 100),
    [handleNodeClick]
  );

 
  const handleExportAsSvg = useCallback(() => {
    if (isExporting) return;
    
    const flowElement = document.querySelector('.react-flow');
    if (!flowElement) return;

    setIsExporting(true);
    handleExportClose();

   
    const tempStyle = document.createElement('style');
    tempStyle.innerHTML = `
      .react-flow__background { display: none !important; }
      .react-flow { background-color: white !important; }
      .react-flow__handle { opacity: 0 !important; }
      .react-flow__controls,
      .react-flow__minimap,
      .selection-overlay { display: none !important; }
    `;
    document.head.appendChild(tempStyle);

   
    const elementsToHide = document.querySelectorAll(
      '.react-flow__controls, .search-toolbar, .layout-settings, .side-toolbar, .upload-area'
    );
    elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

    const exportOptions = {
      filter: (node: HTMLElement) => {
        return !node.classList?.contains('react-flow__background') &&
               !node.classList?.contains('react-flow__controls') &&
               !node.classList?.contains('react-flow__minimap') &&
               !node.classList?.contains('search-toolbar') &&
               !node.classList?.contains('layout-settings') &&
               !node.classList?.contains('side-toolbar') &&
               !node.classList?.contains('upload-area') &&
               !node.classList?.contains('hidden-for-export') &&
               !node.classList?.contains('selection-overlay');
      },
      style: {
        backgroundColor: 'white'
      }
    };

    toSvg(flowElement as HTMLElement, exportOptions)
      .then(dataUrl => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${currentFileName?.replace('.ili', '') || 'diagram'}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(error => {
        console.error('SVG Export error:', error);
        setToastMessage('Fehler beim Exportieren des Diagramms als SVG');
        setToastSeverity('error');
        setToastOpen(true);
      })
      .finally(() => {
       
        tempStyle.remove();
        elementsToHide.forEach(el => (el as HTMLElement).style.display = '');
        setIsExporting(false);
      });
  }, [currentFileName, handleExportClose, isExporting]);

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = globalStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <>
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
    </>
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