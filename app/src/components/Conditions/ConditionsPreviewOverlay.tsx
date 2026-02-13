import React, {useCallback, useMemo} from 'react';

import {useViewport} from '@xyflow/react';

import {Condition} from '../../types/nodes';
import {ConditionsPreview} from './ConditionsPreview';

import styles from './Conditions.module.scss';

interface ConditionsPreviewOverlayProps {
  isVisible: boolean;
  position: {x: number; y: number};
  edgeId: string;
  onOpenConditionModal: (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => void;
  onClose: () => void;
}

// Определяем компонент без React.memo в начале
export const ConditionsPreviewOverlay: React.FC<ConditionsPreviewOverlayProps> = ({isVisible, position, edgeId, onOpenConditionModal, onClose}) => {
  // Используем viewport для получения текущего масштаба и смещения
  const {x, y, zoom} = useViewport();

  // Создаем стабильный обработчик с useCallback для открытия модального окна добавления условий
  const handleOpenConditionModal = useCallback(
    (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => {
      // Используем глобальную функцию для открытия модального окна с условиями
      // если она доступна
      if (window.goflow && window.goflow.openConditionModal) {
        window.goflow.openConditionModal({
          edgeId,
          position,
          conditionType,
          existingCondition
        });
      } else if (onOpenConditionModal) {
        // Если глобальная функция недоступна, используем переданную через параметры
        // Вызываем функцию непосредственно, когда она доступна
        onOpenConditionModal(conditionType, existingCondition);
      }
    },
    [onOpenConditionModal, edgeId, position]
  );

  // Вычисляем абсолютную позицию в пикселях с учетом текущего viewport графа
  const absoluteX = position.x * zoom + x;
  const absoluteY = position.y * zoom + y;

  // Мемоизируем стили overlay для предотвращения ненужных пересчетов
  const overlayStyle = useMemo(
    () => ({
      left: absoluteX,
      top: absoluteY,
      transform: `translate(-50%, -50%)`
    }),
    [absoluteX, absoluteY]
  );

  // Мемоизируем position для ConditionsPreview
  const centerPosition = useMemo(() => ({x: 0, y: 0}), []);

  // После всех хуков проверяем видимость
  if (!isVisible) return null;

  return (
    <div className={styles.conditions_preview_overlay} style={overlayStyle} onClick={(e) => e.stopPropagation()} data-testid='conditions-preview-overlay'>
      <ConditionsPreview edgeId={edgeId} position={centerPosition} onOpenConditionModal={handleOpenConditionModal} onClose={onClose} />
    </div>
  );
};

// Применяем React.memo только один раз при экспорте
export default React.memo(ConditionsPreviewOverlay);
