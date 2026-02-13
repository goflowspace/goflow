import {AICredits} from '@types-folder/ai';
import {create} from 'zustand';

import {aiService} from '../services/aiService';

interface CreditsState {
  credits: AICredits | undefined;
  isLoading: boolean;
  error: string | undefined;

  // Actions
  loadCredits: () => Promise<AICredits | undefined>;
  refreshCredits: () => Promise<AICredits | undefined>;
}

/**
 * Глобальный стор для управления кредитами AI
 * Обеспечивает синхронизацию данных между всеми компонентами
 */
export const useCreditsStore = create<CreditsState>((set, get) => ({
  credits: undefined,
  isLoading: false,
  error: undefined,

  loadCredits: async () => {
    set({isLoading: true, error: undefined});

    try {
      const credits = await aiService.getCreditsBalance();
      set({
        credits,
        isLoading: false,
        error: undefined
      });
      return credits;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load AI credits';
      console.error('Failed to load AI credits:', error);
      set({
        isLoading: false,
        error: errorMessage
      });
      return undefined;
    }
  },

  refreshCredits: async () => {
    // refreshCredits это алиас для loadCredits
    return get().loadCredits();
  }
}));
