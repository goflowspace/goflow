'use client';

import {memo} from 'react';

import {Avatar, Tooltip} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import useUserStore from '@store/useUserStore';

import s from './collaborationAvatars.module.scss';

const CurrentUserAvatar = memo(() => {
  const {t} = useTranslation();
  const {user} = useUserStore();

  if (!user) {
    return null;
  }

  return (
    <Tooltip content={user.name || t('collaboration.unknown_user', 'Unknown User')}>
      <div className={s.avatar_wrapper} style={{borderColor: '#4F46E5'}}>
        {' '}
        {/* Фиолетовый цвет для текущего пользователя */}
        <Avatar
          size='2'
          src={user.picture}
          fallback={user.name?.[0]?.toUpperCase() || '?'}
          style={{
            backgroundColor: '#4F46E5',
            color: '#fff',
            borderRadius: '50%'
          }}
        />
      </div>
    </Tooltip>
  );
});

CurrentUserAvatar.displayName = 'CurrentUserAvatar';

export default CurrentUserAvatar;
