import React from 'react';

import {TeamCreditBalance} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

interface TeamCreditsBalanceProps {
  teamCredits: TeamCreditBalance | null;
  isLoading?: boolean;
  error?: string | null;
}

const TeamCreditsBalance: React.FC<TeamCreditsBalanceProps> = ({teamCredits, isLoading = false, error = null}) => {
  const {t} = useTranslation();

  const formatCredits = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      ADMINISTRATOR: t('team.roles.administrator'),
      MANAGER: t('team.roles.manager'),
      MEMBER: t('team.roles.member'),
      OBSERVER: t('team.roles.observer'),
      LOCALIZER: t('team.roles.localizer')
    };
    return roleMap[role] || role;
  };

  if (isLoading) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2
          style={{
            marginBottom: '1rem',
            color: 'var(--dashboard-text-primary)',
            fontSize: '1.5rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🏢 {t('team.credits.title')}
        </h2>
        <div
          style={{
            padding: '2rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            boxShadow: 'var(--dashboard-shadow-sm)',
            textAlign: 'center',
            color: 'var(--dashboard-text-secondary)'
          }}
        >
          <div>{t('team.credits.loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2
          style={{
            marginBottom: '1rem',
            color: 'var(--dashboard-text-primary)',
            fontSize: '1.5rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🏢 {t('team.credits.title')}
        </h2>
        <div
          style={{
            padding: '2rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid #dc2626',
            boxShadow: 'var(--dashboard-shadow-sm)',
            textAlign: 'center'
          }}
        >
          <div style={{color: '#dc2626', marginBottom: '0.5rem', fontSize: '1.2rem'}}>⚠️</div>
          <div style={{color: 'var(--dashboard-text-primary)', fontWeight: '600'}}>{t('team.credits.error_title')}</div>
          <div style={{color: 'var(--dashboard-text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem'}}>{error}</div>
        </div>
      </div>
    );
  }

  if (!teamCredits) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2
          style={{
            marginBottom: '1rem',
            color: 'var(--dashboard-text-primary)',
            fontSize: '1.5rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🏢 {t('team.credits.title')}
        </h2>
        <div
          style={{
            padding: '2rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            boxShadow: 'var(--dashboard-shadow-sm)',
            textAlign: 'center'
          }}
        >
          <div style={{color: 'var(--dashboard-text-secondary)', marginBottom: '0.5rem', fontSize: '3rem'}}>💳</div>
          <div style={{color: 'var(--dashboard-text-primary)', fontWeight: '600', marginBottom: '0.5rem'}}>{t('team.credits.no_team_credits')}</div>
          <div style={{color: 'var(--dashboard-text-secondary)', fontSize: '0.9rem'}}>{t('team.credits.no_team_credits_description')}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{marginBottom: '2rem'}}>
      <div style={{marginBottom: '1.5rem'}}>
        <h2
          style={{
            marginBottom: '0.5rem',
            color: 'var(--dashboard-text-primary)',
            fontSize: '1.5rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🏢 {t('team.credits.title')}
        </h2>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--dashboard-text-secondary)'
            }}
          >
            <span>{t('team.credits.team_name')}:</span>
            <span style={{fontWeight: '600', color: 'var(--dashboard-text-primary)'}}>{teamCredits.teamName}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--dashboard-text-secondary)'
            }}
          >
            <span>{t('team.credits.your_role')}:</span>
            <span
              style={{
                fontWeight: '600',
                color: 'var(--dashboard-text-primary)',
                padding: '0.2rem 0.6rem',
                backgroundColor: '#10b981' + '20',
                borderRadius: '6px',
                border: '1px solid #10b981' + '30'
              }}
            >
              {getRoleDisplayName(teamCredits.viewerRole)}
            </span>
          </div>
          {teamCredits.isOnTeamPlan && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: '#10b981',
                backgroundColor: '#10b981' + '10',
                padding: '0.3rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #10b981' + '30'
              }}
            >
              <span>✅</span>
              <span style={{fontWeight: '600'}}>{t('team.credits.team_plan_active')}</span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Общий баланс командных кредитов */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '2px solid #10b981',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem'}}>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#10b981'
              }}
            />
            <h3 style={{margin: 0, color: 'var(--dashboard-text-secondary)', fontSize: '1rem'}}>{t('team.credits.total_team_credits')}</h3>
          </div>
          <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#10b981', marginBottom: '0.5rem'}}>{formatCredits(teamCredits.total)}</div>
          <p style={{margin: 0, fontSize: '0.875rem', color: 'var(--dashboard-text-tertiary)'}}>{t('team.credits.total_description')}</p>
        </div>

        {/* Подписочные кредиты команды */}
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
            e.currentTarget.style.boxShadow = 'var(--dashboard-shadow-sm)';
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
            />
            <h3 style={{margin: 0, color: 'var(--dashboard-text-secondary)', fontSize: '1rem'}}>{t('team.credits.subscription_credits')}</h3>
          </div>
          <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#007bff', marginBottom: '0.5rem'}}>{formatCredits(teamCredits.subscription)}</div>
          <p style={{margin: 0, fontSize: '0.875rem', color: 'var(--dashboard-text-tertiary)'}}>{t('team.credits.subscription_description')}</p>
        </div>

        {/* Бонусные кредиты команды */}
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
            e.currentTarget.style.boxShadow = 'var(--dashboard-shadow-sm)';
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
            />
            <h3 style={{margin: 0, color: 'var(--dashboard-text-secondary)', fontSize: '1rem'}}>{t('team.credits.bonus_credits')}</h3>
          </div>
          <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#ffc107', marginBottom: '0.5rem'}}>{formatCredits(teamCredits.bonus)}</div>
          <p style={{margin: 0, fontSize: '0.875rem', color: 'var(--dashboard-text-tertiary)'}}>{t('team.credits.bonus_description')}</p>
        </div>
      </div>
    </div>
  );
};

export default TeamCreditsBalance;
