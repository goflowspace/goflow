import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './di.types';
import { ISyncRepository, ISyncService, ISyncController } from './interfaces/sync.interfaces';
import { SyncRepository } from './sync.repository';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller.inversify';

const syncContainer = new Container();

// Регистрация зависимостей
syncContainer.bind<ISyncRepository>(TYPES.SyncRepository).to(SyncRepository).inSingletonScope();
syncContainer.bind<ISyncService>(TYPES.SyncService).to(SyncService).inSingletonScope();
syncContainer.bind<ISyncController>(TYPES.SyncController).to(SyncController).inSingletonScope();

export { syncContainer }; 