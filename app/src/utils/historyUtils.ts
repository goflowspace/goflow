import i18next from 'i18next';

import {Command} from '../commands/CommandInterface';
import {useGraphStore} from '../store/useGraphStore';

// Функция для получения экземпляра i18next для использования вне React-компонентов
function getTranslation() {
  return i18next;
}

/**
 * Возвращает человекочитаемое название команды
 */
export function getCommandDisplayName(command: Command): string {
  const i18n = getTranslation();
  // Получаем тип команды с помощью метода getType или имени конструктора
  const commandType = command.getType?.() || command.constructor.name.replace('Command', '');

  // Преобразуем название в человекочитаемый вид
  switch (commandType) {
    case 'CreateLayer':
      return i18n.t('command.layer_created', 'Layer created');
    case 'DeleteLayer':
      return i18n.t('command.layer_deleted', 'Layer deleted');
    case 'CreateNarrativeNode':
      return i18n.t('command.narrative_created', 'Narrative node created');
    case 'DeleteNarrativeNode':
      return i18n.t('command.narrative_deleted', 'Narrative node deleted');
    case 'EditNarrativeNode':
      return i18n.t('command.narrative_edited', 'Narrative node edited');
    case 'MoveNarrativeNode':
      return i18n.t('command.narrative_moved', 'Narrative node moved');
    case 'CreateNote':
      return i18n.t('command.note_created', 'Note created');
    case 'DeleteNote':
      return i18n.t('command.note_deleted', 'Note deleted');
    case 'EditNote':
      return i18n.t('command.note_edited', 'Note edited');
    case 'MoveNote':
      return i18n.t('command.note_moved', 'Note moved');
    case 'ChangeNoteColor':
      return i18n.t('command.note_color_changed', 'Note color changed');
    case 'CreateChoiceNode':
      return i18n.t('command.choice_created', 'Choice node created');
    case 'DeleteChoiceNode':
      return i18n.t('command.choice_deleted', 'Choice node deleted');
    case 'EditChoiceNodeText':
      return i18n.t('command.choice_text_edited', 'Choice text edited');
    case 'MoveChoiceNode':
      return i18n.t('command.choice_moved', 'Choice node moved');
    case 'ConnectChoiceNode':
      return i18n.t('command.connection_created', 'Connection created');
    case 'ConnectNarrativeNode':
      return i18n.t('command.connection_created', 'Connection created');
    case 'Connect':
      return i18n.t('command.connection_created', 'Connection created');
    case 'DeleteEdge':
      return i18n.t('command.connection_deleted', 'Connection deleted');
    case 'MoveLayer':
      return i18n.t('command.layer_moved', 'Layer moved');
    case 'EditLayer':
      return i18n.t('command.layer_edited', 'Layer edited');
    case 'CutNodes':
      return i18n.t('command.nodes_cut', 'Nodes cut');
    case 'PasteNodes':
      return i18n.t('command.nodes_pasted', 'Nodes pasted');
    case 'DuplicateNodes':
      return i18n.t('command.nodes_duplicated', 'Nodes duplicated');
    default:
      return commandType;
  }
}

/**
 * Возвращает детали команды для отображения в истории
 */
export function getCommandDetails(command: Command): string | null {
  const metadata = command.getMetadata?.();

  if (!metadata || !metadata.details) {
    // Пробуем получить детали из самой команды, если она их не предоставляет
    return getDefaultCommandDetails(command);
  }

  return formatCommandDetails(command, metadata.details);
}

/**
 * Возвращает идентификатор объекта, связанного с командой
 * Если это команда удаления, вернет null, т.к. объект уже удален
 */
export function getCommandTargetId(command: Command): string | null {
  const commandClassName = command.constructor.name;

  // Для команд удаления возвращаем null
  if (commandClassName.startsWith('Delete')) {
    return null;
  }

  // Получаем идентификатор узла из команды
  const commandObj = command as any;

  // Проверяем поля, которые могут содержать идентификатор
  if (commandObj.nodeId) {
    return commandObj.nodeId;
  }

  if (commandObj.layerId) {
    return commandObj.layerId;
  }

  if (commandObj.choiceId) {
    return commandObj.choiceId;
  }

  if (commandObj.noteId) {
    return commandObj.noteId;
  }

  if (commandObj.node && commandObj.node.id) {
    return commandObj.node.id;
  }

  if (commandObj.layerNode && commandObj.layerNode.id) {
    return commandObj.layerNode.id;
  }

  // Получаем из метаданных, если они есть
  const metadata = command.getMetadata?.();
  if (metadata && metadata.details && metadata.details.nodeId) {
    return metadata.details.nodeId;
  }

  return null;
}

