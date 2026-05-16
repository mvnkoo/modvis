import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  Node as ReactFlowNode,
  NodeMouseHandler,
  ReactFlowInstance,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Snackbar, Alert } from '@mui/material';
import { useTheme } from '../../../common/theme/ThemeContext';
import ExpressEntityNode from './nodes/ExpressEntityNode';
import ExpressTypeNode from './nodes/ExpressTypeNode';
import ExpressEnumNode from './nodes/ExpressEnumNode';
import ExpressSelectNode from './nodes/ExpressSelectNode';
import ExpressDomainCardNode from './nodes/ExpressDomainCardNode';
import ExpressLegend from './legend/ExpressLegend';
import ExpressMarkerDefs from './ExpressMarkerDefs';
import ExpressDropOverlay from './ExpressDropOverlay';
import { ExpressEmptyState } from './ExpressEmptyState';
import { ExpressSelectionOverlay } from './ExpressSelectionOverlay';
import { ExpressSideToolbar } from './toolbar/ExpressSideToolbar';
import { ExpressTopToolbar } from './toolbar/ExpressTopToolbar';
import { ExpressInfoPanel } from './sidebar/ExpressInfoPanel';
import { ExpressSettings } from './sidebar/ExpressSettings';
import { useExpressSchema } from '../hooks/useExpressSchema';
import { useExpressLoader } from '../hooks/useExpressLoader';
import { useNavigationHistory, type ExpressNavEntry } from '../hooks/useNavigationHistory';
import { useExpressDiagramExport } from '../hooks/useExpressDiagramExport';
import type {
  ExpressFlowNode,
  ExpressLayoutOptions,
  ExpressSearchOption,
} from '../services/types/ExpressBaseTypes';

const nodeTypes = {
  expressEntityNode: ExpressEntityNode,
  expressTypeNode: ExpressTypeNode,
  expressEnumNode: ExpressEnumNode,
  expressSelectNode: ExpressSelectNode,
  expressDomainCardNode: ExpressDomainCardNode,
};

const DEFAULT_LAYOUT: ExpressLayoutOptions = {
  showFullHierarchy: true,
  useCurvedLines: true,
  showEnums: true,
  showSelects: true,
  useMagicLayout: false,
  forcedExpanded: undefined,
  resetCounter: 0,
  maxComponents: 80,
  limitSubTypes: true,
  maxSubTypesPerRow: 4,
};

