'use client';

import {useEffect, useRef, useState} from 'react';

import {usePipelinePricing} from '@hooks/usePipelinePricing';
import {useTeamAIAccess} from '@hooks/useTeamAIAccess';
import {ArrowRightIcon, ComponentInstanceIcon, LightningBoltIcon, PaddingIcon, StackIcon, UpdateIcon} from '@radix-ui/react-icons';
import {Button, Text, Tooltip} from '@radix-ui/themes';
import {trackCanvasAINextNode} from '@services/analytics';
import {ProjectDataService} from '@services/projectDataService';
import {useReactFlow} from '@xyflow/react';
import {useTranslation} from 'react-i18next';
import {useAINodeActions} from 'src/hooks/useAINodeActions';
import {useNewObjDialogActions} from 'src/hooks/useNewObjDialogActions';

import {useCanvasStore} from '@store/useCanvasStore';
import {useEditingStore} from '@store/useEditingStore';
import {useGraphStore} from '@store/useGraphStore';

import {NoAIAccessModal} from '@components/common/NoAIAccessModal';

import {getHotkeyWithModifier, isMacOS} from '../../../utils/keyboardModifiers';

import s from './NewObjDialog.module.scss';

interface NewObjDialogProps {
  nodeId: string;
  handleId?: string;
  onBeforeCreate?: () => void; // колбэк от родителей
}

