import React from 'react';

import {getPlanColor, getPlanDescription, getPlanIcon, useSubscriptionPlan} from '@hooks/useSubscriptionPlan';
import {Subscription} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '@store/useTeamStore';

interface CurrentPlanProps {
  subscriptions: Subscription[];
  isLoading?: boolean;
  onUpgrade?: () => void;
}

const CurrentPlan: React.FC<CurrentPlanProps> = ({subscriptions, isLoading = false, onUpgrade}) => {
  const {t} = useTranslation();
  const planInfo = useSubscriptionPlan(subscriptions);
  const {teamMembers} = useTeamStore();

  // Подсчет фактического количества участников команды
  const usedSeats = teamMembers.length; // Фактическое количество участников
  const availableSeats = planInfo.subscription?.currentSeats || 15; // Купленные места

  if (isLoading) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2
          style={{
            marginBottom: '1rem',
            color: 'var(--dashboard-text-primary)',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}
        >
          {t('billing.current_plan.title')}
        </h2>
        <div
          style={{
            padding: '2rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            textAlign: 'center',
            color: 'var(--dashboard-text-secondary)'
          }}
        >
          <div>{t('billing.current_plan.loading')}</div>
        </div>
      </div>
    );
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div style={{marginBottom: '2rem'}}>
      <h2
        style={{
          marginBottom: '1rem',
          color: 'var(--dashboard-text-primary)',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}
      >
        {t('billing.current_plan.title')}
      </h2>

      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--dashboard-bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--dashboard-border-primary)',
          boxShadow: 'var(--dashboard-shadow-sm)'
        }}
      >
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem'}}>
          {/* Левая часть - основная информация о плане */}
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto'}}>
            <div
              style={{
                fontSize: '2rem',
                padding: '0.5rem',
                backgroundColor: `${getPlanColor(planInfo.planType)}20`,
                borderRadius: '10px',
                border: `2px solid ${getPlanColor(planInfo.planType)}30`
              }}
            >
              {getPlanIcon(planInfo.planType)}
            </div>

            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem'}}>
                <h3
                  style={{
                    margin: 0,
                    color: 'var(--dashboard-text-primary)',
                    fontSize: '1.25rem',
                    fontWeight: '700'
                  }}
                >
                  {planInfo.planName} {t('billing.current_plan.plan_suffix')}
                </h3>

                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: getPlanColor(planInfo.planType),
                    backgroundColor: `${getPlanColor(planInfo.planType)}20`,
                    borderRadius: '10px',
                    textTransform: 'uppercase',
                    border: `1px solid ${getPlanColor(planInfo.planType)}40`
                  }}
                >
                  {planInfo.isActive ? t('billing.current_plan.status.active') : t('billing.current_plan.status.current')}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  color: 'var(--dashboard-text-secondary)',
                  fontSize: '0.85rem'
                }}
              >
                {getPlanDescription(planInfo.planType, t)}
              </p>
            </div>
          </div>

          {/* Правая часть - детали подписки или кнопка апгрейда */}
          {planInfo.subscription ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                flex: '1 1 auto',
                minWidth: '0'
              }}
            >
              {/* Цена */}
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: 'var(--dashboard-text-secondary)',
                    marginBottom: '0.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {t('billing.current_plan.labels.price')}
                </div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: 'var(--dashboard-text-primary)'
                  }}
                >
                  {formatPrice(planInfo.subscription.price.unitAmount, planInfo.subscription.price.currency)}
                  {planInfo.subscription.price.interval && (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: '400',
                        color: 'var(--dashboard-text-secondary)'
                      }}
                    >
                      /{planInfo.subscription.price.interval}
                    </span>
                  )}
                </div>
              </div>

              {/* Кредиты */}
              {planInfo.subscription.price.creditsAmount > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: 'var(--dashboard-text-secondary)',
                      marginBottom: '0.25rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {t('billing.current_plan.labels.credits', {
                      interval: t(`billing.current_plan.intervals.${planInfo.subscription.price.interval}`)
                    })}
                  </div>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: '#28a745'
                    }}
                  >
                    {new Intl.NumberFormat('ru-RU').format(planInfo.subscription.price.creditsAmount)}
                  </div>
                </div>
              )}

              {/* Seats для Team планов */}
              {(planInfo.subscription.price.planType === 'team' || planInfo.planName.toLowerCase().includes('team')) && (
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: 'var(--dashboard-text-secondary)',
                      marginBottom: '0.25rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {t('billing.current_plan.labels.seats')}
                  </div>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: '#6f42c1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    {/* Занятые места (фактические участники команды) */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <span style={{color: '#dc2626'}}>{usedSeats}</span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--dashboard-text-secondary)',
                          fontWeight: '500'
                        }}
                      >
                        {t('billing.current_plan.seats.used')}
                      </span>
                    </div>

                    {/* Доступные места (купленные места) */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <span style={{color: '#10b981'}}>{availableSeats}</span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--dashboard-text-secondary)',
                          fontWeight: '500'
                        }}
                      >
                        {t('billing.current_plan.seats.available')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Период действия */}
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: 'var(--dashboard-text-secondary)',
                    marginBottom: '0.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {t('billing.current_plan.labels.current_period')}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    color: 'var(--dashboard-text-primary)'
                  }}
                >
                  {formatDate(planInfo.subscription.currentPeriodStart)} - {formatDate(planInfo.subscription.currentPeriodEnd)}
                </div>
              </div>
            </div>
          ) : (
            /* Кнопка апгрейда для бесплатного плана */
            planInfo.planType === 'free' &&
            onUpgrade && (
              <div style={{display: 'flex', alignItems: 'center'}}>
                <button
                  onClick={onUpgrade}
                  style={{
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056b3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007bff';
                  }}
                >
                  {t('billing.current_plan.upgrade_button')}
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentPlan;
