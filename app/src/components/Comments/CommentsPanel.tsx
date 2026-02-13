import React, {useCallback, useMemo, useState} from 'react';

import {useComments} from '@hooks/useComments';
import {useCurrentProject} from '@hooks/useCurrentProject';
import cls from 'classnames';

import {Comment, Thread, ThreadWithReadStatus} from '../../types/comments';
import CommentContent from './CommentContent';
import MentionTextarea, {MentionData} from './MentionTextarea';

import styles from './CommentsPanel.module.scss';

interface CommentsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  selectedThreadId?: string;
  onThreadSelect?: (threadId: string | undefined) => void;
  onFocusThread?: (threadId: string) => void;
  filter?: 'all' | 'unresolved' | 'resolved';
  onFilterChange?: (filter: 'all' | 'unresolved' | 'resolved') => void;
}

const CommentItem: React.FC<{
  comment: Comment;
  onEdit?: (commentId: string, content: string, mentions: MentionData[]) => void;
  onDelete?: (commentId: string) => void;
  canEdit?: boolean;
}> = ({comment, onEdit, onDelete, canEdit = false}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editMentions, setEditMentions] = useState<MentionData[]>([]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && onEdit) {
      onEdit(comment.id, editContent.trim(), editMentions);
      setIsEditing(false);
    }
  }, [editContent, editMentions, comment.id, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(comment.content);
    setEditMentions([]);
    setIsEditing(false);
  }, [comment.content]);

  const handleContentChange = useCallback((newContent: string, newMentions: MentionData[]) => {
    setEditContent(newContent);
    setEditMentions(newMentions);
  }, []);

  if (comment.isDeleted) {
    return (
      <div className={cls(styles.comment, styles.deleted)}>
        <div className={styles.commentContent}>
          <em>This comment was deleted</em>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <div className={styles.authorInfo}>
          <span className={styles.authorName}>{comment.author?.name || 'Unknown'}</span>
          <span className={styles.timestamp}>
            {new Date(comment.createdAt).toLocaleString()}
            {comment.editedAt && <span className={styles.edited}> (edited)</span>}
          </span>
        </div>

        {canEdit && !isEditing && (
          <div className={styles.commentActions}>
            <button onClick={() => setIsEditing(true)} className={styles.editButton} title='Edit comment'>
              ✏️
            </button>
            <button onClick={() => onDelete?.(comment.id)} className={styles.deleteButton} title='Delete comment'>
              🗑️
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className={styles.editForm}>
          <MentionTextarea value={editContent} onChange={handleContentChange} className={styles.editTextarea} autoFocus />
          <div className={styles.editActions}>
            <button onClick={handleCancelEdit} className={styles.cancelButton}>
              Cancel
            </button>
            <button onClick={handleSaveEdit} className={styles.saveButton}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <CommentContent content={comment.content} />
      )}
    </div>
  );
};

