import {useParams} from 'next/navigation';

import {renderHook} from '@testing-library/react';

import {useCurrentRoute} from '../useCurrentRoute';

// Мокаем useParams из Next.js
jest.mock('next/navigation', () => ({
  useParams: jest.fn()
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('useCurrentRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all parameters when they are provided', () => {
    mockUseParams.mockReturnValue({
      project_id: 'project123',
      timeline_id: 'timeline-1',
      layer_id: 'layer-456'
    });

    const {result} = renderHook(() => useCurrentRoute());

    expect(result.current).toEqual({
      projectId: 'project123',
      timelineId: 'timeline-1',
      layerId: 'layer-456'
    });
  });

  it('should return undefined timelineId when timeline_id is not provided', () => {
    mockUseParams.mockReturnValue({
      project_id: 'project123',
      layer_id: 'layer-456'
    });

    const {result} = renderHook(() => useCurrentRoute());

    expect(result.current).toEqual({
      projectId: 'project123',
      timelineId: undefined,
      layerId: 'layer-456'
    });
  });

  it('should use "root" when layer_id is not provided', () => {
    mockUseParams.mockReturnValue({
      project_id: 'project123',
      timeline_id: 'timeline-1'
    });

    const {result} = renderHook(() => useCurrentRoute());

    expect(result.current).toEqual({
      projectId: 'project123',
      timelineId: 'timeline-1',
      layerId: 'root'
    });
  });

  it('should use defaults when only project_id is provided', () => {
    mockUseParams.mockReturnValue({
      project_id: 'project123'
    });

    const {result} = renderHook(() => useCurrentRoute());

    expect(result.current).toEqual({
      projectId: 'project123',
      timelineId: undefined,
      layerId: 'root'
    });
  });

  it('should handle empty params object', () => {
    mockUseParams.mockReturnValue({});

    const {result} = renderHook(() => useCurrentRoute());

    expect(result.current).toEqual({
      projectId: undefined,
      timelineId: undefined,
      layerId: 'root'
    });
  });

  it('should handle null/undefined params', () => {
    mockUseParams.mockReturnValue(null as any);

    const {result} = renderHook(() => useCurrentRoute());

    expect(result.current).toEqual({
      projectId: undefined,
      timelineId: undefined,
      layerId: 'root'
    });
  });

  it('should handle array values from params (edge case)', () => {
    mockUseParams.mockReturnValue({
      project_id: ['project123', 'extra'],
      timeline_id: ['timeline-1'],
      layer_id: ['layer-456', 'extra']
    } as any);

    const {result} = renderHook(() => useCurrentRoute());

    // Next.js возвращает массивы как есть, поэтому они не приводятся к string
    expect(result.current.projectId).toEqual(['project123', 'extra']);
    expect(result.current.timelineId).toEqual(['timeline-1']); // массив остается массивом
    expect(result.current.layerId).toEqual(['layer-456', 'extra']); // массив остается массивом
  });

  it('should update when params change', () => {
    mockUseParams.mockReturnValue({
      project_id: 'project123',
      timeline_id: 'timeline-1',
      layer_id: 'layer-456'
    });

    const {result, rerender} = renderHook(() => useCurrentRoute());

    expect(result.current.layerId).toBe('layer-456');

    // Изменяем параметры
    mockUseParams.mockReturnValue({
      project_id: 'project123',
      timeline_id: 'timeline-1',
      layer_id: 'layer-789'
    });

    rerender();

    expect(result.current.layerId).toBe('layer-789');
  });
});
