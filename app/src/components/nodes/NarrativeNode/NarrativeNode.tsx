'use client';

import React, {CSSProperties, memo, useCallback, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {PlayIcon} from '@radix-ui/react-icons';
import {trackPlaybackLaunch} from '@services/analytics';
import {ProjectDataService} from '@services/projectDataService';
import {NodeProps} from '@xyflow/react';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';
import {getCommandManager} from 'src/commands/CommandManager';
import {useShouldShowNodeDialog} from 'src/hooks/useShouldShowNodeDialog';
import {getAggregatedPlayParams} from 'src/utils/analyticsUtils';
import {openHTMLPreview} from 'src/utils/htmlPreview';

import {useGraphStore} from '@store/useGraphStore';
import {useProjectStore} from '@store/useProjectStore';
import {useVariablesStore} from '@store/useVariablesStore';

import ArrowHandle from '@components/nodes/ArrowHandle/ArrowHandle';
import NewObjDialog from '@components/nodes/NewObjDialog/NewObjDialog';

import {useAILoadingContext} from '../../../contexts/AILoadingContext';
import {useAIFillNode} from '../../../hooks/useAIFillNode';
import {getReliableTeamId} from '../../../utils/teamUtils';
import {AIProgressIndicator} from '../shared/AIProgressIndicator';
import {AISkeleton} from '../shared/AISkeleton';
import {EditableText, StaticText} from '../shared/EditableContent';
import {NodeHint} from '../shared/NodeHint';
import {AIFillButton} from './AIFillButton';
import AttachedEntities from './AttachedEntities';
import {OperationsList} from './OperationsList';
import {CARD_STYLES} from './constants';
import {useNarrativeNode} from './useNarrativeNode';

import s from './NarrativeNode.module.scss';

interface NarrativeNodeProps extends NodeProps {
  style?: CSSProperties;
}

/**
 * Компонент нарративного узла
 */
const NarrativeNode = memo(({selected, style, data, id}: NarrativeNodeProps) => {
  const shouldShowDialog = useShouldShowNodeDialog(id);
  const {t} = useTranslation();
  const projectId = useCurrentProject().projectId || ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';
  const {setNodeLoading} = useAILoadingContext();
  const {fillNode} = useAIFillNode({
    onLoadingChange: setNodeLoading
  });

  // Проверяем состояние AI загрузки и скелетон состояние
  const isAILoading = (data as any)?.isAILoading || false;
  const aiProgress = (data as any)?.aiProgress;

  const {
    title,
    text,
    attachedEntities,
    editingFields,
    isSelected,
    isOperationsExpanded,
    titleRef,
    textRef,
    staticTextRef,
    cardRef,
    cardWrapperRef,
    handleTextChange,
    handleTitleChange,
    setAttachedEntities,
    handleNodeSelect,
    activateFieldEditing,
    deactivateAllEditing,
    handleCustomKeyDown,
    handleBlur,
    handleOperationsExpandToggle,
    saveChanges
  } = useNarrativeNode(id, data);

  // Обработчик для запуска воспроизведения с этого узла
  const handlePlayFromNode = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Предотвращаем выделение узла
      const projectName = useProjectStore.getState().projectName;

      // Получаем данные для аналитики
      const {layers} = useGraphStore.getState();
      const {variables} = useVariablesStore.getState();
      // Отправляем событие запуска воспроизведения
      const playParams = getAggregatedPlayParams(layers, variables, 'Node');
      trackPlaybackLaunch(playParams, false, projectId, timelineId);
      const reliableTeamId = getReliableTeamId();
      if (!reliableTeamId) {
        console.error('Team not available for preview');
        return;
      }
      openHTMLPreview(projectName, reliableTeamId, id, projectId);
    },
    [id, projectId, timelineId]
  );

  // Определяем, должны ли мы показывать подсказки
  const showEditHint = selected && !editingFields.text && !editingFields.title;
  const showShiftEnterHint = editingFields.text || editingFields.title;

  // Состояние для drag & drop
  const [isDragOver, setIsDragOver] = useState(false);

  // Обработчики drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Проверяем, что мы действительно покидаем узел, а не переходим к дочернему элементу
    if (!cardWrapperRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));

        if (data.type === 'entity' && data.entity) {
          const entityId = data.entity.id;

          if (!attachedEntities.includes(entityId)) {
            const newEntities = [...attachedEntities, entityId];
            setAttachedEntities(newEntities);

            // Принудительно сохраняем с новыми данными
            const commandManager = getCommandManager();
            commandManager.editNarrativeNode(id, {
              title,
              text,
              attachedEntities: newEntities
            });
          }
        }
      } catch (error) {
        console.error('Error parsing drop data:', error);
      }
    },
    [attachedEntities, setAttachedEntities, id, title, text]
  );

  // Обработчик удаления сущности
  const handleRemoveEntity = useCallback(
    (entityId: string) => {
      const newEntities = attachedEntities.filter((id) => id !== entityId);
      setAttachedEntities(newEntities);

      // Принудительно сохраняем с новыми данными
      const commandManager = getCommandManager();
      commandManager.editNarrativeNode(id, {
        title,
        text,
        attachedEntities: newEntities
      });
    },
    [attachedEntities, setAttachedEntities, id, title, text]
  );

  return (
    <div className={s.wrapper} style={style} data-testid='narrative-node-wrapper'>
      <ArrowHandle direction='left' backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <ArrowHandle direction='right' backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <div
        ref={cardWrapperRef}
        data-id={id}
        className={cls(s.card_wrapper, {
          [s.selected]: selected || isSelected || editingFields.text || editingFields.title,
          [s.drag_over]: isDragOver,
          [s.hovered_while_connecting]: data?.isHoveredWhileConnecting,
          [s.faded]: data?.shouldBeFaded
        })}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div ref={cardRef} className={s.card} onClick={handleNodeSelect}>
          {/* Подсказки */}
          <NodeHint isVisible={showEditHint} text={t('narrative_node.hint_text_edit')} />
          <NodeHint isVisible={showShiftEnterHint} text={t('narrative_node.hint_text_new_line')} />

          <div className={s.header}>
            <div
              className={s.header_content}
              onClick={(e) => {
                if ((selected || isSelected) && !editingFields.title && !isAILoading) {
                  activateFieldEditing('title', e);
                }
              }}
            >
              {isAILoading ? (
                <AISkeleton variant='narrative-title' active={true} />
              ) : editingFields.title ? (
                <EditableText
                  ref={titleRef}
                  value={title}
                  onChange={(newValue) => handleTitleChange(newValue)}
                  onKeyDown={handleCustomKeyDown}
                  onBlur={handleBlur}
                  placeholder={t('narrative_node.add_name')}
                  selected={selected}
                  variant='input'
                />
              ) : (
                <StaticText
                  ref={staticTextRef}
                  value={title}
                  placeholder={t('narrative_node.no_name')}
                  onDoubleClick={(e) => !selected && !isSelected && !isAILoading && activateFieldEditing('title', e)}
                  singleLine={true}
                  isTitle={true}
                />
              )}
            </div>
            {!isAILoading && (
              <button className={s.play_button} onClick={handlePlayFromNode} title={t('narrative_node.play_from_here', 'Play from here')}>
                <PlayIcon className={s.play_icon} />
              </button>
            )}
          </div>
          <div
            className={s.content}
            onClick={(e) => {
              if ((selected || isSelected) && !editingFields.text && !isAILoading) {
                activateFieldEditing('text', e);
              }
            }}
          >
            {isAILoading ? (
              <>
                <AIProgressIndicator
                  stepName={aiProgress?.stepName || 'Generating...'}
                  stepNumber={aiProgress?.stepNumber || 1}
                  totalSteps={aiProgress?.totalSteps || 5}
                  progress={aiProgress?.progress || 0}
                />
                <AISkeleton variant='narrative-text' active={true} />
              </>
            ) : editingFields.text ? (
              <EditableText
                ref={textRef}
                value={text}
                onChange={(newValue) => handleTextChange(newValue)}
                onKeyDown={handleCustomKeyDown}
                onBlur={handleBlur}
                placeholder={t('narrative_node.text_placeholder_active')}
                selected={selected}
              />
            ) : (
              <StaticText
                ref={staticTextRef}
                value={text}
                placeholder={t('narrative_node.text_placeholder')}
                onDoubleClick={(e) => !selected && !isSelected && !isAILoading && activateFieldEditing('text', e)}
                singleLine={false}
              />
            )}
          </div>
        </div>

        {/* Привязанные сущности - вне .card, чтобы избежать overflow: hidden */}
        <AttachedEntities entityIds={attachedEntities} onRemoveEntity={handleRemoveEntity} maxVisibleRows={1} entitiesPerRow={3} isDragOver={isDragOver} isAILoading={isAILoading} />

        {/* Список операций вынесен за пределы карточки */}
        <div className={s.operations_outer_container} onClick={(e) => e.stopPropagation()}>
          <OperationsList nodeId={id} onExpandToggle={handleOperationsExpandToggle} isExpanded={isOperationsExpanded} className={s.operations_outside_card} />
        </div>
      </div>

      {/* Кнопка AI Fill под узлом */}
      {(selected || isSelected) && !isAILoading && (
        <div className={s.ai_fill_container}>
          <AIFillButton nodeId={id} hasText={Boolean(text?.trim())} onFill={fillNode} isLoading={isAILoading} />
        </div>
      )}

      {shouldShowDialog && (
        <NewObjDialog
          nodeId={id}
          onBeforeCreate={() => {
            deactivateAllEditing(false);
          }}
        />
      )}
    </div>
  );
});

export default NarrativeNode;
