'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

import {ResetIcon} from '@radix-ui/react-icons';
import {IconButton, Tooltip} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';

import {getCommandManager} from '../../commands/CommandManager';
import {trackRedoUsed, trackUndoUsed} from '../../services/analytics';
import {isMacOS} from '../../utils/keyboardModifiers';

import s from './UndoRedoPanel.module.scss';

// Функция для дебаунсинга
const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Класс для реализации событийной модели
class CommandStateObserver {
  private static instance: CommandStateObserver;
  private listeners: Array<() => void> = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    // Запускаем таймер проверки состояния
    this.startPolling();
  }

  public static getInstance(): CommandStateObserver {
    if (!CommandStateObserver.instance) {
      CommandStateObserver.instance = new CommandStateObserver();
    }
    return CommandStateObserver.instance;
  }

  private startPolling() {
    // Делаем достаточно редкий опрос, т.к. события будут посылаться только при изменении
    this.intervalId = setInterval(() => {
      this.checkStateAndNotify();
    }, 300);
  }

  private prevCanUndo: boolean | null = null;
  private prevCanRedo: boolean | null = null;

  private checkStateAndNotify() {
    const commandManager = getCommandManager();
    const canUndo = commandManager.canUndo();
    const canRedo = commandManager.canRedo();

    // Проверяем, изменилось ли состояние
    if (this.prevCanUndo !== canUndo || this.prevCanRedo !== canRedo) {
      this.prevCanUndo = canUndo;
      this.prevCanRedo = canRedo;
      this.notifyListeners();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  public dispose() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const UndoRedoPanel = () => {
  const {t} = useTranslation();
  const [isMac, setIsMac] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const commandManager = getCommandManager();
  const observerRef = useRef<CommandStateObserver | null>(null);
  const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  useEffect(() => {
    // Detect if user is on a Mac
    setIsMac(isMacOS());
  }, []);

  // Get the modifier key symbol based on OS
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';

  // Используем debounce с большим временем задержки
  const handleUndo = useCallback(
    debounce(() => {
      // Отправляем событие в аналитику перед выполнением команды
      trackUndoUsed('mouse', projectId, timelineId);
      commandManager.undo();
    }, 150),
    [commandManager]
  );

  const handleRedo = useCallback(
    debounce(() => {
      // Отправляем событие в аналитику перед выполнением команды
      trackRedoUsed('mouse', projectId, timelineId);
      commandManager.redo();
    }, 150),
    [commandManager]
  );

  // Обновляем состояние кнопок
  useEffect(() => {
    // Первоначальное обновление состояния кнопок
    setCanUndo(commandManager.canUndo());
    setCanRedo(commandManager.canRedo());

    // Инициализируем наблюдатель, если он еще не создан
    if (!observerRef.current) {
      observerRef.current = CommandStateObserver.getInstance();
    }

    // Подписываемся на изменения состояния
    const unsubscribe = observerRef.current.subscribe(() => {
      setCanUndo(commandManager.canUndo());
      setCanRedo(commandManager.canRedo());
    });

    // Очищаем подписку при размонтировании
    return () => {
      unsubscribe();
    };
  }, [commandManager]);

  return (
    <div className={s.undo_redo_panel_wrapper}>
      <div className={s.undo_redo_panel_container}>
        <Tooltip
          content={
            <>
              {t('undo_redo.undo', 'Undo')}
              <span style={{display: 'block', fontSize: '0.8em', opacity: 0.8}}>
                <kbd>{modifierKey}+Z</kbd>
              </span>
              {!canUndo && <span style={{display: 'block', fontSize: '0.8em', color: 'var(--gray-8)'}}>{t('undo_redo.no_undo', 'No actions to undo')}</span>}
            </>
          }
          side='right'
        >
          <IconButton onClick={handleUndo} className={s.icon_button} size='3' color='gray' variant='ghost' style={{margin: 0}} disabled={!canUndo}>
            <ResetIcon className={s.icon} />
          </IconButton>
        </Tooltip>

        <Tooltip
          content={
            <>
              {t('undo_redo.redo', 'Redo')}
              <span style={{display: 'block', fontSize: '0.8em', opacity: 0.8}}>
                <kbd>Shift+{modifierKey}+Z</kbd>
              </span>
              {!canRedo && <span style={{display: 'block', fontSize: '0.8em', color: 'var(--gray-8)'}}>{t('undo_redo.no_redo', 'No actions to redo')}</span>}
            </>
          }
          side='right'
        >
          <IconButton onClick={handleRedo} className={s.icon_button} size='3' color='gray' variant='ghost' style={{margin: 0}} disabled={!canRedo}>
            <ResetIcon className={s.icon} style={{transform: 'scaleX(-1)'}} />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};

export default UndoRedoPanel;
