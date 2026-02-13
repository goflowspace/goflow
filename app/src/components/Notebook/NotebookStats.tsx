import React from 'react';

interface NotebookStatsProps {
  onClose: () => void;
}

export const NotebookStats: React.FC<NotebookStatsProps> = ({onClose}) => {
  return (
    <div
      style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)'
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3 style={{margin: 0}}>Статистика блокнота</h3>
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
      <p style={{margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px'}}>Статистика в разработке...</p>
    </div>
  );
};
