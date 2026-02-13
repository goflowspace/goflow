import {useCallback, useEffect, useState} from 'react';

import {aiService} from '../services/aiService';
import type {AICreditsState, AISettings, AISettingsState, AISuggestionsState, GenerateSuggestionsRequest} from '../types/ai';

/**
 * Хук для управления AI предложениями
 */
export function useAISuggestions(projectId?: string) {
  const [state, setState] = useState<AISuggestionsState>({
    suggestions: [],
    isLoading: false,
    error: undefined,
    lastUpdated: undefined
  });

  const generateSuggestions = useCallback(async (request: GenerateSuggestionsRequest) => {
    setState((prev) => ({...prev, isLoading: true, error: undefined}));

    try {
      const suggestions = await aiService.generateSuggestions(request);
      setState((prev) => ({
        ...prev,
        suggestions,
        isLoading: false,
        lastUpdated: new Date()
      }));
      return suggestions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const acceptSuggestion = useCallback(async (suggestionId: string, feedback?: string) => {
    try {
      await aiService.acceptSuggestion(suggestionId, feedback);
      setState((prev) => ({
        ...prev,
        suggestions: prev.suggestions.map((s) => (s.id === suggestionId ? {...s, status: 'ACCEPTED' as const, userFeedback: feedback} : s))
      }));
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      throw error;
    }
  }, []);

  const rejectSuggestion = useCallback(async (suggestionId: string, feedback?: string) => {
    try {
      await aiService.rejectSuggestion(suggestionId, feedback);
      setState((prev) => ({
        ...prev,
        suggestions: prev.suggestions.map((s) => (s.id === suggestionId ? {...s, status: 'REJECTED' as const, userFeedback: feedback} : s))
      }));
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      throw error;
    }
  }, []);

  const loadSuggestionsHistory = useCallback(
    async (limit: number = 20, offset: number = 0) => {
      setState((prev) => ({...prev, isLoading: true, error: undefined}));

      try {
        const result = await aiService.getSuggestionsHistory(projectId, limit, offset);
        setState((prev) => ({
          ...prev,
          suggestions: offset === 0 ? result.suggestions : [...prev.suggestions, ...result.suggestions],
          isLoading: false,
          lastUpdated: new Date()
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load suggestions history';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
        throw error;
      }
    },
    [projectId]
  );

  const clearSuggestions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      suggestions: [],
      error: undefined
    }));
  }, []);

  return {
    ...state,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    loadSuggestionsHistory,
    clearSuggestions
  };
}

/**
 * Хук для управления настройками AI
 */
export function useAISettings() {
  const [state, setState] = useState<AISettingsState>({
    settings: undefined,
    isLoading: false,
    error: undefined,
    hasUnsavedChanges: false
  });

  const loadSettings = useCallback(async () => {
    setState((prev) => ({...prev, isLoading: true, error: undefined}));

    try {
      const settings = await aiService.getSettings();
      setState((prev) => ({
        ...prev,
        settings,
        isLoading: false,
        hasUnsavedChanges: false
      }));
      return settings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load AI settings';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AISettings>) => {
    setState((prev) => ({...prev, isLoading: true, error: undefined}));

    try {
      const updatedSettings = await aiService.updateSettings(newSettings);
      setState((prev) => ({
        ...prev,
        settings: updatedSettings,
        isLoading: false,
        hasUnsavedChanges: false
      }));
      return updatedSettings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update AI settings';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const setTempSettings = useCallback((newSettings: Partial<AISettings>) => {
    setState((prev) => ({
      ...prev,
      settings: prev.settings ? {...prev.settings, ...newSettings} : undefined,
      hasUnsavedChanges: true
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasUnsavedChanges: false
    }));
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    ...state,
    loadSettings,
    updateSettings,
    setTempSettings,
    resetSettings
  };
}

/**
 * Хук для управления кредитами AI
 */
export function useAICredits() {
  const [state, setState] = useState<AICreditsState>({
    credits: undefined,
    isLoading: false,
    error: undefined
  });

  const loadCredits = useCallback(async () => {
    setState((prev) => ({...prev, isLoading: true, error: undefined}));

    try {
      const credits = await aiService.getCreditsBalance();
      setState((prev) => ({
        ...prev,
        credits,
        isLoading: false
      }));
      return credits;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load AI credits';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  return {
    ...state,
    loadCredits,
    refreshCredits: loadCredits
  };
}

/**
 * Комбинированный хук для работы с AI системой
 */
export function useAI(projectId?: string) {
  const suggestions = useAISuggestions(projectId);
  const settings = useAISettings();
  const credits = useAICredits();

  return {
    suggestions,
    settings,
    credits
  };
}
