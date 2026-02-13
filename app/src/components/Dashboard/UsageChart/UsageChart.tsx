'use client';

import React, {useState} from 'react';

import {useSubscription} from '@hooks/useSubscription';
import type {UsageAnalyticsData, UserDayBreakdown} from '@services/api';
import {api} from '@services/api';
import {notificationService} from '@services/notificationService';
import {useTranslation} from 'react-i18next';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';

import s from './UsageChart.module.scss';

interface UsageChartProps {
  analytics: UsageAnalyticsData[];
  isLoading: boolean;
  selectedMember?: string;
}

// Цвета для пользователей
const USER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];

// Функция для форматирования чисел с k-нотацией
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

// Кастомный tooltip для стекированных столбцов
const CustomTooltip = ({active, payload, label}: any) => {
  if (active && payload && payload.length) {
    const tooltipStyle = {
      backgroundColor: '#ffffff',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      maxWidth: '250px',
      opacity: 1,
      position: 'relative' as const,
      zIndex: 1000
    };

    return (
      <div style={tooltipStyle}>
        <div style={{fontWeight: 600, color: '#1f2937', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px'}}>{label}</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: entry.color,
                  flexShrink: 0
                }}
              />
              <span style={{color: '#6b7280', fontSize: '12px', flex: 1}}>{entry.name}:</span>
              <span style={{color: '#1f2937', fontWeight: 600, fontSize: '12px'}}>{formatNumber(entry.value || 0)}</span>
            </div>
          ))}
          {payload.length > 1 && (
            <div
              style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #e5e7eb',
                fontWeight: 600,
                color: '#3b82f6',
                textAlign: 'center' as const,
                fontSize: '13px',
                background: '#f9fafb',
                padding: '6px 8px',
                borderRadius: '4px',
                margin: '8px -2px 0 -2px'
              }}
            >
              Всего: {formatNumber(payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0))}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Функция для подготовки данных для графика
const prepareChartData = (analytics: UsageAnalyticsData[], selectedMember?: string) => {
  return analytics.map((day) => {
    const baseData: any = {
      date: new Date(day.date).getDate().toString(),
      fullDate: new Date(day.date).toLocaleDateString(),
      creditsSpent: day.creditsSpent,
      nodesCreated: day.nodesCreated,
      charactersWritten: day.charactersWritten
    };

    // Если не выбран конкретный участник и есть детализация, добавляем данные по пользователям
    if (!selectedMember && day.userBreakdown) {
      day.userBreakdown.forEach((user, index) => {
        baseData[`user_${user.userId}_credits`] = user.creditsSpent;
        baseData[`user_${user.userId}_nodes`] = user.nodesCreated;
        baseData[`user_${user.userId}_characters`] = user.charactersWritten;
        baseData[`user_${user.userId}_name`] = user.userName;
      });
    }

    return baseData;
  });
};