const ExpressSchemaExplorerInner: React.FC = () => {
  const { colors, mode } = useTheme();

  const loader = useExpressLoader();
  const [layoutOpts, setLayoutOpts] = useState<ExpressLayoutOptions>(DEFAULT_LAYOUT);

  const schema = useExpressSchema({
    colors,
    source: loader.source,
    layoutOptions: layoutOpts,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<ExpressFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<ExpressFlowNode, Edge> | null>(null);

  useEffect(() => {
    setNodes(schema.nodes);
    setEdges(schema.edges);
  }, [schema.nodes, schema.edges, setNodes, setEdges]);

  useEffect(() => {
    if (!rfInstance || schema.nodes.length === 0) return;
    const handle = window.setTimeout(() => {
      rfInstance.fitView({ padding: 0.4, maxZoom: 0.9, duration: 400 });
    }, 60);
    return () => window.clearTimeout(handle);
  }, [rfInstance, schema.currentNodeId, schema.currentDomain, schema.isOverview, schema.nodes.length, layoutOpts.resetCounter]);

  const history = useNavigationHistory();

  useEffect(() => {
    setLayoutOpts((p) => ({ ...p, forcedExpanded: undefined, useMagicLayout: false }));
  }, [schema.currentNodeId, schema.currentDomain, schema.isOverview]);

  useEffect(() => {
    if (schema.isOverview) {
      history.push({ nodeId: '__overview__', label: 'Übersicht', nodeType: 'OVERVIEW', isOverview: true });
      return;
    }
    if (schema.currentDomain) {
      history.push({
        nodeId: `__domain__${schema.currentDomain}`,
        label: schema.currentDomain,
        nodeType: 'DOMAIN',
        isDomain: true,
      });
      return;
    }
    if (!schema.currentNodeId) return;
    const node = schema.parseResult.nodes.find((n) => n.id === schema.currentNodeId);
    if (!node) return;
    history.push({
      nodeId: node.id,
      label: node.data.label,
      nodeType: node.data.nodeType,
      isAbstract: node.data.isAbstract,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.currentNodeId, schema.currentDomain, schema.isOverview]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node: ReactFlowNode) => {
    if (node.type === 'expressDomainCardNode') {
      const data = node.data as { domainKey?: string; targetId?: string };
      if (data.domainKey) {
        schema.focusDomain(data.domainKey);
        return;
      }
      if (data.targetId) schema.focusNode(data.targetId);
      return;
    }
    schema.focusNode(node.id);
  }, [schema]);

  const applyNavEntry = useCallback((entry: ExpressNavEntry | null) => {
    if (!entry) return;
    if (entry.isOverview) schema.showOverview();
    else if (entry.isDomain) schema.focusDomain(entry.label);
    else schema.focusNode(entry.nodeId);
  }, [schema]);

  const handleBack = useCallback(() => applyNavEntry(history.back()), [history, applyNavEntry]);
  const handleForward = useCallback(() => applyNavEntry(history.forward()), [history, applyNavEntry]);
  const handleJumpHistory = useCallback((idx: number) => {
    applyNavEntry(history.jumpTo(idx));
  }, [history, applyNavEntry]);

  const handleShowOverview = useCallback(() => schema.showOverview(), [schema]);
  const handleResetLayout = useCallback(() => {
    setLayoutOpts((p) => ({
      ...p,
      resetCounter: p.resetCounter + 1,
      useMagicLayout: false,
      forcedExpanded: false,
    }));
  }, []);
  const handleMagicLayout = useCallback(() => {
    setLayoutOpts((p) => {
      const next = !p.useMagicLayout;
      return {
        ...p,
        useMagicLayout: next,
        forcedExpanded: next ? true : undefined,
        resetCounter: p.resetCounter + 1,
      };
    });
  }, []);
  const handleLineTypeToggle = useCallback(() => {
    setLayoutOpts((p) => ({ ...p, useCurvedLines: !p.useCurvedLines }));
  }, []);
  const handleCollapseAll = useCallback(() => {
    setLayoutOpts((p) => ({ ...p, forcedExpanded: false }));
  }, []);
  const handleExpandAll = useCallback(() => {
    setLayoutOpts((p) => ({ ...p, forcedExpanded: true }));
  }, []);
  const setLayoutOption = useCallback(<K extends keyof ExpressLayoutOptions>(k: K, v: ExpressLayoutOptions[K]) => {
    setLayoutOpts((p) => ({ ...p, [k]: v }));
  }, []);

  const exportCtl = useExpressDiagramExport(loader.fileName);

  const [searchValue, setSearchValue] = useState<ExpressSearchOption | null>(null);
  useEffect(() => {
    if (searchValue) {
      schema.focusNode(searchValue.id);
      requestAnimationFrame(() => setSearchValue(null));
    }
  }, [searchValue, schema]);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loader.loadFile(file);
  }, [loader]);

  const hasSchema = loader.source !== null;
  const errorMessage = loader.error;
  const controlsStyle = useMemo(() => ({
    background: colors.paper,
    color: colors.text,
    border: `1px solid ${colors.nodeSection}`,
  }), [colors]);

  return (
    <Box
      sx={{ height: 'calc(100vh - 64px)', position: 'relative', bgcolor: colors.background }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<ExpressFlowNode>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        onNodeClick={onNodeClick}
        colorMode={mode}
        minZoom={0.1}
        maxZoom={1.6}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        proOptions={{ hideAttribution: true }}
        onMouseDown={exportCtl.isSelectingArea ? exportCtl.handleSelectionStart : undefined}
        onMouseMove={exportCtl.isSelectingArea ? exportCtl.handleSelectionMove : undefined}
        onMouseUp={exportCtl.isSelectingArea ? exportCtl.handleSelectionEnd : undefined}
      >
        <ExpressMarkerDefs />
        <Background
          gap={20}
          size={1}
          color={colors.text}
          style={{ opacity: 0.25 }}
          variant={BackgroundVariant.Dots}
        />
        <Controls style={controlsStyle} />

        <Panel position="top-right" style={{ marginTop: 0, marginRight: 0 }}>
          <ExpressLegend
            showEnums={layoutOpts.showEnums}
            showSelects={layoutOpts.showSelects}
            onToggleEnums={(v) => setLayoutOption('showEnums', v)}
            onToggleSelects={(v) => setLayoutOption('showSelects', v)}
          />
        </Panel>

        <Panel position="top-left" style={{ marginTop: 68, marginLeft: 16 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ExpressInfoPanel parseResult={schema.parseResult} fileName={loader.fileName} />
            <ExpressSettings options={layoutOpts} onChange={setLayoutOption} />
            <ExpressSideToolbar
              hasSchema={hasSchema}
              activeNodeId={schema.currentNodeId}
              historyIndex={history.index}
              canGoBack={history.canGoBack}
              canGoForward={history.canGoForward}
              navigationHistory={history.history}
              onJumpToHistoryIndex={handleJumpHistory}
              useCurvedLines={layoutOpts.useCurvedLines}
              exportAnchorEl={exportCtl.exportAnchorEl}
              onShowOverview={handleShowOverview}
              onBack={handleBack}
              onForward={handleForward}
              onLineTypeToggle={handleLineTypeToggle}
              onResetLayout={handleResetLayout}
              onMagicLayout={handleMagicLayout}
              onCollapseAll={handleCollapseAll}
              onExpandAll={handleExpandAll}
              onExportClick={exportCtl.handleExportClick}
              onExportClose={exportCtl.handleExportClose}
              onExportToClipboard={exportCtl.handleExportToClipboard}
              onExportAsPng={exportCtl.handleExportAsPng}
              onExportAsSvg={exportCtl.handleExportAsSvg}
            />
          </Box>
        </Panel>
      </ReactFlow>

      <ExpressSelectionOverlay
        isSelectingArea={exportCtl.isSelectingArea}
        selectionRect={exportCtl.selectionRect}
        onSelectionStart={exportCtl.handleSelectionStart}
        onSelectionMove={exportCtl.handleSelectionMove}
        onSelectionEnd={exportCtl.handleSelectionEnd}
      />

      {!hasSchema && <ExpressEmptyState />}

      <ExpressDropOverlay active={isDragging} />

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={3500}
        onClose={() => undefined}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={exportCtl.toastOpen}
        autoHideDuration={3000}
        onClose={() => exportCtl.setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={exportCtl.toastSeverity}
          onClose={() => exportCtl.setToastOpen(false)}
          sx={{ width: '100%' }}
        >
          {exportCtl.toastMessage}
        </Alert>
      </Snackbar>

      <ExpressTopToolbar
        currentFileName={loader.fileName}
        schemaName={schema.parseResult.schemaName ?? null}
        searchValue={searchValue}
        searchOptions={schema.searchOptions}
        onSearchChange={setSearchValue}
        onFileUpload={loader.loadFile}
        onClearFile={loader.clear}
      />
    </Box>
  );
};

export const ExpressSchemaExplorer: React.FC = () => (
  <ReactFlowProvider>
    <ExpressSchemaExplorerInner />
  </ReactFlowProvider>
);
