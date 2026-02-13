import { Request, Response } from "express";
import { getProjectTemplatesService, getProjectTemplateService } from "./templates.service";

/**
 * Получение всех шаблонов проектов
 * GET /api/project-templates
 */
export const getProjectTemplates = async (req: Request, res: Response) => {
    try {
        const query = req.query;
        
        // Обрабатываем массив categories из query параметров
        let processedQuery = { ...query };
        if (query.categories) {
            if (Array.isArray(query.categories)) {
                processedQuery.categories = query.categories;
            } else {
                // Если передана одна категория как строка
                processedQuery.categories = [query.categories];
            }
        }
        
        // Получаем язык из заголовков Accept-Language или параметра запроса
        const acceptLanguage = req.headers['accept-language'];
        const queryLanguage = req.query.language as string;
        
        // Определяем язык: параметр запроса > заголовок > английский по умолчанию
        let language = 'en';
        if (queryLanguage) {
            language = queryLanguage;
        } else if (acceptLanguage && acceptLanguage.includes('ru')) {
            language = 'ru';
        }
        
        const templates = await getProjectTemplatesService({
            ...processedQuery,
            language
        });

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Error getting project templates:', error);
        const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
        res.status(400).json({ 
            success: false,
            error: errMessage 
        });
    }
};

/**
 * Получение шаблона по ID
 * GET /api/project-templates/:templateId
 */
export const getProjectTemplate = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;
        // Получаем язык из заголовков Accept-Language или параметра запроса
        const acceptLanguage = req.headers['accept-language'];
        const queryLanguage = req.query.language as string;
        
        // Определяем язык: параметр запроса > заголовок > английский по умолчанию
        let language = 'en';
        if (queryLanguage) {
            language = queryLanguage;
        } else if (acceptLanguage && acceptLanguage.includes('ru')) {
            language = 'ru';
        }
        
        const template = await getProjectTemplateService(templateId, language);

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('Error getting project template:', error);
        const errMessage = error instanceof Error ? error.message : "Ошибка сервера";
        
        if (errMessage === "Шаблон не найден") {
            res.status(404).json({ 
                success: false,
                error: errMessage 
            });
        } else {
            res.status(400).json({ 
                success: false,
                error: errMessage 
            });
        }
    }
}; 