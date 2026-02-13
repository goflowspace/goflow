import React from 'react';

import {Note, NotebookViewMode} from '@types-folder/notebook';
import {formatDistanceToNow} from 'date-fns';
import {ru} from 'date-fns/locale';

import styles from './NotesList.module.scss';

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  viewMode: NotebookViewMode;
  isLoading: boolean;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
}

export const NotesList: React.FC<NotesListProps> = ({notes, selectedNote, viewMode, isLoading, onSelectNote, onDeleteNote, onTogglePin}) => {
  // Сортировка заметок
  const sortedNotes = React.useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      // Сначала закрепленные заметки
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      // Затем по выбранному критерию
      switch (viewMode.sortBy) {
        case 'title': {
          const titleResult = a.title.localeCompare(b.title, 'ru');
          return viewMode.sortOrder === 'asc' ? titleResult : -titleResult;
        }

        case 'createdAt': {
          const createdResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return viewMode.sortOrder === 'asc' ? createdResult : -createdResult;
        }

        case 'updatedAt':
        default: {
          const updatedResult = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          return viewMode.sortOrder === 'asc' ? updatedResult : -updatedResult;
        }
      }
    });

    return sorted;
  }, [notes, viewMode]);

  const handleDeleteClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить эту заметку?')) {
      onDeleteNote(noteId);
    }
  };

  const handleTogglePinClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onTogglePin(noteId);
  };

  if (isLoading) {
    return (
      <div className={styles.notesList}>
        {Array.from({length: 5}).map((_, i) => (
          <div key={i} className={styles.noteSkeleton}>
            <div className={styles.skeletonHeader} />
            <div className={styles.skeletonContent} />
            <div className={styles.skeletonFooter} />
          </div>
        ))}
      </div>
    );
  }

  if (sortedNotes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📝</div>
        <p>Заметки не найдены</p>
        <span>Создайте первую заметку или измените фильтры</span>
      </div>
    );
  }

  return (
    <div className={styles.notesList}>
      {sortedNotes.map((note) => (
        <div
          key={note.id}
          className={`${styles.noteItem} ${selectedNote?.id === note.id ? styles.selected : ''} ${viewMode.view === 'compact' ? styles.compact : ''}`}
          onClick={() => onSelectNote(note)}
        >
          <div className={styles.noteHeader}>
            <div className={styles.noteTitle}>
              {note.isPinned && <span className={styles.pinIcon}>📌</span>}
              <span className={styles.titleText} title={note.title}>
                {note.title || 'Без заголовка'}
              </span>
            </div>
            <div className={styles.noteActions}>
              <button
                className={`${styles.actionBtn} ${styles.pinBtn} ${note.isPinned ? styles.pinned : ''}`}
                onClick={(e) => handleTogglePinClick(e, note.id)}
                title={note.isPinned ? 'Открепить' : 'Закрепить'}
              >
                📌
              </button>
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => handleDeleteClick(e, note.id)} title='Удалить'>
                🗑️
              </button>
            </div>
          </div>

          {viewMode.view !== 'compact' && (
            <div className={styles.noteContent}>
              {note.content.substring(0, 120)}
              {note.content.length > 120 && '...'}
            </div>
          )}

          <div className={styles.noteFooter}>
            <div className={styles.noteTags}>
              {note.tags?.slice(0, 3).map((noteTag) => (
                <span
                  key={noteTag.tag.id}
                  className={styles.tag}
                  style={{
                    backgroundColor: noteTag.tag.color || '#e0e0e0',
                    color: noteTag.tag.color ? 'white' : '#333'
                  }}
                >
                  {noteTag.tag.name}
                </span>
              ))}
              {note.tags && note.tags.length > 3 && <span className={styles.moreTags}>+{note.tags.length - 3}</span>}
            </div>

            <div className={styles.noteDate}>
              {formatDistanceToNow(new Date(note.updatedAt), {
                addSuffix: true,
                locale: ru
              })}
            </div>
          </div>

          {note.project && <div className={styles.projectBadge}>{note.project.name}</div>}

          {note.isPublic && (
            <div className={styles.publicBadge} title='Видна команде проекта'>
              👥
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
