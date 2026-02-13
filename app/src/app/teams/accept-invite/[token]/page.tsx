'use client';

import React, {useEffect, useState} from 'react';

import {useParams, useRouter} from 'next/navigation';

import {api} from '@services/api';
import {useTranslation} from 'react-i18next';

import AuthGuard from '@components/AuthGuard/AuthGuard';

import s from './page.module.css';

const AcceptInvitePageContent: React.FC = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError(t('dashboard.accept_invite.error.invalid_token'));
      return;
    }

    const acceptInvite = async () => {
      try {
        await api.acceptInvitation(token);
        setStatus('success');

        // Перенаправляем на страницу проектов через 2 секунды
        setTimeout(() => {
          router.push('/projects');
        }, 2000);
      } catch (err: any) {
        console.error('Failed to accept invitation:', err);
        setStatus('error');
        setError(err.message || t('dashboard.accept_invite.error.generic'));
      }
    };

    acceptInvite();
  }, [token, router, t]);

  const renderStatus = () => {
    switch (status) {
      case 'loading':
        return <p>{t('dashboard.accept_invite.loading')}</p>;
      case 'success':
        return (
          <div>
            <h2>{t('dashboard.accept_invite.success.title')}</h2>
            <p>{t('dashboard.accept_invite.success.description')}</p>
          </div>
        );
      case 'error':
        return (
          <div>
            <h2>{t('dashboard.accept_invite.error.title')}</h2>
            <p>{error}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={s.container}>
      <div className={s.card}>{renderStatus()}</div>
    </div>
  );
};

const AcceptInvitePage: React.FC = () => {
  return (
    <AuthGuard>
      <AcceptInvitePageContent />
    </AuthGuard>
  );
};

export default AcceptInvitePage;
