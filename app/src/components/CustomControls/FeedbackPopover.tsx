'use client';

import React, {useState} from 'react';

import {Button, TextArea} from '@radix-ui/themes';
import {api} from '@services/api';
import {ProjectDataService} from '@services/projectDataService';
import {useTranslation} from 'react-i18next';

import s from './FeedbackPopover.module.scss';

interface FeedbackPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackPopover: React.FC<FeedbackPopoverProps> = ({isOpen, onClose}) => {
  const {t} = useTranslation();
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackText.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Получаем текущий projectId
      const currentProjectId = ProjectDataService.getStatus().currentProjectId;

      await api.sendFeedback({
        text: feedbackText.trim(),
        projectId: currentProjectId || undefined
      });

      // Показываем уведомление об успешной отправке
      try {
        const {getNotificationManager} = await import('../Notifications');
        getNotificationManager().showSuccess(t('feedback.success', 'Thank you for your feedback!'), false, 3000);
      } catch (notificationError) {
        console.warn('Failed to show notification:', notificationError);
      }

      setFeedbackText('');
      onClose();
    } catch (error) {
      console.error('Failed to send feedback:', error);

      // Показываем уведомление об ошибке
      try {
        const {getNotificationManager} = await import('../Notifications');
        getNotificationManager().showError(t('feedback.error', 'Failed to send feedback. Please try again.'), false, 5000);
      } catch (notificationError) {
        console.warn('Failed to show notification:', notificationError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={s.backdrop} onClick={handleBackdropClick} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className={s.popover}>
        <h3 className={s.title}>{t('feedback.title', 'Send Feedback')}</h3>

        <form onSubmit={handleSubmit} className={s.form}>
          <TextArea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={t('feedback.placeholder', 'Share your thoughts, report bugs, or suggest improvements...')}
            className={s.textarea}
            rows={4}
            disabled={isSubmitting}
            autoFocus
          />

          <div className={s.actions}>
            <Button type='button' variant='soft' onClick={onClose} disabled={isSubmitting}>
              {t('feedback.cancel', 'Cancel')}
            </Button>

            <Button type='submit' disabled={!feedbackText.trim() || isSubmitting} loading={isSubmitting}>
              {t('feedback.send', 'Send')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackPopover;
