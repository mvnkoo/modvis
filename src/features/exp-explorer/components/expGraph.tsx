import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, 
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  Node,
  Edge,
  NodeChange,
  NodeMouseHandler,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AccountTree, Refresh, ArrowBack } from '@mui/icons-material';
import { useTheme } from '../../../common/theme/ThemeContext';
import { CurvedIcon, StraightIcon } from './expIcons';
import ExpEntityNode from './nodes/expEntityNode';
import ExpTypeNode from './nodes/expTypeNode';
import ExpEnumNode from './nodes/expEnumNode';
import { ExpSchemaEdge } from './edges/expEdge';
import { ExpSchemaService } from '../services/expService';
import { SchemaNode } from '../types/expTypes';
import ExpLegend from './legend/expLegend';
import { SearchOption } from '../types/expTypes';


interface NodeData {
  label: string;
  superTypes?: string[];
  subTypes?: string[];
 
}

interface CustomNode extends Node {
  data: NodeData;
}

const nodeTypes = {
  entityNode: ExpEntityNode,
  typeNode: ExpTypeNode,
  enumNode: ExpEnumNode
};

const edgeTypes = {
  typeRef: ExpSchemaEdge
};

interface ExpSchemaFlowProps {
  expressData: string | null;
  mergedData: string | null;
  customExpressData: string | null;
  schemaSource: 'unified' | 'custom';
  searchValue: SearchOption | null;
  hasActiveSchema: boolean;
  onNodeNavigation: () => void;
}

