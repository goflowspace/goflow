'use client';

import React, {useEffect, useRef, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useFlowMenu} from '@hooks/useFlowMenu';
import {CaretDownIcon, CaretRightIcon, CodeIcon, MagicWandIcon, MagnifyingGlassIcon, PlusCircledIcon, ReaderIcon} from '@radix-ui/react-icons';
import {IconButton, Separator, Text, Tooltip} from '@radix-ui/themes';
import {api} from '@services/api';
import {Entity, EntityType} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';
import {Panel, PanelGroup, PanelResizeHandle} from 'react-resizable-panels';
import {isCloud} from 'src/utils/edition';

import {useAIDebugStore} from '@store/useAIDebugStore';
import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';
import {useProjectStore} from '@store/useProjectStore';
import {useSearchStore} from '@store/useSearchStore';
import {useTimelinesStore} from '@store/useTimelinesStore';
import {useUIStore} from '@store/useUIStore';
import {useVariablesStore} from '@store/useVariablesStore';

import AIDebugModal from '../AI/AIDebugModal';
import AISettingsPanel from '../AI/AISettingsPanel';
import {AutoSaveStatus} from '../AutoSaveStatus/AutoSaveStatus';
import ExportModal from '../ExportModal/ExportModal';
import ProjectBibleModal from '../ProjectBibleModal';
import FlowDropdownMenu from '../TopBar/FlowDropdownMenu';
import {CreateEntityModal} from './CreateEntityModal';
import EntitiesSection from './EntitiesSection';
import {LayerTree} from './LayerTree';
import TimelinesSection, {TimelinesSectionRef} from './TimelinesSection';
import VariablesPanel from './VariablesPanel';

import s from './Sidebar.module.scss';

