'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';

import {ChevronDownIcon, ChevronUpIcon, ComponentInstanceIcon, Cross2Icon, CursorArrowIcon, LayersIcon, MagnifyingGlassIcon, PaddingIcon, Pencil2Icon, StackIcon} from '@radix-ui/react-icons';
import {Badge, Box, Card, Flex, IconButton, Select, Text, Tooltip} from '@radix-ui/themes';
import {ProjectDataService} from '@services/projectDataService';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';

import {useSearch} from '../../hooks/useSearch';
import {trackSearchClose, trackSearchLaunch, trackSearchObjectSelection} from '../../services/analytics';
import {NodeType, SearchResult, useSearchStore} from '../../store/useSearchStore';

import s from './SearchPanel.module.scss';

const SearchPanel = () => {
  const {t} = useTranslation();
  const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  const NODE_TYPE_LABELS: Record<NodeType, string> = {
    narrative: t('search_bar.search_filter_narrow', 'Narratives'),
    choice: t('search_bar.search_filter_choice', 'Choices'),
    layer: t('search_bar.search_filter_layer', 'Layers'),
    note: t('search_bar.search_filter_note', 'Notes'),
    all: t('search_bar.search_filter_all', 'All types')
  };

  const {
    isSearchOpen,
    searchQuery,
    searchResults,
    activeFilter,
    activeResultIndex,
    toggleSearchPanel,
    setSearchQuery,
    setActiveFilter,
    nextResult,
    previousResult,
    setIsNavigatingFromSearch,
    openedByHotkey
  } = useSearchStore();

  const {navigateToNode, performSearch} = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Ref для отслеживания, было ли уже отправлено событие Launch
  const launchTrackedRef = useRef(false);

  // Состояния для управления фильтром и навигацией
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Обработчик клавиатурных событий для закрытия панели по Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        toggleSearchPanel();
        trackSearchClose(projectId, timelineId);
      }
    },
    [isSearchOpen, toggleSearchPanel]
  );

  // Добавляем глобальный обработчик клавиши Escape
  useEffect(() => {
    if (isSearchOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen, handleKeyDown]);

  // Фокус на поле ввода при открытии панели
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();

        // Если есть поисковый запрос, но нет результатов, выполняем поиск
        if (searchQuery && searchResults.length === 0) {
          performSearch(activeFilter);
        }
      }, 50);
    }
  }, [isSearchOpen, searchQuery, searchResults.length, activeFilter, performSearch]);

  // Отдельный эффект для отслеживания открытия поиска
  useEffect(() => {
    if (isSearchOpen) {
      // Отслеживаем открытие поиска только при изменении состояния и только один раз
      if (!launchTrackedRef.current) {
        // Проверяем, было ли открытие через хоткей или кнопку
        trackSearchLaunch(openedByHotkey ? 'hotkey' : 'mouse', projectId, timelineId);
        launchTrackedRef.current = true;
      }
    } else {
      // Сбрасываем флаг при закрытии панели
      launchTrackedRef.current = false;
    }
  }, [isSearchOpen, openedByHotkey]);

  // Обработка клика по результату поиска
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      // Явно устанавливаем флаг перед навигацией
      setIsNavigatingFromSearch(true);

      // Отслеживаем выбор объекта
      // Маппинг типов из NodeType в ObjectType для аналитики
      const objectTypeMapping: Record<NodeType, 'Narrative' | 'Choice' | 'Layer' | 'Note' | 'Link' | 'Condition'> = {
        narrative: 'Narrative',
        choice: 'Choice',
        layer: 'Layer',
        note: 'Note',
        all: 'Narrative' // Дефолтное значение для типа 'all'
      };

      trackSearchObjectSelection(objectTypeMapping[result.type], projectId, timelineId);

      navigateToNode(result.id, result.layerId);
    },
    [navigateToNode, setIsNavigatingFromSearch]
  );

  // Обработчик изменения значения фильтра
  const handleFilterChange = useCallback(
    (value: string) => {
      // 1. Устанавливаем новое значение фильтра
      setActiveFilter(value as NodeType);

      // 3. Выполняем поиск с новым фильтром
      const directSearch = () => {
        // Получаем текущий поисковый запрос
        const currentQuery = useSearchStore.getState().searchQuery;

        // Запускаем поиск только если есть запрос
        if (currentQuery) {
          // Явно передаем выбранный фильтр
          performSearch(value as NodeType);
        }
      };

      // 4. Небольшая задержка для обновления состояния
      setTimeout(directSearch, 50);
    },
    [setActiveFilter, performSearch]
  );

  // Предотвращаем закрытие при клике на кнопку фильтра
  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsFilterOpen((prev) => !prev);
  }, []);

  // Обработчик изменения поискового запроса
  const handleSearchQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setSearchQuery(newQuery);

      // Выполняем поиск с текущим активным фильтром
      if (newQuery) {
        setTimeout(() => {
          const currentFilter = useSearchStore.getState().activeFilter;
          performSearch(currentFilter);
        }, 100);
      }
    },
    [setSearchQuery, performSearch]
  );

  if (!isSearchOpen) return null;

  return (
    <div
      className={`${s.searchPanelContainer} ${s.searchPanelGlobal}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          toggleSearchPanel();
          trackSearchClose(projectId, timelineId);
        }
      }}
      tabIndex={-1}
    >
      <Card className={s.searchPanel}>
        <Flex className={s.searchHeader} align='center' gap='2'>
          <Box position='relative' style={{flexGrow: 1}}>
            <div className={s.searchInputWrapper}>
              <MagnifyingGlassIcon className={s.searchIcon} />
              <input
                ref={inputRef}
                className={s.searchInputField}
                placeholder={t('search_bar.search_field_placeholder', 'Type to search something…')}
                value={searchQuery}
                onChange={handleSearchQueryChange}
              />
              {searchQuery && (
                <Tooltip content={t('search_bar.clear_search', 'Clear search')} delayDuration={200}>
                  <IconButton
                    className={s.clearButton}
                    variant='ghost'
                    size='1'
                    onClick={() => {
                      setSearchQuery('');
                      setTimeout(() => performSearch('all'), 50);
                    }}
                  >
                    <Cross2Icon />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </Box>

          <Tooltip content={t('search_bar.search_filter_tip', 'Filter by type')} delayDuration={200}>
            <div className={s.filterSelectWrapper}>
              <Select.Root open={isFilterOpen} onOpenChange={setIsFilterOpen} defaultValue='all' value={activeFilter} onValueChange={handleFilterChange}>
                <Select.Trigger className={s.filterSelect} onClick={handleTriggerClick} />
                <Select.Content position='popper' className={s.filterContent}>
                  {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
                    <Select.Item key={type} value={type}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </Tooltip>

          <IconButton
            variant='ghost'
            onClick={() => {
              toggleSearchPanel();
              trackSearchClose(projectId, timelineId);
            }}
          >
            <Cross2Icon />
          </IconButton>
        </Flex>

        <Flex className={s.resultsHeader} justify='between' align='center'>
          <Text size='2' weight='medium'>
            {searchResults.length} {t('search_bar.results', 'results')}
          </Text>

          <Flex gap='1'>
            <IconButton variant='ghost' size='1' disabled={searchResults.length === 0} onClick={previousResult}>
              <ChevronUpIcon />
            </IconButton>
            <IconButton variant='ghost' size='1' disabled={searchResults.length === 0} onClick={nextResult}>
              <ChevronDownIcon />
            </IconButton>
          </Flex>
        </Flex>

        <Box className={s.searchResults}>
          {searchResults.length === 0 ? (
            <Box className={s.noResults}>
              <Text color='gray'>{t('search_bar.no_results', 'No results')}</Text>
            </Box>
          ) : (
            searchResults.map((result, index) => (
              <Box
                key={`${result.layerId}-${result.id}-${index}`}
                className={cls(s.resultItem, {
                  [s.activeResult]: index === activeResultIndex
                })}
                onClick={() => handleResultClick(result)}
              >
                <Box className={s.resultIcon}>
                  <Badge variant='solid' color={getColorForNodeType(result.type)}>
                    {getIconForNodeType(result.type)}
                  </Badge>
                </Box>
                <Box className={s.resultContent}>
                  {result.matchField === 'title' && result.title && (
                    <Text as='div' size='2' weight='medium'>
                      {highlightMatch(result.title, searchQuery)}
                    </Text>
                  )}
                  {result.matchField === 'id' && (
                    <Text as='div' size='2' weight='medium' className={s.resultId}>
                      {t('search_bar.id_prefix', 'ID')}: {highlightMatch(result.id, searchQuery)}
                    </Text>
                  )}
                  {(result.matchField === 'text' || result.matchField === 'title') && result.text && (
                    <Text as='div' size='1' color='gray' className={s.resultText}>
                      {result.matchField === 'text' ? highlightMatch(result.text, searchQuery) : truncateText(result.text, 100)}
                    </Text>
                  )}

                  {/* Отображаем слой, в котором найден результат */}
                  <Flex className={s.layerInfo} align='center' gap='1'>
                    <LayersIcon className={s.layerIcon} width='12' height='12' />
                    <Text size='1' color='gray'>
                      {result.layerName}
                    </Text>
                  </Flex>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Card>
    </div>
  );
};

// Вспомогательные функции
function getColorForNodeType(type: NodeType): 'orange' | 'blue' | 'green' | 'violet' | 'gray' {
  switch (type) {
    case 'narrative':
      return 'blue';
    case 'choice':
      return 'green';
    case 'layer':
      return 'violet';
    case 'note':
      return 'gray';
    default:
      return 'gray';
  }
}

function getIconForNodeType(type: NodeType): React.ReactNode {
  switch (type) {
    case 'narrative':
      return <PaddingIcon />;
    case 'choice':
      return <ComponentInstanceIcon />;
    case 'layer':
      return <StackIcon />;
    case 'note':
      return <Pencil2Icon />;
    default:
      return <CursorArrowIcon />;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} className={s.highlight}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export {SearchPanel};
