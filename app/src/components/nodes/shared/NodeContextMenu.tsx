'use client';

import React, {useEffect, useRef, useState} from 'react';

import {useTeamAIAccess} from '@hooks/useTeamAIAccess';
import {MagicWandIcon, PlayIcon, TrashIcon} from '@radix-ui/react-icons';
import {Node} from '@xyflow/react';
import {useTranslation} from 'react-i18next';

import {NoAIAccessModal} from '@components/common/NoAIAccessModal';

import s from './NodeContextMenu.module.scss';

interface NodeContextMenuProps {
  isOpen: boolean;
  position: {x: number; y: number};
  node: Node | null;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onAIAction?: (nodeId: string) => void;
  onFillAction?: (nodeId: string) => void;
  onPlayFromNode?: (nodeId: string) => void;
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({isOpen, position, node, onClose, onDelete, onAIAction, onFillAction, onPlayFromNode}) => {
  const {t} = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Проверка доступа к ИИ
  const {hasAIAccess, isTeamPlan} = useTeamAIAccess();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Element)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Корректировка позиции меню чтобы оно не выходило за границы экрана
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let {x, y} = position;

      // Проверяем правую границу
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }

      // Проверяем нижнюю границу
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      // Проверяем левую границу
      if (x < 10) {
        x = 10;
      }

      // Проверяем верхнюю границу
      if (y < 10) {
        y = 10;
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [isOpen, position]);

  if (!isOpen || !node) return null;

  // Определяем, является ли содержимое узла пустым
  const isContentEmpty = (nodeData: any) => {
    if (nodeData?.text && nodeData.text.trim()) return false;
    if (nodeData?.title && nodeData.title.trim()) return false;
    return true;
  };

  const handleDelete = () => {
    onDelete(node.id);
    onClose();
  };

  const handleAI = () => {
    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      onClose();
      setShowNoAccessModal(true);
      return;
    }

    if (onAIAction) {
      onAIAction(node.id);
    }
    onClose();
  };

  const handleFill = () => {
    // Проверяем доступ к ИИ для Team планов
    if (isTeamPlan && !hasAIAccess) {
      onClose();
      setShowNoAccessModal(true);
      return;
    }

    if (onFillAction) {
      onFillAction(node.id);
    }
    onClose();
  };

  const handlePlay = () => {
    if (onPlayFromNode) {
      onPlayFromNode(node.id);
    }
    onClose();
  };

  // Создаем элементы меню в зависимости от типа узла
  const menuItems = [];

  // AI действия для нарративных узлов
  if (node.type === 'narrative') {
    if (onFillAction) {
      const isDisabledDueToAIAccess = isTeamPlan && !hasAIAccess;
      menuItems.push({
        label: t('node_context_menu.fill_with_ai', 'Заполнить с помощью AI'),
        icon: MagicWandIcon,
        onClick: handleFill,
        disabled: isDisabledDueToAIAccess,
        tooltip: isDisabledDueToAIAccess ? t('ai_access.no_access_tooltip', 'Нет доступа к ИИ. Обратитесь к администратору команды.') : undefined
      });
    }

    // menuItems.push({
    //   label: t('node_context_menu.rephrase', 'Перефразировать'),
    //   icon: MagicWandIcon,
    //   onClick: handleAI
    // });
  }

  // AI действие для узлов выбора (choice)
  if (node.type === 'choice') {
    const isEmpty = isContentEmpty(node.data);
    const aiLabel = isEmpty ? t('node_context_menu.fill', 'Заполнить') : t('node_context_menu.rephrase', 'Перефразировать');
    const isDisabledDueToAIAccess = isTeamPlan && !hasAIAccess;

    menuItems.push({
      label: aiLabel,
      icon: MagicWandIcon,
      onClick: handleAI,
      disabled: isDisabledDueToAIAccess,
      tooltip: isDisabledDueToAIAccess ? t('ai_access.no_access_tooltip', 'Нет доступа к ИИ. Обратитесь к администратору команды.') : undefined
    });
  }

  // Play кнопка только для нарративных узлов
  if (node.type === 'narrative') {
    menuItems.push({
      label: t('node_context_menu.play_from_here', 'Воспроизвести отсюда'),
      icon: PlayIcon,
      onClick: handlePlay
    });
  }

  // Разделитель перед удалением
  if (menuItems.length > 0) {
    menuItems.push({type: 'divider' as const});
  }

  // Удаление всегда последнее
  menuItems.push({
    label: t('node_context_menu.delete', 'Удалить узел'),
    icon: TrashIcon,
    danger: true,
    onClick: handleDelete
  });

  return (
    <>
      <div
        ref={menuRef}
        className={s.contextMenu}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000
        }}
      >
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={`divider-${index}`} className={s.divider} />;
          }

          const safeItem = item as {
            label: string;
            icon: React.ComponentType<any>;
            danger?: boolean;
            disabled?: boolean;
            tooltip?: string;
            onClick: () => void;
          };

          const menuItemContent = (
            <div
              key={`item-${index}`}
              className={`${s.menuItem} ${safeItem.danger ? s.menuItemDanger : ''} ${safeItem.disabled ? s.menuItemDisabled : ''}`}
              onClick={safeItem.disabled ? undefined : safeItem.onClick}
              style={{
                opacity: safeItem.disabled ? 0.5 : 1,
                cursor: safeItem.disabled ? 'not-allowed' : 'pointer'
              }}
            >
              <safeItem.icon className={s.menuIcon} />
              {safeItem.label}
            </div>
          );

          // Если есть tooltip, оборачиваем в Tooltip
          if (safeItem.tooltip) {
            return (
              <div key={`item-${index}`} title={safeItem.tooltip}>
                {menuItemContent}
              </div>
            );
          }

          return menuItemContent;
        })}
      </div>

      {/* Модальное окно для отсутствия доступа к ИИ */}
      <NoAIAccessModal isOpen={showNoAccessModal} onClose={() => setShowNoAccessModal(false)} />
    </>
  );
};

export default NodeContextMenu;
