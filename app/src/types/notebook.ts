// =============================================================
// ТИПЫ ДЛЯ СИСТЕМЫ БЛОКНОТА
// =============================================================
import {Project} from './project';
import {User} from './user';

// Основные интерфейсы
export interface Note {
  id: string;
  title: string;
  content: string; // Markdown содержимое
  userId: string;
  projectId?: string | null;
  isPublic: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Связанные данные
  user?: Pick<User, 'id' | 'name' | 'email'>;
  project?: Pick<Project, 'id' | 'name'> | null;
  tags?: NoteTag[];
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null; // Hex цвет
  userId: string;
  createdAt: Date;

  // Связанные данные
  user?: Pick<User, 'id' | 'name' | 'email'>;
  _count?: {notes: number};
}

export interface NoteTag {
  id: string;
  noteId: string;
  tagId: string;
  note?: Note;
  tag: Tag;
}

// DTO для создания/обновления
export interface CreateNoteDto {
  title?: string;
  content: string;
  projectId?: string;
  isPublic?: boolean;
  isPinned?: boolean;
  tagIds?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  isPublic?: boolean;
  isPinned?: boolean;
  tagIds?: string[];
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

// Фильтры для поиска
export interface NotesFilters {
  projectId?: string;
  tagIds?: string[];
  isPublic?: boolean;
  isPinned?: boolean;
  search?: string;
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
}

// Ответы API
export interface NotesResponse {
  success: boolean;
  data: Note[];
  pagination?: {
    total: number;
    offset: number;
    limit: number;
  };
  message?: string;
}

export interface NoteResponse {
  success: boolean;
  data: Note;
  message?: string;
}

export interface TagsResponse {
  success: boolean;
  data: Tag[];
  message?: string;
}

export interface TagResponse {
  success: boolean;
  data: Tag;
  message?: string;
}

export interface NotebookStatsResponse {
  success: boolean;
  data: {
    totalNotes: number;
    pinnedNotes: number;
    totalTags: number;
    notesByProject: {
      projectId: string | null;
      projectName: string | null;
      count: number;
    }[];
  };
  message?: string;
}

// Типы для компонентов
export interface NotebookViewMode {
  view: 'list' | 'grid' | 'compact';
  sortBy: 'updatedAt' | 'createdAt' | 'title' | 'pinned';
  sortOrder: 'asc' | 'desc';
}

export interface NotebookState {
  notes: Note[];
  tags: Tag[];
  selectedNote: Note | null;
  selectedTags: string[];
  filters: NotesFilters;
  viewMode: NotebookViewMode;
  isLoading: boolean;
  searchQuery: string;
  stats?: NotebookStatsResponse['data'];
}

// Цвета для тегов по умолчанию
export const DEFAULT_TAG_COLORS = [
  '#FF6B6B', // Красный
  '#4ECDC4', // Бирюзовый
  '#45B7D1', // Синий
  '#FFA07A', // Лососевый
  '#98D8C8', // Мятный
  '#F7DC6F', // Желтый
  '#BB8FCE', // Фиолетовый
  '#85C1E9', // Голубой
  '#F8C471', // Оранжевый
  '#82E0AA' // Зеленый
] as const;

export type DefaultTagColor = (typeof DEFAULT_TAG_COLORS)[number];
