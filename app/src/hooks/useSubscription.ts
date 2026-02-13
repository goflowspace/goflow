import {useCallback, useEffect, useState} from 'react';

import {api} from '@services/api';
import {Subscription} from '@types-folder/billing';

interface SubscriptionState {
  subscriptions: Subscription[];
  hasActiveSubscription: boolean;
  hasEnterprisePlan: boolean;
  isLoading: boolean;
  error: string | undefined;
}

/**
 * Хук для работы с подписками пользователя
 */
export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    subscriptions: [],
    hasActiveSubscription: false,
    hasEnterprisePlan: false,
    isLoading: false,
    error: undefined
  });

  // Функция для определения типа плана по названию продукта
  const parseSubscriptionPlanType = (productName: string): string => {
    const nameLower = productName.toLowerCase();
    if (nameLower.includes('pro')) return 'solo';
    if (nameLower.includes('team')) return 'team';
    if (nameLower.includes('enterprise')) return 'enterprise';
    return 'free';
  };

  const loadSubscriptions = useCallback(async () => {
    setState((prev) => ({...prev, isLoading: true, error: undefined}));

    try {
      const subscriptions = await api.getUserSubscriptions();

      // Проверяем наличие активной подписки
      const hasActiveSubscription = subscriptions.some((sub) => sub.status === 'ACTIVE' || sub.status === 'TRIALING');

      // Проверяем наличие активного ENTERPRISE плана
      const hasEnterprisePlan = subscriptions.some((sub) => {
        const isActive = sub.status === 'ACTIVE' || sub.status === 'TRIALING';
        const planType = parseSubscriptionPlanType(sub.product.name);
        return isActive && planType === 'enterprise';
      });

      setState((prev) => ({
        ...prev,
        subscriptions,
        hasActiveSubscription,
        hasEnterprisePlan,
        isLoading: false
      }));

      return subscriptions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load subscriptions';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  return {
    ...state,
    loadSubscriptions,
    refreshSubscriptions: loadSubscriptions
  };
}
