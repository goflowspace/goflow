import React from 'react';

import {NotebookViewMode, NotesFilters, Tag} from '@types-folder/notebook';

interface NotebookFiltersProps {
  filters: NotesFilters;
  tags: Tag[];
  searchQuery: string;
  viewMode: NotebookViewMode;
  onFiltersChange: (filters: NotesFilters) => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (viewMode: NotebookViewMode) => void;
}

export const NotebookFilters: React.FC<NotebookFiltersProps> = ({filters, tags, searchQuery, onSearchChange}) => {
  return (
    <div style={{padding: '16px', borderBottom: '1px solid var(--border-primary)'}}>
      <input
        type='text'
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder='Поиск по заметкам...'
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid var(--border-primary)',
          borderRadius: '6px',
          fontSize: '14px'
        }}
      />
    </div>
  );
};
