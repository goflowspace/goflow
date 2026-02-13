import {useCallback, useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useReactFlow} from '@xyflow/react';
import debounce from 'lodash/debounce';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {NodeType, SearchResult, useSearchStore} from '../store/useSearchStore';
import {buildEditorPath} from '../utils/navigation';
import {useCurrentProject} from './useCurrentProject';
import {useCurrentRoute} from './useCurrentRoute';

/**
 * Хук для выполнения поиска по узлам
 */
export function useSearch() {
  const {searchQuery, activeFilter, addSearchResults, clearSearchResults} = useSearchStore();
  const {currentGraphId, layers} = useGraphStore();
  const {selectNode} = useCanvasStore();
  const router = useRouter();
  const reactFlowInstance = useReactFlow();
  const {projectId} = useCurrentProject();
  const {timelineId} = useCurrentRoute();

  // Состояние для отслеживания навигации к узлу
  const [pendingNodeNavigation, setPendingNodeNavigation] = useState<{nodeId: string; layerId: string} | null>(null);

  /**
   * Рекурсивный поиск по всем слоям
   * @param filterOverride Опциональный фильтр типа узлов, который перезаписывает фильтр из хранилища
   */
  const searchInAllLayers = useCallback(
    (filterOverride?: NodeType) => {
      if (!searchQuery.trim()) {
        clearSearchResults();
        return;
      }

      // Используем переданный фильтр или берем из хранилища
      const currentFilter = filterOverride || useSearchStore.getState().activeFilter;
      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      // Рекурсивная функция для поиска в слое и его дочерних слоях
      const searchInLayer = (layerId: string) => {
        const layer = layers[layerId];
        if (!layer) return;

        // Поиск по имени и описанию самого слоя
        if (currentFilter === 'all' || currentFilter === 'layer') {
          const layerName = layer.name.toLowerCase();

          if (layerName.includes(query)) {
            results.push({
              id: layer.id,
              type: 'layer',
              text: '',
              title: layer.name,
              matchField: 'title',
              layerId: layerId,
              layerName: layer.name
            });
          }

          // Поиск по описанию слоя, если оно есть
          if (layer.description && typeof layer.description === 'string') {
            const layerDescription = layer.description.toLowerCase();
            if (layerDescription.includes(query)) {
              results.push({
                id: layer.id,
                type: 'layer',
                text: layer.description,
                title: layer.name,
                matchField: 'text',
                layerId: layerId,
                layerName: layer.name
              });
            }
          }
        }

        // Поиск по всем узлам в текущем слое
        Object.values(layer.nodes).forEach((node) => {
          // ВАЖНО: сначала проверяем, если это слой, обходим его дочерние узлы рекурсивно
          // НЕЗАВИСИМО от текущего фильтра, чтобы не пропустить узлы в дочерних слоях
          if (node.type === 'layer') {
            searchInLayer(node.id);
          }

          // Фильтрация по типу узла, если выбран конкретный тип
          if (currentFilter !== 'all' && String(node.type) !== String(currentFilter)) {
            return;
          }

          // Флаг для отслеживания, был ли уже добавлен этот узел
          let isNodeAdded = false;

          // Поиск по ID
          if (node.id.toLowerCase().includes(query)) {
            results.push({
              id: node.id,
              type: node.type as NodeType,
              text: '',
              matchField: 'id',
              layerId: layerId,
              layerName: layer.name
            });
            isNodeAdded = true;
          }

          // Поиск по тексту только если узел еще не добавлен
          if (!isNodeAdded && 'data' in node) {
            // Для узлов с полем text
            if (node.data && 'text' in node.data && typeof node.data.text === 'string') {
              const nodeText = node.data.text.toLowerCase();

              if (nodeText.includes(query)) {
                results.push({
                  id: node.id,
                  type: node.type as NodeType,
                  text: node.data.text,
                  matchField: 'text',
                  layerId: layerId,
                  layerName: layer.name
                });
                isNodeAdded = true;
              }
            }

            // Для нарративных узлов с полем title (если еще не добавлен)
            if (!isNodeAdded && node.type === 'narrative' && node.data && 'title' in node.data && typeof node.data.title === 'string') {
              const nodeTitle = node.data.title.toLowerCase();

              if (nodeTitle.includes(query)) {
                results.push({
                  id: node.id,
                  type: node.type as NodeType,
                  text: node.data.text || '',
                  title: node.data.title,
                  matchField: 'title',
                  layerId: layerId,
                  layerName: layer.name
                });
              }
            }
          }
        });
      };

      // Начинаем поиск с корневого слоя
      searchInLayer('root');

      // Обновляем результаты поиска
      addSearchResults(results);
    },
    [searchQuery, layers, addSearchResults, clearSearchResults]
  );

  // Дебоунс для поиска при вводе текста
  const debouncedSearch = useCallback(debounce(searchInAllLayers, 300), [searchInAllLayers]);

  // Запускаем поиск при изменении запроса или фильтра
  useEffect(() => {
    if (searchQuery) {
      debouncedSearch();
    } else {
      clearSearchResults();
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, activeFilter, debouncedSearch, clearSearchResults]);

  // Эффект для отслеживания смены слоя и завершения отложенной навигации
  useEffect(() => {
    // Если есть отложенная навигация и мы находимся в нужном слое
    if (pendingNodeNavigation && pendingNodeNavigation.layerId === currentGraphId) {
      // Завершаем навигацию к узлу
      const {nodeId} = pendingNodeNavigation;

      // Даем время для полной загрузки слоя
      setTimeout(() => {
        // Выполняем выделение узла
        handleNodeSelection(nodeId);

        // Сбрасываем флаг isNavigatingFromSearch после выделения с задержкой,
        // чтобы другие компоненты успели его использовать
        setTimeout(() => {
          // Проверяем, что флаг всё еще активен (он мог быть сброшен другими компонентами)
          if (useSearchStore.getState().isNavigatingFromSearch) {
            useSearchStore.getState().setIsNavigatingFromSearch(false);
          }
        }, 300);

        // Сбрасываем отложенную навигацию
        setPendingNodeNavigation(null);
      }, 500); // Немного увеличиваем задержку для надежности
    }
  }, [pendingNodeNavigation, currentGraphId]);

  /**
   * Функция для навигации к узлу
   */
  const navigateToNode = useCallback(
    (nodeId: string, layerId?: string) => {
      // Если нет ID слоя, ничего не делаем
      if (!layerId) {
        return;
      }

      // Устанавливаем флаг, что навигация происходит из результатов поиска
      // Это позволит предотвратить автоматический переход в слой
      useSearchStore.getState().setIsNavigatingFromSearch(true);

      // Получаем информацию о типе узла из активного результата поиска
      const searchState = useSearchStore.getState();
      const activeIndex = searchState.activeResultIndex;
      const activeResult = activeIndex !== null ? searchState.searchResults[activeIndex] : null;

      // Проверка типа узла из результатов поиска (если доступно)
      const isLayerNodeFromSearch = activeResult && activeResult.id === nodeId && activeResult.type === 'layer';

      // Проверяем напрямую, является ли узел слоем через проверку существования слоя
      const isDirectLayerNode = nodeId in layers; // Слой существует с таким ID
      const isLayerNode = isDirectLayerNode || isLayerNodeFromSearch || nodeId === layerId;

      // Для узлов типа 'layer' нам нужно остаться в том же слое, где он находится
      if (isLayerNode) {
        // Определяем родительский слой
        const parentLayerId = layers[nodeId]?.parentLayerId || 'root';

        if (parentLayerId !== currentGraphId) {
          // Запоминаем информацию о навигации
          setPendingNodeNavigation({nodeId, layerId: parentLayerId});

          // Переходим в РОДИТЕЛЬСКИЙ слой
          if (projectId) {
            router.push(buildEditorPath(projectId, timelineId, parentLayerId === 'root' ? undefined : parentLayerId));
          }
        } else {
          // Если мы уже в нужном слое, просто выбираем узел
          handleNodeSelection(nodeId);
        }
      }
      // Стандартная логика для всех остальных типов узлов
      else {
        // Определяем, нужен ли переход в другой слой
        const needLayerChange = layerId !== currentGraphId;

        // Если нужно, переходим в другой слой через роутер
        if (needLayerChange) {
          // Запоминаем информацию о навигации
          setPendingNodeNavigation({nodeId, layerId});

          // Используем router для навигации
          if (projectId) {
            router.push(buildEditorPath(projectId, timelineId, layerId === 'root' ? undefined : layerId));
          }
        } else {
          // Если мы уже в нужном слое, просто выбираем узел
          handleNodeSelection(nodeId);
        }
      }
    },
    [currentGraphId, router, layers, projectId, timelineId]
  );

  /**
   * Вспомогательная функция для выбора узла и центрирования вьюпорта
   */
  const handleNodeSelection = useCallback(
    (nodeId: string) => {
      // Проверяем, является ли узел слоем (важное замечание: в React Go Flow слои могут не иметь тип "layer")
      const node = reactFlowInstance?.getNode(nodeId);
      const isLayerNode = node && node.type === 'layer';

      // Выбираем узел через Canvas Store
      // ВНИМАНИЕ: для слоев это может автоматически вызвать навигацию в слой
      // Если это поведение есть в Canvas Store, его нужно изменить там
      selectNode(nodeId);

      // Находим DOM элемент узла для подсветки
      const nodeElement = document.getElementById(`node-${nodeId}`);
      if (nodeElement) {
        // Добавляем подсветку для узла
        nodeElement.classList.add('highlighted-node');
        setTimeout(() => {
          nodeElement.classList.remove('highlighted-node');
        }, 2000);
      }

      // Используем React Go Flow API для центрирования вьюпорта на узле
      if (reactFlowInstance) {
        if (node) {
          // Проверяем тип узла
          if (node.type === 'choice') {
            // Для узла Choice просто центрируем вьюпорт на нем (обновленная логика)
            reactFlowInstance.fitView({
              nodes: [{id: nodeId}],
              duration: 800,
              padding: 0.2,
              maxZoom: 1.2
            });
            return;
          }

          // Для узлов типа "layer" и других стандартных узлов одинаковое центрирование
          reactFlowInstance.fitView({
            nodes: [{id: nodeId}],
            duration: 800,
            padding: 0.2,
            maxZoom: 1.2
          });
        }
      }
    },
    [selectNode, reactFlowInstance, layers]
  );

  return {
    performSearch: searchInAllLayers,
    navigateToNode
  };
}
