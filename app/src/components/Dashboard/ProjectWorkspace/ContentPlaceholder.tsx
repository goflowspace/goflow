'use client';

import React from 'react';

import {useTranslation} from 'react-i18next';

import s from './ContentPlaceholder.module.css';

interface ContentPlaceholderProps {
  title?: string;
  subtitle?: string;
  onCreateProject?: () => void;
  showCreateButton?: boolean;
}

const ContentPlaceholder: React.FC<ContentPlaceholderProps> = ({title, subtitle, onCreateProject, showCreateButton = false}) => {
  const {t} = useTranslation();

  return (
    <div className={s.placeholder}>
      <div className={s.content}>
        <div className={s.iconWrapper}>
          <div className={s.projectIcon}>
            <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg' className={s.iconSvg}>
              {/* Основной контейнер воркспейса */}
              <rect x='2' y='4' width='28' height='24' rx='4' fill='#667eea' stroke='none' />

              {/* Верхняя панель */}
              <rect x='2' y='4' width='28' height='6' rx='4' fill='#7c3aed' />
              <rect x='2' y='8' width='28' height='2' fill='#667eea' />

              {/* Карточки в воркспейсе */}
              <rect x='5' y='13' width='8' height='6' rx='2' fill='white' opacity='0.9' />
              <rect x='5' y='21' width='8' height='4' rx='2' fill='white' opacity='0.7' />

              {/* Центральная карточка (выделенная) */}
              <rect x='15' y='15' width='10' height='8' rx='2' fill='white' />
              <rect x='17' y='17' width='6' height='1.5' rx='0.75' fill='#667eea' />
              <rect x='17' y='19' width='4' height='1' rx='0.5' fill='#a5b4fc' />
              <rect x='17' y='20.5' width='5' height='1' rx='0.5' fill='#a5b4fc' />

              {/* Дополнительные мелкие элементы */}
              <circle cx='6' cy='15' r='0.5' fill='#10b981' />
              <circle cx='23' cy='13' r='0.5' fill='#10b981' />
              <circle cx='11' cy='24' r='0.5' fill='#10b981' />
            </svg>
          </div>
        </div>

        <div className={s.textContent}>
          <h1 className={s.title}>{title || t('dashboard.workspace.welcome', 'Добро пожаловать в workspace')}</h1>
          <p className={s.subtitle}>{subtitle || t('dashboard.workspace.welcome_description', 'Выберите проект для начала работы')}</p>
        </div>

        {showCreateButton && onCreateProject && (
          <div className={s.actionButton}>
            <button onClick={onCreateProject} className={s.createProjectButton}>
              <svg viewBox='0 0 24 24' className={s.buttonIcon}>
                <path
                  fill='currentColor'
                  d='M12 2C13.1 2 14 2.9 14 4V10H20C21.1 10 22 10.9 22 12S21.1 14 20 14H14V20C14 21.1 13.1 22 12 22S10 21.1 10 20V14H4C2.9 14 2 13.1 2 12S2.9 10 4 10H10V4C10 2.9 10.9 2 12 2Z'
                />
              </svg>
              {t('dashboard.workspace.create_project_button', 'Create')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentPlaceholder;
