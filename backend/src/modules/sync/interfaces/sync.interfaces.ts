import { 
  Operation, 
  GraphSnapshot, 
  OperationBatch, 
  SyncResult, 
  SnapshotResult, 
  OperationsResult 
} from '../sync.types';

/**
 * Интерфейс для репозитория синхронизации
 */
export interface ISyncRepository {
  getProjectSnapshot(projectId: string): Promise<{ snapshot: GraphSnapshot; version: number }>;
  checkUserAccess(userId: string, projectId: string): Promise<boolean>;
  getOperationsAfterVersion(projectId: string, afterVersion: number): Promise<Operation[]>;
  getProjectVersion(projectId: string): Promise<number>;
  saveChangesInTransaction(
    projectId: string,
    newSnapshot: GraphSnapshot,
    operations: Operation[],
    newVersion: number
  ): Promise<void>;
}

/**
 * Интерфейс для сервиса синхронизации
 */
export interface ISyncService {
  processOperationsBatch(
    userId: string,
    projectId: string,
    batch: OperationBatch
  ): Promise<SyncResult>;
  
  getGraphSnapshot(
    userId: string, 
    projectId: string
  ): Promise<SnapshotResult>;
  
  getOperationsSince(
    userId: string, 
    projectId: string, 
    sinceVersion: number
  ): Promise<OperationsResult>;
}

/**
 * Интерфейс для контроллера синхронизации
 */
export interface ISyncController {
  processOperations(req: any, res: any): Promise<void>;
  getSnapshot(req: any, res: any): Promise<void>;
  getOperations(req: any, res: any): Promise<void>;
} 