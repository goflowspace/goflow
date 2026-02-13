import {API_URL, api} from './api';
import {PlaybackData, PlaybackLocalizationData, cleanupOldPlaybackData, deletePlaybackData, loadPlaybackData, loadProject, savePlaybackData} from './dbService';

/**
 * Сервис для работы с данными воспроизведения в IndexedDB
 * Заменяет localStorage для более надежного хранения данных
 */
export class PlaybackStorageService {
  /**
   * Генерирует уникальный ID для данных воспроизведения
   */
  private static generatePlaybackId(projectId: string, timelineId: string): string {
    return `${projectId}_${timelineId}`;
  }

  /**
   * Сохраняет данные для воспроизведения в IndexedDB
   */
  public static async savePlaybackData(projectId: string, teamId: string, timelineId: string, projectName: string, startNodeId?: string): Promise<string> {
    try {
      console.log('Saving playback data to IndexedDB...', {projectId, timelineId, startNodeId});

      // Очищаем старые данные в фоне
      cleanupOldPlaybackData().catch((error) => {
        console.warn('Failed to cleanup old playback data:', error);
      });

      // Загружаем данные проекта из IndexedDB
      const projectData = await loadProject(projectId);
      if (!projectData) {
        throw new Error(`Project ${projectId} not found in IndexedDB`);
      }

      // Получаем данные таймлайна
      const timeline = projectData.timelines[timelineId];
      if (!timeline) {
        throw new Error(`Timeline ${timelineId} not found in project ${projectId}`);
      }

      // Преобразуем данные для воспроизведения
      const {nodes, edges} = this.prepareDataForPlayback(timeline.layers || {});

      // Загружаем данные локализации
      const localizationData = await this.loadProjectLocalization(projectId, timelineId);

      // Создаем объект для сохранения
      const playbackData: PlaybackData = {
        id: this.generatePlaybackId(projectId, timelineId),
        projectId,
        teamId,
        timelineId,
        projectName,
        data: {
          nodes,
          edges,
          variables: timeline.variables || []
        },
        localization: localizationData || undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          startNodeId
        },
        _lastModified: Date.now()
      };

      // Сохраняем в IndexedDB
      await savePlaybackData(playbackData);

      console.log('Playback data saved successfully:', playbackData.id);
      return playbackData.id;
    } catch (error) {
      console.error('Failed to save playback data:', error);
      throw error;
    }
  }

  /**
   * Загружает данные для воспроизведения из IndexedDB
   */
  public static async loadPlaybackData(playbackId: string): Promise<PlaybackData | null> {
    try {
      const data = await loadPlaybackData(playbackId);
      if (!data) {
        console.warn('Playback data not found:', playbackId);
        return null;
      }

      // Проверяем, не устарели ли данные (старше 1 часа)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (data._lastModified < oneHourAgo) {
        console.warn('Playback data is too old, removing it:', playbackId);
        this.deletePlaybackData(playbackId).catch(console.error);
        return null;
      }

      console.log('Playback data loaded successfully:', playbackId);
      return data;
    } catch (error) {
      console.error('Failed to load playback data:', error);
      return null;
    }
  }

  /**
   * Удаляет данные воспроизведения
   */
  public static async deletePlaybackData(playbackId: string): Promise<void> {
    try {
      await deletePlaybackData(playbackId);
      console.log('Playback data deleted:', playbackId);
    } catch (error) {
      console.error('Failed to delete playback data:', error);
    }
  }

  /**
   * Загружает данные локализации для проекта
   */
  private static async loadProjectLocalization(projectId: string, timelineId: string): Promise<PlaybackLocalizationData | null> {
    try {
      console.log('Loading localization data for project:', projectId, 'timeline:', timelineId);

      // Получаем настройки локализации проекта
      const localizationResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}`);
      if (!localizationResponse.ok) {
        if (localizationResponse.status === 404) {
          console.log('No localization settings found for project:', projectId);
          return null;
        }
        throw new Error(`Failed to fetch project localization: ${localizationResponse.status}`);
      }

      const localizationSettings = await localizationResponse.json();
      const settings = localizationSettings.data;

      if (!settings || !settings.targetLanguages || settings.targetLanguages.length === 0) {
        console.log('No target languages configured for project:', projectId);
        return null;
      }

      // Получаем тексты для всех целевых языков
      const allLocalizations: any[] = [];

      for (const targetLanguage of settings.targetLanguages) {
        try {
          const textsResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/timelines/${timelineId}/texts?language=${targetLanguage}`);

          if (textsResponse.ok) {
            const textsData = await textsResponse.json();
            const texts = textsData.data || [];

            // Добавляем тексты этого языка
            const processedTexts = texts.map((text: any) => ({
              nodeId: text.nodeId,
              layerId: text.layerId || 'root',
              fieldPath: text.fieldPath,
              targetLanguage: text.targetLanguage,
              originalText: text.originalText,
              translatedText: text.translatedText,
              status: text.status || 'PENDING'
            }));

            allLocalizations.push(...processedTexts);
          }
        } catch (error) {
          console.warn(`Error loading texts for language ${targetLanguage}:`, error);
        }
      }

      if (allLocalizations.length === 0) {
        return null;
      }

      // Преобразуем в формат для playback
      const localizationData: PlaybackLocalizationData = {
        baseLanguage: settings.baseLanguage,
        targetLanguages: settings.targetLanguages,
        localizations: allLocalizations
      };

      return localizationData;
    } catch (error) {
      console.warn('Failed to load localization data:', error);
      return null; // Не прерываем создание playback из-за проблем с локализацией
    }
  }

  /**
   * Преобразует данные слоев в формат для воспроизведения
   */
  private static prepareDataForPlayback(layers: any): {nodes: any[]; edges: any[]} {
    if (!layers || !layers.root) {
      return {nodes: [], edges: []};
    }

    return this.flattenLayer('root', layers);
  }

  /**
   * Рекурсивно преобразует слой в плоские массивы узлов и ребер
   */
  private static flattenLayer(layerId: string, layers: any, parentLayerName: string = ''): {nodes: any[]; edges: any[]} {
    const layer = layers[layerId];
    if (!layer) return {nodes: [], edges: []};

    const layerName = layer.name || layerId;
    const nodes: any[] = [];
    const edges: any[] = [];

    // Добавляем узлы текущего слоя
    for (const nodeId of layer.nodeIds || []) {
      const node = layer.nodes[nodeId];
      if (!node) continue;

      // НЕ добавляем узел слоя в итоговый граф
      if (node.type === 'layer') {
        // Добавляем концовки слоя как реальные узлы ПЕРЕД рекурсивной обработкой
        const layerNode = node as any;

        // Добавляем startingNodes как реальные узлы
        if (layerNode.startingNodes && Array.isArray(layerNode.startingNodes)) {
          for (const startingNode of layerNode.startingNodes) {
            const startingNodeWithInfo: any = {
              id: startingNode.id,
              type: startingNode.type,
              coordinates: startingNode.coordinates || {x: 0, y: 0},
              data: {
                ...(startingNode.data || {}),
                layerInfo: {
                  layerId: node.id,
                  layerName: layers[node.id]?.name || node.id,
                  isLayerEndpoint: true,
                  endpointType: 'starting'
                }
              }
            };

            // Добавляем операции для нарративных узлов
            if (startingNode.type === 'narrative' && startingNode.operations) {
              startingNodeWithInfo.operations = startingNode.operations;
            }

            nodes.push(startingNodeWithInfo);
          }
        }

        // Добавляем endingNodes как реальные узлы
        if (layerNode.endingNodes && Array.isArray(layerNode.endingNodes)) {
          for (const endingNode of layerNode.endingNodes) {
            const endingNodeWithInfo: any = {
              id: endingNode.id,
              type: endingNode.type,
              coordinates: endingNode.coordinates || {x: 0, y: 0},
              data: {
                ...(endingNode.data || {}),
                layerInfo: {
                  layerId: node.id,
                  layerName: layers[node.id]?.name || node.id,
                  isLayerEndpoint: true,
                  endpointType: 'ending'
                }
              }
            };

            // Добавляем операции для нарративных узлов
            if (endingNode.type === 'narrative' && endingNode.operations) {
              endingNodeWithInfo.operations = endingNode.operations;
            }

            nodes.push(endingNodeWithInfo);
          }
        }

        // Рекурсивно обрабатываем вложенные слои
        const nestedLayerParent = parentLayerName ? `${parentLayerName} > ${layerName}` : layerName;
        const {nodes: layerNodes, edges: layerEdges} = this.flattenLayer(node.id, layers, nestedLayerParent);
        nodes.push(...layerNodes);
        edges.push(...layerEdges);
      } else {
        // Добавляем обычные узлы (narrative, choice, note)
        const transformedNode: any = {
          id: node.id,
          type: node.type,
          coordinates: node.coordinates || {x: 0, y: 0},
          data: node.data || {}
        };

        // Добавляем операции для нарративных узлов
        if (node.type === 'narrative' && node.operations) {
          transformedNode.operations = node.operations;
        }

        // Добавляем информацию о слое для всех типов узлов
        transformedNode.data.layerInfo = {
          layerId: layerId,
          layerName: layerName !== 'root' ? layerName : ''
        };

        nodes.push(transformedNode);
      }
    }

    // Преобразуем ребра
    for (const edgeId in layer.edges || {}) {
      const link = layer.edges[edgeId];
      if (!link) continue;

      // Обрабатываем связи с концовками слоев
      if (link.sourceHandle || link.targetHandle) {
        // Связь через концовки слоя
        if (link.sourceHandle && link.targetHandle) {
          // Связь между двумя слоями через концовки - создаем прямую связь между концовками
          const sourceNode = layer.nodes[link.startNodeId];
          const targetNode = layer.nodes[link.endNodeId];

          if (sourceNode?.type === 'layer' && targetNode?.type === 'layer') {
            // Находим концовки в узлах слоев
            const sourceLayerNode = sourceNode as any;
            const targetLayerNode = targetNode as any;

            const endingNode = sourceLayerNode.endingNodes?.find((n: any) => n.id === link.sourceHandle);
            const startingNode = targetLayerNode.startingNodes?.find((n: any) => n.id === link.targetHandle);

            if (endingNode && startingNode) {
              const edge: any = {
                id: link.id,
                source: endingNode.id, // ID концовки источника
                target: startingNode.id, // ID концовки цели
                data: link.conditions ? {conditions: link.conditions} : undefined
              };
              edges.push(edge);
            }
          }
        } else if (link.sourceHandle) {
          // Связь от концовки слоя к обычному узлу
          const sourceNode = layer.nodes[link.startNodeId];
          if (sourceNode?.type === 'layer') {
            // Находим концовку в развернутом слое
            const sourceLayerNode = sourceNode as any;
            const endingNode = sourceLayerNode.endingNodes?.find((n: any) => n.id === link.sourceHandle);
            if (endingNode) {
              const edge: any = {
                id: link.id,
                source: endingNode.id, // Используем ID концовки
                target: link.endNodeId,
                data: link.conditions ? {conditions: link.conditions} : undefined
              };
              edges.push(edge);
            }
          }
        } else if (link.targetHandle) {
          // Связь от обычного узла к концовке слоя
          const targetNode = layer.nodes[link.endNodeId];
          if (targetNode?.type === 'layer') {
            // Находим концовку в развернутом слое
            const targetLayerNode = targetNode as any;
            const startingNode = targetLayerNode.startingNodes?.find((n: any) => n.id === link.targetHandle);
            if (startingNode) {
              const edge: any = {
                id: link.id,
                source: link.startNodeId,
                target: startingNode.id, // Используем ID концовки
                data: link.conditions ? {conditions: link.conditions} : undefined
              };
              edges.push(edge);
            }
          }
        }
      } else {
        // Обычная связь между узлами
        // Проверяем, что оба узла не являются слоями (иначе связь будет "висячей")
        const sourceNode = layer.nodes[link.startNodeId];
        const targetNode = layer.nodes[link.endNodeId];

        // Пропускаем связи к узлам слоев или от узлов слоев (без концовок)
        if (sourceNode?.type === 'layer' || targetNode?.type === 'layer') {
          continue; // Эта связь к/от узла слоя без концовок - пропускаем
        }

        const edge: any = {
          id: link.id,
          source: link.startNodeId,
          target: link.endNodeId,
          data: link.conditions ? {conditions: link.conditions} : undefined
        };

        edges.push(edge);
      }
    }

    return {nodes, edges};
  }

  /**
   * Создает URL для воспроизведения с данными из IndexedDB
   */
  public static buildPlaybackUrl(projectId: string, timelineId: string, startNodeId?: string): string {
    const playbackId = this.generatePlaybackId(projectId, timelineId);
    const baseUrl = `/${projectId}/play/${timelineId}`;

    const params = new URLSearchParams();
    params.set('playbackId', playbackId);
    if (startNodeId) {
      params.set('startNode', startNodeId);
    }

    return `${baseUrl}?${params.toString()}`;
  }
}
