import {useEffect, useState} from 'react';

import {api} from '@services/api';
import {isOSS} from 'src/utils/edition';

import {useTeamStore} from '@store/useTeamStore';

export interface TeamAIAccessState {
  hasAIAccess: boolean;
  isLoading: boolean;
  isTeamPlan: boolean;
  error: string | null;
}

/**
 * Хук для проверки доступа к ИИ функциям в текущей команде
 */
export const useTeamAIAccess = (): TeamAIAccessState => {
  const {currentTeam} = useTeamStore();
  const [hasAIAccess, setHasAIAccess] = useState<boolean>(true); // По умолчанию true для совместимости
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTeamPlan, setIsTeamPlan] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // В OSS edition ИИ недоступен
    if (isOSS()) {
      setHasAIAccess(false);
      setIsTeamPlan(true); // чтобы существующие проверки `isTeamPlan && !hasAIAccess` сработали
      setIsLoading(false);
      setError(null);
      return;
    }

    const checkAIAccess = async () => {
      if (!currentTeam) {
        // Если нет текущей команды, доступ разрешен (персональный аккаунт)
        setHasAIAccess(true);
        setIsTeamPlan(false);
        setIsLoading(false);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Проверяем доступ к ИИ в команде
        const response = await api.checkMemberAIAccess(currentTeam.id);

        // Получаем информацию о подписке команды для определения типа плана
        const teamSubscription = await api.getTeamSubscriptions(currentTeam.id);

        const hasTeamSubscription = teamSubscription.some((sub) => {
          // Проверяем по статусу подписки и названию продукта (так как planType может быть null)
          return sub.status === 'ACTIVE' && (sub.price?.planType === 'team' || (sub.product?.name && sub.product.name.toLowerCase().includes('team')));
        });

        setHasAIAccess(response.hasAIAccess);
        setIsTeamPlan(hasTeamSubscription);
      } catch (err) {
        console.error('Failed to check AI access:', err);
        // В случае ошибки разрешаем доступ для совместимости
        setHasAIAccess(true);
        setIsTeamPlan(false);
        setError(err instanceof Error ? err.message : 'Failed to check AI access');
      } finally {
        setIsLoading(false);
      }
    };

    checkAIAccess();
  }, [currentTeam]);

  return {
    hasAIAccess,
    isLoading,
    isTeamPlan,
    error
  };
};
