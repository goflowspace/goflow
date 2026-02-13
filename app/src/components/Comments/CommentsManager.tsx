import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {useComments} from '@hooks/useComments';
import {useCurrentProject} from '@hooks/useCurrentProject';
import {Node} from '@xyflow/react';

import {useCanvasStore} from '@store/useCanvasStore';
import {useToolStore} from '@store/useToolsStore';

import {CanvasCommentPosition, CanvasCommentUtils} from '../../types/canvas';
import {Thread, ThreadContextData, ThreadContextType} from '../../types/comments';
import CommentCreator from './CommentCreator';
import CommentsPanel from './CommentsPanel';

interface CommentsManagerProps {
  canvasTransform: {x: number; y: number; zoom: number};
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onFocusThread?: (threadId: string) => void;
  onHideGhost?: () => void;
  commentCreation: {
    creatingComment: {
      position: CanvasCommentPosition;
      contextType: ThreadContextType;
      contextData: ThreadContextData;
    } | null;
    isCreatingComment: boolean;
    startCreatingComment: (state: {position: CanvasCommentPosition; contextType: ThreadContextType; contextData: ThreadContextData}) => void;
    stopCreatingComment: () => void;
  };
}

export const CommentsManager: React.FC<CommentsManagerProps> = ({canvasTransform, wrapperRef, onFocusThread, onHideGhost, commentCreation}) => {
  const {projectId} = useCurrentProject();
  const {activeTool, setTool} = useToolStore();
  const {nodes, setNodes} = useCanvasStore();

  // Состояния для управления комментариями
  const [showPanel, setShowPanel] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();

  // Состояние фильтра для видимости комментариев на канвасе
  const [commentsFilter, setCommentsFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  // Мемоизируем объект filters чтобы избежать пересоздания при каждом рендере
  const filters = useMemo(
    () => ({
      resolved: commentsFilter === 'all' ? undefined : commentsFilter === 'resolved'
    }),
    [commentsFilter]
  );

  // Загрузка комментариев
  const {threads, loading, error, toggleThreadResolved, refresh} = useComments({
    projectId: projectId || '',
    filters, // Показываем только неразрешенные
    autoRefresh: false // Отключаем автообновление чтобы избежать спама запросов
  });

  // Обработка клика по канвасу в режиме комментариев
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== 'comment' || !wrapperRef.current || commentCreation.isCreatingComment) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = wrapperRef.current.getBoundingClientRect();
      // Правильно вычисляем позицию относительно канваса
      const canvasPosition = CanvasCommentUtils.screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, canvasTransform);

      // Проверяем, не кликнули ли мы по узлу
      const clickedNode = nodes.find((node) => {
        const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
        if (!nodeElement) return false;

        const nodeRect = nodeElement.getBoundingClientRect();
        return e.clientX >= nodeRect.left && e.clientX <= nodeRect.right && e.clientY >= nodeRect.top && e.clientY <= nodeRect.bottom;
      });

      // Скрываем призрак при начале создания комментария
      onHideGhost?.();

      if (clickedNode) {
        // Комментарий к узлу
        commentCreation.startCreatingComment({
          position: canvasPosition,
          contextType: 'NODE',
          contextData: CanvasCommentUtils.createNodeContext(clickedNode.id, clickedNode.type, (clickedNode.data?.title || clickedNode.data?.text) as string)
        });
      } else {
        // Комментарий к позиции на канвасе
        commentCreation.startCreatingComment({
          position: canvasPosition,
          contextType: 'CANVAS_POSITION',
          contextData: CanvasCommentUtils.createCanvasContext(canvasPosition)
        });
      }
    },
    [activeTool, wrapperRef, canvasTransform, nodes, commentCreation.isCreatingComment, commentCreation.startCreatingComment, onHideGhost]
  );

  // Отмена создания комментария
  const handleCancelComment = useCallback(() => {
    commentCreation.stopCreatingComment();
    setTool('cursor');
  }, [commentCreation.stopCreatingComment, setTool]);

  // Создание комментария завершено
  const handleCommentCreated = useCallback(
    (threadId: string) => {
      commentCreation.stopCreatingComment();
      setTool('cursor');
      setSelectedThreadId(threadId);
      setShowPanel(true);
      refresh(); // Обновляем список комментариев
    },
    [commentCreation.stopCreatingComment, setTool, refresh]
  );

  // Выбор треда
  const handleThreadSelect = useCallback(
    (threadId: string) => {
      setSelectedThreadId(selectedThreadId === threadId ? undefined : threadId);
    },
    [selectedThreadId]
  );

  // Разрешение треда
  const handleCommentResolve = useCallback(
    async (threadId: string) => {
      try {
        await toggleThreadResolved(threadId, true);
        setSelectedThreadId(undefined);
      } catch (error) {
        console.error('Failed to resolve thread:', error);
      }
    },
    [toggleThreadResolved]
  );

  // Открытие панели комментариев для конкретного треда
  const handleCommentOpen = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setShowPanel(true);
  }, []);

  // Создаем узлы комментариев для ReactFlow
  const commentNodes = useMemo(() => {
    return threads
      .filter((thread) => thread.contextType === 'CANVAS_POSITION' || thread.contextType === 'NODE')
      .map((thread): Node => {
        let position: {x: number; y: number};

        if (thread.contextType === 'CANVAS_POSITION') {
          const contextData = thread.contextData as any;
          position = {
            x: contextData.x,
            y: contextData.y
          };
        } else if (thread.contextType === 'NODE') {
          // Для комментариев к узлам находим позицию узла
          const contextData = thread.contextData as any;
          const node = nodes.find((n) => n.id === (contextData as any).nodeId);
          if (node && node.position) {
            position = {
              x: node.position.x + 100, // Смещаем комментарий относительно узла
              y: node.position.y - 50
            };
          } else {
            // Если узел не найден, используем дефолтную позицию
            position = {x: 0, y: 0};
          }
        } else {
          position = {x: 0, y: 0};
        }

        return {
          id: `comment-${thread.id}`,
          type: 'comment',
          position,
          data: {
            thread,
            isSelected: selectedThreadId === thread.id,
            isResolved: thread.resolved,
            onSelect: handleThreadSelect,
            onResolve: handleCommentResolve,
            onOpen: handleCommentOpen,
            onDelete: () => {} // TODO: implement delete
          },
          selectable: false,
          draggable: true,
          deletable: false
        };
      });
  }, [threads, nodes, selectedThreadId, handleThreadSelect, handleCommentResolve, handleCommentOpen]);

  // Обновляем узлы канваса при изменении комментариев
  useEffect(() => {
    const currentNodes = nodes.filter((node) => !node.id.startsWith('comment-'));
    const updatedNodes = [...currentNodes, ...commentNodes];

    // Обновляем узлы только если они действительно изменились
    const existingCommentIds = nodes
      .filter((node) => node.id.startsWith('comment-'))
      .map((node) => node.id)
      .sort();
    const newCommentIds = commentNodes.map((node) => node.id).sort();

    if (
      JSON.stringify(existingCommentIds) !== JSON.stringify(newCommentIds) ||
      commentNodes.some((node) => {
        const existing = nodes.find((n) => n.id === node.id);
        return !existing || JSON.stringify(existing.data) !== JSON.stringify(node.data);
      })
    ) {
      setNodes(updatedNodes);
    }
  }, [commentNodes, nodes, setNodes]);

  // Слушатель кликов по канвасу (только в режиме комментариев)
  useEffect(() => {
    if (activeTool === 'comment' && wrapperRef.current) {
      const canvas = wrapperRef.current;
      canvas.addEventListener('click', handleCanvasClick as any, true);

      return () => {
        canvas.removeEventListener('click', handleCanvasClick as any, true);
      };
    }
  }, [activeTool, handleCanvasClick]);

  return (
    <>
      {/* Создание нового комментария */}
      {commentCreation.creatingComment && (
        <CommentCreator
          position={commentCreation.creatingComment.position}
          contextType={commentCreation.creatingComment.contextType}
          contextData={commentCreation.creatingComment.contextData}
          canvasTransform={canvasTransform}
          onCancel={handleCancelComment}
          onCreate={handleCommentCreated}
        />
      )}

      {/* Панель комментариев */}
      {showPanel && (
        <CommentsPanel
          isVisible={showPanel}
          onClose={() => setShowPanel(false)}
          selectedThreadId={selectedThreadId}
          onThreadSelect={setSelectedThreadId}
          onFocusThread={onFocusThread}
          filter={commentsFilter}
          onFilterChange={setCommentsFilter}
        />
      )}
    </>
  );
};

export default CommentsManager;
