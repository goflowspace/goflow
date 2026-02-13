import React from 'react';

import {useParams, usePathname, useRouter} from 'next/navigation';

import {Timeline, api} from '@services/api';
import {render, waitFor} from '@testing-library/react';
import {buildEditorPath} from 'src/utils/navigation';

import EditorPage from '../[project_id]/editor/page';

// Мокаем Next.js хуки
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  usePathname: jest.fn()
}));

// Мокаем API
jest.mock('@services/api', () => ({
  api: {
    getProjectTimelines: jest.fn()
  }
}));

const mockReplace = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockGetProjectTimelines = api.getProjectTimelines as jest.MockedFunction<typeof api.getProjectTimelines>;

describe('EditorPage redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn()
    } as any);

    mockUsePathname.mockReturnValue('/test-project/editor');
  });

  it('should redirect to first timeline when accessing project editor root', async () => {
    mockUseParams.mockReturnValue({
      project_id: 'test-project-123'
    });

    const mockTimelines: Timeline[] = [
      {
        id: 'timeline-1',
        projectId: 'test-project-123',
        name: 'First Timeline',
        isActive: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'timeline-2',
        projectId: 'test-project-123',
        name: 'Second Timeline',
        isActive: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    ];

    mockGetProjectTimelines.mockResolvedValue(mockTimelines);

    const {getByText} = render(<EditorPage />);

    // Должен показывать Loading пока загружаются таймлайны
    expect(getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(buildEditorPath('test-project-123', 'timeline-1'));
    });
  });

  it('should redirect to active timeline if it exists', async () => {
    mockUseParams.mockReturnValue({
      project_id: 'test-project-123'
    });

    const mockTimelines: Timeline[] = [
      {
        id: 'timeline-1',
        projectId: 'test-project-123',
        name: 'First Timeline',
        isActive: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'timeline-2',
        projectId: 'test-project-123',
        name: 'Active Timeline',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'timeline-3',
        projectId: 'test-project-123',
        name: 'Third Timeline',
        isActive: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    ];

    mockGetProjectTimelines.mockResolvedValue(mockTimelines);

    render(<EditorPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(buildEditorPath('test-project-123', 'timeline-2'));
    });
  });

  it('should redirect to home when no timelines exist', async () => {
    mockUseParams.mockReturnValue({
      project_id: 'test-project-123'
    });

    mockGetProjectTimelines.mockResolvedValue([]);

    render(<EditorPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('should redirect to home when API call fails', async () => {
    mockUseParams.mockReturnValue({
      project_id: 'test-project-123'
    });

    mockGetProjectTimelines.mockRejectedValue(new Error('API Error'));

    render(<EditorPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('should show loading during API call', () => {
    mockUseParams.mockReturnValue({
      project_id: 'test-project-123'
    });

    mockGetProjectTimelines.mockImplementation(() => new Promise(() => {})); // Never resolves

    const {container} = render(<EditorPage />);

    expect(container.firstChild).toHaveTextContent('Loading...');
  });

  it('should return null after loading completes', async () => {
    mockUseParams.mockReturnValue({
      project_id: 'test-project-123'
    });

    const mockTimelines: Timeline[] = [
      {
        id: 'timeline-1',
        projectId: 'test-project-123',
        name: 'Timeline',
        isActive: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    ];
    mockGetProjectTimelines.mockResolvedValue(mockTimelines);

    const {container} = render(<EditorPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
