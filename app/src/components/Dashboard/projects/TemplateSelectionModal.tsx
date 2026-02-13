'use client';

import React, {useCallback, useEffect, useState} from 'react';

import {CheckIcon, Cross2Icon} from '@radix-ui/react-icons';
import {api} from '@services/api';
import {ProjectTemplate, TEMPLATE_CATEGORY_LABELS, TemplateCategory} from '@types-folder/entities';
import {useTranslation} from 'react-i18next';
import {getProjectIcon} from 'src/utils/templateIcons';

import s from './TemplateSelectionModal.module.css';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (templateId: string | null) => void;
  onCreate: (name: string, templateId?: string) => void;
  isCreating?: boolean;
}

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({isOpen, onClose, onTemplateSelect, onCreate, isCreating = false}) => {
  const {t, i18n} = useTranslation();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('template_interactive_story');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  // Загрузка шаблонов при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setProjectName('');
      setSelectedTemplate('template_interactive_story');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const templatesData = await api.getProjectTemplates({
        includeDefault: true,
        includeInactive: false,
        language: i18n.language || 'en' // Передаем текущий язык интерфейса
      });
      setTemplates(templatesData);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(t('dashboard.projects.template_selection.failed_to_load_templates', 'Не удалось загрузить шаблоны'));
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация шаблонов по категории
  const filteredTemplates = selectedCategory === 'all' ? templates : templates.filter((t) => t.categories.includes(selectedCategory));

  // Уникальные категории из загруженных шаблонов
  const availableCategories: TemplateCategory[] = [...new Set(templates.flatMap((t) => t.categories))] as TemplateCategory[];

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === '') {
      // Выбор "Без шаблона"
      setSelectedTemplate(null);
    } else {
      // Выбор конкретного шаблона или снятие выбора
      setSelectedTemplate(templateId === selectedTemplate ? null : templateId);
    }
  };

  const handleCreateProject = useCallback(() => {
    if (projectName.trim()) {
      console.log('Creating project with template:', selectedTemplate);
      onCreate(projectName.trim(), selectedTemplate || undefined);
    }
  }, [projectName, selectedTemplate, onCreate]);

  const handleContinueWithoutTemplate = () => {
    setSelectedTemplate(null);
    onTemplateSelect(null);
  };

  const handleSkipTemplates = () => {
    if (projectName.trim()) {
      onCreate(projectName.trim(), undefined);
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isCreating) {
      onClose();
    }
    if (e.key === 'Enter' && projectName.trim()) {
      handleCreateProject();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={s.overlay} onClick={handleClose} onKeyDown={handleKeyPress}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <h2 className={s.title}>{t('dashboard.projects.create_project_modal.title', 'Создать проект')}</h2>
          <button className={s.closeButton} onClick={handleClose} disabled={isCreating}>
            <Cross2Icon />
          </button>
        </div>

        <div className={s.content}>
          {/* Поле ввода названия проекта */}
          <div className={s.nameSection}>
            <label className={s.label}>{t('dashboard.projects.create_project_modal.project_name_label', 'Название проекта')}</label>
            <input
              type='text'
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={s.input}
              placeholder={t('dashboard.projects.create_project_modal.project_name_placeholder', 'Введите название проекта')}
              autoFocus
              disabled={isCreating}
            />
          </div>

          {/* Секция шаблонов */}
          <div className={s.templatesSection}>
            <div className={s.sectionHeader}>
              <h3 className={s.sectionTitle}>{t('dashboard.projects.create_project_modal.template_section_title', 'Выберите шаблон (необязательно)')}</h3>
              <p className={s.sectionDescription}>
                {t('dashboard.projects.create_project_modal.template_section_description', 'Шаблоны помогут быстро настроить проект с предустановленными типами сущностей и параметрами')}
              </p>
            </div>

            {/* Фильтр по категориям */}
            {/* Временно скрыто */}
            {/* {availableCategories.length > 1 && (
              <div className={s.categoryFilter}>
                <button className={`${s.categoryButton} ${selectedCategory === 'all' ? s.active : ''}`} onClick={() => setSelectedCategory('all')} disabled={isCreating}>
                  Все категории
                </button>
                {availableCategories.map((category) => (
                  <button key={category} className={`${s.categoryButton} ${selectedCategory === category ? s.active : ''}`} onClick={() => setSelectedCategory(category)} disabled={isCreating}>
                    {TEMPLATE_CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            )} */}

            {/* Список шаблонов */}
            <div className={s.templatesGrid}>
              {isLoading ? (
                <div className={s.loading}>
                  <div className={s.spinner}></div>
                  <p>{t('dashboard.projects.template_selection.loading_templates', 'Загрузка шаблонов...')}</p>
                </div>
              ) : error ? (
                <div className={s.error}>
                  <p>{error}</p>
                  <button onClick={loadTemplates} className={s.retryButton}>
                    {t('dashboard.projects.template_selection.retry', 'Повторить')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Опция "Без шаблона" */}
                  <div className={`${s.templateCard} ${s.emptyTemplate} ${selectedTemplate === null ? s.selected : ''}`} onClick={() => handleTemplateSelect('')}>
                    <div className={s.templateHeader}>
                      <div className={s.templateTitleContainer}>
                        <div
                          className={s.templateIcon}
                          style={{
                            backgroundColor: getProjectIcon().bgColor,
                            color: getProjectIcon().color
                          }}
                        >
                          {getProjectIcon().emoji}
                        </div>
                        <h4 className={s.templateTitle}>{t('dashboard.projects.template_selection.no_template', 'Без шаблона')}</h4>
                      </div>
                      {selectedTemplate === null && (
                        <div className={s.selectedIcon}>
                          <CheckIcon />
                        </div>
                      )}
                    </div>
                    <p className={s.templateDescription}>
                      {t('dashboard.projects.template_selection.no_template_description', 'Создать полностью пустой проект без предустановленных типов сущностей')}
                    </p>
                  </div>

                  {/* Шаблоны */}
                  {filteredTemplates.map((template) => (
                    <div key={template.id} className={`${s.templateCard} ${selectedTemplate === template.id ? s.selected : ''}`} onClick={() => handleTemplateSelect(template.id)}>
                      <div className={s.templateHeader}>
                        <div className={s.templateTitleContainer}>
                          <div
                            className={s.templateIcon}
                            style={{
                              backgroundColor: getProjectIcon(template.id).bgColor,
                              color: getProjectIcon(template.id).color
                            }}
                          >
                            {getProjectIcon(template.id).emoji}
                          </div>
                          <h4 className={s.templateTitle}>{template.name}</h4>
                        </div>
                        {selectedTemplate === template.id && (
                          <div className={s.selectedIcon}>
                            <CheckIcon />
                          </div>
                        )}
                      </div>
                      <p className={s.templateDescription}>{template.description}</p>
                      {/* Временно скрыто */}
                      {/* <div className={s.templateMeta}>
                        {template.categories.map((category) => (
                          <span key={category} className={s.templateCategory}>
                            {TEMPLATE_CATEGORY_LABELS[category]}
                          </span>
                        ))}
                      </div> */}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className={s.footer}>
          <button type='button' className={s.cancelButton} onClick={handleClose} disabled={isCreating}>
            {t('dashboard.projects.create_project_modal.cancel', 'Отмена')}
          </button>
          <button type='button' className={s.createButton} onClick={handleCreateProject} disabled={!projectName.trim() || isCreating}>
            {isCreating ? t('dashboard.projects.create_project_modal.creating', 'Создание...') : t('dashboard.projects.create_project_modal.create', 'Создать проект')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectionModal;
