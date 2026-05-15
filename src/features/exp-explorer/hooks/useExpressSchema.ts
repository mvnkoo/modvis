import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Edge } from '@xyflow/react';
import { ExpressParser } from '../services/parser/ExpressParser';
import { getDirectRelations } from '../services/layout/getDirectRelations';
import { layoutOverview } from '../services/layout/overviewStrategy';
import { relationToEdge } from '../services/flowMapping';
import type {
  ExpressFlowNode,
  ExpressLayoutOptions,
  ExpressParseResult,
  ExpressSearchOption,
} from '../services/types/ExpressBaseTypes';
import type { ThemeColors } from '../../../common/theme/ThemeContext';

export interface UseExpressSchemaArgs {
  colors: ThemeColors;
  source: string | null;
  layoutOptions: ExpressLayoutOptions;
}

export interface UseExpressSchemaResult {
  parseResult: ExpressParseResult;
  nodes: ExpressFlowNode[];
  edges: Edge[];
  currentNodeId: string | null;
  isOverview: boolean;
  focusNode: (id: string) => void;
  showOverview: () => void;
  resetToRoot: () => void;
  searchOptions: ExpressSearchOption[];
}

export function useExpressSchema({
  colors,
  source,
  layoutOptions,
}: UseExpressSchemaArgs): UseExpressSchemaResult {
  const parseResult = useMemo<ExpressParseResult>(() => {
    if (!source) {
      return { nodes: [], relations: [], errors: [], warnings: [] };
    }
    return new ExpressParser().parseContent(source);
  }, [source]);

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isOverview, setIsOverview] = useState(true);

  useEffect(() => {
    setIsOverview(true);
    setCurrentNodeId(null);
  }, [source]);

  const initialFocus = useMemo(() => {
    if (parseResult.nodes.length === 0) return null;
    return (
      parseResult.nodes.find((n) => n.id === 'IfcRoot')?.id ??
      parseResult.nodes.find((n) => n.data.nodeType === 'ENTITY')?.id ??
      parseResult.nodes[0]?.id ??
      null
    );
  }, [parseResult.nodes]);

  const effectiveId = currentNodeId ?? initialFocus;
  const center = effectiveId
    ? parseResult.nodes.find((n) => n.id === effectiveId) ?? null
    : null;

  const { nodes, edges } = useMemo(() => {
    if (parseResult.nodes.length === 0) {
      return { nodes: [] as ExpressFlowNode[], edges: [] as Edge[] };
    }
    if (isOverview) {
      const overviewNodes = layoutOverview(parseResult.nodes, {
        maxComponents: layoutOptions.maxComponents,
      }).map((n) => applyForcedExpanded(n, layoutOptions.forcedExpanded));
      return { nodes: overviewNodes, edges: [] as Edge[] };
    }
    if (!center) return { nodes: [] as ExpressFlowNode[], edges: [] as Edge[] };
    const { nodes: positioned, visibleRelations } = getDirectRelations(
      center,
      parseResult.nodes,
      parseResult.relations,
      layoutOptions,
    );
    const xyEdges = visibleRelations.map((r) =>
      relationToEdge(r, colors, layoutOptions.useCurvedLines, center.id),
    );
    const withForced = positioned.map((n) =>
      applyForcedExpanded(n, layoutOptions.forcedExpanded),
    );
    return { nodes: withForced, edges: xyEdges };
  }, [
    isOverview,
    center,
    parseResult.nodes,
    parseResult.relations,
    layoutOptions,
    colors,
  ]);

  const focusNode = useCallback((id: string) => {
    setIsOverview(false);
    setCurrentNodeId(id);
  }, []);

  const showOverview = useCallback(() => {
    setIsOverview(true);
  }, []);

  const resetToRoot = useCallback(() => {
    setIsOverview(false);
    setCurrentNodeId(initialFocus);
  }, [initialFocus]);

  const searchOptions = useMemo<ExpressSearchOption[]>(() => {
    return parseResult.nodes
      .map((n) => ({
        id: n.id,
        label: n.data.label,
        type: n.data.nodeType,
        description:
          n.data.nodeType === 'ENTITY'
            ? n.data.superTypes && n.data.superTypes.length
              ? `Entity — subtype of ${n.data.superTypes.join(', ')}`
              : 'Entity'
            : n.data.nodeType === 'TYPE'
              ? `Type — ${n.data.baseType ?? ''}`
              : n.data.nodeType === 'ENUM'
                ? `Enumeration (${n.data.enumValues?.length ?? 0} values)`
                : `Select (${n.data.selectMembers?.length ?? 0} members)`,
        category: domainForName(n.data.label),
      }))
      .sort((a, b) => {
        const c = a.category.localeCompare(b.category);
        return c !== 0 ? c : a.label.localeCompare(b.label);
      });
  }, [parseResult.nodes]);

  return {
    parseResult,
    nodes,
    edges,
    currentNodeId: isOverview ? null : effectiveId,
    isOverview,
    focusNode,
    showOverview,
    resetToRoot,
    searchOptions,
  };
}

function applyForcedExpanded(
  node: ExpressFlowNode,
  forced: boolean | undefined,
): ExpressFlowNode {
  return {
    ...node,
    data: { ...node.data, forcedExpanded: forced },
  };
}

function domainForName(name: string): string {
  const m = name.match(/^Ifc([A-Z][a-z]+)/);
  return m ? m[1] : 'Other';
}
