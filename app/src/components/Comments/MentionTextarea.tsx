import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import cls from 'classnames';

import {useTeamStore} from '@store/useTeamStore';
import useUserStore from '@store/useUserStore';

import {MentionType} from '../../types/comments';
import {TeamMember} from '../../types/team';

import styles from './MentionTextarea.module.scss';

export interface MentionData {
  type: MentionType;
  targetId: string;
  name: string;
  displayText: string;
}

// Новая структура для хранения менталий с позициями
export interface MentionMetadata {
  start: number;
  end: number;
  type: MentionType;
  targetId: string;
  name: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string, mentions: MentionData[]) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  rows?: number;
  disabled?: boolean;
}

interface MentionSuggestion {
  id: string;
  name: string;
  type: 'USER' | 'TEAM';
  email?: string;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({value, onChange, onKeyDown, placeholder, className, autoFocus, rows = 3, disabled}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Новое состояние для метаданных менталий
  const [displayText, setDisplayText] = useState('');
  const [mentionMetadata, setMentionMetadata] = useState<MentionMetadata[]>([]);

  const {teamMembers, currentTeam, loadTeamMembers} = useTeamStore();
  const {user: currentUser} = useUserStore();

  // Загружаем участников команды, если они не загружены
  useEffect(() => {
    if (currentTeam && (!teamMembers || teamMembers.length === 0)) {
      loadTeamMembers(currentTeam.id).catch(console.error);
    }
  }, [currentTeam, teamMembers, loadTeamMembers]);

  // Синхронизируем внутреннее состояние с входящим prop value
  useEffect(() => {
    if (value !== convertToMarkdown(displayText, mentionMetadata)) {
      const parsed = parseMarkdownToMetadata(value);
      setDisplayText(parsed.displayText);
      setMentionMetadata(parsed.metadata);
    }
  }, [value]);

  // Синхронизируем скролл между textarea и overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const overlay = textarea.parentElement?.querySelector(`.${styles.textareaOverlay}`) as HTMLElement;
      if (overlay) {
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
      }
    }
  }, []);

  // Создаем список предложений для упоминаний
  const suggestions = useMemo(() => {
    const result: MentionSuggestion[] = [];

    // Добавляем участников команды (исключая текущего пользователя)
    if (teamMembers && teamMembers.length > 0) {
      teamMembers
        .filter((member: TeamMember) => {
          const isActive = member.status === 'ACTIVE';
          const isNotCurrentUser = member.userId !== currentUser?.id;
          const hasUser = !!member.user;

          // Используем статус ACTIVE, но если нет активных, показываем всех с user данными
          return (isActive || !teamMembers.some((m) => m.status === 'ACTIVE')) && isNotCurrentUser && hasUser;
        })
        .forEach((member: TeamMember) => {
          if (member.user) {
            result.push({
              id: member.userId,
              name: member.user.name,
              email: member.user.email,
              type: 'USER'
            });
          }
        });
    }

    // Добавляем команду
    if (currentTeam) {
      result.push({
        id: currentTeam.id,
        name: currentTeam.name,
        type: 'TEAM'
      });
    }

    return result;
  }, [teamMembers, currentTeam, currentUser?.id]);

  // Фильтруем предложения по текущему запросу
  const filteredSuggestions = useMemo(() => {
    if (!currentQuery) return suggestions;
    return suggestions.filter((suggestion) => suggestion.name.toLowerCase().includes(currentQuery.toLowerCase()));
  }, [suggestions, currentQuery]);

  // Конвертируем markdown формат в displayText + metadata
  const parseMarkdownToMetadata = useCallback((markdownText: string): {displayText: string; metadata: MentionMetadata[]} => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+):([^)]+)\)/g;
    let displayText = '';
    const metadata: MentionMetadata[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(markdownText)) !== null) {
      const [fullMatch, displayName, type, targetId] = match;
      const startIndex = match.index;

      // Добавляем обычный текст перед менталией
      if (startIndex > lastIndex) {
        displayText += markdownText.substring(lastIndex, startIndex);
      }

      // Добавляем менталию в displayText и metadata
      const mentionDisplayText = `@${displayName}`;
      const mentionStart = displayText.length;
      const mentionEnd = mentionStart + mentionDisplayText.length;

      displayText += mentionDisplayText;

      metadata.push({
        start: mentionStart,
        end: mentionEnd,
        type: type as MentionType,
        targetId,
        name: displayName
      });

      lastIndex = startIndex + fullMatch.length;
    }

    // Добавляем оставшийся текст
    if (lastIndex < markdownText.length) {
      displayText += markdownText.substring(lastIndex);
    }

    return {displayText, metadata};
  }, []);

  // Конвертируем displayText + metadata обратно в markdown формат
  const convertToMarkdown = useCallback((text: string, metadata: MentionMetadata[]): string => {
    if (metadata.length === 0) return text;

    let result = '';
    let lastIndex = 0;

    // Сортируем метаданные по позиции
    const sortedMetadata = [...metadata].sort((a, b) => a.start - b.start);

    for (const mention of sortedMetadata) {
      // Добавляем текст перед менталией
      if (mention.start > lastIndex) {
        result += text.substring(lastIndex, mention.start);
      }

      // Добавляем менталию в markdown формате
      result += `@[${mention.name}](${mention.type}:${mention.targetId})`;

      lastIndex = mention.end;
    }

    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
      result += text.substring(lastIndex);
    }

    return result;
  }, []);

  // Конвертируем metadata в старый формат MentionData для обратной совместимости
  const convertMetadataToMentionData = useCallback((metadata: MentionMetadata[]): MentionData[] => {
    return metadata.map((mention) => ({
      type: mention.type,
      targetId: mention.targetId,
      name: mention.name,
      displayText: mention.name
    }));
  }, []);

  // Определяем границы изменения в тексте
  const findChangeRange = useCallback((oldText: string, newText: string): {start: number; end: number; delta: number} => {
    let changeStart = 0;
    const minLength = Math.min(oldText.length, newText.length);

    // Находим начало изменения
    while (changeStart < minLength && oldText[changeStart] === newText[changeStart]) {
      changeStart++;
    }

    let oldEnd = oldText.length;
    let newEnd = newText.length;

    // Находим конец изменения (идем с конца)
    while (oldEnd > changeStart && newEnd > changeStart && oldText[oldEnd - 1] === newText[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }

    return {
      start: changeStart,
      end: oldEnd,
      delta: newEnd - oldEnd
    };
  }, []);

  // Обновляем позиции менталий после изменения текста
  const updateMentionPositions = useCallback(
    (oldText: string, newText: string): MentionMetadata[] => {
      const {start: changeStart, end: changeEnd, delta} = findChangeRange(oldText, newText);

      return mentionMetadata
        .map((mention) => {
          if (mention.end <= changeStart) {
            // Менталия полностью до изменения - позиция не меняется
            return mention;
          } else if (mention.start >= changeEnd) {
            // Менталия полностью после изменения - сдвигаем на дельту
            return {
              ...mention,
              start: mention.start + delta,
              end: mention.end + delta
            };
          } else {
            // Менталия пересекается с изменением - удаляем её
            return null;
          }
        })
        .filter(Boolean) as MentionMetadata[];
    },
    [mentionMetadata, findChangeRange]
  );

  // Обработка изменения текста
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      const cursorPosition = e.target.selectionStart;

      // Обновляем позиции менталий
      const updatedMetadata = updateMentionPositions(displayText, newText);

      setDisplayText(newText);
      setMentionMetadata(updatedMetadata);

      // Проверяем, есть ли символ @ перед курсором для показа suggestions
      let mentionStart = -1;
      for (let i = cursorPosition - 1; i >= 0; i--) {
        if (newText[i] === '@') {
          // Проверяем, что @ не является частью существующей менталии
          const isPartOfMention = updatedMetadata.some((m) => i >= m.start && i < m.end);
          if (!isPartOfMention) {
            mentionStart = i;
            break;
          }
        }
        if (newText[i] === ' ' || newText[i] === '\n') {
          break;
        }
      }

      if (mentionStart !== -1) {
        const query = newText.substring(mentionStart + 1, cursorPosition);
        setCurrentQuery(query);
        setMentionStartIndex(mentionStart);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }

      // Конвертируем обратно в markdown и вызываем onChange
      const markdownText = convertToMarkdown(newText, updatedMetadata);
      const mentions = convertMetadataToMentionData(updatedMetadata);
      onChange(markdownText, mentions);
    },
    [displayText, mentionMetadata, updateMentionPositions, convertToMarkdown, convertMetadataToMentionData, onChange]
  );

  // Обработка нажатий клавиш
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && filteredSuggestions.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedSuggestionIndex((prev) => (prev + 1) % filteredSuggestions.length);
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedSuggestionIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
            break;
          case 'Enter':
          case 'Tab':
            e.preventDefault();
            insertMention(filteredSuggestions[selectedSuggestionIndex]);
            break;
          case 'Escape':
            e.preventDefault();
            setShowSuggestions(false);
            break;
        }
      } else {
        onKeyDown?.(e);
      }
    },
    [showSuggestions, filteredSuggestions, selectedSuggestionIndex, onKeyDown]
  );

  // Вставка упоминания
  const insertMention = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!textareaRef.current || mentionStartIndex === -1) return;

      const textarea = textareaRef.current;
      const cursorPosition = textarea.selectionStart;

      // Создаем видимый текст менталии
      const mentionDisplayText = `@${suggestion.name}`;

      // Заменяем текст от @ до курсора на менталию
      const newDisplayText = displayText.substring(0, mentionStartIndex) + mentionDisplayText + displayText.substring(cursorPosition);

      // Создаем новый объект метаданных менталии
      const newMention: MentionMetadata = {
        start: mentionStartIndex,
        end: mentionStartIndex + mentionDisplayText.length,
        type: suggestion.type as MentionType,
        targetId: suggestion.id,
        name: suggestion.name
      };

      // Обновляем позиции существующих менталий
      const delta = mentionDisplayText.length - (cursorPosition - mentionStartIndex);
      const updatedMetadata = mentionMetadata.map((mention) => {
        if (mention.start > cursorPosition) {
          return {
            ...mention,
            start: mention.start + delta,
            end: mention.end + delta
          };
        }
        return mention;
      });

      // Добавляем новую менталию
      const newMetadata = [...updatedMetadata, newMention];

      setDisplayText(newDisplayText);
      setMentionMetadata(newMetadata);
      setShowSuggestions(false);

      // Конвертируем в markdown и вызываем onChange
      const markdownText = convertToMarkdown(newDisplayText, newMetadata);
      const mentions = convertMetadataToMentionData(newMetadata);
      onChange(markdownText, mentions);

      // Устанавливаем курсор после менталии
      const newCursorPosition = mentionStartIndex + mentionDisplayText.length;

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
          textareaRef.current.focus();
          handleScroll();
        }
      }, 0);
    },
    [mentionStartIndex, displayText, mentionMetadata, convertToMarkdown, convertMetadataToMentionData, onChange, handleScroll]
  );

  // Обработка клика на предложение
  const handleSuggestionClick = useCallback(
    (suggestion: MentionSuggestion) => {
      insertMention(suggestion);
    },
    [insertMention]
  );

  // Обработка клика вне предложений
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSuggestions && textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Синхронизируем overlay при изменении displayText
  useEffect(() => {
    if (textareaRef.current) {
      handleScroll();
    }
  }, [displayText, handleScroll]);

  // Функция для отображения текста с упоминаниями на основе метаданных
  const renderTextWithMentions = (text: string, metadata: MentionMetadata[]) => {
    if (metadata.length === 0) {
      return [text];
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Сортируем метаданные по позиции
    const sortedMetadata = [...metadata].sort((a, b) => a.start - b.start);

    for (const mention of sortedMetadata) {
      // Добавляем обычный текст перед менталией
      if (mention.start > lastIndex) {
        parts.push(text.substring(lastIndex, mention.start));
      }

      // Добавляем стилизованную менталию
      const mentionText = text.substring(mention.start, mention.end);
      parts.push(
        <span key={`mention-${mention.targetId}-${mention.start}`} className={cls(styles.mentionOverlay, styles[mention.type.toLowerCase()])}>
          {mentionText}
        </span>
      );

      lastIndex = mention.end;
    }

    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className={styles.mentionTextareaContainer}>
      <div className={styles.textareaWrapper}>
        <textarea
          ref={textareaRef}
          value={displayText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          className={cls(styles.textarea, className)}
          autoFocus={autoFocus}
          rows={rows}
          disabled={disabled}
        />
        <div className={styles.textareaOverlay}>{renderTextWithMentions(displayText, mentionMetadata)}</div>
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className={styles.suggestionsDropdown}>
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}:${suggestion.id}`}
              className={cls(styles.suggestion, {
                [styles.selected]: index === selectedSuggestionIndex
              })}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className={styles.suggestionContent}>
                <span className={styles.suggestionName}>{suggestion.name}</span>
                {suggestion.email && <span className={styles.suggestionEmail}>{suggestion.email}</span>}
                <span className={cls(styles.suggestionType, styles[suggestion.type.toLowerCase()])}>{suggestion.type === 'USER' ? 'User' : 'Team'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
