import {ProjectData, api} from './api';
import {loadProject, saveProject} from './dbService';
import {ISyncResult, Operation} from './interfaces/syncInterfaces';
import {StorageService} from './storageService';

/**
 * Сервис для управления данными проектов
 * Работает с бекендом и использует localStorage как fallback
 */
export class ProjectDataService {
  private static readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 минут
  private static syncTimer: number | null = null;
  private static pendingSave: boolean = false;
  private static lastSyncTime: number = 0;
  private static lastDataHash: string = '';
  private static isInitialized: boolean = false;
  private static currentProjectId: string | null = null;
  private static cachedProjectData: ProjectData | null = null;

  /**
   * Инициализирует автосохранение для проекта
   */
  static initializeAutoSave(projectId: string): void {
    this.currentProjectId = projectId;
    this.isInitialized = true;
    this.startAutoSaveTimer();
    console.log(`Auto-save initialized for project: ${projectId}`);
  }

  /**
   * Останавливает автосохранение
   */
  static stopAutoSave(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.isInitialized = false;
    this.currentProjectId = null;
    console.log('Auto-save stopped');
  }

  /**
   * Запускает таймер автосохранения
   */
  private static startAutoSaveTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.currentProjectId && this.hasChanges()) {
        await this.performAutoSave();
      }
    }, this.SYNC_INTERVAL) as unknown as number;
  }

  /**
   * Проверяет, есть ли изменения в данных
   */
  private static hasChanges(): boolean {
    // Для простоты используем флаг pendingSave для определения изменений
    // Реальная проверка изменений будет происходить в performAutoSave
    return this.pendingSave;
  }

  /**
   * Генерирует хеш данных для сравнения
   */
  // TODO: использовать библиотеку для хеширования
  private static generateDataHash(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      // Простой хеш-алгоритм, безопасный для Unicode
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Конвертируем в 32-битное целое
      }
      return Math.abs(hash).toString(16).slice(0, 8);
    } catch (error) {
      console.warn('Failed to generate data hash:', error);
      return Date.now().toString();
    }
  }

  /**
   * Выполняет автосохранение
   */
  private static async performAutoSave(): Promise<void> {
    if (!this.currentProjectId) return;

    try {
      // Используем кэшированные данные если есть, иначе загружаем из IndexedDB
      let currentData: ProjectData | null = this.cachedProjectData;
      if (!currentData) {
        currentData = (await loadProject(this.currentProjectId)) || null;
        if (!currentData) {
          console.log('No project data found for auto-save');
          return;
        }
      }

      // Обновляем временную метку перед сохранением
      this.updateDataTimestamp(currentData);

      console.log(`Auto-saving project data to server for project: ${this.currentProjectId}`);
      console.log('Data being saved:', JSON.stringify(currentData, null, 2));

      // Обновляем хеш после успешного сохранения
      this.lastDataHash = this.generateDataHash(currentData);
      this.lastSyncTime = Date.now();
      this.pendingSave = false;
      this.cachedProjectData = null; // Очищаем кэш после автосохранения

      console.log('Auto-save completed successfully');
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.pendingSave = true;
    }
  }

  /**
   * Новая функция для загрузки данных через снимок и операции
   */
  private static async loadProjectDataFromSnapshot(projectId: string): Promise<ProjectData | null> {
    try {
      console.log(`Loading graph snapshot for project: ${projectId}`);
      const response = await api.getProjectGraphSnapshot(projectId);

      if (!response || !response.snapshot) {
        console.warn('No snapshot found for project:', projectId);
        return null; // Или можно попробовать загрузить по старинке как fallback
      }

      console.log(`Loading operations since version: ${response.version}`);
      const operations = await api.getOperations(projectId, response.version);

      // TODO: Реализовать логику применения операций к снимку
      // const finalProjectData = applyOperations(response.snapshot, operations);
      const finalProjectData = response.snapshot; // Используем данные из поля snapshot

      console.log('Successfully constructed project data from snapshot and operations');
      return finalProjectData;
    } catch (error) {
      console.error('Failed to load project data from snapshot:', error);
      return null;
    }
  }

  /**
   * Сравнивает версии данных и возвращает более новую
   * @param projectId ID проекта
   * @returns Данные проекта (либо с сервера, либо локальные)
   */
  static async loadProjectDataWithVersionCheck(projectId: string): Promise<ProjectData | null> {
    let serverData: ProjectData | null = null;
    let localData: ProjectData | null = null;

    // Загружаем локальные данные из IndexedDB (не из localStorage!)
    try {
      const indexedDbData = await loadProject(projectId);
      if (indexedDbData) {
        localData = {
          timelines: indexedDbData.timelines,
          projectName: indexedDbData.projectName,
          projectId: indexedDbData.projectId,
          _lastModified: indexedDbData._lastModified
        };
      }
    } catch (error) {
      console.warn('Failed to load project data from IndexedDB:', error);
    }

    try {
      // Пытаемся загрузить данные с сервера
      console.log(`Loading project data from server for version check: ${projectId}`);
      // Заменяем старый вызов на новый
      serverData = await this.loadProjectDataFromSnapshot(projectId);
    } catch (error) {
      console.warn('Failed to load project data from server:', error);
    }

    // Если нет ни серверных, ни локальных данных
    if (!serverData && !localData) {
      console.log('No project data found on server or locally');
      return null;
    }

    // Если есть только серверные данные
    if (serverData && !localData) {
      console.log('Using server data (no local data found)');
      // Сохраняем в IndexedDB для кеширования
      const dataToSave = {
        projectId,
        timelines: serverData.timelines,
        projectName: serverData.projectName,
        _lastModified: serverData._lastModified || Date.now()
      };
      await saveProject(dataToSave).catch(console.error);
      this.lastDataHash = this.generateDataHash(dataToSave);
      return serverData;
    }

    // Если есть только локальные данные
    if (!serverData && localData) {
      console.log('Using local data (no server data found)');
      this.lastDataHash = this.generateDataHash(localData);
      return localData;
    }

    // Если есть и серверные, и локальные данные - используем серверные (они авторитетные)
    if (serverData && localData) {
      console.log('Both server and local data found, using server data as authoritative');

      // Сохраняем серверные данные в IndexedDB для кеширования
      const dataToSave = {
        projectId,
        timelines: serverData.timelines,
        projectName: serverData.projectName,
        _lastModified: serverData._lastModified || Date.now()
      };
      await saveProject(dataToSave).catch(console.error);
      this.lastDataHash = this.generateDataHash(dataToSave);
      return serverData;
    }

    return null;
  }

  /**
   * Получает временную метку данных
   * @param data Данные проекта
   * @returns Временная метка в миллисекундах
   */
  private static getDataTimestamp(data: any): number {
    // Если есть явная метка времени, используем её
    if (data._lastModified) {
      return data._lastModified;
    }

    // Иначе используем текущее время (для обратной совместимости)
    return Date.now();
  }

  /**
   * Обновляет временную метку в данных перед сохранением
   * @param data Данные для обновления
   */
  private static updateDataTimestamp(data: any): void {
    data._lastModified = Date.now();
  }

  /**
   * Загружает данные проекта
   * Сначала пытается загрузить с сервера, если не получается - использует localStorage
   */
  static async loadProjectData(projectId: string): Promise<ProjectData | null> {
    return this.loadProjectDataWithVersionCheck(projectId);
  }

  /**
   * Сохраняет данные проекта
   * Сохраняет в IndexedDB немедленно, отмечает что есть изменения для автосохранения
   */
  static async saveProjectData(projectId: string, data: ProjectData): Promise<void> {
    // Обновляем временную метку
    this.updateDataTimestamp(data);

    const dataToSave = {
      projectId,
      timelines: data.timelines,
      projectName: data.projectName,
      _lastModified: data._lastModified || Date.now()
    };

    try {
      // Сохраняем в IndexedDB немедленно
      await saveProject(dataToSave);
      console.log('Project data saved to IndexedDB:', projectId);
    } catch (error) {
      console.error('Failed to save project data to IndexedDB:', error);
    }

    // Отмечаем, что есть несохраненные изменения
    this.pendingSave = true;

    // Если автосохранение не инициализировано, инициализируем его
    if (!this.isInitialized) {
      this.initializeAutoSave(projectId);
    }
  }

  /**
   * Отмечает данные как измененные для автосохранения БЕЗ дублирования сохранения в IndexedDB
   * Используется когда данные уже сохранены в IndexedDB другим способом
   */
  static markAsChanged(projectId: string, data: ProjectData): void {
    // Обновляем временную метку
    this.updateDataTimestamp(data);

    // Сохраняем данные в памяти для последующего автосохранения на сервер
    this.cachedProjectData = {
      projectId,
      timelines: data.timelines,
      projectName: data.projectName,
      _lastModified: data._lastModified || Date.now()
    };

    // Отмечаем, что есть несохраненные изменения
    this.pendingSave = true;

    // Если автосохранение не инициализировано, инициализируем его
    if (!this.isInitialized) {
      this.initializeAutoSave(projectId);
    }
  }

  /**
   * Принудительно сохраняет данные на сервер
   */
  static async forceSaveToServer(projectId: string, data: ProjectData): Promise<boolean> {
    try {
      // Обновляем временную метку перед сохранением
      this.updateDataTimestamp(data);

      // Добавляем projectId
      const dataToSend = {...data, projectId};

      console.log(`Force saving project data to server for project: ${projectId}`);
      // await api.saveProjectData(projectId, dataToSend);

      // Обновляем хеш после успешного сохранения
      this.lastDataHash = this.generateDataHash(data);
      this.lastSyncTime = Date.now();
      this.pendingSave = false;

      console.log('Project data successfully saved to server');
      return true;
    } catch (error) {
      console.error('Failed to save project data to server:', error);
      return false;
    }
  }

  /**
   * Принудительно сохраняет текущие данные из IndexedDB
   */
  static async forceSaveCurrentData(): Promise<boolean> {
    if (!this.currentProjectId) {
      console.warn('No current project ID for force save');
      return false;
    }

    try {
      const currentData = await loadProject(this.currentProjectId);
      if (!currentData) {
        console.warn('No data to save');
        return false;
      }

      // Обновляем временную метку
      this.updateDataTimestamp(currentData);

      const projectData: ProjectData = {
        timelines: currentData.timelines,
        projectName: currentData.projectName,
        projectId: this.currentProjectId,
        _lastModified: currentData._lastModified
      };

      return await this.forceSaveToServer(this.currentProjectId, projectData);
    } catch (error) {
      console.error('Failed to load current data from IndexedDB for force save:', error);
      return false;
    }
  }

  /**
   * Проверяет, есть ли несохраненные изменения
   */
  static hasPendingChanges(): boolean {
    return this.pendingSave || this.hasChanges();
  }

  /**
   * Получает время последней синхронизации
   */
  static getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Очищает все таймеры и состояние
   */
  static cleanup(): void {
    this.stopAutoSave();
    this.pendingSave = false;
    this.lastDataHash = '';
  }

  /**
   * Инициализирует автосохранение при закрытии страницы
   */
  static initializeBeforeUnloadHandler(): () => void {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (this.hasPendingChanges()) {
        // Пытаемся сохранить данные перед закрытием
        await this.forceSaveCurrentData();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Возвращаем функцию для очистки обработчика
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }

  /**
   * Получает статус автосохранения
   */
  static getStatus(): {
    isInitialized: boolean;
    currentProjectId: string | null;
    hasPendingChanges: boolean;
    lastSyncTime: number;
  } {
    return {
      isInitialized: this.isInitialized,
      currentProjectId: this.currentProjectId,
      hasPendingChanges: this.hasPendingChanges(),
      lastSyncTime: this.lastSyncTime
    };
  }

  /**
   * Синхронизирует операции с бекендом
   * Используется SyncService для отправки пакетов операций
   */
  static async syncOperations(projectId: string, operations: Operation[]): Promise<ISyncResult> {
    try {
      console.log(`Syncing ${operations.length} operations for project: ${projectId}`);

      // Используем api сервис для обращения к backend
      const result: ISyncResult = await api.syncOperations(projectId, {operations});

      console.log(`Successfully synced operations:`, {
        processedCount: result.processedOperations?.length || 0,
        syncVersion: result.syncVersion,
        hasErrors: result.errors && result.errors.length > 0
      });

      return result;
    } catch (error) {
      console.error('Failed to sync operations:', error);
      throw error;
    }
  }

  /**
   * Удаляет данные таймлайна из IndexedDB
   */
  static async deleteTimelineFromIndexedDB(projectId: string, timelineId: string): Promise<void> {
    try {
      // Загружаем текущие данные проекта из IndexedDB
      const projectData = await loadProject(projectId);
      if (!projectData) {
        console.warn(`Project ${projectId} not found in IndexedDB for timeline deletion`);
        return;
      }

      // Удаляем таймлайн из данных проекта
      if (projectData.timelines[timelineId]) {
        delete projectData.timelines[timelineId];
        console.log(`Timeline ${timelineId} removed from project data`);

        // Обновляем метаданные таймлайнов если они есть
        if (projectData.timelinesMetadata && Array.isArray(projectData.timelinesMetadata)) {
          projectData.timelinesMetadata = projectData.timelinesMetadata.filter((timeline: any) => timeline.id !== timelineId);
          console.log(`Timeline ${timelineId} removed from timelinesMetadata`);
        }

        // Обновляем временную метку
        this.updateDataTimestamp(projectData);

        // Сохраняем обновленные данные обратно в IndexedDB
        await saveProject({
          projectId,
          timelines: projectData.timelines,
          timelinesMetadata: projectData.timelinesMetadata,
          projectName: projectData.projectName,
          _lastModified: projectData._lastModified || Date.now()
        });

        console.log(`Timeline ${timelineId} successfully deleted from IndexedDB for project ${projectId}`);
      } else {
        console.log(`Timeline ${timelineId} was not found in IndexedDB for project ${projectId}`);
      }
    } catch (error) {
      console.error(`Failed to delete timeline ${timelineId} from IndexedDB:`, error);
      throw error;
    }
  }
}
