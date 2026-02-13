import React from 'react';

import cls from 'classnames';

import styles from './CommentContent.module.scss';

interface CommentContentProps {
  content: string;
  className?: string;
}

export const CommentContent: React.FC<CommentContentProps> = ({content, className}) => {
  // Функция для парсинга и отображения упоминаний
  const renderContent = (text: string) => {
    // Регулярное выражение для поиска упоминаний в формате @[Name](TYPE:id)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+):([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const [fullMatch, displayName, type, targetId] = match;
      const startIndex = match.index;

      // Добавляем обычный текст перед упоминанием
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }

      // Добавляем упоминание как специальный компонент
      parts.push(
        <span key={`mention-${targetId}-${startIndex}`} className={cls(styles.mention, styles[type.toLowerCase()])} title={`${type === 'USER' ? 'User' : 'Team'}: ${displayName}`}>
          @{displayName}
        </span>
      );

      lastIndex = startIndex + fullMatch.length;
    }

    // Добавляем оставшийся текст после последнего упоминания
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return <div className={cls(styles.commentContent, className)}>{renderContent(content)}</div>;
};

export default CommentContent;
