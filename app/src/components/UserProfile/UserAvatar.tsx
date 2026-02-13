import React, {useState} from 'react';

import {Avatar} from '@radix-ui/themes';

interface UserAvatarProps {
  user: {
    name?: string;
    email: string;
    picture?: string;
  };
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  className?: string;
}

/**
 * Компонент аватара пользователя с fallback на инициалы
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({user, size = '1', className}) => {
  const [imageError, setImageError] = useState(false);

  // Функция для получения инициалов пользователя
  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      // Если есть имя, берем первые буквы слов
      return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    if (email) {
      // Если нет имени, берем первую букву email
      return email.charAt(0).toUpperCase();
    }

    return 'U';
  };

  // Функция для получения размера в пикселях
  const getSizeInPixels = (size: string): number => {
    const sizeMap: Record<string, number> = {
      '1': 24,
      '2': 32,
      '3': 40,
      '4': 48,
      '5': 56,
      '6': 64,
      '7': 72,
      '8': 80,
      '9': 88
    };
    return sizeMap[size] || 24;
  };

  const initials = getInitials(user.name, user.email);
  const pixelSize = getSizeInPixels(size);

  // Если есть ошибка загрузки изображения или нет URL, показываем инициалы
  const shouldShowImage = user.picture && !imageError;

  return (
    <div style={{display: 'flex', alignItems: 'center'}}>
      {shouldShowImage ? (
        <img
          src={user.picture}
          alt={user.name || user.email}
          style={{
            width: `${pixelSize}px`,
            height: `${pixelSize}px`,
            borderRadius: '50%',
            objectFit: 'cover',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onError={() => {
            setImageError(true);
          }}
          className={className}
        />
      ) : (
        <Avatar
          size={size}
          fallback={initials}
          className={className}
          style={{
            cursor: 'pointer',
            userSelect: 'none'
          }}
        />
      )}
    </div>
  );
};
