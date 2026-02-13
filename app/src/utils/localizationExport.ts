import {API_URL, api} from '@services/api';
import JSZip from 'jszip';

import {downloadFile} from './download';

export interface ExportLocalizationOptions {
  projectId: string;
  timelineId: string;
  projectName?: string;
  timelineName?: string;
}

/**
 * Экспортирует данные локализации для указанного таймлайна
 * @param options - опции экспорта
 * @returns Promise<void>
 */
export async function exportLocalizationData(options: ExportLocalizationOptions): Promise<void> {
  const {projectId, timelineId, projectName = 'Project', timelineName = 'Timeline'} = options;

  try {
    // Получаем настройки локализации проекта
    const localizationResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}`);
    if (!localizationResponse.ok) {
      throw new Error('Failed to load localization settings');
    }

    const localizationSettings = await localizationResponse.json();
    const settings = localizationSettings.data;

    if (!settings || !settings.targetLanguages || settings.targetLanguages.length === 0) {
      throw new Error('No target languages configured for this project');
    }

    // Создаем ZIP архив
    const zip = new JSZip();

    // Получаем тексты для всех целевых языков
    for (const targetLanguage of settings.targetLanguages) {
      try {
        const textsResponse = await api.fetchWithAuth(`${API_URL}/localization/projects/${projectId}/timelines/${timelineId}/texts?language=${targetLanguage}`);

        if (textsResponse.ok) {
          const textsData = await textsResponse.json();
          const texts = textsData.data || [];

          // Создаем простую структуру key-value, где key = nodeId
          const localizationByNode: {[nodeId: string]: string} = {};

          texts.forEach((text: any) => {
            // Используем переведенный текст или оригинальный, если перевода нет
            localizationByNode[text.nodeId] = text.translatedText || text.originalText;
          });

          const localizationFileData = {
            timelineId: timelineId,
            language: targetLanguage,
            baseLanguage: settings.baseLanguage,
            localizations: localizationByNode,
            metadata: {
              exportedAt: new Date().toISOString(),
              version: '1.0'
            }
          };

          zip.file(`localization_${timelineId}_${targetLanguage}.json`, JSON.stringify(localizationFileData, null, 2));
        }
      } catch (error) {
        console.warn(`Error loading texts for language ${targetLanguage}:`, error);
      }
    }

    // Проверяем, есть ли файлы в архиве
    const files = Object.keys(zip.files);
    if (files.length === 0) {
      throw new Error('No localization data available for export');
    }

    // Создаем README файл
    const readmeContent = `# Go Flow Localization Export

This export contains localized texts for the timeline "${timelineName}" from project "${projectName}".

## File Structure

${settings.targetLanguages.map((lang: string) => `- **localization_${timelineId}_${lang}.json** - Localized texts for ${lang.toUpperCase()}`).join('\n')}

## Format

Each localization file contains:
- \`timelineId\` - ID of the source timeline
- \`language\` - Target language code
- \`baseLanguage\` - Source language code  
- \`localizations\` - Object where keys are nodeIds and values are translated texts
- \`metadata\` - Export information

## Usage

Use these files to restore localization data or integrate with external translation services.

## Technical Details

- Export Format: JSON files in ZIP archive
- Timeline: ${timelineName} (ID: ${timelineId})
- Base Language: ${settings.baseLanguage.toUpperCase()}
- Target Languages: ${settings.targetLanguages.map((lang: string) => lang.toUpperCase()).join(', ')}
- Exported At: ${new Date().toISOString()}
`;

    zip.file('README.md', readmeContent);

    // Генерируем ZIP архив
    const archiveContentAsBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'STORE'
    });

    const archiveContent = archiveContentAsBuffer.toString('base64');
    const archiveFilename = `${projectName.replace(/\s+/g, '_')}-${timelineName.replace(/\s+/g, '_')}_localization.zip`;

    // Скачиваем ZIP файл
    downloadFile(archiveContent, archiveFilename, 'application/zip', true);
  } catch (error) {
    console.error('Failed to export localization:', error);
    throw error;
  }
}
