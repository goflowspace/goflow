import React, {useEffect, useRef, useState} from 'react';

import {useTranslation} from 'react-i18next';

import styles from './MultiSelect.module.css';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  translationPrefix?: string; // Опциональный префикс для переводов
  optionLabels?: Record<string, string>; // Альтернатива переводам - прямые лейблы
  className?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({options, value, onChange, placeholder = 'Выберите опции...', label, translationPrefix, optionLabels, className, disabled = false}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {t} = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (optionValue: string) => {
    if (disabled) return;

    const newValue = value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue];
    onChange(newValue);
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    return placeholder; // Всегда показываем placeholder, а выбранные элементы отображаются в тегах
  };

  const getOptionLabel = (option: string) => {
    // Используем прямые лейблы если переданы
    if (optionLabels && optionLabels[option]) {
      return optionLabels[option];
    }

    // Иначе используем переводы если есть префикс
    if (translationPrefix) {
      return t(`${translationPrefix}.${option}`, option);
    }

    // В последнюю очередь возвращаем сам option
    return option;
  };

  const getSelectedLabels = () => {
    return value.map(getOptionLabel);
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {label && <label className={styles.label}>{label}</label>}

      <div className={styles.multiSelect} ref={containerRef}>
        <div className={`${styles.selector} ${isOpen ? styles.open : ''} ${disabled ? styles.disabled : ''}`} onClick={() => !disabled && setIsOpen(!isOpen)}>
          <div className={styles.selectedContent}>
            {value.length === 0 && <span className={styles.displayText}>{getDisplayText()}</span>}
            {value.length > 0 && (
              <div className={styles.selectedTags}>
                {getSelectedLabels().map((label, index) => (
                  <span key={index} className={styles.tag}>
                    {label}
                    <button
                      type='button'
                      className={styles.removeTag}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) {
                          handleToggleOption(value[index]);
                        }
                      }}
                      disabled={disabled}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>▼</div>
        </div>

        {isOpen && !disabled && (
          <div className={styles.dropdown}>
            <div className={styles.optionsList}>
              {options.map((option) => (
                <label key={option} className={`${styles.option} ${value.includes(option) ? styles.selected : ''}`}>
                  <input type='checkbox' checked={value.includes(option)} onChange={() => handleToggleOption(option)} className={styles.checkbox} />
                  <span className={styles.checkmark}></span>
                  <span className={styles.optionLabel}>{getOptionLabel(option)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
