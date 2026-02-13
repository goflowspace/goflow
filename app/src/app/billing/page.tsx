'use client';

import React, {useEffect, useRef, useState} from 'react';

import {useRouter, useSearchParams} from 'next/navigation';

import {useProjects} from '@hooks/useProjects';
import {useUserInitialization} from '@hooks/useUserInitialization';
import {trackBillingCreditsPurchase, trackBillingOpen, trackBillingSubscribe} from '@services/analytics';
import {api} from '@services/api';
import {CreditBalance, Purchase, StripeProduct, Subscription} from '@types-folder/billing';
import {useTranslation} from 'react-i18next';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import AccessGuard from '@components/AccessGuard/AccessGuard';
import AuthGuard from '@components/AuthGuard/AuthGuard';
import CreditBalanceWidget from '@components/CreditBalance';
import {ProjectsSidebar} from '@components/Dashboard/ProjectsSidebar';
import CreateTeamModal from '@components/Dashboard/TeamManagement/CreateTeamModal/CreateTeamModal';
import DashboardLayout from '@components/Dashboard/layouts/DashboardLayout';

import CreditPackages from './components/CreditPackages';
import CreditsBalance from './components/CreditsBalance';
import CurrentPlan from './components/CurrentPlan';
import PurchasesHistory from './components/PurchasesHistory';
import SubscriptionsSection from './components/SubscriptionsSection';

interface BillingData {
  credits: CreditBalance | null;
  subscriptions: Subscription[];
  purchases: Purchase[];
  products: StripeProduct[];
}

