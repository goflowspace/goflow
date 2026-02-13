import React, {useState} from 'react';

import {useRouter} from 'next/router';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {Separator, Text} from '@radix-ui/themes';
import {useReactFlow} from '@xyflow/react';
import cls from 'classnames';
import {nanoid} from 'nanoid';
import {useTranslation} from 'react-i18next';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';

import {Command, getCommandHistory} from '../../commands/CommandInterface';
import {getCommandDetails, getCommandDisplayName, getCommandTargetId} from '../../utils/historyUtils';
import {buildEditorPath} from '../../utils/navigation';

import s from './Sidebar.module.scss';

// Кэш для хранения сгенерированных ID команд
const commandIDCache = new Map<Command, string>();

// Компонент для отображения истории команд
const HistoryView = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const {projectId} = useCurrentProject();
  const {timelineId} = useCurrentRoute();
  const reactFlowInstance = useReactFlow();
  const commandHistory = getCommandHistory(router as any, projectId);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const deselectAllNodes = useCanvasStore((s) => s.deselectAllNodes);
  const canvasNodes = useCanvasStore((s) => s.nodes);
  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const layers = useGraphStore((s) => s.layers);
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState({
    undoStack: [] as readonly Command[],
    redoStack: [] as readonly Command[]
  });

  // Обновляем состояние истории каждые 500 мс
  React.useEffect(() => {
    const updateHistory = () => {
      setHistoryState({
        undoStack: commandHistory.getUndoStack(),
        redoStack: commandHistory.getRedoStack()
      });
    };

    updateHistory();
    const interval = setInterval(updateHistory, 500);
    return () => clearInterval(interval);
  }, [commandHistory]);

  // Найти слой, содержащий узел
  const findLayerContainingNode = (nodeId: string): string | null => {
    for (const layerId in layers) {
      if (layers[layerId].nodes && layers[layerId].nodes[nodeId]) {
        return layerId;
      }
    }
    return null;
  };

  // Перейти к узлу в текущем слое
  const panToNode = (targetId: string) => {
    // Находим узел в канвасе
    const targetNode = canvasNodes.find((node) => node.id === targetId);

    if (!targetNode) {
      console.warn(`Узел ${targetId} не найден в текущем канвасе`);
      return;
    }

    if (reactFlowInstance) {
      // Вычисляем координаты центра узла
      const nodeX = targetNode.position.x;
      const nodeY = targetNode.position.y;
      const nodeWidth = targetNode.width || 150;
      const nodeHeight = targetNode.height || 100;
      const nodeCenterX = nodeX + nodeWidth / 2;
      const nodeCenterY = nodeY + nodeHeight / 2;

      // Устанавливаем оптимальный зум (100%) и центрируем на узле
      reactFlowInstance.setViewport(
        {
          x: window.innerWidth / 2 - nodeCenterX,
          y: window.innerHeight / 2 - nodeCenterY,
          zoom: 1
        },
        {duration: 800}
      );
    }

    // Выделяем узел
    selectNode(targetId);
  };

  // Обработчик клика по элементу истории
  const handleHistoryItemClick = (command: Command) => {
    // Генерируем уникальный идентификатор для команды
    const commandId = getCommandUniqueId(command);

    // Устанавливаем выбранную команду
    setSelectedCommandId(commandId);

    // Получаем идентификатор целевого объекта
    const targetId = getCommandTargetId(command);

    if (!targetId) {
      // Если это команда удаления или у нее нет целевого объекта, снимаем выделение
      deselectAllNodes();
      return;
    }

    // Ищем слой, содержащий узел
    const containerLayerId = findLayerContainingNode(targetId);

    if (!containerLayerId) {
      console.warn(`Узел ${targetId} не найден ни в одном слое`);
      return;
    }

    // Если узел находится в другом слое, переходим в него
    if (containerLayerId !== currentGraphId && projectId) {
      // Используем router для перехода в другой слой (это запустит эффект в Canvas.tsx)
      router.push(buildEditorPath(projectId, timelineId, containerLayerId === 'root' ? undefined : containerLayerId));

      // Нужна небольшая задержка, чтобы завершился переход
      setTimeout(() => {
        panToNode(targetId);
      }, 300); // Увеличиваем задержку для уверенности в загрузке канваса

      return;
    }

    // Если узел в текущем слое, переходим к нему
    panToNode(targetId);
  };

  // Функция для генерации уникального идентификатора команды
  const getCommandUniqueId = (command: Command): string => {
    // Если в кэше уже есть ID для этой команды, возвращаем его
    if (commandIDCache.has(command)) {
      return commandIDCache.get(command)!;
    }

    // Иначе генерируем новый ID и сохраняем в кэш
    const id = nanoid();
    commandIDCache.set(command, id);
    return id;
  };

  // Определяем, является ли команда текущим состоянием графа
  // Текущее состояние - это последняя команда в стеке отмены
  const isCurrentState = (command: Command): boolean => {
    if (historyState.undoStack.length === 0) return false;

    // Текущее состояние - это только последняя команда в стеке отмены
    const lastCommand = historyState.undoStack[historyState.undoStack.length - 1];

    // Сравниваем команды по их уникальным идентификаторам
    return getCommandUniqueId(command) === getCommandUniqueId(lastCommand);
  };

  // Определяем, находится ли команда в стеке отмены
  const isRedoStackCommand = (command: Command): boolean => {
    // Используем метод some для поиска команды с таким же уникальным ID в стеке redo
    return historyState.redoStack.some((redoCmd) => getCommandUniqueId(redoCmd) === getCommandUniqueId(command));
  };

  // Компонент элемента истории
  const HistoryItem = ({command}: {command: Command}) => {
    const metadata = command.getMetadata?.() || {timestamp: Date.now()};
    const commandName = getCommandDisplayName(command);
    const details = getCommandDetails(command);
    // Используем новую функцию для генерации уникального ID команды
    const commandId = getCommandUniqueId(command);
    const isSelected = commandId === selectedCommandId;
    const hasTarget = getCommandTargetId(command) !== null;
    const isCurrent = isCurrentState(command);
    const isRedoCommand = isRedoStackCommand(command);

    // Обработчик клика с уникальным ID
    const handleClick = () => {
      if (hasTarget) {
        // Используем уникальный ID для выбора команды
        setSelectedCommandId(commandId);
        handleHistoryItemClick(command);
      }
    };

    return (
      <li
        className={cls(s.history_item, {
          [s.history_item_selected]: isSelected,
          [s.history_item_clickable]: hasTarget,
          [s.history_item_current]: isCurrent,
          [s.history_item_redo]: isRedoCommand
        })}
        onClick={handleClick}
      >
        <div className={s.history_item_header}>
          <Text size='1' weight='medium'>
            {commandName}
          </Text>
        </div>
        {details && (
          <div className={s.history_item_details}>
            <Text size='1' className={s.history_item_detail}>
              {details}
            </Text>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={s.history_view}>
      <div className={s.history_section}>
        {historyState.redoStack.length > 0 && (
          <ul className={s.history_list}>
            {historyState.redoStack.map((cmd, index) => (
              <HistoryItem key={`redo-${index}`} command={cmd} />
            ))}
          </ul>
        )}
      </div>

      {historyState.redoStack.length > 0 && <Separator orientation='horizontal' size='4' />}

      <div className={s.history_section}>
        {historyState.undoStack.length > 0 ? (
          <ul className={s.history_list}>
            {[...historyState.undoStack].reverse().map((cmd, cmdIndex) => (
              <HistoryItem key={`cmd-${cmdIndex}`} command={cmd} />
            ))}
          </ul>
        ) : (
          <Text size='1' className={s.empty_history}>
            {t('sidebar.history_empty', 'History is empty')}
          </Text>
        )}
      </div>
    </div>
  );
};
