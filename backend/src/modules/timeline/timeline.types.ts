/**
 * Типы для модуля таймлайнов
 */

export interface CreateTimelineDto {
  projectId: string;
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateTimelineDto {
  name?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface TimelineResponse {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // НЕ включаем layers, metadata, variables для экономии трафика
}

export interface TimelinesQueryParams {
  projectId: string;
  limit?: number;
  offset?: number;
  orderBy?: 'order' | 'createdAt' | 'name';
  sortDirection?: 'asc' | 'desc';
}