const BillingPageContent: React.FC = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {user} = useUserStore();
  const {isInitialized, currentTeam} = useTeamStore();
  const {projects, isLoading: isLoadingProjects} = useProjects();
  const [billingData, setBillingData] = useState<BillingData>({
    credits: null,
    subscriptions: [],
    purchases: [],
    products: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const hasTrackedBillingOpen = useRef(false);

  // Инициализируем пользователя
  useUserInitialization();

  // Функция загрузки данных
  const loadData = async () => {
    if (!user || !isInitialized || !currentTeam) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading billing data for team:', currentTeam.name);

      // Параллельно загружаем все данные (кроме проектов - они загружаются через хук)
      const [credits, subscriptions, purchases, products] = await Promise.all([
        api.getUserCredits(),
        api.getTeamSubscriptions(currentTeam.id), // Загружаем подписки только для текущей команды
        api.getUserPurchases(5), // Последние 5 покупок
        api.getBillingProducts() // Доступные продукты
      ]);
      setBillingData({
        credits,
        subscriptions,
        purchases,
        products
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(t('billing.error_loading'));
    } finally {
      setIsLoading(false);
    }
  };

  // Инициализируем пользователя
  useUserInitialization();

  // Трекинг открытия страницы Billing (только один раз)
  useEffect(() => {
    if (!hasTrackedBillingOpen.current) {
      trackBillingOpen();
      hasTrackedBillingOpen.current = true;
    }
  }, []);

  // Проверяем URL параметры для уведомлений о платежах
  useEffect(() => {
    if (!searchParams) return;

    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      // TODO: Показать уведомление об успешной оплате
      // Можно использовать toast или notification систему
      console.log('Payment successful!');
      // Очищаем URL параметры
      router.replace('/billing');
    } else if (canceled === 'true') {
      // TODO: Показать уведомление об отмене оплаты
      console.log('Payment canceled');
      // Очищаем URL параметры
      router.replace('/billing');
    }
  }, [searchParams, router]);

  // Начальная загрузка данных и перезагрузка при смене команды
  useEffect(() => {
    if (user && isInitialized && currentTeam) {
      loadData();
    }
  }, [user, isInitialized, currentTeam?.id]);

  // Обработчики для управления подписками
  const handleManageSubscription = async (subscriptionId: string) => {
    try {
      // Открываем Stripe Customer Portal для управления подписками
      const portalSession = await api.createCustomerPortalSession();
      window.location.href = portalSession.url;
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      setError(t('billing.error_subscription_management'));
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    if (!currentTeam) return;

    try {
      await api.resumeSubscription(subscriptionId);
      // Перезагружаем подписки для текущей команды
      const updatedSubscriptions = await api.getTeamSubscriptions(currentTeam.id);
      setBillingData((prev) => ({...prev, subscriptions: updatedSubscriptions}));
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      setError(t('billing.error_subscription_resume'));
    }
  };

  // Обработчик покупки
  const handlePurchase = async (priceId: string, isSubscription: boolean, seats?: number) => {
    try {
      // Находим продукт и цену для трекинга
      const product = billingData.products.find((p) => p.prices.some((price) => price.stripePriceId === priceId));
      const price = product?.prices.find((p) => p.stripePriceId === priceId);

      if (product && price) {
        if (isSubscription) {
          // Определяем период подписки
          const period = price.interval === 'year' ? 'annual' : 'monthly';

          // Трекинг подписки
          trackBillingSubscribe(price.creditsAmount, price.currency, period, price.stripePriceId, product.stripeProductId, price.unitAmount);
        } else {
          // Трекинг покупки кредитов
          trackBillingCreditsPurchase(price.creditsAmount, price.currency, price.stripePriceId, product.stripeProductId, price.unitAmount);
        }
      }

      const checkoutData = {
        priceId,
        teamId: currentTeam?.id,
        ...(seats && {seats}),
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`
      };

      const result = isSubscription ? await api.createSubscriptionCheckout(checkoutData) : await api.createOneTimePurchaseCheckout(checkoutData);

      // Перенаправляем на Stripe Checkout
      window.location.href = result.url;
    } catch (error) {
      console.error('Failed to create checkout:', error);
      setError(t('billing.error_payment'));
    }
  };

  // Обработчик выбора проекта - переход в редактор
  const handleProjectSelect = (projectId: string) => {
    router.push(`/${projectId}/editor`);
  };

  // Компонент боковой панели проектов
  const projectsSidebar = (
    <ProjectsSidebar
      projects={projects}
      selectedProjectId={undefined}
      isCreatingProject={false}
      isLoadingProjects={isLoadingProjects}
      onCreateProject={() => router.push('/projects')}
      onCreateTeam={() => setIsCreateTeamModalOpen(true)}
      onProjectSelect={handleProjectSelect}
      onRenameProject={() => {}}
      onDuplicateProject={() => {}}
      onDeleteProject={() => {}}
    />
  );

  if (isLoading) {
    return (
      <DashboardLayout projectsSidebar={projectsSidebar}>
        <div style={{padding: '2rem'}}>
          <h1>{t('billing.title')}</h1>
          <div>{t('billing.loading_data')}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout projectsSidebar={projectsSidebar}>
        <div style={{padding: '2rem'}}>
          <h1>{t('billing.title')}</h1>
          <div style={{color: 'red'}}>
            {t('common.error')}: {error}
          </div>
          <button onClick={() => window.location.reload()} style={{marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer'}}>
            {t('billing.try_again')}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectsSidebar={projectsSidebar}>
      <div
        style={{
          padding: '2rem',
          width: '100%',
          height: '100%',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: '600',
              color: 'var(--dashboard-text-primary)'
            }}
          >
            {t('billing.title')}
          </h1>
        </div>

        <CurrentPlan
          subscriptions={billingData.subscriptions}
          isLoading={isLoading}
          onUpgrade={() => {
            // Прокручиваем к секции с пакетами кредитов
            const creditPackagesElement = document.querySelector('[data-section="credit-packages"]');
            if (creditPackagesElement) {
              creditPackagesElement.scrollIntoView({behavior: 'smooth'});
            }
          }}
        />

        <CreditBalanceWidget credits={billingData.credits} isLoading={isLoading} />

        <div data-section='credit-packages'>
          <CreditPackages products={billingData.products} userSubscriptions={billingData.subscriptions} isLoading={false} onPurchase={handlePurchase} />
        </div>

        <SubscriptionsSection subscriptions={billingData.subscriptions} isLoading={false} onManageSubscription={handleManageSubscription} onResumeSubscription={handleResumeSubscription} />

        <PurchasesHistory purchases={billingData.purchases} isLoading={false} />
      </div>

      {/* Модальное окно создания команды */}
      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSuccess={() => {
          // Перезагружаем данные после создания команды
          loadData();
        }}
      />
    </DashboardLayout>
  );
};

const BillingPage: React.FC = () => {
  return (
    <AuthGuard>
      <AccessGuard allowedRoles={['ADMINISTRATOR']}>
        <BillingPageContent />
      </AccessGuard>
    </AuthGuard>
  );
};

export default BillingPage;
