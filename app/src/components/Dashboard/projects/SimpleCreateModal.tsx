import React, {useCallback} from 'react';

import TemplateSelectionModal from './TemplateSelectionModal';

interface SimpleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isCreating?: boolean;
}

const SimpleCreateModal: React.FC<SimpleCreateModalProps> = ({isOpen, onClose, onCreate, isCreating = false}) => {
  const handleCreateWithTemplate = useCallback(
    (name: string, templateId?: string) => {
      // Обновляем для поддержки шаблонов
      console.log('SimpleCreateModal: handleCreateWithTemplate called with', {name, templateId});
      if (onCreate.length >= 2) {
        // Новая версия функции с поддержкой templateId
        (onCreate as any)(name, templateId);
      } else {
        // Старая версия функции для обратной совместимости
        onCreate(name);
      }
    },
    [onCreate]
  );

  const handleTemplateSelect = useCallback((templateId: string | null) => {
    // Этот обработчик не используется в текущей реализации
  }, []);

  return <TemplateSelectionModal isOpen={isOpen} onClose={onClose} onTemplateSelect={handleTemplateSelect} onCreate={handleCreateWithTemplate} isCreating={isCreating} />;
};

export default SimpleCreateModal;
