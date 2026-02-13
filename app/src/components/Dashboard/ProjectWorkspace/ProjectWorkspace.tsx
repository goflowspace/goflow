'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';

import {useRouter} from 'next/navigation';

import {ChevronDownIcon, ChevronRightIcon, GlobeIcon, Pencil2Icon, PersonIcon, ReaderIcon, RocketIcon} from '@radix-ui/react-icons';
import {trackManagerOpenEditor} from '@services/analytics';
import {api} from '@services/api';
import {Entity, EntityType} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';
import {useCanvasStore} from 'src/store/useCanvasStore';
import {useGraphStore} from 'src/store/useGraphStore';
import {createEmptyProjectState} from 'src/utils/projectStateHelpers';

import {EntitiesWorkspace} from '@components/Dashboard/Entities/EntitiesWorkspace';
import {LocalizationWorkspace} from '@components/Dashboard/Localization/LocalizationWorkspace';
import {ProjectInfo} from '@components/Dashboard/ProjectInfo';
import {WorkspaceNotebookPanel} from '@components/Notebook/WorkspaceNotebookPanel';
import {CreateEntityModal} from '@components/Sidebar/CreateEntityModal';

import {imageGCSService} from '../../../services/imageGCS.service';
import {projectManager} from '../../../services/projectManager';
import {isGCSMediaValue} from '../../../utils/imageAdapterUtils';
import {buildEditorPath, buildEntitiesPath, buildEntityTypePath, buildLocalizationPath, buildProjectPath} from '../../../utils/navigation';
import {useReliableTeamId} from '../../../utils/teamUtils';
import {ImagePlaceholder} from '../../common/ImagePlaceholder';
import ContentPlaceholder from './ContentPlaceholder';

import s from './ProjectWorkspace.module.css';

type WorkspaceSection = 'about' | 'entities' | 'localization' | 'notebook';

interface ProjectWorkspaceProps {
  selectedProjectId?: string;
  selectedProjectName?: string;
  onCreateProject: () => void;
  onProjectNameChange?: (projectId: string, newName: string) => void;
  onProjectInfoSave?: () => void;
  section?: WorkspaceSection;
  filterTypeId?: string;
  openEntityId?: string;
  hideLeftPanel?: boolean;
}

