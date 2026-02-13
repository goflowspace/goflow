'use client';

import React from 'react';

import {useProjectNavigation} from '../../../hooks/useProjectNavigation';
import {buildEntitiesPath, buildEntityPath, buildEntityTypePath, buildProjectPath} from '../../../utils/navigation';

interface ProjectNavigationExampleProps {
  projectId: string;
  typeId?: string;
  entityId?: string;
}

/**
 * Пример компонента для демонстрации роутинга проектов
 */
export const ProjectNavigationExample: React.FC<ProjectNavigationExampleProps> = ({projectId, typeId, entityId}) => {
  const {params, isEntitiesSection, isEntityModalOpen, navigateToProject, navigateToEntities, navigateToEntityType, navigateToEntity, closeEntityModal, getCurrentSection} = useProjectNavigation();

  const demoEntityTypes = [
    {id: 'characters', name: 'Персонажи'},
    {id: 'locations', name: 'Локации'},
    {id: 'items', name: 'Предметы'}
  ];

  const demoEntities = [
    {id: 'hero', name: 'Главный герой', typeId: 'characters'},
    {id: 'villain', name: 'Антагонист', typeId: 'characters'},
    {id: 'castle', name: 'Замок', typeId: 'locations'}
  ];

  return (
    <div style={{padding: '20px', border: '1px solid #ccc', margin: '10px'}}>
      <h3>Навигация по проекту</h3>

      <div style={{marginBottom: '20px'}}>
        <strong>Текущие параметры:</strong>
        <ul>
          <li>Project ID: {params.projectId}</li>
          <li>Type ID: {params.typeId || 'нет'}</li>
          <li>Entity ID: {params.entityId || 'нет'}</li>
          <li>Раздел: {getCurrentSection()}</li>
          <li>Секция сущностей: {isEntitiesSection ? 'да' : 'нет'}</li>
          <li>Модальное окно открыто: {isEntityModalOpen ? 'да' : 'нет'}</li>
        </ul>
      </div>

      <div style={{marginBottom: '20px'}}>
        <strong>Основная навигация:</strong>
        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
          <button onClick={() => navigateToProject(projectId)}>Библия проекта</button>
          <button onClick={() => navigateToEntities(projectId)}>Все сущности</button>
        </div>
      </div>

      <div style={{marginBottom: '20px'}}>
        <strong>Навигация по типам сущностей:</strong>
        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
          {demoEntityTypes.map((type) => (
            <button key={type.id} onClick={() => navigateToEntityType(projectId, type.id)}>
              {type.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{marginBottom: '20px'}}>
        <strong>Навигация по сущностям:</strong>
        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
          {demoEntities.map((entity) => (
            <button key={entity.id} onClick={() => navigateToEntity(projectId, entity.typeId, entity.id)}>
              {entity.name}
            </button>
          ))}
        </div>
      </div>

      {isEntityModalOpen && (
        <div style={{marginBottom: '20px'}}>
          <strong>Модальное окно открыто!</strong>
          <div style={{marginTop: '10px'}}>
            <button onClick={closeEntityModal}>Закрыть модальное окно</button>
          </div>
        </div>
      )}

      <div style={{marginTop: '20px', fontSize: '12px', color: '#666'}}>
        <strong>Примеры URL:</strong>
        <ul>
          <li>/{projectId} - библия проекта</li>
          <li>/{projectId}/entities - все сущности</li>
          <li>/{projectId}/entities/characters - персонажи</li>
          <li>/{projectId}/entities/characters/hero - модальное окно героя</li>
        </ul>
      </div>
    </div>
  );
};
