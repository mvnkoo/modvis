import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { Search } from '@mui/icons-material';
import type { ExpressSearchOption } from '../services/types/ExpressBaseTypes';

interface ExpSchemaControlsProps {
  searchValue: ExpressSearchOption | null;
  onSearchChange: (value: ExpressSearchOption | null) => void;
  searchOptions: ExpressSearchOption[];
}

export const ExpSchemaControls: React.FC<ExpSchemaControlsProps> = ({
  searchValue,
  onSearchChange,
  searchOptions,
}) => {
  return (
    <Autocomplete
      value={searchValue}
      onChange={(_, newValue) => onSearchChange(newValue)}
      options={searchOptions}
      groupBy={(option) => option.category}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      renderOption={(props, option) => (
        <li {...props}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>{option.label}</div>
            <div style={{ fontSize: '0.78em', color: 'gray' }}>{option.description}</div>
          </div>
        </li>
      )}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="Suche nach Entity / Type / Enum / Select (z.B. 'IfcPerson')"
          InputProps={{
            ...params.InputProps,
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
          }}
        />
      )}
    />
  );
};
