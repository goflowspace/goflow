'use client';

import React, {useCallback, useEffect, useState} from 'react';

import {ChatBubbleIcon, ComponentInstanceIcon, CursorArrowIcon, LinkBreak2Icon, PaddingIcon, Pencil2Icon, StackIcon} from '@radix-ui/react-icons';
import {IconButton, Tooltip} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import cls from 'classnames';
import {TFunction} from 'i18next';
import {useTranslation} from 'react-i18next';

import {useCanvasStore} from '@store/useCanvasStore';
import {useEditorSettingsStore} from '@store/useEditorSettingsStore';
import {useGraphStore} from '@store/useGraphStore';
import {useToolStore} from '@store/useToolsStore';

import {useToolDragDrop} from '../../hooks/useToolDragDrop';
import {trackToolSelection} from '../../services/analytics';
import {ToolId} from '../../types/tools';
import {isOSS} from '../../utils/edition';
import {isMacOS} from '../../utils/keyboardModifiers';

import s from './ToolsPanel.module.scss';

interface Tool {
  id: ToolId;
  icon: React.FC<any>;
  label: string;
  hotkey: string;
  disabled?: boolean;
  cloudOnly?: boolean;
}

// Определяем хоткеи для разных режимов
const getToolsWithHotkeys = (hotkeyType: 'num' | 'sym', t: TFunction): Tool[] => {
  const numHotkeys = ['Esc', '1', '2', '3', '4', '5', '6'];
  const symHotkeys = ['Esc', 'N', 'C', 'L', 'J', 'O', 'M'];

  const hotkeys = hotkeyType === 'num' ? numHotkeys : symHotkeys;

  return [
    {id: 'cursor', icon: CursorArrowIcon, label: t('tool.cursor_label', 'Select'), hotkey: hotkeys[0]},
    {id: 'node-tool', icon: PaddingIcon, label: t('tool.node_label', 'Narrative node'), hotkey: hotkeys[1]},
    {id: 'choice', icon: ComponentInstanceIcon, label: t('tool.stack_label', 'Choice node'), hotkey: hotkeys[2]},
    {id: 'layer', icon: StackIcon, label: t('tool.layer_label', 'Layer'), hotkey: hotkeys[3]},
    {id: 'unlink', icon: LinkBreak2Icon, label: t('tool.unlink_label', 'Jumper'), hotkey: hotkeys[4], disabled: true},
    {id: 'note', icon: Pencil2Icon, label: t('tool.note_label', 'Note'), hotkey: hotkeys[5]},
    {id: 'comment', icon: ChatBubbleIcon, label: t('tool.comment_label', 'Comment'), hotkey: hotkeys[6], disabled: isOSS(), cloudOnly: isOSS()}
  ];
};

