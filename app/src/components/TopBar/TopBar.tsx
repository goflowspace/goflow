'use client';

import React, {useRef} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {useFlowMenu} from '@hooks/useFlowMenu';
import {useProject} from '@hooks/useProject';
import {FileTextIcon, MagnifyingGlassIcon} from '@radix-ui/react-icons';
import * as Toast from '@radix-ui/react-toast';
import {IconButton, Separator, TextField, Tooltip} from '@radix-ui/themes';
import {trackProjectNameEditing} from '@services/analytics';
import {api} from '@services/api';
import cls from 'classnames';
import {useTranslation} from 'react-i18next';

import {useGraphStore} from '@store/useGraphStore';
import {useNotebookStore} from '@store/useNotebookStore';
import {useProjectStore} from '@store/useProjectStore';
import {useSearchStore} from '@store/useSearchStore';
import {useUIStore} from '@store/useUIStore';

import ExportModal from '@components/ExportModal/ExportModal';

import {notificationService} from '../../services/notificationService';
import {getHotkeyWithModifier} from '../../utils/keyboardModifiers';
import FlowDropdownMenu from './FlowDropdownMenu';

import s from './topbar.module.scss';

const TopBar = () => {
  const {projectName, setProjectName} = useProjectStore();
  const {toggleSearchPanel} = useSearchStore();
  const {toggleNotebookPanel} = useNotebookStore();
  const {isSidebarOpen, toggleSidebar} = useUIStore();
  const {t} = useTranslation();
  const {projectId} = useCurrentProject();
  const originalProjectNameRef = useRef<string>(projectName);
  const wasCancelledRef = useRef(false);
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';
  // Добавляем состояние проекта для проверки загрузки
  const project = useProject(projectId);

  // Используем хук для работы с Go Flow меню
  const flowMenu = useFlowMenu();

  const handleProjectNameFocus = () => {
    originalProjectNameRef.current = projectName;
  };

  const handleProjectNameBlur = async () => {
    if (wasCancelledRef.current) {
      wasCancelledRef.current = false;
      return;
    }

    if (projectName === originalProjectNameRef.current) {
      return;
    }

    if (!projectId || !projectName) return;

    try {
      // Отправляем событие аналитики о переименовании проекта
      trackProjectNameEditing(projectName.length, 'editor', projectId, timelineId);

      await api.updateProject(projectId, projectName);

      // Синхронизируем данные с IndexedDB после успешного обновления на бэкенде
      await useGraphStore.getState().saveToDb();

      notificationService.showSuccess(t('top_bar.project_name_updated_success', 'Project name updated successfully'));
    } catch (error) {
      console.error('Failed to update project name:', error);
      notificationService.showError(t('top_bar.project_name_updated_error', 'Failed to update project name'));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      wasCancelledRef.current = true;
      setProjectName(originalProjectNameRef.current);
      event.currentTarget.blur();
    }
  };

  if (isSidebarOpen) {
    return null;
  }

  // Стили для простого скелетона
  const skeletonStyle: React.CSSProperties = {
    width: '200px',
    height: '32px',
    backgroundColor: 'var(--gray-4)',
    borderRadius: '6px',
    opacity: 0.7
  };

  return (
    <>
      <div className={s.toolbar_wrapper}>
        <div className={s.toolbar_container}>
          <FlowDropdownMenu
            onImportToProjectClick={projectId ? flowMenu.handleImportToProjectClick : undefined}
            onExportClick={() => flowMenu.setExportModalOpen(true)}
            onOpenWelcomeStory={flowMenu.handleOpenWelcomeStory}
            onChangeLanguage={flowMenu.changeLanguage}
          />

          <Separator className={s.separator} orientation='vertical' size='1' />

          {/* Показываем скелетон вместо названия пока проект загружается */}
          {project.isLoading || !project.isReady ? (
            <div style={skeletonStyle} />
          ) : (
            <TextField.Root
              onChange={(e) => setProjectName(e.target.value)}
              onFocus={handleProjectNameFocus}
              onBlur={handleProjectNameBlur}
              onKeyDown={handleKeyDown}
              value={projectName}
              variant='surface'
              size='2'
              placeholder={t('top_bar.project_name_placeholder', 'Type project name')}
              style={{boxShadow: 'none'}}
            />
          )}

          <Separator className={s.separator} orientation='vertical' size='1' />
          {/* Кнопка поиска */}
          <Tooltip
            content={
              <>
                {t('search_bar.search', 'Search')}
                <kbd className={s.kbd_style}>{getHotkeyWithModifier('F')}</kbd>
              </>
            }
          >
            <IconButton className={cls(s.icon_button)} size='2' color='gray' variant='ghost' style={{margin: 0}} onClick={toggleSearchPanel}>
              <MagnifyingGlassIcon className={s.icon} />
            </IconButton>
          </Tooltip>
          {/* Кнопка блокнота */}
          <Tooltip
            content={
              <>
                {t('notebook.title', 'Notebook')}
                <kbd className={s.kbd_style}>{getHotkeyWithModifier('N')}</kbd>
              </>
            }
          >
            <IconButton className={cls(s.icon_button)} size='2' color='gray' variant='ghost' style={{margin: 0}} onClick={toggleNotebookPanel}>
              <FileTextIcon className={s.icon} />
            </IconButton>
          </Tooltip>
          <IconButton size='2' variant='ghost' color='gray' style={{margin: 0}} onClick={toggleSidebar}>
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12' fill='none' className={s.icon}>
              <rect x='0.5' y='0.5' width='15' height='11' rx='1.5' stroke='var(--gray-12)' />
              <line x1='5.5' y1='11' x2='5.5' y2='1' stroke='var(--gray-12)' />
            </svg>
          </IconButton>
        </div>

        {/* Скрытые инпуты для файлов */}
        <input ref={flowMenu.importToProjectInputRef} type='file' accept='.json,.zip' onChange={flowMenu.handleImportToProjectChange} style={{display: 'none'}} />

        {/* Компонент модального окна для экспорта проекта */}
        <ExportModal open={flowMenu.exportModalOpen} onOpenChange={flowMenu.setExportModalOpen} />
      </div>
    </>
  );
};

export default TopBar;
