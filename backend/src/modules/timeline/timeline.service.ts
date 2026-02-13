import { injectable, inject } from 'inversify';
import { ITimelineRepository, ITimelineService } from './interfaces/timeline.interfaces';
import { 
  CreateTimelineDto, 
  UpdateTimelineDto, 
  TimelineResponse, 
  TimelinesQueryParams 
} from './timeline.types';
import { TYPES } from './di.types';
import { logger } from '@config/logger';
import { createError } from '@middlewares/errorHandler';

@injectable()
export class TimelineService implements ITimelineService {
  constructor(
    @inject(TYPES.TimelineRepository) private timelineRepository: ITimelineRepository
  ) {}

  async createTimeline(userId: string, data: CreateTimelineDto): Promise<TimelineResponse> {
    logger.info('Creating timeline', { userId, projectId: data.projectId, name: data.name });
    
    const timeline = await this.timelineRepository.create(userId, data);
    logger.info('Timeline created successfully', { timelineId: timeline.id, name: timeline.name });
    return timeline;
  }

  async getProjectTimelines(params: TimelinesQueryParams): Promise<TimelineResponse[]> {
    logger.debug('Getting project timelines', { projectId: params.projectId });
    
    const timelines = await this.timelineRepository.findByProject(params);
    logger.debug('Retrieved project timelines', { projectId: params.projectId, count: timelines.length });
    return timelines;
  }

  async getTimeline(timelineId: string, userId: string): Promise<TimelineResponse> {
    logger.debug('Getting timeline', { timelineId, userId });
    
    // Проверяем доступ
    const hasAccess = await this.timelineRepository.checkUserAccess(userId, timelineId);
    if (!hasAccess) {
      throw createError('Access denied to timeline', 403);
    }

    const timeline = await this.timelineRepository.findById(timelineId);
    if (!timeline) {
      throw createError('Timeline not found', 404);
    }

    return timeline;
  }

  async updateTimeline(timelineId: string, userId: string, data: UpdateTimelineDto): Promise<TimelineResponse> {
    logger.info('Updating timeline', { timelineId, userId, data });
    
    const timeline = await this.timelineRepository.update(timelineId, userId, data);
    logger.info('Timeline updated successfully', { timelineId, name: timeline.name });
    return timeline;
  }

  async deleteTimeline(timelineId: string, userId: string): Promise<void> {
    logger.info('Deleting timeline', { timelineId, userId });
    
    await this.timelineRepository.delete(timelineId, userId);
    logger.info('Timeline deleted successfully', { timelineId });
  }

  async duplicateTimeline(timelineId: string, userId: string, newName: string): Promise<TimelineResponse> {
    logger.info('Duplicating timeline', { timelineId, userId, newName });
    
    const newTimeline = await this.timelineRepository.duplicate(timelineId, userId, newName);
    logger.info('Timeline duplicated successfully', { 
      originalTimelineId: timelineId, 
      newTimelineId: newTimeline.id, 
      newName 
    });
    return newTimeline;
  }

  async switchActiveTimeline(timelineId: string, userId: string): Promise<void> {
    logger.info('Switching active timeline', { timelineId, userId });
    
    // Проверяем доступ
    const hasAccess = await this.timelineRepository.checkUserAccess(userId, timelineId);
    if (!hasAccess) {
      throw createError('Access denied to timeline', 403);
    }

    const timeline = await this.timelineRepository.findById(timelineId);
    if (!timeline) {
      throw createError('Timeline not found', 404);
    }

    await this.timelineRepository.setActive(timelineId, timeline.projectId);
    logger.info('Active timeline switched successfully', { timelineId, projectId: timeline.projectId });
  }
}
