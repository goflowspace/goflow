'use client';

import React, {useCallback} from 'react';

import {useRouter} from 'next/navigation';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useCurrentRoute} from '@hooks/useCurrentRoute';
import {ArrowUpIcon, HomeIcon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';

import {EnterMethodType} from '../../services/analytics';
import {getLayerName} from '../../utils/getNodeTitle';
import {buildEditorPath} from '../../utils/navigation';

import styles from './LayerHighlight.module.scss';

/**
 * LayerHighlight - компонент для отображения выделения канваса при входе на слой
 * Показывает розовую рамку вокруг всего канваса и панель с информацией о слое
 */
const LayerHighlight = () => {
  const {t} = useTranslation();
  const router = useRouter();
  const {projectId} = useCurrentProject();
  const {layerId, timelineId} = useCurrentRoute();

  // Получаем слои из хранилища
  const layers = useGraphStore((s) => s.layers);
  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const setLayerEnterMethod = useGraphStore((s) => s.setLayerEnterMethod);

  // Получаем текущий слой
  const currentLayer = layers[currentGraphId];

  // Получаем имя текущего слоя
  const layerName = getLayerName(currentGraphId) || t('layer_highlight.unknown_layer', 'Unknown Layer');

  // Получаем ID родительского слоя
  const parentLayerId = currentLayer?.parentLayerId;

  // Обработчик перехода на корневой уровень
  const handleGoToRoot = useCallback(() => {
    // Устанавливаем метод перехода
    setLayerEnterMethod(EnterMethodType.LayerHighlightRoot);

    if (projectId) {
      router.push(buildEditorPath(projectId, timelineId, 'root'));
    }
  }, [projectId, router, setLayerEnterMethod, timelineId]);

  // Обработчик перехода на родительский уровень
  const handleGoToParent = useCallback(() => {
    // Если нет родительского слоя или это корневой слой, выходим
    if (!parentLayerId || parentLayerId === 'root') {
      handleGoToRoot();
      return;
    }

    // Устанавливаем метод перехода
    setLayerEnterMethod(EnterMethodType.LayerHighlightParent);

    if (projectId) {
      router.push(buildEditorPath(projectId, timelineId, parentLayerId));
    }
  }, [handleGoToRoot, parentLayerId, projectId, router, setLayerEnterMethod, timelineId]);

  // Не показывать подсветку для корневого слоя
  if (currentGraphId === 'root') {
    return null;
  }

  return (
    <div className={styles.layerHighlight}>
      {/* Розовая рамка вокруг всего канваса */}
      <div className={styles.highlightBorder} />

      {/* Панель с информацией о слое и кнопками навигации */}
      <div className={styles.layerPanel}>
        <div className={styles.layerInfo}>
          <span className={styles.layerInfoLabel}>{t('layer_highlight.working_with_layer', "You're working with layer:")}</span>
          <span className={styles.layerInfoName}>{layerName}</span>
        </div>

        <div className={styles.layerActions}>
          <button className={styles.actionButton} onClick={handleGoToRoot} title={t('layer_highlight.go_to_root', 'Go To Root')}>
            <HomeIcon />
          </button>

          <button className={styles.actionButton} onClick={handleGoToParent} title={t('layer_highlight.go_to_parent', 'Go to parent')}>
            <ArrowUpIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayerHighlight;
