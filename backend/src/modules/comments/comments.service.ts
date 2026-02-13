import { PrismaClient, Thread, Comment, NotificationType, MentionType, Prisma, CommentReadStatus } from '@prisma/client';
import { CreateThreadDto, CreateCommentDto, UpdateCommentDto, UpdateThreadDto, ThreadFilters, NotificationFilters, UnreadCommentsFilters } from './comments.types';
import { WebSocketManager } from '../websocket/websocket.manager.inversify';
import { RedisService, getRedisService } from '../../services/redis.service';
import { CommentEvent } from '../../types/comments-events.types';

export class CommentsService {
  private readonly redisService: RedisService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly websocketManager?: WebSocketManager
  ) {
    this.redisService = getRedisService();
  }

  // ========== THREAD OPERATIONS ==========

  /**
   * Создание нового треда с первым комментарием
   */
  async createThread(
    userId: string,
    projectId: string,
    data: CreateThreadDto
  ): Promise<Thread & { comments: Comment[]; creator: { id: string; name: string | null; email: string } }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Создаем тред
      const thread = await tx.thread.create({
        data: {
          projectId,
          creatorId: userId,
          contextType: data.contextType,
          contextData: data.contextData as any,
          metadata: data.metadata || {},
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              author: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      // Создаем первый комментарий
      const comment = await tx.comment.create({
        data: {
          threadId: thread.id,
          authorId: userId,
          content: data.firstComment.content,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Добавляем упоминания к треду если есть
      if (data.firstComment.mentions && data.firstComment.mentions.length > 0) {
        await tx.threadMention.createMany({
          data: data.firstComment.mentions.map(mention => ({
            threadId: thread.id,
            type: mention.type,
            targetId: mention.targetId,
          }))
        });
      }

      // Добавляем упоминания к комментарию если есть
      if (data.firstComment.mentions && data.firstComment.mentions.length > 0) {
        await tx.commentMention.createMany({
          data: data.firstComment.mentions.map(mention => ({
            commentId: comment.id,
            type: mention.type,
            targetId: mention.targetId,
          }))
        });
      }

      return { ...thread, comments: [comment] };
    });

    // Отправляем WebSocket уведомления
    if (this.websocketManager) {
      this.websocketManager.emitToProject(projectId, {
        type: 'thread:created',
        data: result,
        timestamp: Date.now(),
        userId
      } as any);
    }

    // Создаем уведомления для упомянутых пользователей/команд
    await this.createMentionNotifications(result.id, null, data.firstComment.mentions || []);

      // Публикуем событие создания треда
      await this.publishThreadCreatedEvent(result as any);

    return result;
  }

  /**
   * Получение тредов с фильтрацией и пагинацией
   */
  async getThreads(
    projectId: string,
    filters: ThreadFilters = {},
    page: number = 1,
    limit: number = 20
  ) {
    const where: Prisma.ThreadWhereInput = {
      projectId,
      ...(filters.contextType && { contextType: filters.contextType }),
      ...(filters.resolved !== undefined && { resolved: filters.resolved }),
      ...(filters.creatorId && { creatorId: filters.creatorId }),
      ...(filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        }
      },
      // Поиск по содержимому комментариев
      ...(filters.search && {
        comments: {
          some: {
            content: {
              contains: filters.search,
              mode: 'insensitive'
            },
            deletedAt: undefined
          }
        }
      }),
      // Фильтр по упоминаниям
      ...(filters.mentionedUserId && {
        OR: [
          {
            mentions: {
              some: {
                type: 'USER',
                targetId: filters.mentionedUserId
              }
            }
          },
          {
            comments: {
              some: {
                mentions: {
                  some: {
                    type: 'USER',
                    targetId: filters.mentionedUserId
                  }
                }
              }
            }
          }
        ]
      }),
      ...(filters.mentionedTeamId && {
        OR: [
          {
            mentions: {
              some: {
                type: 'TEAM',
                targetId: filters.mentionedTeamId
              }
            }
          },
          {
            comments: {
              some: {
                mentions: {
                  some: {
                    type: 'TEAM',
                    targetId: filters.mentionedTeamId
                  }
                }
              }
            }
          }
        ]
      }),
    };

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            take: 10, // Показываем первые 10 комментариев
            include: {
              author: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          mentions: true,
          _count: {
            select: { 
              comments: true
            }
          }
        }
      }),
      this.prisma.thread.count({ where })
    ]);

    return {
      data: threads.map(thread => ({
        ...thread,
        commentsCount: thread._count.comments,
        lastActivity: thread.comments.length > 0 
          ? thread.comments[thread.comments.length - 1].createdAt
          : thread.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Получение треда по ID со всеми комментариями
   */
  async getThreadById(threadId: string, userId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, name: true, email: true }
            },
            mentions: true
          }
        },
        mentions: true
      }
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Если передан userId, публикуем событие открытия треда
    if (userId) {
      await this.publishThreadOpenedEvent(thread.projectId, threadId, userId, thread.contextType, thread.contextData as Record<string, any>);
    }

    return thread;
  }

  /**
   * Обновление треда (закрытие/открытие, метаданные)
   */
  async updateThread(threadId: string, userId: string, data: UpdateThreadDto) {
    const thread = await this.prisma.thread.update({
      where: { id: threadId },
      data: {
        ...(data.resolved !== undefined && { resolved: data.resolved }),
        ...(data.metadata && { metadata: data.metadata }),
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    // Отправляем WebSocket уведомления
    if (this.websocketManager) {
      this.websocketManager.emitToProject(thread.projectId, {
        type: 'thread:updated',
        data: thread,
        timestamp: Date.now(),
        userId
      } as any);

      if (data.resolved !== undefined) {
        this.websocketManager.emitToProject(thread.projectId, {
          type: 'thread:resolved',
          data: {
            threadId,
            resolved: data.resolved,
            userId
          },
          timestamp: Date.now(),
          userId
        } as any);

        // Создаем уведомления о закрытии/открытии треда
        await this.createThreadStatusNotification(thread, data.resolved, userId);
      }
    }

    // Публикуем Redis события
    await this.publishThreadUpdatedEvent(thread.projectId, thread, userId);
    
    // Если изменился статус resolved, отправляем дополнительное событие
    if (data.resolved !== undefined) {
      await this.publishThreadResolvedEvent(thread.projectId, threadId, data.resolved, userId);
    }

    return thread;
  }

  // ========== COMMENT OPERATIONS ==========

  /**
   * Добавление комментария к треду
   */
  async addComment(threadId: string, userId: string, data: CreateCommentDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Проверяем, что тред существует
      const thread = await tx.thread.findUnique({
        where: { id: threadId },
        select: { id: true, projectId: true, resolved: true }
      });

      if (!thread) {
        throw new Error('Thread not found');
      }

      // Создаем комментарий
      const comment = await tx.comment.create({
        data: {
          threadId,
          authorId: userId,
          content: data.content,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Добавляем упоминания если есть
      if (data.mentions && data.mentions.length > 0) {
        await tx.commentMention.createMany({
          data: data.mentions.map(mention => ({
            commentId: comment.id,
            type: mention.type,
            targetId: mention.targetId,
          }))
        });
      }

      // Обновляем время последнего обновления треда
      await tx.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() }
      });

      return { comment, projectId: thread.projectId };
    });

    // Отправляем WebSocket уведомления
    if (this.websocketManager) {
      this.websocketManager.emitToProject(result.projectId, {
        type: 'comment:created',
        data: result.comment,
        timestamp: Date.now(),
        userId
      } as any);
    }

    // Создаем уведомления
    await this.createCommentNotification(threadId, result.comment.id, userId);
    await this.createMentionNotifications(threadId, result.comment.id, data.mentions || []);

    // Публикуем Redis события
    await this.publishCommentCreatedEvent(result.projectId, result.comment as any, threadId, data.mentions);

    return result.comment;
  }

  /**
   * Обновление комментария
   */
  async updateComment(commentId: string, userId: string, data: UpdateCommentDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Проверяем права на редактирование
      const existingComment = await tx.comment.findUnique({
        where: { id: commentId },
        include: { thread: { select: { projectId: true } } }
      });

      if (!existingComment) {
        throw new Error('Comment not found');
      }

      if (existingComment.authorId !== userId) {
        throw new Error('Not authorized to edit this comment');
      }

      // Обновляем комментарий
      const comment = await tx.comment.update({
        where: { id: commentId },
        data: {
          content: data.content,
          editedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Обновляем упоминания если переданы
      if (data.mentions) {
        // Удаляем старые упоминания
        await tx.commentMention.deleteMany({
          where: { commentId }
        });

        // Добавляем новые упоминания
        if (data.mentions.length > 0) {
          await tx.commentMention.createMany({
            data: data.mentions.map(mention => ({
              commentId,
              type: mention.type,
              targetId: mention.targetId,
            }))
          });
        }
      }

      return { comment, projectId: existingComment.thread.projectId };
    });

    // Отправляем WebSocket уведомления
    if (this.websocketManager) {
      this.websocketManager.emitToProject(result.projectId, {
        type: 'comment:updated',
        data: result.comment,
        timestamp: Date.now(),
        userId
      } as any);
    }

    // Публикуем Redis событие
    await this.publishCommentUpdatedEvent(result.projectId, result.comment as any, data.content);

    return result.comment;
  }

  /**
   * Soft delete комментария
   */
  async deleteComment(commentId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Проверяем права на удаление
      const existingComment = await tx.comment.findUnique({
        where: { id: commentId },
        include: { thread: { select: { id: true, projectId: true } } }
      });

      if (!existingComment) {
        throw new Error('Comment not found');
      }

      if (existingComment.authorId !== userId) {
        throw new Error('Not authorized to delete this comment');
      }

      // Soft delete комментария
      const comment = await tx.comment.update({
        where: { id: commentId },
        data: { 
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return { 
        comment, 
        threadId: existingComment.threadId,
        projectId: existingComment.thread.projectId 
      };
    });

    // Отправляем WebSocket уведомления
    if (this.websocketManager) {
      this.websocketManager.emitToProject(result.projectId, {
        type: 'comment:deleted',
        data: {
          commentId,
          threadId: result.threadId,
          userId
        },
        timestamp: Date.now(),
        userId
      } as any);
    }

    // Публикуем Redis событие
    await this.publishCommentDeletedEvent(result.projectId, commentId, result.threadId, userId);

    return result.comment;
  }

  // ========== NOTIFICATION OPERATIONS ==========

  /**
   * Получение уведомлений пользователя
   */
  async getNotifications(
    userId: string,
    filters: NotificationFilters = {},
    page: number = 1,
    limit: number = 20
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters.read !== undefined && { read: filters.read }),
      ...(filters.type && { type: filters.type }),
      ...(filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        }
      }
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          thread: {
            select: {
              id: true,
              contextType: true,
              contextData: true,
              project: {
                select: { id: true, name: true }
              }
            }
          }
        }
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, read: false }
      })
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    };
  }

  /**
   * Отметка уведомлений как прочитанные
   */
  async markNotificationsAsRead(userId: string, notificationIds?: string[]) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      read: false,
      ...(notificationIds && { id: { in: notificationIds } })
    };

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        read: true,
        readAt: new Date()
      }
    });

    return result;
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async createCommentNotification(threadId: string, commentId: string, authorId: string) {
    // Получаем участников треда (кроме автора комментария)
    const participants = await this.prisma.comment.findMany({
      where: {
        threadId,
        authorId: { not: authorId },
        deletedAt: undefined
      },
      select: { authorId: true },
      distinct: ['authorId']
    });

    // Создаем уведомления для всех участников треда
    if (participants.length > 0) {
      await this.prisma.notification.createMany({
        data: participants.map(participant => ({
          userId: participant.authorId,
          type: 'NEW_COMMENT' as NotificationType,
          threadId,
          commentId,
          title: 'New comment',
          message: 'Someone added a new comment to a thread you\'re participating in',
          data: { threadId, commentId }
        }))
      });
    }
  }

  private async createMentionNotifications(threadId: string, commentId: string | null, mentions: Array<{ type: MentionType; targetId: string }>) {
    if (mentions.length === 0) return;

    for (const mention of mentions) {
      if (mention.type === 'USER') {
        await this.prisma.notification.create({
          data: {
            userId: mention.targetId,
            type: commentId ? 'COMMENT_MENTION' : 'THREAD_MENTION',
            threadId,
            commentId,
            title: commentId ? 'You were mentioned in a comment' : 'You were mentioned in a thread',
            message: commentId 
              ? 'Someone mentioned you in a comment'
              : 'Someone mentioned you in a thread',
            data: { threadId, commentId, mentionType: mention.type, mentionTargetId: mention.targetId }
          }
        });
      } else if (mention.type === 'TEAM') {
        // Получаем всех участников команды
        const teamMembers = await this.prisma.teamMember.findMany({
          where: { teamId: mention.targetId },
          select: { userId: true }
        });

        if (teamMembers.length > 0) {
          await this.prisma.notification.createMany({
            data: teamMembers.map(member => ({
              userId: member.userId,
              type: commentId ? 'COMMENT_MENTION' as NotificationType : 'THREAD_MENTION' as NotificationType,
              threadId,
              commentId,
              title: commentId ? 'Your team was mentioned in a comment' : 'Your team was mentioned in a thread',
              message: commentId 
                ? 'Someone mentioned your team in a comment'
                : 'Someone mentioned your team in a thread',
              data: { threadId, commentId, mentionType: mention.type, mentionTargetId: mention.targetId }
            }))
          });
        }
      }
    }
  }

  private async createThreadStatusNotification(thread: any, resolved: boolean, userId: string) {
    // Получаем всех участников треда (кроме того, кто изменил статус)
    const participants = await this.prisma.comment.findMany({
      where: {
        threadId: thread.id,
        authorId: { not: userId },
        deletedAt: undefined
      },
      select: { authorId: true },
      distinct: ['authorId']
    });

    if (participants.length > 0) {
      await this.prisma.notification.createMany({
        data: participants.map(participant => ({
          userId: participant.authorId,
          type: resolved ? 'THREAD_RESOLVED' as NotificationType : 'THREAD_REOPENED' as NotificationType,
          threadId: thread.id,
          title: resolved ? 'Thread resolved' : 'Thread reopened',
          message: resolved 
            ? 'A thread you\'re participating in has been resolved'
            : 'A thread you\'re participating in has been reopened',
          data: { threadId: thread.id, resolved }
        }))
      });
    }
  }

  // ========== READ STATUS OPERATIONS ==========

  /**
   * Отметка всех комментариев в треде как прочитанных для пользователя
   */
  async markThreadAsRead(userId: string, threadId: string): Promise<{ updatedCount: number }> {
    // Проверяем, что тред существует
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { 
        id: true,
        projectId: true,
        comments: {
          where: { deletedAt: undefined },
          select: { id: true }
        }
      }
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    if (thread.comments.length === 0) {
      return { updatedCount: 0 };
    }

    const commentIds = thread.comments.map(comment => comment.id);
    const result = await this.markCommentsAsRead(userId, commentIds);

    // Публикуем событие прочтения треда
    await this.publishCommentReadEvent(thread.projectId, userId, undefined, threadId);

    return result;
  }

  /**
   * Отметка конкретного комментария как прочитанного
   */
  async markCommentAsRead(userId: string, commentId: string): Promise<CommentReadStatus> {
    // Проверяем, что комментарий существует
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: undefined },
      select: { id: true, threadId: true, thread: { select: { projectId: true } } }
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Используем upsert для создания или обновления записи статуса прочтения
    const readStatus = await this.prisma.commentReadStatus.upsert({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        commentId,
        userId,
        readAt: new Date()
      }
    });

    // Публикуем событие прочтения комментария
    await this.publishCommentReadEvent(comment.thread.projectId, userId, commentId, comment.threadId);

    return readStatus;
  }

  /**
   * Массовая отметка комментариев как прочитанных
   */
  async markCommentsAsRead(userId: string, commentIds: string[]): Promise<{ updatedCount: number }> {
    if (commentIds.length === 0) {
      return { updatedCount: 0 };
    }

    // Проверяем, что комментарии существуют
    const existingComments = await this.prisma.comment.findMany({
      where: { 
        id: { in: commentIds }, 
        deletedAt: undefined 
      },
      select: { id: true }
    });

    const existingCommentIds = existingComments.map(c => c.id);
    
    // Получаем существующие статусы прочтения
    const existingReadStatuses = await this.prisma.commentReadStatus.findMany({
      where: {
        commentId: { in: existingCommentIds },
        userId
      },
      select: { commentId: true }
    });

    const existingReadCommentIds = new Set(existingReadStatuses.map(r => r.commentId));
    const newReadCommentIds = existingCommentIds.filter(id => !existingReadCommentIds.has(id));
    
    let updatedCount = 0;

    // Создаем новые записи статуса прочтения
    if (newReadCommentIds.length > 0) {
      const createResult = await this.prisma.commentReadStatus.createMany({
        data: newReadCommentIds.map(commentId => ({
          commentId,
          userId,
          readAt: new Date()
        }))
      });
      updatedCount += createResult.count;
    }

    // Обновляем существующие записи
    if (existingReadCommentIds.size > 0) {
      const updateResult = await this.prisma.commentReadStatus.updateMany({
        where: {
          commentId: { in: Array.from(existingReadCommentIds) },
          userId
        },
        data: {
          readAt: new Date()
        }
      });
      updatedCount += updateResult.count;
    }

    return { updatedCount };
  }

  /**
   * Получение статистики непрочитанных комментариев для пользователя
   */
  async getUnreadCommentsCount(userId: string, filters: UnreadCommentsFilters = {}): Promise<number> {
    const where: Prisma.CommentWhereInput = {
        deletedAt: undefined ,
      // Исключаем комментарии, которые пользователь уже прочитал
      NOT: {
        readStatus: {
          some: {
            userId
          }
        }
      },
      // Исключаем собственные комментарии
      authorId: {
        not: userId
      },
      // Фильтры по проекту и типу контекста через тред
      ...(filters.projectIds || filters.contextType) && {
        thread: {
          ...(filters.projectIds && { projectId: { in: filters.projectIds } }),
          ...(filters.contextType && { contextType: filters.contextType })
        }
      }
    };

    return this.prisma.comment.count({ where });
  }

  /**
   * Получение тредов с информацией о количестве непрочитанных комментариев
   */
  async getThreadsWithReadStatus(
    userId: string,
    projectId: string,
    filters: ThreadFilters = {},
    page: number = 1,
    limit: number = 20
  ) {
    const where: Prisma.ThreadWhereInput = {
      projectId,
      ...(filters.contextType && { contextType: filters.contextType }),
      ...(filters.resolved !== undefined && { resolved: filters.resolved }),
      ...(filters.creatorId && { creatorId: filters.creatorId }),
      ...(filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        }
      },
      ...(filters.search && {
        comments: {
          some: {
            content: {
              contains: filters.search,
              mode: 'insensitive'
            },
            deletedAt: undefined
          }
        }
      }),
      ...(filters.mentionedUserId && {
        OR: [
          {
            mentions: {
              some: {
                type: 'USER',
                targetId: filters.mentionedUserId
              }
            }
          },
          {
            comments: {
              some: {
                mentions: {
                  some: {
                    type: 'USER',
                    targetId: filters.mentionedUserId
                  }
                }
              }
            }
          }
        ]
      }),
      ...(filters.mentionedTeamId && {
        OR: [
          {
            mentions: {
              some: {
                type: 'TEAM',
                targetId: filters.mentionedTeamId
              }
            }
          },
          {
            comments: {
              some: {
                mentions: {
                  some: {
                    type: 'TEAM',
                    targetId: filters.mentionedTeamId
                  }
                }
              }
            }
          }
        ]
      }),
    };

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            where: { deletedAt: undefined },
            orderBy: { createdAt: 'asc' },
            take: 10,
            include: {
              author: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          mentions: true,
          _count: {
            select: { 
              comments: {
                where: { deletedAt: undefined }
              }
            }
          }
        }
      }),
      this.prisma.thread.count({ where })
    ]);

    // Для каждого треда подсчитываем количество непрочитанных комментариев
    const threadsWithReadStatus = await Promise.all(
      threads.map(async thread => {
        const unreadCommentsCount = await this.prisma.comment.count({
          where: {
            threadId: thread.id,
            deletedAt: undefined,
            authorId: { not: userId }, // Исключаем собственные комментарии
            NOT: {
              readStatus: {
                some: { userId }
              }
            }
          }
        });

        return {
          ...thread,
          commentsCount: thread._count.comments,
          unreadCommentsCount,
          hasUnreadComments: unreadCommentsCount > 0,
          lastActivity: thread.comments.length > 0 
            ? thread.comments[thread.comments.length - 1].createdAt
            : thread.createdAt
        };
      })
    );

    return {
      data: threadsWithReadStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // ========== REDIS EVENT PUBLISHING METHODS ==========

  /**
   * Публиковать событие создания комментария
   */
  private async publishCommentCreatedEvent(
    projectId: string, 
    comment: Comment & { author: { id: string; name: string; email: string; } }, 
    threadId: string,
    mentions?: Array<{ type: 'USER' | 'TEAM'; targetId: string; }>
  ): Promise<void> {
    try {
      // Получаем информацию о треде
      const thread = await this.prisma.thread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          contextType: true,
          contextData: true
        }
      });

      if (!thread) return;

      const event: CommentEvent = {
        type: 'comment:created',
        timestamp: Date.now(),
        userId: comment.authorId,
        projectId,
        data: {
          comment,
          thread: {
            id: thread.id,
            contextType: thread.contextType,
            contextData: thread.contextData as Record<string, any>
          },
          mentions: mentions?.map(m => ({
            type: m.type,
            targetId: m.targetId,
            displayName: '' // Можно дополнить
          }))
        }
      };

      // Публикуем в канал проекта
      await this.redisService.publishCommentEvent(projectId, event);

      // Публикуем события обновления счетчика для всех участников проекта кроме автора
      await this.publishUnreadCountUpdatedEventForAllMembers(projectId, comment.authorId);

      // Если есть упоминания, отправляем персональные уведомления
      if (mentions && mentions.length > 0) {
        for (const mention of mentions) {
          if (mention.type === 'USER') {
            const mentionEvent: CommentEvent = {
              type: 'comment:mention',
              timestamp: Date.now(),
              userId: comment.authorId,
              projectId,
              data: {
                mentionedUserId: mention.targetId,
                comment,
                thread: {
                  id: thread.id,
                  contextType: thread.contextType,
                  contextData: thread.contextData as Record<string, any>
                }
              }
            };
            
            await this.redisService.publishCommentEventToUser(mention.targetId, mentionEvent);
            await this.redisService.publishUnreadNotification(mention.targetId, mentionEvent);
          }
        }
      }
    } catch (error) {
      console.error('Error publishing comment created event:', error);
    }
  }

  /**
   * Публиковать событие обновления комментария
   */
  private async publishCommentUpdatedEvent(
    projectId: string,
    comment: Comment & { author: { id: string; name: string; email: string; } },
    previousContent?: string
  ): Promise<void> {
    try {
      const event: CommentEvent = {
        type: 'comment:updated',
        timestamp: Date.now(),
        userId: comment.authorId,
        projectId,
        data: {
          comment,
          threadId: comment.threadId,
          previousContent
        }
      };

      await this.redisService.publishCommentEvent(projectId, event);
    } catch (error) {
      console.error('Error publishing comment updated event:', error);
    }
  }

  /**
   * Публиковать событие создания треда
   */
  private async publishThreadCreatedEvent(
    thread: Thread & {
      creator: { id: string; name: string; email: string; };
      comments: Array<Comment & { author: { id: string; name: string; email: string; } }>;
    }
  ): Promise<void> {
    try {
      const event: CommentEvent = {
        type: 'thread:created',
        timestamp: Date.now(),
        userId: thread.creatorId,
        projectId: thread.projectId,
        data: { thread }
      };

      await this.redisService.publishCommentEvent(thread.projectId, event);
    } catch (error) {
      console.error('Error publishing thread created event:', error);
    }
  }


  /**
   * Публиковать событие прочтения комментария
   */
  private async publishCommentReadEvent(
    projectId: string,
    userId: string,
    commentId?: string,
    threadId?: string
  ): Promise<void> {
    try {
      if (!threadId && !commentId) return;

      const event: CommentEvent = {
        type: 'comment:read',
        timestamp: Date.now(),
        userId,
        projectId,
        data: {
          commentId,
          threadId: threadId || '',
          readBy: userId,
          readAt: new Date()
        }
      };

      await this.redisService.publishCommentEvent(projectId, event);
      await this.publishUnreadCountUpdatedEvent(projectId, userId);
    } catch (error) {
      console.error('Error publishing comment read event:', error);
    }
  }

  /**
   * Публиковать обновление счетчика непрочитанных комментариев
   */
  private async publishUnreadCountUpdatedEvent(
    projectId: string,
    userId: string
  ): Promise<void> {
    try {
      // Получаем актуальное количество непрочитанных
      const unreadCount = await this.getUnreadCommentsCount(userId, { projectIds: [projectId] });

      const event: CommentEvent = {
        type: 'unread_count:updated',
        timestamp: Date.now(),
        userId,
        projectId,
        data: {
          userId,
          projectId,
          unreadCount
        }
      };

      await this.redisService.publishCommentEventToUser(userId, event);
      await this.redisService.publishUnreadNotification(userId, event);

      // Кэшируем результат
      await this.redisService.cacheUnreadCommentsCount(userId, projectId, unreadCount);
    } catch (error) {
      console.error('Error publishing unread count updated event:', error);
    }
  }

  /**
   * Публиковать обновление счетчика непрочитанных для всех участников проекта кроме указанного пользователя
   */
  private async publishUnreadCountUpdatedEventForAllMembers(
    projectId: string,
    excludeUserId: string
  ): Promise<void> {
    try {
      // Получаем всех участников проекта через команду проекта
      const projectMembers = await this.prisma.teamMember.findMany({
        where: {
          team: {
            projects: {
              some: {
                id: projectId
              }
            }
          },
          userId: {
            not: excludeUserId // Исключаем автора комментария
          }
        },
        select: {
          userId: true
        }
      });

      console.log(`📊 Publishing unread count updates for ${projectMembers.length} project members (excluding ${excludeUserId})`);

      // Публикуем событие обновления счетчика для каждого участника
      const promises = projectMembers.map(async (member) => {
        await this.publishUnreadCountUpdatedEvent(projectId, member.userId);
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error publishing unread count updated events for all members:', error);
    }
  }

  /**
   * Публиковать событие обновления треда
   */
  private async publishThreadUpdatedEvent(
    projectId: string,
    thread: any,
    userId: string
  ): Promise<void> {
    try {
      const event: CommentEvent = {
        type: 'thread:updated',
        timestamp: Date.now(),
        userId,
        projectId,
        data: {
          thread,
          previousData: {} // Можно расширить для передачи предыдущих данных
        }
      };

      await this.redisService.publishCommentEvent(projectId, event);
    } catch (error) {
      console.error('Error publishing thread updated event:', error);
    }
  }

  /**
   * Публиковать событие изменения статуса треда (resolved/unresolved)
   */
  private async publishThreadResolvedEvent(
    projectId: string,
    threadId: string,
    resolved: boolean,
    resolvedBy: string
  ): Promise<void> {
    try {
      const event: CommentEvent = {
        type: 'thread:resolved',
        timestamp: Date.now(),
        userId: resolvedBy,
        projectId,
        data: {
          threadId,
          resolved,
          resolvedBy
        }
      };

      await this.redisService.publishCommentEvent(projectId, event);
    } catch (error) {
      console.error('Error publishing thread resolved event:', error);
    }
  }

  /**
   * Публиковать событие открытия треда
   */
  private async publishThreadOpenedEvent(
    projectId: string,
    threadId: string,
    openedBy: string,
    contextType: any,
    contextData: Record<string, any>
  ): Promise<void> {
    try {
      const event: CommentEvent = {
        type: 'thread:opened',
        timestamp: Date.now(),
        userId: openedBy,
        projectId,
        data: {
          threadId,
          openedBy,
          contextType,
          contextData
        }
      };

      await this.redisService.publishCommentEvent(projectId, event);
    } catch (error) {
      console.error('Error publishing thread opened event:', error);
    }
  }

  /**
   * Публиковать событие удаления комментария
   */
  private async publishCommentDeletedEvent(
    projectId: string,
    commentId: string,
    threadId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const event: CommentEvent = {
        type: 'comment:deleted',
        timestamp: Date.now(),
        userId: deletedBy,
        projectId,
        data: {
          commentId,
          threadId,
          authorId: deletedBy
        }
      };

      await this.redisService.publishCommentEvent(projectId, event);
    } catch (error) {
      console.error('Error publishing comment deleted event:', error);
    }
  }

}