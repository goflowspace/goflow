import React, {ReactNode, createContext, useCallback, useContext, useEffect, useState} from 'react';

import {PlaybackLocalizationData} from '../../../../services/dbService';
import {EditorTheme, useEditorSettingsStore} from '../../../../store/useEditorSettingsStore';
import {Node} from '../../../../types/nodes';
import {Variable} from '../../../../types/variables';
import {LanguageCompleteness, checkLocalizationCompleteness, getReadyLanguages} from '../../../utils/localizationCompleteness';
import {IPlaybackLogPanel, PlaybackLogEntry, PlaybackLogType} from '../../types/logging';

// Создаем интерфейс для контекста, включающий настройки темы и локализацию
interface PlaybackLogContextValue extends IPlaybackLogPanel {
  isDarkTheme: boolean;
  toggleTheme: () => void;
  variables: Variable[];
  setVariables: (variables: Variable[]) => void;
  nodes: Node[];
  setNodes: (nodes: Node[]) => void;
  // Данные для воспроизведения
  projectId: string | null;
  teamId: string | null;
  setPlaybackData: (projectId: string | null, teamId: string | null) => void;
  // Локализация
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  localizationData: PlaybackLocalizationData | null;
  setLocalizationData: (data: PlaybackLocalizationData | null) => void;
  languageCompleteness: LanguageCompleteness[];
  readyLanguages: string[];
  isLocalizationAvailable: boolean;
}

// Создаем контекст для хранения и использования логов
const PlaybackLogContext = createContext<PlaybackLogContextValue | null>(null);

export interface PlaybackLogProviderProps {
  children: ReactNode;
  initialProjectId?: string | null;
  initialTeamId?: string | null;
}

