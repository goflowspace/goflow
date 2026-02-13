import {useMemo} from 'react';

import {Node} from '../../types/nodes';
import {usePlaybackLog} from '../ui/PlaybackLogPanelV2/contexts/LogContext';
import {applyNodeLocalization} from '../utils/localizationCompleteness';

/**
 * Хук для получения локализованной версии узла
 * @param node Исходный узел
 * @returns Локализованная версия узла или исходный узел если локализация недоступна
 */
export function useLocalizedNode(node: Node): Node {
  const {selectedLanguage, localizationData} = usePlaybackLog();

  const localizedNode = useMemo(() => {
    // Если нет данных локализации или выбран базовый язык, возвращаем исходный узел
    if (!localizationData || !selectedLanguage || selectedLanguage === localizationData.baseLanguage) {
      return node;
    }

    // Применяем локализацию к узлу
    return applyNodeLocalization(node, selectedLanguage, localizationData.localizations);
  }, [node, selectedLanguage, localizationData]);

  return localizedNode;
}

/**
 * Хук для получения локализованного массива узлов
 * @param nodes Массив исходных узлов
 * @returns Массив локализованных узлов
 */
export function useLocalizedNodes(nodes: Node[]): Node[] {
  const {selectedLanguage, localizationData} = usePlaybackLog();

  const localizedNodes = useMemo(() => {
    // Если нет данных локализации или выбран базовый язык, возвращаем исходные узлы
    if (!localizationData || !selectedLanguage || selectedLanguage === localizationData.baseLanguage) {
      return nodes;
    }

    // Применяем локализацию ко всем узлам
    return nodes.map((node) => applyNodeLocalization(node, selectedLanguage, localizationData.localizations));
  }, [nodes, selectedLanguage, localizationData]);

  return localizedNodes;
}
