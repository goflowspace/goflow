'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';

import {CheckIcon, Cross2Icon, DownloadIcon, InfoCircledIcon, MagnifyingGlassIcon, ReloadIcon} from '@radix-ui/react-icons';
import {Badge, Box, Button, Card, Checkbox, Dialog, Flex, Grid, IconButton, Popover, Progress, Select, Table, Text, TextField} from '@radix-ui/themes';
import {AlertCircle, CheckCircle2, Clock, Languages, Lock, LockOpen, Trash2, X, Zap} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {useWebSocket} from '../../../contexts/WebSocketContext';
import {ProjectLocalization, useTimelineTexts, useTranslationManagement} from '../../../hooks/useLocalizationData';
import {api} from '../../../services/api';
import {useTeamStore} from '../../../store/useTeamStore';
import {useTimelinesStore} from '../../../store/useTimelinesStore';
import useUserStore from '../../../store/useUserStore';
import {BatchTranslationProgress} from '../../../types/websocket.types';
import {exportLocalizationData} from '../../../utils/localizationExport';
import {LocalizationFilters, LocalizationFiltersPanel} from './LocalizationFilters';

interface TimelineLocalizationViewProps {
  projectId: string;
  timelineId: string;
  projectLocalization?: ProjectLocalization | null;
}

