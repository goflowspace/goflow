import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {ArrowDown, ArrowUp, FoldVertical, UnfoldVertical, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {LogEntry} from './components/LogEntry';
import {LogEntryType as EntryType, LogEntry as LogEntryType, LogPanelProps, NarrativeLogEntry} from './types';

import styles from './styles.module.css';

// Глобальный режим разворачивания
type GlobalExpandMode = null | 'expanded' | 'collapsed';

export const PlaybackLogPanelV2: React.FC<LogPanelProps> = ({entries, onClear, onToggleSort, onToggleExpandAll}) => {
  const {t} = useTranslation();

  // Хранит ID записей, которые пользователь вручную развернул/свернул
  const [manuallyToggledEntries, setManuallyToggledEntries] = useState<Set<string>>(new Set());
  // Глобальный режим разворачивания (по умолчанию все развернуто)
  const [globalExpandMode, setGlobalExpandMode] = useState<GlobalExpandMode>('expanded');
  const [isAscending, setIsAscending] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const prevEntriesLengthRef = useRef<number>(entries.length);

  // Автоматическая прокрутка к последней записи при добавлении новых записей
  useEffect(() => {
    // Прокручиваем только если добавились новые записи и режим по возрастанию
    if (isAscending && logContainerRef.current && entries.length > prevEntriesLengthRef.current) {
      // Прокручиваем к низу контейнера
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
    prevEntriesLengthRef.current = entries.length;
  }, [entries.length, isAscending]);

  // Вычисляем состояние развернутости для каждой записи
  const entriesWithExpanded = useMemo(() => {
    return entries.map((entry) => {
      if (entry.type === EntryType.NARRATIVE) {
        const narrativeEntry = entry as NarrativeLogEntry;
        const hasExpandableContent = narrativeEntry.operations?.length || narrativeEntry.conditions?.length;

        let isExpanded = false;
        if (hasExpandableContent) {
          if (manuallyToggledEntries.has(entry.id)) {
            // Если запись была вручную изменена - используем инвертированное глобальное состояние
            // Это означает, что пользователь хочет, чтобы эта запись была в противоположном состоянии
            const baseExpanded = globalExpandMode === 'expanded';
            isExpanded = !baseExpanded;
          } else {
            // Иначе используем глобальное состояние
            isExpanded = globalExpandMode === 'expanded';
          }
        }

        return {
          ...entry,
          isExpanded
        } as LogEntryType;
      }
      return entry;
    });
  }, [entries, manuallyToggledEntries, globalExpandMode]);

  // Сортировка записей
  const sortedEntries = useMemo(() => {
    const sorted = [...entriesWithExpanded];
    return isAscending ? sorted : sorted.reverse();
  }, [entriesWithExpanded, isAscending]);

  // Обработчик ручного переключения развертывания записи
  const handleToggleExpand = useCallback((id: string) => {
    setManuallyToggledEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        // Если запись уже была вручную изменена - убираем ее из списка исключений
        // Это означает возврат к глобальному состоянию
        newSet.delete(id);
      } else {
        // Помечаем как исключение из глобального правила
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Обработчик сортировки
  const handleToggleSort = useCallback(() => {
    setIsAscending((prev) => !prev);
    onToggleSort?.();
  }, [onToggleSort]);

  // Обработчик глобального раскрытия/скрытия всех записей
  const handleToggleExpandAll = useCallback(() => {
    // Переключаем глобальный режим
    const newMode: GlobalExpandMode = globalExpandMode === 'expanded' ? 'collapsed' : 'expanded';
    setGlobalExpandMode(newMode);

    // Очищаем список исключений - все записи теперь следуют новому глобальному правилу
    setManuallyToggledEntries(new Set());

    onToggleExpandAll?.();
  }, [globalExpandMode, onToggleExpandAll]);

  return (
    <div className={styles.panel}>
      {/* Хедер */}
      <header className={styles.header}>
        <h3 className={styles.headerTitle}>{t('playback.log_panel.title')}</h3>
        <div className={styles.headerControls}>
          <button
            className={`${styles.iconButton} ${styles.neutral}`}
            onClick={handleToggleSort}
            title={isAscending ? t('playback.log_panel.sort_descending') : t('playback.log_panel.sort_ascending')}
          >
            {isAscending ? <ArrowUp /> : <ArrowDown />}
          </button>
          <button
            className={`${styles.iconButton} ${styles.neutral}`}
            onClick={handleToggleExpandAll}
            title={globalExpandMode === 'expanded' ? t('playback.log_panel.collapse_all') : t('playback.log_panel.expand_all')}
          >
            {globalExpandMode === 'expanded' ? <FoldVertical /> : <UnfoldVertical />}
          </button>
          <button className={`${styles.iconButton} ${styles.error}`} onClick={onClear} title={t('playback.log_panel.clear_log')}>
            <X />
          </button>
        </div>
      </header>

      {/* Контейнер записей */}
      <div className={styles.logContainer} ref={logContainerRef}>
        {sortedEntries.length === 0 ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#646464',
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px'
            }}
          >
            {t('playback.log_panel.empty_log')}
          </div>
        ) : (
          sortedEntries.map((entry) => <LogEntry key={entry.id} entry={entry} onToggleExpand={handleToggleExpand} direction={isAscending ? 'down' : 'up'} />)
        )}
      </div>
    </div>
  );
};