const NewObjDialog = ({nodeId, handleId, onBeforeCreate}: NewObjDialogProps) => {
  const {createChoiceNode, createChoiceNodeBelow, createNarrativeNode, createLayerNode} = useNewObjDialogActions(nodeId, handleId);
  const deselectAllNodes = useCanvasStore((s) => s.deselectAllNodes);
  const deactivateAllEditingModes = useEditingStore((s) => s.deactivateAllEditingModes);
  const reactFlowInstance = useReactFlow();
  const dialogRef = useRef<HTMLDivElement>(null);
  const {t} = useTranslation();
  const layers = useGraphStore((s) => s.layers);
  const currLayerId = useGraphStore((s) => s.currentGraphId);
  const {getFormattedPrice} = usePipelinePricing();
  const nextNodePrice = getFormattedPrice('next-node-generation-pipeline-v2');

  // Проверка доступа к ИИ
  const {hasAIAccess, isTeamPlan} = useTeamAIAccess();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  // AI функциональность через новый хук
  const {loadingAction, handleNextNodeV2} = useAINodeActions({
    nodeId,
    onComplete: onBeforeCreate
  });

  const currNodeType = layers[currLayerId]?.nodes[nodeId]?.type;

  // Предотвращение захвата узлов при взаимодействии с диалогом
  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (dialogElement) {
      // Добавляем классы для предотвращения перетаскивания и других операций React Go Flow
      dialogElement.classList.add('nodrag', 'nopan', 'nowheel');

      return () => {
        // Очищаем классы при размонтировании
        dialogElement.classList.remove('nodrag', 'nopan', 'nowheel');
      };
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Получаем информацию о платформе
      const isMac = isMacOS();

      // Проверяем нажатие правильного модификатора для текущей платформы
      const hasPlatformModifier = isMac ? e.metaKey : e.ctrlKey;

      // Проверяем нажатие Ctrl+цифра или Cmd+цифра для Mac
      if (hasPlatformModifier && e.key === '1') {
        e.preventDefault();
        e.stopPropagation(); // Важно остановить всплытие события
        if (onBeforeCreate) {
          onBeforeCreate();
        }
        deactivateAllEditingModes();
        deselectAllNodes();
        createNarrativeNode();
        return; // Выходим после обработки
      }

      if (hasPlatformModifier && e.key === '2') {
        e.preventDefault();
        e.stopPropagation(); // Важно остановить всплытие события

        // Блокируем создание узла выбора, если текущий узел - выбор
        if (currNodeType === 'choice') {
          if (onBeforeCreate) {
            onBeforeCreate();
          }
          deactivateAllEditingModes();
          deselectAllNodes();
          createChoiceNodeBelow();
          return;
        } else {
          if (onBeforeCreate) {
            onBeforeCreate();
          }
          deactivateAllEditingModes();
          deselectAllNodes();
          createChoiceNode();
          return; // Выходим после обработки
        }
      }

      if (hasPlatformModifier && e.key === '3') {
        e.preventDefault();
        e.stopPropagation(); // Важно остановить всплытие события
        if (onBeforeCreate) {
          onBeforeCreate();
        }
        deactivateAllEditingModes();
        deselectAllNodes();
        createLayerNode();
        return; // Выходим после обработки
      }

      if (hasPlatformModifier && e.key === '4') {
        e.preventDefault();
        e.stopPropagation(); // Важно остановить всплытие события
        handleNextNodeV2(); // Следующий узел
        return; // Выходим после обработки
      }
    };

    // Используем capture: true чтобы получить событие до блокировщика
    document.addEventListener('keydown', handler, {capture: true});
    return () => document.removeEventListener('keydown', handler, {capture: true});
  }, [
    nodeId,
    onBeforeCreate,
    deselectAllNodes,
    createNarrativeNode,
    createChoiceNode,
    createChoiceNodeBelow,
    createLayerNode,
    deactivateAllEditingModes,
    currNodeType,
    reactFlowInstance,
    handleNextNodeV2
  ]);

  const createNextNodeV2 = () => {
    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      setShowNoAccessModal(true);
      return;
    }

    const projectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
    const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

    trackCanvasAINextNode(currNodeType, projectId, timelineId);
    handleNextNodeV2();
  };

  const createNarrative = () => {
    if (onBeforeCreate) {
      onBeforeCreate();
    }
    deactivateAllEditingModes();
    deselectAllNodes();
    createNarrativeNode();
  };

  const createChoice = () => {
    if (onBeforeCreate) {
      onBeforeCreate();
    }
    deactivateAllEditingModes();
    deselectAllNodes();
    createChoiceNode();
  };

  const createLayer = () => {
    if (onBeforeCreate) {
      onBeforeCreate();
    }
    deactivateAllEditingModes();
    deselectAllNodes();
    createLayerNode();
  };

  return (
    <>
      <div ref={dialogRef} className={s.menu} data-testid='new-obj-dialog'>
        <Text className={s.text} size='1' color='gray' weight='bold'>
          {t('new_obj_dialog.new_object', 'New object')}
        </Text>
        <Button className={s.menuItem} size='1' color='gray' onClick={createNarrative}>
          <PaddingIcon className={s.icon} /> {t('new_obj_dialog.narrative', 'Narrative')}
          <kbd>{getHotkeyWithModifier('1')}</kbd>
        </Button>
        {currNodeType !== 'choice' && (
          <Button className={s.menuItem} size='1' color='gray' onClick={createChoice}>
            <ComponentInstanceIcon className={s.icon} /> {t('new_obj_dialog.choice', 'Choice')} <kbd>{getHotkeyWithModifier('2')}</kbd>
          </Button>
        )}

        <Button className={s.menuItem} size='1' color='gray' onClick={createLayer}>
          <StackIcon className={s.icon} /> {t('new_obj_dialog.layer', 'Layer')} <kbd>{getHotkeyWithModifier('3')}</kbd>
        </Button>

        <Text className={s.text} size='1' color='gray' weight='bold' style={{marginTop: '16px'}}>
          {t('new_obj_dialog.ai_assistant', 'AI-ассистент')}
        </Text>

        <Tooltip
          content={
            isTeamPlan && !hasAIAccess
              ? t('ai_access.no_access_tooltip', 'Нет доступа к ИИ. Обратитесь к администратору команды.')
              : t('new_obj_dialog.next_node_tooltip', 'Создать следующий узел с помощью ИИ')
          }
        >
          <Button className={`${s.menuItem} ${s.aiButton}`} size='1' color='gray' onClick={createNextNodeV2} disabled={loadingAction !== null || (isTeamPlan && !hasAIAccess)}>
            {loadingAction === 'NEXT_NODES' ? <UpdateIcon className={s.spinner} /> : <PaddingIcon className={s.lightningIcon} />}
            <span className={s.buttonText}>{t('new_obj_dialog.next_node', 'Next node')}</span>
            {nextNodePrice && nextNodePrice !== '—' && (
              <span className={s.priceTag}>
                <LightningBoltIcon className={s.priceLightning} />
                {nextNodePrice}
              </span>
            )}
            {loadingAction !== 'NEXT_NODES' && <kbd>{getHotkeyWithModifier('4')}</kbd>}
          </Button>
        </Tooltip>

        {/* <Button className={s.menuItem} size='1' color='gray' onClick={createStructure} disabled={loadingAction !== null}>
        {loadingAction === 'STRUCTURE_ONLY' ? <UpdateIcon className={s.spinner} /> : <MagicWandIcon className={s.icon} />}
        {t('new_obj_dialog.structure', 'Структура')}
        {loadingAction !== 'STRUCTURE_ONLY' && <kbd>{getHotkeyWithModifier('5')}</kbd>}
      </Button> */}
      </div>

      {/* Модальное окно для отсутствия доступа к ИИ */}
      <NoAIAccessModal isOpen={showNoAccessModal} onClose={() => setShowNoAccessModal(false)} />
    </>
  );
};

export default NewObjDialog;
