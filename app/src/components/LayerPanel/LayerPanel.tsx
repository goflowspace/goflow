'use client';

import React, {useEffect, useRef, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {ArrowUpIcon, HomeIcon, LayersIcon} from '@radix-ui/react-icons';
import {IconButton, Separator, TextField, Tooltip} from '@radix-ui/themes';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';
import {EnterMethodType} from 'src/services/analytics';
import {buildEditorPath} from 'src/utils/navigation';

import {useGraphStore} from '@store/useGraphStore';
import {useLayerStore} from '@store/useLayerStore';

import {getCommandManager} from '../../commands/CommandManager';
import {getModifierKey, isMacOS} from '../../utils/keyboardModifiers';

import s from './LayerPanel.module.scss';

const LayerPanel = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const {projectId} = useCurrentProject();
  const {timelineId} = useCurrentRoute();
  const inputRef = useRef<HTMLInputElement>(null);

  const isLayersPanelOpen = useLayerStore((s) => s.isLayersPanelOpen);
  const toggleLayersPanel = useLayerStore((s) => s.toggleLayersPanel);

  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const currentLayerName = useGraphStore((s) => s.layers[currentGraphId]?.name);
  const parentLayerId = useGraphStore((s) => s.layers[currentGraphId]?.parentLayerId);
  const currentLayerDescription = useGraphStore((s) => s.layers[currentGraphId]?.description || '');

  const [isMac, setIsMac] = useState(false);
  const [layerName, setLayerName] = useState(currentLayerName ?? '');

  // Определяем, находимся ли мы на корневом слое
  const isRootLayer = currentGraphId === 'root' || !parentLayerId;

  useEffect(() => {
    setLayerName(currentLayerName ?? '');
  }, [currentLayerName]);

  // Определяем, работаем ли мы на Mac
  useEffect(() => {
    setIsMac(isMacOS());
  }, []);

  const handleNameBlur = () => {
    if (layerName !== currentLayerName) {
      getCommandManager().editLayer(currentGraphId, layerName, currentLayerDescription);
    }
  };

  const goToRootLayer = () => {
    if (!isRootLayer && projectId) {
      // Устанавливаем метод перехода
      useGraphStore.getState().setLayerEnterMethod(EnterMethodType.LayerBarRoot);
      router.push(buildEditorPath(projectId, timelineId));
    }
  };

  const goToParentLayer = () => {
    if (parentLayerId && projectId) {
      // Устанавливаем метод перехода
      useGraphStore.getState().setLayerEnterMethod(EnterMethodType.LayerBarUp);
      router.push(buildEditorPath(projectId, timelineId, parentLayerId === 'root' ? undefined : parentLayerId));
    }
  };

  return (
    <div className={cls(s.layer_panel_wrapper, {[s.moved_toolbar]: isLayersPanelOpen})}>
      <div className={s.layer_panel_container}>
        <Tooltip
          content={
            <>
              {t('layer_panel.toggle_layers', 'Toggle layers panel')}
              <kbd className={s.kbd_style}>{getModifierKey()}+/</kbd>
            </>
          }
          side='top'
        >
          <IconButton className={cls(s.icon_button, {[s['toggle_layer_btn--active']]: isLayersPanelOpen})} size='3' color='gray' variant='ghost' onClick={toggleLayersPanel}>
            <LayersIcon className={s.icon} />
          </IconButton>
        </Tooltip>

        <Tooltip
          content={
            <>
              {t('layer_panel.go_to_main_layer', 'Go to main layer')}
              {isRootLayer ? (
                <span className={s.info_message}>Already at main layer</span>
              ) : (
                <span className={s.hotkey_container}>
                  <kbd className={s.kbd_style}>
                    {getModifierKey()}+Shift+
                    <ArrowUpIcon width={12} height={12} />
                  </kbd>
                </span>
              )}
            </>
          }
          side='top'
        >
          <IconButton className={cls(s.icon_button)} size='3' color='gray' variant='ghost' onClick={goToRootLayer} disabled={isRootLayer}>
            <HomeIcon className={s.icon} />
          </IconButton>
        </Tooltip>

        <Tooltip
          content={
            <>
              {t('layer_panel.go_to_parent_layer', 'Go to parent layer')}
              {isRootLayer ? (
                <span className={s.info_message}>No parent layer</span>
              ) : (
                <span className={s.hotkey_container}>
                  <kbd className={s.kbd_style}>
                    Shift+
                    <ArrowUpIcon width={12} height={12} />
                  </kbd>
                </span>
              )}
            </>
          }
          side='top'
        >
          <IconButton className={cls(s.icon_button)} size='3' color='gray' variant='ghost' onClick={goToParentLayer} disabled={isRootLayer}>
            <ArrowUpIcon className={s.icon} />
          </IconButton>
        </Tooltip>

        <Separator className={s.separator} orientation='vertical' size='1' />

        <Tooltip content={t('layer_panel.layer_tip', "You're working with layer:")} side='top'>
          <TextField.Root
            ref={inputRef}
            variant='surface'
            size='2'
            placeholder={t('layer_panel.layer_name_placeholder', 'Type layer name')}
            style={{boxShadow: 'none'}}
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                inputRef.current?.blur();
              }
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default LayerPanel;
