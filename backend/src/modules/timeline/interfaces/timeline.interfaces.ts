import { 
  CreateTimelineDto, 
  UpdateTimelineDto, 
  TimelineResponse, 
  TimelinesQueryParams 
} from '../timeline.types';

export interface ITimelineRepository {
  /**
   * Создать новый таймлайн
   */
  create(userId: string, data: CreateTimelineDto): Promise<TimelineResponse>;

  /**
   * Получить список таймлайнов проекта
   */
  findByProject(params: TimelinesQueryParams): Promise<TimelineResponse[]>;

  /**
   * Получить таймлайн по ID
   */
  findById(timelineId: string): Promise<TimelineResponse | null>;

  /**
   * Обновить таймлайн
   */
  update(timelineId: string, userId: string, data: UpdateTimelineDto): Promise<TimelineResponse>;

  /**
   * Удалить таймлайн
   */
  delete(timelineId: string, userId: string): Promise<void>;

  /**
   * Установить активный таймлайн (деактивировать остальные)
   */
  setActive(timelineId: string, projectId: string): Promise<void>;

  /**
   * Проверить доступ пользователя к таймлайну
   */
  checkUserAccess(userId: string, timelineId: string): Promise<boolean>;

  /**
   * Дублировать таймлайн
   */
  duplicate(timelineId: string, userId: string, newName: string): Promise<TimelineResponse>;
}

export interface ITimelineService {
  /**
   * Создать новый таймлайн
   */
  createTimeline(userId: string, data: CreateTimelineDto): Promise<TimelineResponse>;

  /**
   * Получить список таймлайнов проекта
   */
  getProjectTimelines(params: TimelinesQueryParams): Promise<TimelineResponse[]>;

  /**
   * Получить таймлайн по ID
   */
  getTimeline(timelineId: string, userId: string): Promise<TimelineResponse>;

  /**
   * Обновить таймлайн
   */
  updateTimeline(timelineId: string, userId: string, data: UpdateTimelineDto): Promise<TimelineResponse>;

  /**
   * Удалить таймлайн
   */
  deleteTimeline(timelineId: string, userId: string): Promise<void>;

  /**
   * Дублировать таймлайн
   */
  duplicateTimeline(timelineId: string, userId: string, newName: string): Promise<TimelineResponse>;

  /**
   * Переключить активный таймлайн
   */
  switchActiveTimeline(timelineId: string, userId: string): Promise<void>;
}
