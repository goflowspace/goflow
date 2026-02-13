import {useEffect, useState} from 'react';

import {API_URL, api} from '@services/api';

// Types matching backend interfaces
export interface ProjectLocalization {
  id: string;
  projectId: string;
  baseLanguage: string;
  targetLanguages: string[];
  autoTranslate: boolean;
  preserveMarkup: boolean;
  requireReview: boolean;
  minContextWords: number;
  maxBatchSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineLocalizationSummary {
  id: string;
  name: string;
  description?: string;
  languageStats: Array<{
    language: string;
    total: number;
    translated: number;
    reviewed: number;
    approved: number;
    progress: number; // 0-100%
  }>;
  overallStatus: 'not_started' | 'in_progress' | 'review_needed' | 'completed';
  lastUpdated: string;
}

export interface LocalizationStats {
  totalTexts: number;
  totalWords: number;
  totalCharacters: number;
  languageBreakdown: Record<
    string,
    {
      total: number;
      translated: number;
      approved: number;
      progress: number;
    }
  >;
  statusBreakdown: Record<string, number>;
  methodBreakdown: Record<string, number>;
}

export interface LocalizableText {
  id?: string;
  nodeId: string;
  nodeType: 'narrative' | 'choice';
  nodeTitle?: string;
  layerId: string;
  layerName?: string;
  fieldPath: string;
  originalText: string;
  translatedText?: string;
  status?: string;
  method?: string;
  wordCount?: number;
  characterCount?: number;
  contextHash?: string;
  precedingText?: string;
  followingText?: string;
  entityContext?: any;
}

export interface LocalizationConfig {
  baseLanguage: string;
  targetLanguages: string[];
  autoTranslate?: boolean;
  preserveMarkup?: boolean;
  requireReview?: boolean;
  minContextWords?: number;
  maxBatchSize?: number;
}

export interface TranslationUpdate {
  localizationId: string;
  translatedText: string;
  method: string;
  quality?: number;
  reviewedBy?: string;
}

// Main hook for localization data
export function useLocalizationData(projectId: string) {
  const [projectLocalization, setProjectLocalization] = useState<ProjectLocalization | null>(null);
  const [timelineSummaries, setTimelineSummaries] = useState<TimelineLocalizationSummary[]>([]);
  const [stats, setStats] = useState<LocalizationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch project localization settings
      try {
        const localizationResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}`);
        if (localizationResponse.ok) {
          const data = await localizationResponse.json();
          setProjectLocalization(data.data);
        } else if (localizationResponse.status === 404) {
          setProjectLocalization(null);
        } else {
          throw new Error(`Failed to fetch project localization: ${localizationResponse.status}`);
        }
      } catch (err: any) {
        // If 404, it means no localization settings exist yet
        if (err.message?.includes('404')) {
          setProjectLocalization(null);
        } else {
          throw err;
        }
      }

      // Fetch timeline summaries and stats (независимо от настроек локализации)
      try {
        const summariesResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/timelines/summary`);
        if (summariesResponse.ok) {
          const data = await summariesResponse.json();
          setTimelineSummaries(data.data || []);
        } else {
          setTimelineSummaries([]);
        }
      } catch (err: any) {
        // Если нет настроек локализации, это нормально
        setTimelineSummaries([]);
      }

      try {
        const statsResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/stats`);
        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setStats(data.data);
        } else {
          setStats(null);
        }
      } catch (err: any) {
        // Если нет настроек локализации, это нормально
        setStats(null);
      }
    } catch (err: any) {
      console.error('Error fetching localization data:', err);
      setError(err.message || 'Failed to load localization data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const refetch = () => fetchData();

  return {
    projectLocalization,
    timelineSummaries,
    stats,
    isLoading,
    error,
    refetch
  };
}

// Hook for timeline texts
export function useTimelineTexts(projectId: string, timelineId: string, language?: string) {
  const [texts, setTexts] = useState<LocalizableText[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTexts = async () => {
    if (!projectId || !timelineId) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (language) {
        params.append('language', language);
      }

      const response = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/timelines/${timelineId}/texts?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch timeline texts: ${response.status}`);
      }

      const data = await response.json();
      setTexts(data.data || []);
    } catch (err: any) {
      console.error('Error fetching timeline texts:', err);
      setError(err.message || 'Failed to load timeline texts');
      setTexts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTexts();
  }, [projectId, timelineId, language]);

  const refetch = () => fetchTexts();

  return {
    texts,
    isLoading,
    error,
    refetch
  };
}

