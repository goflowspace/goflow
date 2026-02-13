import React, {useCallback, useEffect, useState} from 'react';

import {api} from '@services/api';
import {CreateNoteDto, Note, NotebookViewMode, NotesFilters, UpdateNoteDto} from '@types-folder/notebook';

import {useCurrentProject} from '../../hooks/useCurrentProject';
import {NoteEditor, NotebookFilters, NotesList} from './index';

import styles from './WorkspaceNotebookPanel.module.scss';

interface WorkspaceNotebookPanelProps {
  projectId?: string;
}

export const WorkspaceNotebookPanel: React.FC<WorkspaceNotebookPanelProps> = ({projectId: propProjectId}) => {
  const {projectId: hookProjectId} = useCurrentProject();
  const projectId = propProjectId || hookProjectId;

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Фильтры и поиск
  const [filters, setFilters] = useState<NotesFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<NotebookViewMode>({
    view: 'list',
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });

  const loadNotes = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const response = await api.getNotes({
        projectId,
        ...filters,
        search: searchQuery || undefined
      });
      setNotes(response.data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filters, searchQuery]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Сбрасываем состояние при смене проекта
  useEffect(() => {
    setSelectedNote(null);
    setIsCreatingNote(false);
    setNotes([]);
  }, [projectId]);

  const handleCreateNote = async (data: CreateNoteDto) => {
    try {
      const newNote = await api.createNote(data);
      await loadNotes();
      setIsCreatingNote(false);
      setSelectedNote(newNote.data);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, data: UpdateNoteDto) => {
    try {
      const updatedNote = await api.updateNote(noteId, data);
      await loadNotes();
      setSelectedNote(updatedNote.data);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(noteId);
      await loadNotes();
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      await api.togglePinNote(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Failed to toggle pin note:', error);
    }
  };

  if (!projectId) {
    return (
      <div className={styles.noProject}>
        <h3>Выберите проект</h3>
        <p>Для работы с блокнотом выберите проект</p>
      </div>
    );
  }

  return (
    <div className={styles.workspaceNotebook}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h2>Блокнот</h2>
          <span className={styles.projectContext}>Проект</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.newNoteBtn} onClick={() => setIsCreatingNote(true)} disabled={isCreatingNote}>
            + Новая заметка
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <NotebookFilters filters={filters} tags={[]} searchQuery={searchQuery} viewMode={viewMode} onFiltersChange={setFilters} onSearchChange={setSearchQuery} onViewModeChange={setViewMode} />

          <NotesList notes={notes} selectedNote={selectedNote} viewMode={viewMode} isLoading={isLoading} onSelectNote={setSelectedNote} onDeleteNote={handleDeleteNote} onTogglePin={handleTogglePin} />
        </div>

        <div className={styles.editor}>
          {isCreatingNote ? (
            <NoteEditor mode='create' projectId={projectId} onSave={handleCreateNote} onCancel={() => setIsCreatingNote(false)} />
          ) : selectedNote ? (
            <NoteEditor mode='edit' note={selectedNote} onSave={(updates: UpdateNoteDto) => handleUpdateNote(selectedNote.id, updates)} onCancel={() => setSelectedNote(null)} />
          ) : (
            <div className={styles.placeholder}>
              <div className={styles.placeholderContent}>
                <h3>Выберите заметку или создайте новую</h3>
                <p>Блокнот поможет сохранить ваши идеи и заметки по проектам</p>
                <button className={styles.createFirstNote} onClick={() => setIsCreatingNote(true)}>
                  Создать первую заметку
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
