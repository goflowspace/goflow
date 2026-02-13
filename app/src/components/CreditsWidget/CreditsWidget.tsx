'use client';

import React from 'react';

import {useRouter} from 'next/navigation';

import {useSubscription} from '@hooks/useSubscription';
import {LightningBoltIcon} from '@radix-ui/react-icons';
import {Button, Flex, Text} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import {useCreditsStore} from '@store/useCreditsStore';

import s from './creditsWidget.module.scss';

interface CreditsWidgetProps {
  size?: 'small' | 'medium';
  className?: string;
}

const CreditsWidget: React.FC<CreditsWidgetProps> = ({size = 'medium', className}) => {
  const {t} = useTranslation();
  const router = useRouter();
  const {credits, isLoading, loadCredits} = useCreditsStore();
  const {hasActiveSubscription, isLoading: isSubscriptionLoading} = useSubscription();

  // Загружаем кредиты при первом рендере
  React.useEffect(() => {
    if (!credits) {
      loadCredits();
    }
  }, [credits, loadCredits]);

  // Форматирование числа кредитов
  const formatCredits = (amount: number): string => {
    if (amount >= 1000) {
      const k = amount / 1000;
      return `${k.toFixed(1)}k`;
    }
    return amount.toString();
  };

  const totalCredits = credits?.balance || 0;
  const hasCredits = totalCredits > 0;

  // Определяем цветовую категорию на основе количества кредитов
  const getCreditsCategoryClass = (amount: number): string => {
    if (amount === 0) return 'noCredits';
    if (amount <= 50) return 'lowCredits';
    if (amount <= 250) return 'mediumCredits';
    return 'highCredits';
  };

  const creditsCategory = getCreditsCategoryClass(totalCredits);

  const handleBuyCredits = () => {
    router.push('/billing');
  };

  if (isLoading || isSubscriptionLoading) {
    return (
      <div className={`${s.widget} ${s[size]} ${className || ''}`}>
        <div className={s.loading}>
          <div className={s.loadingDot}></div>
          <div className={s.loadingDot}></div>
          <div className={s.loadingDot}></div>
        </div>
      </div>
    );
  }

  return (
    <Flex align='center' gap='2'>
      <div className={`${s.widget} ${s[size]} ${className || ''} ${s[creditsCategory]}`} onClick={handleBuyCredits} title={t('credits_widget.click_to_manage', 'Click to manage credits')}>
        <Flex align='center' gap='2'>
          <LightningBoltIcon className={s.icon} />
          <div className={s.content}>
            <Text size={size === 'small' ? '1' : '2'} weight='medium' className={s.amount}>
              {formatCredits(totalCredits)}
            </Text>
            {!hasCredits && (
              <Button
                size='1'
                variant='solid'
                color='red'
                className={s.buyButton}
                onClick={(e) => {
                  e.stopPropagation(); // Предотвращаем двойной клик
                  handleBuyCredits();
                }}
              >
                {t('credits_widget.buy', 'Buy')}
              </Button>
            )}
          </div>
        </Flex>
      </div>

      {/* Кнопка Upgrade для пользователей без подписки */}
      {!hasActiveSubscription && (
        <Button size={size === 'small' ? '2' : '3'} variant='surface' color='purple' onClick={handleBuyCredits}>
          {t('credits_widget.upgrade', 'Upgrade')}
        </Button>
      )}
    </Flex>
  );
};

export default CreditsWidget;
