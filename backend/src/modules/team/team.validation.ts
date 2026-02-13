import { z } from "zod";
import { TeamRole, TeamProjectAccess } from "@prisma/client";

// Схема для настроек команды
export const teamSettingsSchema = z.object({
    defaultProjectAccess: z.nativeEnum(TeamProjectAccess, {
        errorMap: () => ({ message: `Уровень доступа по умолчанию должен быть одним из: ${Object.values(TeamProjectAccess).join(', ')}` })
    }).optional(),
    allowMemberInvites: z.boolean().optional(),
    invitationExpiryDays: z.number().int().min(1).max(30).optional()
}).optional();

// Схемы для создания и обновления команд
export const createTeamSchema = z.object({
    name: z.string({
        required_error: 'Название команды обязательно'
    })
        .trim()
        .min(1, 'Название команды не может быть пустым')
        .max(100, 'Название команды не может содержать более 100 символов'),
    
    description: z.string()
        .trim()
        .max(500, 'Описание команды не может содержать более 500 символов')
        .optional(),
        
    settings: teamSettingsSchema
});

export const updateTeamSchema = z.object({
    name: z.string()
        .trim()
        .min(1, 'Название команды не может быть пустым')
        .max(100, 'Название команды не может содержать более 100 символов')
        .optional(),
        
    description: z.string()
        .trim()
        .max(500, 'Описание команды не может содержать более 500 символов')
        .optional(),
        
    settings: teamSettingsSchema
});

// Схемы для приглашений
export const inviteMemberSchema = z.object({
    email: z.string({
        required_error: 'Email адрес обязателен'
    })
        .email('Некорректный email адрес'),
    
    role: z.nativeEnum(TeamRole, {
        errorMap: () => ({ message: `Роль должна быть одной из: ${Object.values(TeamRole).join(', ')}` })
    })
});

export const updateMemberRoleSchema = z.object({
    role: z.nativeEnum(TeamRole, {
        errorMap: () => ({ message: `Роль должна быть одной из: ${Object.values(TeamRole).join(', ')}` })
    })
});

export const updateMemberAIAccessSchema = z.object({
    hasAIAccess: z.boolean({
        required_error: 'Флаг доступа к ИИ обязателен',
        invalid_type_error: 'Флаг доступа к ИИ должен быть boolean'
    })
});

// Схемы для проектов
export const addProjectToTeamSchema = z.object({
    projectId: z.string({
        required_error: 'ID проекта обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID проекта'),
    
    accessLevel: z.nativeEnum(TeamProjectAccess, {
        errorMap: () => ({ message: `Уровень доступа должен быть одним из: ${Object.values(TeamProjectAccess).join(', ')}` })
    })
});

export const updateProjectAccessSchema = z.object({
    accessLevel: z.nativeEnum(TeamProjectAccess, {
        errorMap: () => ({ message: `Уровень доступа должен быть одним из: ${Object.values(TeamProjectAccess).join(', ')}` })
    })
});

// Схемы для параметров маршрутов
export const teamIdParamSchema = z.object({
    teamId: z.string({
        required_error: 'ID команды обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID команды')
});

export const memberIdParamSchema = z.object({
    teamId: z.string({
        required_error: 'ID команды обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID команды'),
    
    memberId: z.string({
        required_error: 'ID участника обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID участника')
});

export const projectParamSchema = z.object({
    teamId: z.string({
        required_error: 'ID команды обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID команды'),
    
    projectId: z.string({
        required_error: 'ID проекта обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID проекта')
});

export const invitationTokenParamSchema = z.object({
    token: z.string({
        required_error: 'Токен приглашения обязателен'
    })
        .uuid('Некорректный токен приглашения')
});

export const invitationIdParamSchema = z.object({
    teamId: z.string({
        required_error: 'ID команды обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID команды'),

    invitationId: z.string({
        required_error: 'ID приглашения обязателен'
    })
        .regex(/^[0-9a-fA-F]{24}$/, 'Некорректный ID приглашения')
});

// Схемы для query параметров
export const teamsQuerySchema = z.object({
    page: z.coerce.number()
        .int()
        .min(1)
        .default(1)
        .optional(),
    
    limit: z.coerce.number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .optional(),
    
    search: z.string()
        .trim()
        .max(100, 'Поисковый запрос не может содержать более 100 символов')
        .optional()
}); 