// Collapsible Section Component
const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  action,
  onToggle
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  onToggle?: (isOpen: boolean) => void;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onToggle?.(newIsOpen);
  };

  return (
    <div className={s.collapsible_section}>
      <div className={s.section_header} onClick={handleToggle}>
        <div className={s.section_header_title}>
          {isOpen ? <CaretDownIcon /> : <CaretRightIcon />}
          <Text size='2' weight='medium'>
            {title}
          </Text>
        </div>
        {isOpen && action && (
          <div style={{display: 'flex'}} onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
      {isOpen && <div className={s.section_content}>{children}</div>}
    </div>
  );
};

const Sidebar = () => {
  const {t} = useTranslation();

  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const {toggleSearchPanel} = useSearchStore();
  const projectName = useProjectStore((state) => state.projectName);
  const activeTimelineName = useTimelinesStore((state) => state.getActiveTimeline()?.name);
  const layers = useGraphStore((state) => state.layers);
  const layersLen = Object.values(layers).length;
  const {projectId} = useCurrentProject();
  const isVariablesPanelOpen = useVariablesStore((state) => state.isVariablesPanelOpen);
  const variables = useVariablesStore((s) => s.variables);
  const isPanning = useCanvasStore((s) => s.isPanning);
  const {isDebugEnabled, toggleDebugModal} = useAIDebugStore();

  // Хук для обновления списка сущностей
  const loadEntitiesFromStore = useGraphStore((state) => state.loadEntities);

  // Ref для TimelinesSection
  const timelinesSectionRef = useRef<TimelinesSectionRef>(null);

  const [isAddVariableDialogOpen, setIsAddVariableDialogOpen] = useState(false);
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const [isProjectBibleModalOpen, setIsProjectBibleModalOpen] = useState(false);
  const [isAISettingsPanelOpen, setIsAISettingsPanelOpen] = useState(false);
  const canAddVariable = variables.length < 128;

  // Состояния для отслеживания открытости секций
  const [isTimelinesOpen, setIsTimelinesOpen] = useState(true);
  const [isLayersOpen, setIsLayersOpen] = useState(true);
  const [isEntitiesOpen, setIsEntitiesOpen] = useState(true);
  const [isVariablesOpen, setIsVariablesOpen] = useState(isVariablesPanelOpen);

  // Функция для расчета размеров панелей
  const getPanelSizes = () => {
    const collapsedSize = 5; // размер для свернутой секции (только заголовок)
    const expandedSize = 12; // размер для развернутой секции
    const openSections = [isTimelinesOpen, isLayersOpen, isEntitiesOpen, isVariablesOpen];
    const openCount = openSections.filter(Boolean).length;

    // Если все секции свернуты, задаем минимальные размеры и добавляем спейсер
    if (openCount === 0) {
      const totalCollapsedSpace = collapsedSize * 4;
      const spacerSize = 100 - totalCollapsedSpace;

      return {
        timelines: {size: collapsedSize, minSize: collapsedSize},
        layers: {size: collapsedSize, minSize: collapsedSize},
        entities: {size: collapsedSize, minSize: collapsedSize},
        variables: {size: collapsedSize, minSize: collapsedSize},
        spacer: {size: spacerSize, minSize: 0}
      };
    }

    // Размер для развернутых секций с учетом свернутых
    const remainingSpace = 100 - (4 - openCount) * collapsedSize;
    const sizePerOpenSection = remainingSpace / openCount;

    return {
      timelines: {
        size: isTimelinesOpen ? sizePerOpenSection : collapsedSize,
        minSize: isTimelinesOpen ? expandedSize : collapsedSize
      },
      layers: {
        size: isLayersOpen ? sizePerOpenSection : collapsedSize,
        minSize: isLayersOpen ? expandedSize : collapsedSize
      },
      entities: {
        size: isEntitiesOpen ? sizePerOpenSection : collapsedSize,
        minSize: isEntitiesOpen ? expandedSize : collapsedSize
      },
      variables: {
        size: isVariablesOpen ? sizePerOpenSection : collapsedSize,
        minSize: isVariablesOpen ? expandedSize : collapsedSize
      },
      spacer: null // нет спейсера когда есть открытые секции
    };
  };

  const panelSizes = getPanelSizes();

  // Синхронизация состояния переменных с store
  useEffect(() => {
    setIsVariablesOpen(isVariablesPanelOpen);
  }, [isVariablesPanelOpen]);

  // Состояние для редактирования сущностей
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [entityTypesForModal, setEntityTypesForModal] = useState<EntityType[]>([]);

  // Используем хук для работы с Go Flow меню
  const flowMenu = useFlowMenu();

  // Создаем ref для FPS tracker и синхронизируем с состоянием
  const isPanningRef = useRef(isPanning);
  useEffect(() => {
    isPanningRef.current = isPanning;
  }, [isPanning]);

  const handleAddVariableClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canAddVariable) {
      setIsAddVariableDialogOpen(true);
    } else {
      console.error('Maximum number of variables (128) reached');
    }
  };

  const handleAddEntityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEntity(null); // Сбрасываем редактируемую сущность для создания новой
    setIsAddEntityDialogOpen(true);
  };

  const handleAddTimelineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    timelinesSectionRef.current?.createTimeline();
  };

  const handleEntityClick = async (entity: Entity) => {
    // Загружаем типы сущностей для модального окна, если еще не загружены
    if (entityTypesForModal.length === 0 && projectId) {
      try {
        const types = await api.getEntityTypes(projectId);
        setEntityTypesForModal(types);
      } catch (err) {
        console.error('Failed to load entity types for modal:', err);
      }
    }

    // Устанавливаем редактируемую сущность и открываем модальное окно
    setEditingEntity(entity);
    setIsAddEntityDialogOpen(true);
  };

  const handleCloseEntityModal = () => {
    setIsAddEntityDialogOpen(false);
    setEditingEntity(null);
  };

  const handleEntitySaved = (entity: Entity, isNew: boolean) => {
    // Принудительно обновляем только сущности, без перезагрузки типов (чтобы сохранить развернутое состояние)
    if (projectId) {
      // Сбрасываем флаг загрузки сущностей и перезагружаем
      useGraphStore.setState({entitiesLoaded: false});
      loadEntitiesFromStore(projectId, false); // false = не включать оригинальные изображения
    }
    console.log('Entity saved successfully:', isNew ? 'created' : 'updated');

    setIsAddEntityDialogOpen(false);
    setEditingEntity(null);
  };

  if (!isSidebarOpen) return null;

  return (
    <aside className={s.sidebar}>
      <div className={s.sidebar_content}>
        {/* TopBar analogue */}
        <div className={s.sidebar_header} style={{paddingBottom: '15px'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px'}}>
            <FlowDropdownMenu
              onImportToProjectClick={projectId ? flowMenu.handleImportToProjectClick : undefined}
              onExportClick={() => flowMenu.setExportModalOpen(true)}
              onOpenWelcomeStory={flowMenu.handleOpenWelcomeStory}
              onChangeLanguage={flowMenu.changeLanguage}
              style={{padding: 5}}
            />
          </div>
          <div style={{flexGrow: 1}} />
          <div style={{display: 'flex', gap: '5px', alignSelf: 'flex-start'}}>
            {/* TODO: показывать только на наших аккуантах */}
            {/* <Tooltip content={t('ai_settings.button_tooltip', 'Настройки ИИ')}>
              <IconButton variant='ghost' color='gray' style={{margin: 0}} onClick={() => setIsAISettingsPanelOpen(true)}>
                <MagicWandIcon className={s.icon} />
              </IconButton>
            </Tooltip> */}
            {/* {isDebugEnabled && (
              <Tooltip content={t('ai_debug.tooltip')}>
                <IconButton variant='ghost' color='gray' style={{margin: 0}} onClick={toggleDebugModal}>
                  <CodeIcon className={s.icon} />
                </IconButton>
              </Tooltip>
            )} */}
            <Tooltip content={t('project_bible.button_tooltip', 'Библия проекта')}>
              <IconButton variant='ghost' color='gray' style={{margin: 0}} onClick={() => setIsProjectBibleModalOpen(true)}>
                <ReaderIcon className={s.icon} />
              </IconButton>
            </Tooltip>
            <Tooltip content={t('search_bar.search', 'Поиск')}>
              <IconButton variant='ghost' color='gray' style={{margin: 0}} onClick={toggleSearchPanel}>
                <MagnifyingGlassIcon className={s.icon} />
              </IconButton>
            </Tooltip>
            <IconButton variant='ghost' color='gray' style={{margin: 0}} onClick={toggleSidebar}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12' fill='none' className={s.icon}>
                <rect x='0.5' y='0.5' width='15' height='11' rx='1.5' stroke='var(--gray-12)' />
                <line x1='5.5' y1='11' x2='5.5' y2='1' stroke='var(--gray-12)' />
              </svg>
            </IconButton>
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '20px', marginBottom: '10px', marginTop: '-10px'}}>
          <Text size='2' weight='medium'>
            {projectName}
          </Text>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '20px', marginBottom: '10px', marginTop: '-10px'}}>
          <Text size='1' weight='regular' color='gray'>
            {activeTimelineName || ''}
          </Text>
        </div>
        <Separator orientation='horizontal' size='4' />

        <PanelGroup key={`${isTimelinesOpen}-${isLayersOpen}-${isEntitiesOpen}-${isVariablesOpen}-${!!panelSizes.spacer}`} direction='vertical' className={s.sections_container}>
          <Panel defaultSize={panelSizes.timelines.size} minSize={panelSizes.timelines.minSize} id='timelines-section' order={1}>
            <CollapsibleSection
              title={t('sidebar_section.name_timelines', 'Timelines')}
              defaultOpen={isTimelinesOpen}
              onToggle={setIsTimelinesOpen}
              action={
                <IconButton variant='ghost' color='gray' onClick={handleAddTimelineClick} style={{marginRight: 0}}>
                  <PlusCircledIcon width='16' height='16' />
                </IconButton>
              }
            >
              <TimelinesSection ref={timelinesSectionRef} />
            </CollapsibleSection>
          </Panel>

          <PanelResizeHandle className={s.vertical_resize_handle} />

          <Panel defaultSize={panelSizes.layers.size} minSize={panelSizes.layers.minSize} id='layers-section' order={2}>
            <CollapsibleSection title={t('sidebar_section.name_layers', 'Layers')} defaultOpen={isLayersOpen} onToggle={setIsLayersOpen}>
              {layersLen === 1 ? (
                <div className={s.no_layer_info}>
                  <Text size='1' color='gray' align='center' className={s.empty_layers_message}>
                    {t('sidebar_section.layers_placeholder', 'You have not added any layers yet. On the toolbar, click the layer icon to create the first layer')}
                  </Text>
                </div>
              ) : (
                <LayerTree />
              )}
            </CollapsibleSection>
          </Panel>

          <PanelResizeHandle className={s.vertical_resize_handle} />

          <Panel defaultSize={panelSizes.entities.size} minSize={panelSizes.entities.minSize} id='entities-section' order={3}>
            <CollapsibleSection
              title={t('sidebar_section.name_entities', 'Entities')}
              defaultOpen={isEntitiesOpen}
              onToggle={setIsEntitiesOpen}
              action={
                <IconButton variant='ghost' color='gray' onClick={handleAddEntityClick} style={{marginRight: 0}}>
                  <PlusCircledIcon width='16' height='16' />
                </IconButton>
              }
            >
              <EntitiesSection onEntityClick={handleEntityClick} />
            </CollapsibleSection>
          </Panel>

          <PanelResizeHandle className={s.vertical_resize_handle} />

          <Panel defaultSize={panelSizes.variables.size} minSize={panelSizes.variables.minSize} id='variables-section' order={4}>
            <CollapsibleSection
              title={t('sidebar_section.name_variables', 'Variables')}
              defaultOpen={isVariablesOpen}
              onToggle={setIsVariablesOpen}
              action={
                <IconButton variant='ghost' color='gray' onClick={handleAddVariableClick} disabled={!canAddVariable} style={{marginRight: 0}}>
                  <PlusCircledIcon width='16' height='16' />
                </IconButton>
              }
            >
              <VariablesPanel isAddDialogOpen={isAddVariableDialogOpen} onCloseAddDialog={() => setIsAddVariableDialogOpen(false)} />
            </CollapsibleSection>
          </Panel>

          {/* Спейсер панель - показывается только когда все секции свернуты */}
          {panelSizes.spacer && (
            <>
              <PanelResizeHandle className={s.vertical_resize_handle} />
              <Panel defaultSize={panelSizes.spacer.size} minSize={panelSizes.spacer.minSize} id='spacer-section' order={5}>
                <div className={s.spacer_panel} />
              </Panel>
            </>
          )}
        </PanelGroup>

        <div className={s.autosave_status_container}>
          <AutoSaveStatus className={s.autosave_status} isPanningRef={isPanningRef} />
          {/* WebSocket Test Button - скрыта */}
          {/* {process.env.NODE_ENV === 'development' && <WebSocketTestButton />} */}
        </div>
      </div>

      {/* Скрытые инпуты для файлов */}
      <input ref={flowMenu.importToProjectInputRef} type='file' accept='.json,.zip' onChange={flowMenu.handleImportToProjectChange} style={{display: 'none'}} />

      {/* Модал экспорта */}
      <ExportModal open={flowMenu.exportModalOpen} onOpenChange={flowMenu.setExportModalOpen} />

      {/* Project Bible Modal */}
      <ProjectBibleModal isOpen={isProjectBibleModalOpen} onClose={() => setIsProjectBibleModalOpen(false)} />

      {/* AI Settings Panel (Cloud only) */}
      {isCloud() && isAISettingsPanelOpen && (
        <div style={{position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', backgroundColor: 'var(--color-background)', zIndex: 1000, borderLeft: '1px solid var(--gray-6)'}}>
          <AISettingsPanel onClose={() => setIsAISettingsPanelOpen(false)} />
        </div>
      )}

      {/* Create Entity Modal */}
      <CreateEntityModal isOpen={isAddEntityDialogOpen} onClose={handleCloseEntityModal} onEntitySaved={handleEntitySaved} entity={editingEntity} />

      {/* AI Debug Modal (Cloud only) */}
      {isCloud() && <AIDebugModal />}
    </aside>
  );
};

export default Sidebar;
