import React from 'react';

import {ArrowDown, ArrowUp, ChevronDown, ChevronRight} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {NarrativeLogEntry} from '../types';
import {ConditionView} from './ConditionView';
import {OperationView} from './OperationView';

import styles from '../styles.module.css';

interface NarrativeEntryProps {
  entry: NarrativeLogEntry;
  onToggleExpand?: (id: string) => void;
  direction: 'up' | 'down';
}

export const NarrativeEntry: React.FC<NarrativeEntryProps> = ({entry, onToggleExpand, direction}) => {
  const {t} = useTranslation();

  const hasOperations = entry.operations && entry.operations.length > 0;
  const hasConditions = entry.conditions && entry.conditions.length > 0;
  const isExpanded = entry.isExpanded ?? false;
  const [conditionsExpanded, setConditionsExpanded] = React.useState(false);
  const isManualClick = React.useRef(false);

  // Синхронизируем состояние блока условий при изменении isExpanded извне
  // (например, при использовании кнопок "Развернуть все"/"Свернуть все")
  React.useEffect(() => {
    if (!isManualClick.current) {
      setConditionsExpanded(isExpanded);
    }
    // Сбрасываем флаг после обработки
    isManualClick.current = false;
  }, [isExpanded]);

  const handleClick = () => {
    if (hasOperations && onToggleExpand) {
      isManualClick.current = true;
      onToggleExpand(entry.id);
    }
  };

  const handleConditionsClick = () => {
    setConditionsExpanded(!conditionsExpanded);
  };

  const renderConditions = () => {
    {
      /* Блок условий перед нарративом */
    }
    if (hasConditions) {
      return (
        <div className={`${styles.logEntry} ${styles.conditionBlock}`}>
          <div className={styles.conditionBlockHeader} onClick={handleConditionsClick}>
            <span className={styles.conditionBlockTitle}>{t('playback.log_panel.conditions_triggered')}</span>
            <div className={styles.conditionExpandIcon}>{conditionsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</div>
          </div>

          {conditionsExpanded && (
            <div className={styles.conditionsList}>
              {entry.conditions!.map((condition) => (
                <ConditionView key={condition.id} condition={condition} />
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderNarrative = () => {
    return (
      <div className={`${styles.logEntry} ${styles.narrativeEntry}`}>
        <div className={styles.narrativeHeader} onClick={handleClick}>
          <div className={styles.entryContent}>
            <span className={styles.entryIndex}>{entry.index}.</span>
            <div className={styles.narrativeMainContent}>
              <div className={styles.narrativeTypeRow}>
                <span className={`${styles.entryType} ${styles.narrativeType}`}>{t('playback.log_panel.narrative')}</span>
                {hasOperations && <div className={styles.expandIcon}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>}
              </div>
              <div className={styles.narrativeTextRow}>
                <span className={`${styles.entryName} ${styles.narrativeName}`} title={entry.nodeName}>
                  {entry.nodeName}
                </span>
              </div>
            </div>
          </div>
          <span className={styles.timestamp}>{entry.timestamp}</span>
        </div>

        {/* Операции */}
        {isExpanded && hasOperations && (
          <div className={styles.operationsContainer}>
            <div className={styles.operationsHeader}>
              <span className={styles.operationsTitle}>{t('playback.log_panel.all_operations')}</span>
              <span className={styles.operationsTitle}>{t('playback.log_panel.operations_count', {count: entry.operations!.length})}</span>
            </div>
            <div className={styles.operationsList}>
              {entry.operations!.map((operation, index) => (
                <OperationView key={operation.id} operation={operation} index={index + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransitionArrow = () => {
    if (entry.hasTransition) {
      return <div className={styles.transitionArrow}>{direction === 'up' ? <ArrowUp className={styles.transitionIcon} /> : <ArrowDown className={styles.transitionIcon} />}</div>;
    }
    return null;
  };

  return (
    <>
      {direction === 'down' && (
        <>
          {renderTransitionArrow()}
          {renderConditions()}
        </>
      )}

      {/* Основной блок нарратива */}
      {renderNarrative()}

      {direction === 'up' && (
        <>
          {renderConditions()}
          {renderTransitionArrow()}
        </>
      )}
    </>
  );
};
