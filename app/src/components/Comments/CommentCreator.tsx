import React, {useCallback, useState} from 'react';

import {useComments} from '@hooks/useComments';
import {useCurrentProject} from '@hooks/useCurrentProject';
import cls from 'classnames';

import {CanvasCommentPosition, CanvasCommentUtils} from '../../types/canvas';
import {ThreadContextData, ThreadContextType} from '../../types/comments';
import MentionTextarea, {MentionData} from './MentionTextarea';

import styles from './CommentCreator.module.scss';

interface CommentCreatorProps {
  position: CanvasCommentPosition;
  contextType: ThreadContextType;
  contextData: ThreadContextData;
  onCancel: () => void;
  onCreate: (threadId: string) => void;
  canvasTransform: {x: number; y: number; zoom: number};
}

export const CommentCreator: React.FC<CommentCreatorProps> = ({position, contextType, contextData, onCancel, onCreate, canvasTransform}) => {
  const {projectId} = useCurrentProject();
  const {createThread} = useComments({projectId: projectId || ''});
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<MentionData[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Преобразуем координаты канваса в экранные
  const screenPosition = CanvasCommentUtils.canvasToScreen(position, canvasTransform);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim() || !projectId) {
        console.error('[CommentCreator] Missing required data:', {content: content.trim(), projectId});
        return;
      }

      console.log('[CommentCreator] Creating comment:', {
        contextType,
        contextData,
        content: content.trim(),
        projectId
      });

      setIsCreating(true);

      try {
        // Преобразуем mentions в формат API
        const apiMentions = mentions.map((mention) => ({
          type: mention.type,
          targetId: mention.targetId
        }));

        const thread = await createThread(contextType, contextData, content.trim(), apiMentions);

        console.log('[CommentCreator] Thread created:', thread);

        if (thread) {
          onCreate(thread.id);
          setContent('');
          setMentions([]);
        }
      } catch (error) {
        console.error('[CommentCreator] Failed to create comment:', error);
        console.error('Ошибка создания комментария:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsCreating(false);
      }
    },
    [content, projectId, createThread, contextType, contextData, onCreate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSubmit(e as any);
      }
    },
    [onCancel, handleSubmit]
  );

  const handleContentChange = useCallback((newContent: string, newMentions: MentionData[]) => {
    setContent(newContent);
    setMentions(newMentions);
  }, []);

  return (
    <div
      className={styles.commentCreator}
      style={{
        position: 'absolute',
        left: screenPosition.x,
        top: screenPosition.y,
        zIndex: 1003
      }}
    >
      <form onSubmit={handleSubmit} className={styles.creatorForm}>
        <div className={styles.contextInfo}>
          {contextType === 'CANVAS_POSITION' && <span className={styles.contextLabel}>Canvas Comment</span>}
          {contextType === 'NODE' && <span className={styles.contextLabel}>Node: {(contextData as any).nodeTitle || (contextData as any).nodeId}</span>}
        </div>

        <MentionTextarea
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder='Write a comment... (Ctrl+Enter to post, Esc to cancel)'
          className={styles.textarea}
          autoFocus
          rows={3}
          disabled={isCreating}
        />

        <div className={styles.actions}>
          <button type='button' onClick={onCancel} className={cls(styles.button, styles.cancelButton)} disabled={isCreating}>
            Cancel
          </button>

          <button type='submit' className={cls(styles.button, styles.submitButton)} disabled={!content.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentCreator;