const ThreadItem: React.FC<{
  thread: ThreadWithReadStatus;
  isSelected: boolean;
  onSelect: () => void;
  onAddComment: (content: string, mentions: MentionData[]) => void;
  onToggleResolved: () => void;
  onEditComment: (commentId: string, content: string, mentions: MentionData[]) => void;
  onDeleteComment: (commentId: string) => void;
  onFocusThread?: (threadId: string) => void;
  canEditComment: (comment: Comment) => boolean;
}> = ({thread, isSelected, onSelect, onAddComment, onToggleResolved, onEditComment, onDeleteComment, onFocusThread, canEditComment}) => {
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newCommentMentions, setNewCommentMentions] = useState<MentionData[]>([]);
  const [showAddComment, setShowAddComment] = useState(false);

  const handleAddComment = useCallback(() => {
    if (newCommentContent.trim()) {
      onAddComment(newCommentContent.trim(), newCommentMentions);
      setNewCommentContent('');
      setNewCommentMentions([]);
      setShowAddComment(false);
    }
  }, [newCommentContent, newCommentMentions, onAddComment]);

  const handleNewCommentChange = useCallback((content: string, mentions: MentionData[]) => {
    setNewCommentContent(content);
    setNewCommentMentions(mentions);
  }, []);

  const contextLabel = useMemo(() => {
    switch (thread.contextType) {
      case 'CANVAS_POSITION':
        return 'Canvas';
      case 'NODE': {
        const nodeData = thread.contextData as any;
        return `Node: ${nodeData.nodeTitle || nodeData.nodeId}`;
      }
      case 'ENTITY': {
        const entityData = thread.contextData as any;
        return `Entity: ${entityData.entityName || entityData.entityId}`;
      }
      default:
        return 'General';
    }
  }, [thread.contextType, thread.contextData]);

  const handleThreadHeaderClick = useCallback(() => {
    onSelect();
    // Если у нас есть функция фокусировки и комментарий привязан к позиции на канвасе или узлу, фокусируемся на нем
    if (onFocusThread && (thread.contextType === 'CANVAS_POSITION' || thread.contextType === 'NODE')) {
      onFocusThread(thread.id);
    }
  }, [onSelect, onFocusThread, thread.id, thread.contextType]);

  return (
    <div
      className={cls(styles.thread, {
        [styles.selected]: isSelected,
        [styles.resolved]: thread.resolved,
        [styles.unread]: thread.hasUnreadComments
      })}
    >
      <div className={styles.threadHeader} onClick={handleThreadHeaderClick}>
        <div className={styles.threadInfo}>
          <span className={styles.contextLabel}>{contextLabel}</span>
          <span className={styles.threadDate}>{new Date(thread.createdAt).toLocaleDateString()}</span>
        </div>

        <div className={styles.threadMeta}>
          <span className={styles.commentsCount}>{thread.comments?.length || 0} comments</span>

          {thread.hasUnreadComments && <span className={styles.unreadBadge}>●</span>}
          {thread.resolved && <span className={styles.resolvedBadge}>✓ Resolved</span>}
        </div>
      </div>

      {isSelected && (
        <div className={styles.threadContent}>
          <div className={styles.comments}>
            {thread.comments?.map((comment) => <CommentItem key={comment.id} comment={comment} onEdit={onEditComment} onDelete={onDeleteComment} canEdit={canEditComment(comment)} />)}
          </div>

          <div className={styles.threadActions}>
            <button
              onClick={onToggleResolved}
              className={cls(styles.resolveButton, {
                [styles.resolved]: thread.resolved
              })}
            >
              {thread.resolved ? 'Reopen' : 'Mark as Resolved'}
            </button>

            <button onClick={() => setShowAddComment(!showAddComment)} className={styles.addCommentButton}>
              {showAddComment ? 'Cancel' : 'Reply'}
            </button>
          </div>

          {showAddComment && (
            <div className={styles.addCommentForm}>
              <MentionTextarea value={newCommentContent} onChange={handleNewCommentChange} placeholder='Write a reply...' className={styles.newCommentTextarea} rows={3} />
              <div className={styles.addCommentActions}>
                <button
                  onClick={() => {
                    setShowAddComment(false);
                    setNewCommentContent('');
                    setNewCommentMentions([]);
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button onClick={handleAddComment} disabled={!newCommentContent.trim()} className={styles.submitButton}>
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CommentsPanel: React.FC<CommentsPanelProps> = ({isVisible, onClose, selectedThreadId, onThreadSelect, onFocusThread, filter: externalFilter, onFilterChange}) => {
  const {projectId} = useCurrentProject();
  const [internalFilter, setInternalFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  // Используем внешний фильтр, если передан, иначе внутренний
  const filter = externalFilter ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;

  // Мемоизируем объект filters чтобы избежать пересоздания при каждом рендере
  const filters = useMemo(
    () => ({
      resolved: filter === 'all' ? undefined : filter === 'resolved'
    }),
    [filter]
  );

  const {threads, loading, error, addComment, updateComment, deleteComment, toggleThreadResolved, canEditComment, markThreadAsRead} = useComments({
    projectId: projectId || '',
    filters
  });

  const handleThreadSelect = useCallback(
    (threadId: string) => {
      const newSelectedId = selectedThreadId === threadId ? undefined : threadId;
      onThreadSelect?.(newSelectedId);

      // Если тред открывается (не был выбран), отмечаем его как прочитанный
      if (selectedThreadId !== threadId && newSelectedId === threadId) {
        markThreadAsRead(threadId);
      }
    },
    [selectedThreadId, onThreadSelect, markThreadAsRead]
  );

  const handleAddComment = useCallback(
    async (threadId: string, content: string, mentions: MentionData[]) => {
      try {
        // Преобразуем mentions в формат API
        const apiMentions = mentions.map((mention) => ({
          type: mention.type,
          targetId: mention.targetId
        }));
        await addComment(threadId, content, apiMentions);
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    },
    [addComment]
  );

  const handleEditComment = useCallback(
    async (commentId: string, content: string, mentions: MentionData[]) => {
      try {
        // Преобразуем mentions в формат API
        const apiMentions = mentions.map((mention) => ({
          type: mention.type,
          targetId: mention.targetId
        }));
        await updateComment(commentId, content, apiMentions);
      } catch (error) {
        console.error('Failed to update comment:', error);
      }
    },
    [updateComment]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (window.confirm('Are you sure you want to delete this comment?')) {
        try {
          await deleteComment(commentId);
        } catch (error) {
          console.error('Failed to delete comment:', error);
        }
      }
    },
    [deleteComment]
  );

  const handleToggleResolved = useCallback(
    async (threadId: string, currentResolved: boolean) => {
      try {
        await toggleThreadResolved(threadId, !currentResolved);
      } catch (error) {
        console.error('Failed to toggle thread status:', error);
      }
    },
    [toggleThreadResolved]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.commentsPanel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Comments</h3>

        <div className={styles.headerActions}>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className={styles.filterSelect}>
            <option value='unresolved'>Unresolved</option>
            <option value='all'>All</option>
            <option value='resolved'>Resolved</option>
          </select>

          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.loading}>Loading comments...</div>}

        {error && <div className={styles.error}>{error}</div>}

        {!loading && threads.length === 0 && <div className={styles.empty}>No comments yet. Click anywhere on the canvas to add the first comment!</div>}

        <div className={styles.threadsList}>
          {threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isSelected={selectedThreadId === thread.id}
              onSelect={() => handleThreadSelect(thread.id)}
              onAddComment={(content, mentions) => handleAddComment(thread.id, content, mentions)}
              onToggleResolved={() => handleToggleResolved(thread.id, thread.resolved)}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onFocusThread={onFocusThread}
              canEditComment={canEditComment}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;
