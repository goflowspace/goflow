import React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import {Cross1Icon} from '@radix-ui/react-icons';
import {useTranslation} from 'react-i18next';

import {useAIDebugStore} from '@store/useAIDebugStore';

import AIDebugPanel from './AIDebugPanel';

import './AIDebugModal.scss';

const AIDebugModal: React.FC = () => {
  const {t} = useTranslation();
  const {isDebugModalOpen, setDebugModalOpen} = useAIDebugStore();

  return (
    <Dialog.Root open={isDebugModalOpen} onOpenChange={setDebugModalOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className='ai-debug-modal-overlay' />
        <Dialog.Content className='ai-debug-modal-content'>
          <div className='ai-debug-modal-header'>
            <Dialog.Title className='ai-debug-modal-title'>🐛 {t('ai_debug.title')}</Dialog.Title>
            <Dialog.Close asChild>
              <button className='ai-debug-modal-close' aria-label={t('ai_debug.close_button')} onClick={() => setDebugModalOpen(false)}>
                <Cross1Icon />
              </button>
            </Dialog.Close>
          </div>

          <div className='ai-debug-modal-body'>
            <AIDebugPanel className='modal-debug-panel' />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AIDebugModal;