// Провайдер контекста логов
export const PlaybackLogProvider: React.FC<PlaybackLogProviderProps> = ({children, initialProjectId, initialTeamId}) => {
  // Состояние для хранения логов
  const [logs, setLogs] = useState<PlaybackLogEntry[]>([]);
  // Состояние переменных
  const [variables, setVariables] = useState<Variable[]>([]);
  // Состояние узлов
  const [nodes, setNodes] = useState<Node[]>([]);
  // Данные воспроизведения
  const [projectId, setProjectIdState] = useState<string | null>(initialProjectId || null);
  const [teamId, setTeamIdState] = useState<string | null>(initialTeamId || null);

  // Состояние локализации
  const [selectedLanguage, setSelectedLanguageState] = useState<string>('');
  const [localizationData, setLocalizationData] = useState<PlaybackLocalizationData | null>(null);

  // Получаем настройки редактора
  const {theme, setTheme, loadFromStorage} = useEditorSettingsStore();
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);

  // Функция для определения темной темы на основе настройки
  const determineIsDarkTheme = useCallback((editorTheme: EditorTheme): boolean => {
    if (editorTheme === 'auto') {
      // Проверяем системную тему
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      return mediaQuery.matches;
    }
    return editorTheme === 'dark';
  }, []);

  // Эффект для синхронизации темы с настройками редактора
  useEffect(() => {
    // Загружаем настройки из localStorage при инициализации
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const newIsDarkTheme = determineIsDarkTheme(theme);
    setIsDarkTheme(newIsDarkTheme);

    // Применяем тему к document
    document.documentElement.setAttribute('data-theme', newIsDarkTheme ? 'dark' : 'light');

    // Слушаем изменения системной темы для режима 'auto'
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const autoIsDark = e.matches;
        setIsDarkTheme(autoIsDark);
        document.documentElement.setAttribute('data-theme', autoIsDark ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, determineIsDarkTheme]);

  // Переключение между темной и светлой темой
  const toggleTheme = useCallback(() => {
    // Если текущая тема auto, то переключаем на противоположную от текущей системной
    // Иначе просто переключаем между light и dark
    if (theme === 'auto') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemIsDark ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  }, [theme, setTheme]);

  // Добавить запись в лог
  const addLog = useCallback((entry: PlaybackLogEntry) => {
    setLogs((prevLogs) => [...prevLogs, entry]);
  }, []);

  // Откатить лог до определенного узла
  const rollbackLog = useCallback((nodeId: string) => {
    setLogs((prevLogs) => {
      // Находим последнее вхождение узла с указанным nodeId
      const targetIndex = prevLogs.findLastIndex((log) => log.nodeId === nodeId && log.type === PlaybackLogType.VisitNode);
      if (targetIndex === -1) return prevLogs;

      // Возвращаем логи до найденного узла включительно
      // Это удалит все записи после этого узла (включая выборы, операции, условия)
      return prevLogs.slice(0, targetIndex + 1);
    });
  }, []);

  // Очистить все логи
  const clearLog = useCallback(() => {
    setLogs([]);
  }, []);

  // Получить все логи
  const getLogs = useCallback(() => {
    return logs;
  }, [logs]);

  // Установить данные воспроизведения
  const setPlaybackData = useCallback((projectId: string | null, teamId: string | null) => {
    setProjectIdState(projectId);
    setTeamIdState(teamId);
  }, []);

  // Управление выбранным языком локализации
  const setSelectedLanguage = useCallback(
    (language: string) => {
      setSelectedLanguageState(language);
      // Сохраняем в sessionStorage чтобы не влиять на основное приложение
      if (projectId && typeof window !== 'undefined') {
        window.sessionStorage.setItem(`playback_language_${projectId}`, language);
      }
    },
    [projectId]
  );

  // Восстанавливаем язык из sessionStorage при изменении projectId
  useEffect(() => {
    if (projectId && typeof window !== 'undefined') {
      const savedLanguage = window.sessionStorage.getItem(`playback_language_${projectId}`);
      if (savedLanguage) {
        setSelectedLanguageState(savedLanguage);
      } else if (localizationData) {
        // По умолчанию выбираем первый готовый язык или базовый
        const ready = getReadyLanguages({
          baseLanguage: localizationData.baseLanguage,
          targetLanguages: localizationData.targetLanguages,
          localizations: localizationData.localizations
        });
        setSelectedLanguageState(ready.length > 0 ? ready[0] : localizationData.baseLanguage);
      }
    }
  }, [projectId, localizationData]);

  // Вычисляемые значения для локализации
  const languageCompleteness = localizationData
    ? checkLocalizationCompleteness({
        baseLanguage: localizationData.baseLanguage,
        targetLanguages: localizationData.targetLanguages,
        localizations: localizationData.localizations
      })
    : [];

  const readyLanguages = localizationData
    ? getReadyLanguages({
        baseLanguage: localizationData.baseLanguage,
        targetLanguages: localizationData.targetLanguages,
        localizations: localizationData.localizations
      })
    : [];

  const isLocalizationAvailable = localizationData !== null && localizationData.targetLanguages.length > 0;

  // Отфильтровать логи по типам
  const filter = useCallback(
    (types: Set<PlaybackLogType>) => {
      return logs.filter((log) => types.has(log.type));
    },
    [logs]
  );

  // Отсортировать логи
  const sort = useCallback(
    (ascending: boolean = false) => {
      return [...logs].sort((a, b) => (ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp));
    },
    [logs]
  );

  // Значение контекста
  const value: PlaybackLogContextValue = {
    addLog,
    rollbackLog,
    clearLog,
    getLogs,
    filter,
    sort,
    isDarkTheme,
    toggleTheme,
    variables,
    setVariables,
    nodes,
    setNodes,
    projectId,
    teamId,
    setPlaybackData,
    // Локализация
    selectedLanguage,
    setSelectedLanguage,
    localizationData,
    setLocalizationData,
    languageCompleteness,
    readyLanguages,
    isLocalizationAvailable
  };

  return <PlaybackLogContext.Provider value={value}>{children}</PlaybackLogContext.Provider>;
};

// Хук для использования логов из контекста
export const usePlaybackLog = (): PlaybackLogContextValue => {
  const context = useContext(PlaybackLogContext);
  if (!context) {
    throw new Error('usePlaybackLog must be used within a PlaybackLogProvider');
  }
  return context;
};