const ToolsPanel = () => {
  const {t} = useTranslation();
  const {activeTool, setActiveTool} = useToolStore();
  const deselectAllNodes = useCanvasStore((state) => state.deselectAllNodes);
  const [isMac, setIsMac] = useState<boolean>(false);
  const nodes = useCanvasStore((state) => state.nodes);

  // Хук для управления состоянием drag and drop инструментов
  const {setIsDraggingTool, setDraggedTool, resetDragState} = useToolDragDrop();

  // Получаем текущий режим хоткеев из настроек
  const toolsHotkeys = useEditorSettingsStore((state) => state.toolsHotkeys);

  // Динамически получаем массив инструментов в зависимости от выбранного режима хоткеев
  const tools = getToolsWithHotkeys(toolsHotkeys, t);

  const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  // Функция для переключения инструмента и снятия выделения
  const setToolAndDeselect = useCallback(
    (toolId: ToolId, interaction: 'mouse' | 'hotkey' = 'mouse') => {
      // Сначала проверяем, нужно ли снимать выделение
      // Проверяем, есть ли выделенные узлы
      const hasSelectedNodes = nodes.some((node) => node.selected);

      // Меняем инструмент
      setActiveTool(toolId);

      // Трекинг события выбора инструмента - отправляем только один раз
      trackToolSelection(interaction, toolId, projectId, timelineId);

      // Снимаем выделение только если есть выделенные узлы
      if (hasSelectedNodes) {
        deselectAllNodes();
      }
    },
    [setActiveTool, deselectAllNodes, nodes]
  );

  // Обработчики drag and drop для инструментов
  const handleDragStart = useCallback(
    (e: React.DragEvent, toolId: ToolId) => {
      // Не разрешаем перетаскивание инструмента cursor и отключенных инструментов
      if (toolId === 'cursor' || tools.find((t) => t.id === toolId)?.disabled) {
        e.preventDefault();
        return;
      }

      // Устанавливаем состояние drag
      setIsDragging(true);
      setIsDraggingTool(true);
      setDraggedTool(toolId);

      // Устанавливаем данные для передачи
      e.dataTransfer.setData('application/flow-tool', toolId);
      e.dataTransfer.effectAllowed = 'copy';

      // Простое drag image с названием инструмента
      const toolLabel = tools.find((t) => t.id === toolId)?.label || toolId;
      const dragImage = document.createElement('div');
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.left = '-1000px';
      dragImage.style.padding = '8px 12px';
      dragImage.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      dragImage.style.borderRadius = '6px';
      dragImage.style.color = 'white';
      dragImage.style.fontSize = '14px';
      dragImage.style.fontWeight = '500';
      dragImage.textContent = toolLabel;

      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 10, 10);

      // Удаляем временный элемент
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
    },
    [tools, setIsDraggingTool, setDraggedTool]
  );

  // Обработчик окончания drag операции
  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  // Состояние для отслеживания drag vs click
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownTime, setMouseDownTime] = useState<number | null>(null);

  // Обработчики мыши для различения клика и drag
  const handleMouseDown = useCallback((e: React.MouseEvent, toolId: ToolId) => {
    setMouseDownTime(Date.now());
    setIsDragging(false);
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent, toolId: ToolId) => {
      const now = Date.now();
      const timeDiff = mouseDownTime ? now - mouseDownTime : 0;

      // Если это был быстрый клик (менее 200мс) и не было drag, то это обычный клик
      if (!isDragging && timeDiff < 200) {
        const tool = tools.find((t) => t.id === toolId);
        if (tool && !tool.disabled) {
          setToolAndDeselect(toolId, 'mouse');
        }
      }

      setMouseDownTime(null);
      setIsDragging(false);
    },
    [isDragging, mouseDownTime, tools, setToolAndDeselect]
  );

  useEffect(() => {
    // Detect if user is on a Mac
    setIsMac(isMacOS());
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore keypresses when user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore keypresses when Ctrl or Cmd key is pressed
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      // Get the key
      const pressedKey = e.key;

      // Проверяем, есть ли открытые модальные окна (Dialog из Radix UI)
      // Проверяем несколько возможных селекторов для разных версий и типов диалогов
      const hasOpenModals =
        document.querySelector('[data-radix-dialog-content]') !== null || document.querySelector('[role="dialog"]') !== null || document.querySelector('.rt-DialogContent') !== null;

      // Для остальных хоткеев также проверяем модальные окна
      if (hasOpenModals) {
        return; // Блокируем хоткеи инструментов, если открыто модальное окно
      }

      // For Escape key, we need the exact string
      if (pressedKey === 'Escape') {
        const tool = tools.find((t) => t.hotkey === 'Esc');
        if (tool && !tool.disabled) {
          e.preventDefault();
          setToolAndDeselect(tool.id, 'hotkey');
        }
        return;
      }

      // Маппинг русских символов к английским (для режима символьных хоткеев)
      const keyboardLayoutMap: Record<string, string> = {
        // Русская раскладка -> Английская раскладка
        т: 'n',
        Т: 'n',
        с: 'c',
        С: 'c',
        д: 'l',
        Д: 'l',
        о: 'j',
        О: 'j',
        щ: 'o',
        Щ: 'o',
        // Добавляем и оригинальные английские символы
        n: 'n',
        N: 'n',
        c: 'c',
        C: 'c',
        l: 'l',
        L: 'l',
        j: 'j',
        J: 'j',
        o: 'o',
        O: 'o',
        // Цифры (для режима числовых хоткеев)
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5'
      };

      // Нормализуем нажатую клавишу с учетом разных раскладок клавиатуры
      const normalizedKey = keyboardLayoutMap[pressedKey.toLowerCase()] || pressedKey.toLowerCase();

      // Check if the key matches any of our hotkeys (now supports both number and symbol hotkeys)
      const tool = tools.find((t) => t.hotkey.toLowerCase() === normalizedKey);

      if (tool && !tool.disabled) {
        e.preventDefault();
        setToolAndDeselect(tool.id, 'hotkey');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [setToolAndDeselect, setActiveTool, deselectAllNodes, tools, toolsHotkeys]);

  return (
    <div className={s.tools_panel_wrapper}>
      <div className={s.tools_panel_container}>
        {tools.map(({id, icon: Icon, label, hotkey, disabled: toolDisabled, cloudOnly}) => {
          const disabled = toolDisabled || (cloudOnly && isOSS());
          return (
            <Tooltip
              key={id}
              content={
                <span style={{maxWidth: '220px', display: 'inline-block'}}>
                  <span style={{fontWeight: 'bold', marginBottom: '4px', display: 'block'}}>{label}</span>
                  <span style={{fontSize: '0.9em', display: 'block'}}>{t(`tool.${id}_description`, '')}</span>
                  <span style={{marginTop: '8px', fontSize: '0.8em', opacity: 0.8, display: 'block'}}>
                    {t('tool_hotkey', 'Hotkey')}: <kbd>{hotkey}</kbd>
                  </span>
                  {cloudOnly && isOSS() && <span style={{marginTop: '4px', fontSize: '0.9em', color: 'var(--gray-8)', display: 'block'}}>{t('tool_cloud_only', 'Available in Cloud version')}</span>}
                  {toolDisabled && <span style={{marginTop: '4px', fontSize: '0.9em', color: 'var(--gray-8)', display: 'block'}}>{t('tool_unavailable', 'Temporarily unavailable')}</span>}
                </span>
              }
              side='right'
              delayDuration={300}
            >
              <div
                className={s.tool_button_wrapper}
                draggable={!disabled && id !== 'cursor'}
                onDragStart={(e) => handleDragStart(e, id)}
                onDragEnd={handleDragEnd}
                onMouseDown={(e) => handleMouseDown(e, id)}
                onMouseUp={(e) => handleMouseUp(e, id)}
                style={{cursor: !disabled && id !== 'cursor' ? 'grab' : 'default'}}
              >
                <IconButton
                  className={cls(s.icon_button, {
                    [s.active]: activeTool === id,
                    [s.disabled]: disabled
                  })}
                  size='3'
                  color='gray'
                  variant='ghost'
                  style={{margin: 0, position: 'relative', pointerEvents: 'none'}}
                  disabled={disabled}
                >
                  <Icon className={s.icon} />
                </IconButton>
                <span className={cls(s.hotkey_badge, {[s.disabled_hotkey]: disabled, [s.small_hotkey]: hotkey === 'Esc'})}>{hotkey}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default ToolsPanel;
