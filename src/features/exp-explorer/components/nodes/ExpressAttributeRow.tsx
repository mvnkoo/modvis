import React, { memo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useTheme } from '../../../../common/theme/ThemeContext';
import type { ExpressAttribute } from '../../services/types/ExpressBaseTypes';

interface Props {
  attr: ExpressAttribute;
}

const ExpressAttributeRow: React.FC<Props> = memo(({ attr }) => {
  const { colors } = useTheme();
  const isRef =
    /^[A-Z]/.test(attr.baseType) &&
    !['STRING', 'INTEGER', 'REAL', 'BOOLEAN', 'LOGICAL', 'NUMBER', 'BINARY'].includes(attr.baseType);

  return (
    <Tooltip
      title={
        attr.aggregate
          ? `${attr.aggregate}${attr.cardinality ? ' ' + attr.cardinality : ''} OF ${attr.baseType}`
          : attr.type
      }
      placement="left"
    >
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '14px minmax(110px, 1fr) minmax(110px, 1.4fr)',
        gap: 1,
        alignItems: 'center',
        px: 1,
        py: 0.4,
        borderRadius: 0.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            border: `1.5px solid ${colors.entity}`,
            bgcolor: attr.isOptional ? 'transparent' : colors.entity,
          }} />
        </Box>
        <Typography sx={{
          fontFamily: 'monospace',
          fontSize: '0.74rem',
          fontStyle: attr.isDerived ? 'italic' : 'normal',
          color: attr.isInverse ? colors.secondaryText : colors.text,
        }}>
          {attr.isInverse ? '↑ ' : ''}{attr.name}
        </Typography>
        <Typography sx={{
          fontFamily: 'monospace',
          fontSize: '0.74rem',
          color: isRef ? colors.typeReference : colors.primaryText,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {attr.aggregate ? `${attr.aggregate} ` : ''}
          {attr.baseType}
        </Typography>
      </Box>
    </Tooltip>
  );
});

ExpressAttributeRow.displayName = 'ExpressAttributeRow';
export default ExpressAttributeRow;
