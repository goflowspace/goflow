import React, {ReactNode, createContext, useContext, useEffect, useState} from 'react';

import {api} from '@services/api';

export interface PipelinePricing {
  id: string;
  category: string;
  credits: number;
  metadata: {
    estimatedDuration: number;
    operationsCount: number;
  };
}

export interface PipelinesPricingData {
  version: string;
  generatedAt: number;
  pipelines: Record<string, PipelinePricing>;
  statistics: {
    totalPipelines: number;
    categories: string[];
  };
}

interface PipelinePricingContextType {
  pricingData: PipelinesPricingData | null;
  isLoading: boolean;
  error: string | null;
  loadPricingData: () => Promise<void>;
  getPipelinePrice: (pipelineId: string) => number | null;
  getPipelineInfo: (pipelineId: string) => PipelinePricing | null;
  formatPrice: (credits: number) => string;
  getFormattedPrice: (pipelineId: string) => string;
}

const PipelinePricingContext = createContext<PipelinePricingContextType | undefined>(undefined);

interface PipelinePricingProviderProps {
  children: ReactNode;
}

export const PipelinePricingProvider: React.FC<PipelinePricingProviderProps> = ({children}) => {
  const [pricingData, setPricingData] = useState<PipelinesPricingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Загружает данные о ценах пайплайнов
   */
  const loadPricingData = async () => {
    // Если данные уже загружены, не делаем повторный запрос
    if (pricingData && !error) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getPipelinesPricing();
      setPricingData(data);
    } catch (err) {
      console.error('Failed to load pipeline pricing:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pricing data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Получает стоимость конкретного пайплайна
   */
  const getPipelinePrice = (pipelineId: string): number | null => {
    if (!pricingData || !pricingData.pipelines[pipelineId]) {
      return null;
    }
    return pricingData.pipelines[pipelineId].credits;
  };

  /**
   * Получает информацию о пайплайне
   */
  const getPipelineInfo = (pipelineId: string): PipelinePricing | null => {
    if (!pricingData || !pricingData.pipelines[pipelineId]) {
      return null;
    }
    return pricingData.pipelines[pipelineId];
  };

  /**
   * Форматирует стоимость для отображения
   */
  const formatPrice = (credits: number): string => {
    if (credits === 0) return 'Free';
    if (credits < 1000) return `${credits}`;
    return `${(credits / 1000).toFixed(1)}k`;
  };

  /**
   * Получает отформатированную стоимость пайплайна
   */
  const getFormattedPrice = (pipelineId: string): string => {
    const price = getPipelinePrice(pipelineId);
    if (price === null) return '—';
    return formatPrice(price);
  };

  // Загружаем данные при монтировании провайдера
  useEffect(() => {
    loadPricingData();
  }, []);

  const value = {
    pricingData,
    isLoading,
    error,
    loadPricingData,
    getPipelinePrice,
    getPipelineInfo,
    formatPrice,
    getFormattedPrice
  };

  return <PipelinePricingContext.Provider value={value}>{children}</PipelinePricingContext.Provider>;
};

// Заглушка для OSS режима (когда PipelinePricingProvider не используется)
const defaultPipelinePricingContext: PipelinePricingContextType = {
  pricingData: null,
  isLoading: false,
  error: null,
  loadPricingData: async () => {},
  getPipelinePrice: () => null,
  getPipelineInfo: () => null,
  formatPrice: () => '—',
  getFormattedPrice: () => '—'
};

export const usePipelinePricing = (): PipelinePricingContextType => {
  const context = useContext(PipelinePricingContext);
  if (context === undefined) {
    // В OSS режиме возвращаем безопасную заглушку вместо ошибки
    return defaultPipelinePricingContext;
  }
  return context;
};
