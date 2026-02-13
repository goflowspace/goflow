import React from 'react';

import {CreditBalance} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

interface CreditsBalanceProps {
  credits: CreditBalance | null;
  isLoading?: boolean;
}

const CreditsBalance: React.FC<CreditsBalanceProps> = ({credits, isLoading = false}) => {
  const {t} = useTranslation();
  const formatCredits = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  if (isLoading) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{marginBottom: '1rem', color: 'var(--dashboard-text-primary)'}}>{t('billing.credits_balance.title')}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--dashboard-bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--dashboard-border-primary)',
                minHeight: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{color: 'var(--dashboard-text-secondary)'}}>{t('billing.credits_balance.loading')}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{marginBottom: '2rem'}}>
      <h2 style={{marginBottom: '1rem', color: 'var(--dashboard-text-primary)'}}>{t('billing.credits_balance.title')}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            boxShadow: 'var(--dashboard-shadow-sm)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem'}}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#6f42c1'
              }}
            ></div>
            <h3 style={{margin: 0, color: 'var(--dashboard-text-secondary)', fontSize: '1rem'}}>{t('billing.credits_balance.total_credits')}</h3>
          </div>
          <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#6f42c1', marginBottom: '0.5rem'}}>{formatCredits(credits?.total || 0)}</div>
          <p style={{margin: 0, fontSize: '0.875rem', color: 'var(--dashboard-text-tertiary)'}}>{t('billing.credits_balance.total_description')}</p>
        </div>

        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            boxShadow: 'var(--dashboard-shadow-sm)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem'}}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#007bff'
              }}
            ></div>
            <h3 style={{margin: 0, color: 'var(--dashboard-text-secondary)', fontSize: '1rem'}}>{t('billing.credits_balance.subscription_credits')}</h3>
          </div>
          <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#007bff', marginBottom: '0.5rem'}}>{formatCredits(credits?.subscription || 0)}</div>
          <p style={{margin: 0, fontSize: '0.875rem', color: 'var(--dashboard-text-tertiary)'}}>{t('billing.credits_balance.subscription_description')}</p>
        </div>

        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            boxShadow: 'var(--dashboard-shadow-sm)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem'}}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#ffc107'
              }}
            ></div>
            <h3 style={{margin: 0, color: 'var(--dashboard-text-secondary)', fontSize: '1rem'}}>{t('billing.credits_balance.bonus_credits')}</h3>
          </div>
          <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#ffc107', marginBottom: '0.5rem'}}>{formatCredits(credits?.bonus || 0)}</div>
          <p style={{margin: 0, fontSize: '0.875rem', color: 'var(--dashboard-text-tertiary)'}}>{t('billing.credits_balance.bonus_description')}</p>
        </div>
      </div>
    </div>
  );
};

export default CreditsBalance;