/**
 * Форматирует детали команды в зависимости от ее типа
 */
function formatCommandDetails(command: Command, details: Record<string, any>): string | null {
  const i18n = getTranslation();
  const commandClassName = command.constructor.name;

  switch (commandClassName) {
    case 'CreateLayerCommand':
      return details.name ? `"${details.name}"` : i18n.t('command.without_name', 'without name');

    case 'EditLayerCommand':
      return details.newName ? `"${details.newName}"` : null;

    case 'EditNarrativeNodeCommand':
      if (details.newData && details.newData.title) {
        return `"${details.newData.title}"`;
      }
      return details.newData && details.newData.text ? `"${details.newData.text.substring(0, 20)}${details.newData.text.length > 20 ? '...' : ''}"` : null;

    case 'CreateNarrativeNodeCommand':
      if (details.data && details.data.title) {
        return `"${details.data.title}"`;
      }
      return details.data && details.data.text ? `"${details.data.text.substring(0, 20)}${details.data.text.length > 20 ? '...' : ''}"` : null;

    case 'EditChoiceNodeTextCommand':
      return details.newText ? `"${details.newText.substring(0, 20)}${details.newText.length > 20 ? '...' : ''}"` : null;

    case 'EditNoteCommand':
      return details.newText ? `"${details.newText.substring(0, 20)}${details.newText.length > 20 ? '...' : ''}"` : null;

    case 'ChangeNoteColorCommand':
      return details.newColor ? `to ${details.newColor}` : null;

    case 'ConnectCommand':
    case 'ConnectNarrativeNodeCommand':
    case 'ConnectChoiceNodeCommand':
      return formatConnectionDetails(details.connection);

    case 'DeleteEdgeCommand':
      return formatDeleteEdgeDetails(details);

    case 'CutNodesCommand':
      return details.nodesCount ? i18n.t('clipboard.nodes_cut', {count: details.nodesCount}) : null;

    case 'PasteNodesCommand':
      return details.nodesCount ? i18n.t('clipboard.nodes_pasted', {count: details.nodesCount}) : null;

    case 'DuplicateNodesCommand':
      return details.nodesCount ? i18n.t('clipboard.nodes_duplicated', {count: details.nodesCount}) : null;

    default:
      return null;
  }
}

/**
 * Получает детали команды напрямую из объекта команды,
 * если они не предоставлены через метаданные
 */
function getDefaultCommandDetails(command: Command): string | null {
  const commandObj = command as any;

  // Проверяем различные поля, которые могут содержать полезную информацию
  if (commandObj.layerNode && commandObj.layerNode.name) {
    return `"${commandObj.layerNode.name}"`;
  }

  if (commandObj.node && commandObj.node.data) {
    if (commandObj.node.data.title) {
      return `"${commandObj.node.data.title}"`;
    }
    if (commandObj.node.data.text) {
      return `"${commandObj.node.data.text.substring(0, 20)}${commandObj.node.data.text.length > 20 ? '...' : ''}"`;
    }
  }

  if (commandObj.newData) {
    if (commandObj.newData.title) {
      return `"${commandObj.newData.title}"`;
    }
    if (commandObj.newData.text) {
      return `"${commandObj.newData.text.substring(0, 20)}${commandObj.newData.text.length > 20 ? '...' : ''}"`;
    }
  }

  if (commandObj.newText) {
    return `"${commandObj.newText.substring(0, 20)}${commandObj.newText.length > 20 ? '...' : ''}"`;
  }

  if (commandObj.newName) {
    return `"${commandObj.newName}"`;
  }

  if (commandObj.newColor) {
    return `to ${commandObj.newColor}`;
  }

  return null;
}

/**
 * Получает информацию о соединяемых узлах
 */