interface EntityTypeWithEntities extends EntityType {
  entities?: Entity[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  selectedProjectId,
  selectedProjectName,
  onCreateProject,
  onProjectNameChange,
  onProjectInfoSave,
  section = 'about',
  filterTypeId,
  openEntityId,
  hideLeftPanel = false
}) => {
  const {t} = useTranslation();
  const router = useRouter();
  const teamId = useReliableTeamId();
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(section);
  const [isLoading, setIsLoading] = useState(false);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Функция для получения thumbnail URL через proxy
  const getThumbnailUrlForEntity = (entity: Entity): string | null => {
    if (!entity.image || !isGCSMediaValue(entity.image) || !teamId || !selectedProjectId) {
      return null;
    }

    return imageGCSService.getThumbnailProxyUrl(teamId, selectedProjectId, entity.id, 'entity-avatar', entity.image);
  };

  // Состояние для сущностей
  const [entityTypes, setEntityTypes] = useState<EntityTypeWithEntities[]>([]);
  const [isEntitiesLoading, setIsEntitiesLoading] = useState(false);
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string | null>(null);

  // Состояние для модального окна редактирования сущностей
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [entityTypesForModal, setEntityTypesForModal] = useState<EntityType[]>([]);

  // Синхронизация активной секции с пропсом
  useEffect(() => {
    setActiveSection(section);
  }, [section]);

  // Загрузка типов сущностей при выборе проекта
  useEffect(() => {
    if (selectedProjectId) {
      loadEntityTypes();
    }
  }, [selectedProjectId]);

  // Обработчик события сохранения сущности для обновления боковой панели
  useEffect(() => {
    const handleEntitySaved = async (event: CustomEvent) => {
      const {entity, isNew} = event.detail;

      // Перезагружаем типы сущностей с актуальными счетчиками
      if (selectedProjectId) {
        await loadEntityTypes();

        // Если была создана новая сущность, раскрываем её тип и обновляем список сущностей в этом типе
        if (isNew && entity?.entityTypeId) {
          // Находим тип и загружаем для него сущности
          const updatedEntities = await loadEntitiesForType(entity.entityTypeId);

          // Обновляем состояние типов
          setEntityTypes((prevTypes) => prevTypes.map((type) => (type.id === entity.entityTypeId ? {...type, entities: updatedEntities, isExpanded: true, isLoading: false} : type)));
        }
      }
    };

    const handleEntityDeleted = async (event: CustomEvent) => {
      const {entityTypeId} = event.detail;

      // Перезагружаем типы сущностей с актуальными счетчиками
      if (selectedProjectId) {
        await loadEntityTypes();

        // Если раскрыт тип удаленной сущности, обновляем список сущностей в этом типе
        setEntityTypes((prevTypes) => prevTypes.map((type) => (type.id === entityTypeId && type.isExpanded ? {...type, isLoading: true} : type)));

        // Загружаем обновленный список сущностей для типа
        const updatedEntities = await loadEntitiesForType(entityTypeId);
        setEntityTypes((prevTypes) => prevTypes.map((type) => (type.id === entityTypeId ? {...type, entities: updatedEntities, isLoading: false} : type)));
      }
    };

    // Добавляем слушатели событий
    window.addEventListener('entitySaved', handleEntitySaved as any);
    window.addEventListener('entityDeleted', handleEntityDeleted as any);

    // Удаляем слушатели при размонтировании
    return () => {
      window.removeEventListener('entitySaved', handleEntitySaved as any);
      window.removeEventListener('entityDeleted', handleEntityDeleted as any);
    };
  }, [selectedProjectId]);

  const loadEntityTypes = async () => {
    if (!selectedProjectId) return;

    try {
      setIsEntitiesLoading(true);
      const types = await api.getEntityTypes(selectedProjectId);
      setEntityTypes(
        types.map((type) => ({
          ...type,
          entities: [],
          isExpanded: false,
          isLoading: false
        }))
      );
    } catch (err) {
      console.error('Failed to load entity types:', err);
    } finally {
      setIsEntitiesLoading(false);
    }
  };

  const loadEntitiesForType = async (typeId: string) => {
    if (!selectedProjectId) return [];

    try {
      const result = await api.getEntities(selectedProjectId, {
        entityTypeId: typeId,
        includeOriginalImages: false
      });
      return result.entities;
    } catch (err) {
      console.error('Failed to load entities for type:', err);
      return [];
    }
  };

  const handleTypeToggle = async (typeId: string) => {
    setEntityTypes((prevTypes) =>
      prevTypes.map((type) => {
        if (type.id === typeId) {
          const newExpanded = !type.isExpanded;

          // Если раскрываем тип, также активируем фильтр
          if (newExpanded) {
            // Устанавливаем фильтр по типу
            setSelectedEntityTypeId(typeId);
            // Переключаемся на раздел "Сущности"
            setActiveSection('entities');
            // Отправляем событие для фильтрации в следующем цикле событий
            setTimeout(() => {
              const event = new CustomEvent('filterByType', {
                detail: {typeId}
              });
              window.dispatchEvent(event);
            }, 0);
          }

          // Если раскрываем и сущности еще не загружены
          if (newExpanded && (!type.entities || type.entities.length === 0)) {
            // Загружаем сущности асинхронно
            loadEntitiesForType(typeId).then((entities) => {
              setEntityTypes((currentTypes) => currentTypes.map((t) => (t.id === typeId ? {...t, entities, isLoading: false} : t)));
            });

            return {...type, isExpanded: newExpanded, isLoading: true};
          }

          return {...type, isExpanded: newExpanded};
        }
        return type;
      })
    );
  };

  const handleEntitySelect = async (entity: Entity) => {
    // Загружаем типы сущностей для модального окна, если еще не загружены
    if (entityTypesForModal.length === 0 && selectedProjectId) {
      try {
        const types = await api.getEntityTypes(selectedProjectId);
        setEntityTypesForModal(types);
      } catch (err) {
        console.error('Failed to load entity types for modal:', err);
      }
    }

    // Открываем модальное окно для редактирования сущности
    setEditingEntity(entity);
    setShowEntityModal(true);
  };

  const handleCloseEntityModal = () => {
    setShowEntityModal(false);
    setEditingEntity(null);
  };

  const handleEntitySaved = async (savedEntity: Entity, isNew: boolean) => {
    // Если это было редактирование, обновляем сущность в списке
    if (!isNew) {
      setEntityTypes((prevTypes) =>
        prevTypes.map((type) => {
          if (type.entities && type.entities.some((e) => e.id === savedEntity.id)) {
            return {
              ...type,
              entities: type.entities.map((e) => (e.id === savedEntity.id ? savedEntity : e))
            };
          }
          return type;
        })
      );
    }

    // Отправляем событие для синхронизации с другими компонентами
    const event = new CustomEvent('entitySaved', {
      detail: {entity: savedEntity, isNew}
    });
    window.dispatchEvent(event);

    setShowEntityModal(false);
    setEditingEntity(null);
  };

  const getEntityInitials = (entityName: string): string => {
    const words = entityName.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return entityName.substring(0, 2).toUpperCase();
  };

  const handleGoToEditor = async () => {
    if (!selectedProjectId || isLoading) return;

    // Отправляем событие аналитики об открытии редактора из менеджера
    trackManagerOpenEditor(selectedProjectId);

    setIsLoading(true);

    try {
      // Принудительно очищаем ProjectManager перед переходом
      // Это гарантирует, что при повторном открытии проекта данные будут загружены заново
      projectManager.cleanup();

      // Сбрасываем состояние графа перед переходом
      useGraphStore.getState().initialize({...createEmptyProjectState(), hasLoadedFromStorage: true});
      useCanvasStore.getState().setNodes([]);
      useCanvasStore.getState().setEdges([]);

      // Переходим в редактор - EditorPage сам выберет активный таймлайн
      router.push(`/${selectedProjectId}/editor`);
    } catch (error) {
      console.error('Error opening editor:', error);
      setIsLoading(false);
    }
  };

  // Обработчик клика на пустое место в области контента
  const handleContentAreaClick = useCallback((e: React.MouseEvent) => {
    // Если клик был по самой области контента (не по дочерним элементам),
    // это может означать клик на "пустое место"
    if (e.target === contentAreaRef.current) {
      console.log('Clicked on empty space in workspace content area');
      // Здесь можно добавить дополнительную логику если нужно
      // Основная логика автосохранения уже есть в ProjectInfoForm
    }
  }, []);

  // Если проект не выбран, показываем заглушку выбора
  if (!selectedProjectId) {
    return (
      <div className={s.workspace}>
        <div className={s.contentArea}>
          <ContentPlaceholder
            title={t('dashboard.workspace.select_project', 'Your workspace')}
            subtitle={t('dashboard.workspace.select_project_description', 'Выберите проект из списка слева или создайте новый')}
            onCreateProject={onCreateProject}
            showCreateButton={true}
          />
        </div>
      </div>
    );
  }

  // Функция для рендера контента в зависимости от активного раздела
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'about':
        return (
          <ProjectInfo
            projectId={selectedProjectId}
            projectName={selectedProjectName || t('dashboard.workspace.default_project_name', 'Проект')}
            onProjectNameChange={(newName) => {
              if (onProjectNameChange) {
                onProjectNameChange(selectedProjectId, newName);
              }
            }}
            onProjectInfoSave={onProjectInfoSave}
          />
        );
      case 'entities':
        return <EntitiesWorkspace projectId={selectedProjectId} filterTypeId={filterTypeId} openEntityId={openEntityId} />;
      case 'localization':
        return <LocalizationWorkspace projectId={selectedProjectId} />;
      case 'notebook':
        return <WorkspaceNotebookPanel projectId={selectedProjectId} />;
      default:
        return (
          <ProjectInfo
            projectId={selectedProjectId}
            projectName={selectedProjectName || t('dashboard.workspace.default_project_name', 'Проект')}
            onProjectNameChange={(newName) => {
              if (onProjectNameChange) {
                onProjectNameChange(selectedProjectId, newName);
              }
            }}
            onProjectInfoSave={onProjectInfoSave}
          />
        );
    }
  };

  // Если проект выбран, показываем рабочую область
  return (
    <div className={s.workspace}>
      {/* Верхняя панель с названием проекта и кнопкой редактора */}
      <div className={s.topPanel}>
        <div className={s.topPanelLeft}>
          <h1 className={s.projectTitle}>{selectedProjectName || t('dashboard.workspace.default_project_name', 'Проект')}</h1>
        </div>
        <div className={s.topPanelRight}>
          <button className={`${s.editorButton} ${isLoading ? s.loading : ''}`} onClick={handleGoToEditor} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className={s.spinner}></span>
                {t('dashboard.workspace.opening_editor', 'Открываем редактор...')}
              </>
            ) : (
              <>
                <RocketIcon className={s.editorIcon} />
                {t('dashboard.workspace.open_editor', 'Открыть редактор')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Основная область под верхней панелью */}
      <div className={s.mainContent}>
        {/* Левая панель с разделами */}
        {!hideLeftPanel && (
          <div className={s.sectionsPanel}>
            <div className={s.sectionsPanelContent}>
              <div className={s.sectionContent}>
                {/* Навигация по разделам */}
                <nav className={s.sectionNavigation}>
                  <button className={`${s.navButton} ${activeSection === 'about' ? s.navButtonActive : ''}`} onClick={() => router.push(buildProjectPath(selectedProjectId))}>
                    <div className={s.navButtonContent}>
                      <ReaderIcon className={s.navIcon} />
                      <span>{t('dashboard.workspace.project_bible', 'Библия проекта')}</span>
                    </div>
                  </button>

                  <button className={`${s.navButton} ${activeSection === 'localization' ? s.navButtonActive : ''}`} onClick={() => router.push(buildLocalizationPath(selectedProjectId))}>
                    <div className={s.navButtonContent}>
                      <GlobeIcon className={s.navIcon} />
                      <span>{t('localization.title', 'Локализация')}</span>
                    </div>
                  </button>

                  <button className={`${s.navButton} ${activeSection === 'entities' ? s.navButtonActive : ''}`} onClick={() => router.push(buildEntitiesPath(selectedProjectId))}>
                    <div className={s.navButtonContent}>
                      <PersonIcon className={s.navIcon} />
                      <span>{t('dashboard.workspace.entities', 'Сущности')}</span>
                    </div>
                  </button>

                  {/* Типы сущностей */}
                  {selectedProjectId && (
                    <div className={s.entitiesSection}>
                      {isEntitiesLoading ? (
                        <div className={s.entitiesLoading}>
                          <div className={s.loadingSpinner}></div>
                          <span>Загрузка типов...</span>
                        </div>
                      ) : entityTypes.length > 0 ? (
                        entityTypes.map((type) => (
                          <div key={type.id} className={s.entityTypeItem}>
                            {/* Заголовок типа */}
                            <div className={s.entityTypeHeader}>
                              <button className={s.entityTypeToggle} onClick={() => handleTypeToggle(type.id)}>
                                {type.isExpanded ? <ChevronDownIcon className={s.chevron} /> : <ChevronRightIcon className={s.chevron} />}
                              </button>

                              <button
                                className={s.entityTypeButton}
                                onClick={() => {
                                  setSelectedEntityTypeId(type.id);
                                  setActiveSection('entities');
                                  setTimeout(() => {
                                    const event = new CustomEvent('filterByType', {
                                      detail: {typeId: type.id}
                                    });
                                    window.dispatchEvent(event);
                                  }, 0);
                                  router.push(buildEntityTypePath(selectedProjectId, type.id));
                                }}
                              >
                                <span className={s.entityTypeName}>{type.name}</span>
                                <span className={s.entityCount}>{type._count?.entities || 0}</span>
                              </button>
                            </div>

                            {/* Список сущностей (когда тип раскрыт) */}
                            {type.isExpanded && (
                              <div className={s.entitiesList}>
                                {type.isLoading ? (
                                  <div className={s.typeLoading}>
                                    <div className={s.miniSpinner}></div>
                                    <span>Загрузка...</span>
                                  </div>
                                ) : type.entities && type.entities.length > 0 ? (
                                  type.entities.map((entity) => (
                                    <button key={entity.id} className={s.entityItem} onClick={() => handleEntitySelect(entity)}>
                                      <div className={s.entityAvatar}>
                                        {getThumbnailUrlForEntity(entity) ? (
                                          <img src={getThumbnailUrlForEntity(entity)!} alt={entity.name} className={s.entityImage} />
                                        ) : (
                                          <ImagePlaceholder size='small' />
                                        )}
                                      </div>
                                      <div className={s.entityInfo}>
                                        <span className={s.entityName}>{entity.name}</span>
                                        {entity.description && <span className={s.entityDescription}>{entity.description}</span>}
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className={s.emptyEntities}>
                                    <span>{t('dashboard.entities.no_entities_of_type', 'Нет сущностей этого типа')}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className={s.emptyEntityTypes}>
                          <span>{t('dashboard.entities.no_entity_types', 'Нет типов сущностей')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </nav>
              </div>
            </div>

            {/* Дополнительные разделы */}
            <div className={s.navButton}>
              <button className={`${s.navButton} ${activeSection === 'notebook' ? s.navButtonActive : ''}`} onClick={() => setActiveSection('notebook')}>
                <div className={s.navButtonContent}>
                  <Pencil2Icon className={s.navIcon} />
                  <span>{t('dashboard.workspace.notebook', 'Блокнот')}</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Центральная область контента */}
        <div className={s.contentArea} ref={contentAreaRef} onClick={handleContentAreaClick}>
          {renderSectionContent()}

          {/* EntitiesWorkspace всегда рендерим для инициализации обработчиков событий, когда не активен раздел entities */}
          {selectedProjectId && activeSection !== 'entities' && (
            <div style={{display: 'none'}}>
              <EntitiesWorkspace projectId={selectedProjectId} />
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно редактирования сущности */}
      {selectedProjectId && <CreateEntityModal isOpen={showEntityModal} onClose={handleCloseEntityModal} onEntitySaved={handleEntitySaved} projectId={selectedProjectId} entity={editingEntity} />}
    </div>
  );
};

export default ProjectWorkspace;
