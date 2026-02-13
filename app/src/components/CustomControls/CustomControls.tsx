'use client';

import React, {useEffect, useRef, useState} from 'react';

import {ChatBubbleIcon, EnterFullScreenIcon, MinusIcon, PlusIcon, QuestionMarkCircledIcon} from '@radix-ui/react-icons';
import {Button, Dialog, Text, Tooltip} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import {ControlButton, Controls, useStore} from '@xyflow/react';
import DOMPurify from 'dompurify';
import {marked} from 'marked';
import {useTranslation} from 'react-i18next';
import {trackAboutClose, trackAboutOpen} from 'src/services/analytics';

import {useGraphStore} from '@store/useGraphStore';

import {useHasNodes} from '../../hooks/canvas';
import {useViewportControls} from '../../hooks/canvas/useViewportControls';
import {getModifierKey, isMacOS} from '../../utils/keyboardModifiers';
import FeedbackPopover from './FeedbackPopover';

import s from './CustomControls.module.scss';

// Default content in case the file can't be loaded
const defaultHelpContent = `# Go Flow Help

Это редактор потоков, который позволяет создавать и редактировать потоки данных.

## Управление
- **Масштабирование**: Используйте кнопки + и - для увеличения и уменьшения масштаба
- **Подогнать вид**: Нажмите на кнопку с иконкой полноэкранного режима, чтобы увидеть все узлы`;

