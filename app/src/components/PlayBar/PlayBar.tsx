'use client';

import {useCallback, useEffect, useState} from 'react';

import {useRouter} from 'next/navigation';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {useUnreadComments} from '@hooks/useUnreadComments';
import {useUserInitialization} from '@hooks/useUserInitialization';
import {BellIcon, ExclamationTriangleIcon, PlayIcon, Share2Icon} from '@radix-ui/react-icons';
import {Button, Dialog, Flex, Separator, Text} from '@radix-ui/themes';
import {trackPlaybackLaunch} from '@services/analytics';
import {CommentsAPI} from '@services/comments.api';
import {notificationService} from '@services/notificationService';
import {ProjectDataService} from '@services/projectDataService';
import {useReactFlow} from '@xyflow/react';
import {useTranslation} from 'react-i18next';
import {isCloud} from 'src/utils/edition';
import {buildEditorPath, buildPlayPath} from 'src/utils/navigation';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';
import {useProjectStore} from '@store/useProjectStore';
import {useVariablesStore} from '@store/useVariablesStore';

import {BibleQualityModal} from '@components/BibleQuality/BibleQualityModal';
import {BibleQualityWidget} from '@components/BibleQuality/BibleQualityWidget';
import {CommentsPanel} from '@components/Comments/CommentsPanel';
import {CreditsWidget} from '@components/CreditsWidget';

import {PlaybackStorageService} from '../../services/playbackStorageService';
import {getAggregatedPlayParams} from '../../utils/analyticsUtils';
import {validateGraph} from '../../utils/conditionValidator';
import {validateGraphConnectivity} from '../../utils/graphConnectivityValidator';
import {openHTMLPreview, saveStoryDataToStorage} from '../../utils/htmlPreview';
import {pluralizeRussian, pluralizeWithI18n} from '../../utils/pluralization';
import {getReliableTeamId, useReliableTeamId} from '../../utils/teamUtils';
import CollaborationAvatars from './CollaborationAvatars';
import CurrentUserAvatar from './CurrentUserAvatar';

import s from './playbar.module.scss';

