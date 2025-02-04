import React from 'react';
import { SvgIcon } from '@mui/material';

export const StraightLineIcon: React.FC<any> = (props) => (
  <SvgIcon {...props} viewBox="0 0 87 51">
    <path
      d="M12 12L40 12L40 38L75 38"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const CurvedLineIcon: React.FC<any> = (props) => (
  <SvgIcon {...props} viewBox="0 0 80 46">
    <path
      d="M12 12C40 10 43 20 48 25C56 33 62 40 75 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export const CurvedIcon = React.memo(CurvedLineIcon);
export const StraightIcon = React.memo(StraightLineIcon); 