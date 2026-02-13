import { Container } from 'inversify';
import { ITimelineRepository, ITimelineService } from './interfaces/timeline.interfaces';
import { TimelineRepository } from './timeline.repository';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { TYPES } from './di.types';

const container = new Container();

// Регистрируем зависимости
container.bind<ITimelineRepository>(TYPES.TimelineRepository).to(TimelineRepository);
container.bind<ITimelineService>(TYPES.TimelineService).to(TimelineService);
container.bind<TimelineController>(TYPES.TimelineController).to(TimelineController);

export { container };
