import React, {useCallback, useState} from 'react';

import {usePipelinePricing} from '@hooks/usePipelinePricing';
import {useTeamAIAccess} from '@hooks/useTeamAIAccess';
import {LightningBoltIcon} from '@radix-ui/react-icons';
import {trackCanvasAIFillNode} from '@services/analytics';
import {ProjectDataService} from '@services/projectDataService';
import cls from 'classnames';
import {SparklesIcon} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';

import {NoAIAccessModal} from '@components/common/NoAIAccessModal';

import s from './AIFillButton.module.scss';

interface AIFillButtonProps {
  /**
   * ID узла для которого выполняется fill
   */
  nodeId: string;
  /**
   * Есть ли текст в узле (для состояния активности кнопки)
   */
  hasText: boolean;
  /**
   * Коллбэк для выполнения fill операции
   */
  onFill: (nodeId: string) => Promise<void>;
  /**
   * Состояние загрузки
   */
  isLoading?: boolean;
}

/**
 * Компактная кнопка AI Fill для нарративных узлов
 */
export const AIFillButton: React.FC<AIFillButtonProps> = ({nodeId, hasText, onFill, isLoading = false}) => {
  const {t} = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const {getFormattedPrice} = usePipelinePricing();

  // Проверка доступа к ИИ
  const {hasAIAccess, isTeamPlan} = useTeamAIAccess();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!hasText || isProcessing || isLoading) {
        return;
      }

      // Проверяем доступ к ИИ для Team планов
      if (isTeamPlan && !hasAIAccess) {
        setShowNoAccessModal(true);
        return;
      }

      const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
      const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

      try {
        setIsProcessing(true);
        await onFill(nodeId);
        trackCanvasAIFillNode('NodeButton', 'Narrative', projectId, timelineId);
      } catch (error) {
        console.error('AI Fill failed:', error);
      } finally {
        setIsProcessing(false);
      }
    },
    [nodeId, hasText, onFill, isProcessing, isLoading]
  );

  const isDisabledDueToAIAccess = isTeamPlan && !hasAIAccess;
  const isDisabled = !hasText || isProcessing || isLoading || isDisabledDueToAIAccess;
  const pipelinePrice = getFormattedPrice('narrative-text-generation-pipeline-v2');

  return (
    <>
      <button
        className={cls(s.aiFillButton, {
          [s.disabled]: isDisabled,
          [s.processing]: isProcessing || isLoading
        })}
        onClick={handleClick}
        disabled={isDisabled}
        title={
          isDisabledDueToAIAccess
            ? t('ai_access.no_access_tooltip', 'Нет доступа к ИИ. Обратитесь к администратору команды.')
            : hasText
              ? t('narrative_node.ai_fill_tooltip_active')
              : t('narrative_node.ai_fill_tooltip_inactive')
        }
      >
        {/* <SparklesIcon */}
        {/* className={cls(s.icon, { */}
        {/* [s.spin]: isProcessing || isLoading */}
        {/* })} */}
        {/* size={14} */}
        {/* /> */}
        <span className={s.text}>{t('narrative_node.ai_fill_button')}</span>
        {pipelinePrice && pipelinePrice !== '—' && (
          <span className={s.price} style={{display: 'inline-flex', alignItems: 'center', gap: '2px'}}>
            <LightningBoltIcon className={s.icon} style={{width: '12px', height: '12px'}} />
            {pipelinePrice}
          </span>
        )}
      </button>

      <NoAIAccessModal isOpen={showNoAccessModal} onClose={() => setShowNoAccessModal(false)} />
    </>
  );
};
