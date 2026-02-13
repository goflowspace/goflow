'use client';

import React, {useState} from 'react';

import {useAICredits} from '@hooks/useAI';
import {useTeamSwitch} from '@hooks/useTeamSwitch';
import {useUsageAnalytics} from '@hooks/useUsageAnalytics';
import {InfoCircledIcon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

import TeamMemberSelector from '@components/Dashboard/TeamMemberSelector';
import UsageChart from '@components/Dashboard/UsageChart';

import s from './UsageAnalytics.module.css';

const UsageAnalytics: React.FC = () => {
  const {t, i18n} = useTranslation();
  const {credits, isLoading, error, refreshCredits, loadCredits} = useAICredits();

  // Стейт для фильтрации по участникам
  const [selectedMember, setSelectedMember] = useState<string | undefined>();

  // Новый хук для аналитики использования
  const {
    analytics,
    teamMembers,
    totalCreditsSpent,
    totalNodesCreated,
    totalCharactersWritten,
    recentTransactions,
    isLoading: analyticsLoading,
    error: analyticsError,
    refreshAnalytics
  } = useUsageAnalytics(selectedMember);

  // Обновляем usage данные при переключении команд
  useTeamSwitch(async () => {
    console.log('Refreshing usage data for team switch...');
    await loadCredits();
    await refreshAnalytics();
  });

  if (isLoading || analyticsLoading) {
    return (
      <div className={s.loadingContainer}>
        <div className={s.spinner}></div>
        <h2>{t('usage.loading')}</h2>
      </div>
    );
  }

  if ((error && !credits) || (analyticsError && teamMembers.length === 0)) {
    return (
      <div className={s.errorContainer}>
        <div className={s.errorContent}>
          <InfoCircledIcon className={s.errorIcon} />
          <h2>{t('usage.error_title')}</h2>
          <p>{t('usage.error_message')}</p>
          <button
            className={s.retryButton}
            onClick={() => {
              refreshCredits();
              refreshAnalytics();
            }}
          >
            {t('usage.try_again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <div className={s.content}>
        {/* Заголовок и фильтры */}
        <div className={s.header}>
          <div className={s.titleSection}>
            <h1 className={s.mainTitle}>{t('usage.title')}</h1>
            <div className={s.statsRow}>
              <div className={s.statItem}>
                <span className={s.statValue}>{totalCreditsSpent}</span>
                <span className={s.statLabel}>{t('usage.total_credits')}</span>
              </div>
              <div className={s.statItem}>
                <span className={s.statValue}>{totalNodesCreated}</span>
                <span className={s.statLabel}>{t('usage.total_nodes')}</span>
              </div>
              <div className={s.statItem}>
                <span className={s.statValue}>{totalCharactersWritten.toLocaleString()}</span>
                <span className={s.statLabel}>{t('usage.total_characters')}</span>
              </div>
            </div>
          </div>

          <div className={s.filtersSection}>
            <TeamMemberSelector members={teamMembers} selectedMember={selectedMember} onMemberSelect={setSelectedMember} isLoading={analyticsLoading} />
          </div>
        </div>

        {/* Графики использования */}
        <div className={s.section}>
          <UsageChart analytics={analytics} isLoading={analyticsLoading} selectedMember={selectedMember} />
        </div>

        {/* Недавние операции - перемещены в конец */}
        <div className={s.section}>
          <h2 className={s.sectionTitle}>{t('usage.recent_operations')}</h2>
          <div className={s.transactionsCard}>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className={s.transactionsList}>
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className={s.transactionItem}>
                    <div className={s.transactionInfo}>
                      <span className={s.transactionDescription}>{transaction.description}</span>
                      <div className={s.transactionMeta}>
                        <span className={s.transactionDate}>{new Date(transaction.createdAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}</span>
                        {selectedMember === undefined && <span className={s.transactionUser}>{transaction.userName}</span>}
                      </div>
                    </div>
                    <div className={s.transactionAmount}>
                      <span className={`${s.amount} ${transaction.amount > 0 ? s.positive : s.negative}`}>
                        {transaction.amount > 0 ? '+' : ''}
                        {transaction.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={s.emptyState}>
                <p>{t('usage.no_recent_operations')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;
