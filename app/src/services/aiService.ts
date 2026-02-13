import type {AICredits, AISettings, AISuggestion} from '../types/ai';
import {InsufficientCreditsError, api} from './api';

class AIService {
  /**
   * Получение настроек AI пользователя
   */
  async getSettings(): Promise<AISettings> {
    const response = await api.getAISettings();
    return response.settings;
  }

  /**
   * Обновление настроек AI пользователя
   */
  async updateSettings(settings: Partial<AISettings>): Promise<AISettings> {
    const response = await api.updateAISettings(settings);
    return response.settings;
  }

  /**
   * Принятие AI предложения
   */
  async acceptSuggestion(suggestionId: string, feedback?: string): Promise<void> {
    await api.acceptAISuggestion(suggestionId, feedback);
  }

  /**
   * Отклонение AI предложения
   */
  async rejectSuggestion(suggestionId: string, feedback?: string): Promise<void> {
    await api.rejectAISuggestion(suggestionId, feedback);
  }

  /**
   * Получение истории предложений
   */
  async getSuggestionsHistory(
    projectId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    suggestions: AISuggestion[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const response = await api.getAISuggestionsHistory(projectId, limit, offset);

    return {
      suggestions: response.suggestions,
      pagination: response.pagination
    };
  }

  /**
   * Получение баланса кредитов
   */
  async getCreditsBalance(): Promise<AICredits> {
    const response = await api.getAICreditsBalance();
    return response.credits;
  }

  /**
   * Генерация контента для полей библии проекта через пайплайн (новый метод)
   */
  async generateProjectBibleWithPipeline(
    projectId: string,
    fieldType: string,
    baseDescription?: string
  ): Promise<{
    content: string;
    explanation?: string;
    metadata: any;
    pipelineId: string;
    totalTime: number;
    suggestionId?: string;
  }> {
    const response = await api.generateProjectBibleWithPipeline(projectId, fieldType, baseDescription);
    return {
      content: response.content,
      explanation: response.explanation,
      metadata: response.metadata || {},
      pipelineId: response.metadata?.pipelineId || '',
      totalTime: response.metadata?.totalTime || 0,
      suggestionId: response.suggestionId
    };
  }

  /**
   * Комплексная генерация всей библии проекта
   */
  async generateComprehensiveBible(projectId: string, baseDescription: string) {
    const response = await api.generateComprehensiveBible(projectId, baseDescription);

    // Обрабатываем как полный успех, так и частичный успех
    if (!response.success && !response.partialSuccess) {
      throw new Error(response.message || 'Ошибка комплексной генерации библии');
    }

    return response;
  }

  /**
   * Генерация AI предложений (временная заглушка)
   * TODO: Реализовать этот метод когда API будет готов
   */
  async generateSuggestions(request: any): Promise<any[]> {
    console.warn('generateSuggestions method is not implemented yet');
    // Возвращаем пустой массив как временное решение
    return [];
  }
}

export const aiService = new AIService();

// Экспортируем класс ошибки для использования в других файлах
export {InsufficientCreditsError};
