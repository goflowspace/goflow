import React from 'react';

import {Purchase} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

import styles from './PurchasesHistory.module.scss';

interface PurchasesHistoryProps {
  purchases: Purchase[];
  isLoading?: boolean;
}

const PurchasesHistory: React.FC<PurchasesHistoryProps> = ({purchases, isLoading = false}) => {
  const {t} = useTranslation();
  const formatCredits = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

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

  const getPurchaseStatusText = (status: string) => {
    return t(`billing.purchases_history.purchase_status.${status}`) || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      SUCCEEDED: '#28a745',
      CANCELED: '#dc3545',
      PROCESSING: '#17a2b8',
      REQUIRES_PAYMENT_METHOD: '#ffc107',
      REQUIRES_CONFIRMATION: '#fd7e14',
      REQUIRES_ACTION: '#ffc107'
    };
    return colorMap[status] || '#6c757d';
  };

  const getCreditTypeText = (creditType: string) => {
    return t(`billing.purchases_history.credit_types.${creditType}`) || creditType;
  };

  if (isLoading) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{marginBottom: '1rem', textAlign: 'center', color: 'var(--dashboard-text-primary)'}}>{t('billing.purchases_history.title')}</h2>
        <div
          style={{
            padding: '2rem',
            backgroundColor: 'var(--dashboard-bg-secondary)',
            borderRadius: '12px',
            textAlign: 'center',
            color: 'var(--dashboard-text-secondary)'
          }}
        >
          <p>{t('billing.purchases_history.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{marginBottom: '2rem'}}>
      <h2 style={{marginBottom: '1rem', textAlign: 'center', color: 'var(--dashboard-text-primary)'}}>{t('billing.purchases_history.title')}</h2>
      {purchases.length === 0 ? (
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
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🛒</div>
          <p style={{fontSize: '1.125rem', margin: 0, color: 'var(--dashboard-text-primary)'}}>{t('billing.purchases_history.no_purchases_title')}</p>
          <p style={{fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--dashboard-text-tertiary)'}}>{t('billing.purchases_history.no_purchases_description')}</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--dashboard-bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--dashboard-border-primary)',
            overflow: 'hidden',
            boxShadow: 'var(--dashboard-shadow-sm)'
          }}
        >
          {/* Мобильная версия для маленьких экранов */}
          <div style={{display: 'block'}}>
            {/* Версия для больших экранов - таблица */}
            <div className={styles.desktopOnly}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{backgroundColor: 'var(--dashboard-bg-secondary)'}}>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--dashboard-border-primary)',
                        fontWeight: '600',
                        color: 'var(--dashboard-text-secondary)'
                      }}
                    >
                      {t('billing.purchases_history.table_headers.product')}
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--dashboard-border-primary)',
                        fontWeight: '600',
                        color: 'var(--dashboard-text-secondary)'
                      }}
                    >
                      {t('billing.purchases_history.table_headers.credits')}
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--dashboard-border-primary)',
                        fontWeight: '600',
                        color: 'var(--dashboard-text-secondary)'
                      }}
                    >
                      {t('billing.purchases_history.table_headers.amount')}
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--dashboard-border-primary)',
                        fontWeight: '600',
                        color: 'var(--dashboard-text-secondary)'
                      }}
                    >
                      {t('billing.purchases_history.table_headers.date')}
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--dashboard-border-primary)',
                        fontWeight: '600',
                        color: 'var(--dashboard-text-secondary)'
                      }}
                    >
                      {t('billing.purchases_history.table_headers.status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase, index) => (
                    <tr
                      key={purchase.id}
                      style={{
                        borderBottom: index < purchases.length - 1 ? '1px solid var(--dashboard-border-secondary)' : 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--dashboard-bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{padding: '1rem'}}>
                        <div>
                          <div style={{fontWeight: '500', marginBottom: '0.25rem'}}>{purchase.product.name}</div>
                          {purchase.product.description && <div style={{fontSize: '0.875rem', color: 'var(--dashboard-text-secondary)'}}>{purchase.product.description}</div>}
                        </div>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <div style={{fontWeight: '500'}}>{formatCredits(purchase.creditsGranted)}</div>
                        <div style={{fontSize: '0.875rem', color: 'var(--dashboard-text-secondary)'}}>{getCreditTypeText(purchase.creditType)}</div>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <div style={{fontWeight: '500', fontSize: '1.125rem'}}>{formatPrice(purchase.amount, purchase.currency)}</div>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <div style={{fontSize: '0.875rem'}}>{formatDate(purchase.createdAt)}</div>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <span
                          style={{
                            color: getStatusColor(purchase.status),
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: `${getStatusColor(purchase.status)}20`,
                            borderRadius: '6px'
                          }}
                        >
                          {getPurchaseStatusText(purchase.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Мобильная версия - карточки */}
            <div className={styles.mobileOnly}>
              {purchases.map((purchase, index) => (
                <div
                  key={purchase.id}
                  style={{
                    padding: '1rem',
                    borderBottom: index < purchases.length - 1 ? '1px solid var(--dashboard-border-secondary)' : 'none'
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem'}}>
                    <div style={{fontWeight: '500'}}>{purchase.product.name}</div>
                    <span
                      style={{
                        color: getStatusColor(purchase.status),
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: `${getStatusColor(purchase.status)}20`,
                        borderRadius: '6px'
                      }}
                    >
                      {getPurchaseStatusText(purchase.status)}
                    </span>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem'}}>
                    <div>
                      <span style={{color: 'var(--dashboard-text-secondary)'}}>{t('billing.purchases_history.mobile_labels.credits')} </span>
                      {formatCredits(purchase.creditsGranted)}
                    </div>
                    <div>
                      <span style={{color: 'var(--dashboard-text-secondary)'}}>{t('billing.purchases_history.mobile_labels.amount')} </span>
                      {formatPrice(purchase.amount, purchase.currency)}
                    </div>
                    <div style={{gridColumn: '1 / -1'}}>
                      <span style={{color: 'var(--dashboard-text-secondary)'}}>{t('billing.purchases_history.mobile_labels.date')} </span>
                      {formatDate(purchase.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesHistory;
