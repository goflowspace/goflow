'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {ArrowRightIcon} from '@radix-ui/react-icons';
import {Box, Button, Card, Flex, Heading, Text, Theme} from '@radix-ui/themes';
import {Choice, Node} from '@types-folder/nodes';
import ReactDOM from 'react-dom/client';
import {useTranslation} from 'react-i18next';

import {ImagePlaceholder} from '../../../components/common/ImagePlaceholder';
import {useEntities} from '../../../hooks/useEntities';
import {imageGCSService} from '../../../services/imageGCS.service';
import {Entity} from '../../../types/entities';
import {Variable} from '../../../types/variables';
import {isGCSMediaValue} from '../../../utils/imageAdapterUtils';
import {getReliableTeamId} from '../../../utils/teamUtils';
import {StoryEngine} from '../../engine/interfaces/StoryEngine';
import {StoryRenderer} from '../../engine/interfaces/StoryRenderer';
import {applyNodeLocalization} from '../../utils/localizationCompleteness';
import {PlaybackLogPanelV2, PlaybackLogProvider, convertLogsToV2Format, usePlaybackLog} from '../PlaybackLogPanelV2';
import {VariablesPanelWrapper} from '../Variables/VariablesPanelWrapper';
import {EventLogger} from '../services/EventLogger';
import {RenderMode} from '../types';
import {PlaybackFooter} from './PlaybackFooter';
import {PlaybackHeader} from './PlaybackHeader';

// Импортируем стили темы
import '../styles/playback-theme.css';

interface RadixRendererProps {
  engine: StoryEngine;
  initialNode?: Node | null;
  isInitialRender: boolean;
}

