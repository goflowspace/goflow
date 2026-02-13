import React, {useState} from 'react';

import {useSubscriptionPlan} from '@hooks/useSubscriptionPlan';
import {StripeProduct, Subscription} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

interface CreditPackagesProps {
  products: StripeProduct[];
  userSubscriptions: Subscription[];
  isLoading?: boolean;
  onPurchase?: (priceId: string, isSubscription: boolean, seats?: number) => void;
}

const CreditPackages: React.FC<CreditPackagesProps> = ({products, userSubscriptions, isLoading = false, onPurchase}) => {
  const {t} = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [teamSeats, setTeamSeats] = useState<number>(5); // Default to 5 seats for Team plan

  // Определяем тип плана пользователя
  const planInfo = useSubscriptionPlan(userSubscriptions);
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const formatCredits = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const getCreditTypeText = (creditType: string) => {
    return t(`billing.credit_packages.credit_types.${creditType}`) || 'credits';
  };

  const getProductTypeText = (type: string) => {
    return t(`billing.credit_packages.product_types.${type}`) || type;
  };

  const getProductTypeColor = (type: string) => {
    return type === 'SUBSCRIPTION' ? '#007bff' : '#28a745';
  };

  if (isLoading) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{marginBottom: '1rem'}}>Доступные пакеты</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: '2rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                minHeight: '250px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{color: '#6c757d'}}>{t('billing.credit_packages.loading')}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{marginBottom: '1rem'}}>{t('billing.credit_packages.title')}</h2>
        <div
          style={{
            padding: '3rem',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            textAlign: 'center',
            color: '#6c757d'
          }}
        >
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📦</div>
          <p style={{fontSize: '1.125rem', margin: 0}}>{t('billing.credit_packages.no_packages_title')}</p>
          <p style={{fontSize: '0.875rem', marginTop: '0.5rem', color: '#adb5bd'}}>{t('billing.credit_packages.no_packages_description')}</p>
        </div>
      </div>
    );
  }

  // Группируем продукты по типу
  const subscriptions = products.filter((p) => p.type === 'SUBSCRIPTION');
  const oneTimeProducts = products.filter((p) => p.type === 'ONE_TIME');

  // Парсим план и период из названия и данных цены
  const parseSubscriptionData = (product: StripeProduct) => {
    const nameLower = product.name.toLowerCase();

    // Определяем тип плана по названию
    let planType = 'unknown';
    if (nameLower.includes('pro'))
      planType = 'solo'; // Pro = Solo план
    else if (nameLower.includes('team')) planType = 'team';
    else if (nameLower.includes('enterprise')) planType = 'enterprise';

    // Период определяем по interval в цене
    let billingPeriod = 'monthly';
    if (product.prices[0]?.interval === 'year') billingPeriod = 'annual';
    else if (product.prices[0]?.interval === 'month') billingPeriod = 'monthly';

    return {planType, billingPeriod};
  };

  // Находим план для текущего периода по типу
  const getPlanByType = (planType: string) => {
    // Сначала пытаемся найти по точному соответствию
    let plan = subscriptions.find((product) => {
      const {planType: productPlanType, billingPeriod} = parseSubscriptionData(product);
      return productPlanType === planType && billingPeriod === selectedPeriod;
    });

    // Если не найден, берем первый подписочный продукт для выбранного периода
    if (!plan) {
      plan = subscriptions.find((product) => {
        const {billingPeriod} = parseSubscriptionData(product);
        return billingPeriod === selectedPeriod;
      });
    }

    // Если и этого нет, берем первый подписочный продукт
    if (!plan && subscriptions.length > 0) {
      plan = subscriptions[0];
    }

    return plan;
  };

  const proPlan = getPlanByType('solo');
  const teamPlan = getPlanByType('team');

  // Отладочная информация для диагностики
  console.log('Debug subscription products:', {
    allProducts: products,
    subscriptions,
    selectedPeriod,
    proPlan,
    teamPlan,
    parsedData: subscriptions.map((p) => ({
      name: p.name,
      parsed: parseSubscriptionData(p)
    }))
  });

  // Фильтруем подписки по выбранному периоду
  const filteredSubscriptions = subscriptions.filter((product) => {
    const {billingPeriod} = parseSubscriptionData(product);
    return billingPeriod === selectedPeriod;
  });

  // Группируем по типу плана
  const soloPlans = filteredSubscriptions.filter((product) => {
    const {planType} = parseSubscriptionData(product);
    return planType === 'solo';
  });

  const teamPlans = filteredSubscriptions.filter((product) => {
    const {planType} = parseSubscriptionData(product);
    return planType === 'team';
  });

  return (
    <div style={{marginBottom: '2rem'}}>
      {/* <h2 style={{marginBottom: '1rem'}}>Доступные пакеты</h2> */}

      {/* Subscription Plans - показываем только для free плана */}
      {planInfo.planType === 'free' && (
        <div style={{marginBottom: '4rem'}}>
          <h2 style={{marginBottom: '1rem', textAlign: 'center', color: 'var(--dashboard-text-primary)'}}>{t('billing.subscription_plans.title')}</h2>

          {/* Billing Period Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '3rem',
              gap: '1rem'
            }}
          >
            <span
              style={{
                fontSize: '1.125rem',
                fontWeight: selectedPeriod === 'monthly' ? '600' : '400',
                color: selectedPeriod === 'monthly' ? 'var(--dashboard-text-primary)' : 'var(--dashboard-text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              {t('billing.subscription_plans.billing_toggle.monthly')}
            </span>

            <div
              style={{
                position: 'relative',
                width: '60px',
                height: '32px',
                backgroundColor: selectedPeriod === 'annual' ? '#4f46e5' : '#d1d5db',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
              onClick={() => setSelectedPeriod(selectedPeriod === 'monthly' ? 'annual' : 'monthly')}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: selectedPeriod === 'annual' ? '32px' : '4px',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span
                style={{
                  fontSize: '1.125rem',
                  fontWeight: selectedPeriod === 'annual' ? '600' : '400',
                  color: selectedPeriod === 'annual' ? 'var(--dashboard-text-primary)' : 'var(--dashboard-text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('billing.subscription_plans.billing_toggle.yearly')}
              </span>
              <span
                style={{
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {t('billing.subscription_plans.billing_toggle.yearly_discount')}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}
          >
            {/* Pro Plan - Popular */}
            <div
              style={{
                backgroundColor: 'var(--dashboard-bg-card)',
                borderRadius: '24px',
                border: '2px solid #4f46e5',
                padding: '2rem',
                transition: 'all 0.3s ease',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(79, 70, 229, 0.15)',
                background: 'var(--dashboard-bg-card)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(79, 70, 229, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(79, 70, 229, 0.15)';
              }}
            >
              {/* Popular Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {t('billing.subscription_plans.pro_plan.popular_badge')}
              </div>

              <div style={{textAlign: 'left', paddingTop: '1rem'}}>
                {/* Icon and Title */}
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
                  <div style={{fontSize: '1.5rem', color: '#4f46e5'}}>⚡</div>
                  <h3 style={{fontSize: '1.75rem', fontWeight: '700', color: 'var(--dashboard-text-primary)', margin: 0}}>{proPlan?.name || 'Pro'}</h3>
                </div>

                {/* Price */}
                <div style={{marginBottom: '1.5rem', minHeight: '4.5rem'}}>
                  <div style={{fontSize: '3rem', fontWeight: '700', color: 'var(--dashboard-text-primary)', lineHeight: 1}}>
                    {proPlan?.prices[0]
                      ? selectedPeriod === 'annual'
                        ? // Для годового плана показываем месячную стоимость (годовая цена / 12)
                          formatPrice(Math.round(proPlan.prices[0].unitAmount / 12), proPlan.prices[0].currency)
                        : // Для месячного плана показываем как есть
                          formatPrice(proPlan.prices[0].unitAmount, proPlan.prices[0].currency)
                      : '$20'}
                    <span style={{fontSize: '1rem', fontWeight: '500', color: 'var(--dashboard-text-secondary)'}}> /mo</span>
                  </div>
                  <div style={{fontSize: '0.875rem', color: 'var(--dashboard-text-secondary)', marginTop: '0.25rem', minHeight: '1.25rem'}}>
                    {selectedPeriod === 'annual' && proPlan?.prices[0]
                      ? t('billing.subscription_plans.pro_plan.billed_annually', {price: formatPrice(proPlan.prices[0].unitAmount, proPlan.prices[0].currency)})
                      : ''}
                  </div>
                </div>

                {/* Description */}
                <p style={{color: 'var(--dashboard-text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: '1.5'}}>{proPlan?.description || 'For indie developers and small teams'}</p>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    console.log('Subscribe button clicked', {
                      proPlan,
                      priceId: proPlan?.prices[0]?.stripePriceId,
                      onPurchase: !!onPurchase
                    });
                    if (proPlan?.prices[0]) {
                      onPurchase?.(proPlan.prices[0].stripePriceId, true, 1);
                    }
                  }}
                  disabled={!proPlan?.prices[0]}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: !proPlan?.prices[0] ? '#9ca3af' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: !proPlan?.prices[0] ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '2rem',
                    opacity: !proPlan?.prices[0] ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (proPlan?.prices[0]) {
                      e.currentTarget.style.backgroundColor = '#4338ca';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (proPlan?.prices[0]) {
                      e.currentTarget.style.backgroundColor = '#4f46e5';
                    }
                  }}
                >
                  {t('billing.subscription_plans.pro_plan.subscribe_button')}
                </button>

                {/* Features */}
                <div style={{marginBottom: '1rem'}}>
                  <h4 style={{fontSize: '1rem', fontWeight: '600', color: 'var(--dashboard-text-primary)', marginBottom: '1rem'}}>{t('billing.subscription_plans.whats_included')}</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '6rem'}}>
                    {[
                      t('billing.subscription_plans.pro_plan.features.storage'),
                      t('billing.subscription_plans.pro_plan.features.ai_tools'),
                      proPlan?.prices[0]
                        ? selectedPeriod === 'monthly'
                          ? t('billing.subscription_plans.pro_plan.features.credits_monthly', {amount: formatCredits(proPlan.prices[0].creditsAmount)})
                          : t('billing.subscription_plans.pro_plan.features.credits_yearly')
                        : selectedPeriod === 'monthly'
                          ? t('billing.subscription_plans.pro_plan.features.credits_monthly', {amount: '10,000'})
                          : t('billing.subscription_plans.pro_plan.features.credits_yearly')
                    ].map((feature, index) => (
                      <div key={index} style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
                        <div style={{color: '#10b981', fontSize: '1rem', marginTop: '0.125rem', flexShrink: 0}}>✓</div>
                        <span style={{color: 'var(--dashboard-text-secondary)', fontSize: '0.875rem', lineHeight: '1.4'}}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Team Plan - Active */}
            <div
              style={{
                backgroundColor: 'var(--dashboard-bg-card)',
                borderRadius: '24px',
                border: '2px solid #10b981',
                padding: '2rem',
                transition: 'all 0.3s ease',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.15)',
                background: 'var(--dashboard-bg-card)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(16, 185, 129, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.15)';
              }}
            >
              {/* Coming Soon Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {t('billing.subscription_plans.team_plan.team_badge')}
              </div>

              <div style={{textAlign: 'left', paddingTop: '1rem'}}>
                {/* Icon and Title */}
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
                  <div style={{fontSize: '1.5rem', color: '#10b981'}}>👥</div>
                  <h3 style={{fontSize: '1.75rem', fontWeight: '700', color: 'var(--dashboard-text-primary)', margin: 0}}>{teamPlan?.name || 'Team'}</h3>
                </div>

                {/* Price */}
                <div style={{marginBottom: '1.5rem', minHeight: '4.5rem'}}>
                  <div style={{fontSize: '3rem', fontWeight: '700', color: 'var(--dashboard-text-primary)', lineHeight: 1}}>
                    {teamPlan?.prices[0]
                      ? selectedPeriod === 'annual'
                        ? // Для годового плана показываем месячную стоимость (годовая цена / 12)
                          formatPrice(Math.round(teamPlan.prices[0].unitAmount / 12), teamPlan.prices[0].currency)
                        : // Для месячного плана показываем как есть
                          formatPrice(teamPlan.prices[0].unitAmount, teamPlan.prices[0].currency)
                      : '$40'}
                    <span style={{fontSize: '1rem', fontWeight: '500', color: 'var(--dashboard-text-secondary)'}}> /mo</span>
                  </div>
                  <div style={{fontSize: '0.875rem', color: 'var(--dashboard-text-secondary)', marginTop: '0.25rem', minHeight: '1.25rem'}}>
                    {selectedPeriod === 'annual' && teamPlan?.prices[0] ? `Billed annually at ${formatPrice(teamPlan.prices[0].unitAmount, teamPlan.prices[0].currency)}` : ''}
                  </div>
                </div>

                {/* Description */}
                <p style={{color: 'var(--dashboard-text-secondary)', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: '1.5'}}>{teamPlan?.description || 'For medium studios and teams'}</p>

                {/* Team Size Selector */}
                <div style={{marginBottom: '2rem'}}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--dashboard-text-primary)',
                      marginBottom: '0.5rem'
                    }}
                  >
                    {t('billing.subscription_plans.team_plan.team_size_label')}
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      justifyContent: 'center'
                    }}
                  >
                    {/* Кнопка минус */}
                    <button
                      type='button'
                      onClick={() => setTeamSeats(Math.max(5, teamSeats - 1))}
                      disabled={teamSeats <= 5}
                      style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: teamSeats <= 5 ? '#f3f4f6' : 'var(--dashboard-bg-card)',
                        border: '2px solid var(--dashboard-border-primary)',
                        borderRadius: '8px',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: teamSeats <= 5 ? '#9ca3af' : 'var(--dashboard-text-primary)',
                        cursor: teamSeats <= 5 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (teamSeats > 5) {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (teamSeats > 5) {
                          e.currentTarget.style.borderColor = 'var(--dashboard-border-primary)';
                          e.currentTarget.style.backgroundColor = 'var(--dashboard-bg-card)';
                        }
                      }}
                    >
                      −
                    </button>

                    {/* Отображение количества */}
                    <div
                      style={{
                        minWidth: '120px',
                        textAlign: 'center',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--dashboard-text-primary)'
                      }}
                    >
                      {teamSeats} {t('billing.subscription_plans.team_plan.seats_suffix')}
                    </div>

                    {/* Кнопка плюс */}
                    <button
                      type='button'
                      onClick={() => setTeamSeats(Math.min(15, teamSeats + 1))}
                      disabled={teamSeats >= 15}
                      style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: teamSeats >= 15 ? '#f3f4f6' : 'var(--dashboard-bg-card)',
                        border: '2px solid var(--dashboard-border-primary)',
                        borderRadius: '8px',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: teamSeats >= 15 ? '#9ca3af' : 'var(--dashboard-text-primary)',
                        cursor: teamSeats >= 15 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (teamSeats < 15) {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (teamSeats < 15) {
                          e.currentTarget.style.borderColor = 'var(--dashboard-border-primary)';
                          e.currentTarget.style.backgroundColor = 'var(--dashboard-bg-card)';
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{fontSize: '0.75rem', color: 'var(--dashboard-text-secondary)', marginTop: '0.25rem'}}>{t('billing.subscription_plans.team_plan.per_seat_price')}</div>
                </div>

                {/* CTA Button - Subscribe */}
                <button
                  onClick={() => {
                    console.log('Team Subscribe button clicked', {
                      teamPlan,
                      priceId: teamPlan?.prices[0]?.stripePriceId,
                      teamSeats,
                      onPurchase: !!onPurchase
                    });
                    if (teamPlan?.prices[0]) {
                      onPurchase?.(teamPlan.prices[0].stripePriceId, true, teamSeats);
                    }
                  }}
                  disabled={!teamPlan?.prices[0]}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: !teamPlan?.prices[0] ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: !teamPlan?.prices[0] ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '2rem',
                    opacity: !teamPlan?.prices[0] ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (teamPlan?.prices[0]) {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (teamPlan?.prices[0]) {
                      e.currentTarget.style.backgroundColor = '#10b981';
                    }
                  }}
                >
                  {t('billing.subscription_plans.team_plan.subscribe_button')}
                </button>

                {/* Features */}
                <div style={{marginBottom: '1rem'}}>
                  <h4 style={{fontSize: '1rem', fontWeight: '600', color: 'var(--dashboard-text-primary)', marginBottom: '1rem'}}>{t('billing.subscription_plans.whats_included')}</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '6rem'}}>
                    {[
                      t('billing.subscription_plans.team_plan.features.everything_pro'),
                      t('billing.subscription_plans.team_plan.features.team_size'),
                      t('billing.subscription_plans.team_plan.features.collaboration'),
                      teamPlan?.prices[0]
                        ? selectedPeriod === 'monthly'
                          ? t('billing.subscription_plans.pro_plan.features.credits_monthly', {amount: formatCredits(teamPlan.prices[0].creditsAmount)})
                          : t('billing.subscription_plans.pro_plan.features.credits_yearly')
                        : selectedPeriod === 'monthly'
                          ? t('billing.subscription_plans.pro_plan.features.credits_monthly', {amount: '10,000'})
                          : t('billing.subscription_plans.pro_plan.features.credits_yearly')
                    ].map((feature, index) => (
                      <div key={index} style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
                        <div style={{color: '#10b981', fontSize: '1rem', marginTop: '0.125rem', flexShrink: 0}}>✓</div>
                        <span style={{color: 'var(--dashboard-text-secondary)', fontSize: '0.875rem', lineHeight: '1.4'}}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise Plan - Coming Soon */}
            <div
              style={{
                backgroundColor: 'var(--dashboard-bg-card)',
                borderRadius: '24px',
                border: '1px solid var(--dashboard-border-primary)',
                padding: '2rem',
                transition: 'all 0.3s ease',
                position: 'relative',
                opacity: 0.7
              }}
            >
              {/* Coming Soon Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {t('billing.subscription_plans.enterprise_plan.coming_soon_badge')}
              </div>

              <div style={{textAlign: 'left', paddingTop: '1rem'}}>
                {/* Icon and Title */}
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem'}}>
                  <div style={{fontSize: '1.5rem', color: '#9ca3af'}}>🏢</div>
                  <h3 style={{fontSize: '1.75rem', fontWeight: '700', color: 'var(--dashboard-text-primary)', margin: 0}}>Enterprise</h3>
                </div>

                {/* Price */}
                <div style={{marginBottom: '1.5rem'}}>
                  <div style={{fontSize: '3rem', fontWeight: '700', color: 'var(--dashboard-text-primary)', lineHeight: 1}}>Custom</div>
                </div>

                {/* Description */}
                <p style={{color: 'var(--dashboard-text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: '1.5'}}>For large studios with special requirements</p>

                {/* CTA Button - Active */}
                <button
                  onClick={() => {
                    const subject = encodeURIComponent('Enterprise Plan Inquiry');
                    const body = encodeURIComponent(`Hello Flow Team,

I'm interested in learning more about the Enterprise plan for our organization.

Our organization details:
- Company name: 
- Team size: 
- Industry: 
- Use case: 
- Expected monthly usage: 

Could you please provide more information about:
- Custom pricing options
- Enterprise features and integrations
- Security and compliance capabilities
- Implementation and support

We'd appreciate the opportunity to discuss our specific requirements.

Best regards,`);
                    window.open(`mailto:sales@goflow.space?subject=${subject}&body=${body}`, '_blank');
                  }}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: 'transparent',
                    color: '#4f46e5',
                    border: '2px solid #4f46e5',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '2rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--dashboard-bg-hover)';
                    e.currentTarget.style.borderColor = '#4338ca';
                    e.currentTarget.style.color = '#4338ca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#4f46e5';
                    e.currentTarget.style.color = '#4f46e5';
                  }}
                >
                  {t('billing.subscription_plans.team_plan.contact_sales_button')}
                </button>

                {/* Features */}
                <div style={{marginBottom: '1rem'}}>
                  <h4 style={{fontSize: '1rem', fontWeight: '600', color: 'var(--dashboard-text-primary)', marginBottom: '1rem'}}>What's included:</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                    {[
                      t('billing.subscription_plans.enterprise_plan.features.everything_team'),
                      t('billing.subscription_plans.enterprise_plan.features.unlimited_team'),
                      t('billing.subscription_plans.enterprise_plan.features.unlimited_credits')
                    ].map((feature, index) => (
                      <div key={index} style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <div style={{color: '#10b981', fontSize: '1rem'}}>✓</div>
                        <span style={{color: 'var(--dashboard-text-secondary)', fontSize: '0.875rem'}}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Packs */}
      {oneTimeProducts.length > 0 && (
        <div>
          <h2 style={{marginBottom: '1rem', textAlign: 'center', color: 'var(--dashboard-text-primary)'}}>{t('billing.credit_packages.ai_packages_title')}</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}
          >
            {oneTimeProducts
              .sort((a, b) => {
                const aCredits = a.prices[0]?.creditsAmount || 0;
                const bCredits = b.prices[0]?.creditsAmount || 0;
                return aCredits - bCredits; // От малого к большому
              })
              .map((product, index) => {
                const price = product.prices[0];
                if (!price) return null;

                // Определяем стиль карточки на основе индекса
                const isPopular = index === 1; // Средняя карточка популярная
                const isHighlighted = isPopular;

                // Фичи для каждого пакета в порядке от малого к большому
                const packageFeatures = [
                  'Polish your project with AI', // Малый пакет
                  'Use AI almost like a Pro', // Средний пакет (Popular)
                  'Use AI with great confidence' // Большой пакет
                ];

                const feature = packageFeatures[index] || 'Use AI efficiently';

                return (
                  <div
                    key={product.id}
                    style={{
                      backgroundColor: 'var(--dashboard-bg-card)',
                      borderRadius: '24px',
                      border: isHighlighted ? '2px solid #8b5cf6' : '1px solid var(--dashboard-border-primary)',
                      padding: '2rem',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      boxShadow: isHighlighted ? '0 10px 25px rgba(139, 92, 246, 0.15)' : 'var(--dashboard-shadow-sm)',
                      background: 'var(--dashboard-bg-card)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = isHighlighted ? '0 15px 35px rgba(139, 92, 246, 0.25)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isHighlighted ? '0 10px 25px rgba(139, 92, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-12px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          padding: '0.5rem 1.5rem',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        {t('billing.subscription_plans.pro_plan.popular_badge')}
                      </div>
                    )}

                    <div
                      style={{
                        textAlign: 'left',
                        marginBottom: '2rem',
                        paddingTop: '1rem' // Одинаковый отступ для всех карточек
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: 'var(--dashboard-text-primary)',
                          margin: '0 0 0.5rem 0'
                        }}
                      >
                        {product.name}
                      </h3>
                      <div
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: '700',
                          color: 'var(--dashboard-text-primary)',
                          margin: '1rem 0 0.25rem 0'
                        }}
                      >
                        {formatCredits(price.creditsAmount)}{' '}
                        <span
                          style={{
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: 'var(--dashboard-text-secondary)'
                          }}
                        >
                          {getCreditTypeText(price.creditType)}
                        </span>
                      </div>
                      <p
                        style={{
                          color: 'var(--dashboard-text-secondary)',
                          fontSize: '0.875rem',
                          margin: '0 0 1.5rem 0',
                          lineHeight: '1.4'
                        }}
                      >
                        {product.description || 'Credit package for your AI needs'}
                      </p>
                    </div>

                    <button
                      onClick={() => onPurchase?.(price.stripePriceId, false, undefined)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#7c3aed';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#8b5cf6';
                      }}
                    >
                      {t('billing.credit_packages.buy_credits_button', {price: formatPrice(price.unitAmount, price.currency)})}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditPackages;