const UsageChart: React.FC<UsageChartProps> = ({analytics, isLoading, selectedMember}) => {
  const {t} = useTranslation();
  const {hasEnterprisePlan} = useSubscription();
  const [isSendingSalesRequest, setIsSendingSalesRequest] = useState(false);

  const handleContactSales = async () => {
    try {
      setIsSendingSalesRequest(true);
      await api.contactSales('Usage - Team Chart');
      // Здесь можно показать уведомление об успехе
      notificationService.showSuccess(t('usage.sales_request_sent'));
    } catch (error) {
      console.error('Failed to send sales request:', error);
      notificationService.showError(t('usage.sales_request_error'));
    } finally {
      setIsSendingSalesRequest(false);
    }
  };

  if (isLoading) {
    return (
      <div className={s.loadingContainer}>
        <div className={s.spinner}></div>
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (analytics.length === 0) {
    return (
      <div className={s.emptyState}>
        <p>{t('usage.no_data')}</p>
      </div>
    );
  }

  // Берем последние 14 дней и подготавливаем данные для Recharts
  const recentAnalytics = analytics.slice(-14);
  const chartData = prepareChartData(recentAnalytics, selectedMember);

  // Получаем уникальных пользователей для построения стекированных графиков
  const uniqueUsers = selectedMember
    ? []
    : recentAnalytics
        .flatMap((day) => day.userBreakdown || [])
        .reduce((acc, user) => {
          if (!acc.find((u) => u.userId === user.userId)) {
            acc.push(user);
          }
          return acc;
        }, [] as UserDayBreakdown[]);

  return (
    <div className={s.container}>
      <div className={s.chartsGrid}>
        {/* График потраченных кредитов */}
        <div className={s.chartSection}>
          <h3 className={s.chartTitle}>{t('usage.credits_spent')}</h3>
          <div className={s.rechartsWrapper}>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 60}}>
                <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
                <XAxis dataKey='date' stroke='var(--text-secondary)' fontSize={12} />
                <YAxis stroke='var(--text-secondary)' fontSize={12} tickFormatter={formatNumber} />
                <Tooltip content={<CustomTooltip />} />

                {selectedMember ? (
                  // Простой столбец для выбранного пользователя
                  <Bar dataKey='creditsSpent' fill='#3B82F6' radius={[4, 4, 0, 0]} />
                ) : (
                  // Стекированные столбцы для всех пользователей
                  uniqueUsers.map((user, index) => (
                    <Bar
                      key={user.userId}
                      dataKey={`user_${user.userId}_credits`}
                      stackId='credits'
                      fill={USER_COLORS[index % USER_COLORS.length]}
                      name={user.userName}
                      radius={index === uniqueUsers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* График созданных узлов - только для ENTERPRISE */}
        {hasEnterprisePlan ? (
          <div className={s.chartSection}>
            <h3 className={s.chartTitle}>{t('usage.nodes_created')}</h3>
            <div className={s.rechartsWrapper}>
              <ResponsiveContainer width='100%' height={250}>
                <BarChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 60}}>
                  <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
                  <XAxis dataKey='date' stroke='var(--text-secondary)' fontSize={12} />
                  <YAxis stroke='var(--text-secondary)' fontSize={12} tickFormatter={formatNumber} />
                  <Tooltip content={<CustomTooltip />} />

                  {selectedMember ? (
                    <Bar dataKey='nodesCreated' fill='#10B981' radius={[4, 4, 0, 0]} />
                  ) : (
                    uniqueUsers.map((user, index) => (
                      <Bar
                        key={user.userId}
                        dataKey={`user_${user.userId}_nodes`}
                        stackId='nodes'
                        fill={USER_COLORS[index % USER_COLORS.length]}
                        name={user.userName}
                        radius={index === uniqueUsers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className={s.chartSection}>
            <h3 className={s.chartTitle}>{t('usage.nodes_created')}</h3>
            <div className={s.enterpriseUpgrade}>
              <div className={s.upgradeContent}>
                <h4>{t('usage.upgrade_required')}</h4>
                <p>{t('usage.nodes_enterprise_only')}</p>
                <button className={s.upgradeButton} onClick={handleContactSales} disabled={isSendingSalesRequest}>
                  {isSendingSalesRequest ? t('usage.sending_request') : t('usage.contact_sales')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* График написанных символов - только для ENTERPRISE */}
        {hasEnterprisePlan ? (
          <div className={s.chartSection}>
            <h3 className={s.chartTitle}>{t('usage.characters_written')}</h3>
            <div className={s.rechartsWrapper}>
              <ResponsiveContainer width='100%' height={250}>
                <BarChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 60}}>
                  <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
                  <XAxis dataKey='date' stroke='var(--text-secondary)' fontSize={12} />
                  <YAxis stroke='var(--text-secondary)' fontSize={12} tickFormatter={formatNumber} />
                  <Tooltip content={<CustomTooltip />} />

                  {selectedMember ? (
                    <Bar dataKey='charactersWritten' fill='#F59E0B' radius={[4, 4, 0, 0]} />
                  ) : (
                    uniqueUsers.map((user, index) => (
                      <Bar
                        key={user.userId}
                        dataKey={`user_${user.userId}_characters`}
                        stackId='characters'
                        fill={USER_COLORS[index % USER_COLORS.length]}
                        name={user.userName}
                        radius={index === uniqueUsers.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className={s.chartSection}>
            <h3 className={s.chartTitle}>{t('usage.characters_written')}</h3>
            <div className={s.enterpriseUpgrade}>
              <div className={s.upgradeContent}>
                <h4>{t('usage.upgrade_required')}</h4>
                <p>{t('usage.characters_enterprise_only')}</p>
                <button className={s.upgradeButton} onClick={handleContactSales} disabled={isSendingSalesRequest}>
                  {isSendingSalesRequest ? t('usage.sending_request') : t('usage.contact_sales')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageChart;