// Компонент для отображения прикрепленных сущностей
const AttachedEntitiesDisplay: React.FC<{
  attachedEntityIds?: string[];
  projectId?: string;
}> = ({attachedEntityIds, projectId}) => {
  const logContext = usePlaybackLog();
  const {entities} = useEntities({
    projectId,
    includeOriginalImages: false
  });

  // Функция для получения thumbnail URL через proxy
  const getThumbnailUrlForEntity = (entity: Entity): string | null => {
    // Используем данные из playback контекста с fallback на localStorage
    const contextProjectId = logContext.projectId;
    const contextTeamId = logContext.teamId || getReliableTeamId();
    const finalProjectId = projectId || contextProjectId;

    if (!entity.image || !isGCSMediaValue(entity.image) || !contextTeamId || !finalProjectId) {
      return null;
    }

    return imageGCSService.getThumbnailProxyUrl(contextTeamId, finalProjectId, entity.id, 'entity-avatar', entity.image);
  };

  // Если нет прикрепленных сущностей, не отображаем ничего
  if (!attachedEntityIds || attachedEntityIds.length === 0) {
    return null;
  }

  // Получаем данные сущностей по ID
  const attachedEntities = attachedEntityIds.map((id) => entities.find((entity) => entity.id === id)).filter((entity): entity is Entity => entity !== undefined);

  if (attachedEntities.length === 0) {
    return null;
  }

  return (
    <Flex gap='2' align='center' style={{marginBottom: '8px', flexWrap: 'wrap'}}>
      {attachedEntities.map((entity) => (
        <Flex
          key={entity.id}
          gap='2'
          align='center'
          style={{
            backgroundColor: 'var(--color-panel-solid)',
            borderRadius: '8px',
            padding: '4px 8px',
            border: '1px solid var(--color-border)'
          }}
        >
          {/* Аватарка */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {getThumbnailUrlForEntity(entity) ? (
              <img
                src={getThumbnailUrlForEntity(entity)!}
                alt={entity.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <ImagePlaceholder size='small' />
            )}
          </div>

          {/* Имя */}
          <Text
            size='2'
            style={{
              color: 'var(--color-text)',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
          >
            {entity.name}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
};

export class RadixRendererClean implements StoryRenderer {
  private container: HTMLElement;
  private engine: StoryEngine | null = null;
  private root: ReactDOM.Root | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  renderNode(node: Node | null, engine: StoryEngine): void {
    this.engine = engine;

    // Рендеринг с использованием React
    const rootElement = document.createElement('div');
    rootElement.id = 'story-root';
    this.container.innerHTML = '';
    this.container.appendChild(rootElement);

    const storyData = engine.getStoryData();
    if (!storyData) {
      throw new Error('Story data is not initialized');
    }

    this.root = ReactDOM.createRoot(rootElement);
    this.root.render(
      <PlaybackLogProvider>
        <RadixRendererComponent engine={engine} initialNode={node} isInitialRender={true} />
      </PlaybackLogProvider>
    );
  }

  renderChoices(choices: Choice[], engine: StoryEngine): void {
    console.error('renderChoices is not implemented');
  }

  renderMessage(message: string): void {
    // Рендеринг сообщения
    const rootElement = document.createElement('div');
    rootElement.id = 'story-message';
    this.container.innerHTML = '';
    this.container.appendChild(rootElement);

    const messageRoot = ReactDOM.createRoot(rootElement);
    messageRoot.render(
      <Theme appearance='light'>
        <Card size='3' style={{padding: '16px', maxWidth: '480px', margin: '0 auto'}}>
          <Text size='3'>{message}</Text>
        </Card>
      </Theme>
    );
  }

  updateNavigation(canGoBack: boolean): void {
    console.error('updateNavigation is not implemented');
  }
}

// Компонент для отображения одной нарративной карточки
const NarrativeCard: React.FC<{
  node: Node;
  isLast?: boolean;
  engine: StoryEngine;
  projectId?: string;
}> = ({node, isLast = true, engine, projectId}) => {
  const {selectedLanguage, localizationData} = usePlaybackLog();

  if (!engine.isNarrativeNode(node) && !engine.isChoiceNode(node)) return null;

  // Применяем локализацию к узлу
  const localizedNode = useMemo(() => {
    if (!localizationData || !selectedLanguage || selectedLanguage === localizationData.baseLanguage) {
      return node;
    }

    return applyNodeLocalization(node, selectedLanguage, localizationData.localizations);
  }, [node, selectedLanguage, localizationData]);

  return (
    <Box style={{marginBottom: isLast ? '20px' : '10px', maxWidth: '70%'}}>
      {/* Системная информация: название узла и слой - выносим над карточкой */}
      {engine.isNarrativeNode(localizedNode) && (localizedNode.data.title || ((localizedNode.data as any).layerInfo && (localizedNode.data as any).layerInfo.layerName)) && (
        <Box style={{marginBottom: '6px'}}>
          {localizedNode.data.title && (
            <Heading size='2' style={{fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '2px'}}>
              {localizedNode.data.title}
              {/* Добавляем информацию о слое в той же строке после имени узла */}
              {(localizedNode.data as any).layerInfo && (localizedNode.data as any).layerInfo.layerName && (
                <Text as='span' size='1' style={{fontStyle: 'italic', fontWeight: 'normal', color: 'var(--color-text-muted)', marginLeft: '8px'}}>
                  ({(localizedNode.data as any).layerInfo.layerName})
                </Text>
              )}
            </Heading>
          )}
          {/* Если нет заголовка, но есть информация о слое, показываем её отдельно */}
          {!localizedNode.data.title && (localizedNode.data as any).layerInfo && (localizedNode.data as any).layerInfo.layerName && (
            <Text size='1' style={{fontStyle: 'italic', color: 'var(--color-text-muted)'}}>
              ({(localizedNode.data as any).layerInfo.layerName})
            </Text>
          )}
        </Box>
      )}

      {/* Отображение прикрепленных сущностей - всегда показываем для нарративных узлов */}
      {engine.isNarrativeNode(localizedNode) && (
        <Box style={{marginBottom: '6px'}}>
          <AttachedEntitiesDisplay attachedEntityIds={(localizedNode.data as any).attachedEntities} projectId={projectId} />
        </Box>
      )}

      {/* Основная карточка с нарративом */}
      <Card className='novel-card'>
        <Text size='3'>{engine.isNarrativeNode(localizedNode) ? localizedNode.data.text : engine.isChoiceNode(localizedNode) ? localizedNode.data.text : ''}</Text>
      </Card>
    </Box>
  );
};

// Компонент для отображения кнопок выбора
const ChoiceButtons: React.FC<{
  choices: Choice[];
  onChoiceSelected: (choice: Choice) => void;
  disabled?: boolean;
}> = ({choices, onChoiceSelected, disabled = false}) => (
  <Flex direction='column' gap='2' className='choice-container'>
    {choices.map((choice) => (
      <Button
        key={choice.id}
        size='3'
        variant='soft'
        onClick={() => onChoiceSelected(choice)}
        disabled={disabled}
        style={{
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          textAlign: 'left',
          height: 'auto',
          padding: '12px 16px',
          width: '100%'
        }}
      >
        {choice.text}
      </Button>
    ))}
  </Flex>
);

// Компонент-обертка для панели лога
const LogPanelWrapper: React.FC<{
  isExpanded: boolean;
  onClose: () => void;
}> = ({isExpanded}) => {
  const {t} = useTranslation();
  const logManager = usePlaybackLog();
  const logs = logManager.getLogs();
  const variables = logManager.variables;
  const nodes = logManager.nodes;
  const entriesV2 = React.useMemo(() => convertLogsToV2Format(logs, variables, nodes, t), [logs, variables, nodes, t]);

  return (
    <div className={`playback-panel playback-panel--right ${!isExpanded ? 'playback-panel--collapsed' : ''}`}>
      {isExpanded && <PlaybackLogPanelV2 entries={entriesV2} onClear={() => logManager.clearLog()} />}
    </div>
  );
};

// Основной компонент рендерера
export const RadixRendererComponent: React.FC<RadixRendererProps> = ({engine, initialNode, isInitialRender}) => {
  const {t} = useTranslation();
  const logContext = usePlaybackLog();

  // Используем данные из playback контекста
  const projectId = logContext.projectId;
  const teamId = logContext.teamId;

  // Инициализация playback данных завершена
  // projectId и teamId доступны из контекста

  // Состояния компонента
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('novel');
  const [history, setHistory] = useState<Node[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [logPanelExpanded, setLogPanelExpanded] = useState(true);
  const [variablesPanelExpanded, setVariablesPanelExpanded] = useState(true);
  const [currentVariables, setCurrentVariables] = useState<Record<string, Variable>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // EventLogger для логирования событий
  const eventLoggerRef = useRef<EventLogger | null>(null);

  // Инициализируем менеджер логов из контекста и получаем тему
  const logManager = usePlaybackLog();
  const {isDarkTheme, selectedLanguage, localizationData} = logManager;

  // Получаем данные из движка
  const engineState = engine.getState();
  const storyData = engine.getStoryData();
  const variables = engineState.variables || {};
  const variablesFromStory: Variable[] = storyData?.data?.variables || [];

  // Локализуем историю узлов
  const localizedHistory = useMemo(() => {
    if (!localizationData || !selectedLanguage || selectedLanguage === localizationData.baseLanguage) {
      return history;
    }

    return history.map((node) => applyNodeLocalization(node, selectedLanguage, localizationData.localizations));
  }, [history, selectedLanguage, localizationData]);

  // Локализуем текущий узел
  const localizedCurrentNode = useMemo(() => {
    if (!currentNode || !localizationData || !selectedLanguage || selectedLanguage === localizationData.baseLanguage) {
      return currentNode;
    }

    return applyNodeLocalization(currentNode, selectedLanguage, localizationData.localizations);
  }, [currentNode, selectedLanguage, localizationData]);

  // Локализуем выборы
  const localizedChoices = useMemo(() => {
    if (!localizationData || !selectedLanguage || selectedLanguage === localizationData.baseLanguage) {
      return choices;
    }

    return choices.map((choice) => {
      // Ищем локализацию по nodeId и fieldPath 'data.text'
      const choiceLocalization = localizationData.localizations.find(
        (loc) =>
          loc.nodeId === choice.id &&
          loc.fieldPath === 'data.text' &&
          loc.targetLanguage === selectedLanguage &&
          loc.translatedText &&
          loc.translatedText.trim() !== '' &&
          ['TRANSLATED', 'REVIEWED', 'APPROVED'].includes(loc.status)
      );

      if (choiceLocalization && choiceLocalization.translatedText) {
        return {...choice, text: choiceLocalization.translatedText};
      }

      return choice;
    });
  }, [choices, selectedLanguage, localizationData]);

  // Инициализируем EventLogger при первом рендере и затем получаем начальный узел
  useEffect(() => {
    if (!eventLoggerRef.current) {
      eventLoggerRef.current = new EventLogger();
      eventLoggerRef.current.connect(engine.getEventEmitter(), logManager);

      // После подключения EventLogger, получаем начальный узел
      if (isInitialRender && !isInitialized) {
        setIsInitialized(true);

        // Если начальный узел уже был передан, используем его
        if (initialNode) {
          setCurrentNode(initialNode);
        } else {
          // Иначе получаем начальный узел из движка
          const urlParams = new URLSearchParams(window.location.search);
          const startNodeId = urlParams.get('startNode');

          let startNode = null;
          if (startNodeId) {
            const nodeFromParam = storyData?.data.nodes.find((n) => n.id === startNodeId);
            if (nodeFromParam && nodeFromParam.type === 'narrative') {
              startNode = engine.visitNode(startNodeId);
            }
          }

          if (!startNode) {
            startNode = engine.getStartNode();
            // Если получили начальный узел, посещаем его чтобы добавить в историю
            // но только если он еще не был посещен (чтобы избежать дублирования событий)
            if (startNode) {
              const engineState = engine.getState();
              const isAlreadyVisited = engineState.history.includes(startNode.id);

              if (!isAlreadyVisited) {
                startNode = engine.visitNode(startNode.id);
              }
            }
          }

          if (startNode) {
            setCurrentNode(startNode);
          }
        }
      }
    }

    return () => {
      // Отключаем EventLogger при размонтировании
      if (eventLoggerRef.current) {
        eventLoggerRef.current.disconnect();
        eventLoggerRef.current = null;
      }
    };
  }, [engine, logManager, isInitialRender, initialNode, isInitialized, storyData]);

  // Инициализируем currentVariables при первом рендере
  useEffect(() => {
    setCurrentVariables(variables);
  }, [variables]);

  // Передаем переменные в контекст лога
  useEffect(() => {
    if (variablesFromStory.length > 0) {
      logManager.setVariables(variablesFromStory);
    }
  }, [variablesFromStory, logManager]);

  // Передаем узлы в контекст лога
  useEffect(() => {
    if (storyData?.data?.nodes) {
      logManager.setNodes(storyData.data.nodes);
    }
  }, [storyData, logManager]);

  // Эффект для прокрутки вниз в режиме водопада
  useEffect(() => {
    if (renderMode === 'waterfall' && bottomRef.current) {
      bottomRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [history, renderMode]);

  // Эффект для загрузки выборов и обновления истории при изменении узла
  useEffect(() => {
    if (currentNode) {
      // Загружаем доступные выборы для нарративных узлов
      if (engine.isNarrativeNode(currentNode)) {
        const availableChoices = engine.getAvailableChoices(currentNode.id);
        setChoices(availableChoices);
      } else {
        setChoices([]);
      }

      // Обновляем историю через движок
      const displayHistory = engine.getDisplayHistory(renderMode, currentNode);
      setHistory(displayHistory);
    }
  }, [currentNode, engine, renderMode]);

  const handleChoiceSelected = (choice: Choice) => {
    if (choice.hasNextNode) {
      // Добавляем выбор в историю отображения (только для режима "waterfall")
      if (renderMode === 'waterfall') {
        engine.addChoiceToDisplayHistory(choice);
      }

      // Получаем следующий узел после выбора
      const nextNode = engine.executeChoice(choice.id);

      if (nextNode) {
        setCurrentNode(nextNode);
      } else {
        setCurrentNode(null);
      }
    } else {
      setCurrentNode(null);
    }
  };

  const handleGoBack = () => {
    const prevNode = engine.goBack();

    if (prevNode) {
      setCurrentNode(prevNode);

      // Обновляем историю отображения через движок
      const displayHistory = engine.updateDisplayHistoryOnBack(renderMode);
      setHistory(displayHistory);

      // Загружаем доступные выборы для предыдущего узла
      if (engine.isNarrativeNode(prevNode)) {
        const availableChoices = engine.getAvailableChoices(prevNode.id);
        setChoices(availableChoices);
      } else {
        setChoices([]);
      }
    }
  };

  const handleRestart = () => {
    // Получаем параметр startNode из URL
    const urlParams = new URLSearchParams(window.location.search);
    const startNodeId = urlParams.get('startNode');

    // Выполняем рестарт движка
    let startNode = engine.restart();

    // Если указан начальный узел в URL, используем его
    if (startNodeId) {
      // Ищем узел с указанным ID среди всех узлов
      const customStartNode = storyData?.data.nodes.find((n) => n.id === startNodeId);

      // Если нашли нарративный узел, используем его
      if (customStartNode && customStartNode.type === 'narrative') {
        startNode = customStartNode;
      }
    }

    // Посещаем начальный узел (добавляем в историю)
    if (startNode) {
      startNode = engine.visitNode(startNode.id);
    }

    if (startNode) {
      setCurrentNode(startNode);

      // Обновляем историю через движок
      const displayHistory = engine.getDisplayHistory(renderMode, startNode);
      setHistory(displayHistory);
    }
  };

  // Обработчик продолжения в режиме новеллы
  const handleContinue = () => {
    if (currentNode) {
      // При явном нажатии кнопки "Продолжить" устанавливаем forceMove = true
      const nextNode = engine.moveForward(currentNode.id, true);
      if (nextNode) {
        setCurrentNode(nextNode);
      }
    }
  };

  // Функция для обновления переменных при изменении
  const handleVariableUpdate = useCallback(() => {
    // Получаем актуальное состояние переменных
    const updatedEngineState = engine.getState();
    setCurrentVariables(updatedEngineState.variables || {});
    setVariablesPanelExpanded(true);
  }, [engine]);

  // Проверка на возможность возврата
  const canGoBack = engine.getState().history.length > 0;

  // Если данные истории не загружены
  if (!storyData) {
    return (
      <Theme appearance='light'>
        <Card size='3' style={{padding: '16px', maxWidth: '480px', margin: '0 auto'}}>
          <Text size='3'>{t('playback.renderer.story_data_not_loaded')}</Text>
        </Card>
      </Theme>
    );
  }

  // Если инициализация прошла, но начальный узел не найден
  if (isInitialized && !currentNode) {
    return (
      <Theme appearance='light'>
        <Card size='3' style={{padding: '16px', maxWidth: '480px', margin: '0 auto'}}>
          <Text size='3'>{t('playback.renderer.no_start_node')}</Text>
        </Card>
      </Theme>
    );
  }

  // Рендеринг в режиме "новелла"
  const renderNovelMode = () => {
    if (!currentNode) {
      return (
        <Card className='novel-card' style={{maxWidth: '480px', margin: '20px auto 0'}}>
          <Text size='3'>{t('playback.renderer.story_completed')}</Text>
        </Card>
      );
    }

    return (
      <Box style={{maxWidth: '750px', margin: '0 auto'}}>
        {/* Текущий нарративный узел */}
        {engine.isNarrativeNode(localizedCurrentNode) && <NarrativeCard node={localizedCurrentNode} engine={engine} projectId={projectId || undefined} />}

        {/* Варианты выбора (скрываем виртуальные выборы) */}
        {engine.isNarrativeNode(localizedCurrentNode) && localizedChoices.some((choice) => !choice.isVirtual) && (
          <ChoiceButtons choices={localizedChoices.filter((choice) => !choice.isVirtual)} onChoiceSelected={handleChoiceSelected} />
        )}

        {/* Кнопка "Продолжить" для нарративного узла без выборов или с виртуальным выбором */}
        {engine.isNarrativeNode(localizedCurrentNode) && !localizedChoices.some((choice) => !choice.isVirtual) && (
          <Flex justify='center' style={{marginTop: '20px'}}>
            <Button size='3' onClick={handleContinue} disabled={localizedChoices.length === 0}>
              {t('playback.renderer.continue')} <ArrowRightIcon />
            </Button>
          </Flex>
        )}
      </Box>
    );
  };

  // Рендеринг в режиме "водопад"
  const renderWaterfallMode = () => {
    return (
      <Box style={{maxWidth: '750px', margin: '0 auto'}}>
        {/* История нарративных узлов и выборов */}
        <Flex direction='column' gap='2' style={{paddingBottom: '20px'}}>
          {localizedHistory.map((node, index) => {
            // Для узлов выбора рендерим как сообщение справа
            if (engine.isChoiceNode(node)) {
              return (
                <Flex key={`${node.id}-${index}`} justify='end' style={{width: '100%'}}>
                  <Box
                    style={{
                      maxWidth: '70%',
                      minWidth: 'fit-content',
                      width: 'auto'
                    }}
                  >
                    <Card
                      size='2'
                      style={{
                        background: 'var(--color-choice-bg)',
                        border: '1px solid var(--color-choice)',
                        marginBottom: '8px',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal'
                      }}
                    >
                      <Text
                        size='3'
                        style={{
                          color: 'var(--color-choice)',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal'
                        }}
                      >
                        {node.data.text}
                      </Text>
                    </Card>
                  </Box>
                </Flex>
              );
            }

            // Для нарративных узлов рендерим слева
            return (
              <Flex key={`${node.id}-${index}`} justify='start' style={{width: '100%'}}>
                <NarrativeCard node={node} engine={engine} isLast={false} projectId={projectId || undefined} />
              </Flex>
            );
          })}
        </Flex>

        {/* Текущие варианты выбора (скрываем виртуальные выборы) */}
        {currentNode && engine.isNarrativeNode(currentNode) && choices.some((choice) => !choice.isVirtual) && (
          <Box
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '16px',
              marginTop: '16px'
            }}
          >
            <Flex direction='column' gap='2' align='end'>
              {localizedChoices
                .filter((choice) => !choice.isVirtual)
                .map((choice) => (
                  <Button
                    key={choice.id}
                    size='3'
                    variant='soft'
                    onClick={() => handleChoiceSelected(choice)}
                    style={{
                      maxWidth: '70%',
                      minWidth: 'fit-content',
                      wordWrap: 'break-word',
                      whiteSpace: 'normal',
                      textAlign: 'left',
                      height: 'auto',
                      padding: '8px 12px'
                    }}
                  >
                    {choice.text}
                  </Button>
                ))}
            </Flex>
          </Box>
        )}

        {/* Кнопка "Продолжить" для нарративного узла без выборов или с виртуальным выбором */}
        {currentNode && engine.isNarrativeNode(currentNode) && !choices.some((choice) => !choice.isVirtual) && (
          <Box
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '16px',
              marginTop: '16px'
            }}
          >
            <Flex justify='end'>
              <Button size='3' onClick={handleContinue} disabled={choices.length === 0}>
                {t('playback.renderer.continue')} <ArrowRightIcon />
              </Button>
            </Flex>
          </Box>
        )}

        {/* Невидимый элемент для прокрутки вниз */}
        <div ref={bottomRef} />
      </Box>
    );
  };

  // Показываем загрузку пока не инициализировано
  if (!isInitialized) {
    return (
      <Theme appearance={isDarkTheme ? 'dark' : 'light'} accentColor='blue' grayColor='slate' radius='medium'>
        <div className='playback-container'>
          <div className='playback-body'>
            <div className='playback-content'>
              <Box style={{maxWidth: '750px', margin: '0 auto', padding: '20px'}}>
                <Text size='3'>{t('playback.renderer.loading_story')}</Text>
              </Box>
            </div>
          </div>
        </div>
      </Theme>
    );
  }

  return (
    <Theme appearance={isDarkTheme ? 'dark' : 'light'} accentColor='blue' grayColor='slate' radius='medium'>
      <div className='playback-container'>
        {/* Header */}
        <PlaybackHeader renderMode={renderMode} onRenderModeChange={setRenderMode} />

        {/* Body */}
        <div className='playback-body'>
          {/* Left Panel - Variables */}
          <VariablesPanelWrapper
            isExpanded={variablesPanelExpanded}
            variables={currentVariables}
            variablesFromStory={variablesFromStory}
            engine={engine}
            onClose={() => setVariablesPanelExpanded(false)}
            onVariableChange={handleVariableUpdate}
          />

          {/* Main Content */}
          <div className='playback-content'>{renderMode === 'novel' ? renderNovelMode() : renderWaterfallMode()}</div>

          {/* Right Panel - Log */}
          <LogPanelWrapper isExpanded={logPanelExpanded} onClose={() => setLogPanelExpanded(false)} />
        </div>

        {/* Footer */}
        <PlaybackFooter
          onVariablesToggle={() => setVariablesPanelExpanded(!variablesPanelExpanded)}
          onLogToggle={() => setLogPanelExpanded(!logPanelExpanded)}
          onBack={handleGoBack}
          onRestart={handleRestart}
          canGoBack={canGoBack}
          isDarkTheme={isDarkTheme}
          onThemeToggle={logManager.toggleTheme}
        />
      </div>
    </Theme>
  );
};
