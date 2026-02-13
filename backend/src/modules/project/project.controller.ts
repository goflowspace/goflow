import {Request, Response} from "express";
import {
    createProjectService,
    updateProjectService,
    getUserProjectsService,
    deleteProjectService,
    importToProjectService,
    duplicateProjectService
} from "./project.service";
import { initializeProjectFromTemplateService } from "./templates.service";

/**
 * 🔹 Создание нового проекта
 * Только авторизованные пользователи могут создавать проекты.
 */
export const createProject = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const {name, data, templateId} = req.body;
    
    console.log(`Creating project with data:`, { name, templateId, hasData: !!data });
    
    // Создаем проект (пропускаем базовые типы если используется шаблон)
    const project = await createProjectService(userId, name, data, !!templateId);
    console.log(`Project created with ID: ${project.id}`);
    
    // Если указан шаблон, применяем его
    if (templateId) {
        try {
            console.log(`Applying template ${templateId} to project ${project.id}`);
            await initializeProjectFromTemplateService(project.id, templateId);
            console.log(`Template ${templateId} applied successfully to project ${project.id}`);
        } catch (error) {
            console.error('Error applying template to project:', error);
            // Не прерываем создание проекта, если не удается применить шаблон
        }
    }
    
    res.status(201).json({message: "Project was created", project});
};

export const createProjectFromImport = async (req: Request, res: Response) => {
    const { data } = req.body;
    const userId = (req as any).user.id;

    if (!data || typeof data !== "object") {
        res.status(400).json({ error: "Поле 'data' обязательно и должно быть объектом" });
    } else {
        const name = typeof data.name === "string" && data.name.trim() !== "" ? data.name : "Untitled";
        const project = await createProjectService(userId, name, data);
        res.status(201).json(project);
    }
};

/**
 * 🔹 Получение всех проектов пользователя
 * Возвращает список проектов, в которых участвует текущий пользователь в рамках команды.
 */
export const getUserProjects = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const teamId = (req as any).teamId;
    const projects = await getUserProjectsService(userId, teamId);
    res.json({projects});
};

/**
 * 🔹 Обновление информации о проекте
 * Только `OWNER` или `ADMIN` могут обновлять проект.
 */
export const updateProject = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const {id} = req.params;
    const {name} = req.body;

    if (!name) {
        res.status(400).json({error: "Название проекта обязательно"});
    } else {
        const updatedProject = await updateProjectService(userId, id, name);
        res.json({message: "Проект обновлен", project: updatedProject});
    }
};

/**
 * 🔹 Удаление проекта
 * Только `OWNER` может удалить проект.
 */
export const deleteProject = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const {id} = req.params;

    await deleteProjectService(userId, id);
    res.json({message: "Проект удален"});
};

/**
 * 🔹 Дублирование проекта
 * Создает полную копию проекта со всеми данными
 */
export const duplicateProject = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
        const duplicatedProject = await duplicateProjectService(userId, id);
        res.status(201).json({ 
            message: "Проект успешно дублирован", 
            project: duplicatedProject 
        });
    } catch (error: any) {
        if (error.message === "Проект не найден") {
            res.status(404).json({ error: error.message });
        } else if (error.message === "Нет прав на дублирование проекта") {
            res.status(403).json({ error: error.message });
        } else {
            console.error('Error duplicating project:', error);
            res.status(500).json({ error: "Внутренняя ошибка сервера" });
        }
    }
};

/**
 * 🔹 Импорт данных в существующий проект
 * Полностью заменяет текущий граф импортированными данными
 */
export const importToProject = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { data, timelineId } = req.body;

    if (!data || typeof data !== "object") {
        res.status(400).json({ error: "Поле 'data' обязательно и должно быть объектом" });
        return;
    }

    try {
        const updatedProject = await importToProjectService(userId, id, data, timelineId);
        res.json({ 
            message: "Данные успешно импортированы в проект", 
            project: updatedProject 
        });
    } catch (error: any) {
        if (error.message === "Проект не найден") {
            res.status(404).json({ error: error.message });
        } else if (error.message === "Нет прав на импорт в проект") {
            res.status(403).json({ error: error.message });
        } else if (error.message === "Некорректные данные для импорта") {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Внутренняя ошибка сервера" });
        }
    }
};