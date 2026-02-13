import { z } from 'zod';

// Схема для создания заметки
export const CreateNoteSchema = z.object({
  title: z.string()
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  content: z.string()
    .max(100000, 'Content must be less than 100,000 characters'),
  projectId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format')
    .optional(),
  isPublic: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  tagIds: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tag ID format')
  ).max(10, 'Maximum 10 tags per note').optional()
});

// Схема для обновления заметки
export const UpdateNoteSchema = z.object({
  title: z.string()
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  content: z.string()
    .max(100000, 'Content must be less than 100,000 characters')
    .optional(),
  isPublic: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  tagIds: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tag ID format')
  ).max(10, 'Maximum 10 tags per note').optional()
});

// Схема для создания тега
export const CreateTagSchema = z.object({
  name: z.string()
    .min(1, 'Tag name is required')
    .max(50, 'Tag name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    .optional()
});

// Схема для обновления тега
export const UpdateTagSchema = z.object({
  name: z.string()
    .min(1, 'Tag name is required')
    .max(50, 'Tag name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    .optional()
});

// Схема для фильтров заметок
export const NotesFiltersSchema = z.object({
  projectId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format')
    .optional(),
  tagIds: z.string()
    .transform((val) => val ? val.split(',').filter(id => id.trim()) : [])
    .pipe(
      z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tag ID format'))
        .max(5, 'Maximum 5 tags for filtering')
    )
    .optional(),
  isPublic: z.string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === 'true';
    }),
  isPinned: z.string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === 'true';
    }),
  search: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .optional()
});

// Схема для пагинации
export const PaginationSchema = z.object({
  offset: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 0)
    .pipe(z.number().min(0, 'Offset must be non-negative')),
  limit: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 20)
    .pipe(z.number().min(1, 'Limit must be positive').max(100, 'Limit must not exceed 100'))
});

// Схема для ID параметра
export const IdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
});

// Объединенные схемы для запросов
export const GetNotesSchema = NotesFiltersSchema.merge(PaginationSchema);
export const GetNoteSchema = IdParamSchema;
export const UpdateNoteParamsSchema = IdParamSchema;
export const DeleteNoteSchema = IdParamSchema;
export const GetTagSchema = IdParamSchema;
export const UpdateTagParamsSchema = IdParamSchema;
export const DeleteTagSchema = IdParamSchema;

// Типы для TypeScript (экспорт типов из схем)
export type CreateNoteRequest = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteRequest = z.infer<typeof UpdateNoteSchema>;
export type CreateTagRequest = z.infer<typeof CreateTagSchema>;
export type UpdateTagRequest = z.infer<typeof UpdateTagSchema>;
export type NotesFiltersRequest = z.infer<typeof NotesFiltersSchema>;
export type PaginationRequest = z.infer<typeof PaginationSchema>;
export type GetNotesRequest = z.infer<typeof GetNotesSchema>;
export type IdParamRequest = z.infer<typeof IdParamSchema>;