export const TimelineLocalizationView: React.FC<TimelineLocalizationViewProps> = ({projectId, timelineId, projectLocalization}) => {
  const {t} = useTranslation();
  const {subscribeToAIEvents, joinProject, leaveProject, isConnected, socket} = useWebSocket();
  const {currentTeam} = useTeamStore();
  const {timelines, loadProjectTimelines} = useTimelinesStore();
  const {user} = useUserStore();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(projectLocalization?.targetLanguages[0] || 'ru');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Состояние фильтров
  const [filters, setFilters] = useState<LocalizationFilters>({
    statuses: [],
    objectTypes: [],
    layers: [],
    dateRange: undefined,
    textLength: undefined,
    hasComments: undefined,
    hasGlossaryTerms: undefined,
    lengthCategory: 'all'
  });

  const {texts: originalTexts, isLoading, error, refetch} = useTimelineTexts(projectId, timelineId, selectedLanguage);
  const {syncTranslations, updateTranslation, quickTranslateNode, estimateBatchTranslation, batchTranslateTimeline, deleteTranslation, isLoading: isSyncing} = useTranslationManagement();

  // Локальное состояние для оптимистичных обновлений
  const [localTexts, setLocalTexts] = useState<any[]>([]);

  // Обновляем локальное состояние при изменении оригинальных данных
  useEffect(() => {
    setLocalTexts(originalTexts);
  }, [originalTexts]);

  // Очищаем выделение при изменении данных
  useEffect(() => {
    setSelectedRows(new Set());
  }, [originalTexts, selectedLanguage]);

  // Используем локальные данные для отображения
  const texts = localTexts.length > 0 ? localTexts : originalTexts;

  // Функция для оптимистичного обновления статуса конкретного элемента
  const updateTextStatus = (textId: string, newStatus: string, additionalFields: any = {}) => {
    setLocalTexts((prevTexts) => prevTexts.map((text) => (text.id === textId ? {...text, status: newStatus, ...additionalFields} : text)));
  };

  // Состояние для модального окна результатов
  const [batchResultsModal, setBatchResultsModal] = useState<{
    isOpen: boolean;
    totalTranslated: number;
    totalErrors: number;
    languageResults: Array<{
      language: string;
      success: boolean;
      error?: string;
      translatedCount?: number;
      expectedCount?: number;
    }>;
  } | null>(null);

  // Bulk operations handlers
  const handleRowSelect = (textId: string, selected: boolean) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(textId);
      } else {
        newSet.delete(textId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(texts.map((text) => text.id).filter(Boolean));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
    setShowBulkMenu(false);
  };

  const getSelectedTexts = () => {
    return texts.filter((text) => selectedRows.has(text.id));
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    const selectedTexts = getSelectedTexts();
    const deletableTexts = selectedTexts.filter((text) => text.status !== 'PROTECTED' && text.translatedText);

    if (deletableTexts.length === 0) {
      console.warn('No deletable translations selected');
      return;
    }

    if (!window.confirm(t('localization.bulk.confirm_delete', `Are you sure you want to delete ${deletableTexts.length} translations?`))) {
      return;
    }

    setBulkOperationInProgress(true);

    try {
      // Оптимистично обновляем UI для всех удаляемых элементов
      deletableTexts.forEach((text) => {
        updateTextStatus(text.id, 'PENDING', {
          translatedText: null,
          translatedAt: null,
          translatedBy: null
        });
      });

      // Выполняем один bulk API вызов
      const localizationIds = deletableTexts.map((text) => text.id!);
      const result = await api.bulkDeleteTranslations(localizationIds);

      // Если были ошибки, откатываем неуспешные операции
      if (result.data.errors && result.data.errors.length > 0) {
        console.warn('Some deletions failed:', result.data.errors);
        result.data.errors.forEach((errorItem: any) => {
          const originalText = originalTexts.find((ot) => ot.id === errorItem.id);
          if (originalText && originalText.status) {
            updateTextStatus(errorItem.id, originalText.status, {
              translatedText: originalText.translatedText
            });
          }
        });
      }

      clearSelection();
    } catch (error) {
      console.error('Failed to delete translations:', error);
      // Откатываем изменения для всех элементов
      deletableTexts.forEach((text) => {
        const originalText = originalTexts.find((ot) => ot.id === text.id);
        if (originalText && text.id && originalText.status) {
          updateTextStatus(text.id as string, originalText.status, {
            translatedText: originalText.translatedText
          });
        }
      });
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkApprove = async () => {
    const selectedTexts = getSelectedTexts();
    const approvableTexts = selectedTexts.filter((text) => ['TRANSLATED', 'REVIEWED'].includes(text.status));

    if (approvableTexts.length === 0) {
      console.warn('No approvable translations selected');
      return;
    }

    setBulkOperationInProgress(true);

    try {
      // Оптимистично обновляем UI
      approvableTexts.forEach((text) => {
        updateTextStatus(text.id, 'APPROVED', {
          approvedAt: new Date().toISOString(),
          approvedBy: user?.id || null
        });
      });

      // Выполняем один bulk API вызов
      const localizationIds = approvableTexts.map((text) => text.id!);
      const result = await api.bulkApproveTranslations(localizationIds);

      // Если были ошибки, откатываем неуспешные операции
      if (result.data.errors && result.data.errors.length > 0) {
        console.warn('Some approvals failed:', result.data.errors);
        result.data.errors.forEach((errorItem: any) => {
          const originalText = originalTexts.find((ot) => ot.id === errorItem.id);
          if (originalText && originalText.status) {
            updateTextStatus(errorItem.id, originalText.status);
          }
        });
      }

      clearSelection();
    } catch (error) {
      console.error('Failed to approve translations:', error);
      // Откатываем изменения
      approvableTexts.forEach((text) => {
        const originalText = originalTexts.find((ot) => ot.id === text.id);
        if (originalText && text.id && originalText.status) {
          updateTextStatus(text.id as string, originalText.status);
        }
      });
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkProtect = async () => {
    const selectedTexts = getSelectedTexts();
    const protectableTexts = selectedTexts.filter((text) => text.status === 'APPROVED');

    if (protectableTexts.length === 0) {
      console.warn('No protectable translations selected (must be APPROVED first)');
      return;
    }

    setBulkOperationInProgress(true);

    try {
      // Оптимистично обновляем UI
      protectableTexts.forEach((text) => {
        updateTextStatus(text.id, 'PROTECTED', {
          protectedAt: new Date().toISOString(),
          protectedBy: user?.id || null
        });
      });

      // Выполняем один bulk API вызов
      const localizationIds = protectableTexts.map((text) => text.id!);
      const result = await api.bulkProtectTranslations(localizationIds);

      // Если были ошибки, откатываем неуспешные операции
      if (result.data.errors && result.data.errors.length > 0) {
        console.warn('Some protections failed:', result.data.errors);
        result.data.errors.forEach((errorItem: any) => {
          updateTextStatus(errorItem.id, 'APPROVED');
        });
      }

      clearSelection();
    } catch (error) {
      console.error('Failed to protect translations:', error);
      // Откатываем изменения
      protectableTexts.forEach((text) => {
        updateTextStatus(text.id, 'APPROVED');
      });
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkUnprotect = async () => {
    const selectedTexts = getSelectedTexts();
    const unprotectableTexts = selectedTexts.filter((text) => text.status === 'PROTECTED');

    if (unprotectableTexts.length === 0) {
      console.warn('No protected translations selected');
      return;
    }

    setBulkOperationInProgress(true);

    try {
      // Оптимистично обновляем UI
      unprotectableTexts.forEach((text) => {
        updateTextStatus(text.id, 'APPROVED', {
          protectedAt: null,
          protectedBy: null
        });
      });

      // Выполняем один bulk API вызов
      const localizationIds = unprotectableTexts.map((text) => text.id!);
      const result = await api.bulkUnprotectTranslations(localizationIds);

      // Если были ошибки, откатываем неуспешные операции
      if (result.data.errors && result.data.errors.length > 0) {
        console.warn('Some unprotections failed:', result.data.errors);
        result.data.errors.forEach((errorItem: any) => {
          updateTextStatus(errorItem.id, 'PROTECTED');
        });
      }

      clearSelection();
    } catch (error) {
      console.error('Failed to unprotect translations:', error);
      // Откатываем изменения
      unprotectableTexts.forEach((text) => {
        const originalText = originalTexts.find((ot) => ot.id === text.id);
        if (originalText) {
          updateTextStatus(text.id, 'PROTECTED');
        }
      });
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  // Получаем название текущего таймлайна
  const currentTimeline = timelines.find((timeline) => timeline.id === timelineId);
  const timelineName = currentTimeline?.name || t('localization.table.batch_translate_modal.unknown_timeline', 'Timeline');

  // Загружаем данные таймлайнов если их нет
  useEffect(() => {
    if (timelines.length === 0) {
      loadProjectTimelines(projectId);
    }
  }, [timelines.length, projectId, loadProjectTimelines]);

  // State for editing translations
  const [editingTranslations, setEditingTranslations] = useState<Record<string, string>>({});
  const [savingTranslations, setSavingTranslations] = useState<Set<string>>(new Set());
  const [translatingNodes, setTranslatingNodes] = useState<Set<string>>(new Set());
  const [deletingTranslations, setDeletingTranslations] = useState<Set<string>>(new Set());

  // State for bulk operations
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Batch translation state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchEstimate, setBatchEstimate] = useState<any>(null);
  const [batchInProgress, setBatchInProgress] = useState(false);
  const [batchSessionId, setBatchSessionId] = useState<string | null>(null);
  const [selectedTargetLanguages, setSelectedTargetLanguages] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentNodeId?: string;
    currentLanguage?: string;
    status: 'translating' | 'completed' | 'failed' | 'cancelled';
    sessionId?: string;
    languageProgress?: Record<
      string,
      {
        status: 'pending' | 'translating' | 'completed' | 'failed';
        result?: any;
        error?: string;
        currentNode?: number;
        totalNodes?: number;
      }
    >;
    results?: {
      successful: number;
      failed: number;
      totalProcessed: number;
    };
  } | null>(null);

  // WebSocket subscription for batch translation progress
  useEffect(() => {
    if (!projectId || !isConnected || !currentTeam?.id || !socket) return;

    const joinProjectPromise = joinProject(projectId, currentTeam.id);

    const unsubscribe = subscribeToAIEvents({
      onBatchTranslationProgress: (progress: BatchTranslationProgress) => {
        // Если это прогресс по узлам внутри языка
        if (progress.currentNodeId && progress.current && progress.total && batchProgress?.currentLanguage) {
          setBatchProgress((prev) =>
            prev
              ? {
                  ...prev,
                  currentNodeId: progress.currentNodeId,
                  languageProgress: prev.languageProgress
                    ? {
                        ...prev.languageProgress,
                        [prev.currentLanguage!]: {
                          ...prev.languageProgress[prev.currentLanguage!],
                          currentNode: progress.current,
                          // Обновляем totalNodes из WebSocket, если они предоставлены, иначе используем сохраненное значение
                          totalNodes: progress.total ?? prev.languageProgress[prev.currentLanguage!]?.totalNodes ?? 0
                        }
                      }
                    : prev.languageProgress
                }
              : null
          );
        } else {
          // Обновляем общий прогресс, но НЕ закрываем окно автоматически
          const newState = (prev: any) => {
            const result = prev
              ? {
                  ...prev,
                  ...progress,
                  // Сохраняем информацию о языках из нашего локального состояния
                  languageProgress: prev.languageProgress,
                  // НЕ обновляем results из WebSocket, управляем ими локально
                  results: prev.results
                }
              : progress;

            return result;
          };
          setBatchProgress(newState);
        }

        // Сохраняем sessionId для возможной отмены
        if (progress.sessionId && progress.status === 'translating') {
          setBatchSessionId(progress.sessionId);
        }

        // НЕ закрываем окно автоматически от WebSocket событий
        // Закрытие управляется только локальной логикой
      }
    });

    // Добавляем прямой слушатель на сокет для collaboration событий
    const handleDirectCollaborationEvent = (event: any) => {
      if (event.type === 'batch_translation_progress') {
        const progressData = event.payload || event.data;

        // Если это прогресс по узлам внутри языка
        if (progressData.currentNodeId && progressData.current && progressData.total) {
          setBatchProgress((prev) =>
            prev
              ? {
                  ...prev,
                  currentNodeId: progressData.currentNodeId,
                  languageProgress:
                    prev.languageProgress && prev.currentLanguage
                      ? {
                          ...prev.languageProgress,
                          [prev.currentLanguage]: {
                            ...prev.languageProgress[prev.currentLanguage],
                            currentNode: progressData.current,
                            // Обновляем totalNodes из collaboration события, если они предоставлены, иначе используем сохраненное значение
                            totalNodes: progressData.total ?? prev.languageProgress[prev.currentLanguage]?.totalNodes ?? 0
                          }
                        }
                      : prev.languageProgress
                }
              : null
          );
        } else {
          // Обновляем общий прогресс, но НЕ закрываем окно автоматически
          const newState = (prev: any) => {
            const result = prev
              ? {
                  ...prev,
                  ...progressData,
                  // Сохраняем информацию о языках из нашего локального состояния
                  languageProgress: prev.languageProgress,
                  // НЕ обновляем results из collaboration события, управляем ими локально
                  results: prev.results
                }
              : progressData;

            return result;
          };
          setBatchProgress(newState);
        }

        // НЕ закрываем окно автоматически от collaboration событий
        // Закрытие управляется только локальной логикой
      }
    };

    socket.on('collaboration_event', handleDirectCollaborationEvent);

    return () => {
      unsubscribe();
      socket.off('collaboration_event', handleDirectCollaborationEvent);
      leaveProject(projectId);
    };
  }, [projectId, isConnected, currentTeam?.id, socket, subscribeToAIEvents, joinProject, leaveProject, refetch]);

  // Infinite scroll state
  const [loadedCount, setLoadedCount] = useState(20); // Start with 20 items
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_LOAD = 20;

  // Helper functions to get filter options from data
  const getAvailableLayers = useMemo(() => {
    const layersMap = new Map<string, string>();
    texts.forEach((text) => {
      if (text.layerId) {
        // Используем имя слоя если есть, иначе ID
        const displayName = text.layerName || text.layerId;
        layersMap.set(text.layerId, displayName);
      }
    });
    return Array.from(layersMap.entries())
      .map(([id, name]) => ({id, name}))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [texts]);

  // Complex filter logic
  const filteredTexts = useMemo(() => {
    let filtered = texts;

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((text) => {
        const searchableFields = [text.originalText || '', text.translatedText || '', text.nodeTitle || '', text.fieldPath || ''];
        return searchableFields.some((field) => field.toLowerCase().includes(query));
      });
    }

    // Status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter((text) => filters.statuses.includes(text.status));
    }

    // Object type filter
    if (filters.objectTypes.length > 0) {
      filtered = filtered.filter((text) => {
        return filters.objectTypes.includes(text.nodeType.toLowerCase());
      });
    }

    // Layer filter
    if (filters.layers.length > 0) {
      filtered = filtered.filter((text) => text.layerId && filters.layers.includes(text.layerId));
    }

    // Text length filter
    if (filters.lengthCategory && filters.lengthCategory !== 'all') {
      filtered = filtered.filter((text) => {
        const length = (text.originalText || '').length;
        switch (filters.lengthCategory) {
          case 'short':
            return length <= 50;
          case 'medium':
            return length > 50 && length <= 200;
          case 'long':
            return length > 200;
          default:
            return true;
        }
      });
    }

    // Comments filter
    if (filters.hasComments === true) {
      // Assuming we have a comments field - для демо пропускаем
      // filtered = filtered.filter(text => text.comments && text.comments.length > 0);
    }

    // Glossary terms filter
    if (filters.hasGlossaryTerms === true) {
      // Assuming we have glossary terms detection - для демо пропускаем
      // filtered = filtered.filter(text => text.hasGlossaryTerms);
    }

    return filtered;
  }, [texts, searchQuery, filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.statuses.length > 0 ||
      filters.objectTypes.length > 0 ||
      filters.layers.length > 0 ||
      (filters.lengthCategory && filters.lengthCategory !== 'all') ||
      filters.hasComments === true ||
      filters.hasGlossaryTerms === true
    );
  }, [filters]);

  // Display data calculations
  const displayData = useMemo(() => {
    const displayTexts = filteredTexts.slice(0, loadedCount);
    const hasMore = filteredTexts.length > loadedCount;

    return {
      texts: displayTexts,
      totalItems: filteredTexts.length,
      originalTotalItems: texts.length,
      loadedCount: displayTexts.length,
      hasMore,
      isFiltered: !!searchQuery.trim() || hasActiveFilters
    };
  }, [filteredTexts, loadedCount, texts.length, searchQuery, hasActiveFilters]);

  // Filter management functions
  const handleFiltersChange = (newFilters: LocalizationFilters) => {
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({
      statuses: [],
      objectTypes: [],
      layers: [],
      dateRange: undefined,
      textLength: undefined,
      hasComments: undefined,
      hasGlossaryTerms: undefined,
      lengthCategory: 'all'
    });
    setSearchQuery('');
  };

  const handleSync = async () => {
    try {
      await syncTranslations(projectId, timelineId);
      refetch();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleTranslationChange = (textId: string, value: string) => {
    setEditingTranslations((prev) => ({
      ...prev,
      [textId]: value
    }));
  };

  const handleSaveTranslation = async (textId: string) => {
    if (!textId || !editingTranslations[textId]) return;

    const newTranslatedText = editingTranslations[textId];
    const currentText = texts.find((t) => t.id === textId);
    const previousTranslatedText = currentText?.translatedText;

    try {
      setSavingTranslations((prev) => new Set([...prev, textId]));

      // Оптимистично обновляем UI
      updateTextStatus(textId, 'TRANSLATED', {
        translatedText: newTranslatedText,
        translatedAt: new Date().toISOString(),
        translatedBy: user?.id || null
      });

      await updateTranslation({
        localizationId: textId,
        translatedText: newTranslatedText,
        method: 'MANUAL'
      });

      // Remove from editing state
      setEditingTranslations((prev) => {
        const newState = {...prev};
        delete newState[textId];
        return newState;
      });
    } catch (error) {
      console.error('Failed to save translation:', error);
      // Откатываем изменения
      updateTextStatus(textId, currentText?.status || 'PENDING', {
        translatedText: previousTranslatedText
      });
    } finally {
      setSavingTranslations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(textId);
        return newSet;
      });
    }
  };

  const handleCancelEdit = (textId: string) => {
    setEditingTranslations((prev) => {
      const newState = {...prev};
      delete newState[textId];
      return newState;
    });
  };

  // Status change handlers
  const handleApproveTranslation = async (textId: string) => {
    // Найдем текущий статус для отката в случае ошибки
    const currentText = texts.find((t) => t.id === textId);
    const previousStatus = currentText?.status;

    try {
      // Оптимистично обновляем UI
      updateTextStatus(textId, 'APPROVED', {
        approvedAt: new Date().toISOString(),
        approvedBy: user?.id || null
      });

      await api.approveTranslation(textId);
    } catch (error) {
      console.error('Failed to approve translation:', error);
      // Откатываем изменения
      if (previousStatus) {
        updateTextStatus(textId, previousStatus);
      }
    }
  };

  const handleProtectTranslation = async (textId: string) => {
    const currentText = texts.find((t) => t.id === textId);
    const previousStatus = currentText?.status;

    try {
      // Оптимистично обновляем UI
      updateTextStatus(textId, 'PROTECTED', {
        protectedAt: new Date().toISOString(),
        protectedBy: user?.id || null
      });

      await api.protectTranslation(textId);
    } catch (error) {
      console.error('Failed to protect translation:', error);
      // Откатываем изменения
      if (previousStatus) {
        updateTextStatus(textId, previousStatus);
      }
    }
  };

  const handleUnprotectTranslation = async (textId: string) => {
    const currentText = texts.find((t) => t.id === textId);
    const previousStatus = currentText?.status;

    try {
      // Оптимистично обновляем UI
      updateTextStatus(textId, 'APPROVED', {
        protectedAt: null,
        protectedBy: null
      });

      await api.unprotectTranslation(textId);
    } catch (error) {
      console.error('Failed to unprotect translation:', error);
      // Откатываем изменения
      if (previousStatus) {
        updateTextStatus(textId, previousStatus, {
          protectedAt: currentText?.protectedAt,
          protectedBy: currentText?.protectedBy
        });
      }
    }
  };

  // Batch translation handlers
  const handleOpenBatchModal = async () => {
    if (!projectLocalization) return;

    // Инициализируем выбранные языки текущим языком
    const initialLanguages = selectedLanguage ? [selectedLanguage] : [];
    setSelectedTargetLanguages(initialLanguages);

    try {
      // Получаем оценку для первого языка (для первоначального отображения)
      if (initialLanguages.length > 0) {
        const estimate = await estimateBatchTranslation(projectId, timelineId, {
          targetLanguage: initialLanguages[0],
          qualityLevel: 'fast',
          skipExisting: true
        });
        setBatchEstimate({...estimate.data, selectedLanguages: initialLanguages});
      }
      setShowBatchModal(true);
    } catch (error) {
      console.error('Failed to get batch translation estimate:', error);
    }
  };

  const handleLanguageSelectionChange = async (language: string, isSelected: boolean, allLanguages?: string[]) => {
    // Если передан массив всех языков (для случая "выбрать все"), используем его
    const newSelection = allLanguages ? allLanguages : isSelected ? [...selectedTargetLanguages, language] : selectedTargetLanguages.filter((lang) => lang !== language);

    setSelectedTargetLanguages(newSelection);

    // Пересчитываем оценку стоимости для всех выбранных языков
    if (newSelection.length > 0) {
      try {
        // Получаем оценки для всех языков и суммируем их
        const estimates = await Promise.all(
          newSelection.map((lang) =>
            estimateBatchTranslation(projectId, timelineId, {
              targetLanguage: lang,
              qualityLevel: 'fast',
              skipExisting: true
            })
          )
        );

        // Суммируем стоимости и берем максимальное время
        const totalCredits = estimates.reduce((sum, est) => sum + est.data.cost.totalCredits, 0);
        const maxDuration = Math.max(...estimates.map((est) => est.data.estimation.durationMinutes));
        const totalNodesToTranslate = estimates.reduce((sum, est) => sum + est.data.nodesToTranslate, 0);
        const totalAlreadyTranslated = estimates.reduce((sum, est) => sum + est.data.alreadyTranslated, 0);

        // Используем баланс из первой оценки
        const firstEstimate = estimates[0].data;

        setBatchEstimate({
          nodesToTranslate: totalNodesToTranslate,
          alreadyTranslated: totalAlreadyTranslated,
          cost: {
            totalCredits: totalCredits
          },
          estimation: {
            durationMinutes: maxDuration,
            durationText:
              maxDuration > 60
                ? `${Math.ceil(maxDuration / 60)} ${t('localization.table.batch_translate_modal.cost_summary.hours', 'hours')}`
                : `${maxDuration} ${t('localization.table.batch_translate_modal.cost_summary.minutes', 'minutes')}`
          },
          userBalance: firstEstimate.userBalance,
          selectedLanguages: newSelection
        });
      } catch (error) {
        console.error('Failed to update batch translation estimate:', error);
      }
    } else {
      setBatchEstimate(null);
    }
  };

  const handleStartBatchTranslation = async (settings: {qualityLevel: 'fast' | 'standard' | 'expert'; skipExisting: boolean}) => {
    if (!projectLocalization || selectedTargetLanguages.length === 0) return;

    try {
      setBatchInProgress(true);
      // batchEstimate содержит суммарное количество операций перевода для всех выбранных языков
      // Нужно разделить на количество языков чтобы получить количество узлов для каждого языка
      const totalNodes = batchEstimate?.nodesToTranslate || 0;
      const nodesPerLanguage = selectedTargetLanguages.length > 0 ? Math.ceil(totalNodes / selectedTargetLanguages.length) : 0;

      const initialState = {
        current: 0,
        total: selectedTargetLanguages.length,
        status: 'translating' as const,
        languageProgress: selectedTargetLanguages.reduce(
          (acc, lang) => ({
            ...acc,
            [lang]: {
              status: 'pending' as const,
              currentNode: 0,
              totalNodes: nodesPerLanguage
            }
          }),
          {}
        )
      };

      setBatchProgress(initialState);
      setShowBatchModal(false);
      setBatchSessionId(null);

      // Запускаем переводы последовательно для каждого языка
      const results: Array<{language: string; result?: any; error?: any; translatedCount?: number}> = [];
      for (let i = 0; i < selectedTargetLanguages.length; i++) {
        const language = selectedTargetLanguages[i];

        try {
          setBatchProgress((prev) =>
            prev
              ? {
                  ...prev,
                  current: i + 1, // Показываем текущий язык как выполняющийся
                  currentLanguage: language,
                  currentNodeId: `Translating to ${language}...`,
                  languageProgress: {
                    ...prev.languageProgress,
                    [language]: {
                      ...prev.languageProgress?.[language],
                      status: 'translating',
                      currentNode: 0,
                      // Сохраняем изначальное количество узлов, не перезаписываем
                      totalNodes: prev.languageProgress?.[language]?.totalNodes || 0
                    }
                  }
                }
              : null
          );

          const result = await batchTranslateTimeline(projectId, timelineId, {
            sourceLanguage: projectLocalization.baseLanguage,
            targetLanguage: language,
            qualityLevel: settings.qualityLevel,
            skipExisting: settings.skipExisting
          });

          results.push({language, result, translatedCount: result?.data?.successful || 0});

          setBatchProgress((prev) =>
            prev
              ? {
                  ...prev,
                  languageProgress: {
                    ...prev.languageProgress,
                    [language]: {
                      status: 'completed',
                      result,
                      currentNode: prev.languageProgress?.[language]?.totalNodes || 0,
                      totalNodes: prev.languageProgress?.[language]?.totalNodes || 0
                    }
                  }
                }
              : null
          );

          // Небольшая задержка между языками для WebSocket событий
          if (i < selectedTargetLanguages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error: any) {
          console.error(`❌ Translation failed for ${language}:`, error);

          setBatchProgress((prev) =>
            prev
              ? {
                  ...prev,
                  languageProgress: {
                    ...prev.languageProgress,
                    [language]: {
                      status: 'failed',
                      error: error?.message || 'Unknown error',
                      currentNode: 0,
                      totalNodes: prev.languageProgress?.[language]?.totalNodes || 0
                    }
                  }
                }
              : null
          );

          results.push({language, error: error?.message || 'Unknown error', translatedCount: 0});
        }
      }

      // Обновляем финальное состояние - ВСЕ языки завершены
      const finalResults = {
        successful: results.filter((r) => !r.error).length,
        failed: results.filter((r) => r.error).length,
        totalProcessed: results.length
      };

      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              current: selectedTargetLanguages.length,
              total: selectedTargetLanguages.length,
              status: 'completed',
              currentNodeId: undefined,
              currentLanguage: undefined,
              results: finalResults
            }
          : null
      );

      // Показываем модальное окно с результатами
      const totalTranslated = results.reduce((sum, result) => {
        if (!result.error && result.translatedCount !== undefined) {
          return sum + result.translatedCount;
        }
        return sum;
      }, 0);

      // Рассчитываем ожидаемое количество строк на язык
      // Берем максимальное количество среди успешных языков как ожидаемое
      const successfulCounts = results.filter((r) => !r.error && (r.translatedCount || 0) > 0).map((r) => r.translatedCount || 0);
      const expectedCountPerLanguage = successfulCounts.length > 0 ? Math.max(...successfulCounts) : 0;

      setBatchResultsModal({
        isOpen: true,
        totalTranslated,
        totalErrors: finalResults.failed,
        languageResults: results.map((result) => {
          // Язык считается успешным, если нет ошибок И переведено достаточно строк
          const actualTranslated = result.translatedCount || 0;
          const isFullySuccessful = !result.error && (expectedCountPerLanguage === 0 || actualTranslated >= expectedCountPerLanguage);

          return {
            language: result.language,
            success: isFullySuccessful,
            error: result.error || (actualTranslated < expectedCountPerLanguage && expectedCountPerLanguage > 0 ? 'incomplete_translation' : undefined),
            translatedCount: result.translatedCount,
            expectedCount: expectedCountPerLanguage
          };
        })
      });

      // Обновляем данные
      refetch();

      // Закрываем окно только после завершения ВСЕХ языков
      setTimeout(() => {
        setBatchInProgress(false);
        setTimeout(() => {
          setBatchProgress(null);
        }, 3000);
      }, 1000);
    } catch (error: any) {
      console.error('❌ Critical error in batch translation process:', error);

      // Показываем ошибку в прогресс-окне вместо немедленного закрытия
      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'failed',
              currentNodeId: `Critical error: ${error?.message || 'Unknown error'}`
            }
          : null
      );

      // Закрываем окно через задержку, чтобы пользователь успел увидеть ошибку
      setTimeout(() => {
        setBatchInProgress(false);
        setBatchSessionId(null);
        setTimeout(() => {
          setBatchProgress(null);
        }, 2000);
      }, 3000);
    }
  };

  // Функция для отмены пакетного перевода
  const handleCancelBatchTranslation = async () => {
    if (!batchSessionId || !projectId) {
      console.warn('Cannot cancel: no active session or project ID');
      return;
    }

    try {
      const result = await api.cancelBatchTranslation(batchSessionId, projectId);

      // Обновляем состояние локально
      setBatchInProgress(false);
      setBatchProgress((prev) => (prev ? {...prev, status: 'cancelled'} : null));
      setBatchSessionId(null);

      // Скрываем прогресс через короткое время
      setTimeout(() => {
        setBatchProgress(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to cancel batch translation:', error);
      // Можно показать уведомление об ошибке
    }
  };

  const handleQuickTranslate = async (text: any) => {
    if (!text.nodeId || !projectLocalization || !text.id) {
      console.error('Missing required data for translation:', {nodeId: text.nodeId, textId: text.id, projectLocalization: !!projectLocalization});
      return;
    }

    const textId = text.id || `${text.nodeId}-${text.fieldPath}`;

    try {
      setTranslatingNodes((prev) => new Set([...prev, textId]));

      // Вызываем быстрый перевод
      const result = await quickTranslateNode(projectId, text.nodeId, {
        sourceLanguage: projectLocalization.baseLanguage,
        targetLanguage: selectedLanguage,
        precedingContext: text.precedingText || '',
        followingContext: text.followingText || ''
      });

      // Если перевод успешен, сохраняем результат
      if (result?.data?.translation?.translatedText) {
        const translatedText = result.data.translation.translatedText;

        // Оптимистично обновляем UI
        updateTextStatus(textId, 'TRANSLATED', {
          translatedText: translatedText,
          translatedAt: new Date().toISOString(),
          translatedBy: user?.id || null
        });

        await updateTranslation({
          localizationId: text.id, // ✅ Используем настоящий ID записи локализации
          translatedText: translatedText,
          method: 'AI_GENERATED'
        });
      } else {
        console.warn('❌ No translation text in result:', result);
      }
    } catch (error) {
      console.error('❌ Failed to translate node:', error);
    } finally {
      setTranslatingNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(textId);
        return newSet;
      });
    }
  };

  const handleDeleteTranslation = async (text: any) => {
    if (!text.id) {
      console.error('Missing localization ID for deletion');
      return;
    }

    if (!window.confirm(t('localization.table.confirm_delete', 'Are you sure you want to delete this translation?'))) {
      return;
    }

    const textId = text.id || `${text.nodeId}-${text.fieldPath}`;
    const currentText = texts.find((t) => t.id === textId);
    const previousTranslatedText = currentText?.translatedText;

    try {
      setDeletingTranslations((prev) => new Set([...prev, textId]));

      // Оптимистично обновляем UI
      updateTextStatus(textId, 'PENDING', {
        translatedText: null,
        translatedAt: null,
        translatedBy: null
      });

      await deleteTranslation(text.id);
    } catch (error) {
      console.error('❌ Failed to delete translation:', error);
      // Откатываем изменения
      updateTextStatus(textId, currentText?.status || 'PENDING', {
        translatedText: previousTranslatedText
      });
    } finally {
      setDeletingTranslations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(textId);
        return newSet;
      });
    }
  };

  const handleExportLocalization = async () => {
    try {
      await exportLocalizationData({
        projectId,
        timelineId,
        timelineName
      });
    } catch (error) {
      console.error('Failed to export localization:', error);
      // Можно показать уведомление об ошибке
      window.alert(t('localization.export.error', 'Failed to export localization data'));
    }
  };

  // Infinite scroll handlers
  const loadMoreItems = () => {
    if (isLoadingMore || !displayData.hasMore) return;

    setIsLoadingMore(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setLoadedCount((prev) => Math.min(prev + ITEMS_PER_LOAD, filteredTexts.length));
      setIsLoadingMore(false);
    }, 500);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const {scrollTop, scrollHeight, clientHeight} = target;

    // Load more when user is near the bottom (within 100px)
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMoreItems();
    }
  };

  // Reset loaded count when data, search or filters change
  useEffect(() => {
    setLoadedCount(20);
  }, [texts, searchQuery, filters]);

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      en: t('localization.languages.en', 'English'),
      ru: t('localization.languages.ru', 'Russian'),
      es: t('localization.languages.es', 'Spanish'),
      fr: t('localization.languages.fr', 'French'),
      pt: t('localization.languages.pt', 'Portuguese'),
      de: t('localization.languages.de', 'German'),
      ja: t('localization.languages.ja', 'Japanese'),
      ko: t('localization.languages.ko', 'Korean'),
      'zh-CN': t('localization.languages.zh-CN', 'Chinese (Simplified)')
    };
    return names[code] || code.toUpperCase();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'green';
      case 'PROTECTED':
        return 'purple';
      case 'TRANSLATED':
        return 'blue';
      case 'REVIEWED':
        return 'cyan';
      case 'PENDING':
        return 'gray';
      case 'TRANSLATING':
        return 'yellow';
      case 'REJECTED':
        return 'red';
      case 'OUTDATED':
        return 'orange';
      case 'ARCHIVED':
        return 'gray';
      default:
        return 'gray';
    }
  };

  // Loading indicator component
  const LoadingIndicator: React.FC = () => {
    const {totalItems, originalTotalItems, loadedCount, hasMore, isFiltered} = displayData;

    if (totalItems === 0) return null;

    return (
      <Box p='3' style={{borderTop: '1px solid var(--gray-6)', textAlign: 'center'}}>
        <Flex direction='column' align='center' gap='2'>
          <Text size='2' color='gray'>
            {isFiltered
              ? t('localization.search.results_loaded', 'Loaded {{loaded}} of {{total}} search results ({{originalTotal}} total items)', {
                  loaded: loadedCount,
                  total: totalItems,
                  originalTotal: originalTotalItems
                })
              : t('localization.infinite_scroll.loaded', 'Loaded {{loaded}} of {{total}} items', {
                  loaded: loadedCount,
                  total: totalItems
                })}
          </Text>

          {isLoadingMore && (
            <Flex align='center' gap='2'>
              <ReloadIcon className='animate-spin' />
              <Text size='2' color='gray'>
                {t('localization.infinite_scroll.loading', 'Loading more...')}
              </Text>
            </Flex>
          )}

          {!hasMore && totalItems > 0 && (
            <Text size='2' color='green'>
              {t('localization.infinite_scroll.all_loaded', 'All items loaded')}
            </Text>
          )}

          {hasMore && !isLoadingMore && (
            <Button variant='ghost' size='1' onClick={loadMoreItems} style={{marginTop: '8px'}}>
              {t('localization.infinite_scroll.load_more', 'Load more')}
            </Button>
          )}
        </Flex>
      </Box>
    );
  };

  // Context popup component
  const ContextPopup: React.FC<{text: any}> = ({text}) => (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton variant='ghost' size='1'>
          <InfoCircledIcon />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content style={{maxWidth: '400px'}}>
        <Box p='3'>
          <Text size='2' weight='medium' style={{display: 'block', marginBottom: '8px'}}>
            {t('localization.context.title', 'Context')}
          </Text>

          {text.precedingText && (
            <Box mb='3'>
              <Text size='1' color='gray' style={{display: 'block', marginBottom: '4px'}}>
                {t('localization.context.previous', 'Previous text:')}
              </Text>
              <Text
                size='2'
                style={{
                  display: 'block',
                  padding: '8px',
                  backgroundColor: 'var(--gray-2)',
                  borderRadius: '4px',
                  fontStyle: 'italic'
                }}
              >
                {text.precedingText}
              </Text>
            </Box>
          )}

          {text.followingText && (
            <Box>
              <Text size='1' color='gray' style={{display: 'block', marginBottom: '4px'}}>
                {t('localization.context.next', 'Next text:')}
              </Text>
              <Text
                size='2'
                style={{
                  display: 'block',
                  padding: '8px',
                  backgroundColor: 'var(--gray-2)',
                  borderRadius: '4px',
                  fontStyle: 'italic'
                }}
              >
                {text.followingText}
              </Text>
            </Box>
          )}

          {!text.precedingText && !text.followingText && (
            <Text size='2' color='gray'>
              {t('localization.context.no_context', 'No context available')}
            </Text>
          )}
        </Box>
      </Popover.Content>
    </Popover.Root>
  );

  if (isLoading) {
    return (
      <Flex align='center' justify='center' style={{minHeight: '400px'}}>
        <Text>{t('common.loading', 'Loading...')}</Text>
      </Flex>
    );
  }

  return (
    <div>
      {/* Primary Toolbar */}
      <Card style={{padding: '16px', marginBottom: '16px'}}>
        <Flex justify='between' align='center' gap='4'>
          {/* Language Selector - Primary Control */}
          <Flex align='center' gap='2' style={{minWidth: '200px'}}>
            <Text size='2' weight='medium'>
              {t('localization.timeline.select_language', 'Language')}:
            </Text>
            <Select.Root value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <Select.Trigger style={{minWidth: '140px'}} />
              <Select.Content>
                {projectLocalization?.targetLanguages.map((lang) => (
                  <Select.Item key={lang} value={lang}>
                    {getLanguageName(lang)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* Search - Central Feature */}
          <Box style={{flex: 1, maxWidth: '500px'}}>
            <TextField.Root
              placeholder={t('localization.search.placeholder', 'Search in texts, translations, node titles...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size='2'
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height='16' width='16' />
              </TextField.Slot>
              {searchQuery && (
                <TextField.Slot>
                  <IconButton size='1' variant='ghost' onClick={() => setSearchQuery('')} style={{marginRight: '4px'}}>
                    <Cross2Icon height='14' width='14' />
                  </IconButton>
                </TextField.Slot>
              )}
            </TextField.Root>

            {displayData.isFiltered && (
              <Text size='1' color='gray' style={{display: 'block', marginTop: '4px'}}>
                {displayData.totalItems > 0
                  ? t('localization.search.results_found', 'Found {{count}} results', {count: displayData.totalItems})
                  : t('localization.search.no_results', 'No results found')}
              </Text>
            )}
          </Box>

          <Flex align='center' gap='4' style={{minWidth: '200px'}}>
            {selectedRows.size > 0 ? (
              // Bulk operations menu
              <Flex align='center' gap='2' style={{background: 'var(--accent-3)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--accent-6)'}}>
                <Text size='2' weight='medium'>
                  {t('localization.bulk.selected_count', '{{count}} selected', {count: selectedRows.size})}
                </Text>

                <Flex align='center' gap='1'>
                  <IconButton size='2' variant='soft' color='green' onClick={handleBulkApprove} disabled={bulkOperationInProgress} title={t('localization.bulk.approve', 'Approve selected')}>
                    <CheckCircle2 size={16} />
                  </IconButton>

                  <IconButton size='2' variant='soft' color='purple' onClick={handleBulkProtect} disabled={bulkOperationInProgress} title={t('localization.bulk.protect', 'Protect selected')}>
                    <Lock size={16} />
                  </IconButton>

                  <IconButton size='2' variant='soft' color='gray' onClick={handleBulkUnprotect} disabled={bulkOperationInProgress} title={t('localization.bulk.unprotect', 'Unprotect selected')}>
                    <LockOpen size={16} />
                  </IconButton>

                  <IconButton size='2' variant='soft' color='red' onClick={handleBulkDelete} disabled={bulkOperationInProgress} title={t('localization.bulk.delete', 'Delete selected')}>
                    <Trash2 size={16} />
                  </IconButton>

                  <IconButton size='2' variant='soft' color='gray' onClick={clearSelection} disabled={bulkOperationInProgress} title={t('localization.bulk.clear_selection', 'Clear selection')}>
                    <X size={16} />
                  </IconButton>
                </Flex>
              </Flex>
            ) : (
              // Normal actions
              <>
                <Button variant='solid' size='2' onClick={handleOpenBatchModal} disabled={batchInProgress || !projectLocalization || texts.length === 0} style={{minWidth: '180px'}}>
                  <Zap size={16} />
                  {t('localization.table.batch_translate', 'Translate Timeline')}
                </Button>
                <Button variant='surface' size='2' onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? <ReloadIcon className='animate-spin' width='14' height='14' /> : <ReloadIcon width='14' height='14' />}
                  {t('localization.timeline.sync_with_graph', 'Sync with Graph')}
                </Button>
                <Button variant='surface' size='2' onClick={handleExportLocalization} disabled={displayData.totalItems === 0}>
                  <DownloadIcon width='14' height='14' />
                  {t('localization.timeline.export_translations', 'Export')}
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Filters Panel */}
      <LocalizationFiltersPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableLayers={getAvailableLayers}
        isFiltered={displayData.isFiltered as boolean}
        onClearFilters={clearAllFilters}
      />

      {/* Content */}
      {error ? (
        <Card style={{padding: '24px', textAlign: 'center'}}>
          <Text color='red' size='3'>
            {error}
          </Text>
          <Button onClick={refetch} style={{marginTop: '16px'}} variant='outline'>
            {t('common.retry', 'Retry')}
          </Button>
        </Card>
      ) : displayData.totalItems > 0 ? (
        <Card style={{height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column'}}>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', padding: '16px'}}>
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid var(--gray-6)',
                borderRadius: '8px',
                minHeight: '400px', // Ensure minimum scrollable height
                maxHeight: 'calc(100vh - 400px)' // Fallback max height
              }}
            >
              <Table.Root>
                <Table.Header style={{position: 'sticky', top: 0, backgroundColor: 'var(--color-surface)', zIndex: 1}}>
                  <Table.Row>
                    <Table.ColumnHeaderCell style={{width: '50px'}}>
                      <Checkbox
                        checked={selectedRows.size > 0 && selectedRows.size === texts.length}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        title={t('localization.table.select_all', 'Select all')}
                      />
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t('localization.table.info', 'Info')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t('localization.table.original', 'Original Text')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t('localization.table.translation', 'Translation')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t('localization.table.status', 'Status')}</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>{t('localization.table.actions', 'Actions')}</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {displayData.texts.map((text, index) => {
                    const textId = text.id || `${text.nodeId}-${index}`;
                    const isEditing = textId in editingTranslations;
                    const isSaving = savingTranslations.has(textId);

                    return (
                      <Table.Row key={textId}>
                        <Table.Cell>
                          <Checkbox checked={selectedRows.has(textId)} onCheckedChange={(checked) => handleRowSelect(textId, checked === true)} />
                        </Table.Cell>
                        <Table.Cell>
                          <Flex direction='column' gap='2'>
                            <div>
                              <Text size='2' weight='medium'>
                                {text.nodeTitle || text.nodeType === 'NARRATIVE' ? `Node ${text.nodeId.slice(0, 8)}` : `Choice ${text.nodeId.slice(0, 8)}`}
                              </Text>
                              <Text size='1' color='gray' style={{display: 'block'}}>
                                {text.fieldPath}
                              </Text>
                            </div>

                            <Flex align='center' gap='2' wrap='wrap'>
                              <Badge variant='soft' color='gray' size='1'>
                                {text.layerId}
                              </Badge>

                              {text.wordCount && (
                                <Text size='1' color='gray'>
                                  {t('localization.table.word_count', {count: text.wordCount})}
                                </Text>
                              )}

                              <ContextPopup text={text} />
                            </Flex>
                          </Flex>
                        </Table.Cell>

                        <Table.Cell>
                          <Text size='2'>{text.originalText.length > 100 ? `${text.originalText.slice(0, 100)}...` : text.originalText}</Text>
                        </Table.Cell>

                        <Table.Cell>
                          {isEditing && text.status !== 'PROTECTED' ? (
                            <Flex direction='column' gap='2'>
                              <TextField.Root
                                value={editingTranslations[textId] || text.translatedText || ''}
                                onChange={(e) => handleTranslationChange(textId, e.target.value)}
                                placeholder={t('localization.table.enter_translation', 'Enter translation...')}
                                disabled={isSaving}
                              />
                              <Flex gap='1'>
                                <IconButton size='1' color='green' onClick={() => handleSaveTranslation(textId)} disabled={isSaving || !editingTranslations[textId]}>
                                  {isSaving ? <ReloadIcon className='animate-spin' /> : <CheckIcon />}
                                </IconButton>
                                <IconButton size='1' color='gray' variant='soft' onClick={() => handleCancelEdit(textId)} disabled={isSaving}>
                                  <Cross2Icon />
                                </IconButton>
                                <IconButton
                                  size='1'
                                  color='blue'
                                  variant='soft'
                                  onClick={() => handleQuickTranslate(text)}
                                  disabled={translatingNodes.has(textId) || !text.originalText}
                                  title={t('localization.table.quick_translate', 'Quick AI translate')}
                                >
                                  {translatingNodes.has(textId) ? <ReloadIcon className='animate-spin' /> : <Languages size={12} />}
                                </IconButton>
                              </Flex>
                            </Flex>
                          ) : (
                            <Flex align='center' justify='between' gap='2'>
                              <Box
                                onClick={
                                  text.status !== 'PROTECTED'
                                    ? () =>
                                        !text.translatedText
                                          ? setEditingTranslations((prev) => ({...prev, [textId]: ''}))
                                          : setEditingTranslations((prev) => ({...prev, [textId]: text.translatedText || ''}))
                                    : undefined
                                }
                                style={{cursor: text.status !== 'PROTECTED' ? 'pointer' : 'default', minHeight: '24px', padding: '4px', flex: 1}}
                              >
                                {text.translatedText ? (
                                  <Text size='2'>{text.translatedText.length > 100 ? `${text.translatedText.slice(0, 100)}...` : text.translatedText}</Text>
                                ) : (
                                  <Text size='2' color='gray' style={{fontStyle: 'italic'}}>
                                    {text.status === 'PROTECTED'
                                      ? t('localization.table.protected_translation', 'Protected - cannot be edited')
                                      : t('localization.table.click_to_translate', 'Click to add translation...')}
                                  </Text>
                                )}
                              </Box>

                              {text.status !== 'PROTECTED' && (
                                <Flex gap='1'>
                                  {!text.translatedText && (
                                    <IconButton
                                      size='1'
                                      color='blue'
                                      variant='soft'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickTranslate(text);
                                      }}
                                      disabled={translatingNodes.has(textId) || !text.originalText}
                                      title={t('localization.table.quick_translate', 'Quick AI translate')}
                                    >
                                      {translatingNodes.has(textId) ? <ReloadIcon className='animate-spin' /> : <Languages size={12} />}
                                    </IconButton>
                                  )}
                                </Flex>
                              )}
                            </Flex>
                          )}
                        </Table.Cell>

                        <Table.Cell>
                          <Badge variant='soft' color={getStatusColor(text.status)}>
                            {text.status ? String(t(`localization.status.${text.status}`, text.status)) : String(t('localization.status.PENDING', 'Pending'))}
                          </Badge>
                        </Table.Cell>

                        <Table.Cell>
                          <Flex gap='1' align='center'>
                            {text.status === 'TRANSLATED' || text.status === 'REVIEWED' ? (
                              <IconButton size='1' variant='soft' color='green' onClick={() => handleApproveTranslation(textId)} title={t('localization.actions.approve', 'Approve')}>
                                <CheckCircle2 size={14} />
                              </IconButton>
                            ) : null}

                            {text.status === 'APPROVED' ? (
                              <IconButton size='1' variant='soft' color='purple' onClick={() => handleProtectTranslation(textId)} title={t('localization.actions.protect', 'Protect')}>
                                <Lock size={14} />
                              </IconButton>
                            ) : null}

                            {text.status === 'PROTECTED' ? (
                              <IconButton size='1' variant='soft' color='gray' onClick={() => handleUnprotectTranslation(textId)} title={t('localization.actions.unprotect', 'Remove Protection')}>
                                <LockOpen size={14} />
                              </IconButton>
                            ) : null}

                            {text.translatedText && text.status !== 'PROTECTED' ? (
                              <IconButton
                                size='1'
                                variant='soft'
                                color='red'
                                onClick={() => handleDeleteTranslation(text)}
                                disabled={deletingTranslations.has(textId)}
                                title={t('localization.table.delete_translation', 'Delete translation')}
                              >
                                {deletingTranslations.has(textId) ? <ReloadIcon className='animate-spin' width='14' height='14' /> : <Trash2 size={14} />}
                              </IconButton>
                            ) : null}
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </div>

            <LoadingIndicator />
          </div>
        </Card>
      ) : (
        <Card style={{padding: '48px', textAlign: 'center'}}>
          <Text size='4' color='gray'>
            {displayData.isFiltered ? t('localization.search.no_results_title', 'No matching results found') : t('localization.timeline.no_texts', 'No texts found for this timeline')}
          </Text>
          <Text size='2' color='gray' style={{display: 'block', marginTop: '8px'}}>
            {displayData.isFiltered
              ? t('localization.search.try_different_query', 'Try adjusting your search query or clear the filter')
              : t('localization.timeline.sync_first', 'Sync with graph to extract translatable texts')}
          </Text>
          {displayData.isFiltered ? (
            <Button mt='4' onClick={() => setSearchQuery('')} variant='outline'>
              {t('localization.search.clear_search', 'Clear Search')}
            </Button>
          ) : (
            <Button mt='4' onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? <ReloadIcon className='animate-spin' /> : <ReloadIcon />}
              {t('localization.timeline.sync_with_graph', 'Sync with Graph')}
            </Button>
          )}
        </Card>
      )}

      {/* Batch Translation Modal */}
      <Dialog.Root open={showBatchModal} onOpenChange={setShowBatchModal}>
        <Dialog.Content maxWidth='600px'>
          <Dialog.Title>
            {t('localization.table.batch_translate_modal.title', 'Batch translate timeline')}: {timelineName}
          </Dialog.Title>
          <Dialog.Description size='2' mb='4'>
            {t('localization.table.batch_translate_modal.subtitle', 'Translate all nodes in this timeline using AI')}
          </Dialog.Description>

          {/* Target Languages Selection */}
          {projectLocalization && (
            <Card style={{padding: '16px', marginBottom: '16px'}}>
              <Text size='2' weight='medium' mb='3' style={{display: 'block'}}>
                {t('localization.table.batch_translate_modal.target_languages', 'Select target languages')}:
              </Text>
              <Flex direction='column' gap='2'>
                {/* Select All / Deselect All */}
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '8px', borderBottom: '1px solid var(--gray-6)'}}>
                  <input
                    type='checkbox'
                    checked={selectedTargetLanguages.length === projectLocalization.targetLanguages.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Выбрать все языки
                        setSelectedTargetLanguages([...projectLocalization.targetLanguages]);
                        // Пересчитываем оценку для всех языков
                        handleLanguageSelectionChange(projectLocalization.targetLanguages[0], true, projectLocalization.targetLanguages);
                      } else {
                        // Снять выбор со всех языков
                        setSelectedTargetLanguages([]);
                        setBatchEstimate(null);
                      }
                    }}
                    style={{margin: 0}}
                  />
                  <Text size='2' weight='medium'>
                    {selectedTargetLanguages.length === projectLocalization.targetLanguages.length
                      ? t('localization.table.batch_translate_modal.deselect_all', 'Deselect all')
                      : t('localization.table.batch_translate_modal.select_all', 'Select all')}
                  </Text>
                  <Text size='1' color='gray'>
                    ({selectedTargetLanguages.length}/{projectLocalization.targetLanguages.length})
                  </Text>
                </label>

                {/* Individual Language Selection */}
                {projectLocalization.targetLanguages.map((language) => (
                  <label key={language} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type='checkbox' checked={selectedTargetLanguages.includes(language)} onChange={(e) => handleLanguageSelectionChange(language, e.target.checked)} style={{margin: 0}} />
                    <Text size='2'>{getLanguageName(language)}</Text>
                  </label>
                ))}
              </Flex>
              {selectedTargetLanguages.length === 0 && (
                <Text size='1' color='red' mt='2' style={{display: 'block'}}>
                  {t('localization.table.batch_translate_modal.select_languages_warning', 'Please select at least one target language')}
                </Text>
              )}
            </Card>
          )}

          {batchEstimate && selectedTargetLanguages.length > 0 && (
            <Box mb='4'>
              <Flex direction='column' gap='3'>
                {/* Cost Summary */}
                <Card style={{padding: '16px', backgroundColor: 'var(--accent-2)'}}>
                  <Flex direction='column' gap='2'>
                    <Text size='2' weight='bold'>
                      {t('localization.table.batch_translate_modal.cost_summary.nodes_to_translate', 'Nodes to translate')}: {batchEstimate.nodesToTranslate}
                    </Text>
                    <Text size='2' color='gray'>
                      {t('localization.table.batch_translate_modal.cost_summary.already_translated', 'Already translated')}: {batchEstimate.alreadyTranslated}
                    </Text>
                    <Text size='2' color='blue'>
                      {t('localization.table.batch_translate_modal.cost_summary.selected_languages', 'Selected languages')}: {selectedTargetLanguages.map((lang) => getLanguageName(lang)).join(', ')}
                    </Text>
                    <Flex justify='between'>
                      <Text size='2' weight='medium'>
                        {t('localization.table.batch_translate_modal.cost_summary.total_cost', 'Total cost')}:
                      </Text>
                      <Text size='2' weight='bold' color={batchEstimate.userBalance.sufficient ? 'green' : 'red'}>
                        {batchEstimate.cost.totalCredits} credits
                      </Text>
                    </Flex>
                    <Flex justify='between'>
                      <Text size='2'>{t('localization.table.batch_translate_modal.cost_summary.estimated_time', 'Estimated time')}:</Text>
                      <Text size='2'>{batchEstimate.estimation.durationText}</Text>
                    </Flex>
                    <Flex justify='between'>
                      <Text size='2'>{t('localization.table.batch_translate_modal.cost_summary.credits_available', 'Available credits')}:</Text>
                      <Text size='2' color={batchEstimate.userBalance.sufficient ? 'green' : 'red'}>
                        {batchEstimate.userBalance.available}
                      </Text>
                    </Flex>
                  </Flex>
                </Card>

                {!batchEstimate.userBalance.sufficient && (
                  <Card style={{padding: '12px', backgroundColor: 'var(--red-2)'}}>
                    <Flex align='center' gap='2'>
                      <AlertCircle size={16} color='var(--red-11)' />
                      <Text size='2' color='red'>
                        {t('localization.table.batch_translate_modal.insufficient_credits', 'Insufficient credits')}
                      </Text>
                    </Flex>
                  </Card>
                )}
              </Flex>
            </Box>
          )}

          <Flex justify='end' gap='3' mt='4'>
            <Dialog.Close>
              <Button variant='soft' color='gray'>
                {t('localization.table.batch_translate_modal.cancel', 'Cancel')}
              </Button>
            </Dialog.Close>
            <Button
              disabled={selectedTargetLanguages.length === 0 || !batchEstimate?.userBalance.sufficient || batchInProgress}
              onClick={() =>
                handleStartBatchTranslation({
                  qualityLevel: 'fast',
                  skipExisting: true
                })
              }
            >
              <Zap size={16} />
              {t('localization.table.batch_translate_modal.start_translation', 'Start translation')}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Batch Progress */}
      {batchInProgress && batchProgress && (
        <Card
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '400px',
            padding: '16px',
            zIndex: 1000,
            boxShadow: 'var(--shadow-5)'
          }}
        >
          <Flex direction='column' gap='3'>
            <Flex align='center' justify='between'>
              <Text size='2' weight='bold'>
                {batchProgress.status === 'completed'
                  ? t('localization.table.batch_progress.completed', 'Translation completed!')
                  : batchProgress.status === 'failed'
                    ? t('localization.table.batch_progress.failed', 'Some translations failed')
                    : batchProgress.status === 'cancelled'
                      ? t('localization.table.batch_progress.cancelled', 'Translation cancelled')
                      : t('localization.table.batch_progress.translating', 'Translating timeline...')}
              </Text>
              {batchProgress.status === 'completed' ? (
                <CheckCircle2 size={16} color='var(--green-11)' />
              ) : batchProgress.status === 'failed' ? (
                <AlertCircle size={16} color='var(--red-11)' />
              ) : batchProgress.status === 'cancelled' ? (
                <AlertCircle size={16} color='var(--orange-11)' />
              ) : (
                <ReloadIcon className='animate-spin' />
              )}
            </Flex>

            {/* Language-specific Progress Bars with Node Progress */}
            {batchProgress.languageProgress && (
              <Box>
                <Text size='1' color='gray' mb='2' style={{display: 'block'}}>
                  {t('localization.table.batch_progress.language_progress', 'Progress by language')}:
                </Text>
                <Flex direction='column' gap='3'>
                  {Object.entries(batchProgress.languageProgress).map(([language, langProgress]) => {
                    // Вычисляем прогресс по узлам для каждого языка
                    const nodeProgress =
                      langProgress.status === 'completed'
                        ? 100
                        : langProgress.status === 'failed'
                          ? 0
                          : langProgress.status === 'translating' && langProgress.currentNode !== undefined && langProgress.totalNodes
                            ? (langProgress.currentNode / langProgress.totalNodes) * 100
                            : 0;

                    const progressColor = langProgress.status === 'completed' ? 'green' : langProgress.status === 'failed' ? 'red' : langProgress.status === 'translating' ? 'blue' : 'gray';

                    return (
                      <Box key={language}>
                        <Flex justify='between' align='center' mb='1'>
                          <Text size='2' weight='medium'>
                            {getLanguageName(language)}
                          </Text>
                          <Flex align='center' gap='1'>
                            {langProgress.status === 'completed' ? (
                              <CheckCircle2 size={14} color='var(--green-11)' />
                            ) : langProgress.status === 'failed' ? (
                              <AlertCircle size={14} color='var(--red-11)' />
                            ) : langProgress.status === 'translating' ? (
                              <ReloadIcon className='animate-spin' width='14' height='14' />
                            ) : (
                              <Clock size={14} color='var(--gray-9)' />
                            )}
                            <Text size='1' color='gray'>
                              {langProgress.status === 'pending'
                                ? t('localization.table.batch_progress.status.pending', 'Pending')
                                : langProgress.status === 'translating'
                                  ? t('localization.table.batch_progress.status.translating', 'Translating...')
                                  : langProgress.status === 'completed'
                                    ? t('localization.table.batch_progress.status.completed', 'Completed')
                                    : t('localization.table.batch_progress.status.failed', 'Failed')}
                            </Text>
                          </Flex>
                        </Flex>

                        <Progress value={nodeProgress} color={progressColor as any} size='2' />

                        <Flex justify='between' mt='1'>
                          <Text size='1' color='gray'>
                            {langProgress.currentNode || 0} / {langProgress.totalNodes || 0} {t('localization.table.batch_progress.nodes', 'nodes')}
                          </Text>
                          <Text size='1' color='gray'>
                            {Math.round(nodeProgress)}%
                          </Text>
                        </Flex>
                      </Box>
                    );
                  })}
                </Flex>
              </Box>
            )}

            {batchProgress.results &&
              (batchProgress.status === 'completed' || batchProgress.status === 'failed' || batchProgress.status === 'cancelled') &&
              (() => {
                return (
                  <Text size='2'>
                    {t('localization.table.batch_progress.results', 'Results: {{successful}}/{{total}} successful', {
                      successful: batchProgress.results.successful,
                      total: batchProgress.results.totalProcessed
                    })}
                  </Text>
                );
              })()}
          </Flex>
        </Card>
      )}

      {/* Модальное окно с результатами пакетного перевода */}
      <Dialog.Root
        open={batchResultsModal?.isOpen || false}
        onOpenChange={(open) => {
          if (!open) {
            setBatchResultsModal(null);
          }
        }}
      >
        <Dialog.Content maxWidth='500px'>
          <Dialog.Title>
            <Flex align='center' gap='2'>
              {(batchResultsModal?.totalErrors || 0) > 0 ? <AlertCircle size={20} color='var(--orange-11)' /> : <CheckCircle2 size={20} color='var(--green-11)' />}
              {t('localization.batch_results.title', 'Translation Results')}
            </Flex>
          </Dialog.Title>

          <Dialog.Description>
            {(batchResultsModal?.totalErrors || 0) > 0
              ? t('localization.batch_results.description_with_errors', 'Translation completed with some issues')
              : t('localization.batch_results.description_success', 'Translation completed successfully')}
          </Dialog.Description>

          <Flex direction='column' gap='4' mt='4'>
            {/* Общая статистика */}
            <Card>
              <Box p='4'>
                <Grid columns='2' gap='4'>
                  <Box style={{textAlign: 'center'}}>
                    <Text size='3' weight='bold' color='green'>
                      {batchResultsModal?.totalTranslated || 0}
                    </Text>
                    <Text size='2' color='gray' style={{display: 'block'}}>
                      {t('localization.batch_results.translated_strings', 'Translated strings')}
                    </Text>
                  </Box>

                  <Box style={{textAlign: 'center'}}>
                    <Text size='3' weight='bold' color={batchResultsModal?.totalErrors ? 'red' : 'gray'}>
                      {batchResultsModal?.totalErrors || 0}
                    </Text>
                    <Text size='2' color='gray' style={{display: 'block'}}>
                      {t('localization.batch_results.errors', 'Errors')}
                    </Text>
                  </Box>
                </Grid>
              </Box>
            </Card>

            {/* Детали по языкам */}
            {batchResultsModal?.languageResults && batchResultsModal.languageResults.length > 1 && (
              <Card>
                <Box p='4'>
                  <Text size='3' weight='medium' mb='3'>
                    {t('localization.batch_results.by_language', 'By Language')}
                  </Text>

                  <Flex direction='column' gap='2'>
                    {batchResultsModal.languageResults.map((langResult) => (
                      <Flex key={langResult.language} justify='between' align='center'>
                        <Flex align='center' gap='2'>
                          {langResult.success ? <CheckCircle2 size={14} color='var(--green-11)' /> : <AlertCircle size={14} color='var(--red-11)' />}
                          <Text size='2'>{getLanguageName(langResult.language)}</Text>
                        </Flex>

                        <Text size='2' color={langResult.success ? 'green' : 'red'}>
                          {langResult.success
                            ? `${langResult.translatedCount || 0} ${t('localization.batch_results.strings', 'strings')}`
                            : langResult.error === 'incomplete_translation'
                              ? t('localization.batch_results.incomplete', '{{actual}}/{{expected}} strings', {
                                  actual: langResult.translatedCount || 0,
                                  expected: langResult.expectedCount || 0
                                })
                              : t('localization.batch_results.failed', 'Failed')}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              </Card>
            )}
          </Flex>

          <Flex gap='3' mt='4' justify='end'>
            <Dialog.Close>
              <Button>{t('common.ok', 'OK')}</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};
