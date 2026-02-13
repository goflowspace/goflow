'use client';

import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {DotsHorizontalIcon, PlusCircledIcon} from '@radix-ui/react-icons';
import {Button, ContextMenu, Dialog, Flex, IconButton, Text, TextField} from '@radix-ui/themes';
import {Timeline} from '@types-folder/timelines';
import {useTranslation} from 'react-i18next';

import {useTimelinesStore} from '@store/useTimelinesStore';

import {buildEditorPath} from '../../utils/navigation';

import s from './TimelinesSection.module.scss';

interface TimelineDialogState {
  isOpen: boolean;
  mode: 'create' | 'rename' | 'duplicate';
  timelineId?: string;
  defaultName?: string;
}

interface TimelinesSectionProps {
  onCreateClick?: () => void;
}

export interface TimelinesSectionRef {
  createTimeline: () => void;
}

const TimelinesSection = forwardRef<TimelinesSectionRef, TimelinesSectionProps>(({onCreateClick}, ref) => {
  const {t} = useTranslation();
  const router = useRouter();
  const {projectId} = useCurrentProject();
  const {timelineId: currentTimelineId} = useCurrentRoute();

  const {timelines, loading, error, loadProjectTimelines, createTimeline, deleteTimeline, duplicateTimeline, renameTimeline, switchTimeline, canDeleteTimeline, syncWithGraphStore, clearError} =
    useTimelinesStore();

  const [dialogState, setDialogState] = useState<TimelineDialogState>({
    isOpen: false,
    mode: 'create'
  });
  const [dialogInputValue, setDialogInputValue] = useState('');

  // Загружаем таймлайны при загрузке компонента
  useEffect(() => {
    if (projectId) {
      loadProjectTimelines(projectId);
    }
  }, [projectId]); // Убираем loadProjectTimelines из зависимостей

  // Автоматически очищаем ошибки через некоторое время
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]); // Убираем clearError из зависимостей

  const handleTimelineClick = useCallback(
    (timeline: Timeline) => {
      if (projectId && timeline.id !== currentTimelineId) {
        // Переключаем таймлайн в сторе
        switchTimeline(timeline.id);
        // Синхронизируем с GraphStore
        syncWithGraphStore();
        // Обновляем URL
        router.push(buildEditorPath(projectId, timeline.id));
      }
    },
    [projectId, currentTimelineId, router, switchTimeline, syncWithGraphStore]
  );

  const handleCreateClick = useCallback(() => {
    setDialogState({
      isOpen: true,
      mode: 'create'
    });
    setDialogInputValue('');
    onCreateClick?.(); // Вызываем переданный обработчик если он есть
  }, [onCreateClick]);

  // Предоставляем методы через ref
  useImperativeHandle(
    ref,
    () => ({
      createTimeline: handleCreateClick
    }),
    [handleCreateClick]
  );

  const handleRenameClick = useCallback((timeline: Timeline) => {
    setDialogState({
      isOpen: true,
      mode: 'rename',
      timelineId: timeline.id,
      defaultName: timeline.name
    });
    setDialogInputValue(timeline.name);
  }, []);

  const handleDuplicateClick = useCallback((timeline: Timeline) => {
    setDialogState({
      isOpen: true,
      mode: 'duplicate',
      timelineId: timeline.id,
      defaultName: `${timeline.name} Copy`
    });
    setDialogInputValue(`${timeline.name} Copy`);
  }, []);

  const handleDeleteClick = useCallback(
    async (timeline: Timeline) => {
      if (canDeleteTimeline(timeline.id)) {
        try {
          const success = await deleteTimeline(projectId!, timeline.id);
          if (success && timeline.id === currentTimelineId && projectId) {
            // Если удалили активный таймлайн, перенаправляем на оставшийся
            const remainingTimeline = timelines.find((t) => t.id !== timeline.id);
            if (remainingTimeline) {
              router.push(buildEditorPath(projectId, remainingTimeline.id));
            }
          }
        } catch (error) {
          console.error('Failed to delete timeline:', error);
          // Ошибка уже обработана в сторе
        }
      }
    },
    [canDeleteTimeline, deleteTimeline, currentTimelineId, projectId, timelines, router]
  );

  const handleDialogSubmit = useCallback(async () => {
    const trimmedName = dialogInputValue.trim();
    if (!trimmedName || !projectId) return;

    try {
      let newTimelineId: string | undefined;

      switch (dialogState.mode) {
        case 'create':
          newTimelineId = await createTimeline(projectId, trimmedName);
          break;
        case 'rename':
          if (dialogState.timelineId) {
            await renameTimeline(projectId, dialogState.timelineId, trimmedName);
          }
          break;
        case 'duplicate':
          if (dialogState.timelineId) {
            newTimelineId = await duplicateTimeline(dialogState.timelineId, trimmedName);
          }
          break;
      }

      setDialogState({isOpen: false, mode: 'create'});
      setDialogInputValue('');

      // Переключаемся на новый таймлайн при создании или дублировании
      if (newTimelineId && (dialogState.mode === 'create' || dialogState.mode === 'duplicate')) {
        // Переключаемся на новый таймлайн (данные уже добавлены в стор)
        switchTimeline(newTimelineId);
        syncWithGraphStore();
        router.push(buildEditorPath(projectId, newTimelineId));
      }
    } catch (error) {
      console.error('Dialog submit error:', error);
      // Ошибка уже обработана в сторе, просто не закрываем диалог
    }
  }, [dialogInputValue, dialogState, projectId, createTimeline, renameTimeline, duplicateTimeline, switchTimeline, syncWithGraphStore, router, loadProjectTimelines]);

  const handleDialogClose = useCallback(() => {
    setDialogState({isOpen: false, mode: 'create'});
    setDialogInputValue('');
  }, []);

  const getDialogTitle = () => {
    switch (dialogState.mode) {
      case 'create':
        return t('timelines.dialog.create_title', 'Create Timeline');
      case 'rename':
        return t('timelines.dialog.rename_title', 'Rename Timeline');
      case 'duplicate':
        return t('timelines.dialog.duplicate_title', 'Duplicate Timeline');
      default:
        return '';
    }
  };

  const getDialogSubmitText = () => {
    switch (dialogState.mode) {
      case 'create':
        return t('timelines.dialog.create_button', 'Create');
      case 'rename':
        return t('timelines.dialog.rename_button', 'Rename');
      case 'duplicate':
        return t('timelines.dialog.duplicate_button', 'Duplicate');
      default:
        return '';
    }
  };

  // Показываем loading состояние
  if (loading && timelines.length === 0) {
    return (
      <div className={s.empty_timelines}>
        <Text size='1' color='gray'>
          {t('timelines.loading', 'Loading timelines...')}
        </Text>
      </div>
    );
  }

  // Показываем пустое состояние
  if (timelines.length === 0) {
    return (
      <div className={s.empty_timelines}>
        {error && (
          <Text size='1' color='red' style={{marginBottom: '8px'}}>
            {error}
          </Text>
        )}
        <Text size='1' color='gray'>
          {t('timelines.empty_message', 'No timelines yet')}
        </Text>
        <Button size='1' variant='ghost' onClick={handleCreateClick} disabled={loading}>
          <PlusCircledIcon />
          {t('timelines.create_first', 'Create Timeline')}
        </Button>
      </div>
    );
  }

  return (
    <div className={s.timelines_section}>
      {error && (
        <div style={{padding: '8px', marginBottom: '8px'}}>
          <Text size='1' color='red'>
            {error}
          </Text>
        </div>
      )}
      <div className={s.timelines_list}>
        {timelines.map((timeline) => (
          <ContextMenu.Root key={timeline.id}>
            <ContextMenu.Trigger>
              <div className={`${s.timeline_item} ${timeline.id === currentTimelineId ? s.active : ''}`} onClick={() => handleTimelineClick(timeline)}>
                <Text size='2' weight={timeline.id === currentTimelineId ? 'medium' : 'regular'}>
                  {timeline.name}
                </Text>
                <IconButton
                  size='1'
                  variant='ghost'
                  color='gray'
                  className={s.timeline_menu_button}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Программно вызываем контекстное меню
                    const contextMenuEvent = new MouseEvent('contextmenu', {
                      bubbles: true,
                      cancelable: true,
                      clientX: e.clientX,
                      clientY: e.clientY
                    });
                    e.currentTarget.parentElement?.dispatchEvent(contextMenuEvent);
                  }}
                >
                  <DotsHorizontalIcon />
                </IconButton>
              </div>
            </ContextMenu.Trigger>
            <ContextMenu.Content>
              <ContextMenu.Item onClick={() => handleRenameClick(timeline)}>{t('timelines.context_menu.rename', 'Rename')}</ContextMenu.Item>
              <ContextMenu.Item onClick={() => handleDuplicateClick(timeline)}>{t('timelines.context_menu.duplicate', 'Duplicate')}</ContextMenu.Item>
              <ContextMenu.Separator />
              <ContextMenu.Item color='red' disabled={!canDeleteTimeline(timeline.id)} onClick={() => handleDeleteClick(timeline)}>
                {t('timelines.context_menu.delete', 'Delete')}
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Root>
        ))}
      </div>

      {/* Диалог для создания/переименования/дублирования таймлайна */}
      <Dialog.Root open={dialogState.isOpen} onOpenChange={handleDialogClose}>
        <Dialog.Content style={{maxWidth: 450}}>
          <Dialog.Title>{getDialogTitle()}</Dialog.Title>
          <Flex direction='column' gap='3'>
            <TextField.Root
              value={dialogInputValue}
              onChange={(e) => setDialogInputValue(e.target.value)}
              placeholder={t('timelines.dialog.name_placeholder', 'Timeline name')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && dialogInputValue.trim()) {
                  handleDialogSubmit();
                }
              }}
              autoFocus
            />
          </Flex>

          <Flex gap='3' mt='4' justify='end'>
            <Dialog.Close>
              <Button variant='soft' color='gray'>
                {t('common.cancel', 'Cancel')}
              </Button>
            </Dialog.Close>
            <Button onClick={handleDialogSubmit} disabled={!dialogInputValue.trim() || loading}>
              {loading ? t('common.loading', 'Loading...') : getDialogSubmitText()}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
});

export default TimelinesSection;
