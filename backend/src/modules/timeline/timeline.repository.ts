import { injectable } from 'inversify';
import { prisma } from '@config/prisma';
import { ITimelineRepository } from './interfaces/timeline.interfaces';
import { 
  CreateTimelineDto, 
  UpdateTimelineDto, 
  TimelineResponse, 
  TimelinesQueryParams 
} from './timeline.types';
import { createError } from '@middlewares/errorHandler';

@injectable()
export class TimelineRepository implements ITimelineRepository {
  
  async create(userId: string, data: CreateTimelineDto): Promise<TimelineResponse> {
    // Проверяем доступ пользователя к проекту
    const hasAccess = await this.checkProjectAccess(userId, data.projectId);
    if (!hasAccess) {
      throw createError('Access denied to project', 403);
    }

    // Если order не указан, получаем следующий порядковый номер
    let order = data.order;
    if (order === undefined) {
      const maxOrder = await prisma.graphSnapshot.findFirst({
        where: { projectId: data.projectId },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      order = (maxOrder?.order || 0) + 1;
    }

    const snapshot = await prisma.graphSnapshot.create({
      data: {
        projectId: data.projectId,
        version: 1, // Начальная версия для нового таймлайна
        layers: {},
        metadata: {},
        variables: [],
        timestamp: BigInt(Date.now()),
        name: data.name,
        description: data.description,
        order: order,
        isActive: false
      }
    });

    return this.mapToResponse(snapshot);
  }

  async findByProject(params: TimelinesQueryParams): Promise<TimelineResponse[]> {
    const {
      projectId,
      limit = 50,
      offset = 0,
      orderBy = 'order',
      sortDirection = 'asc'
    } = params;

    const snapshots = await prisma.graphSnapshot.findMany({
      where: { projectId },
      orderBy: { [orderBy]: sortDirection },
      take: limit,
      skip: offset,
      select: {
        id: true,
        projectId: true,
        name: true,
        description: true,
        order: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // НЕ выбираем layers, metadata, variables для экономии трафика
      }
    });

    return snapshots.map(this.mapToResponse);
  }

  async findById(timelineId: string): Promise<TimelineResponse | null> {
    const snapshot = await prisma.graphSnapshot.findUnique({
      where: { id: timelineId },
      select: {
        id: true,
        projectId: true,
        name: true,
        description: true,
        order: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // НЕ выбираем layers, metadata, variables для экономии трафика
      }
    });

    return snapshot ? this.mapToResponse(snapshot) : null;
  }

  async update(timelineId: string, userId: string, data: UpdateTimelineDto): Promise<TimelineResponse> {
    // Проверяем доступ пользователя к таймлайну
    const hasAccess = await this.checkUserAccess(userId, timelineId);
    if (!hasAccess) {
      throw createError('Access denied to timeline', 403);
    }

    const snapshot = await prisma.graphSnapshot.update({
      where: { id: timelineId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        description: true,
        order: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return this.mapToResponse(snapshot);
  }

  async delete(timelineId: string, userId: string): Promise<void> {
    // Проверяем доступ пользователя к таймлайну
    const hasAccess = await this.checkUserAccess(userId, timelineId);
    if (!hasAccess) {
      throw createError('Access denied to timeline', 403);
    }

    // Проверяем, что это не единственный таймлайн в проекте
    const snapshot = await prisma.graphSnapshot.findUnique({
      where: { id: timelineId },
      select: { projectId: true }
    });

    if (!snapshot) {
      throw createError('Timeline not found', 404);
    }

    const timelineCount = await prisma.graphSnapshot.count({
      where: { projectId: snapshot.projectId }
    });

    if (timelineCount <= 1) {
      throw createError('Cannot delete the last timeline in project', 400);
    }

    await prisma.graphSnapshot.delete({
      where: { id: timelineId }
    });
  }

  async setActive(timelineId: string, projectId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Деактивируем все таймлайны проекта
      await tx.graphSnapshot.updateMany({
        where: { projectId },
        data: { isActive: false }
      });

      // Активируем выбранный таймлайн
      await tx.graphSnapshot.update({
        where: { id: timelineId },
        data: { isActive: true }
      });
    });
  }

  async checkUserAccess(userId: string, timelineId: string): Promise<boolean> {
    const snapshot = await prisma.graphSnapshot.findUnique({
      where: { id: timelineId },
      select: { projectId: true }
    });

    if (!snapshot) {
      return false;
    }

    // Используем уже исправленный метод checkProjectAccess
    return this.checkProjectAccess(userId, snapshot.projectId);
  }

  async duplicate(timelineId: string, userId: string, newName: string): Promise<TimelineResponse> {
    // Проверяем доступ пользователя к таймлайну
    const hasAccess = await this.checkUserAccess(userId, timelineId);
    if (!hasAccess) {
      throw createError('Access denied to timeline', 403);
    }

    const originalSnapshot = await prisma.graphSnapshot.findUnique({
      where: { id: timelineId }
    });

    if (!originalSnapshot) {
      throw createError('Timeline not found', 404);
    }

    // Получаем следующий порядковый номер
    const maxOrder = await prisma.graphSnapshot.findFirst({
      where: { projectId: originalSnapshot.projectId },
      orderBy: { order: 'desc' },
      select: { order: true }
    });
    const nextOrder = (maxOrder?.order || 0) + 1;

    const duplicatedSnapshot = await prisma.graphSnapshot.create({
      data: {
        projectId: originalSnapshot.projectId,
        version: originalSnapshot.version + 1, // Увеличиваем версию
        layers: originalSnapshot.layers || {}, // Копируем данные
        metadata: originalSnapshot.metadata || {},
        variables: originalSnapshot.variables || [],
        timestamp: BigInt(Date.now()),
        name: newName,
        description: originalSnapshot.description,
        order: nextOrder,
        isActive: false
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        description: true,
        order: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return this.mapToResponse(duplicatedSnapshot);
  }

  private async checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
    // Проверяем прямое участие в проекте
    const directMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (directMember) {
      return true;
    }

    // Проверяем доступ через команды
    const teamAccess = await prisma.teamProject.findFirst({
      where: {
        projectId,
        team: {
          members: {
            some: {
              userId,
              // Учитываем все роли участников команды
              role: {
                in: ['ADMINISTRATOR', 'MANAGER', 'MEMBER', 'OBSERVER']
              }
            }
          }
        }
      },
      include: {
        team: {
          include: {
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!teamAccess || teamAccess.team.members.length === 0) {
      return false;
    }

    const userRole = teamAccess.team.members[0].role;
    const projectAccess = teamAccess.accessLevel;

    // Определяем доступ на основе уровня доступа к проекту и роли пользователя
    switch (projectAccess) {
      case 'OPEN':
        // Все участники команды имеют доступ
        return true;
      case 'RESTRICTED':
        // Доступ имеют участники с ролью MEMBER и выше
        return ['ADMINISTRATOR', 'MANAGER', 'MEMBER'].includes(userRole);
      case 'PRIVATE':
        // Доступ имеют только администраторы и владелец команды
        return ['ADMINISTRATOR'].includes(userRole) || teamAccess.team.ownerId === userId;
      default:
        return false;
    }
  }

  private mapToResponse(snapshot: any): TimelineResponse {
    return {
      id: snapshot.id,
      projectId: snapshot.projectId,
      name: snapshot.name,
      description: snapshot.description,
      order: snapshot.order,
      isActive: snapshot.isActive,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt
    };
  }
}
