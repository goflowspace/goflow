'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';

import {NodeProps} from '@xyflow/react';
import cls from 'classnames';

import {Thread} from '../../../types/comments';
import CommentContent from '../../Comments/CommentContent';
import {UserAvatar} from '../../UserProfile/UserAvatar';

import styles from './CommentNode.module.scss';

interface CommentNodeData {
  thread: Thread;
  isSelected?: boolean;
  isResolved?: boolean;
  onSelect?: (threadId: string) => void;
  onResolve?: (threadId: string) => void;
  onOpen?: (threadId: string) => void;
  onDelete?: (threadId: string) => void;
}

const CommentNode = ({id, data, selected}: NodeProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  const {thread, isResolved, onSelect, onResolve, onOpen} = data as unknown as CommentNodeData;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(thread.id);
    },
    [thread.id, onSelect]
  );

  const handleResolveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onResolve?.(thread.id);
    },
    [thread.id, onResolve]
  );

  const handleOpenClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpen?.(thread.id);
    },
    [thread.id, onOpen]
  );

  // Обработчики для показа/скрытия превью
  const handleMouseEnter = useCallback(() => {
    // Отменяем таймер скрытия если он есть
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setShowPreview(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Даем небольшую задержку, чтобы пользователь мог переместить курсор на бабл
    hideTimeoutRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 150) as unknown as number;
  }, []);

  const handlePreviewMouseEnter = useCallback(() => {
    // Отменяем скрытие когда курсор на бабле
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowPreview(true);
  }, []);

  const handlePreviewMouseLeave = useCallback(() => {
    // Скрываем бабл когда курсор покидает его
    setShowPreview(false);
  }, []);

  // Обработчик клика вне элемента
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (showPreview && commentRef.current && previewRef.current && !commentRef.current.contains(event.target as Node) && !previewRef.current.contains(event.target as Node)) {
        setShowPreview(false);
      }
    },
    [showPreview]
  );

  // Слушатель клика вне элемента
  useEffect(() => {
    if (showPreview) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPreview, handleClickOutside]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const commentsCount = thread.comments?.length || 0;
  const hasUnread = (thread.unreadCount || 0) > 0;
  const isNodeComment = thread.contextType === 'NODE';

  return (
    <div
      ref={commentRef}
      className={cls(styles.commentNode, {
        [styles.selected]: selected,
        [styles.resolved]: isResolved,
        [styles.unread]: hasUnread,
        [styles.nodeComment]: isNodeComment
      })}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Аватар автора комментария */}
      <div className={styles.commentIcon}>
        {thread.creator && (
          <UserAvatar
            user={{
              name: thread.creator.name,
              email: thread.creator.email,
              picture: thread.creator.picture
            }}
            size='2'
            className={styles.avatar}
          />
        )}

        {/* Счетчик комментариев */}
        {commentsCount > 1 && <div className={styles.commentCount}>{commentsCount}</div>}

        {/* Индикатор непрочитанных */}
        {hasUnread && <div className={styles.unreadIndicator} />}
      </div>

      {/* Превью первого комментария */}
      {showPreview && (
        <div ref={previewRef} className={cls(styles.commentPreview, styles.visible)} onMouseEnter={handlePreviewMouseEnter} onMouseLeave={handlePreviewMouseLeave}>
          <div className={styles.previewHeader}>
            <span className={styles.authorName}>{thread.creator?.name || 'Unknown'}</span>
            <span className={styles.timestamp}>{new Date(thread.createdAt).toLocaleDateString()}</span>
          </div>
          <div className={styles.previewContent}>
            <CommentContent content={thread.comments?.[0]?.content || 'No content'} />
          </div>

          {/* Кнопки действий */}
          <div className={styles.commentActions}>
            {!isResolved && (
              <button className={styles.resolveButton} onClick={handleResolveClick} title='Mark as resolved'>
                ✓
              </button>
            )}

            <button className={styles.openButton} onClick={handleOpenClick} title='Open comments'>
              Open
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentNode;