function formatConnectionDetails(connection: any): string | null {
  if (!connection || !connection.source || !connection.target) {
    return null;
  }

  // Получаем информацию о узлах
  const graphStore = useGraphStore.getState();
  const {currentGraphId, layers} = graphStore;
  const currentLayer = layers[currentGraphId];

  if (!currentLayer || !currentLayer.nodes) {
    return null;
  }

  const sourceNode = currentLayer.nodes[connection.source];
  const targetNode = currentLayer.nodes[connection.target];

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Формируем описание для исходного узла
  let sourceDesc = 'from ';
  if (sourceNode.type === 'narrative') {
    if (sourceNode.data?.title) {
      sourceDesc += `"${sourceNode.data.title}"`;
    } else if (sourceNode.data?.text) {
      const shortText = sourceNode.data.text.substring(0, 20) + (sourceNode.data.text.length > 20 ? '...' : '');
      sourceDesc += `"${shortText}"`;
    } else {
      sourceDesc += 'Narrative node';
    }
  } else if (sourceNode.type === 'choice') {
    if (sourceNode.data?.text) {
      const shortText = sourceNode.data.text.substring(0, 20) + (sourceNode.data.text.length > 20 ? '...' : '');
      sourceDesc += `"${shortText}"`;
    } else {
      sourceDesc += 'Choice';
    }
  } else {
    sourceDesc += sourceNode.type;
  }

  // Формируем описание для целевого узла
  let targetDesc = 'to ';
  if (targetNode.type === 'narrative') {
    if (targetNode.data?.title) {
      targetDesc += `"${targetNode.data.title}"`;
    } else if (targetNode.data?.text) {
      const shortText = targetNode.data.text.substring(0, 20) + (targetNode.data.text.length > 20 ? '...' : '');
      targetDesc += `"${shortText}"`;
    } else {
      targetDesc += 'Narrative node';
    }
  } else if (targetNode.type === 'choice') {
    if (targetNode.data?.text) {
      const shortText = targetNode.data.text.substring(0, 20) + (targetNode.data.text.length > 20 ? '...' : '');
      targetDesc += `"${shortText}"`;
    } else {
      targetDesc += 'Choice';
    }
  } else {
    targetDesc += targetNode.type;
  }

  return `${sourceDesc} ${targetDesc}`;
}

/**
 * Форматирует детали удаления ребра
 */
function formatDeleteEdgeDetails(details: Record<string, any>): string | null {
  if (!details || (!details.source && !details.target)) {
    return null;
  }

  // Получаем информацию о узлах
  const graphStore = useGraphStore.getState();
  const {currentGraphId, layers} = graphStore;
  const currentLayer = layers[currentGraphId];

  if (!currentLayer || !currentLayer.nodes) {
    return null;
  }

  const sourceId = details.source;
  const targetId = details.target;

  if (!sourceId || !targetId) {
    return details.edgeId ? `ID: ${details.edgeId}` : null;
  }

  const sourceNode = currentLayer.nodes[sourceId];
  const targetNode = currentLayer.nodes[targetId];

  // Если узлы уже удалены, просто показываем идентификаторы
  if (!sourceNode && !targetNode) {
    return `from ${sourceId} to ${targetId}`;
  }

  // Формируем описание для исходного узла
  let sourceDesc = 'от ';
  if (sourceNode) {
    if (sourceNode.type === 'narrative') {
      if (sourceNode.data?.title) {
        sourceDesc += `"${sourceNode.data.title}"`;
      } else if (sourceNode.data?.text) {
        const shortText = sourceNode.data.text.substring(0, 20) + (sourceNode.data.text.length > 20 ? '...' : '');
        sourceDesc += `"${shortText}"`;
      } else {
        sourceDesc += 'Narrative node';
      }
    } else if (sourceNode.type === 'choice') {
      if (sourceNode.data?.text) {
        const shortText = sourceNode.data.text.substring(0, 20) + (sourceNode.data.text.length > 20 ? '...' : '');
        sourceDesc += `"${shortText}"`;
      } else {
        sourceDesc += 'Choice';
      }
    } else {
      sourceDesc += sourceNode.type;
    }
  } else {
    sourceDesc += `node ${sourceId}`;
  }

  // Формируем описание для целевого узла
  let targetDesc = 'к ';
  if (targetNode) {
    if (targetNode.type === 'narrative') {
      if (targetNode.data?.title) {
        targetDesc += `"${targetNode.data.title}"`;
      } else if (targetNode.data?.text) {
        const shortText = targetNode.data.text.substring(0, 20) + (targetNode.data.text.length > 20 ? '...' : '');
        targetDesc += `"${shortText}"`;
      } else {
        targetDesc += 'Narrative node';
      }
    } else if (targetNode.type === 'choice') {
      if (targetNode.data?.text) {
        const shortText = targetNode.data.text.substring(0, 20) + (targetNode.data.text.length > 20 ? '...' : '');
        targetDesc += `"${shortText}"`;
      } else {
        targetDesc += 'Choice';
      }
    } else {
      targetDesc += targetNode.type;
    }
  } else {
    targetDesc += `node ${targetId}`;
  }

  return `${sourceDesc} ${targetDesc}`;
}
