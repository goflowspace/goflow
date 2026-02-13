import React from 'react';

import {Subscription} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

interface SubscriptionsSectionProps {
  subscriptions: Subscription[];
  isLoading?: boolean;
  onManageSubscription?: (subscriptionId: string) => void;
  onResumeSubscription?: (subscriptionId: string) => void;
}

const SubscriptionsSection: React.FC<SubscriptionsSectionProps> = ({subscriptions, isLoading = false, onManageSubscription, onResumeSubscription}) => {
  const {t} = useTranslation();
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

  const getSubscriptionStatusText = (status: string) => {
    return t(`billing.subscriptions.status.${status}`) || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      ACTIVE: '#28a745',
      TRIALING: '#17a2b8',
      PAST_DUE: '#ffc107',
      CANCELED: '#dc3545',
      INCOMPLETE: '#6c757d',
      UNPAID: '#dc3545',
      PAUSED: '#fd7e14'
    };
    return colorMap[status] || '#6c757d';
  };

  if (isLoading) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{marginTop: '2rem', marginBottom: '1rem', textAlign: 'center', color: 'var(--dashboard-text-primary)'}}>{t('billing.subscriptions.title')}</h2>
        <div
          style={{
            padding: '2rem',
            backgroundColor: 'var(--dashboard-bg-secondary)',
            borderRadius: '12px',
            textAlign: 'center',
            color: 'var(--dashboard-text-secondary)'
          }}
        >
          <p>{t('billing.subscriptions.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{marginBottom: '2rem'}}>
      <h2 style={{marginTop: '2rem', marginBottom: '1rem', textAlign: 'center', color: 'var(--dashboard-text-primary)'}}>{t('billing.subscriptions.title')}</h2>
      {subscriptions.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            textAlign: 'center',
            color: 'var(--dashboard-text-secondary)'
          }}
        >
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>💳</div>
          <p style={{fontSize: '1.125rem', margin: 0, color: 'var(--dashboard-text-primary)'}}>{t('billing.subscriptions.no_subscriptions_title')}</p>
          <p style={{fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--dashboard-text-tertiary)'}}>{t('billing.subscriptions.no_subscriptions_description')}</p>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--dashboard-bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--dashboard-border-primary)',
                boxShadow: 'var(--dashboard-shadow-sm)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem'}}>
                    <h3 style={{margin: 0, color: 'var(--dashboard-text-primary)', fontSize: '1.25rem', fontWeight: '600'}}>{subscription.product.name}</h3>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: getStatusColor(subscription.status),
                        backgroundColor: `${getStatusColor(subscription.status)}20`,
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {getSubscriptionStatusText(subscription.status)}
                    </span>
                  </div>

                  {subscription.product.description && <p style={{margin: '0 0 1rem 0', color: 'var(--dashboard-text-secondary)', lineHeight: 1.5}}>{subscription.product.description}</p>}

                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem'}}>
                    <div>
                      <span style={{fontWeight: '500', color: 'var(--dashboard-text-secondary)'}}>{t('billing.subscriptions.price_label')} </span>
                      <div style={{fontSize: '1.125rem', fontWeight: '600', color: 'var(--dashboard-text-primary)'}}>
                        {formatPrice(subscription.price.unitAmount, subscription.price.currency)}
                        {subscription.price.interval && (
                          <span style={{fontSize: '0.875rem', fontWeight: '400', color: 'var(--dashboard-text-secondary)'}}>
                            /{t(`billing.subscriptions.billing_interval.${subscription.price.interval}`)}
                          </span>
                        )}
                      </div>
                    </div>

                    {subscription.price.creditsAmount > 0 && (
                      <div>
                        <span style={{fontWeight: '500', color: 'var(--dashboard-text-secondary)'}}>{t('billing.subscriptions.credits_label')} </span>
                        <div style={{fontSize: '1.125rem', fontWeight: '600', color: '#28a745'}}>
                          {new Intl.NumberFormat('ru-RU').format(subscription.price.creditsAmount)}
                          <span style={{fontSize: '0.875rem', fontWeight: '400', color: 'var(--dashboard-text-secondary)'}}>
                            /{t(`billing.subscriptions.billing_interval.${subscription.price.interval}`)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{marginLeft: '2rem', textAlign: 'right'}}>
                  <div style={{fontSize: '0.875rem', color: 'var(--dashboard-text-secondary)', marginBottom: '0.5rem'}}>{t('billing.subscriptions.period_label')}</div>
                  <div style={{fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem'}}>
                    {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </div>

                  {subscription.cancelAtPeriodEnd ? (
                    <div>
                      <div
                        style={{
                          marginBottom: '0.75rem',
                          color: '#dc3545',
                          fontSize: '0.875rem',
                          padding: '0.5rem',
                          backgroundColor: '#f8d7da',
                          borderRadius: '6px',
                          border: '1px solid #f5c6cb'
                        }}
                      >
                        {t('billing.subscriptions.canceled_notice')}
                      </div>
                      {onResumeSubscription && (
                        <button
                          onClick={() => onResumeSubscription(subscription.stripeSubscriptionId)}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          {t('billing.subscriptions.resume_button')}
                        </button>
                      )}
                    </div>
                  ) : (
                    subscription.status === 'ACTIVE' &&
                    onManageSubscription && (
                      <button
                        onClick={() => onManageSubscription(subscription.stripeSubscriptionId)}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'transparent',
                          color: '#6f42c1',
                          border: '1px solid #6f42c1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {t('billing.subscriptions.manage_button')}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsSection;
