'use client';

import React, {CSSProperties, memo, useCallback, useEffect, useRef, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {DoubleArrowDownIcon, DoubleArrowUpIcon} from '@radix-ui/react-icons';
import {Button, Text, TextField, Tooltip} from '@radix-ui/themes';
import {LayerNode as LayerNodeType} from '@types-folder/nodes';
import {NodeProps, useUpdateNodeInternals} from '@xyflow/react';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';
import {useNodeSelection} from 'src/hooks/useNodeSelection';
import {useTextFieldGestures} from 'src/hooks/useTextFieldGestures';
import {EnterMethodType} from 'src/services/analytics';
import {buildEditorPath} from 'src/utils/navigation';

import {useGraphStore} from '@store/useGraphStore';
import {useSearchStore} from '@store/useSearchStore';

import {getCommandManager} from '../../../commands/CommandManager';
import EndingsList from './EndingsList';

import s from './LayerNode.module.scss';

interface LayerNodeProps extends NodeProps {
  style?: CSSProperties;
}

const LayerNode = memo(({selected, style, id, data}: LayerNodeProps) => {
  const {t} = useTranslation();
  const router = useRouter();
  const {projectId} = useCurrentProject();
  const {timelineId} = useCurrentRoute();
  const updateNodeInternals = useUpdateNodeInternals();

  // Получаем данные из сторов
  const layers = useGraphStore((s) => s.layers);
  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const setLayerPanelState = useGraphStore((s) => s.setLayerPanelState);
  const getLayerPanelState = useGraphStore((s) => s.getLayerPanelState);

  // Получаем флаг навигации из результатов поиска
  const isNavigatingFromSearch = useSearchStore((s) => s.isNavigatingFromSearch);

  // Получаем текущий слой
  const layerGraph = layers[id];
  // Приводим текущий слой к нужному типу
  const currLayerNode = (layers[currentGraphId]?.nodes[id] || layerGraph) as LayerNodeType;

  // Получаем сохраненное состояние панелей или значения по умолчанию
  const initialPanelState = getLayerPanelState(id);

  // Выбираем начальные значения из данных узла
  const [name, setName] = useState(layerGraph?.name || '');
  // Для description используем значение из слоя или пустую строку, если свойство отсутствует
  const [desc, setDesc] = useState(layerGraph?.description || '');

  // Создаем refs для текстовых полей
  const inputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  // Используем обработчики жестов
  useTextFieldGestures(inputRef);
  useTextFieldGestures(descRef);

  // Состояние для открытых попапов с использованием сохраненных значений
  const [isBeginingsPopupOpen, setIsBeginingsPopupOpen] = useState(initialPanelState.startPanelOpen);
  const [isEndingsPopupOpen, setIsEndingsPopupOpen] = useState(initialPanelState.endPanelOpen);

  // Сохраняем состояние в стор при изменении
  useEffect(() => {
    setLayerPanelState(id, 'start', isBeginingsPopupOpen);
  }, [id, isBeginingsPopupOpen, setLayerPanelState]);

  useEffect(() => {
    setLayerPanelState(id, 'end', isEndingsPopupOpen);
  }, [id, isEndingsPopupOpen, setLayerPanelState]);

  // Обновляем состояние компонента при изменении данных слоя
  useEffect(() => {
    if (layerGraph) {
      setName(layerGraph.name || '');
      setDesc(layerGraph.description || '');
    }
  }, [layerGraph?.name, layerGraph?.description]);

  // Функция сохранения изменений
  const saveChanges = useCallback(() => {
    // Используем CommandManager вместо прямых вызовов
    getCommandManager().editLayer(id, name, desc);

    // Обновляем node internals для корректного отображения
    updateNodeInternals(id);
  }, [id, name, desc, updateNodeInternals]);

  // Используем новый хук для управления выделением
  const fieldsRefs = {
    name: inputRef,
    desc: descRef
  };

  const {editingFields, handleNodeSelect, activateFieldEditing, handleKeyDown} = useNodeSelection(id, fieldsRefs, saveChanges, undefined, false);

  // Переход в слой с проверкой флага навигации из поиска
  const handleLayerEnter = () => {
    // Если навигация из результатов поиска, не переходим в слой
    if (isNavigatingFromSearch) {
      // Сбрасываем флаг после использования
      useSearchStore.getState().setIsNavigatingFromSearch(false);
      return;
    }

    // Устанавливаем метод перехода
    useGraphStore.getState().setLayerEnterMethod(EnterMethodType.ObjectButton);

    // Используем новую структуру роутинга
    if (projectId) {
      router.push(buildEditorPath(projectId, timelineId, id));
    }
  };

  // Обработчики переключения панелей
  const toggleStartPanel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBeginingsPopupOpen((prev) => !prev);
  }, []);

  const toggleEndPanel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEndingsPopupOpen((prev) => !prev);
  }, []);

  return (
    <div className={s.wrapper} style={style}>
      <div className={cls(s.card, {[s.selected]: selected, [s.faded]: data?.shouldBeFaded})} onClick={handleNodeSelect}>
        <div>
          <EndingsList currLayerNode={currLayerNode} nodeId={id} isListOpen={isBeginingsPopupOpen} type='start' />
          <Tooltip content={t('layer_object.starts_hint', 'Start nodes are entry points to this layer from other layers')} delayDuration={1000}>
            <div onClick={toggleStartPanel} className={cls(s.popup_toggle, s.popup_toggle__start, {[s.popup_toggle__start__active]: isBeginingsPopupOpen})}>
              <DoubleArrowUpIcon />
              <Text className={s.popup_toggle_text} size='1'>
                {isBeginingsPopupOpen ? t('layer_object.starts_button_hide', 'Hide start nodes') : t('layer_object.starts_button_show', 'Show start nodes')}
              </Text>
            </div>
          </Tooltip>
        </div>
        <div className={s.node_content}>
          {editingFields.name ? (
            <TextField.Root
              className={cls(s.layer_name, {
                nodrag: selected
              })}
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('layer_object.name_placeholder', 'Add layer name')}
              size='2'
              style={{boxShadow: 'none', fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}
            />
          ) : (
            <div className={s.layer_name_static} onClick={(e) => activateFieldEditing('name', e)} style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5', fontWeight: 800}}>
              {name || t('layer_object.name_placeholder', 'Add layer name')}
            </div>
          )}

          {editingFields.desc ? (
            <TextField.Root
              className={cls(s.layer_desc, {
                nodrag: selected
              })}
              ref={descRef}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('layer_object.desc_placeholder', 'Add layer description')}
              size='1'
              style={{boxShadow: 'none', fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}
            />
          ) : (
            <div className={s.layer_desc_static} onClick={(e) => activateFieldEditing('desc', e)} style={{fontFamily: 'Inter, sans-serif', lineHeight: '1.5'}}>
              {desc || t('layer_object.desc_placeholder', 'Add layer description')}
            </div>
          )}

          <div className={s.actions}>
            <Button variant='outline' size='1' onClick={handleLayerEnter} className='nodrag'>
              {t('layer_object.open_button', 'Open layer')}
            </Button>
          </div>
        </div>
        <div>
          <Tooltip content={t('layer_object.ends_hint', 'End nodes are exit points from this layer to other layers')} delayDuration={1000}>
            <div onClick={toggleEndPanel} className={cls(s.popup_toggle, s.popup_toggle__end, {[s.popup_toggle__end__active]: isEndingsPopupOpen})}>
              <DoubleArrowDownIcon />
              <Text className={s.popup_toggle_text} size='1'>
                {isEndingsPopupOpen ? t('layer_object.ends_button_hide', 'Hide end nodes') : t('layer_object.ends_button_show', 'Show end nodes')}
              </Text>
            </div>
          </Tooltip>
          <EndingsList currLayerNode={currLayerNode} nodeId={id} isListOpen={isEndingsPopupOpen} type='end' />
        </div>
      </div>
    </div>
  );
});

export default LayerNode;
