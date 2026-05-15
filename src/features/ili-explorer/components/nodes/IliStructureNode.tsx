import React, { memo, useMemo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import { IliStructureNode as IliStructureNodeType } from '../../services/types/IliModelTypes';
import { IliAttribute } from '../../services/types/IliBaseTypes';

interface StructureNodeProps {
  data: IliStructureNodeType & {
    label: string;
    isHighlighted?: boolean;
    topicName?: string;
    expanded?: boolean;
    isExpanded?: boolean;
    onExpandChange?: (expanded: boolean) => void;
  };
}

interface AttributeRowProps {
  attribute: IliAttribute;
}

const AttributeRow: React.FC<AttributeRowProps> = memo(({ attribute }) => {
  const { colors } = useTheme();

  const tooltipContent = useMemo(() => (
    <Box sx={{ p: 1, maxWidth: 400 }}>
      {attribute.comment && (
        <Typography variant="caption" sx={{
          display: 'block',
          whiteSpace: 'pre-wrap',
          color: 'text.secondary'
        }}>
          {attribute.comment}
        </Typography>
      )}
      {(attribute.isEnum || attribute.isDomainEnum) && attribute.enumValues && (
        <Box sx={{ mt: attribute.comment ? 1 : 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
            Mögliche Werte:
          </Typography>
          {attribute.enumValues.map((enumValue, index) => (
            <Box key={index} sx={{ ml: 1 }}>
              <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                • {enumValue.value}
                {enumValue.subValues?.map((subValue, subIndex) => (
                  <Box key={`${index}-${subIndex}`} sx={{ ml: 2 }}>
                    <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                      ∟ {subValue.value}
                    </Typography>
                  </Box>
                ))}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {!attribute.isEnum && !attribute.isDomainEnum && attribute.type.includes('..') && (
        <Box sx={{ mt: attribute.comment ? 1 : 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', fontFamily: 'monospace' }}>
            {attribute.type}
          </Typography>
        </Box>
      )}
      {attribute.isStructValue && (
        <Typography variant="caption" sx={{
          mt: attribute.comment ? 1 : 0,
          display: 'block',
          color: 'text.secondary',
        }}>
          Strukturattribut → {attribute.structRef}
        </Typography>
      )}
    </Box>
  ), [attribute]);

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '24px minmax(100px, 1fr) minmax(100px, 1.2fr)',
      gap: 1,
      alignItems: 'start',
      py: 0.5,
      px: 1,
      '&:hover': {
        bgcolor: 'action.hover'
      }
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        pt: 0.3
      }}>
        <Box sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          border: '1.5px solid',
          borderColor: 'primary.main',
          bgcolor: attribute.mandatory ? 'primary.main' : 'transparent',
          boxShadow: theme => `0 0 0 1px ${theme.palette.background.paper}`,
        }} />
      </Box>
      <Tooltip
        title={tooltipContent}
        placement="left"
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: colors.paper,
              color: colors.text,
              boxShadow: colors.shadow,
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            cursor: 'help',
            wordBreak: 'break-word',
          }}
        >
          {attribute.name}
        </Typography>
      </Tooltip>
      <Tooltip
        title={tooltipContent}
        placement="right"
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: colors.paper,
              color: colors.text,
              boxShadow: colors.shadow,
            },
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: attribute.isEnum || attribute.isDomainEnum
              ? colors.typeReference
              : attribute.isStructValue
                ? colors.containment
                : attribute.isReference
                  ? colors.typeReference
                  : colors.propertyText,
            lineHeight: 1.4,
            cursor: 'help',
            wordBreak: 'break-word',
          }}
        >
          {attribute.type}
        </Typography>
      </Tooltip>
    </Box>
  );
});

export const IliStructureNode: React.FC<StructureNodeProps> = memo(({ data }) => {
  const { colors } = useTheme();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = data.expanded ?? data.isExpanded ?? localExpanded;

  const handleExpandClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const next = !expanded;
    setLocalExpanded(next);
    data.onExpandChange?.(next);
  };

  const dataAny = data as unknown as {
    isAbstract?: boolean; isFinal?: boolean; isExtended?: boolean;
    comment?: string; topic?: string;
  };
  const topicLabel = data.topicName ?? dataAny.topic;

  const isActive = !!(data as unknown as { isActive?: boolean }).isActive;

  return (
    <Paper
      elevation={2}
      sx={{
        width: 400,
        position: 'relative',
        border: isActive
          ? `2px solid ${colors.selectedEntity}`
          : data.isHighlighted
            ? `2px solid ${colors.selectedEntity}`
            : `2px solid ${colors.containment}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: isActive ? colors.selectedNodeBg : colors.background,
        color: colors.text,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease-in-out, background-color 1400ms ease-out, border-color 1400ms ease-out',
        '& .ili-struct-header': {
          transition: 'background-color 1400ms ease-out',
        },
        '&:hover': {
          boxShadow: theme => theme.shadows[8],
          ...(isActive ? {} : {
            ...(expanded ? {} : { bgcolor: alpha(colors.selectedEntity, 0.18) }),
            borderColor: colors.selectedEntity,
            '& .ili-struct-header': {
              bgcolor: colors.selectedEntity,
            },
          }),
        },
      }}
    >
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ opacity: 0 }}
      />

      <Tooltip
        title={
          <Box sx={{ p: 1, maxWidth: 400 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: colors.text }}>
              {data.label}
              {dataAny.isAbstract && ' (Abstract)'}
              {dataAny.isFinal && ' (Final)'}
              {dataAny.isExtended && ' (Extended)'}
            </Typography>
            {dataAny.comment && (
              <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'pre-wrap', color: colors.text, opacity: 0.8, mb: 1 }}>
                {dataAny.comment}
              </Typography>
            )}
            <Typography variant="caption" sx={{ display: 'block', color: colors.text, opacity: 0.7 }}>
              Struktur — wertgebunden, ohne eigene Identität (Refhb 3.5.3).
            </Typography>
            {topicLabel && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: colors.text, opacity: 0.7, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {topicLabel}
              </Typography>
            )}
          </Box>
        }
        placement="top"
        enterDelay={500}
        enterNextDelay={500}
        leaveDelay={0}
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: colors.paper,
              color: colors.text,
              boxShadow: colors.shadow,
            },
          },
        }}
      >
        <Box className="ili-struct-header" sx={{
          bgcolor: isActive || data.isHighlighted ? colors.selectedEntity : colors.containment,
          color: '#FFFFFF',
          p: 1,
          textAlign: 'center'
        }}>
          <Typography variant="subtitle2" fontWeight="bold">
            «STRUCTURE»
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {data.label}
          </Typography>
          {topicLabel && (
            <Typography variant="caption">
              {topicLabel}
            </Typography>
          )}
        </Box>
      </Tooltip>

      <Box sx={{ 
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="caption">
          {data.attributes.length} Attributes
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleExpandClick}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 1 }}>
          {data.attributes.map((attr, index) => (
            <AttributeRow key={index} attribute={attr} />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
});

export default IliStructureNode;