import {useMemo} from 'react';

import {Subscription} from '@types-folder/billing';

export type PlanType = 'free' | 'pro' | 'team' | 'enterprise';

export interface SubscriptionPlanInfo {
  planType: PlanType;
  planName: string;
  isActive: boolean;
  subscription?: Subscription;
}

/**
 * Хук для определения текущего тарифного плана пользователя
 */
export function useSubscriptionPlan(subscriptions: Subscription[]): SubscriptionPlanInfo {
  return useMemo(() => {
    // Фильтруем только активные подписки
    const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'ACTIVE' || sub.status === 'TRIALING');

    // Если нет активных подписок, значит free план
    if (activeSubscriptions.length === 0) {
      return {
        planType: 'free',
        planName: 'Free',
        isActive: false
      };
    }

    // Берем первую активную подписку (приоритет по дате создания)
    const activeSubscription = activeSubscriptions[0];
    const productName = activeSubscription.product.name.toLowerCase();

    // Определяем тип плана по названию продукта
    let planType: PlanType = 'free';
    let planName = activeSubscription.product.name;

    if (productName.includes('pro') || productName.includes('solo')) {
      planType = 'pro';
      planName = 'Pro';
    } else if (productName.includes('team')) {
      planType = 'team';
      planName = 'Team';
    } else if (productName.includes('enterprise')) {
      planType = 'enterprise';
      planName = 'Enterprise';
    }

    return {
      planType,
      planName,
      isActive: true,
      subscription: activeSubscription
    };
  }, [subscriptions]);
}

/**
 * Получает цвет для типа плана
 */
export function getPlanColor(planType: PlanType): string {
  const colors = {
    free: '#6c757d',
    pro: '#007bff',
    team: '#28a745',
    enterprise: '#6f42c1'
  };
  return colors[planType];
}

/**
 * Получает иконку для типа плана
 */
export function getPlanIcon(planType: PlanType): string {
  const icons = {
    free: '🆓',
    pro: '⭐',
    team: '👥',
    enterprise: '🏢'
  };
  return icons[planType];
}

/**
 * Получает описание для типа плана
 */
export function getPlanDescription(planType: PlanType, t?: (key: string) => string): string {
  if (t) {
    return t(`billing.current_plan.descriptions.${planType}`);
  }

  // Fallback на английский, если перевод не передан
  const descriptions = {
    free: 'Basic features and limited credits',
    pro: 'Advanced features and more credits',
    team: 'Collaboration tools for teams',
    enterprise: 'Custom solutions for large organizations'
  };
  return descriptions[planType];
}
