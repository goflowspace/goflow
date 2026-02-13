import { prisma } from "@config/prisma";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Получение эквивалента __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============= ТИПЫ И ИНТЕРФЕЙСЫ =============

// ============= ЗАГРУЗКА ШАБЛОНОВ ИЗ JSON =============

let DEFAULT_PROJECT_TEMPLATES: any[] = [];

// Функция для загрузки шаблонов из JSON файла
const loadTemplatesFromFile = () => {
  try {
    // Пробуем разные пути для разных сценариев (dev/prod)
    const possiblePaths = [
      path.join(__dirname, '../../data/entity-templates.json'), // для разработки
      path.join(__dirname, '../../../src/data/entity-templates.json'), // для скомпилированного кода
      path.join(process.cwd(), 'src/data/entity-templates.json'), // относительно корня проекта
      path.join(process.cwd(), 'data/entity-templates.json'), // если файл в корне
    ];
    
    let templatesPath = '';
    let found = false;
    
    for (const testPath of possiblePaths) {
      console.log('Testing path:', testPath);
      if (fs.existsSync(testPath)) {
        templatesPath = testPath;
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.error('❌ Templates file not found in any of the expected locations:');
      possiblePaths.forEach(p => console.error('  -', p));
      DEFAULT_PROJECT_TEMPLATES = [];
      return;
    }
    
    const templatesData = fs.readFileSync(templatesPath, 'utf8');
    const parsedData = JSON.parse(templatesData);
    DEFAULT_PROJECT_TEMPLATES = parsedData.templates || [];
  } catch (error) {
    console.error('❌ Error loading templates from file:', error);
    DEFAULT_PROJECT_TEMPLATES = [];
  }
};

// Инициализируем темплейты при старте модуля
loadTemplatesFromFile();

// ============= УТИЛИТЫ ЛОКАЛИЗАЦИИ =============

/**
 * Получение локализованного названия шаблона
 */
const getLocalizedTemplateName = (template: any, language: string = 'en'): string => {
  // Если есть переводы, используем их
  if (template.nameTranslations && template.nameTranslations[language]) {
    return template.nameTranslations[language];
  }
  
  // Фолбек на английский, если запрошенный язык недоступен
  if (template.nameTranslations && template.nameTranslations['en']) {
    return template.nameTranslations['en'];
  }
  
  // Если нет переводов вообще
  return 'Untitled Template';
};

/**
 * Получение локализованного описания шаблона
 */
const getLocalizedTemplateDescription = (template: any, language: string = 'en'): string => {
  // Если есть переводы, используем их
  if (template.descriptionTranslations && template.descriptionTranslations[language]) {
    return template.descriptionTranslations[language];
  }
  
  // Фолбек на английский, если запрошенный язык недоступен
  if (template.descriptionTranslations && template.descriptionTranslations['en']) {
    return template.descriptionTranslations['en'];
  }
  
  // Если нет переводов вообще
  return '';
};

/**
 * Получение локализованного текста с фолбеком
 */
const getLocalizedText = (translations: Record<string, string> | undefined, language: string = 'en'): string => {
  if (!translations) return '';
  
  // Используем запрошенный язык или фолбек на английский
  return translations[language] || translations['en'] || '';
};

/**
 * Получение локализованного массива опций
 */
const getLocalizedOptions = (optionsTranslations: Record<string, string[]> | undefined, language: string = 'en'): string[] => {
  if (!optionsTranslations) return [];
  
  // Используем запрошенный язык или фолбек на английский
  return optionsTranslations[language] || optionsTranslations['en'] || [];
};

/**
 * Локализация типа сущности
 */
const localizeEntityType = (entityType: any, language: string = 'en'): any => {
  return {
    ...entityType,
    name: getLocalizedText(entityType.nameTranslations, language),
    description: getLocalizedText(entityType.descriptionTranslations, language),
    parameters: entityType.parameters?.map((param: any) => localizeParameter(param, language)) || []
  };
};

/**
 * Локализация параметра
 */
const localizeParameter = (parameter: any, language: string = 'en'): any => {
  return {
    ...parameter,
    name: getLocalizedText(parameter.nameTranslations, language),
    options: getLocalizedOptions(parameter.optionsTranslations, language)
  };
};

/**
 * Локализация информации о проекте
 */
const localizeProjectInfo = (projectInfo: any, language: string = 'en'): any => {
  if (!projectInfo) return projectInfo;
  
  return {
    ...projectInfo,
    logline: getLocalizedText(projectInfo.loglineTranslations, language),
    synopsis: getLocalizedText(projectInfo.synopsisTranslations, language),
    setting: getLocalizedText(projectInfo.settingTranslations, language),
    targetAudience: getLocalizedText(projectInfo.targetAudienceTranslations, language),
    mainThemes: getLocalizedText(projectInfo.mainThemesTranslations, language),
    message: getLocalizedText(projectInfo.messageTranslations, language),
    references: getLocalizedText(projectInfo.referencesTranslations, language),
    uniqueFeatures: getLocalizedText(projectInfo.uniqueFeaturesTranslations, language),
    atmosphere: getLocalizedText(projectInfo.atmosphereTranslations, language),
    constraints: getLocalizedText(projectInfo.constraintsTranslations, language)
  };
};

/**
 * Локализация шаблона
 */
const localizeTemplate = (template: any, language: string = 'en') => {
  const localizedConfig = {
    ...template.config,
    projectInfo: localizeProjectInfo(template.config?.projectInfo, language),
    entityTypes: template.config?.entityTypes?.map((entityType: any) => localizeEntityType(entityType, language)) || []
  };

  return {
    ...template,
    name: getLocalizedTemplateName(template, language),
    description: getLocalizedTemplateDescription(template, language),
    config: localizedConfig
  };
};

// ============= СЕРВИСЫ ДЛЯ РАБОТЫ С ШАБЛОНАМИ =============

/**
 * Получение всех активных шаблонов проектов
 */
export const getProjectTemplatesService = async (query: any = {}) => {
    const { categories, includeInactive = false, includeDefault = true } = query;
    
    const where: any = {};
    
    if (!includeInactive) {
        where.isActive = true;
    }
    
    if (!includeDefault) {
        where.isDefault = false;
    }
    
    if (categories && categories.length > 0) {
        // Для множественных категорий используем пересечение
        where.categories = { hasSome: categories };
    }
    
    // TODO: Заменить на реальные вызовы к БД когда схема будет готова
    // return await prisma.projectTemplate.findMany({
    //     where,
    //     orderBy: [
    //         { order: 'asc' },
    //         { createdAt: 'asc' }
    //     ]
    // });
    
    // Пока возвращаем предустановленные шаблоны
    let templates = [...DEFAULT_PROJECT_TEMPLATES];
    
    if (categories && categories.length > 0) {
        templates = templates.filter(t => 
            categories.some((cat: string) => t.categories.includes(cat))
        );
    }
    
    if (!includeDefault) {
        templates = templates.filter(t => !t.isDefault);
    }
    
    // Получаем язык из параметров запроса (по умолчанию английский)
    const language = query.language || 'en';

    const result = templates.map(t => {
        const localized = localizeTemplate(t, language);
        return {
            ...localized,
            id: `template_${t.type}`,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    });
    
    return result;
};

/**
 * Получение шаблона по ID с поддержкой локализации
 */
export const getProjectTemplateService = async (templateId: string, language: string = 'en') => {
    // TODO: Заменить на реальный вызов к БД когда схема будет готова
    // const template = await prisma.projectTemplate.findUnique({
    //     where: { id: templateId }
    // });
    
    const templateType = templateId.replace('template_', '');
    const template = DEFAULT_PROJECT_TEMPLATES.find(t => t.type === templateType);
    
    if (!template) {
        throw new Error("Шаблон не найден");
    }
    
    const localized = localizeTemplate(template, language);
    
    return {
        ...localized,
        id: templateId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

/**
 * Инициализация шаблона для проекта
 */
export const initializeProjectFromTemplateService = async (
    projectId: string, 
    templateId: string
) => {
    console.log(`Initializing template ${templateId} for project ${projectId}`);
    
    const template = await getProjectTemplateService(templateId, 'en'); // Используем английский по умолчанию для конфигурации
    console.log(`Found template:`, template.name, 'with config:', JSON.stringify(template.config, null, 2));
    
    const config = template.config as any;
    
    return prisma.$transaction(async (tx) => {
        // 1. Если в шаблоне есть настройки библии проекта
        if (config.projectInfo) {
            console.log(`Updating project info for project ${projectId}`);
            await tx.projectInfo.update({
                where: { projectId },
                data: {
                    logline: config.projectInfo.logline || null,
                    synopsis: config.projectInfo.synopsis || null,
                    genres: config.projectInfo.genres || [],
                    formats: config.projectInfo.formats || [],
                    status: config.projectInfo.status || 'concept',
                    setting: config.projectInfo.setting || null,
                    targetAudience: config.projectInfo.targetAudience || null,
                    mainThemes: config.projectInfo.mainThemes || null,
                    message: config.projectInfo.message || null,
                    references: config.projectInfo.references || null,
                    uniqueFeatures: config.projectInfo.uniqueFeatures || null,
                    atmosphere: config.projectInfo.atmosphere || null,
                    constraints: config.projectInfo.constraints || null
                }
            });
            console.log(`Project info updated for project ${projectId}`);
        }
        
        // 2. Если в шаблоне есть кастомные типы сущностей
        if (config.entityTypes && config.entityTypes.length > 0) {
            console.log(`Creating ${config.entityTypes.length} entity types for project ${projectId}`);
            
            for (const typeConfig of config.entityTypes) {
                console.log(`Creating entity type: ${typeConfig.name} (${typeConfig.type})`);
                
                // Создаем тип сущности
                const entityType = await tx.entityType.create({
                    data: {
                        projectId,
                        name: typeConfig.name,
                        type: typeConfig.type,
                        description: typeConfig.description,
                        isDefault: false, // Типы из шаблонов не считаются предустановленными
                        order: typeConfig.order
                    }
                });
                
                console.log(`Created entity type ${entityType.id}: ${typeConfig.name}`);
                
                // Создаем параметры для этого типа
                for (const paramConfig of typeConfig.parameters) {
                    console.log(`Creating parameter: ${paramConfig.name} (${paramConfig.valueType})`);
                    
                    // Создаем параметр
                    const parameter = await tx.entityParameter.create({
                        data: {
                            projectId,
                            name: paramConfig.name,
                            valueType: paramConfig.valueType as any,
                            options: paramConfig.options || [],
                            order: paramConfig.order
                        }
                    });
                    
                    console.log(`Created parameter ${parameter.id}: ${paramConfig.name}`);
                    
                    // Связываем параметр с типом
                    await tx.entityTypeParameter.create({
                        data: {
                            entityTypeId: entityType.id,
                            parameterId: parameter.id,
                            required: paramConfig.required,
                            order: paramConfig.order
                        }
                    });
                    
                    console.log(`Linked parameter ${parameter.id} to entity type ${entityType.id}`);
                }
            }
            
            console.log(`Successfully created all entity types for project ${projectId}`);
        } else {
            console.log(`No entity types to create for template ${templateId}`);
        }
        
        // 3. TODO: В будущем можно добавить инициализацию графа и переменных
        // if (config.initialGraph) { ... }
        // if (config.variables) { ... }
        
        console.log(`Template ${templateId} initialization completed for project ${projectId}`);
        return { success: true };
    });
};

/**
 * Инициализация предустановленных шаблонов в БД (для первого запуска)
 */
export const initializeDefaultTemplatesService = async () => {
    // TODO: Реализовать когда схема БД будет готова
    console.log('Templates service initialized with', DEFAULT_PROJECT_TEMPLATES.length, 'default templates');
    return DEFAULT_PROJECT_TEMPLATES.length;
}; 