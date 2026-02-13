import React from 'react';

import {Variable} from '@types-folder/variables';
import {useTranslation} from 'react-i18next';

import {StoryEngine} from '../../engine/interfaces/StoryEngine';
import {VariablesPanel} from './VariablesPanel';

import styles from './VariablesPanelWrapper.module.css';

// Компонент для панели переменных
export const VariablesPanelWrapper: React.FC<{
  isExpanded: boolean;
  variables: Record<string, any>;
  variablesFromStory: Variable[];
  engine: StoryEngine;
  onClose: () => void;
  onVariableChange: () => void;
}> = ({isExpanded, variables, variablesFromStory, engine, onClose, onVariableChange}) => {
  const {t} = useTranslation();

  // Создаем объект переменных в нужном формате
  const formattedVariables: Record<string, Variable> = {};
  variablesFromStory.forEach((variable) => {
    // variables содержит объекты Variable, а не просто значения
    const currentVariableData = variables[variable.id];
    formattedVariables[variable.id] = {
      ...variable,
      value: currentVariableData ? currentVariableData.value : variable.value
    };
  });

  return (
    <div className={`playback-panel playback-panel--left ${!isExpanded ? 'playback-panel--collapsed' : ''} ${styles.panel}`}>
      {/* Хедер в стиле панели лога */}
      <header className={styles.header}>
        <h3 className={styles.headerTitle}>{t('playback.variables_panel.title')}</h3>
      </header>

      <div className={styles.content}>
        <VariablesPanel variables={formattedVariables} expanded={true} onToggle={() => {}} engine={engine} onVariableChange={onVariableChange} />
      </div>
    </div>
  );
};
