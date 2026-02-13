import { prisma } from '@config/prisma';
import { injectable } from 'inversify';
import { Operation, GraphSnapshot } from './sync.types';
import { ISyncRepository } from './interfaces/sync.interfaces';
import { createEmptySnapshot } from './sync.utils';
import { logger } from '@config/logger';
import { TeamRole } from '@prisma/client';

@injectable()
export class SyncRepository implements ISyncRepository {
  /**
   * Получает текущий снимок проекта
   */
  async getProjectSnapshot(projectId: string): Promise<{ snapshot: GraphSnapshot; version: number }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        data: true,
        projectVersion: {
          select: {
            version: true
          }
        },
        graphSnapshots: {
          select: {
            id: true,
            layers: true,
            metadata: true,
            variables: true,
            name: true,
            order: true,
            isActive: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    let snapshot: GraphSnapshot;
    
    if (project.data) {
      // Используем существующие данные проекта
      snapshot = this.migrateOldFormat(project.data);
    } else if (project.graphSnapshots.length > 0) {
      // Создаем snapshot из GraphSnapshot записей
      snapshot = {
        timelines: {},
        timelinesMetadata: []
      };
      
      for (const graphSnapshot of project.graphSnapshots) {
        snapshot.timelines[graphSnapshot.id] = {
          layers: graphSnapshot.layers || { root: { id: "root", name: "Main layer", nodes: {}, edges: {}, nodeIds: [] } },
          metadata: graphSnapshot.metadata || {},
          variables: Array.isArray(graphSnapshot.variables) ? graphSnapshot.variables : []
        };
        
        snapshot.timelinesMetadata!.push({
          id: graphSnapshot.id,
          name: graphSnapshot.name,
          createdAt: Date.now(),
          isActive: graphSnapshot.isActive,
          order: graphSnapshot.order || 0
        });
      }
    } else {
      // Создаем пустой snapshot - это не должно происходить в новой архитектуре
      logger.warn(`[DB] No data or snapshots found for project ${projectId}, creating empty snapshot`);
      snapshot = createEmptySnapshot(projectId);
    }

    const version = project.projectVersion?.version || 0;

    return { snapshot, version };
  }

  /**
   * Сохраняет изменения в транзакции
   * Атомарно обновляет снимок и добавляет операции
   */
  async saveChangesInTransaction(
    projectId: string,
    newSnapshot: GraphSnapshot,
    operations: Operation[],
    newVersion: number
  ): Promise<void> {
    const startTime = Date.now();
    logger.info(`[DB] Starting transaction`, {
      projectId,
      operationsCount: operations.length,
      newVersion,
      snapshotSize: JSON.stringify(newSnapshot).length
    });

    try {
      await prisma.$transaction(async (tx) => {
        const txStartTime = Date.now();

        // 1. Обновляем снимок проекта в поле data
        logger.debug(`[DB] Updating project snapshot`, { projectId });
        await tx.project.update({
          where: { id: projectId },
          data: {
            data: newSnapshot as any,
            updatedAt: new Date()
          }
        });

        // 2. Сохраняем операции массово для увеличения производительности
        if (operations.length > 0) {
          const operationsStartTime = Date.now();
          logger.debug(`[DB] Creating operations`, {
            projectId,
            count: operations.length,
            types: operations.map(op => op.type)
          });
          
          await tx.operation.createMany({
            data: operations.map(operation => ({
              projectId,
              type: operation.type,
              timelineId: operation.timelineId,
              layerId: operation.layerId,
              payload: operation.payload,
              userId: operation.userId,
              deviceId: operation.deviceId,
              timestamp: BigInt(operation.timestamp),
              version: newVersion
            }))
          });
          const operationsTime = Date.now() - operationsStartTime;
          logger.debug(`[DB] Created operations`, {
            projectId,
            count: operations.length,
            timeMs: operationsTime
          });
        }

        // 3. Обновляем версию проекта
        logger.debug(`[DB] Updating project version`, { projectId, newVersion });
        await tx.projectVersion.upsert({
          where: { projectId },
          create: {
            projectId,
            version: newVersion,
            lastSync: new Date()
          },
          update: {
            version: newVersion,
            lastSync: new Date()
          }
        });

        // 4. Обновляем соответствующие GraphSnapshot для каждого затронутого таймлайна
        logger.debug(`[DB] Updating graph snapshots for timelines`, { projectId, timelineCount: Object.keys(newSnapshot.timelines).length });
        
        // Получаем уникальные timelineId из операций
        const uniqueTimelineIds = [...new Set(operations.map(op => op.timelineId))];
        
        for (const timelineId of uniqueTimelineIds) {
          const timelineData = newSnapshot.timelines[timelineId];
          
          if (!timelineData) {
            logger.warn(`[DB] Timeline data not found for timelineId: ${timelineId}`);
            continue;
          }

          // Находим соответствующий GraphSnapshot по ID
          const existingSnapshot = await tx.graphSnapshot.findUnique({
            where: { id: timelineId }
          });

          if (existingSnapshot) {
            // Обновляем существующий snapshot
            await tx.graphSnapshot.update({
              where: { id: timelineId },
              data: {
                version: newVersion,
                layers: timelineData.layers || {},
                metadata: timelineData.metadata || {},
                variables: timelineData.variables || [],
                timestamp: BigInt(Date.now()),
                updatedAt: new Date()
              }
            });
            logger.debug(`[DB] Updated existing snapshot: ${timelineId}`);
          } else {
            logger.warn(`[DB] GraphSnapshot not found for timelineId: ${timelineId}, this might indicate data inconsistency`);
          }
        }

        const txTime = Date.now() - txStartTime;
        logger.debug(`[DB] Transaction completed`, {
          projectId,
          timeMs: txTime
        });
      });

      const totalTime = Date.now() - startTime;
      logger.info(`[DB] Successfully saved changes`, {
        projectId,
        operationsCount: operations.length,
        totalTimeMs: totalTime,
        newVersion
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`[DB] Transaction failed`, {
        projectId,
        operationsCount: operations.length,
        timeMs: totalTime,
        error: error instanceof Error ? {
          message: error.message,
          code: (error as any).code,
          stack: error.stack?.substring(0, 500)
        } : error
      });
      throw error;
    }
  }

  /**
   * Получает операции после указанной версии
   */
  async getOperationsAfterVersion(projectId: string, afterVersion: number): Promise<Operation[]> {
    const operations = await prisma.operation.findMany({
      where: {
        projectId,
        version: {
          gt: afterVersion
        }
      },
      orderBy: {
        version: 'asc'
      }
    });

    return operations.map(op => ({
      id: op.id,
      type: op.type,
      timelineId: op.timelineId,
      layerId: op.layerId,
      payload: op.payload as any,
      timestamp: Number(op.timestamp),
      userId: op.userId || undefined,
      deviceId: op.deviceId
    }));
  }

  /**
   * Проверяет доступ пользователя к проекту
   */
  async checkUserAccess(userId: string, projectId: string): Promise<boolean> {
    // 1. Проверяем, является ли пользователь создателем проекта (самый высокий приоритет)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { creatorId: true, teamProjects: { select: { teamId: true } } }
    });

    if (!project) {
      return false; // Проект не найден
    }

    if (project.creatorId === userId) {
      return true; // Создатель всегда имеет доступ
    }

    // 2. Проверяем прямой доступ через ProjectMember
    const directMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: userId
      }
    });

    if (directMember && directMember.role !== 'VIEWER') {
      return true; // У пользователя есть прямой доступ на редактирование
    }

    // 3. Проверка доступа через команду
    const teamId = project.teamProjects[0]?.teamId;
    if (!teamId) {
      // Если проект не в команде и предыдущие проверки не прошли
      return false;
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: userId,
      },
    });

    if (teamMember) {
      // Роли, которые могут редактировать
      const editingRoles: TeamRole[] = ['ADMINISTRATOR', 'MANAGER', 'MEMBER'];
      if (editingRoles.includes(teamMember.role)) {
        return true;
      }
    }
    
    // Если ни одна из проверок не прошла
    return false;
  }

  /**
   * Получает текущую версию проекта
   */
  async getProjectVersion(projectId: string): Promise<number> {
    const projectVersion = await prisma.projectVersion.findUnique({
      where: { projectId }
    });

    return projectVersion?.version || 0;
  }

  /**
   * Миграция старого формата данных
   */
  private migrateOldFormat(data: any): GraphSnapshot {
    // Если уже новый формат с таймлайнами
    if (data.timelines) {
      return data as GraphSnapshot;
    }

    // Миграция старого формата
    return {
      timelines: {
        'base-timeline': {
          layers: data.layers || {},
          metadata: data.layerMetadata || {},
          variables: data.variables || [],
          lastLayerNumber: data.lastLayerNumber || 0
        }
      },
      projectName: data.projectName || 'Untitled',
      projectId: data.projectId,
      _lastModified: data._lastModified || Date.now()
    };
  }
} 