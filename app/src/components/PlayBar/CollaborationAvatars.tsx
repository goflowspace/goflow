'use client';

import {memo} from 'react';

import {usePresence} from '@hooks/usePresence';
import {Avatar, Tooltip} from '@radix-ui/themes';
import {useTranslation} from 'react-i18next';

import s from './collaborationAvatars.module.scss';

interface CollaborationAvatarsProps {
  maxVisible?: number;
}

const CollaborationAvatars = memo<CollaborationAvatarsProps>(({maxVisible = 5}) => {
  const {t} = useTranslation();
  const {otherCursors} = usePresence();

  if (otherCursors.length === 0) {
    return null;
  }

  const visibleUsers = otherCursors.slice(0, maxVisible);
  const remainingCount = Math.max(0, otherCursors.length - maxVisible);

  return (
    <div className={s.collaboration_avatars}>
      {visibleUsers.map((presence) => (
        <Tooltip key={presence.userId} content={presence.userName || t('collaboration.unknown_user', 'Unknown User')}>
          <div className={s.avatar_wrapper} style={{borderColor: presence.userColor}}>
            <Avatar
              size='2'
              src={presence.userPicture}
              fallback={presence.userName?.[0]?.toUpperCase() || '?'}
              style={{
                backgroundColor: presence.userColor,
                color: '#fff',
                borderRadius: '50%'
              }}
            />
          </div>
        </Tooltip>
      ))}

      {remainingCount > 0 && (
        <Tooltip content={t('collaboration.more_users', '+{{count}} more users', {count: remainingCount})}>
          <div className={s.avatar_wrapper}>
            <Avatar
              size='2'
              fallback={`+${remainingCount}`}
              style={{
                backgroundColor: 'var(--gray-9)',
                color: '#fff',
                fontSize: '11px',
                borderRadius: '50%'
              }}
            />
          </div>
        </Tooltip>
      )}
    </div>
  );
});

CollaborationAvatars.displayName = 'CollaborationAvatars';

export default CollaborationAvatars;
