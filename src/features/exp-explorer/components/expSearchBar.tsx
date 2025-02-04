import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { Search } from '@mui/icons-material';
import { SearchOption } from '../types/expTypes';

interface ExpSchemaControlsProps {
  searchValue: SearchOption | null;
  onSearchChange: (value: SearchOption | null) => void;
  searchOptions: SearchOption[];
}

export const ExpSchemaControls: React.FC<ExpSchemaControlsProps> = ({
  searchValue,
  onSearchChange,
  searchOptions
}) => {
  return (
    <Autocomplete
      value={searchValue}
      onChange={(_, newValue) => onSearchChange(newValue)}
      options={searchOptions}
      groupBy={(option) => option.category}
      getOptionLabel={(option) => option.label}
      renderOption={(props, option) => (
        <li {...props}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>{option.label}</div>
            <div style={{ fontSize: '0.8em', color: 'gray' }}>{option.description}</div>
          </div>
        </li>
      )}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="Suchen Sie nach einer Entity oder einem Type (z.B. 'Person', 'Color')"
          InputProps={{
            ...params.InputProps,
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
      )}
    />
  );
}; 