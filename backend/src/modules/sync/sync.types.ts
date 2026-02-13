/**
 * Общие типы для модуля синхронизации
 */

export interface Operation {
  id: string;
  type: string;
  timelineId: string;
  layerId: string;
  payload: any;
  timestamp: number;
  userId?: string;
  deviceId: string;
}

export interface GraphSnapshot {
  timelines: {
    [timelineId: string]: {
      layers: any;
      metadata: any;
      variables: any[];
      lastLayerNumber?: number;
    };
  };
  timelinesMetadata?: Array<{
    id: string;
    name: string;
    createdAt: number;
    isActive: boolean;
    order?: number;
  }>;
  projectName?: string;
  projectId?: string;
  _lastModified?: number;
}

export interface OperationBatch {
  operations: Operation[];
  projectId: string;
  lastSyncVersion: number;
  deviceId: string;
}

export interface SyncResult {
  success: boolean;
  syncVersion: number;
  appliedOperations: string[];
  conflicts?: any[];
  serverOperations?: Operation[];
}

export interface SnapshotResult {
  version: number;
  timestamp: number;
  snapshot: GraphSnapshot;
}

export interface OperationsResult {
  operations: Operation[];
  currentVersion: number;
} 