import React, {useEffect, useState} from 'react';

import {CreateNoteDto, Note, UpdateNoteDto} from '@types-folder/notebook';

import styles from './NoteEditor.module.scss';

interface BaseNoteEditorProps {
  onCancel: () => void;
}

interface CreateNoteEditorProps extends BaseNoteEditorProps {
  mode: 'create';
  projectId?: string;
  onSave: (data: CreateNoteDto) => Promise<void>;
}

interface EditNoteEditorProps extends BaseNoteEditorProps {
  mode: 'edit';
  note: Note;
  onSave: (data: UpdateNoteDto) => Promise<void>;
}

type NoteEditorProps = CreateNoteEditorProps | EditNoteEditorProps;

export const NoteEditor: React.FC<NoteEditorProps> = (props) => {
  const {mode, onSave, onCancel} = props;
  const note = mode === 'edit' ? props.note : undefined;
  const projectId = mode === 'create' ? props.projectId : undefined;

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isPublic, setIsPublic] = useState(note?.isPublic || false);
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isSaving, setIsSaving] = useState(false);

  // Обновляем состояние при смене заметки
  useEffect(() => {
    if (mode === 'edit' && note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setIsPublic(note.isPublic || false);
      setIsPinned(note.isPinned || false);
    } else if (mode === 'create') {
      setTitle('');
      setContent('');
      setIsPublic(false);
      setIsPinned(false);
    }
  }, [mode, note]);

  const handleSave = async () => {
    if (!content.trim()) {
      console.warn('Содержимое заметки не может быть пустым');
      return;
    }

    setIsSaving(true);

    try {
      if (mode === 'create') {
        const data: CreateNoteDto = {
          title: title.trim() || 'Без заголовка',
          content: content.trim(),
          tagIds: [],
          isPublic,
          isPinned,
          ...(projectId && {projectId})
        };
        await onSave(data);
      } else {
        const data: UpdateNoteDto = {
          title: title.trim() || 'Без заголовка',
          content: content.trim(),
          tagIds: [],
          isPublic,
          isPinned
        };
        await onSave(data);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={styles.noteEditor} onKeyDown={handleKeyDown}>
      <div className={styles.header}>
        <input type='text' value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Заголовок заметки...' className={styles.titleInput} maxLength={200} />
        <div className={styles.actions}>
          <div className={styles.buttons}>
            <button className={styles.cancelBtn} onClick={onCancel} disabled={isSaving}>
              Отмена
            </button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving || !content.trim()}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder='Начните писать заметку... 

Поддерживается Markdown:
**жирный текст**
*курсив*
- списки
[ссылки](url)
`код`'
          className={styles.contentTextarea}
          rows={20}
          maxLength={100000}
        />
      </div>
    </div>
  );
};
