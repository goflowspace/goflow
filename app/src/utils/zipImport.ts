/**
 * Утилиты для импорта ZIP архивов с JSON данными Go Flow
 */
import JSZip from 'jszip';

export interface ZipImportResult {
  timeline?: any;
  entities?: any;
  knowledge?: any;
  readme?: string;
}

/**
 * Извлекает и парсит содержимое ZIP архива
 */
export async function extractZipImport(file: File): Promise<ZipImportResult> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  const result: ZipImportResult = {};

  // Извлекаем файл с таймлайном (timeline.json или timeline_{id}.json)
  let timelineFile = zipContent.file('timeline.json'); // Старый формат
  if (!timelineFile) {
    // Ищем файл по новому формату timeline_{id}.json
    const files = Object.keys(zipContent.files);
    const timelineFileName = files.find((name) => name.match(/^timeline_[a-zA-Z0-9]{8}\.json$/));
    if (timelineFileName) {
      timelineFile = zipContent.file(timelineFileName);
    }
  }

  if (timelineFile) {
    const timelineContent = await timelineFile.async('string');
    result.timeline = JSON.parse(timelineContent);
  }

  // Извлекаем entities.json (если есть)
  const entitiesFile = zipContent.file('entities.json');
  if (entitiesFile) {
    const entitiesContent = await entitiesFile.async('string');
    result.entities = JSON.parse(entitiesContent);
  }

  // Извлекаем knowledge.json (если есть)
  const knowledgeFile = zipContent.file('knowledge.json');
  if (knowledgeFile) {
    const knowledgeContent = await knowledgeFile.async('string');
    result.knowledge = JSON.parse(knowledgeContent);
  }

  // Извлекаем README.md (если есть)
  const readmeFile = zipContent.file('README.md');
  if (readmeFile) {
    result.readme = await readmeFile.async('string');
  }

  return result;
}

/**
 * Объединяет содержимое ZIP архива в единый объект для импорта
 */
export function mergeZipImportData(zipResult: ZipImportResult): any {
  if (!zipResult.timeline) {
    throw new Error('Timeline data is required in ZIP import');
  }

  // Начинаем с базовых данных таймлайна
  const mergedData = {...zipResult.timeline};

  // Добавляем сущности если есть
  if (zipResult.entities) {
    mergedData.entities = zipResult.entities.entities;
    mergedData.entityTypes = zipResult.entities.entityTypes;
  }

  // Добавляем библию проекта если есть
  if (zipResult.knowledge) {
    mergedData.knowledge = zipResult.knowledge.knowledge;
  }

  return mergedData;
}

/**
 * Проверяет является ли файл ZIP архивом экспорта Go Flow
 */
export function isGoFlowZipExport(file: File): boolean {
  return file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.name.toLowerCase().endsWith('.zip');
}
