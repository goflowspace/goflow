import { z } from 'zod';
import { ThreadContextType, MentionType } from '@prisma/client';

// Схема для упоминаний
const MentionSchema = z.object({
  type: z.nativeEnum(MentionType),
  targetId: z.string().min(1, 'Target ID is required')
});

// Схема для создания треда
export const CreateThreadSchema = z.object({
  contextType: z.nativeEnum(ThreadContextType),
  contextData: z.record(z.any()).default({}),
  firstComment: z.object({
    content: z.string()
      .min(1, 'Comment content is required')
      .max(5000, 'Comment content must be less than 5000 characters'),
    mentions: z.array(MentionSchema).optional()
  }),
  metadata: z.record(z.any()).optional()
});

// Схема для создания комментария
export const CreateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(5000, 'Comment content must be less than 5000 characters'),
  mentions: z.array(MentionSchema).optional()
});

// Схема для обновления комментария
export const UpdateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(5000, 'Comment content must be less than 5000 characters'),
  mentions: z.array(MentionSchema).optional()
});

// Схема для обновления треда
export const UpdateThreadSchema = z.object({
  resolved: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

// Схема для фильтров тредов
export const ThreadFiltersSchema = z.object({
  contextType: z.nativeEnum(ThreadContextType).optional(),
  resolved: z.string().optional().transform((val) => {
    if (val === undefined) return undefined;
    return val === 'true';
  }),
  creatorId: z.string().optional(),
  mentionedUserId: z.string().optional(),
  mentionedTeamId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional().transform((val) => val ? parseInt(val, 10) : undefined),
  limit: z.string().regex(/^\d+$/).optional().transform((val) => val ? parseInt(val, 10) : undefined)
});

// Схема для фильтров уведомлений
export const NotificationFiltersSchema = z.object({
  read: z.string().optional().transform((val) => {
    if (val === undefined) return undefined;
    return val === 'true';
  }),
  type: z.string().optional(), // Используем string вместо enum для гибкости
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).optional().transform((val) => val ? parseInt(val, 10) : undefined),
  limit: z.string().regex(/^\d+$/).optional().transform((val) => val ? parseInt(val, 10) : undefined)
});

// Схема для отметки уведомлений как прочитанные
export const MarkNotificationsAsReadSchema = z.object({
  notificationIds: z.array(z.string()).optional()
});

// Вспомогательные схемы для параметров URL
export const ProjectIdParamSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required')
});

export const ThreadIdParamSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required')
});

export const CommentIdParamSchema = z.object({
  commentId: z.string().min(1, 'Comment ID is required')
});

// Специфичные схемы для различных типов контекста
export const CanvasPositionContextSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().optional()
});

export const NodeContextSchema = z.object({
  nodeId: z.string().min(1, 'Node ID is required'),
  nodeType: z.string().optional(),
  nodeTitle: z.string().optional()
});

export const EntityContextSchema = z.object({
  entityId: z.string().min(1, 'Entity ID is required'),
  entityType: z.string().optional(),
  entityName: z.string().optional()
});

export const BibleSectionContextSchema = z.object({
  sectionId: z.string().min(1, 'Section ID is required'),
  sectionType: z.string().optional(),
  sectionName: z.string().optional()
});

// Функция для валидации контекстных данных в зависимости от типа
export const validateContextData = (contextType: ThreadContextType, contextData: any) => {
  switch (contextType) {
    case 'CANVAS_POSITION':
      return CanvasPositionContextSchema.parse(contextData);
    case 'NODE':
      return NodeContextSchema.parse(contextData);
    case 'ENTITY':
      return EntityContextSchema.parse(contextData);
    case 'BIBLE_SECTION':
      return BibleSectionContextSchema.parse(contextData);
    case 'GENERAL':
      return {}; // Для общих комментариев контекстные данные могут быть пустыми
    default:
      throw new Error(`Invalid context type: ${contextType}`);
  }
};