export const ExpSchemaFlow: React.FC<ExpSchemaFlowProps> = ({
  expressData,
  mergedData,
  customExpressData,
  schemaSource,
  searchValue,
  hasActiveSchema,
  onNodeNavigation
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const { colors } = useTheme();
  const [showFullHierarchy, setShowFullHierarchy] = useState(false);
  const [useCurvedLines, setUseCurvedLines] = useState(true);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const schemaData = useMemo(() => {
    const data = schemaSource === 'unified' ? (mergedData || expressData) : customExpressData;
    if (!data) return { nodes: [], edges: [] };
    return ExpSchemaService.parseExpressSchema(data);
  }, [expressData, mergedData, customExpressData, schemaSource]);

  const zoomToFit = useCallback(() => {
    if (!reactFlowInstance || !currentNodeId) return;

   
    const activeNode = nodes.find(node => node.id === currentNodeId) as CustomNode;
    if (!activeNode) return;

   
    const relevantNodes = nodes.filter(node => {
     
      if (node.id === currentNodeId) return true;
      
     
      if (activeNode.data.superTypes?.includes(node.id)) return true;
      
     
      if ((node as CustomNode).data.superTypes?.includes(currentNodeId)) return true;
      
      return false;
    });

   
    setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.5,
        maxZoom: 0.7,
        duration: 500,
        nodes: relevantNodes
      });
    }, 50);
  }, [reactFlowInstance, currentNodeId, nodes]);

  const updateGraphLayout = useCallback((centerNode: SchemaNode) => {
    if (!centerNode) return;

    const relatedNodes = ExpSchemaService.getDirectRelations(
      centerNode,
      schemaData.nodes,
      schemaData.edges,
      colors,
      [],
      showFullHierarchy,
      useCurvedLines
    );

    setNodes(relatedNodes.nodes as CustomNode[]);
    setEdges(relatedNodes.edges as Edge[]);
  }, [schemaData, showFullHierarchy, useCurvedLines, colors, setNodes, setEdges]);

  useEffect(() => {
    if (searchValue) {
      const selectedNode = schemaData.nodes.find(node => node.id === searchValue.id);
      if (selectedNode) {
        setCurrentNodeId(selectedNode.id);
        const relatedNodes = ExpSchemaService.getDirectRelations(
          selectedNode,
          schemaData.nodes,
          schemaData.edges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines
        );

        setNodes(relatedNodes.nodes as CustomNode[]);
        setEdges(relatedNodes.edges as Edge[]);

       
        setTimeout(() => {
          if (reactFlowInstance) {
           
            const activeNode = relatedNodes.nodes.find(n => n.id === selectedNode.id);
            const superTypes = relatedNodes.nodes.filter(n => 
              activeNode?.data.superTypes?.includes(n.id)
            );
            const subTypes = relatedNodes.nodes.filter(n => 
              n.data.superTypes?.includes(selectedNode.id)
            );

           
            reactFlowInstance.fitView({
              padding: 0.5,
              maxZoom: 0.7,
              duration: 500,
              nodes: [activeNode, ...superTypes, ...subTypes].filter(Boolean)
            });
          }
        }, 50);

        onNodeNavigation();
      }
    }
  }, [searchValue, schemaData.nodes, schemaData.edges, colors, showFullHierarchy, useCurvedLines, reactFlowInstance, onNodeNavigation]);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    const schemaNode = schemaData.nodes.find(n => n.id === node.id);
    if (schemaNode) {
      setCurrentNodeId(schemaNode.id);
      
     
      const relatedNodes = ExpSchemaService.getDirectRelations(
        schemaNode,
        schemaData.nodes,
        schemaData.edges,
        colors,
        [],
        showFullHierarchy,
        useCurvedLines
      );

     
      setNodes(relatedNodes.nodes as CustomNode[]);
      setEdges(relatedNodes.edges as Edge[]);
      
     
      setTimeout(() => {
        if (reactFlowInstance) {
         
          const activeNode = relatedNodes.nodes.find(n => n.id === schemaNode.id);
          const superTypes = relatedNodes.nodes.filter(n => 
            activeNode?.data.superTypes?.includes(n.id)
          );
          const subTypes = relatedNodes.nodes.filter(n => 
            n.data.superTypes?.includes(schemaNode.id)
          );

         
          reactFlowInstance.fitView({
            padding: 0.5,
            maxZoom: 0.7,
            duration: 500,
            nodes: [activeNode, ...superTypes, ...subTypes].filter(Boolean)
          });
        }
      }, 50);
      
      const newHistory = [...history.slice(0, historyIndex + 1), schemaNode.id];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      onNodeNavigation();
    }
  }, [schemaData.nodes, schemaData.edges, colors, showFullHierarchy, useCurvedLines, history, historyIndex, onNodeNavigation, reactFlowInstance]);

 
  useEffect(() => {
    if (schemaData.nodes.length > 0 && !currentNodeId) {
      const rootNode = schemaData.nodes.find(node => node.id === 'IfcRoot');
      if (rootNode) {
        setCurrentNodeId(rootNode.id);
        const relatedNodes = ExpSchemaService.getDirectRelations(
          rootNode,
          schemaData.nodes,
          schemaData.edges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines
        );

        setNodes(relatedNodes.nodes as CustomNode[]);
        setEdges(relatedNodes.edges as Edge[]);

       
        setTimeout(() => {
          if (reactFlowInstance) {
           
            const activeNode = relatedNodes.nodes.find(n => n.id === rootNode.id);
            const superTypes = relatedNodes.nodes.filter(n => 
              activeNode?.data.superTypes?.includes(n.id)
            );
            const subTypes = relatedNodes.nodes.filter(n => 
              n.data.superTypes?.includes(rootNode.id)
            );

           
            reactFlowInstance.fitView({
              padding: 0.5,
              maxZoom: 0.7,
              duration: 500,
              nodes: [activeNode, ...superTypes, ...subTypes].filter(Boolean)
            });
          }
        }, 50);
      } else {
       
        const initialNode = schemaData.nodes[0];
        setCurrentNodeId(initialNode.id);
        const relatedNodes = ExpSchemaService.getDirectRelations(
          initialNode,
          schemaData.nodes,
          schemaData.edges,
          colors,
          [],
          showFullHierarchy,
          useCurvedLines
        );

        setNodes(relatedNodes.nodes as CustomNode[]);
        setEdges(relatedNodes.edges as Edge[]);

        setTimeout(() => {
          if (reactFlowInstance) {
            const activeNode = relatedNodes.nodes.find(n => n.id === initialNode.id);
            const superTypes = relatedNodes.nodes.filter(n => 
              activeNode?.data.superTypes?.includes(n.id)
            );
            const subTypes = relatedNodes.nodes.filter(n => 
              n.data.superTypes?.includes(initialNode.id)
            );

            reactFlowInstance.fitView({
              padding: 0.5,
              maxZoom: 0.7,
              duration: 500,
              nodes: [activeNode, ...superTypes, ...subTypes].filter(Boolean)
            });
          }
        }, 50);
      }
    }
  }, [schemaData.nodes, currentNodeId, schemaData.edges, colors, showFullHierarchy, useCurvedLines, reactFlowInstance]);

  const handleReset = useCallback(() => {
    const rootNode = schemaData.nodes.find(node => node.id === 'IfcRoot');
    if (rootNode) {
      setCurrentNodeId(rootNode.id);
      
     
      const relatedNodes = ExpSchemaService.getDirectRelations(
        rootNode,
        schemaData.nodes,
        schemaData.edges,
        colors,
        [],
        showFullHierarchy,
        useCurvedLines
      );

     
      setNodes(relatedNodes.nodes as CustomNode[]);
      setEdges(relatedNodes.edges as Edge[]);
      
     
      setTimeout(() => {
        if (reactFlowInstance) {
         
          const activeNode = relatedNodes.nodes.find(n => n.id === rootNode.id);
          const superTypes = relatedNodes.nodes.filter(n => 
            activeNode?.data.superTypes?.includes(n.id)
          );
          const subTypes = relatedNodes.nodes.filter(n => 
            n.data.superTypes?.includes(rootNode.id)
          );

         
          reactFlowInstance.fitView({
            padding: 0.5,
            maxZoom: 0.7,
            duration: 500,
            nodes: [activeNode, ...superTypes, ...subTypes].filter(Boolean)
          });
        }
      }, 50);

      setHistory([rootNode.id]);
      setHistoryIndex(0);
      onNodeNavigation();
    }
  }, [schemaData.nodes, schemaData.edges, colors, showFullHierarchy, useCurvedLines, reactFlowInstance, onNodeNavigation]);

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const previousNodeId = history[historyIndex - 1];
      const previousNode = schemaData.nodes.find(node => node.id === previousNodeId);
      if (previousNode) {
        setCurrentNodeId(previousNode.id);
        updateGraphLayout(previousNode);
        setHistoryIndex(historyIndex - 1);
        onNodeNavigation();
      }
    }
  }, [history, historyIndex, schemaData.nodes, updateGraphLayout, onNodeNavigation]);

  const handleHierarchyToggle = useCallback(() => {
    setShowFullHierarchy(prev => {
      const newValue = !prev;
      
      if (currentNodeId) {
        const currentNode = schemaData.nodes.find(node => node.id === currentNodeId);
        if (currentNode) {
          const relatedNodes = ExpSchemaService.getDirectRelations(
            currentNode,
            schemaData.nodes,
            schemaData.edges,
            colors,
            [],
            newValue,
            useCurvedLines
          );

          setNodes(relatedNodes.nodes as CustomNode[]);
          setEdges(relatedNodes.edges as Edge[]);
        }
      }
      
      return newValue;
    });
  }, [currentNodeId, schemaData.nodes, schemaData.edges, colors, useCurvedLines, setNodes, setEdges]);

  const handleLineTypeToggle = useCallback(() => {
    setUseCurvedLines(prev => {
      const newValue = !prev;
      
     
      if (currentNodeId) {
        const currentNode = schemaData.nodes.find(node => node.id === currentNodeId);
        if (currentNode) {
          const relatedNodes = ExpSchemaService.getDirectRelations(
            currentNode,
            schemaData.nodes,
            schemaData.edges,
            colors,
            [],
            showFullHierarchy,
            newValue 
          );

          setNodes(relatedNodes.nodes as CustomNode[]);
          setEdges(relatedNodes.edges as Edge[]);
        }
      }
      
      return newValue;
    });
  }, [currentNodeId, schemaData.nodes, schemaData.edges, colors, showFullHierarchy, setNodes, setEdges]);

 
  useEffect(() => {
    if (!hasActiveSchema) {
      setNodes([]);
      setEdges([]);
      setCurrentNodeId(null);
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, [hasActiveSchema, setNodes, setEdges]);

  return (
    <ReactFlowProvider>
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={setReactFlowInstance}
          onNodeClick={onNodeClick}
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        >
          <Background 
            gap={20}
            size={1}
            color={colors.text}
            style={{ opacity: 0.3 }}
            variant={BackgroundVariant.Dots}
          />
          <Controls />
          
          <Panel position="top-right">
            <ExpLegend />
          </Panel>

          <Panel 
            position="top-left" 
            style={{ 
              marginTop: 68,
              marginLeft: 16
            }}
          >
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
              <IconButton
                size="small"
                onClick={handleReset}
                disabled={!hasActiveSchema}
                aria-label="Reset view"
              >
                <Refresh fontSize="small" />
              </IconButton>
              
              <IconButton
                size="small"
                onClick={handleBack}
                disabled={!hasActiveSchema || historyIndex <= 0}
                aria-label="Go back"
              >
                <ArrowBack fontSize="small" />
              </IconButton>

              <IconButton
                size="small"
                onClick={handleHierarchyToggle}
                color={showFullHierarchy ? 'primary' : 'default'}
                aria-label="Toggle hierarchy view"
              >
                <AccountTree fontSize="small" />
              </IconButton>

              <Divider sx={{ my: 0.5 }} />

              <IconButton
                size="small"
                onClick={handleLineTypeToggle}
                aria-label={useCurvedLines ? "Switch to straight lines" : "Switch to curved lines"}
              >
                {useCurvedLines ? <StraightIcon /> : <CurvedIcon />}
              </IconButton>
            </Paper>
          </Panel>
        </ReactFlow>
      </Box>
    </ReactFlowProvider>
  );
};