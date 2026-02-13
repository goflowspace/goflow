/**
 * Утилиты для проверки состояния синхронизации
 * Можно использовать для диагностики проблем в CloudRun
 */

import { logger } from '@config/logger';
import { prisma } from '@config/prisma';

interface SyncHealthStatus {
  projectId: string;
  projectExists: boolean;
  hasSnapshot: boolean;
  currentVersion: number;
  operationsCount: number;
  lastOperationTime?: Date;
  recentOperationTypes: string[];
  isHealthy: boolean;
  issues: string[];
}

/**
 * Проверяет состояние синхронизации для проекта
 */
export async function checkSyncHealth(projectId: string): Promise<SyncHealthStatus> {
  const issues: string[] = [];
  
  try {
    // 1. Проверяем существование проекта
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        data: true,
        projectVersion: {
          select: {
            version: true,
            lastSync: true
          }
        }
      }
    });

    if (!project) {
      return {
        projectId,
        projectExists: false,
        hasSnapshot: false,
        currentVersion: 0,
        operationsCount: 0,
        recentOperationTypes: [],
        isHealthy: false,
        issues: ['Project not found']
      };
    }

    // 2. Проверяем наличие снапшота
    const hasSnapshot = !!project.data;
    if (!hasSnapshot) {
      issues.push('Project snapshot is missing');
    }

    // 3. Получаем версию проекта
    const currentVersion = project.projectVersion?.version || 0;
    
    // 4. Получаем статистику операций
    const operationsCount = await prisma.operation.count({
      where: { projectId }
    });

    // 5. Получаем последние операции
    const recentOperations = await prisma.operation.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        type: true,
        timestamp: true,
        version: true
      }
    });

    const lastOperationTime = recentOperations.length > 0 
      ? new Date(Number(recentOperations[0].timestamp))
      : undefined;

    const recentOperationTypes = [...new Set(recentOperations.map(op => op.type))];

    // 6. Проверки здоровья
    if (operationsCount === 0 && currentVersion > 0) {
      issues.push('Version > 0 but no operations found');
    }

    if (recentOperations.length > 0) {
      const versionsAreSequential = recentOperations
        .slice(0, -1)
        .every((op, index) => op.version === recentOperations[index + 1].version + 1);
      
      if (!versionsAreSequential) {
        issues.push('Operation versions are not sequential');
      }
    }

    // 7. Проверяем последнюю синхронизацию
    const lastSync = project.projectVersion?.lastSync;
    if (lastSync) {
      const timeSinceLastSync = Date.now() - lastSync.getTime();
      const hoursAgo = timeSinceLastSync / (1000 * 60 * 60);
      
      if (hoursAgo > 24) {
        issues.push(`Last sync was ${Math.round(hoursAgo)} hours ago`);
      }
    }

    return {
      projectId,
      projectExists: true,
      hasSnapshot,
      currentVersion,
      operationsCount,
      lastOperationTime,
      recentOperationTypes,
      isHealthy: issues.length === 0,
      issues
    };

  } catch (error) {
    logger.error('[HEALTHCHECK] Error checking sync health:', error);
    return {
      projectId,
      projectExists: false,
      hasSnapshot: false,
      currentVersion: 0,
      operationsCount: 0,
      recentOperationTypes: [],
      isHealthy: false,
      issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Проверяет общее состояние системы синхронизации
 */
export async function checkOverallSyncHealth(): Promise<{
  totalProjects: number;
  healthyProjects: number;
  projectsWithIssues: number;
  commonIssues: Record<string, number>;
  isSystemHealthy: boolean;
}> {
  try {
    // Получаем все проекты
    const projects = await prisma.project.findMany({
      select: { id: true }
    });

    const healthChecks = await Promise.all(
      projects.map(p => checkSyncHealth(p.id))
    );

    const healthyProjects = healthChecks.filter(h => h.isHealthy).length;
    const projectsWithIssues = healthChecks.length - healthyProjects;

    // Собираем статистику по проблемам
    const commonIssues: Record<string, number> = {};
    healthChecks.forEach(check => {
      check.issues.forEach(issue => {
        commonIssues[issue] = (commonIssues[issue] || 0) + 1;
      });
    });

    return {
      totalProjects: projects.length,
      healthyProjects,
      projectsWithIssues,
      commonIssues,
      isSystemHealthy: projectsWithIssues === 0
    };

  } catch (error) {
    logger.error('[HEALTHCHECK] Error checking overall health:', error);
    return {
      totalProjects: 0,
      healthyProjects: 0,
      projectsWithIssues: 0,
      commonIssues: {},
      isSystemHealthy: false
    };
  }
}

/**
 * Логирует подробный отчет о состоянии синхронизации
 */
export async function logSyncHealthReport(projectId?: string): Promise<void> {
  if (projectId) {
    const health = await checkSyncHealth(projectId);
    logger.info('[HEALTHCHECK] Project sync health:', health);
  } else {
    const overallHealth = await checkOverallSyncHealth();
    logger.info('[HEALTHCHECK] Overall sync health:', overallHealth);
  }
} 