const ZoomControlsWithPercentage = () => {
  const {t, i18n} = useTranslation();
  const zoom = useStore((s) => s.transform[2]);
  const [showHelp, setShowHelp] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [helpContent, setHelpContent] = useState(defaultHelpContent);
  const [parsedContent, setParsedContent] = useState('');
  const [isMac, setIsMac] = useState(false);
  const hasNodes = useHasNodes();

  // Создаем ref для обертки ReactFlow
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Используем хук с функциями для управления вьюпортом
  const {zoomIn, zoomOut, resetView, resetZoomTo100} = useViewportControls({
    wrapperRef
  });

  // Находим контейнер ReactFlow после монтирования компонента
  useEffect(() => {
    // Важно найти контейнер после полной загрузки компонента
    setTimeout(() => {
      const reactFlowContainer = document.querySelector('.react-flow');
      if (reactFlowContainer instanceof HTMLDivElement) {
        wrapperRef.current = reactFlowContainer;
      }
    }, 100);
  }, []);

  useEffect(() => {
    setIsMac(isMacOS());
  }, []);

  useEffect(() => {
    try {
      // Преобразуем Markdown в HTML с помощью marked и очищаем с помощью DOMPurify
      const renderer = new marked.Renderer();
      const html = marked.parse(helpContent, {renderer});
      if (typeof html === 'string') {
        const cleanHtml = DOMPurify.sanitize(html);
        setParsedContent(cleanHtml);
      }
    } catch (error) {
      console.error('Error parsing markdown:', error);
    }
  }, [helpContent]);

  useEffect(() => {
    // Use the global fetch, but make it type-safe by checking window exists first
    if (typeof window !== 'undefined') {
      // У нас есть только русская и английская версии
      // Для русского языка используем ru-версию, для всех остальных - английскую
      const currentLanguage = i18n.language || 'en';
      const helpFilePath = currentLanguage === 'ru' ? '/help/flow-help-ru.md' : '/help/flow-help.md';

      const fetchHelpContent = async () => {
        try {
          let response = await window.fetch(helpFilePath);

          if (!response.ok) {
            // Если файл не найден, пробуем загрузить английскую версию как запасной вариант
            if (currentLanguage === 'ru') {
              response = await window.fetch('/help/flow-help.md');
              if (!response.ok) {
                throw new Error('Failed to load help content');
              }
            } else {
              throw new Error('Failed to load help content');
            }
          }

          const text = await response.text();
          setHelpContent(text);
        } catch (error) {
          console.error('Error loading help content:', error);
          // We already have default content, so no need to set error content
        }
      };

      fetchHelpContent();
    }
  }, [i18n.language]);

  const zoomCanvasIn = () => {
    zoomIn();
  };

  const zoomCanvasOut = () => {
    zoomOut();
  };

  const fitViewToCanvas = () => {
    resetView();
  };

  const resetZoomCanvas = () => {
    resetZoomTo100();
  };

  // Предотвращение распространения событий клика
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Формируем строки для подсказок с хоткеями
  const modifierKey = getModifierKey();
  const zoomInHotkey = `${modifierKey}+`;
  const zoomOutHotkey = `${modifierKey}-`;
  const resetZoomHotkey = 'Shift+0';
  const fitViewHotkey = 'Shift+1';

  // Обработка открытия и закрытия окна About
  const handleAboutOpen = (isOpen: boolean) => {
    const currentProjectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
    const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';
    if (isOpen) {
      trackAboutOpen(currentProjectId, timelineId);
    } else {
      trackAboutClose(currentProjectId, timelineId);
    }
    setShowHelp(isOpen);
  };

  return (
    <>
      {/* Обертка с дополнительным паддингом вокруг панели */}
      <div className={`${s.controls_safe_area} nodrag`} onClick={handleClick}>
        <Controls showZoom={false} showFitView={false} showInteractive={false} orientation='horizontal' position='bottom-right' className={`${s.zoom_controls} nodrag`}>
          <div onClick={handleClick} className='nodrag' style={{display: 'flex', alignItems: 'center'}}>
            <Tooltip
              content={
                <>
                  {t('controls.zoom_out', 'Уменьшить масштаб')}
                  <kbd className={s.kbd_style}>{zoomOutHotkey}</kbd>
                </>
              }
            >
              <ControlButton
                onClick={(e) => {
                  e.stopPropagation();
                  zoomCanvasOut();
                }}
                className={`${s.control_btn} nodrag`}
                style={{borderBottom: 'none'}}
              >
                <MinusIcon className={s.control_icon} color='black' />
              </ControlButton>
            </Tooltip>

            <Tooltip
              content={
                <>
                  {t('controls.reset_zoom', 'Сбросить масштаб в 100%')}
                  <kbd className={s.kbd_style}>{resetZoomHotkey}</kbd>
                </>
              }
            >
              <div
                className={`${s.zoom_level} nodrag`}
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoomCanvas();
                }}
              >
                <Text size='3' weight='regular'>
                  {Math.round(zoom * 100)}%
                </Text>
              </div>
            </Tooltip>

            <Tooltip
              content={
                <>
                  {t('controls.zoom_in', 'Увеличить масштаб')}
                  <kbd className={s.kbd_style}>{zoomInHotkey}</kbd>
                </>
              }
            >
              <ControlButton
                onClick={(e) => {
                  e.stopPropagation();
                  zoomCanvasIn();
                }}
                className={`${s.control_btn} nodrag`}
                style={{borderBottom: 'none'}}
              >
                <PlusIcon className={s.control_icon} color='black' />
              </ControlButton>
            </Tooltip>

            <Tooltip
              content={
                <>
                  {t('controls.fit_view', 'Вписать все объекты')}
                  <kbd className={s.kbd_style}>{fitViewHotkey}</kbd>
                </>
              }
            >
              <ControlButton
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasNodes) {
                    fitViewToCanvas();
                  }
                }}
                className={`${s.control_btn} ${!hasNodes ? s.disabled : ''} nodrag`}
                style={{
                  borderBottom: 'none',
                  marginLeft: '8px'
                }}
              >
                <EnterFullScreenIcon className={s.control_icon} color='black' />
              </ControlButton>
            </Tooltip>

            <Tooltip content={t('controls.feedback', 'Send Feedback')}>
              <ControlButton
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFeedback(true);
                }}
                className={`${s.control_btn} nodrag`}
                style={{borderBottom: 'none', marginLeft: '8px'}}
              >
                <ChatBubbleIcon className={s.control_icon} color='black' />
              </ControlButton>
            </Tooltip>

            <ControlButton
              onClick={(e) => {
                e.stopPropagation();
                handleAboutOpen(true);
              }}
              className={`${s.control_btn} nodrag`}
              style={{borderBottom: 'none', marginLeft: '8px'}}
            >
              <QuestionMarkCircledIcon className={s.control_icon} color='black' />
            </ControlButton>
          </div>
        </Controls>
      </div>

      <Dialog.Root open={showHelp} onOpenChange={handleAboutOpen}>
        <Dialog.Content style={{maxWidth: 600}}>
          <Dialog.Title>{t('about.title', 'About Go Flow')}</Dialog.Title>
          <div className={s.dialog_content}>
            <div className={s.markdown_container} dangerouslySetInnerHTML={{__html: parsedContent}} />
          </div>
          <Dialog.Close>
            <Button size='2' variant='soft'>
              {t('about.close_button', 'Close')}
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>

      <FeedbackPopover isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
};

export default ZoomControlsWithPercentage;
