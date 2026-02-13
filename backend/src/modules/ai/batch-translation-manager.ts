/**
 * Менеджер для управления состоянием батчевых переводов
 */

interface BatchTranslationSession {
  sessionId: string;
  userId: string;
  projectId: string;
  timelineId: string;
  totalNodes: number;
  processedNodes: number;
  successfulNodes: number;
  failedNodes: number;
  startTime: Date;
  status: 'running' | 'cancelled' | 'completed' | 'failed';
  isCancelled: boolean;
  errors: string[];
}

class BatchTranslationManager {
  private sessions: Map<string, BatchTranslationSession> = new Map();

  /**
   * Создает новую сессию перевода
   */
  createSession(
    sessionId: string,
    userId: string, 
    projectId: string,
    timelineId: string,
    totalNodes: number
  ): BatchTranslationSession {
    const session: BatchTranslationSession = {
      sessionId,
      userId,
      projectId,
      timelineId,
      totalNodes,
      processedNodes: 0,
      successfulNodes: 0,
      failedNodes: 0,
      startTime: new Date(),
      status: 'running',
      isCancelled: false,
      errors: []
    };

    this.sessions.set(sessionId, session);
    console.log(`📝 [BatchTranslationManager] Created session: ${sessionId}`);
    
    return session;
  }

  /**
   * Получает сессию по ID
   */
  getSession(sessionId: string): BatchTranslationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Отменяет сессию перевода
   */
  cancelSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ [BatchTranslationManager] Session not found: ${sessionId}`);
      return false;
    }

    if (session.status !== 'running') {
      console.warn(`⚠️ [BatchTranslationManager] Cannot cancel session in status: ${session.status}`);
      return false;
    }

    session.isCancelled = true;
    session.status = 'cancelled';
    console.log(`🛑 [BatchTranslationManager] Cancelled session: ${sessionId}`);
    
    return true;
  }

  /**
   * Проверяет отменена ли сессия
   */
  isCancelled(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.isCancelled : false;
  }

  /**
   * Обновляет прогресс сессии
   */
  updateProgress(
    sessionId: string, 
    processedNodes: number, 
    successfulNodes: number, 
    failedNodes: number,
    error?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.processedNodes = processedNodes;
    session.successfulNodes = successfulNodes;
    session.failedNodes = failedNodes;

    if (error) {
      session.errors.push(error);
    }

    // Автоматически завершаем сессию если все узлы обработаны
    if (processedNodes >= session.totalNodes && session.status === 'running') {
      session.status = 'completed';
      console.log(`✅ [BatchTranslationManager] Completed session: ${sessionId}`);
    }
  }

  /**
   * Помечает сессию как завершенную с ошибкой
   */
  failSession(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'failed';
    session.errors.push(error);
    console.log(`❌ [BatchTranslationManager] Failed session: ${sessionId} - ${error}`);
  }

  /**
   * Удаляет сессию (очистка)
   */
  removeSession(sessionId: string): void {
    const removed = this.sessions.delete(sessionId);
    if (removed) {
      console.log(`🧹 [BatchTranslationManager] Removed session: ${sessionId}`);
    }
  }

  /**
   * Получает все активные сессии пользователя
   */
  getUserActiveSessions(userId: string): BatchTranslationSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.status === 'running');
  }

  /**
   * Очистка старых сессий (старше 1 часа)
   */
  cleanupOldSessions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sessionsToRemove: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < oneHourAgo && session.status !== 'running') {
        sessionsToRemove.push(sessionId);
      }
    }

    sessionsToRemove.forEach(sessionId => {
      this.sessions.delete(sessionId);
      console.log(`🧹 [BatchTranslationManager] Cleaned up old session: ${sessionId}`);
    });

    if (sessionsToRemove.length > 0) {
      console.log(`🧹 [BatchTranslationManager] Cleaned up ${sessionsToRemove.length} old sessions`);
    }
  }

  /**
   * Получает статистику менеджера
   */
  getStats(): { total: number; running: number; completed: number; cancelled: number; failed: number } {
    const sessions = Array.from(this.sessions.values());
    return {
      total: sessions.length,
      running: sessions.filter(s => s.status === 'running').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      cancelled: sessions.filter(s => s.status === 'cancelled').length,
      failed: sessions.filter(s => s.status === 'failed').length
    };
  }
}

// Экспортируем синглтон
export const batchTranslationManager = new BatchTranslationManager();

// Запускаем периодическую очистку каждые 30 минут
setInterval(() => {
  batchTranslationManager.cleanupOldSessions();
}, 30 * 60 * 1000);
