'use client';

import React from 'react';

import {useTeamSwitch} from '@hooks/useTeamSwitch';
import {CreditBalance as CreditBalanceType} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

import {useCreditsStore} from '@store/useCreditsStore';

interface CreditBalanceProps {
  className?: string;
  credits?: CreditBalanceType | null; // Данные от родительского компонента
  isLoading?: boolean; // Состояние загрузки от родительского компонента
}

const CreditBalance: React.FC<CreditBalanceProps> = ({className, credits: propsCredits, isLoading: propsIsLoading}) => {
  const {t} = useTranslation();
  const {credits: storeCredits, isLoading: storeIsLoading, loadCredits} = useCreditsStore();

  // Используем props если переданы, иначе данные из стора
  const credits = propsCredits !== undefined ? propsCredits : storeCredits;
  const isLoading = propsIsLoading !== undefined ? propsIsLoading : storeIsLoading;

  // Обновляем кредиты при переключении команд (только если нет props)
  useTeamSwitch(async () => {
    if (propsCredits === undefined) {
      console.log('Refreshing credits from store for team switch...');
      await loadCredits();
    }
  });

  // Загружаем кредиты при первом рендере (только если нет props)
  React.useEffect(() => {
    if (propsCredits === undefined && !storeCredits) {
      loadCredits();
    }
  }, [propsCredits, storeCredits, loadCredits]);

  const formatCredits = (amount: number): string => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  if (isLoading || !credits) {
    return (
      <div style={{marginBottom: '4rem'}}>
        <h2 style={{marginBottom: '3rem', textAlign: 'center', fontSize: '2rem', fontWeight: '700', color: 'var(--dashboard-text-primary)'}}>{t('billing.credits_balance.title')}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--dashboard-bg-secondary)',
                borderRadius: '24px',
                border: '1px solid var(--dashboard-border-primary)',
                padding: '2rem',
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--dashboard-text-secondary)'
              }}
            >
              Загрузка...
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Поддерживаем оба формата: billing CreditBalance и AICredits
  const totalCredits = (credits as any)?.total || (credits as any)?.balance || 0;
  const subscriptionCredits = (credits as any)?.subscription || (credits as any)?.subscriptionCredits || 0;
  const bonusCredits = (credits as any)?.bonus || (credits as any)?.bonusCredits || 0;

  // Отладочная информация
  console.log('CreditBalance Debug:', {
    credits,
    totalCredits,
    subscriptionCredits,
    bonusCredits,
    isLoading
  });

  return (
    <div className={className} style={{marginBottom: '4rem'}}>
      <h2 style={{marginBottom: '1rem', textAlign: 'center', color: 'var(--dashboard-text-primary)'}}>{t('billing.credits_balance.title')}</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        {/* Всего кредитов */}
        <div
          style={{
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '24px',
            border: '2px solid #8b5cf6',
            padding: '2rem',
            transition: 'all 0.3s ease',
            position: 'relative',
            boxShadow: '0 10px 25px rgba(139, 92, 246, 0.15)',
            background: 'var(--dashboard-bg-card)'
          }}
        >
          <div style={{textAlign: 'left'}}>
            {/* Icon and Title */}
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
              <div style={{fontSize: '0.5rem', color: '#8b5cf6'}}>🟣</div>
              <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: 'var(--dashboard-text-primary)', margin: 0}}>{t('billing.credits_balance.total_credits')}</h3>
            </div>

            {/* Amount */}
            <div style={{marginBottom: '1rem'}}>
              <div style={{fontSize: '3rem', fontWeight: '700', color: '#8b5cf6', lineHeight: 1}}>{formatCredits(totalCredits)}</div>
            </div>
          </div>
        </div>

        {/* Подписочные кредиты */}
        <div
          style={{
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--dashboard-border-primary)',
            padding: '2rem',
            transition: 'all 0.3s ease',
            position: 'relative',
            boxShadow: 'var(--dashboard-shadow-sm)'
          }}
        >
          <div style={{textAlign: 'left'}}>
            {/* Icon and Title */}
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
              <div style={{fontSize: '0.5rem', color: '#3b82f6'}}>🔵</div>
              <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: 'var(--dashboard-text-primary)', margin: 0}}>{t('billing.credits_balance.subscription_credits')}</h3>
            </div>

            {/* Amount */}
            <div style={{marginBottom: '1rem'}}>
              <div style={{fontSize: '3rem', fontWeight: '700', color: '#3b82f6', lineHeight: 1}}>{formatCredits(subscriptionCredits)}</div>
            </div>
          </div>
        </div>

        {/* Бонусные кредиты */}
        <div
          style={{
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--dashboard-border-primary)',
            padding: '2rem',
            transition: 'all 0.3s ease',
            position: 'relative',
            boxShadow: 'var(--dashboard-shadow-sm)'
          }}
        >
          <div style={{textAlign: 'left'}}>
            {/* Icon and Title */}
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
              <div style={{fontSize: '0.5rem', color: '#f59e0b'}}>🟡</div>
              <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: 'var(--dashboard-text-primary)', margin: 0}}>{t('billing.credits_balance.bonus_credits')}</h3>
            </div>

            {/* Amount */}
            <div style={{marginBottom: '1rem'}}>
              <div style={{fontSize: '3rem', fontWeight: '700', color: '#f59e0b', lineHeight: 1}}>{formatCredits(bonusCredits)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditBalance;