const PlayBar = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const teamId = useReliableTeamId();
  const projectId = useCurrentProject().projectId || ProjectDataService.getStatus().currentProjectId || 'undefined';
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';
  const reactFlowInstance = useReactFlow();
  // Состояние для модальных окон предупреждения
  const [isConnectivityErrorModalOpen, setIsConnectivityErrorModalOpen] = useState(false);
  const [isConditionErrorModalOpen, setIsConditionErrorModalOpen] = useState(false);
  const [connectivityResult, setConnectivityResult] = useState<any>(null);
  const [conditionErrors, setConditionErrors] = useState<any>(null);
  // Состояние для отслеживания навигации к узлу
  const [pendingNodeNavigation, setPendingNodeNavigation] = useState<{nodeId: string; layerId: string} | null>(null);
  // Состояние для модального окна качества библии
  const [isBibleQualityModalOpen, setIsBibleQualityModalOpen] = useState(false);
  // Состояние для панели комментариев
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);

  // Инициализируем пользователя
  useUserInitialization();

  // Хук для получения количества непрочитанных комментариев
  const {unreadCount} = useUnreadComments();

  const {projectName} = useProjectStore();
  const {layers, currentGraphId} = useGraphStore();
  const {selectNode} = useCanvasStore();

  // Функция для позиционирования канваса на узле
  const positionCanvasOnNode = (nodeId: string) => {
    // Проверяем, что React Go Flow инстанс доступен
    if (!reactFlowInstance) {
      console.warn('React Go Flow instance not available');
      return;
    }

    // Находим узел в канвасе
    const node = reactFlowInstance.getNode(nodeId);
    if (!node) {
      console.warn(`Узел ${nodeId} не найден в текущем канвасе`);
      return;
    }

    // Выбираем узел
    selectNode(nodeId);

    // Добавляем подсветку для узла
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (nodeElement) {
      nodeElement.classList.add('highlighted-node');
      setTimeout(() => {
        nodeElement.classList.remove('highlighted-node');
      }, 2000);
    }

    // Центрируем вьюпорт на узле
    reactFlowInstance.fitView({
      nodes: [{id: nodeId}],
      duration: 800,
      padding: 0.5,
      maxZoom: 1.5
    });
  };

  // Эффект для отслеживания смены слоя и завершения отложенной навигации
  useEffect(() => {
    // Если есть отложенная навигация и мы находимся в нужном слое
    if (pendingNodeNavigation && pendingNodeNavigation.layerId === currentGraphId) {
      // Завершаем навигацию к узлу
      const {nodeId} = pendingNodeNavigation;

      // Даем время для полной загрузки слоя
      setTimeout(() => {
        // Выполняем позиционирование канваса на узле
        positionCanvasOnNode(nodeId);

        // Сбрасываем отложенную навигацию
        setPendingNodeNavigation(null);
      }, 500);
    }
  }, [pendingNodeNavigation, currentGraphId]);

  // Функция для обработки клика на узел - позиционирует канвас на узле
  const handleNodeClick = async (nodeId: string, layerId?: string) => {
    // Сначала закрываем модальное окно
    setIsConnectivityErrorModalOpen(false);

    // Ждем немного, чтобы модальное окно успело закрыться
    setTimeout(() => {
      // Если узел находится в другом слое, нужно переключиться
      if (layerId && layerId !== currentGraphId) {
        // Запоминаем информацию о навигации
        setPendingNodeNavigation({nodeId, layerId});

        // Переходим в нужный слой через роутер
        if (projectId) {
          router.push(buildEditorPath(projectId, timelineId, layerId === 'root' ? undefined : layerId));
        }
      } else {
        // Если мы уже в нужном слое, просто позиционируем канвас
        positionCanvasOnNode(nodeId);
      }
    }, 300);
  };

  // Функция для позиционирования канваса на треде комментария
  const handleFocusThread = useCallback(
    async (threadId: string) => {
      if (!projectId) return;

      try {
        // Получаем информацию о треде
        const thread = await CommentsAPI.getThread(projectId, threadId);

        if (thread.contextType === 'NODE') {
          const nodeData = thread.contextData as any;
          const nodeId = nodeData.nodeId;
          if (nodeId) {
            handleNodeClick(nodeId, nodeData.layerId);
          }
        } else if (thread.contextType === 'CANVAS_POSITION') {
          const positionData = thread.contextData as any;
          if (positionData.x !== undefined && positionData.y !== undefined) {
            // Позиционируем камеру на определенные координаты
            reactFlowInstance?.setCenter(positionData.x, positionData.y, {zoom: positionData.zoom || 1});
          }
        }
      } catch (error) {
        console.error('[PlayBar] Error focusing thread:', error);
      }
    },
    [projectId, reactFlowInstance, handleNodeClick]
  );

  // Функция для проверки наличия ошибок в условиях
  const checkForConditionErrors = () => {
    const currentGraph = layers[Object.keys(layers)[0]];
    if (!currentGraph) return null;

    const nodes = currentGraph.nodes || {};
    // Преобразуем объект узлов в формат, ожидаемый validateGraph
    const nodesRecord = Object.values(nodes).reduce(
      (acc, node) => {
        acc[node.id] = node;
        return acc;
      },
      {} as Record<string, any>
    );

    const edges = Object.values(currentGraph.edges || {}).map((edge) => ({
      id: edge.id,
      source: edge.startNodeId,
      target: edge.endNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: {
        conditions: edge.conditions
      }
    }));

    const validationResult = validateGraph(nodesRecord, edges);

    if (!validationResult.isValid) {
      // Собираем детальную информацию об ошибках
      const errorDetails = validationResult.errors
        .map((error) => {
          const edge = edges.find((e) => e.id === error.edgeId);
          if (!edge) return null;

          const sourceNode = nodesRecord[edge.source];
          const targetNode = nodesRecord[edge.target];

          return {
            ...error,
            edge,
            sourceNode: sourceNode
              ? {
                  id: sourceNode.id,
                  type: sourceNode.type,
                  title: sourceNode.data?.title || (sourceNode.type === 'choice' ? sourceNode.data?.text : 'Узел без названия'),
                  textPreview: sourceNode.type === 'narrative' ? sourceNode.data?.text?.substring(0, 50) + (sourceNode.data?.text?.length > 50 ? '...' : '') : sourceNode.data?.text || 'Нет текста',
                  layerId: Object.keys(layers)[0],
                  layerName: currentGraph.name || 'Основной слой'
                }
              : null,
            targetNode: targetNode
              ? {
                  id: targetNode.id,
                  type: targetNode.type,
                  title: targetNode.data?.title || (targetNode.type === 'choice' ? targetNode.data?.text : 'Узел без названия'),
                  textPreview: targetNode.type === 'narrative' ? targetNode.data?.text?.substring(0, 50) + (targetNode.data?.text?.length > 50 ? '...' : '') : targetNode.data?.text || 'Нет текста',
                  layerId: Object.keys(layers)[0],
                  layerName: currentGraph.name || 'Основной слой'
                }
              : null
          };
        })
        .filter(Boolean);

      return {
        hasErrors: true,
        errors: errorDetails,
        totalErrors: validationResult.errors.length
      };
    }

    return null;
  };

  // Функция для запуска воспроизведения
  const startPlayback = async () => {
    // Собираем статистику проекта
    const conditionCheckResult = checkForConditionErrors();
    const hasErrors = conditionCheckResult !== null;

    // Получаем данные для аналитики
    const {layers} = useGraphStore.getState();
    const {variables} = useVariablesStore.getState();
    const playParams = getAggregatedPlayParams(layers, variables, 'PlayBar');

    // Отправляем событие запуска воспроизведения
    trackPlaybackLaunch(playParams, hasErrors, projectId, timelineId);

    // Открываем страницу воспроизведения в новой вкладке
    if (projectId && timelineId) {
      try {
        // ИСПРАВЛЕНИЕ: Принудительно сохраняем актуальные данные в IndexedDB перед воспроизведением
        // Это обеспечивает, что все последние изменения будут включены в playback
        await useGraphStore.getState().saveToDb();

        // Используем новый сервис IndexedDB для сохранения данных
        if (!teamId) {
          throw new Error('Team not available');
        }
        const playbackId = await PlaybackStorageService.savePlaybackData(projectId, teamId, timelineId, projectName);

        // Создаем URL с playbackId
        const playbackUrl = PlaybackStorageService.buildPlaybackUrl(projectId, timelineId);

        console.log('Opening playback with IndexedDB data:', playbackId);
        window.open(playbackUrl, '_blank');
      } catch (error) {
        console.error('Failed to save playback data to IndexedDB: ', error);
        notificationService.showError('Failed to save playback data to IndexedDB');
      }
    } else {
      // Fallback: открываем HTML превью если нет projectId или timelineId
      if (!teamId) {
        notificationService.showError('Team not available for preview');
        return;
      }
      openHTMLPreview(projectName, teamId, undefined, projectId);
    }
  };

  // Обработчик нажатия кнопки воспроизведения
  const handlePlay = async () => {
    // Сначала проверяем связность графа
    const connectivityValidation = validateGraphConnectivity(layers, t);

    if (!connectivityValidation.isConnected) {
      // Формируем локализованное сообщение в зависимости от типа ошибки
      let localizedMessage = '';

      if (connectivityValidation.startNodeCount === 0) {
        localizedMessage = t('connectivity_error.no_start_node', 'Не найден стартовый узел. Все узлы имеют входящие связи (возможен цикл).');
      } else if (connectivityValidation.startNodeCount > 1) {
        const forms = t('connectivity_error.start_nodes_count', {returnObjects: true}) as any;
        const pluralizedNodes = pluralizeRussian(connectivityValidation.startNodeCount, forms.one, forms.few, forms.many);
        localizedMessage = t('connectivity_error.multiple_start_nodes_pluralized', 'Найдено {{count}} {{nodes}}. Должен быть только один стартовый узел для корректного воспроизведения.', {
          count: connectivityValidation.startNodeCount,
          nodes: pluralizedNodes
        });
      } else if (connectivityValidation.unreachableNodes.length > 0) {
        localizedMessage = t('connectivity_error.unreachable_nodes', 'Найдены несвязанные узлы: {{count}} шт. Все узлы должны быть связаны с основным графом.', {
          count: connectivityValidation.unreachableNodes.length
        });
      }

      // Если граф не связный, показываем ошибку связности
      setConnectivityResult({
        ...connectivityValidation,
        message: localizedMessage
      });
      setIsConnectivityErrorModalOpen(true);
      return;
    }

    // Проверяем наличие ошибок в условиях
    const conditionCheckResult = checkForConditionErrors();

    if (conditionCheckResult) {
      // Если есть ошибки, показываем детальный диалог
      setConditionErrors(conditionCheckResult);
      setIsConditionErrorModalOpen(true);
    } else {
      // Если ошибок нет, сразу запускаем воспроизведение
      await startPlayback();
    }
  };

  return (
    <>
      <div className={s.playbar_wrapper}>
        <div className={s.playbar_container}>
          {/* Левая часть - аватарки пользователей */}
          <div className={s.left_section}>
            {isCloud() && <CollaborationAvatars maxVisible={4} />}
            {isCloud() && <CurrentUserAvatar />}
          </div>

          {/* Центральная часть - кнопки управления */}
          <div className={s.center_section}>
            <Button size='2' variant='surface' onClick={handlePlay}>
              <PlayIcon className={s.icon} />
              <Text size='2' weight='medium'>
                {t('play_bar.play_button', 'Play')}
              </Text>
            </Button>

            {isCloud() && (
              <>
                <Separator orientation='vertical' />

                <div className={s.commentsButtonWrapper}>
                  <Button
                    size='2'
                    variant={isCommentsPanelOpen ? 'solid' : 'surface'}
                    color={isCommentsPanelOpen ? 'blue' : 'gray'}
                    onClick={() => {
                      const newOpen = !isCommentsPanelOpen;
                      setIsCommentsPanelOpen(newOpen);
                      // Сбрасываем выбранный тред при закрытии панели
                      if (!newOpen) {
                        setSelectedThreadId(undefined);
                      }
                    }}
                    title={t('play_bar.comments_button_tooltip', 'Показать/скрыть панель комментариев')}
                    className={s.commentsButton}
                  >
                    <BellIcon className={s.icon} />
                    <Text size='2' weight='medium'>
                      {t('play_bar.comments_button', 'Comments')}
                    </Text>
                  </Button>
                  {unreadCount > 0 && (
                    <div className={s.unreadBadge}>
                      <Text size='1' weight='bold'>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* <Button size='2' color='gray' disabled={true}>
              <Share2Icon className={s.icon} />
              <Text size='2' weight='medium'>
                {t('play_bar.share_button', 'Share')}
              </Text>
            </Button> */}

            {/* <BibleQualityWidget onClick={() => setIsBibleQualityModalOpen(true)} size='small' /> */}
          </div>

          {/* Правая часть - виджеты */}
          <div className={s.right_section}>{isCloud() && <CreditsWidget size='small' />}</div>
        </div>
      </div>

      {/* Модальное окно ошибки связности */}
      <Dialog.Root open={isConnectivityErrorModalOpen} onOpenChange={setIsConnectivityErrorModalOpen}>
        <Dialog.Content style={{maxWidth: '600px', maxHeight: '80vh', overflow: 'auto'}}>
          <Flex direction='column' gap='4'>
            <Flex align='center' gap='2'>
              <ExclamationTriangleIcon width='24' height='24' color='#DC2626' />
              <Dialog.Title style={{margin: 0}}>{t('connectivity_error.heading', 'Ошибка связности графа')}</Dialog.Title>
            </Flex>

            <Text size='2' style={{lineHeight: '1.5'}}>
              {connectivityResult?.message}
            </Text>

            {/* Список стартовых узлов, если их больше одного */}
            {connectivityResult && connectivityResult.startNodeCount > 1 && (
              <div>
                <Text size='2' weight='medium' style={{display: 'block', marginBottom: '8px'}}>
                  {t('connectivity_error.multiple_start_nodes_list', 'Стартовые узлы:')}
                </Text>
                <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--gray-6)', borderRadius: '4px', padding: '8px'}}>
                  {connectivityResult.startNodes.map((node: any, index: number) => (
                    <Text
                      key={index}
                      size='2'
                      style={{
                        display: 'block',
                        padding: '8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        border: '1px solid transparent',
                        marginBottom: '4px'
                      }}
                      className='hover-highlight'
                      onClick={() => handleNodeClick(node.id, node.layerId)}
                      title={t('connectivity_error.click_to_find', 'Нажмите, чтобы найти узел на канвасе', {id: node.id})}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f8ff';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <strong>{node.title}</strong>
                      {node.textPreview && node.textPreview !== t('connectivity_error.default_no_text', 'No text') && node.textPreview !== 'Нет текста' && node.textPreview !== 'No text' && (
                        <>
                          <br />
                          <span style={{color: '#666', fontStyle: 'italic', marginLeft: '12px'}}>"{node.textPreview}"</span>
                        </>
                      )}
                      <br />
                      <span style={{color: '#666', fontSize: '0.8em', marginLeft: '12px'}}>
                        {t('connectivity_error.layer_info', 'Слой')}: <em>{node.layerName}</em>
                      </span>
                      <span style={{color: '#999', fontSize: '0.8em', marginLeft: '8px'}}>• ID: {node.id}</span>
                    </Text>
                  ))}
                </div>
              </div>
            )}

            {/* Список недостижимых узлов, если они есть */}
            {connectivityResult && connectivityResult.unreachableNodes && connectivityResult.unreachableNodes.length > 0 && (
              <div>
                <Text size='2' weight='medium' style={{display: 'block', marginBottom: '8px'}}>
                  {t('connectivity_error.unreachable_nodes_list', 'Недостижимые узлы:')}
                </Text>
                <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--gray-6)', borderRadius: '4px', padding: '8px'}}>
                  {connectivityResult.unreachableNodes.map((node: any, index: number) => (
                    <Text
                      key={index}
                      size='2'
                      style={{
                        display: 'block',
                        padding: '8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        border: '1px solid transparent',
                        marginBottom: '4px'
                      }}
                      className='hover-highlight'
                      onClick={() => handleNodeClick(node.id, node.layerId)}
                      title={t('connectivity_error.click_to_find', 'Нажмите, чтобы найти узел на канвасе', {id: node.id})}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f8ff';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <strong>{node.title}</strong>
                      {node.textPreview && node.textPreview !== t('connectivity_error.default_no_text', 'No text') && node.textPreview !== 'Нет текста' && node.textPreview !== 'No text' && (
                        <>
                          <br />
                          <span style={{color: '#666', fontStyle: 'italic', marginLeft: '12px'}}>"{node.textPreview}"</span>
                        </>
                      )}
                      <br />
                      <span style={{color: '#666', fontSize: '0.8em', marginLeft: '12px'}}>
                        {t('connectivity_error.layer_info', 'Слой')}: <em>{node.layerName}</em>
                      </span>
                      <span style={{color: '#999', fontSize: '0.8em', marginLeft: '8px'}}>• ID: {node.id}</span>
                    </Text>
                  ))}
                </div>
              </div>
            )}

            <Text size='1' color='gray' style={{lineHeight: '1.4'}}>
              {t('connectivity_error.help_text', 'Убедитесь, что все узлы и слои соединены в единый граф с одним начальным узлом. Проверьте, что нет изолированных частей графа.')}
            </Text>

            <Flex gap='3' justify='end' mt='4'>
              <Button variant='solid' color='red' onClick={() => setIsConnectivityErrorModalOpen(false)} size='2'>
                {t('connectivity_error.close_button', 'Понятно')}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Модальное окно ошибок условий */}
      <Dialog.Root open={isConditionErrorModalOpen} onOpenChange={setIsConditionErrorModalOpen}>
        <Dialog.Content style={{maxWidth: '700px', maxHeight: '80vh', overflow: 'auto'}}>
          <Flex direction='column' gap='4'>
            <Flex align='center' gap='2'>
              <ExclamationTriangleIcon width='24' height='24' color='#F59E0B' />
              <Dialog.Title style={{margin: 0}}>{t('conditions_play.error_heading', 'Ошибки условий на связях')}</Dialog.Title>
            </Flex>

            <Text size='2' style={{lineHeight: '1.5'}}>
              {t('conditions_play.error_text', 'Найдены связи, которые требуют условий для корректного воспроизведения:')}
            </Text>

            {/* Список ошибок условий */}
            {conditionErrors && conditionErrors.errors && (
              <div>
                <Text size='2' weight='medium' style={{display: 'block', marginBottom: '8px'}}>
                  {t('conditions_play.errors_list', 'Проблемные связи ({{count}}):', {count: conditionErrors.totalErrors})}
                </Text>
                <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--gray-6)', borderRadius: '4px', padding: '8px'}}>
                  {conditionErrors.errors.map((error: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--amber-6)',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        backgroundColor: 'var(--amber-1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        setIsConditionErrorModalOpen(false);
                        setTimeout(() => {
                          if (error.targetNode?.id && error.targetNode?.layerId) {
                            handleNodeClick(error.targetNode.id, error.targetNode.layerId);
                          }
                        }, 50);
                      }}
                      title={t('connectivity_error.click_to_find', 'Нажмите, чтобы найти узел на канвасе')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--amber-2)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--amber-1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Text size='2' weight='medium' style={{display: 'block', marginBottom: '6px', color: '#D97706'}}>
                        {error.type === 'missing_condition'
                          ? t('conditions_play.missing_condition', 'Отсутствует условие на связи')
                          : t('conditions_play.invalid_reference', 'Неверная ссылка в условии')}
                      </Text>

                      <Text size='2' style={{display: 'block', marginBottom: '4px'}}>
                        <strong>{error.sourceNode?.title || 'Неизвестный узел'}</strong> → <strong>{error.targetNode?.title || 'Неизвестный узел'}</strong>
                      </Text>

                      {error.targetNode?.textPreview && error.targetNode.textPreview !== 'Нет текста' && (
                        <Text size='1' color='gray' style={{display: 'block', fontStyle: 'italic', marginBottom: '4px'}}>
                          "{error.targetNode.textPreview}"
                        </Text>
                      )}

                      <Text size='1' color='gray' style={{fontStyle: 'italic'}}>
                        {t('conditions_play.target_node_type', 'Тип целевого узла')}: {error.targetNodeType}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Text size='1' color='gray' style={{lineHeight: '1.4'}}>
              {t('conditions_play.error_help_text', 'Добавьте условия на связи, которые ведут из узлов с множественными исходящими связями. Связи к узлам выбора условий не требуют.')}
            </Text>

            <Flex gap='3' justify='end' mt='4'>
              <Button
                variant='solid'
                color='amber'
                onClick={async () => {
                  setIsConditionErrorModalOpen(false);
                  await startPlayback();
                }}
                size='2'
              >
                <PlayIcon />
                {t('conditions_play.error_play_button', 'Все равно запустить')}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Модальное окно качества библии */}
      <BibleQualityModal isOpen={isBibleQualityModalOpen} onClose={() => setIsBibleQualityModalOpen(false)} />

      {/* Панель комментариев (Cloud only) */}
      {isCloud() && (
        <CommentsPanel
          isVisible={isCommentsPanelOpen}
          onClose={() => {
            setIsCommentsPanelOpen(false);
            setSelectedThreadId(undefined);
          }}
          selectedThreadId={selectedThreadId}
          onThreadSelect={setSelectedThreadId}
          onFocusThread={handleFocusThread}
        />
      )}
    </>
  );
};

export default PlayBar;
