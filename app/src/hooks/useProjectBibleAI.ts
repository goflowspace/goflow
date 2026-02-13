import {useCallback, useState} from 'react';

import {aiService} from '../services/aiService';

interface UseProjectBibleAIResult {
  isLoading: boolean;
  activeField: string | null;
  error: string | null;
  pendingContent: {[fieldType: string]: string};
  originalContent: {[fieldType: string]: string};
  suggestionIds: {[fieldType: string]: string};
  explanations: {[fieldType: string]: string};
  generateContent: (projectId: string, fieldType: string, baseDescription?: string, usePipeline?: boolean) => Promise<string>;
  generateWithPipeline: (projectId: string, fieldType: string, baseDescription?: string) => Promise<string>;
  generateComprehensiveBible: (projectId: string, baseDescription: string) => Promise<any>;
  acceptContent: (fieldType: string, onSave: (fieldType: string, content: string) => void, onServerSave: (content: string) => Promise<void>) => Promise<void>;
  rejectContent: (fieldType: string, onRestore: (fieldType: string, content: string) => void) => Promise<void>;
  isPending: (fieldType: string) => boolean;
  isActiveField: (fieldType: string) => boolean;
  clearError: () => void;
  saveOriginalContent: (fieldType: string, content: string) => void;
}

export const useProjectBibleAI = (): UseProjectBibleAIResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<{[fieldType: string]: string}>({});
  const [originalContent, setOriginalContent] = useState<{[fieldType: string]: string}>({});
  const [suggestionIds, setSuggestionIds] = useState<{[fieldType: string]: string}>({});
  const [explanations, setExplanations] = useState<{[fieldType: string]: string}>({});

  const generateContent = useCallback(async (projectId: string, fieldType: string, baseDescription?: string, usePipeline = false): Promise<string> => {
    setIsLoading(true);
    setActiveField(fieldType);
    setError(null);

    try {
      let result: {content: string; suggestionId: string; explanation?: string} | undefined;
      if (usePipeline) {
        // Используем новый пайплайн
        const pipelineResult = await aiService.generateProjectBibleWithPipeline(projectId, fieldType, baseDescription);
        result = {
          content: pipelineResult.content,
          suggestionId: pipelineResult.suggestionId || '', // Используем suggestionId из ответа пайплайна
          explanation: pipelineResult.explanation || ''
        };

        console.log(`🚀 Пайплайн выполнен за ${pipelineResult.totalTime}ms`, pipelineResult.metadata);
      }

      if (!result) {
        throw new Error('No result from pipeline');
      }

      // Сохраняем полученный контент, suggestion ID и объяснение
      setPendingContent((prev) => ({...prev, [fieldType]: result.content}));
      setSuggestionIds((prev) => ({...prev, [fieldType]: result.suggestionId}));
      if (result.explanation) {
        setExplanations((prev) => ({...prev, [fieldType]: result.explanation!}));
      }

      return result.content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка генерации контента';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setActiveField(null);
    }
  }, []);

  /**
   * Комплексная генерация всей библии проекта
   */
  const generateComprehensiveBible = useCallback(async (projectId: string, baseDescription: string) => {
    setIsLoading(true);
    setActiveField('comprehensive');
    setError(null);

    try {
      console.log('🚀 Starting comprehensive bible generation...');

      const result = await aiService.generateComprehensiveBible(projectId, baseDescription);

      if (result.partialSuccess) {
        console.log('⚠️ Comprehensive bible generation completed with partial failure');
        console.log(`📊 Generated ${result.data.metadata.fieldsGenerated} out of ${result.data.metadata.totalFields} fields`);
        console.log(`❌ Failed fields: ${result.data.metadata.failedFields}`);
        if (result.data.errors) {
          console.log('📋 Error details:', result.data.errors);
        }

        // Показываем предупреждение о частичной ошибке, но не прерываем процесс
        const failedFieldNames = result.data.errors ? Object.keys(result.data.errors).join(', ') : 'некоторые поля';
        setError(`Частичная ошибка: не удалось сгенерировать ${failedFieldNames}. Остальные поля созданы успешно.`);
      } else {
        console.log('✅ Comprehensive bible generation completed successfully');
        console.log(`📊 Generated ${result.data.metadata.fieldsGenerated} fields`);
      }

      console.log(`💰 Total cost: ${result.data.metadata.totalCost} credits`);

      return result.data;
    } catch (error) {
      console.error('Comprehensive bible generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(`Ошибка генерации библии: ${errorMessage}`);
      throw error;
    } finally {
      setIsLoading(false);
      setActiveField(null);
    }
  }, []);

  const acceptContent = useCallback(
    async (fieldType: string, onSave: (fieldType: string, content: string) => void, onServerSave: (content: string) => Promise<void>): Promise<void> => {
      const content = pendingContent[fieldType];
      const suggestionId = suggestionIds[fieldType];

      if (!content || !suggestionId) return;

      try {
        // 1. Сначала сохраняем на сервер (критично!)
        await onServerSave(content);

        // 2. Принимаем suggestion в API (логируем что принят)
        await aiService.acceptSuggestion(suggestionId);

        // 3. Только после успешного сохранения обновляем локальное состояние
        onSave(fieldType, content);

        // 4. Очищаем AI состояние
        setPendingContent((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
        setOriginalContent((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
        setSuggestionIds((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
        setExplanations((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
      } catch (err) {
        console.error('Failed to accept suggestion:', err);
        throw err;
      }
    },
    [pendingContent, suggestionIds]
  );

  const rejectContent = useCallback(
    async (fieldType: string, onRestore: (fieldType: string, content: string) => void): Promise<void> => {
      const original = originalContent[fieldType] || '';
      const suggestionId = suggestionIds[fieldType];

      if (!suggestionId) return;

      try {
        // 1. Отклоняем suggestion в API
        await aiService.rejectSuggestion(suggestionId);

        // 2. Восстанавливаем оригинальный контент
        const original = originalContent[fieldType] || '';
        onRestore(fieldType, original);

        // 3. Очищаем состояние
        setPendingContent((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
        setOriginalContent((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
        setSuggestionIds((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
        setExplanations((prev) => {
          const newState = {...prev};
          delete newState[fieldType];
          return newState;
        });
      } catch (err) {
        console.error('Failed to reject suggestion:', err);
        throw err;
      }
    },
    [originalContent, suggestionIds]
  );

  const isPending = useCallback(
    (fieldType: string): boolean => {
      return fieldType in pendingContent;
    },
    [pendingContent]
  );

  const isActiveField = useCallback(
    (fieldType: string): boolean => {
      return activeField === fieldType;
    },
    [activeField]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const saveOriginalContent = useCallback((fieldType: string, content: string) => {
    setOriginalContent((prev) => ({...prev, [fieldType]: content}));
  }, []);

  // Удобный метод для генерации через пайплайн
  const generateWithPipeline = useCallback(
    async (projectId: string, fieldType: string, baseDescription?: string): Promise<string> => {
      return generateContent(projectId, fieldType, baseDescription, true);
    },
    [generateContent]
  );

  return {
    isLoading,
    activeField,
    error,
    pendingContent,
    originalContent,
    suggestionIds,
    explanations,
    generateContent,
    generateWithPipeline,
    generateComprehensiveBible,
    acceptContent,
    rejectContent,
    isPending,
    isActiveField,
    clearError,
    saveOriginalContent
  };
};