// Hook for managing localization settings
export function useLocalizationSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveConfig = async (projectId: string, config: LocalizationConfig) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save configuration';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addLanguage = async (projectId: string, language: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/languages`, {
        method: 'POST',
        body: JSON.stringify({language})
      });

      if (!response.ok) {
        throw new Error(`Failed to add language: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add language';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const removeLanguage = async (projectId: string, language: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/languages/${language}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to remove language: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to remove language';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveConfig,
    addLanguage,
    removeLanguage,
    isLoading,
    error
  };
}

// Hook for managing translations
export function useTranslationManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTranslation = async (update: TranslationUpdate) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.fetchWithAuth(`${API_URL}/localization/translations/${update.localizationId}`, {
        method: 'PUT',
        body: JSON.stringify(update)
      });

      if (!response.ok) {
        throw new Error(`Failed to update translation: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update translation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const bulkUpdateTranslations = async (projectId: string, updates: TranslationUpdate[]) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/translations/batch`, {
        method: 'POST',
        body: JSON.stringify({updates})
      });

      if (!response.ok) {
        throw new Error(`Failed to update translations: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update translations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const startAITranslation = async (
    projectId: string,
    options: {
      timelineId?: string;
      targetLanguage?: string;
      maxTexts?: number;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/translations/ai-translate`, {
        method: 'POST',
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`Failed to AI translate: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start AI translation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const quickTranslateNode = async (
    projectId: string,
    nodeId: string,
    options: {
      sourceLanguage: string;
      targetLanguage: string;
      precedingContext?: string;
      followingContext?: string;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Используем быстрый перевод с настройками по умолчанию
      const response = await api.translateNodeWithPipeline(projectId, nodeId, {
        ...options,
        translationStyle: 'adaptive',
        preserveMarkup: true,
        qualityLevel: 'fast'
      });

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to translate node';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const syncTranslations = async (projectId: string, timelineId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (timelineId) {
        params.append('timelineId', timelineId);
      }

      const response = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/sync?${params}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to sync localization: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to sync translations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const estimateBatchTranslation = async (
    projectId: string,
    timelineId: string,
    options: {
      targetLanguage: string;
      qualityLevel?: 'fast' | 'standard' | 'expert';
      skipExisting?: boolean;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.estimateBatchTranslation(projectId, timelineId, options);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to estimate batch translation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const batchTranslateTimeline = async (
    projectId: string,
    timelineId: string,
    options: {
      sourceLanguage: string;
      targetLanguage: string;
      translationStyle?: 'literal' | 'adaptive' | 'creative';
      preserveMarkup?: boolean;
      qualityLevel?: 'fast' | 'standard' | 'expert';
      skipExisting?: boolean;
      additionalRequirements?: string;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.batchTranslateTimeline(projectId, timelineId, options);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start batch translation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTranslation = async (localizationId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.deleteTranslation(localizationId);
      console.log('✅ Translation deleted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete translation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTranslation = async (localizationId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.updateTranslation(localizationId, {
        localizationId,
        translatedText: '', // Устанавливаем пустую строку
        method: 'MANUAL'
      });

      console.log('✅ Translation cleared successfully');
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to clear translation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateTranslation,
    bulkUpdateTranslations,
    startAITranslation,
    quickTranslateNode,
    estimateBatchTranslation,
    batchTranslateTimeline,
    deleteTranslation,
    clearTranslation,
    syncTranslations,
    isLoading,
    error
  };
}
