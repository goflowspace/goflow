import React, {useEffect, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {Dialog} from '@radix-ui/themes';
import {api} from '@services/api';
import {Entity, EntityType} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';

import {EntityForm} from '../Dashboard/Entities/EntityForm/EntityForm';

import s from './CreateEntityModal.module.scss';

interface CreateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntitySaved?: (entity: Entity, isNew: boolean) => void;
  projectId?: string; // Добавляем возможность передать projectId
  entity?: Entity | null; // Добавляем возможность передать сущность для редактирования
  defaultEntityTypeId?: string; // Добавляем возможность передать тип сущности по умолчанию
}

export const CreateEntityModal: React.FC<CreateEntityModalProps> = ({isOpen, onClose, onEntitySaved, projectId: propProjectId, entity = null, defaultEntityTypeId}) => {
  const {t} = useTranslation();
  const {projectId: hookProjectId} = useCurrentProject();
  const projectId = propProjectId || hookProjectId; // Используем переданный projectId или из хука
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = entity !== null;

  // Загружаем типы сущностей при открытии модального окна
  useEffect(() => {
    if (isOpen && projectId) {
      loadEntityTypes();
    }
  }, [isOpen, projectId]);

  const loadEntityTypes = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const types = await api.getEntityTypes(projectId);
      setEntityTypes(types);
    } catch (error) {
      console.error('Failed to load entity types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (savedEntity: Entity) => {
    if (onEntitySaved) {
      onEntitySaved(savedEntity, !isEditing);
    }
    onClose();
  };

  if (!projectId) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content className={s.modal} data-modal='entity-modal'>
        <Dialog.Title className={s.title}>
          {isEditing ? `${t('dashboard.entities.edit_entity', 'Редактировать сущность')} "${entity?.name}"` : t('dashboard.entities.create_entity', 'Создать сущность')}
        </Dialog.Title>

        {isLoading ? (
          <div className={s.loading}>
            <div className={s.spinner} />
            <span>{t('dashboard.entities.loading', 'Загрузка...')}</span>
          </div>
        ) : (
          <div className={s.content}>
            <div className={s.formWrapper}>
              <EntityForm
                key={entity?.id || 'new'} // Принудительно перерендериваем форму при смене entity
                projectId={projectId}
                entity={entity}
                entityTypes={entityTypes}
                onSave={handleSave}
                onCancel={onClose}
                defaultEntityTypeId={defaultEntityTypeId}
              />
            </div>
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};
