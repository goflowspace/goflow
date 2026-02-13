import React, {useCallback, useEffect, useState} from 'react';

import {api} from '@services/api';
import {CreateNoteDto, CreateTagDto, Note, NotebookViewMode, NotesFilters, Tag, UpdateNoteDto} from '@types-folder/notebook';

import {useNotebookStore} from '@store/useNotebookStore';

import {useCurrentProject} from '../../hooks/useCurrentProject';
import {NoteEditor, NotebookFilters, NotebookStats, NotesList, TagsManager} from './index';

import styles from './NotebookPanel.module.scss';

export const NotebookPanel: React.FC = () => {
  const {isNotebookOpen, closeNotebookPanel} = useNotebookStore();
  const {projectId} = useCurrentProject();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [filters, setFilters] = useState<NotesFilters>({
    projectId: projectId || undefined
  });
  const [viewMode, setViewMode] = useState<NotebookViewMode>({
    view: 'list',
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Загрузка заметок
  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getNotes({
        ...filters,
        search: searchQuery || undefined,
        offset: 0,
        limit: 100
      });
      setNotes(response.data);
    } catch (error) {
      console.error('Failed to load notes:', error);
      console.error('Не удалось загрузить заметки');
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery]);

  // Загрузка тегов
  const loadTags = useCallback(async () => {
    try {
      const response = await api.getTags();
      setTags(response.data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, []);

  // Создание новой заметки
  const handleCreateNote = async (data: CreateNoteDto) => {
    try {
      setIsCreatingNote(true);
      const response = await api.createNote(data);
      setNotes((prev) => [response.data, ...prev]);
      setSelectedNote(response.data);
      setIsCreatingNote(false);
    } catch (error) {
      console.error('Failed to create note:', error);
      console.error('Не удалось создать заметку');
      setIsCreatingNote(false);
    }
  };

  // Обновление заметки
  const handleUpdateNote = async (noteId: string, updates: UpdateNoteDto) => {
    try {
      const response = await api.updateNote(noteId, updates);
      setNotes((prev) => prev.map((note) => (note.id === noteId ? response.data : note)));
      if (selectedNote?.id === noteId) {
        setSelectedNote(response.data);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      console.error('Не удалось обновить заметку');
    }
  };

  // Удаление заметки
  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      console.error('Не удалось удалить заметку');
    }
  };

  // Закрепление/открепление заметки
  const handleTogglePin = async (noteId: string) => {
    try {
      const response = await api.togglePinNote(noteId);
      setNotes((prev) => prev.map((note) => (note.id === noteId ? response.data : note)));
      if (selectedNote?.id === noteId) {
        setSelectedNote(response.data);
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      console.error('Не удалось изменить статус закрепления');
    }
  };

  // Создание тега
  const handleCreateTag = async (data: CreateTagDto) => {
    try {
      const response = await api.createTag(data);
      setTags((prev) => [...prev, response.data]);
      return response.data;
    } catch (error) {
      console.error('Failed to create tag:', error);
      console.error('Не удалось создать тег');
      throw error;
    }
  };

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  if (!isNotebookOpen) return null;

  return (
    <div className={styles.notebookPanel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h2>Блокнот</h2>
          {projectId && <span className={styles.projectContext}>Проект</span>}
        </div>
        <div className={styles.actions}>
          {/* <button className={styles.statsBtn} onClick={() => setShowStats(!showStats)} title='Статистика'>
            📊
          </button>
          <button className={styles.tagsBtn} onClick={() => setShowTagsManager(!showTagsManager)} title='Управление тегами'>
            🏷️
          </button> */}
          <button className={styles.newNoteBtn} onClick={() => setIsCreatingNote(true)} disabled={isCreatingNote}>
            + Новая заметка
          </button>
          <button className={styles.closeBtn} onClick={closeNotebookPanel}>
            ✕
          </button>
        </div>
      </div>

      {showStats && <NotebookStats onClose={() => setShowStats(false)} />}

      {showTagsManager && <TagsManager tags={tags} onCreateTag={handleCreateTag} onUpdateTag={loadTags} onDeleteTag={loadTags} onClose={() => setShowTagsManager(false)} />}

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <NotebookFilters filters={filters} tags={tags} searchQuery={searchQuery} viewMode={viewMode} onFiltersChange={setFilters} onSearchChange={setSearchQuery} onViewModeChange={setViewMode} />

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
                  Создать заметку
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
