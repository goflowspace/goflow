'use client';

import React, {CSSProperties, memo, useCallback, useEffect, useRef} from 'react';

import {NodeProps} from '@xyflow/react';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';
import {useShouldShowNodeDialog} from 'src/hooks/useShouldShowNodeDialog';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';

import ArrowHandle from '@components/nodes/ArrowHandle/ArrowHandle';
import NewObjDialog from '@components/nodes/NewObjDialog/NewObjDialog';

import {getHotkeyWithModifier} from '../../../utils/keyboardModifiers';
import {AISkeleton} from '../shared/AISkeleton';
import {EditableText, StaticText} from '../shared/EditableContent';
import {NodeHint} from '../shared/NodeHint';
import {CARD_STYLES, HINTS} from './constants';
import {useChoiceNode} from './useChoiceNode';

import s from './ChoiceNode.module.scss';

interface ChoiceNodeData {
  text: string;
  offsetY?: number;
  height?: number;
  isAILoading?: boolean;
  isHoveredWhileConnecting?: boolean;
  shouldBeFaded?: boolean;
}

interface ChoiceNodeProps extends Omit<NodeProps, 'data'> {
  style?: CSSProperties;
  data: ChoiceNodeData;
}

/**
 * Компонент узла выбора
 */
const ChoiceNode = memo(({selected, style, data, id}: ChoiceNodeProps) => {
  const {t} = useTranslation();
  const shouldShowDialog = useShouldShowNodeDialog(id);

  // Проверяем состояние AI загрузки
  const isAILoading = data?.isAILoading || false;

  const {text, nodeHeight, editingFields, estimatedRows, textRef, textContainerRef, handleTextChange, handleNodeSelect, activateFieldEditing, deactivateAllEditing, handleKeyDown, handleBlur} =
    useChoiceNode(id, data);

  // Добавляем ref для статичного текста
  const staticTextRef = useRef<HTMLDivElement>(null);

  // Определяем, должны ли мы показывать подсказки
  const showEditHint = selected && !editingFields.text;
  const showShiftEnterHint = editingFields.text;

  return (
    <div className={s.wrapper} style={style}>
      <ArrowHandle direction='left' directionMoveNumber={-29} offsetY={data?.offsetY} backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />
      <ArrowHandle direction='right' directionMoveNumber={-29} offsetY={data?.offsetY} backgroundColor={CARD_STYLES.BACKGROUND_COLOR} />

      <div
        className={cls(s.card, {
          [s.selected]: selected,
          nodrag: editingFields.text,
          [s.editing]: editingFields.text,
          [s.hovered_while_connecting]: data?.isHoveredWhileConnecting,
          [s.faded]: data?.shouldBeFaded
        })}
        onClick={() => !isAILoading && handleNodeSelect()}
      >
        {/* Подсказки */}
        <NodeHint isVisible={showEditHint} text={t('narrative_node.hint_text_edit', HINTS.EDIT_HINT)} />
        <NodeHint isVisible={showShiftEnterHint} text={t('narrative_node.hint_text_new_line', HINTS.EDIT_CONTROLS_HINT)} />

        {/* AI кнопка */}
        {selected && (
          <div data-testid='add-choice-hint'>
            <NodeHint
              isVisible={true}
              text={t('choice_object.hint_add_choice_below', {shortcutKey: getHotkeyWithModifier('2')})}
              position={{top: '100%', left: '50%', transform: 'translate(-50%, 8px)'}}
            />
          </div>
        )}

        <div className={s.content} style={{height: `${nodeHeight}px`}} ref={textContainerRef}>
          {isAILoading ? (
            <AISkeleton variant='choice' active={true} />
          ) : editingFields.text ? (
            <EditableText
              ref={textRef}
              value={text}
              onChange={(newValue) => handleTextChange(newValue)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={t('choice_object.text_placeholder', HINTS.DEFAULT_PLACEHOLDER)}
              rows={estimatedRows}
              selected={selected}
              data-testid='editable-text'
            />
          ) : (
            <StaticText
              value={text}
              placeholder={t('choice_object.text_placeholder', HINTS.DEFAULT_PLACEHOLDER)}
              onDoubleClick={(e) => !isAILoading && activateFieldEditing('text', e)}
              ref={staticTextRef}
              data-testid='static-text-content'
            />
          )}
        </div>
      </div>

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

export default ChoiceNode;
