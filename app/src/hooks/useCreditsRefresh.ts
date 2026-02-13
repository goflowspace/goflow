import {useCallback} from 'react';

import {useCreditsStore} from '@store/useCreditsStore';

/**
 * Хук для автоматического обновления баланса кредитов после AI операций
 */
export function useCreditsRefresh() {
  const {refreshCredits} = useCreditsStore();

  /**
   * Обновляет баланс кредитов с небольшой задержкой
   * Задержка нужна, чтобы бэкенд успел обработать списание кредитов
   */
  const refreshCreditsAfterOperation = useCallback(async () => {
    try {
      // Небольшая задержка для завершения операции на бэкенде
      setTimeout(async () => {
        await refreshCredits();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to refresh credits after AI operation:', error);
    }
  }, [refreshCredits]);

  return {
    refreshCreditsAfterOperation
  };
}
