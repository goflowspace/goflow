import { PrismaClient, Note, Tag, NoteTag, Prisma } from '@prisma/client';

// Типы для создания и обновления
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

// Фильтры для поиска заметок
export interface NotesFilters {
  projectId?: string;
  tagIds?: string[];
  isPublic?: boolean;
  isPinned?: boolean;
  search?: string; // Поиск по заголовку и содержимому
}

// Расширенные типы для возврата
export type NoteWithTags = Note & {
  tags: (NoteTag & { tag: Tag })[];
  user: { id: string; name: string | null; email: string };
  project?: { id: string; name: string } | null;
};

export type TagWithCount = Tag & {
  _count: { notes: number };
};

export class NotebookService {
  constructor(private readonly prisma: PrismaClient) {}

  // ========== NOTE OPERATIONS ==========

  /**
   * Создание новой заметки
   */
  async createNote(userId: string, data: CreateNoteDto): Promise<NoteWithTags> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Создаем заметку
      const note = await tx.note.create({
        data: {
          title: data.title || 'Untitled Note',
          content: data.content,
          userId,
          projectId: data.projectId,
          isPublic: data.isPublic ?? false,
          isPinned: data.isPinned ?? false,
        },
        include: {
          tags: {
            include: { tag: true }
          },
          user: {
            select: { id: true, name: true, email: true }
          },
          project: {
            select: { id: true, name: true }
          }
        }
      });

      // Добавляем теги, если они указаны
      if (data.tagIds && data.tagIds.length > 0) {
        await tx.noteTag.createMany({
          data: data.tagIds.map(tagId => ({
            noteId: note.id,
            tagId
          }))
        });

        // Перезагружаем заметку с тегами
        return await tx.note.findUniqueOrThrow({
          where: { id: note.id },
          include: {
            tags: {
              include: { tag: true }
            },
            user: {
              select: { id: true, name: true, email: true }
            },
            project: {
              select: { id: true, name: true }
            }
          }
        });
      }

      return note;
    });

    return result;
  }

  /**
   * Получение заметок пользователя с фильтрацией
   */
  async getNotes(
    userId: string, 
    filters: NotesFilters = {},
    offset = 0,
    limit = 50
  ): Promise<{ notes: NoteWithTags[]; total: number }> {
    const where: Prisma.NoteWhereInput = {
      userId,
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.isPublic !== undefined && { isPublic: filters.isPublic }),
      ...(filters.isPinned !== undefined && { isPinned: filters.isPinned }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } }
        ]
      }),
      ...(filters.tagIds && filters.tagIds.length > 0 && {
        tags: {
          some: {
            tagId: { in: filters.tagIds }
          }
        }
      })
    };

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        include: {
          tags: {
            include: { tag: true }
          },
          user: {
            select: { id: true, name: true, email: true }
          },
          project: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      this.prisma.note.count({ where })
    ]);

    return { notes, total };
  }

  /**
   * Получение заметки по ID
   */
  async getNote(userId: string, noteId: string): Promise<NoteWithTags | null> {
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        userId
      },
      include: {
        tags: {
          include: { tag: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });

    return note;
  }

  /**
   * Обновление заметки
   */
  async updateNote(userId: string, noteId: string, data: UpdateNoteDto): Promise<NoteWithTags> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Проверяем, что заметка принадлежит пользователю
      const existingNote = await tx.note.findFirst({
        where: { id: noteId, userId }
      });

      if (!existingNote) {
        throw new Error('Note not found or access denied');
      }

      // Обновляем заметку
      await tx.note.update({
        where: { id: noteId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.content !== undefined && { content: data.content }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          ...(data.isPinned !== undefined && { isPinned: data.isPinned })
        }
      });

      // Обновляем теги, если они указаны
      if (data.tagIds !== undefined) {
        // Удаляем все существующие связи с тегами
        await tx.noteTag.deleteMany({
          where: { noteId }
        });

        // Добавляем новые теги
        if (data.tagIds.length > 0) {
          await tx.noteTag.createMany({
            data: data.tagIds.map(tagId => ({
              noteId,
              tagId
            }))
          });
        }
      }

      // Возвращаем обновленную заметку
      return await tx.note.findUniqueOrThrow({
        where: { id: noteId },
        include: {
          tags: {
            include: { tag: true }
          },
          user: {
            select: { id: true, name: true, email: true }
          },
          project: {
            select: { id: true, name: true }
          }
        }
      });
    });

    return result;
  }

  /**
   * Удаление заметки
   */
  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const result = await this.prisma.note.deleteMany({
      where: {
        id: noteId,
        userId
      }
    });

    return result.count > 0;
  }

  /**
   * Переключение закрепления заметки
   */
  async togglePinNote(userId: string, noteId: string): Promise<NoteWithTags> {
    const existingNote = await this.prisma.note.findFirst({
      where: { id: noteId, userId }
    });

    if (!existingNote) {
      throw new Error('Note not found or access denied');
    }

    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: { isPinned: !existingNote.isPinned },
      include: {
        tags: {
          include: { tag: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });

    return updatedNote;
  }

  // ========== TAG OPERATIONS ==========

  /**
   * Создание нового тега
   */
  async createTag(userId: string, data: CreateTagDto): Promise<Tag> {
    const tag = await this.prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
        userId
      }
    });

    return tag;
  }

  /**
   * Получение тегов пользователя с количеством заметок
   */
  async getTags(userId: string): Promise<TagWithCount[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { notes: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return tags;
  }

  /**
   * Получение тега по ID
   */
  async getTag(userId: string, tagId: string): Promise<TagWithCount | null> {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId
      },
      include: {
        _count: {
          select: { notes: true }
        }
      }
    });

    return tag;
  }

  /**
   * Обновление тега
   */
  async updateTag(userId: string, tagId: string, data: UpdateTagDto): Promise<Tag> {
    const result = await this.prisma.tag.updateMany({
      where: {
        id: tagId,
        userId
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color })
      }
    });

    if (result.count === 0) {
      throw new Error('Tag not found or access denied');
    }

    const updatedTag = await this.prisma.tag.findUniqueOrThrow({
      where: { id: tagId }
    });

    return updatedTag;
  }

  /**
   * Удаление тега
   */
  async deleteTag(userId: string, tagId: string): Promise<boolean> {
    const result = await this.prisma.tag.deleteMany({
      where: {
        id: tagId,
        userId
      }
    });

    return result.count > 0;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Получение статистики блокнота пользователя
   */
  async getUserStats(userId: string): Promise<{
    totalNotes: number;
    pinnedNotes: number;
    totalTags: number;
    notesByProject: { projectId: string | null; projectName: string | null; count: number }[];
  }> {
    const [totalNotes, pinnedNotes, totalTags, notesByProject] = await Promise.all([
      this.prisma.note.count({ where: { userId } }),
      this.prisma.note.count({ where: { userId, isPinned: true } }),
      this.prisma.tag.count({ where: { userId } }),
      this.prisma.note.groupBy({
        by: ['projectId'],
        where: { userId },
        _count: { id: true }
      }).then(async (groups) => {
        // Получаем названия проектов
        const projectIds = groups
          .map(g => g.projectId)
          .filter((id): id is string => id !== null);
        
        const projects = await this.prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true }
        });

        return groups.map(group => ({
          projectId: group.projectId,
          projectName: group.projectId 
            ? projects.find(p => p.id === group.projectId)?.name || 'Unknown Project'
            : null,
          count: group._count.id
        }));
      })
    ]);

    return {
      totalNotes,
      pinnedNotes,
      totalTags,
      notesByProject
    };
  }
}
