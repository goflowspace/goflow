import {useCallback, useEffect, useState} from 'react';

import {useTeamSwitch} from '@hooks/useTeamSwitch';
import {RecentTransaction, UsageAnalyticsData, UsageAnalyticsResponse, UsageTeamMember, api} from '@services/api';

export interface UsageAnalyticsState extends UsageAnalyticsResponse {
  isLoading: boolean;
  error?: string;
}

export function useUsageAnalytics(selectedUserId?: string, days: number = 30) {
  const [state, setState] = useState<UsageAnalyticsState>({
    analytics: [],
    teamMembers: [],
    totalCreditsSpent: 0,
    totalNodesCreated: 0,
    totalCharactersWritten: 0,
    isLoading: false,
    error: undefined
  });

  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setState((prev) => ({...prev, isLoading: true, error: undefined}));

    try {
      const data = await api.getUsageAnalytics(selectedUserId, days);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        ...data
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [selectedUserId, days]);

  const loadRecentTransactions = useCallback(async () => {
    setTransactionsLoading(true);

    try {
      const transactions = await api.getRecentTransactions(selectedUserId, 20);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [selectedUserId]);

  // Загружаем данные при изменении параметров
  useEffect(() => {
    loadAnalytics();
    loadRecentTransactions();
  }, [loadAnalytics, loadRecentTransactions]);

  // Обновляем данные при переключении команды
  useTeamSwitch(async () => {
    console.log('Refreshing usage analytics for team switch...');
    await loadAnalytics();
    await loadRecentTransactions();
  });

  return {
    ...state,
    recentTransactions,
    transactionsLoading,
    refreshAnalytics: loadAnalytics,
    refreshTransactions: loadRecentTransactions
  };
}
