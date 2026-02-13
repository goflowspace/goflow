import React from 'react';

import {CreateTagDto, Tag} from '@types-folder/notebook';

interface TagsManagerProps {
  tags: Tag[];
  onCreateTag: (data: CreateTagDto) => Promise<Tag>;
  onUpdateTag: () => void;
  onDeleteTag: () => void;
  onClose: () => void;
}

export const TagsManager: React.FC<TagsManagerProps> = ({onClose}) => {
  return (
    <div
      style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)'
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3 style={{margin: 0}}>Управление тегами</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
      <p style={{margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px'}}>Функционал в разработке...</p>
    </div>
  );
};
