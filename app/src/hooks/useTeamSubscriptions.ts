import {useEffect, useMemo, useState} from 'react';

import {api} from '@services/api';
import {Subscription} from '@types-folder/billing';

import {isOSS} from '../utils/edition';
import {useSubscriptionPlan} from './useSubscriptionPlan';

interface TeamSubscriptionInfo {
  planType: 'free' | 'pro' | 'team' | 'enterprise';
  planName: string;
  isActive: boolean;
  subscription?: Subscription;
}

/**
 * Хук для получения информации о подписке команды
 */
export const useTeamSubscription = (
  teamId: string | undefined
): {
  subscriptionInfo: TeamSubscriptionInfo | null;
  isLoading: boolean;
  error: string | null;
} => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionInfo = useSubscriptionPlan(subscriptions);

  useEffect(() => {
    if (!teamId || isOSS()) {
      setSubscriptions([]);
      return;
    }

    const fetchTeamSubscriptions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const teamSubscriptions = await api.getTeamSubscriptions(teamId);
        setSubscriptions(teamSubscriptions);
      } catch (err) {
        console.error('Failed to fetch team subscriptions:', err);
        setError('Failed to load subscription info');
        setSubscriptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamSubscriptions();
  }, [teamId]);

  return {
    subscriptionInfo: {
      planType: subscriptionInfo.planType,
      planName: subscriptionInfo.planName,
      isActive: subscriptionInfo.isActive,
      subscription: subscriptionInfo.subscription
    },
    isLoading,
    error
  };
};

/**
 * Хук для получения подписок нескольких команд одновременно
 */
export const useTeamSubscriptions = (teamIds: string[]): Record<string, TeamSubscriptionInfo> => {
  const [subscriptionsMap, setSubscriptionsMap] = useState<Record<string, Subscription[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (teamIds.length === 0 || isOSS()) {
      setSubscriptionsMap({});
      return;
    }

    const fetchAllTeamSubscriptions = async () => {
      try {
        setIsLoading(true);
        const promises = teamIds.map(async (teamId) => {
          try {
            const subscriptions = await api.getTeamSubscriptions(teamId);
            return {teamId, subscriptions};
          } catch (error) {
            console.error(`Failed to fetch subscriptions for team ${teamId}:`, error);
            return {teamId, subscriptions: []};
          }
        });

        const results = await Promise.all(promises);
        const newMap: Record<string, Subscription[]> = {};

        results.forEach(({teamId, subscriptions}) => {
          newMap[teamId] = subscriptions;
        });

        setSubscriptionsMap(newMap);
      } catch (error) {
        console.error('Failed to fetch team subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTeamSubscriptions();
  }, [teamIds.join(',')]);

  // Преобразуем subscriptions в subscription info для каждой команды
  return useMemo(() => {
    const result: Record<string, TeamSubscriptionInfo> = {};

    teamIds.forEach((teamId) => {
      const subscriptions = subscriptionsMap[teamId] || [];

      // Определяем план вручную, так как useSubscriptionPlan нельзя вызывать в цикле
      const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'ACTIVE' || sub.status === 'TRIALING');

      if (activeSubscriptions.length === 0) {
        result[teamId] = {
          planType: 'free',
          planName: 'Free',
          isActive: false
        };
      } else {
        const activeSubscription = activeSubscriptions[0];
        const productName = activeSubscription.product.name.toLowerCase();

        let planType: 'free' | 'pro' | 'team' | 'enterprise' = 'free';
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

        result[teamId] = {
          planType,
          planName,
          isActive: true,
          subscription: activeSubscription
        };
      }
    });

    return result;
  }, [teamIds, subscriptionsMap]);
};
