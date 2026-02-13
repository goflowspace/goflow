import React from 'react';

import {ArrowDown, ArrowUp} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {ChoiceLogEntry} from '../types';

import styles from '../styles.module.css';

interface ChoiceEntryProps {
  entry: ChoiceLogEntry;
  direction: 'up' | 'down';
}

export const ChoiceEntry: React.FC<ChoiceEntryProps> = ({entry, direction}) => {
  const {t} = useTranslation();

  const renderTransitionArrow = () => {
    if (entry.hasTransition) {
      return <div className={styles.transitionArrow}>{direction === 'up' ? <ArrowUp className={styles.transitionIcon} /> : <ArrowDown className={styles.transitionIcon} />}</div>;
    }
    return null;
  };

  return (
    <>
      {direction === 'down' && <>{renderTransitionArrow()}</>}

      <div className={`${styles.logEntry} ${styles.choiceEntry}`}>
        <div className={styles.choiceHeader}>
          <div className={styles.entryContent}>
            <span className={styles.entryIndex}>{entry.index}.</span>
            <span className={`${styles.entryType} ${styles.choiceType}`}>{t('playback.log_panel.choice')}</span>
            <span className={`${styles.entryName} ${styles.choiceName}`}>{entry.choiceName}</span>
          </div>
          <span className={styles.timestamp}>{entry.timestamp}</span>
        </div>
      </div>

      {direction === 'up' && <>{renderTransitionArrow()}</>}
    </>
  );
};
