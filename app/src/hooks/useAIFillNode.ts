import {useCallback} from 'react';

import {getNotificationManager} from '@components/Notifications';

import {AIFillService} from '../services/aiFillService';
import {useCreditsRefresh} from './useCreditsRefresh';
import {useCurrentProject} from './useCurrentProject';

interface UseAIFillNodeOptions {
  onLoadingChange?: (nodeId: string, loading: boolean) => void;
}

/**
 * Хук для AI Fill функциональности нарративных узлов
 */
export const useAIFillNode = (options?: UseAIFillNodeOptions) => {
  const {projectId} = useCurrentProject();
  const {refreshCreditsAfterOperation} = useCreditsRefresh();

  const fillNode = useCallback(
    async (nodeId: string) => {
      if (!projectId) {
        console.error('No projectId available');
        return;
      }

      try {
        await AIFillService.fillNarrativeNode(nodeId, projectId, options?.onLoadingChange, refreshCreditsAfterOperation);

        // Показываем уведомление об успехе
        const notificationManager = getNotificationManager();
        notificationManager.showSuccess('Текст успешно создан с помощью AI', true, 3000);
      } catch (error) {
        console.error('AI Fill failed:', error);

        // Показываем уведомление об ошибке
        const notificationManager = getNotificationManager();
        notificationManager.showError('Ошибка при генерации текста с помощью AI', true, 3000);
      }
    },
    [projectId, options?.onLoadingChange, refreshCreditsAfterOperation]
  );

  return {
    fillNode
  };
};
