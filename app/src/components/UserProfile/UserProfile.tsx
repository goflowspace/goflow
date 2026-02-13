'use client';

import {useRouter} from 'next/navigation';

import {Button, DropdownMenu, Text} from '@radix-ui/themes';
import {AuthService} from '@services/authService';
import {useTranslation} from 'react-i18next';

import useUserStore from '@store/useUserStore';

import {UserAvatar} from './UserAvatar';

interface UserProfileProps {
  showLoginButton?: boolean;
  className?: string;
  avatarSize?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  avatarOnly?: boolean;
}

const UserProfile = ({showLoginButton = true, className, avatarSize = '1', avatarOnly = false}: UserProfileProps) => {
  const {t} = useTranslation();
  const router = useRouter();
  const {user, isAuthenticated, logout} = useUserStore();

  const handleLogin = () => {
    AuthService.redirectToGoogleAuth();
  };

  const handleLogout = () => {
    const currentPath = window.location.pathname;
    logout();
    AuthService.logout();

    // Перенаправляем на страницу входа с сохранением текущего пути
    const loginUrl = AuthService.getLoginRedirectUrl(currentPath);
    router.push(loginUrl);
  };

  if (isAuthenticated && user) {
    if (avatarOnly) {
      return (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <div
              className={className}
              style={{
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <UserAvatar user={user} size={avatarSize} />
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={handleLogout}>{t('proj_manager.user_context_menu_logout_button', 'Logout')}</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      );
    }

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button size='2' variant='soft' className={className} style={{gap: '8px'}}>
            <UserAvatar user={user} size={avatarSize} />
            <Text size='2' weight='medium'>
              {user.name || user.email}
            </Text>
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={handleLogout}>{t('proj_manager.user_context_menu_logout_button', 'Logout')}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    );
  }

  if (showLoginButton) {
    return (
      <Button size='2' variant='solid' onClick={handleLogin} className={className}>
        {t('play_bar.auth_button', 'Login')}
      </Button>
    );
  }

  return null;
};

export default UserProfile;
